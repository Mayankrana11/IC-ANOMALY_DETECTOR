// Calls Azure Anomaly Detector (timeseries entire-series detect)
// Expects timeseries: [{ timestamp: isoString, value: number }, ...]
// Returns: { is_anomaly: bool, score: number, raw: ... }

const axios = require('axios');
const config = require('../config');

async function detectTimeSeries(timeseries) {
  const url = `${config.azure.anomalyEndpoint}/anomalydetector/v1.1/timeseries/entire/detect`;
  const payload = { series: timeseries, granularity: "second" };

  try {
    const res = await axios.post(url, payload, {
      headers: {
        'Ocp-Apim-Subscription-Key': config.azure.anomalyKey,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    // Different API versions return different structures.
    // We'll attempt to extract a sensible score here.
    const data = res.data || {};
    // If API gives point-wise isAnomaly, compute fraction of anomalous points
    if (data && Array.isArray(data.isAnomaly)) {
      const anomalies = data.isAnomaly.filter(Boolean).length;
      const score = data.isAnomaly.length ? anomalies / data.isAnomaly.length : 0;
      return { is_anomaly: anomalies > 0, score, raw: data };
    }

    // If API returns summary 'anomalyScore' or similar
    if (data && typeof data.anomalyScore === 'number') {
      return { is_anomaly: data.anomalyScore > 0.5, score: data.anomalyScore, raw: data };
    }

    // Fallback heuristic: check large spike relative to median
    const vals = timeseries.map(t => t.value || 0);
    const avg = vals.reduce((a,b)=>a+b,0) / (vals.length || 1);
    const max = Math.max(...vals, 0);
    const ratio = avg === 0 ? (max>0? max : 0) : max / avg;
    const score = Math.min(1, (ratio - 1) / 4);
    return { is_anomaly: score > 0.5, score, raw: data };
  } catch (err) {
    // On error, log and return safe non-anomaly to avoid spamming
    console.error('Anomaly detector error:', err?.response?.data || err?.message || err);
    return { is_anomaly: false, score: 0, error: err?.message || 'anomaly-api-error' };
  }
}

module.exports = { detectTimeSeries };
