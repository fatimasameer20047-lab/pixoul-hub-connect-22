import React, { useEffect, useMemo, useRef, useState } from 'react';
import { loadImageFromFile, exportCroppedByFrame } from '@/lib/image-utils';
import { Button } from '@/components/ui/button';

interface ImageCropperProps {
  file: File;
  onReady?: () => void;
  onExport: (blobs: { feed: Blob; thumb: Blob }) => void;
  onCancel?: () => void;
}

// Lightweight pan/zoom cropper suitable for touch
export function ImageCropper({ file, onReady, onExport, onCancel }: ImageCropperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [imgEl, setImgEl] = useState<HTMLImageElement | null>(null);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [minScale, setMinScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const lastPinch = useRef<{ d: number; cx: number; cy: number } | null>(null);
  const lastTapTime = useRef<number>(0);
  const [showGrid, setShowGrid] = useState(false);
  const gridTimer = useRef<number | null>(null);

  // Load image
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const image = await loadImageFromFile(file);
      if (!cancelled) {
        setImgEl(image);
        imgRef.current = image;
        // Initial fit
        setTimeout(() => fitToCover(image), 0);
        onReady?.();
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  // Refit on image change only

  const frameSize = useMemo(() => {
    const w = containerRef.current?.clientWidth || 320;
    const ratio = imgEl ? imgEl.naturalWidth / imgEl.naturalHeight : 1; // match image aspect
    return { w, h: Math.round(w / ratio) };
  }, [imgEl]);

  function fitToCover(image: HTMLImageElement) {
    const frameW = containerRef.current?.clientWidth || 320;
    const frameH = imgEl ? Math.round(frameW / (image.naturalWidth / image.naturalHeight)) : Math.round(frameW);
    const sX = frameW / image.naturalWidth;
    const sY = frameH / image.naturalHeight;
    const ms = Math.max(sX, sY);
    setMinScale(ms);
    setScale(ms);
    // Center
    const tx = (frameW - image.naturalWidth * ms) / 2;
    const ty = (frameH - image.naturalHeight * ms) / 2;
    setTranslate({ x: tx, y: ty });
  }

  // No aspect switching; frame matches image aspect

  // Gesture handlers
  function onPointerDown(e: React.PointerEvent) {
    (e.target as Element).setPointerCapture(e.pointerId);
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, tx: translate.x, ty: translate.y };
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    const tx = dragStart.current.tx + dx;
    const ty = dragStart.current.ty + dy;
    setTranslate(clampTranslate(tx, ty));
  }
  function onPointerUp(e: React.PointerEvent) {
    setIsDragging(false);
  }

  function clampTranslate(tx: number, ty: number) {
    if (!imgEl) return { x: tx, y: ty };
    const frameW = frameSize.w;
    const frameH = frameSize.h;
    const imgW = imgEl.naturalWidth * scale;
    const imgH = imgEl.naturalHeight * scale;
    // ensure image covers the frame: no gaps
    const minX = Math.min(0, frameW - imgW);
    const maxX = Math.max(0, frameW - imgW);
    const minY = Math.min(0, frameH - imgH);
    const maxY = Math.max(0, frameH - imgH);
    return {
      x: Math.min(Math.max(tx, minX), maxX),
      y: Math.min(Math.max(ty, minY), maxY),
    };
  }

  function clampTranslateWith(image: HTMLImageElement, frameW: number, frameH: number, s: number, tx: number, ty: number) {
    const imgW = image.naturalWidth * s;
    const imgH = image.naturalHeight * s;
    const minX = Math.min(0, frameW - imgW);
    const maxX = Math.max(0, frameW - imgW);
    const minY = Math.min(0, frameH - imgH);
    const maxY = Math.max(0, frameH - imgH);
    return {
      x: Math.min(Math.max(tx, minX), maxX),
      y: Math.min(Math.max(ty, minY), maxY),
    };
  }

  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    const delta = -e.deltaY;
    const factor = delta > 0 ? 1.05 : 0.95;
    zoomAt(e.clientX, e.clientY, factor);
    flashGrid();
  }

  function zoomAt(cx: number, cy: number, factor: number) {
    if (!imgEl || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = cx - rect.left;
    const y = cy - rect.top;
    const maxS = minScale * 4; // ~4x of min
    const newScale = Math.max(getMinScale(), Math.min(scale * factor, maxS));
    const dx = x - translate.x;
    const dy = y - translate.y;
    const k = newScale / scale;
    const tx = x - dx * k;
    const ty = y - dy * k;
    setScale(newScale);
    setTranslate(clampTranslate(tx, ty));
  }

  function getMinScale() {
    if (!imgEl) return 1;
    const frameW = frameSize.w;
    const frameH = frameSize.h;
    const sX = frameW / imgEl.naturalWidth;
    const sY = frameH / imgEl.naturalHeight;
    return Math.max(sX, sY);
  }

  // Pinch zoom for touch
  function onTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 2) {
      const [a, b] = [e.touches[0], e.touches[1]];
      const dx = b.clientX - a.clientX;
      const dy = b.clientY - a.clientY;
      const d = Math.hypot(dx, dy);
      const cx = (a.clientX + b.clientX) / 2;
      const cy = (a.clientY + b.clientY) / 2;
      lastPinch.current = { d, cx, cy };
      flashGrid();
    } else if (e.touches.length === 1) {
      const t = e.touches[0];
      setIsDragging(true);
      dragStart.current = { x: t.clientX, y: t.clientY, tx: translate.x, ty: translate.y };
      setShowGrid(true);
    }
  }
  function onTouchMove(e: React.TouchEvent) {
    if (e.touches.length === 2 && lastPinch.current) {
      e.preventDefault();
      const [a, b] = [e.touches[0], e.touches[1]];
      const dx = b.clientX - a.clientX;
      const dy = b.clientY - a.clientY;
      const d = Math.hypot(dx, dy);
      const factor = d / lastPinch.current.d;
      zoomAt(lastPinch.current.cx, lastPinch.current.cy, factor);
      lastPinch.current = { d, cx: lastPinch.current.cx, cy: lastPinch.current.cy };
      flashGrid();
    } else if (e.touches.length === 1 && isDragging) {
      e.preventDefault();
      const t = e.touches[0];
      const dx = t.clientX - dragStart.current.x;
      const dy = t.clientY - dragStart.current.y;
      const tx = dragStart.current.tx + dx;
      const ty = dragStart.current.ty + dy;
      setTranslate(clampTranslate(tx, ty));
      setShowGrid(true);
    }
  }
  function onTouchEnd() {
    lastPinch.current = null;
    setIsDragging(false);
  }

  // Double click / double tap to zoom
  function onDoubleClick(e: React.MouseEvent) {
    const ms = getMinScale();
    const maxS = ms * 4;
    const targets = [ms * 2, ms * 3.5];
    const current = scale;
    let next = targets.find(t => current < t - 0.01) || ms;
    const rect = containerRef.current?.getBoundingClientRect();
    const cx = rect ? e.clientX : 0;
    const cy = rect ? e.clientY : 0;
    zoomTo(cx, cy, Math.min(next, maxS));
    flashGrid();
  }

  function onTouchEndForDoubleTap(e: React.TouchEvent) {
    const now = Date.now();
    if (now - lastTapTime.current < 300) {
      const ms = getMinScale();
      const maxS = ms * 4;
      const targets = [ms * 2, ms * 3.5];
      const current = scale;
      let next = targets.find(t => current < t - 0.01) || ms;
      const rect = containerRef.current?.getBoundingClientRect();
      const touch = e.changedTouches[0];
      const cx = rect ? touch.clientX : 0;
      const cy = rect ? touch.clientY : 0;
      zoomTo(cx, cy, Math.min(next, maxS));
      flashGrid();
    }
    lastTapTime.current = now;
  }

  function zoomTo(cx: number, cy: number, targetScale: number) {
    if (!imgEl || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = cx - rect.left;
    const y = cy - rect.top;
    const dx = x - translate.x;
    const dy = y - translate.y;
    const k = targetScale / scale;
    const tx = x - dx * k;
    const ty = y - dy * k;
    setScale(targetScale);
    setTranslate(clampTranslate(tx, ty));
  }

  function flashGrid() {
    setShowGrid(true);
    if (gridTimer.current) window.clearTimeout(gridTimer.current);
    gridTimer.current = window.setTimeout(() => setShowGrid(false), 600);
  }

  async function handleExport() {
    if (!imgEl) return;
    const targetWidth = 1080;
    const ratio = frameSize.h / frameSize.w;
    const targetHeight = Math.round(targetWidth * ratio);
    const feedBlob = await exportCroppedByFrame(
      imgEl,
      frameSize.w,
      frameSize.h,
      translate.x,
      translate.y,
      scale,
      targetWidth,
      targetHeight,
      0.85,
    );
    // Create thumbnail from export to avoid re-cropping discrepancies
    const thumbUrl = URL.createObjectURL(feedBlob);
    const img = await new Promise<HTMLImageElement>((resolve) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.src = thumbUrl;
    });
    const thumbW = 320;
    const thumbH = Math.round(thumbW * ratio);
    const canvas = document.createElement('canvas');
    canvas.width = thumbW;
    canvas.height = thumbH;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, thumbW, thumbH);
    const thumbBlob: Blob = await new Promise((resolve) => canvas.toBlob(b => resolve(b as Blob), 'image/jpeg', 0.8));
    URL.revokeObjectURL(thumbUrl);
    onExport({ feed: feedBlob, thumb: thumbBlob });
  }

  return (
    <div className="space-y-4">
      {/* Frame */}
      <div
        ref={containerRef}
        className="w-full bg-muted rounded-md overflow-hidden touch-none overscroll-contain select-none relative"
        style={{ aspectRatio: imgEl ? String(imgEl.naturalWidth / imgEl.naturalHeight) : '1' }}
        onPointerDown={(e) => { onPointerDown(e); setShowGrid(true); }}
        onPointerMove={onPointerMove}
        onPointerUp={(e) => { onPointerUp(e); flashGrid(); }}
        onWheel={onWheel}
        onDoubleClick={onDoubleClick}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={(e) => { onTouchEnd(); onTouchEndForDoubleTap(e); }}
      >
        {imgEl && (
          <img
            src={imgEl.src}
            alt="Crop"
            draggable={false}
            style={{
              transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
              transformOrigin: 'top left',
              touchAction: 'none',
              userSelect: 'none',
              width: imgEl.naturalWidth,
              height: imgEl.naturalHeight,
              willChange: 'transform',
              display: 'block',
            }}
          />
        )}
        {/* Rule-of-thirds grid overlay (subtle, appears during interaction) */}
        {showGrid && (
          <div className="pointer-events-none absolute inset-0 opacity-70">
            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
              {Array.from({ length: 9 }).map((_, i) => (
                <div
                  key={i}
                  className="border border-white/20"
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* No slider in simple mode */}

      <div className="flex justify-between gap-2">
        <div className="text-xs text-muted-foreground self-center">
          <Button type="button" variant="ghost" size="sm" onClick={() => imgEl && fitToCover(imgEl)}>
            Reset
          </Button>
        </div>
        {onCancel && (
          <Button variant="outline" type="button" onClick={onCancel}>Cancel</Button>
        )}
        <Button type="button" onClick={handleExport}>Continue</Button>
      </div>
    </div>
  );
}

export default ImageCropper;
