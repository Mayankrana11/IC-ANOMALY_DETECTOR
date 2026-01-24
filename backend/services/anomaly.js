// backend/services/anomaly.js

function analyzeEvents(events) {
  if (!events || events.length === 0) {
    return {
      score: 0,
      is_anomaly: false,
      eventType: "NONE",
      objectIds: []
    };
  }

  // -------- FALL (single object) --------
  for (const e of events) {
    if (
      e.stop_frames > 20 &&
      e.avg_speed < 1 &&
      e.trajectory_len > 20
    ) {
      return {
        score: 0.6,
        is_anomaly: true,
        eventType: "FALL",
        objectIds: [e.id]
      };
    }
  }

  // -------- COLLISION (two objects) --------
  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      const A = events[i];
      const B = events[j];

      const bothMovingBefore =
        A.avg_speed > 2 &&
        B.avg_speed > 2;

      const bothStopped =
        A.stop_frames > 20 &&
        B.stop_frames > 20;

      if (bothMovingBefore && bothStopped) {
        return {
          score: 1,
          is_anomaly: true,
          eventType: "COLLISION",
          objectIds: [A.id, B.id]
        };
      }
    }
  }

  return {
    score: 0,
    is_anomaly: false,
    eventType: "NONE",
    objectIds: []
  };
}

module.exports = { analyzeEvents };
