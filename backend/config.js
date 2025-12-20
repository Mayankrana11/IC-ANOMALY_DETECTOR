// Centralized configuration loader
require('dotenv').config();

module.exports = {
  port: Number(process.env.PORT || 4000),
  frameRate: Number(process.env.FRAME_RATE || 1),
  maxSeconds: Number(process.env.MAX_SECONDS || 60),
  visionConcurrency: Number(process.env.VISION_CONCURRENCY || 4),
  anomalyThreshold: Number(process.env.ANOMALY_THRESHOLD || 0.6),
  cooldownMs: Number(process.env.COOLDOWN_MS || 5 * 60 * 1000),

  azure: {
    visionEndpoint: process.env.AZURE_VISION_ENDPOINT,
    visionKey: process.env.AZURE_VISION_KEY,
    anomalyEndpoint: process.env.AZURE_ANOMALY_ENDPOINT,
    anomalyKey: process.env.AZURE_ANOMALY_KEY,
    openaiEndpoint: process.env.AZURE_OPENAI_ENDPOINT,
    openaiKey: process.env.AZURE_OPENAI_KEY,
    openaiDeployment: process.env.AZURE_OPENAI_DEPLOYMENT_NAME
  },

  paths: {
    uploads: 'uploads',
    frames: 'frames',
    alertsFile: 'alerts-store.json'
  }
};
