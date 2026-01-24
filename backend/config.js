// backend/config.js
require("dotenv").config({ path: ".env.local" });

module.exports = {
  port: Number(process.env.PORT || 4000),

  anomalyThreshold: Number(process.env.ANOMALY_THRESHOLD || 0.6),
  cooldownMs: Number(process.env.COOLDOWN_MS || 300000),

  ollama: {
    url: process.env.OLLAMA_URL || "http://localhost:11434",
    model: process.env.OLLAMA_MODEL || "llama3"
  },

  paths: {
    uploads: "uploads",
    visionOutput: "vision_output",
    alertsFile: "alerts-store.json"
  }
};
