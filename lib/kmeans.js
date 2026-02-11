/**
 * K-means++ color clustering for dominant color extraction.
 * Operates on raw ImageData pixel array.
 */
function extractDominantColors(imageData, maxColors = 12) {
  const { data, width, height } = imageData;
  const samples = [];

  // Sample every 5th pixel
  for (let i = 0; i < width * height; i += 5) {
    const idx = i * 4;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    // Skip near-transparent pixels
    if (data[idx + 3] < 128) continue;
    samples.push([r, g, b]);
  }

  if (samples.length === 0) return [];

  const k = Math.min(maxColors, samples.length);
  let centroids = kmeansppInit(samples, k);
  let assignments = new Array(samples.length);

  // Lloyd's algorithm — max 20 iterations
  for (let iter = 0; iter < 20; iter++) {
    // Assign each sample to nearest centroid
    for (let i = 0; i < samples.length; i++) {
      let minDist = Infinity;
      let best = 0;
      for (let c = 0; c < centroids.length; c++) {
        const d = colorDistSq(samples[i], centroids[c]);
        if (d < minDist) {
          minDist = d;
          best = c;
        }
      }
      assignments[i] = best;
    }

    // Recompute centroids
    const sums = centroids.map(() => [0, 0, 0]);
    const clusterCounts = new Array(centroids.length).fill(0);

    for (let i = 0; i < samples.length; i++) {
      const c = assignments[i];
      sums[c][0] += samples[i][0];
      sums[c][1] += samples[i][1];
      sums[c][2] += samples[i][2];
      clusterCounts[c]++;
    }

    let converged = true;
    for (let c = 0; c < centroids.length; c++) {
      if (clusterCounts[c] === 0) continue;
      const newR = sums[c][0] / clusterCounts[c];
      const newG = sums[c][1] / clusterCounts[c];
      const newB = sums[c][2] / clusterCounts[c];
      const delta = colorDistSq(centroids[c], [newR, newG, newB]);
      if (delta > 1) converged = false;
      centroids[c] = [newR, newG, newB];
    }

    if (converged) break;
  }

  // Count final cluster sizes
  const counts = new Array(centroids.length).fill(0);
  for (let i = 0; i < samples.length; i++) {
    counts[assignments[i]]++;
  }

  // Build results
  let results = centroids.map((c, i) => ({
    r: Math.round(c[0]),
    g: Math.round(c[1]),
    b: Math.round(c[2]),
    count: counts[i],
  }));

  // Remove empty clusters
  results = results.filter((c) => c.count > 0);

  // Deduplicate similar colors (Euclidean distance < 25)
  const deduped = [];
  for (const color of results) {
    const isDup = deduped.some(
      (existing) =>
        colorDistSq([color.r, color.g, color.b], [existing.r, existing.g, existing.b]) <
        625 // 25^2
    );
    if (!isDup) {
      deduped.push(color);
    } else {
      // Merge into closest existing with weighted average
      let minD = Infinity;
      let closest = 0;
      for (let i = 0; i < deduped.length; i++) {
        const d = colorDistSq(
          [color.r, color.g, color.b],
          [deduped[i].r, deduped[i].g, deduped[i].b]
        );
        if (d < minD) {
          minD = d;
          closest = i;
        }
      }
      const target = deduped[closest];
      const totalCount = target.count + color.count;
      target.r = Math.round((target.r * target.count + color.r * color.count) / totalCount);
      target.g = Math.round((target.g * target.count + color.g * color.count) / totalCount);
      target.b = Math.round((target.b * target.count + color.b * color.count) / totalCount);
      target.count = totalCount;
    }
  }

  // Sort by population (largest first)
  deduped.sort((a, b) => b.count - a.count);

  // Add hex
  return deduped.slice(0, maxColors).map((c) => ({
    ...c,
    hex: rgbToHex(c.r, c.g, c.b),
  }));
}

function kmeansppInit(samples, k) {
  const centroids = [];
  // Pick first centroid randomly
  centroids.push([...samples[Math.floor(Math.random() * samples.length)]]);

  for (let c = 1; c < k; c++) {
    // Compute distances to nearest centroid
    const dists = new Float64Array(samples.length);
    let totalDist = 0;
    for (let i = 0; i < samples.length; i++) {
      let minD = Infinity;
      for (let j = 0; j < centroids.length; j++) {
        const d = colorDistSq(samples[i], centroids[j]);
        if (d < minD) minD = d;
      }
      dists[i] = minD;
      totalDist += minD;
    }

    // Weighted random selection
    let r = Math.random() * totalDist;
    for (let i = 0; i < samples.length; i++) {
      r -= dists[i];
      if (r <= 0) {
        centroids.push([...samples[i]]);
        break;
      }
    }

    // Fallback if rounding prevented selection
    if (centroids.length <= c) {
      centroids.push([...samples[Math.floor(Math.random() * samples.length)]]);
    }
  }

  return centroids;
}

function colorDistSq(a, b) {
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return dr * dr + dg * dg + db * db;
}

function rgbToHex(r, g, b) {
  return (
    "#" +
    ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1).toUpperCase()
  );
}
