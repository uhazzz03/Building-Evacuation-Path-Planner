// Automatic wall detection: turns the aligned blueprint image into a candidate
// occupancy grid. Pure functions, no React dependency — App.jsx owns the
// preview/accept/discard workflow around this.

const SUPERSAMPLE = 3; // canvas pixels per grid-cell pixel, in each axis
const PERCENTILE_LOW = 0.02;
const PERCENTILE_HIGH = 0.98;

// Draws the blueprint onto an offscreen canvas replicating the exact CSS the
// user sees: object-fit: contain placement, then transform: translate() scale()
// with transform-origin: center center. This makes canvas pixel (col*blockSize,
// row*blockSize) map 1:1 onto grid cell (row, col) with no separate coordinate
// inversion needed.
function renderComposite(image, canvasW, canvasH, scale, offsetX, offsetY, mult) {
  const canvas = document.createElement("canvas");
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  const originX = canvasW / 2;
  const originY = canvasH / 2;

  ctx.save();
  ctx.translate(originX + offsetX * mult, originY + offsetY * mult);
  ctx.scale(scale, scale);
  ctx.translate(-originX, -originY);

  const naturalW = image.naturalWidth;
  const naturalH = image.naturalHeight;
  const containScale = Math.min(canvasW / naturalW, canvasH / naturalH);
  const renderW = naturalW * containScale;
  const renderH = naturalH * containScale;
  const contentX = (canvasW - renderW) / 2;
  const contentY = (canvasH - renderH) / 2;

  ctx.drawImage(image, contentX, contentY, renderW, renderH);
  ctx.restore();

  return ctx.getImageData(0, 0, canvasW, canvasH);
}

// Iterative (non-recursive) 4-connected component labeling. Erases components
// smaller than minArea — this is what filters out text glyphs, dimension
// labels, and small furniture symbols while leaving real wall strokes intact.
function removeSmallComponents(mask, width, height, minArea) {
  const size = width * height;
  const labels = new Int32Array(size).fill(-1);
  const areas = [];
  let nextLabel = 0;
  const stack = [];

  for (let start = 0; start < size; start++) {
    if (mask[start] !== 1 || labels[start] !== -1) continue;

    let count = 0;
    stack.push(start);
    labels[start] = nextLabel;

    while (stack.length > 0) {
      const idx = stack.pop();
      count++;
      const x = idx % width;
      const y = (idx / width) | 0;

      if (x > 0) {
        const n = idx - 1;
        if (mask[n] === 1 && labels[n] === -1) {
          labels[n] = nextLabel;
          stack.push(n);
        }
      }
      if (x < width - 1) {
        const n = idx + 1;
        if (mask[n] === 1 && labels[n] === -1) {
          labels[n] = nextLabel;
          stack.push(n);
        }
      }
      if (y > 0) {
        const n = idx - width;
        if (mask[n] === 1 && labels[n] === -1) {
          labels[n] = nextLabel;
          stack.push(n);
        }
      }
      if (y < height - 1) {
        const n = idx + width;
        if (mask[n] === 1 && labels[n] === -1) {
          labels[n] = nextLabel;
          stack.push(n);
        }
      }
    }

    areas[nextLabel] = count;
    nextLabel++;
  }

  const cleaned = new Uint8Array(size);
  for (let i = 0; i < size; i++) {
    if (mask[i] === 1 && areas[labels[i]] >= minArea) cleaned[i] = 1;
  }
  return cleaned;
}

/**
 * Runs the detection pipeline and returns a rows x cols candidate grid (0/1).
 * Cells with no valid (non-transparent) image data under them are left as 0.
 */
