const Jimp = require("jimp");

/**
 * Computes motion scores between consecutive frames.
 * Motion score = average grayscale pixel difference.
 */
async function computeMotionScores(framePaths) {
  const scores = [];

  for (let i = 1; i < framePaths.length; i++) {
    const img1 = await Jimp.read(framePaths[i - 1]);
    const img2 = await Jimp.read(framePaths[i]);

    // Reduce noise & speed up
    img1.resize(320, Jimp.AUTO).grayscale();
    img2.resize(320, Jimp.AUTO).grayscale();

    let diffSum = 0;
    let count = 0;

    img1.scan(
      0,
      0,
      img1.bitmap.width,
      img1.bitmap.height,
      function (x, y, idx) {
        const p1 = img1.bitmap.data[idx]; // grayscale value
        const p2 = img2.bitmap.data[idx];
        diffSum += Math.abs(p1 - p2);
        count++;
      }
    );

    const avgDiff = diffSum / count;
    scores.push(avgDiff);
  }

  return scores;
}

/**
 * Detects motion anomaly using normalized Z-score.
 * IMPORTANT:
 * - We DO NOT require z >= 3 anymore (too strict for physical events)
 * - We classify anomaly based on normalized score
 */
function detectMotionAnomaly(scores, zThreshold = 3.0) {
  if (scores.length < 5) {
    return { is_anomaly: false, score: 0 };
  }

  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;

  const variance =
    scores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / scores.length;

  const std = Math.sqrt(variance);

  if (std === 0) {
    return { is_anomaly: false, score: 0 };
  }

  const zScores = scores.map(v => Math.abs((v - mean) / std));
  const maxZ = Math.max(...zScores);

  // Normalize score to 0–1
  const score = Math.min(maxZ / zThreshold, 1);

  // ✅ CRITICAL FIX: anomaly decision based on score, not raw Z
  return {
    is_anomaly: score >= 0.6,   // <-- THIS FIXES YOUR PROBLEM
    score
  };
}

module.exports = {
  computeMotionScores,
  detectMotionAnomaly
};
