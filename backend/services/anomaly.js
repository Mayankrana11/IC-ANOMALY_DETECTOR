// services/anomaly.js
// Local anomaly detection (no Azure calls)

function detectTimeSeries(timeseries) {
  if (!Array.isArray(timeseries) || timeseries.length < 5) {
    return { is_anomaly: false, score: 0 };
  }

  const values = timeseries.map(t => Number(t.value) || 0);

  const mean = values.reduce((a, b) => a + b, 0) / values.length;

  const variance =
    values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;

  const std = Math.sqrt(variance);

  const max = Math.max(...values);

  const z = std === 0 ? 0 : (max - mean) / std;

  // Normalize z-score → [0,1]
  const score = Math.min(1, Math.max(0, z / 5));

  return {
    is_anomaly: score > 0.5,
    score
  };
}

module.exports = { detectTimeSeries };