export function detectWalls({
  image,
  rows,
  cols,
  cellSize,
  scale,
  offsetX,
  offsetY,
  sensitivity = 15,
  wallRatio = 0.25,
  noiseFilterPercent = 30
}) {
  if (!image || !image.complete || !image.naturalWidth) {
    throw new Error("Blueprint image is not loaded yet.");
  }

  const mult = SUPERSAMPLE;
  const blockSize = cellSize * mult;
  const canvasW = cols * blockSize;
  const canvasH = rows * blockSize;

  const { data } = renderComposite(image, canvasW, canvasH, scale, offsetX, offsetY, mult);

  const pixelCount = canvasW * canvasH;
  const gray = new Uint8Array(pixelCount);
  const valid = new Uint8Array(pixelCount);
  const histogram = new Uint32Array(256);
  let validCount = 0;

  for (let i = 0, p = 0; i < pixelCount; i++, p += 4) {
    const alpha = data[p + 3];
    if (alpha < 10) continue;
    const luminance = Math.round(0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2]);
    gray[i] = luminance;
    valid[i] = 1;
    histogram[luminance]++;
    validCount++;
  }

  const emptyGrid = () => Array.from({ length: rows }, () => Array(cols).fill(0));
  if (validCount === 0) return emptyGrid();

  // Percentile-based contrast stretch so faint scans/photos aren't uniformly
  // below threshold.
  const loTarget = validCount * PERCENTILE_LOW;
  const hiTarget = validCount * PERCENTILE_HIGH;
  let cumulative = 0;
  let loClip = 0;
  let hiClip = 255;
  for (let v = 0; v < 256; v++) {
    cumulative += histogram[v];
    if (cumulative >= loTarget) {
      loClip = v;
      break;
    }
  }
  cumulative = 0;
  for (let v = 0; v < 256; v++) {
    cumulative += histogram[v];
    if (cumulative >= hiTarget) {
      hiClip = v;
      break;
    }
  }
  const clipRange = Math.max(1, hiClip - loClip);

  const normalized = new Uint8Array(pixelCount);
  for (let i = 0; i < pixelCount; i++) {
    if (!valid[i]) continue;
    const stretched = ((gray[i] - loClip) / clipRange) * 255;
    normalized[i] = Math.max(0, Math.min(255, Math.round(stretched)));
  }

  // Integral images (summed-area tables) for O(1) local-mean lookups.
  const stride = canvasW + 1;
  const sumIntegral = new Int32Array(stride * (canvasH + 1));
  const countIntegral = new Int32Array(stride * (canvasH + 1));
  for (let y = 0; y < canvasH; y++) {
    let rowSum = 0;
    let rowCount = 0;
    for (let x = 0; x < canvasW; x++) {
      const idx = y * canvasW + x;
      rowSum += normalized[idx];
      rowCount += valid[idx];
      const outIdx = (y + 1) * stride + (x + 1);
      sumIntegral[outIdx] = sumIntegral[y * stride + (x + 1)] + rowSum;
      countIntegral[outIdx] = countIntegral[y * stride + (x + 1)] + rowCount;
    }
  }

  // Adaptive local thresholding: a pixel is "ink" when it's darker than its
  // own neighborhood mean minus the sensitivity offset. Window ~= 2*blockSize,
  // i.e. roughly a two-cell radius, so it reacts to real edges but smooths
  // over local lighting/scan variation.
  const windowRadius = blockSize;
  const inkMask = new Uint8Array(pixelCount);
  for (let y = 0; y < canvasH; y++) {
    const y0 = Math.max(0, y - windowRadius);
    const y1 = Math.min(canvasH, y + windowRadius + 1);
    for (let x = 0; x < canvasW; x++) {
      const idx = y * canvasW + x;
      if (!valid[idx]) continue;
      const x0 = Math.max(0, x - windowRadius);
      const x1 = Math.min(canvasW, x + windowRadius + 1);
      const localSum =
        sumIntegral[y1 * stride + x1] -
        sumIntegral[y0 * stride + x1] -
        sumIntegral[y1 * stride + x0] +
        sumIntegral[y0 * stride + x0];
      const localCount =
        countIntegral[y1 * stride + x1] -
        countIntegral[y0 * stride + x1] -
        countIntegral[y1 * stride + x0] +
        countIntegral[y0 * stride + x0];
      if (localCount === 0) continue;
      const localMean = localSum / localCount;
      if (normalized[idx] < localMean - sensitivity) {
        inkMask[idx] = 1;
      }
    }
  }

  const minComponentArea = (noiseFilterPercent / 100) * blockSize * blockSize * 1.5;
  const cleanedMask = removeSmallComponents(inkMask, canvasW, canvasH, minComponentArea);

  const candidate = emptyGrid();
  for (let row = 0; row < rows; row++) {
    const y0 = row * blockSize;
    for (let col = 0; col < cols; col++) {
      const x0 = col * blockSize;
      let inkPixels = 0;
      let validPixels = 0;
      for (let by = 0; by < blockSize; by++) {
        const rowIdx = (y0 + by) * canvasW;
        for (let bx = 0; bx < blockSize; bx++) {
          const idx = rowIdx + x0 + bx;
          if (valid[idx]) {
            validPixels++;
            if (cleanedMask[idx]) inkPixels++;
          }
        }
      }
      if (validPixels === 0) continue;
      candidate[row][col] = inkPixels / validPixels > wallRatio ? 1 : 0;
    }
  }

  return candidate;
}
