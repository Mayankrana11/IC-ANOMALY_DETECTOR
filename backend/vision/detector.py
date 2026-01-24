# backend/vision/detector.py

from ultralytics import YOLO
from config import CONF_THRESHOLD

VEHICLE_CLASSES = {
    0: "person",
    2: "car",
    3: "motorcycle",
    5: "bus",
    7: "truck"
}

class ObjectDetector:
    def __init__(self, model_path="yolov8n.pt"):
        self.model = YOLO(model_path)

    def detect(self, frame):
        detections = []

        results = self.model(frame, conf=CONF_THRESHOLD, verbose=False)

        for r in results:
            for box in r.boxes:
                cls_id = int(box.cls[0])
                if cls_id not in VEHICLE_CLASSES:
                    continue

                x1, y1, x2, y2 = map(int, box.xyxy[0])
                conf = float(box.conf[0])

                detections.append({
                    "class": VEHICLE_CLASSES[cls_id],
                    "bbox": [x1, y1, x2, y2],
                    "confidence": conf
                })

        return detections
