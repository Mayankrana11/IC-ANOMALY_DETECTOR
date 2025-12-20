// Handles calls to Azure Vision Image Analyze (per-image)
const axios = require('axios');
const fs = require('fs');
const config = require('../config');

/**
 * analyzeFrame(filePath)
 * - reads local file
 * - calls Azure Vision analyze endpoint
 * - returns object: { people_count, objects: [], tags: [], raw }
 */
async function analyzeFrame(filePath) {
  const url = `${config.azure.visionEndpoint}/vision/v3.2/analyze?visualFeatures=Objects,Tags`;
  const buffer = fs.readFileSync(filePath);

  const res = await axios.post(url, buffer, {
    headers: {
      'Ocp-Apim-Subscription-Key': config.azure.visionKey,
      'Content-Type': 'application/octet-stream'
    },
    timeout: 30000
  });

  const data = res.data || {};
  const objects = data.objects || [];
  // count persons robustly (object property might be 'person' or 'Person')
  const peopleCount = objects.filter(o => (o.object || '').toString().toLowerCase() === 'person').length;

  return {
    people_count: peopleCount,
    objects: objects.map(o => o.object),
    tags: (data.tags || []).map(t => t.name),
    raw: data
  };
}

/**
 * runWithConcurrency(paths, concurrency)
 * - simple promise pool to call analyzeFrame with limited concurrency
 */
async function runWithConcurrency(paths, concurrency = config.visionConcurrency) {
  const results = new Array(paths.length);
  let idx = 0;
  const active = [];

  function next() {
    if (idx >= paths.length) return Promise.resolve();
    const cur = idx++;
    const p = analyzeFrame(paths[cur])
      .then(r => { results[cur] = r; })
      .catch(err => { results[cur] = { error: err.message || String(err) }; })
      .finally(() => {
        // nothing
      });
    active.push(p);

    const doContinue = active.length >= concurrency
      ? Promise.race(active).then(() => {
          // remove resolved ones
          for (let i = active.length - 1; i >= 0; i--) {
            if (active[i].isFulfilled) active.splice(i, 1); // not accurate in raw Promise; but we'll instead filter later
          }
          // clean up by filtering settled promises (non-ideal but avoids complexity)
          return Promise.resolve();
        })
      : Promise.resolve();

    return doContinue.then(() => next());
  }

  // Simpler concurrency implementation using batches to avoid Promise.race complexity
  // We'll implement batching:
  const batches = [];
  for (let i = 0; i < paths.length; i += concurrency) {
    batches.push(paths.slice(i, i + concurrency));
  }
  for (const batch of batches) {
    // map batch to promises
    await Promise.all(batch.map((p, i) => {
      const index = paths.indexOf(p);
      return analyzeFrame(p)
        .then(r => { results[index] = r; })
        .catch(err => { results[index] = { error: err.message || String(err) }; });
    }));
  }

  return results;
}

module.exports = { analyzeFrame, runWithConcurrency };
