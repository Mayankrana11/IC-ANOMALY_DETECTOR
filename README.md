# X

X is an intelligent CCTV incident detection and alerting
system built using **Azure AI Vision**, **Azure Anomaly Detector**, and
**Azure OpenAI**.\
The goal is to transform traditional passive surveillance cameras into
active, real-time safety monitoring tools.

-----------------------------------------------------------------------

## 🚨 Problem

Current CCTV systems **only record**, they do not understand what is
happening.\
Security personnel monitoring live feeds often:

-   Get distracted\
-   Miss early signs of violence, intrusion, or unsafe behavior\
-   Respond late to emergencies

There is no AI-driven system that can detect anomalies or automatically
alert authorities.

------------------------------------------------------------------------

## 🎯 Solution: X

X analyzes CCTV-like video feeds to:

1.  **Interpret the scene using Azure AI Vision**\
2.  **Detect unusual or dangerous behavior with Azure Anomaly
    Detector**\
3.  **Explain incidents & classify severity using Azure OpenAI**\
4.  **Generate real-time alerts for authorities**

This makes CCTV an **active safety assistant**, not just a recording
tool.

------------------------------------------------------------------------

## 🧠 Azure Services Used

### 1. Azure AI Vision

-   Detects people, objects, movement patterns from video frames\
-   Provides structured signals for anomaly detection

### 2. Azure Anomaly Detector

-   Identifies unusual patterns (crowd spikes, erratic movement,
    intrusions)\
-   Outputs anomaly scores

### 3. Azure OpenAI

-   Interprets anomaly scores\
-   Generates meaningful explanations\
-   Predicts severity (Low / Medium / High)\
-   Suggests recommended actions

------------------------------------------------------------------------

## 🛠️ Workflow Overview

1.  **Upload CCTV-like video**\
2.  System extracts frames\
3.  Azure Vision analyzes frames\
4.  Numerical patterns sent to Anomaly Detector\
5.  Azure OpenAI interprets & explains anomalies\
6.  Dashboard shows alerts with severity levels

------------------------------------------------------------------------

## 🎥 MVP Goal (for now)

Build a demo where:

-   A video is uploaded\
-   Frames are processed through Vision → Anomaly → OpenAI\
-   Alerts are displayed on a clean dashboard

------------------------------------------------------------------------

## 📅 Timeline (MVP until Jan 9)

-   Week 1: Azure services integration + frame extraction\
-   Week 2: Backend pipeline + dashboard\
-   Week 3: Pitch deck, demo video, final refinements

------------------------------------------------------------------------

