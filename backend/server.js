// server.js: main backend
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");

const config = require("./config");
const { extractFrames } = require("./utils/frameExtractor");
const motion = require("./services/motion"); // ✅ NEW
const ollama = require("./services/ollama");

const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  res.send(`
    <h2>SentryVision Backend is running</h2>
    <p>Available endpoints:</p>
    <ul>
      <li>GET /api/ping</li>
      <li>POST /api/analyze</li>
      <li>GET /api/alerts</li>
    </ul>
  `);
});

// Ensure folders exist
if (!fs.existsSync(config.paths.uploads))
  fs.mkdirSync(config.paths.uploads, { recursive: true });
if (!fs.existsSync(config.paths.frames))
  fs.mkdirSync(config.paths.frames, { recursive: true });

// Serve frames
app.use("/frames", express.static(path.join(__dirname, config.paths.frames)));
app.use("/uploads", express.static(path.join(__dirname, config.paths.uploads)));

// Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, config.paths.uploads),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });

// Alerts store
let alerts = [];
const alertsFile = path.join(__dirname, config.paths.alertsFile);
if (fs.existsSync(alertsFile)) {
  try {
    alerts = JSON.parse(fs.readFileSync(alertsFile));
  } catch {
    alerts = [];
  }
}

function persistAlerts() {
  try {
    fs.writeFileSync(alertsFile, JSON.stringify(alerts, null, 2));
  } catch (e) {
    console.error("Persist alerts failed", e);
  }
}

// Cooldown
let cooldownActive = false;
let cooldownStart = 0;

// Health
app.get("/api/ping", (req, res) => {
  res.json({ ok: true, cooldownActive });
});

/**
 * /api/analyze
 * NEW FLOW:
 * - Extract frames
 * - Compute motion scores
 * - Detect motion anomaly
 * - Ollama classifies severity
 * - High severity → alert + cooldown
 */
app.post("/api/analyze", upload.single("video"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No video uploaded" });
    }

    // Cooldown handling
    if (cooldownActive) {
      const meta = {
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        status: "cooldown_ignored",
        filename: req.file.filename
      };
      alerts.unshift(meta);
      persistAlerts();
      return res.json({
        status: "cooldown",
        message: "System in cooldown. AI processing skipped.",
        meta
      });
    }

    const videoPath = path.join(
      __dirname,
      config.paths.uploads,
      req.file.filename
    );

    // 1) Extract frames
    const frames = await extractFrames(
      videoPath,
      config.frameRate,
      config.maxSeconds
    );

    const selectedFrames = frames.slice(
      0,
      Math.ceil(config.frameRate * config.maxSeconds)
    );

    // 2) MOTION ANALYSIS ✅
    const motionScores = await motion.computeMotionScores(selectedFrames);
    const motionResult = motion.detectMotionAnomaly(
      motionScores,
      config.motionZThreshold
    );

    // 3) Ollama reasoning
    let aiDecision = {
      flag: false,
      severity: "Low",
      reason: "No significant motion anomaly detected"
    };

    if (motionResult.is_anomaly) {
      aiDecision = await ollama.classifyEvent(
        [
          {
            signal: "motion",
            score: motionResult.score,
            description: "Sudden motion irregularity detected"
          }
        ],
        motionResult.score
      );

      if (aiDecision.flag) {
        const alert = {
          id: uuidv4(),
          timestamp: new Date().toISOString(),
          severity: aiDecision.severity,
          reason: aiDecision.reason,
          motionScore: motionResult.score,
          sample_frame: path.basename(
            selectedFrames[Math.floor(selectedFrames.length / 2)] || ""
          )
        };

        alerts.unshift(alert);
        persistAlerts();

        if (aiDecision.severity === "High") {
          cooldownActive = true;
          cooldownStart = Date.now();
        }
      }
    }

    return res.json({
      framesAnalyzed: selectedFrames.length,
      motionResult,
      aiDecision,
      cooldownActive
    });
  } catch (err) {
    console.error("Analyze error:", err?.message || err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Alerts list
app.get("/api/alerts", (req, res) => {
  res.json({ cooldownActive, alerts });
});

// Cooldown reset
setInterval(() => {
  if (cooldownActive && Date.now() - cooldownStart >= config.cooldownMs) {
    cooldownActive = false;
    console.log("Cooldown expired. AI resumed.");
  }
}, 5000);

// Start server
app.listen(config.port, () => {
  console.log(
    `SentryVision backend running on http://localhost:${config.port}`
  );
});
