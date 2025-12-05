export type AspectKey = 'square' | 'portrait' | 'landscape';

export const ASPECTS: Record<AspectKey, number> = {
  square: 1, // 1:1
  portrait: 4 / 5, // 4:5 (width:height)
  landscape: 16 / 9, // 16:9 (width:height)
};

export function detectAspectFromUrl(url: string): AspectKey | null {
  const lower = url.toLowerCase();
  if (lower.includes('_square_')) return 'square';
  if (lower.includes('_portrait_')) return 'portrait';
  if (lower.includes('_landscape_')) return 'landscape';
  return null;
}

export function makeVariantName(baseName: string, aspect: AspectKey, variant: 'feed' | 'thumb'): string {
  const dot = baseName.lastIndexOf('.');
  const name = dot > -1 ? baseName.slice(0, dot) : baseName;
  const ext = dot > -1 ? baseName.slice(dot) : '';
  return `${name}_${aspect}_${variant}${ext || '.jpg'}`;
}

export function getThumbFromFeedUrl(url: string): string {
  if (url.includes('_feed')) return url.replace('_feed', '_thumb');
  return url; // fallback
}

export async function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  const dataUrl = await fileToDataUrl(file);
  return loadImage(dataUrl);
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export interface ExportOptions {
  targetWidth: number; // width of exported image in pixels
  aspect: AspectKey; // desired aspect
  quality?: number; // JPEG quality 0..1
}

// Computes a Blob by drawing the source image with given crop transform.
export async function exportCropped(
  image: HTMLImageElement,
  frameWidthCss: number,
  frameHeightCss: number,
  translateX: number,
  translateY: number,
  scale: number,
  { targetWidth, aspect, quality = 0.85 }: ExportOptions,
): Promise<Blob> {
  const aspectValue = ASPECTS[aspect];
  const targetHeight = Math.round(targetWidth / aspectValue);
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(targetWidth * dpr);
  canvas.height = Math.round(targetHeight * dpr);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');

  ctx.imageSmoothingQuality = 'high';
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Source crop rectangle in image pixels
  const sx = Math.max(0, (0 - translateX) / scale);
  const sy = Math.max(0, (0 - translateY) / scale);
  const sWidth = Math.min(image.naturalWidth - sx, frameWidthCss / scale);
  const sHeight = Math.min(image.naturalHeight - sy, frameHeightCss / scale);

  // Destination rectangle covers full canvas
  ctx.drawImage(
    image,
    sx,
    sy,
    sWidth,
    sHeight,
    0,
    0,
    canvas.width,
    canvas.height,
  );

  const blob: Blob = await new Promise((resolve) => canvas.toBlob(b => resolve(b as Blob), 'image/jpeg', quality));
  return blob;
}

export async function resizeToThumb(blob: Blob, targetWidth: number, aspect: AspectKey, quality = 0.8): Promise<Blob> {
  const url = URL.createObjectURL(blob);
  try {
    const img = await loadImage(url);
    const aspectValue = ASPECTS[aspect];
    const targetHeight = Math.round(targetWidth / aspectValue);
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(targetWidth * dpr);
    canvas.height = Math.round(targetHeight * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas not supported');
    ctx.imageSmoothingQuality = 'high';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const out: Blob = await new Promise((resolve) => canvas.toBlob(b => resolve(b as Blob), 'image/jpeg', quality));
    return out;
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Export using arbitrary frame dimensions and explicit output size (no fixed aspect keys)
export async function exportCroppedByFrame(
  image: HTMLImageElement,
  frameWidthCss: number,
  frameHeightCss: number,
  translateX: number,
  translateY: number,
  scale: number,
  targetWidth: number,
  targetHeight: number,
  quality = 0.85,
): Promise<Blob> {
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(targetWidth * dpr);
  canvas.height = Math.round(targetHeight * dpr);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');

  ctx.imageSmoothingQuality = 'high';
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const sx = Math.max(0, (0 - translateX) / scale);
  const sy = Math.max(0, (0 - translateY) / scale);
  const sWidth = Math.min(image.naturalWidth - sx, frameWidthCss / scale);
  const sHeight = Math.min(image.naturalHeight - sy, frameHeightCss / scale);

  ctx.drawImage(
    image,
    sx,
    sy,
    sWidth,
    sHeight,
    0,
    0,
    canvas.width,
    canvas.height,
  );

  const blob: Blob = await new Promise((resolve) => canvas.toBlob(b => resolve(b as Blob), 'image/jpeg', quality));
  return blob;
}

export async function generateFeedAndThumbFromFile(
  file: File,
  feedMaxWidth = 1080,
  thumbWidth = 320,
  feedQuality = 0.85,
  thumbQuality = 0.8,
): Promise<{ feed: Blob; thumb: Blob }> {
  const img = await loadImageFromFile(file);
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

  const scale = img.naturalWidth > feedMaxWidth ? feedMaxWidth / img.naturalWidth : 1;
  const feedW = Math.round(img.naturalWidth * scale);
  const feedH = Math.round(img.naturalHeight * scale);
  const feedCanvas = document.createElement('canvas');
  feedCanvas.width = Math.round(feedW * dpr);
  feedCanvas.height = Math.round(feedH * dpr);
  const fctx = feedCanvas.getContext('2d');
  if (!fctx) throw new Error('Canvas not supported');
  fctx.imageSmoothingQuality = 'high';
  fctx.drawImage(img, 0, 0, feedCanvas.width, feedCanvas.height);
  const feed: Blob = await new Promise((resolve) => feedCanvas.toBlob(b => resolve(b as Blob), 'image/jpeg', feedQuality));

  // Thumbnail preserving aspect
  const tScale = thumbWidth / feedW;
  const thumbW = thumbWidth;
  const thumbH = Math.max(1, Math.round(feedH * tScale));
  const thumbCanvas = document.createElement('canvas');
  thumbCanvas.width = Math.round(thumbW * dpr);
  thumbCanvas.height = Math.round(thumbH * dpr);
  const tctx = thumbCanvas.getContext('2d');
  if (!tctx) throw new Error('Canvas not supported');
  tctx.imageSmoothingQuality = 'high';
  const tmpImg = await loadImage(URL.createObjectURL(feed));
  tctx.drawImage(tmpImg, 0, 0, thumbCanvas.width, thumbCanvas.height);
  const thumb: Blob = await new Promise((resolve) => thumbCanvas.toBlob(b => resolve(b as Blob), 'image/jpeg', thumbQuality));
  URL.revokeObjectURL(tmpImg.src);
  return { feed, thumb };
}
