# backend/ml/classify_clip.py

import sys, cv2, numpy as np, tensorflow as tf

MODEL_PATH = "backend/ml/model_weights.keras"
IMG_SIZE = 250

model = tf.keras.models.load_model(MODEL_PATH)

def classify(video_path, sample_rate=10):
    cap = cv2.VideoCapture(video_path)
    frames = []

    idx = 0
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        if idx % sample_rate == 0:
            frame = cv2.resize(frame, (IMG_SIZE, IMG_SIZE))
            frames.append(frame / 255.0)
        idx += 1

    cap.release()
    if not frames:
        return 0.0

    preds = model.predict(np.array(frames), verbose=0)
    return float(np.max(preds[:, 1]))  # accident/fire prob

if __name__ == "__main__":
    video = sys.argv[1]
    conf = classify(video)
    print(conf)
