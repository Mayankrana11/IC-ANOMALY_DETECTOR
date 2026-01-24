# backend/vision/feature_extractor.py

import math
from vision.config import MIN_FRAMES_FOR_FEATURES


class FeatureExtractor:
    def extract(self, tracked_object):
        traj = tracked_object["trajectory"]

        if len(traj) < MIN_FRAMES_FOR_FEATURES:
            return None

        (x1, y1, t1) = traj[-2]
        (x2, y2, t2) = traj[-1]

        dt = t2 - t1 if t2 != t1 else 1e-6
        dx = x2 - x1
        dy = y2 - y1

        speed = math.sqrt(dx*dx + dy*dy) / dt
        direction = math.degrees(math.atan2(dy, dx))

        x1b, y1b, x2b, y2b = tracked_object["bbox"]
        bbox_area = (x2b - x1b) * (y2b - y1b)

        return {
            "id": tracked_object["id"],
            "class": tracked_object["class"],
            "speed": speed,
            "direction": direction,
            "bbox_area": bbox_area
        }
