// server.js: main backend
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const config = require('./config');
const { extractFrames } = require('./utils/frameExtractor');
const vision = require('./services/vision');
const anomaly = require('./services/anomaly');
const openai = require('./services/openai');

const app = express();
app.use(express.json());

// Ensure folders exist
if (!fs.existsSync(config.paths.uploads)) fs.mkdirSync(config.paths.uploads, { recursive: true });
if (!fs.existsSync(config.paths.frames)) fs.mkdirSync(config.paths.frames, { recursive: true });

// Serve frames so frontend can display thumbnails
app.use('/frames', express.static(path.join(__dirname, config.paths.frames)));
app.use('/uploads', express.static(path.join(__dirname, config.paths.uploads)));

// Multer for uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, config.paths.uploads),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });

// Simple in-memory + file-backed alerts store
let alerts = [];
const alertsFile = path.join(__dirname, config.paths.alertsFile);
if (fs.existsSync(alertsFile)) {
  try { alerts = JSON.parse(fs.readFileSync(alertsFile)); } catch (e) { alerts = []; }
}

function persistAlerts() {
  try { fs.writeFileSync(alertsFile, JSON.stringify(alerts, null, 2)); } catch (e) { console.error('Persist alerts failed', e); }
}

// Cooldown state
let cooldownActive = false;
let cooldownStart = 0;

// Health
app.get('/api/ping', (req, res) => res.json({ ok: true, cooldownActive }));

/**
 * /api/analyze
 * Accepts multipart form-data with field 'video'
 * Process:
 *  - If cooldownActive, store metadata and return cooldown message.
 *  - Extract frames at configured fps for up to maxSeconds.
 *  - Run Vision on frames (batched concurrency).
 *  - Build timeseries (people_count) and call Anomaly Detector once.
 *  - If anomaly_score >= threshold -> call OpenAI to classify.
 *  - If OpenAI flags HIGH -> create alert + activate cooldown.
 */
app.post('/api/analyze', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No video uploaded' });

    // If in cooldown, do minimal work: persist that a video arrived and return early.
    if (cooldownActive) {
      const meta = { id: uuidv4(), timestamp: new Date().toISOString(), status: 'cooldown_ignored', filename: req.file.filename };
      alerts.push({ ...meta });
      persistAlerts();
      return res.status(200).json({ status: 'cooldown', message: 'System in cooldown. Video recorded but AI processing skipped.', meta });
    }

    const videoPath = path.join(__dirname, config.paths.uploads, req.file.filename);

    // 1) Extract frames
    const frames = await extractFrames(videoPath, config.frameRate, config.maxSeconds);
    // Keep at most frameRate*maxSeconds frames
    const maxExpected = Math.ceil(config.frameRate * config.maxSeconds);
    const selectedFrames = frames.slice(0, maxExpected);

    // 2) Vision analysis (batched)
    const visionResults = await vision.runWithConcurrency(selectedFrames, config.visionConcurrency);

    // 3) Build timeseries for people_count
    const timeSeries = visionResults.map((v, idx) => ({
      timestamp: new Date(Date.now() + idx * 1000).toISOString(),
      value: (v && typeof v.people_count === 'number') ? v.people_count : 0
    }));

    // 4) Anomaly detection
    const anomalyResult = await anomaly.detectTimeSeries(timeSeries);
    const anomalyScore = Number(anomalyResult.score || 0);

    // 5) Decider: only call OpenAI if anomaly score crosses threshold
    let aiDecision = { flag: false, severity: 'Low', reason: 'No anomaly or below threshold' };
    if (anomalyScore >= config.anomalyThreshold) {
      aiDecision = await openai.classifyEvent(visionResults, anomalyScore);
      // If flagged and severity High -> alert + cooldown
      if (aiDecision.flag && aiDecision.severity && aiDecision.severity.toLowerCase() === 'high') {
        const alert = {
          id: uuidv4(),
          timestamp: new Date().toISOString(),
          anomalyScore,
          severity: 'High',
          reason: aiDecision.reason,
          sample_frame: path.basename(selectedFrames[Math.floor(selectedFrames.length / 2)] || '') // pick middle frame
        };
        alerts.unshift(alert); // latest first
        persistAlerts();

        // Activate cooldown
        cooldownActive = true;
        cooldownStart = Date.now();
      } else if (aiDecision.flag) {
        // Non-high flagged alerts we still save
        const alert = {
          id: uuidv4(),
          timestamp: new Date().toISOString(),
          anomalyScore,
          severity: aiDecision.severity || 'Medium',
          reason: aiDecision.reason,
          sample_frame: path.basename(selectedFrames[Math.floor(selectedFrames.length / 2)] || '')
        };
        alerts.unshift(alert);
        persistAlerts();
      }
    }

    // Return result
    return res.json({
      framesAnalyzed: selectedFrames.length,
      anomalyResult,
      anomalyScore,
      aiDecision,
      cooldownActive
    });
  } catch (err) {
    console.error('Analyze error', err?.response?.data || err?.message || err);
    return res.status(500).json({ error: err?.message || 'internal' });
  }
});

// Endpoint to list alerts
app.get('/api/alerts', (req, res) => {
  res.json({ cooldownActive, alerts });
});

// Background cooldown checker
setInterval(() => {
  if (cooldownActive && (Date.now() - cooldownStart) >= config.cooldownMs) {
    cooldownActive = false;
    console.log('Cooldown expired, AI processing resumed.');
  }
}, 5000);

app.listen(config.port, () => {
  console.log(`SentryVision backend listening on http://localhost:${config.port}`);
});
