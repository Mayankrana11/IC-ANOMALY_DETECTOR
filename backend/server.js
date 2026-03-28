// backend/server.js

const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const cors = require("cors");

const config = require("./config");
const { analyzeEvents } = require("./services/anomaly");
// const ollama = require("./services/ollama"); //ollama inference
const ollama = require("./services/groq"); //groq llama3 inference

const { execSync } = require("child_process");
const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json());


//    Directories

const UPLOAD_DIR = path.join(__dirname, "uploads");              // READ ONLY
const INCOMING_DIR = path.join(__dirname, "incoming_uploads");  // API uploads
const VISION_OUTPUT_DIR = path.join(__dirname, "vision_output");
const ANNOTATED_DIR = path.join(__dirname, "annotated_videos");
const ALERTS_FILE = path.join(__dirname, config.paths.alertsFile);

app.get("/", (req, res) => { //GET for health check
  res.json({ status: "ok", service: "I SEE anomaly detector" });
});

// Create required dirs
for (const dir of [
  UPLOAD_DIR,
  INCOMING_DIR,
  VISION_OUTPUT_DIR,
  ANNOTATED_DIR
]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

app.get("/annotated_videos/:file", (req, res) => {

  const filePath = path.join(ANNOTATED_DIR, req.params.file)
  const stat = fs.statSync(filePath)
  const fileSize = stat.size
  const range = req.headers.range

  if (range) {

    const parts = range.replace(/bytes=/, "").split("-")
    const start = parseInt(parts[0], 10)
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1

    const chunkSize = (end - start) + 1
    const file = fs.createReadStream(filePath, { start, end })

    res.writeHead(206, {
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunkSize,
      "Content-Type": "video/mp4"
    })

    file.pipe(res)

  } else {

    res.writeHead(200, {
      "Content-Length": fileSize,
      "Content-Type": "video/mp4"
    })

    fs.createReadStream(filePath).pipe(res)

  }

})


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


app.post("/api/process", upload.single("video"), async (req, res) => {
  try {

    if (!req.file) {
      return res.status(400).json({ error: "No video uploaded" });
    }

    // copy uploaded file → uploads/test.mp4
    const dest = path.join(UPLOAD_DIR, "test.mp4");
    fs.copyFileSync(req.file.path, dest);

    console.log("Video copied to uploads/test.mp4");

    // STEP 1 vision pass
    execSync("python -m vision.vision_engine", { cwd: __dirname });
    console.log("Vision pass 1 done");

    // STEP 2 anomaly + LLM
    const visionData = readVisionOutput("test.mp4");

    const anomaly = analyzeEvents(visionData.events || []);

    const anomalyPath = path.join(
      VISION_OUTPUT_DIR,
      `test.mp4.anomaly.json`
    );
    console.log("json writing completed");

    if (anomaly.is_anomaly) {
      fs.writeFileSync(
        anomalyPath,
        JSON.stringify(anomaly, null, 2)
      );
    }

    let aiDecision = {
      flag: false,
      severity: "None",
      reason: "Normal traffic"
    };

    if (anomaly.is_anomaly) {
      aiDecision = await ollama.classifyEvent(
        [{ signal: "vehicle collision" }],
        1
      );
    }

    // STEP 3 render anomaly overlay
    execSync("python -m vision.vision_engine", { cwd: __dirname });
    console.log("Vision pass 2 done");

    execSync(
      "ffmpeg -y -i annotated_videos/test_annotated.mp4 -vcodec libx264 -acodec aac annotated_videos/test_browser.mp4"
    )
    console.log("ffmpeg H.264 encoding complete");

    res.json({
      eventType: anomaly.eventType || "NONE",
      aiDecision,
      annotatedVideo: "test_browser.mp4"
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Processing failed" });
  }
});


//    Start

app.listen(config.port, () => {
  console.log(`I SEE running on http://localhost:${config.port}`);
});