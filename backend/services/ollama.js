const axios = require("axios");
const config = require("../config");

/**
 * classifyEvent()
 * Uses Ollama (LLaMA 3) to decide:
 * - flag (true/false)
 * - severity (Low/Medium/High)
 * - reason (short explanation)
 *
 * @param {Object|Array} eventContext - motion anomaly or combined signals
 * @param {number} anomalyScore - normalized anomaly score (0–1)
 */
async function classifyEvent(eventContext, anomalyScore) {
  const prompt = `
You are an AI-powered incident classification system used for CCTV surveillance.

An anomaly has been detected.

Anomaly score (0–1): ${anomalyScore}

Event context:
${JSON.stringify(eventContext, null, 2)}

Your task:
1. Decide whether this event represents a real-world safety or security incident.
2. Classify severity as:
   - Low: normal activity or insignificant motion
   - Medium: unusual but non-critical event
   - High: accidents, crashes, falls, or situations requiring immediate response
3. Provide a concise reason.

IMPORTANT RULES:
- Vehicle collisions, sudden stops, crashes, or falls are HIGH severity.
- Minor motion variations are LOW.
- Output ONLY valid JSON.
- Do NOT include explanations outside JSON.

Required JSON format:
{
  "flag": true | false,
  "severity": "Low" | "Medium" | "High",
  "reason": "one short sentence"
}
`;

  try {
    const res = await axios.post(
      `${config.ollama.url}/api/generate`,
      {
        model: config.ollama.model,
        prompt,
        stream: false
      },
      { timeout: 30000 }
    );

    const raw = res.data?.response || "";

    // Extract first JSON object defensively
    const match = raw.match(/\{[\s\S]*?\}/);

    if (!match) {
      return {
        flag: false,
        severity: "Low",
        reason: "Model response could not be parsed"
      };
    }

    return JSON.parse(match[0]);
  } catch (err) {
    console.error("Ollama error:", err.message);
    return {
      flag: false,
      severity: "Low",
      reason: "LLM inference failed"
    };
  }
}

module.exports = { classifyEvent };
