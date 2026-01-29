# backend/vision/vision_engine.py
#follows keras flow

import os
import cv2
import json
import math
from ultralytics import YOLO
from vision.sort_tracker import SortTracker


# Paths

BASE = os.path.dirname(__file__)
UPLOAD = os.path.join(BASE, "..", "uploads")
OUT = os.path.join(BASE, "..", "vision_output")
ANNOT = os.path.join(BASE, "..", "annotated_videos")

os.makedirs(OUT, exist_ok=True)
os.makedirs(ANNOT, exist_ok=True)


# Models

model = YOLO("yolov8n.pt")
tracker = SortTracker()


# Colors

COLORS = {
    "NONE": (0, 255, 0),        # Green
    "FALL": (0, 255, 255),      # Yellow
    "COLLISION": (0, 0, 255),   # Red
    "FIRE": (0, 0, 255)         # Red
}


# Motion memory

last_positions = {}  # track_id -> (cx, cy, timestamp)


# Speed computation

def compute_speed(track_id, cx, cy, ts):
    if track_id not in last_positions:
        last_positions[track_id] = (cx, cy, ts)
        return 0.0

    px, py, pts = last_positions[track_id]
    dt = ts - pts
    if dt <= 0:
        return 0.0

    dist = math.hypot(cx - px, cy - py)
    speed = dist / dt

    last_positions[track_id] = (cx, cy, ts)
    return speed


# Load anomaly decision

def load_anomaly(video):
    p = os.path.join(OUT, f"{video}.anomaly.json")
    if not os.path.exists(p):
        return None
    return json.load(open(p, "r"))


# Main vision pass

def run(video_path):
    name = os.path.basename(video_path)
    print(f"[VISION] Processing {name}")

    anomaly = load_anomaly(name)

    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    out = cv2.VideoWriter(
        os.path.join(ANNOT, name.replace(".mp4", "_annotated.mp4")),
        cv2.VideoWriter_fourcc(*"mp4v"),
        fps,
        (w, h)
    )

    events = []
    frame_idx = 0

    while True:
        ok, frame = cap.read()
        if not ok:
            break

        ts = frame_idx / fps

        # YOLO detection
        result = model(frame, conf=0.4, verbose=False)[0]

        detections = []
        for b in result.boxes:
            x1, y1, x2, y2 = map(int, b.xyxy[0])
            detections.append({
                "bbox": (x1, y1, x2, y2),
                "class": model.names[int(b.cls[0])]
            })

        tracks = tracker.update(detections)

        for t in tracks:
            x1, y1, x2, y2 = map(int, t.bbox)
            cx = (x1 + x2) // 2
            cy = (y1 + y2) // 2

            speed = compute_speed(t.id, cx, cy, ts)

            color = COLORS["NONE"]

            
            # FIX 2 — CORRECT anomaly gating
            
            if anomaly and anomaly.get("eventType") != "NONE":
                start_time = anomaly.get("startTime", float("inf"))
                center = anomaly.get("center")
                radius = anomaly.get("radius", 120)
                min_speed = anomaly.get("minSpeed", 30)

                if ts >= start_time and center:
                    dx = cx - center["x"]
                    dy = cy - center["y"]
                    dist = math.hypot(dx, dy)

                    if dist <= radius and speed >= min_speed:
                        color = COLORS.get(
                            anomaly.get("eventType", "NONE"),
                            COLORS["NONE"]
                        )

            # Draw
            cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
            cv2.putText(
                frame,
                f"{t.cls} #{t.id}",
                (x1, y1 - 5),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.6,
                color,
                2
            )

            events.append({
                "id": t.id,
                "class": t.cls,
                "cx": cx,
                "cy": cy,
                "timestamp": ts,
                "bbox": [x1, y1, x2, y2],
                "speed": round(speed, 2)
            })

        out.write(frame)
        frame_idx += 1

    cap.release()
    out.release()

    json.dump(
        {"video": name, "events": events},
        open(os.path.join(OUT, f"{name}.json"), "w"),
        indent=2
    )


# Entry

if __name__ == "__main__":
    for v in os.listdir(UPLOAD):
        if v.endswith(".mp4"):
            run(os.path.join(UPLOAD, v))
