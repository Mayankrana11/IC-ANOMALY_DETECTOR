// =====================
// Config
// =====================
window.API = window.API || "http://localhost:4000";
const API = window.API;

// =====================
// Upload & Analyze
// =====================
async function uploadVideo() {
  const input = document.getElementById("videoInput");
  if (!input.files.length) {
    alert("Please select a video file");
    return;
  }

  const formData = new FormData();
  formData.append("video", input.files[0]);

  document.getElementById("uploadStatus").innerText = "Analyzing...";

  try {
    const res = await fetch(`${API}/api/analyze`, {
      method: "POST",
      body: formData
    });

    const data = await res.json();
    document.getElementById("uploadStatus").innerText = "Done";

    // ✅ Use analyze response directly
    if (data.alert) {
      renderAlert(data.alert);
    } else {
      clearAlertUI();
    }

    updateCooldown(data.cooldownActive);
  } catch (err) {
    console.error(err);
    document.getElementById("uploadStatus").innerText = "Error";
  }
}

// =====================
// Render Alert
// =====================
function renderAlert(alert) {
  document.getElementById("severity").innerText =
    alert.severity ?? "—";

  document.getElementById("reason").innerText =
    alert.reason ?? "—";

  document.getElementById("score").innerText =
    alert.anomalyScore !== undefined
      ? alert.anomalyScore.toFixed(3)
      : "—";

  if (alert.sample_frame) {
    document.getElementById("impactFrame").src =
      `${API}/frames/${alert.sample_frame}?t=${Date.now()}`;
    document.getElementById("frameName").innerText =
      `Frame: ${alert.sample_frame}`;
  }
}

// =====================
// Clear UI
// =====================
function clearAlertUI() {
  document.getElementById("severity").innerText = "—";
  document.getElementById("reason").innerText = "No incident detected";
  document.getElementById("score").innerText = "—";
  document.getElementById("impactFrame").src = "";
  document.getElementById("frameName").innerText = "No frame";
}

// =====================
// Cooldown UI
// =====================
function updateCooldown(active) {
  document.getElementById("cooldownStatus").innerText =
    active ? "ACTIVE" : "INACTIVE";
}

// =====================
// Load Alerts (history / refresh)
// =====================
async function loadAlerts() {
  const res = await fetch(`${API}/api/alerts`);
  const data = await res.json();

  updateCooldown(data.cooldownActive);

  if (data.alerts && data.alerts.length > 0) {
    renderAlert(data.alerts[0]);
  }
}

// =====================
// Reset Cooldown
// =====================
async function resetCooldown() {
  await fetch(`${API}/api/reset-cooldown`, { method: "POST" });
  loadAlerts();
}

// Initial state only
updateCooldown(false);
clearAlertUI();

