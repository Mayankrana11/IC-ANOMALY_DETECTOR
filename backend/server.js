// server.js — FIXED & STABLE
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");

const config = require("./config");
const { extractFrames } = require("./utils/frameExtractor");
const motion = require("./services/motion");
const ollama = require("./services/ollama");

const app = express();

/* =====================
   Middleware
===================== */
app.use(cors({ origin: "*" }));
app.use(express.json());

/* =====================
   Root
===================== */
app.get("/", (_, res) => {
  res.send(`
    <h2>SentryVision Backend is running</h2>
    <ul>
      <li>GET /api/ping</li>
      <li>POST /api/analyze</li>
      <li>GET /api/alerts</li>
      <li>POST /api/reset-cooldown</li>
    </ul>
  `);
});

/* =====================
   Directories
===================== */
for (const dir of [config.paths.uploads, config.paths.frames]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

app.use("/frames", express.static(config.paths.frames));
app.use("/uploads", express.static(config.paths.uploads));

/* =====================
   Multer
===================== */
const upload = multer({
  storage: multer.diskStorage({
    destination: (_, __, cb) => cb(null, config.paths.uploads),
    filename: (_, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
  })
});

/* =====================
   Alerts Store
===================== */
let alerts = [];
const alertsFile = path.join(__dirname, config.paths.alertsFile);

if (fs.existsSync(alertsFile)) {
  try {
    alerts = JSON.parse(fs.readFileSync(alertsFile));
  } catch {
    alerts = [];
  }
}

const persistAlerts = () =>
  fs.writeFileSync(alertsFile, JSON.stringify(alerts, null, 2));

/* =====================
   Cooldown
===================== */
let cooldownActive = false;
let cooldownStart = 0;

/* =====================
   Health
===================== */
app.get("/api/ping", (_, res) => {
  res.json({ ok: true, cooldownActive });
});

/* =====================
   ANALYZE
===================== */
app.post("/api/analyze", upload.single("video"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No video uploaded" });

    if (cooldownActive) {
      return res.json({
        status: "cooldown",
        cooldownActive
      });
    }

    const videoPath = path.join(config.paths.uploads, req.file.filename);

    const frames = await extractFrames(
      videoPath,
      config.frameRate,
      config.maxSeconds
    );

    const motionScores = await motion.computeMotionScores(frames);
    const motionResult = motion.detectMotionAnomaly(
      motionScores,
      config.motionZThreshold
    );

    let aiDecision = {
      flag: false,
      severity: "None",
      reason: "No anomaly detected"
    };

    let createdAlert = null;

    if (motionResult.is_anomaly) {
      aiDecision = await ollama.classifyEvent(
        [{ signal: "motion", score: motionResult.score }],
        motionResult.score
      );

      if (aiDecision.flag) {
        createdAlert = {
          id: uuidv4(),
          timestamp: new Date().toISOString(),
          severity: aiDecision.severity,
          reason: aiDecision.reason,
          anomalyScore: motionResult.score,
          sample_frame: path.basename(
            frames[Math.floor(frames.length / 2)]
          )
        };

        alerts.unshift(createdAlert);
        persistAlerts();

        if (aiDecision.severity === "High") {
          cooldownActive = true;
          cooldownStart = Date.now();
        }
      }
    }

    res.json({
      framesAnalyzed: frames.length,
      anomalyScore: motionResult.score,
      motionResult,
      aiDecision,
      alert: createdAlert,
      cooldownActive
    });

  } catch (err) {
    console.error("Analyze error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* =====================
   Alerts
===================== */
app.get("/api/alerts", (_, res) => {
  res.json({ cooldownActive, alerts });
});

/* =====================
   Reset Cooldown
===================== */
app.post("/api/reset-cooldown", (_, res) => {
  cooldownActive = false;
  cooldownStart = 0;
  res.json({ ok: true });
});

/* =====================
   Cooldown Timer
===================== */
setInterval(() => {
  if (cooldownActive && Date.now() - cooldownStart > config.cooldownMs) {
    cooldownActive = false;
    console.log("Cooldown expired");
  }
}, 5000);

/* =====================
   Start
===================== */
app.listen(config.port, () => {
  console.log(`SentryVision running on http://localhost:${config.port}`);
});
