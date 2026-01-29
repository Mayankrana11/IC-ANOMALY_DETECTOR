# SentryVision – Video-Based Anomaly Detection System

## Overview

SentryVision is a video analytics system designed to detect traffic-related anomalies such as vehicle collisions, falls, and other abnormal events from CCTV-style video feeds. The system combines classical computer vision, object detection, multi-object tracking, rule-based anomaly reasoning, and optional machine learning extensions.

The current implementation focuses on offline video analysis, with the architecture intentionally designed to scale toward real-time CCTV streams in future iterations.

---

## High-Level Architecture

The system is divided into three logical layers:

1. Vision Layer (Python)  
   Performs object detection, tracking, motion analysis, and video annotation.

2. Anomaly Reasoning Layer (Node.js)  
   Analyzes spatio-temporal motion data to detect anomalous events.

3. API & Integration Layer (Node.js + Frontend)  
   Handles uploads, orchestrates processing, and serves results.

---

## Processing Flow

### Step 1: Video Ingestion
Videos are placed in the `backend/uploads/` directory.  
These videos act as the immutable source of truth and are never modified directly.

### Step 2: Vision Processing (Python)
Executed using:
```
python -m vision.vision_engine
```

This step performs:
- YOLOv8 object detection on each frame
- SORT-based multi-object tracking to assign stable IDs
- Motion analysis to compute object centers, timestamps, and pixel-level speeds
- Generation of structured motion data and annotated videos

Outputs are written to:
- `backend/vision_output/`
- `backend/annotated_videos/`

### Step 3: Anomaly Analysis (Node.js)
Triggered via API:
```
POST /api/analyze
```

This stage:
- Loads vision-generated motion data
- Applies heuristic-based anomaly detection using proximity, motion, and time
- Determines anomaly type (e.g., COLLISION)
- Writes an anomaly metadata file used by the vision layer

### Step 4: Annotation Refinement
The vision engine is re-run after anomaly detection:
```
python -m vision.vision_engine
```

During this pass:
- Anomaly metadata is loaded
- Bounding boxes are color-coded based on time, distance, and motion
- Only relevant objects are highlighted

---

## Directory Structure

```
├── backend
│   ├── annotated_videos
│   ├── incoming_uploads
│   ├── ml
│   ├── services
│   ├── uploads
│   ├── vision
│   ├── vision_output
│   ├── server.js
│   └── node_modules
│
├── frontend
│   ├── node_modules
│   └── UI assets
```

---

## Key Components

### Vision Engine
Located at `backend/vision/vision_engine.py`

- YOLOv8 for object detection
- SORT tracker for persistent IDs
- Pixel-based speed estimation
- Anomaly-aware annotation logic
- Outputs structured JSON and annotated videos

### Anomaly Service
Located at `backend/services/anomaly.js`

- Consumes motion events
- Detects anomalies using spatio-temporal heuristics
- Produces anomaly descriptors for vision refinement

### API Server
Located at `backend/server.js`

- Handles video uploads safely
- Orchestrates analysis flow
- Integrates optional AI-based reasoning

---

## Current Capabilities

- Vehicle collision detection
- Object-level anomaly localization
- Time-aware annotation
- Modular design suitable for real-time extension

---

## Known Limitations

- Heuristic-based anomaly detection can produce false positives
- Limited semantic understanding of events
- Accuracy depends on camera angle and scene layout

---

## Planned Enhancements

- CNN/LSTM-based accident classifiers
- Class-aware filtering
- Real-time stream processing
- Fire and fall detection using learned models
- Improved temporal consistency

---

## Research and Educational Value

This project demonstrates:
- End-to-end video analytics pipeline design
- Practical trade-offs between heuristics and machine learning
- Real-world challenges in anomaly detection
- Foundations for intelligent surveillance systems

---

## Typical Execution Workflow

```
python -m vision.vision_engine
curl -X POST http://localhost:4000/api/analyze -F "video=@uploads/testX.mp4"
python -m vision.vision_engine
```

---

