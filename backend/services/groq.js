const OpenAI = require("openai");
const config = require("../config");

const client = new OpenAI({
  apiKey: config.groq.apiKey,
  baseURL: "https://api.groq.com/openai/v1"
});

async function classifyEvent(eventContext, anomalyScore) {

  const prompt = `
You are an AI-powered incident classification system used for CCTV surveillance.

An anomaly has been detected.

Anomaly score (0–1): ${anomalyScore}

Event context:
${JSON.stringify(eventContext, null, 2)}

Your task:
1. Decide whether this event represents a real-world safety or security incident.
2. Classify severity as Low / Medium / High
3. Provide a short reason.

Return ONLY valid JSON:

{
  "flag": true | false,
  "severity": "Low" | "Medium" | "High",
  "reason": "short explanation"
}
`;

  try {

    const completion = await client.chat.completions.create({
      model: config.groq.model,
      messages: [
        { role: "system", content: "You are a CCTV anomaly classifier." },
        { role: "user", content: prompt }
      ],
      temperature: 0.2
    });

    const raw = completion.choices[0].message.content;

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
    console.error("Groq error:", err.message);

    return {
      flag: false,
      severity: "Low",
      reason: "LLM inference failed"
    };
  }
}

module.exports = { classifyEvent };