# SentryVision Backend (MVP)

## Setup
1. Install dependencies
   cd backend
   npm install

2. Install ffmpeg on your system and ensure `ffmpeg` is on PATH:
   - Windows: choco install ffmpeg
   - macOS: brew install ffmpeg
   - Linux: apt / yum as appropriate

3. Copy .env.local -> .env and fill Azure keys + deployment name.

4. Start server:
   npm run dev   # or npm start

5. Upload a test 1-minute mp4 to POST /api/analyze (multipart/form-data, field name: 'video')
   Example using curl:
   curl -F "video=@myclip.mp4" http://localhost:4000/api/analyze

6. Get alerts:
   GET http://localhost:4000/api/alerts

7. Thumbnails (frames) are served from /frames/<filename.jpg>

## Notes
- The server uses 1 FPS and extracts up to `MAX_SECONDS` frames per video. Adjust in .env.
- Vision calls are batched with concurrency limit to avoid rate-limits.
- OpenAI is only called if anomaly score >= ANOMALY_THRESHOLD.
- A HIGH severity from OpenAI triggers a cooldown (COOLDOWN_MS) where AI processing is paused.
- Alerts are stored to `alerts-store.json` for persistence.
