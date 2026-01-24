# backend/vision/vision_engine.py
import os
import cv2
import json
import math
from ultralytics import YOLO
from vision.sort_tracker import SortTracker

BASE = os.path.dirname(__file__)
UPLOAD = os.path.join(BASE, "..", "uploads")
OUT = os.path.join(BASE, "..", "vision_output")
ANNOT = os.path.join(BASE, "..", "annotated_videos")

os.makedirs(OUT, exist_ok=True)
os.makedirs(ANNOT, exist_ok=True)

model = YOLO("yolov8n.pt")
tracker = SortTracker()

COLORS = {
    "NONE": (0, 255, 0),
    "FALL": (0, 255, 255),
    "COLLISION": (0, 0, 255)
}

def load_anomaly(video):
    p = os.path.join(OUT, f"{video}.anomaly.json")
    if not os.path.exists(p):
        return "NONE", set()
    d = json.load(open(p))
    return d["eventType"], set(d["objectIds"])

def run(video_path):
    name = os.path.basename(video_path)
    print(f"[VISION] Processing {name}")

    eventType, marked = load_anomaly(name)

    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS)
    w, h = int(cap.get(3)), int(cap.get(4))

    out = cv2.VideoWriter(
        os.path.join(ANNOT, name.replace(".mp4", "_annotated.mp4")),
        cv2.VideoWriter_fourcc(*"mp4v"),
        fps,
        (w, h)
    )

    frame_idx = 0

    # store trajectories per track id
    trajectories = {}

    while True:
        ok, frame = cap.read()
        if not ok:
            break

        ts = frame_idx / fps
        res = model(frame, conf=0.4, verbose=False)[0]

        detections = []
        for b in res.boxes:
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

            # store trajectory
            trajectories.setdefault(t.id, []).append((cx, cy, ts))

            state = eventType if t.id in marked else "NONE"
            color = COLORS[state]

            cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
            cv2.putText(
                frame,
                f"{t.cls} #{t.id}",
                (x1, y1 - 6),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.6,
                color,
                2
            )

        out.write(frame)
        frame_idx += 1

    cap.release()
    out.release()

    # ==========================
    # BUILD TRACK-LEVEL EVENTS
    # ==========================
    events = []

    for track_id, traj in trajectories.items():
        if len(traj) < 15:
            continue

        speeds = []
        for i in range(1, len(traj)):
            x1, y1, t1 = traj[i - 1]
            x2, y2, t2 = traj[i]
            dt = max(t2 - t1, 1e-6)
            dist = math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
            speeds.append(dist / dt)

        avg_speed = sum(speeds) / len(speeds)
        stop_frames = sum(1 for s in speeds if s < 0.5)

        events.append({
            "id": track_id,
            "avg_speed": avg_speed,
            "stop_frames": stop_frames,
            "trajectory_len": len(traj)
        })

    json.dump(
        {"video": name, "events": events},
        open(os.path.join(OUT, f"{name}.json"), "w"),
        indent=2
    )

if __name__ == "__main__":
    for v in os.listdir(UPLOAD):
        if v.endswith(".mp4"):
            run(os.path.join(UPLOAD, v))
