const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');

if (!fs.existsSync(config.paths.frames)) fs.mkdirSync(config.paths.frames, { recursive: true });

/**
 * Extract frames at configured FPS from the video. Returns array of frame paths.
 * Frames named: <uid>-0001.jpg ...
 */
function extractFrames(videoPath, fps = config.frameRate, maxSeconds = config.maxSeconds) {
  return new Promise((resolve, reject) => {
    const uid = uuidv4();
    const outPattern = path.join(config.paths.frames, `${uid}-%04d.jpg`);
    // ensure old frames don't collide — we use uid prefix
    const proc = ffmpeg(videoPath)
      .outputOptions([`-vf fps=${fps}`, `-frames:v ${Math.ceil(fps * maxSeconds)}`])
      .output(outPattern)
      .on('end', () => {
        // collect frames that start with uid
        const files = fs.readdirSync(config.paths.frames)
          .filter(f => f.startsWith(uid) && f.endsWith('.jpg'))
          .map(f => path.join(config.paths.frames, f))
          .sort();
        resolve(files);
      })
      .on('error', (err) => reject(err))
      .run();
  });
}

module.exports = { extractFrames };
