// Use Azure OpenAI completions endpoint to classify event.
// Sends a compact prompt and requests JSON output.
// Returns parsed JSON: { flag: boolean, severity: "Low|Medium|High", reason: string }

const axios = require('axios');
const config = require('../config');

async function classifyEvent(visionSummary, anomalyScore) {
  const prompt = `
You are an incident detection assistant. Given a vision summary (first few frames) and an anomaly score, decide whether this is a safety/security incident that should be flagged.

Vision summary: ${JSON.stringify(visionSummary.slice(0,6))}
Anomaly score: ${anomalyScore}

Return ONLY JSON in this exact format:
{"flag": <true|false>, "severity": "<Low|Medium|High>", "reason": "<brief explanation in one sentence>"}
Ensure severity is "High" only for strong safety threats (fight, crowd panic, weapon visible, rapid crowd surge).
  `.trim();

  const url = `${config.azure.openaiEndpoint}/openai/deployments/${config.azure.openaiDeployment}/completions?api-version=2023-06-01-preview`;

  try {
    const res = await axios.post(url, {
      prompt,
      max_tokens: 200,
      temperature: 0.0
    }, {
      headers: {
        'api-key': config.azure.openaiKey,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    const text = res.data?.choices?.[0]?.text || '';
    try {
      const json = JSON.parse(text.trim());
      return json;
    } catch (parseErr) {
      // If model didn't strictly return JSON, attempt to extract JSON substring
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        try { return JSON.parse(match[0]); } catch {}
      }
      console.error('OpenAI parse error, raw text:', text);
      return { flag: false, severity: 'Low', reason: 'Could not parse model output' };
    }
  } catch (err) {
    console.error('OpenAI call error:', err?.response?.data || err?.message || err);
    return { flag: false, severity: 'Low', reason: 'openai-call-failed' };
  }
}

module.exports = { classifyEvent };
