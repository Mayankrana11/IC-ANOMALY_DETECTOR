const API = "http://localhost:4000";

async function uploadVideo() {
  const input = document.getElementById("videoInput");
  if (!input.files.length) {
    alert("Please select a video file");
    return;
  }

  const formData = new FormData();
  formData.append("video", input.files[0]);

  document.getElementById("uploadStatus").innerText = "Uploading...";

  const res = await fetch(`${API}/api/analyze`, {
    method: "POST",
    body: formData
  });

  const data = await res.json();
  document.getElementById("uploadStatus").innerText = "Done";

  loadAlerts();
}

async function loadAlerts() {
  const res = await fetch(`${API}/api/alerts`);
  const data = await res.json();

  document.getElementById("cooldownStatus").innerText =
    data.cooldownActive ? "ACTIVE" : "INACTIVE";

  if (!data.alerts || data.alerts.length === 0) return;

  const alert = data.alerts[0]; // latest

  document.getElementById("score").innerText = alert.anomalyScore ?? "—";
  document.getElementById("severity").innerText = alert.severity ?? "—";
  document.getElementById("reason").innerText = alert.reason ?? "—";

  if (alert.sample_frame) {
    document.getElementById("impactFrame").src =
      `${API}/frames/${alert.sample_frame}`;
    document.getElementById("frameName").innerText =
      `Frame: ${alert.sample_frame}`;
  }
}

async function resetCooldown() {
  await fetch(`${API}/api/reset-cooldown`, { method: "POST" });
  loadAlerts();
}

// Initial load
loadAlerts();
