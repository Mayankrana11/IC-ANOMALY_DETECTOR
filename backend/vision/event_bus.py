import json
import os

OUTPUT_DIR = "../vision_output"

class EventBus:
    def __init__(self, video_name):
        self.video_name = video_name
        self.events = []

        os.makedirs(OUTPUT_DIR, exist_ok=True)

    def emit(self, event):
        self.events.append(event)

    def flush(self):
        output_path = os.path.join(
            OUTPUT_DIR,
            f"{self.video_name}.json"
        )

        with open(output_path, "w") as f:
            json.dump({
                "video": self.video_name,
                "events": self.events
            }, f, indent=2)
