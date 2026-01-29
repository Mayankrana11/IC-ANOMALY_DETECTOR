// backend/services/anomaly.js

function analyzeEvents(events) {
  if (!events || events.length < 20) {
    return {
      is_anomaly: false,
      eventType: "NONE",
      score: 0,
      objectIds: []
    };
  }

  // Group by time buckets (200ms)
  const buckets = {};
  for (const e of events) {
    const k = Math.floor(e.timestamp * 5);
    if (!buckets[k]) buckets[k] = [];
    buckets[k].push(e);
  }

  for (const bucket of Object.values(buckets)) {
    if (bucket.length < 2) continue;

    for (let i = 0; i < bucket.length; i++) {
      for (let j = i + 1; j < bucket.length; j++) {
        const a = bucket[i];
        const b = bucket[j];

        const d = Math.hypot(a.cx - b.cx, a.cy - b.cy);

        if (d < 60) {
          return {
            is_anomaly: true,
            eventType: "COLLISION",
            score: 1,
            objectIds: [a.id, b.id],

            // 🔑 THESE FIELDS WERE MISSING
            startTime: Math.min(a.timestamp, b.timestamp),
            center: {
              x: Math.round((a.cx + b.cx) / 2),
              y: Math.round((a.cy + b.cy) / 2)
            },
            radius: 150,
            minSpeed: 30
          };
        }
      }
    }
  }

  return {
    is_anomaly: false,
    eventType: "NONE",
    score: 0,
    objectIds: []
  };
}

module.exports = { analyzeEvents };
