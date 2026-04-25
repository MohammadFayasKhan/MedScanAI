/**
 * @file imagePreprocessor.ts
 * @description Enhances camera and uploaded medicine-package images before OCR by resizing, grayscaling, stretching contrast, and thresholding text.
 * @module OCR Pipeline
 * @dependencies Browser Canvas API
 * @usage const result = await preprocessImage(fileOrDataUrl)
 */

export interface PreprocessedImage {
  dataUrl: string;
  width: number;
  height: number;
  qualityScore: number;
}

type PreprocessSource = HTMLImageElement | HTMLCanvasElement | Blob | string;

function isCanvas(source: PreprocessSource): source is HTMLCanvasElement {
  return typeof HTMLCanvasElement !== 'undefined' && source instanceof HTMLCanvasElement;
}

function isImage(source: PreprocessSource): source is HTMLImageElement {
  return typeof HTMLImageElement !== 'undefined' && source instanceof HTMLImageElement;
}

function loadImage(source: Blob | string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    let objectUrl: string | null = null;

    image.crossOrigin = 'anonymous';
    image.onload = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      reject(new Error('Unable to load image for OCR preprocessing'));
    };

    if (source instanceof Blob) {
      objectUrl = URL.createObjectURL(source);
      image.src = objectUrl;
    } else {
      image.src = source;
    }
  });
}

function getSourceDimensions(source: HTMLImageElement | HTMLCanvasElement) {
  return {
    width: isCanvas(source) ? source.width : source.naturalWidth || source.width,
    height: isCanvas(source) ? source.height : source.naturalHeight || source.height,
  };
}

function otsuThreshold(grayValues: Uint8ClampedArray) {
  const histogram = new Array<number>(256).fill(0);
  for (let i = 0; i < grayValues.length; i += 1) histogram[grayValues[i]] += 1;

  const total = grayValues.length;
  let sum = 0;
  for (let i = 0; i < 256; i += 1) sum += i * histogram[i];

  let sumBackground = 0;
  let weightBackground = 0;
  let maxVariance = 0;
  let threshold = 128;

  for (let i = 0; i < 256; i += 1) {
    weightBackground += histogram[i];
    if (weightBackground === 0) continue;

    const weightForeground = total - weightBackground;
    if (weightForeground === 0) break;

    sumBackground += i * histogram[i];
    const meanBackground = sumBackground / weightBackground;
    const meanForeground = (sum - sumBackground) / weightForeground;
    const variance = weightBackground * weightForeground * (meanBackground - meanForeground) ** 2;

    if (variance > maxVariance) {
      maxVariance = variance;
      threshold = i;
    }
  }

  return threshold;
}

function estimateSharpness(gray: Uint8ClampedArray, width: number, height: number) {
  if (width < 3 || height < 3) return 0;
  let edgeSum = 0;
  let samples = 0;

  for (let y = 1; y < height - 1; y += 2) {
    for (let x = 1; x < width - 1; x += 2) {
      const idx = y * width + x;
      const gx = Math.abs(gray[idx - 1] - gray[idx + 1]);
      const gy = Math.abs(gray[idx - width] - gray[idx + width]);
      edgeSum += gx + gy;
      samples += 1;
    }
  }

  return Math.min(100, Math.round((edgeSum / Math.max(1, samples) / 64) * 100));
}

/**
 * Preprocesses a medicine package image for OCR.
 * @param source - Image, canvas, Blob/File, object URL, data URL, or remote URL.
 * @returns Enhanced PNG data URL with a 0-100 quality estimate.
 * @notes The output is intentionally binary because Tesseract performs better on high-contrast packaging text.
 */
export async function preprocessImage(source: PreprocessSource): Promise<PreprocessedImage> {
  const imageSource = isImage(source) || isCanvas(source) ? source : await loadImage(source);
  const original = getSourceDimensions(imageSource);
  if (!original.width || !original.height) {
    throw new Error('Image has no readable dimensions');
  }

  const maxDim = 1400;
  const upscaleMin = 760;
  let ratio = Math.min(maxDim / original.width, maxDim / original.height, 1);
  if (Math.max(original.width, original.height) < upscaleMin) {
    ratio = Math.min(2, upscaleMin / Math.max(original.width, original.height));
  }

  const width = Math.max(1, Math.round(original.width * ratio));
  const height = Math.max(1, Math.round(original.height * ratio));
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas 2D context is unavailable');

  canvas.width = width;
  canvas.height = height;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(imageSource, 0, 0, width, height);

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const gray = new Uint8ClampedArray(width * height);
  let min = 255;
  let max = 0;

  for (let i = 0, px = 0; i < data.length; i += 4, px += 1) {
    const value = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    gray[px] = value;
    if (value < min) min = value;
    if (value > max) max = value;
  }

  const range = Math.max(1, max - min);
  for (let px = 0; px < gray.length; px += 1) {
    gray[px] = Math.max(0, Math.min(255, Math.round(((gray[px] - min) / range) * 255)));
  }

  const threshold = otsuThreshold(gray);
  for (let i = 0, px = 0; i < data.length; i += 4, px += 1) {
    const binary = gray[px] > threshold ? 255 : 0;
    data[i] = binary;
    data[i + 1] = binary;
    data[i + 2] = binary;
    data[i + 3] = 255;
  }

  ctx.putImageData(imageData, 0, 0);

  const contrastScore = Math.round((range / 255) * 100);
  const sharpnessScore = estimateSharpness(gray, width, height);
  const qualityScore = Math.max(0, Math.min(100, Math.round(contrastScore * 0.65 + sharpnessScore * 0.35)));

  return {
    dataUrl: canvas.toDataURL('image/png'),
    width,
    height,
    qualityScore,
  };
}
