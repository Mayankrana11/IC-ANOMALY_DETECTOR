// backend/config.js
require("dotenv").config({ path: ".env" });

module.exports = {
  port: Number(process.env.PORT || 4000),

  anomalyThreshold: Number(process.env.ANOMALY_THRESHOLD || 0.6),
  cooldownMs: Number(process.env.COOLDOWN_MS || 300000),

  ollama: {
    url: process.env.OLLAMA_URL || "http://localhost:11434",
    model: process.env.OLLAMA_MODEL || "llama3"
  },

  groq: {
    apiKey: process.env.GROQ_API_KEY,
    model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile"
  },

  paths: {
    uploads: "uploads",
    visionOutput: "vision_output",
    alertsFile: "alerts-store.json"
  }
};
