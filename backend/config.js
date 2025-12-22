require("dotenv").config({ path: ".env.local" });

module.exports = {
  port: Number(process.env.PORT || 4000),

  frameRate: Number(process.env.FRAME_RATE || 1),
  maxSeconds: Number(process.env.MAX_SECONDS || 60),
  visionConcurrency: Number(process.env.VISION_CONCURRENCY || 4),

  anomalyThreshold: Number(process.env.ANOMALY_THRESHOLD || 0.6),
  cooldownMs: Number(process.env.COOLDOWN_MS || 300000),

  azure: {
    cogEndpoint: process.env.AZURE_COG_ENDPOINT,
    cogKey: process.env.AZURE_COG_KEY
  },

  ollama: {
    url: process.env.OLLAMA_URL || "http://localhost:11434",
    model: process.env.OLLAMA_MODEL || "llama3"
  },

  paths: {
    uploads: "uploads",
    frames: "frames",
    alertsFile: "alerts-store.json"
  }
};
