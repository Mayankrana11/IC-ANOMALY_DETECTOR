// backend/server.js

const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const cors = require("cors");

const config = require("./config");
const { analyzeEvents } = require("./services/anomaly");
const ollama = require("./services/ollama");

const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json());


//    Directories

const UPLOAD_DIR = path.join(__dirname, "uploads");              // READ ONLY
const INCOMING_DIR = path.join(__dirname, "incoming_uploads");  // API uploads
const VISION_OUTPUT_DIR = path.join(__dirname, "vision_output");
const ANNOTATED_DIR = path.join(__dirname, "annotated_videos");
const ALERTS_FILE = path.join(__dirname, config.paths.alertsFile);

// Create required dirs
for (const dir of [
  UPLOAD_DIR,
  INCOMING_DIR,
  VISION_OUTPUT_DIR,
  ANNOTATED_DIR
]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

app.use("/annotated_videos", express.static(ANNOTATED_DIR));


//    Multer 
//    NEVER writes to uploads/

const upload = multer({
  storage: multer.diskStorage({
    destination: (_, __, cb) => cb(null, INCOMING_DIR),
    filename: (_, file, cb) =>
      cb(null, `${Date.now()}-${file.originalname}`)
  })
});


//    Cooldown

let cooldownActive = false;
let cooldownStart = 0;


//    Helpers

function readVisionOutput(videoName) {
  const p = path.join(VISION_OUTPUT_DIR, `${videoName}.json`);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p));
}


//    Analyze Endpoint

app.post("/api/analyze", upload.single("video"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No video uploaded" });
    }

    // We analyze the ORIGINAL file already processed by vision_engine
    const originalName = req.file.originalname;
    const visionData = readVisionOutput(originalName);

    if (!visionData) {
      return res.status(400).json({
        error: "Run vision_engine before analysis"
      });
    }

    const anomaly = analyzeEvents(visionData.events || []);

    const anomalyPath = path.join(
      VISION_OUTPUT_DIR,
      `${originalName}.anomaly.json`
    );

 
    //    SYNC FOR VISION
 

    if (anomaly.is_anomaly) {
      fs.writeFileSync(
        path.join(VISION_OUTPUT_DIR, `${originalName}.anomaly.json`),
        JSON.stringify(
          {
            eventType: anomaly.eventType,
            startTime: anomaly.startTime ?? 0,
            center: anomaly.center ?? null,
            radius: anomaly.radius ?? 150,
            minSpeed: anomaly.minSpeed ?? 30,
            objectIds: anomaly.objectIds ?? []
          },
          null,
          2
        )
      );
    } else {
      // Remove stale anomaly file so vision stays green
      if (fs.existsSync(anomalyPath)) {
        fs.unlinkSync(anomalyPath);
      }
    }


      //  AI Decision

    let aiDecision = {
      flag: false,
      severity: "None",
      reason: "Normal traffic"
    };

    if (anomaly.is_anomaly) {
      if (anomaly.eventType === "COLLISION") {
        aiDecision = await ollama.classifyEvent(
          [{ signal: "vehicle collision" }],
          1
        );
        cooldownActive = true;
        cooldownStart = Date.now();
      } else if (anomaly.eventType === "FALL") {
        aiDecision = {
          flag: true,
          severity: "Medium",
          reason: "Single object fall detected"
        };
      }
    }

    res.json({
      framesAnalyzed: visionData.events.length,
      eventType: anomaly.eventType || "NONE",
      aiDecision,
      annotatedVideo: originalName.replace(".mp4", "_annotated.mp4"),
      cooldownActive
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});


//    Start

app.listen(config.port, () => {
  console.log(`SentryVision running on http://localhost:${config.port}`);
});
