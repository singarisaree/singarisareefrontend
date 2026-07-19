'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { X } from 'lucide-react';
import type { ProductImage } from '@/types';

interface ProductImageLightboxProps {
  images: ProductImage[];
  productName: string;
  initialIndex: number;
  open: boolean;
  onClose: () => void;
  onIndexChange: (index: number) => void;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

function pointerDistance(points: PointerEvent[]): number {
  if (points.length < 2) return 0;
  return Math.hypot(
    points[0].clientX - points[1].clientX,
    points[0].clientY - points[1].clientY,
  );
}

export function ProductImageLightbox({
  images,
  productName,
  initialIndex,
  open,
  onClose,
  onIndexChange,
}: ProductImageLightboxProps) {
  const [index, setIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const pointers = useRef(new Map<number, PointerEvent>());
  const pinchStart = useRef<{ distance: number; zoom: number } | null>(null);
  const dragStart = useRef<{ x: number; y: number; offsetX: number; offsetY: number } | null>(null);
  const swipeStart = useRef<{ x: number; y: number } | null>(null);

  const resetTransform = useCallback(() => {
    setZoom(MIN_ZOOM);
    setOffset({ x: 0, y: 0 });
    pointers.current.clear();
    pinchStart.current = null;
    dragStart.current = null;
    swipeStart.current = null;
  }, []);

  const goTo = useCallback(
    (next: number) => {
      if (!images.length) return;
      const normalized = (next + images.length) % images.length;
      setIndex(normalized);
      onIndexChange(normalized);
      resetTransform();
    },
    [images.length, onIndexChange, resetTransform],
  );

  useEffect(() => {
    if (!open) return;
    setIndex(initialIndex);
    resetTransform();
  }, [initialIndex, open, resetTransform]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft') goTo(index - 1);
      if (event.key === 'ArrowRight') goTo(index + 1);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [goTo, index, onClose, open]);

  if (!open || !images.length) return null;

  const current = images[index] ?? images[0];

  const updateZoom = (next: number) => {
    const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next));
    setZoom(clamped);
    if (clamped === MIN_ZOOM) setOffset({ x: 0, y: 0 });
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, event.nativeEvent);
    const active = [...pointers.current.values()];

    if (active.length === 2) {
      pinchStart.current = { distance: pointerDistance(active), zoom };
      dragStart.current = null;
      swipeStart.current = null;
      return;
    }

    if (zoom > MIN_ZOOM) {
      dragStart.current = {
        x: event.clientX,
        y: event.clientY,
        offsetX: offset.x,
        offsetY: offset.y,
      };
    } else {
      swipeStart.current = { x: event.clientX, y: event.clientY };
    }
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, event.nativeEvent);
    const active = [...pointers.current.values()];

    if (active.length === 2 && pinchStart.current) {
      const distance = pointerDistance(active);
      if (pinchStart.current.distance > 0) {
        updateZoom(pinchStart.current.zoom * (distance / pinchStart.current.distance));
      }
      return;
    }

    if (zoom > MIN_ZOOM && dragStart.current) {
      setOffset({
        x: dragStart.current.offsetX + event.clientX - dragStart.current.x,
        y: dragStart.current.offsetY + event.clientY - dragStart.current.y,
      });
    }
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId);

    if (zoom === MIN_ZOOM && swipeStart.current) {
      const dx = event.clientX - swipeStart.current.x;
      const dy = event.clientY - swipeStart.current.y;
      if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy)) {
        goTo(index + (dx < 0 ? 1 : -1));
      }
    }

    if (pointers.current.size < 2) pinchStart.current = null;
    if (pointers.current.size === 0) {
      dragStart.current = null;
      swipeStart.current = null;
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex touch-none select-none flex-col bg-black/95"
      role="dialog"
      aria-modal="true"
      aria-label={`${productName} image viewer`}
    >
      <div className="relative z-20 flex h-16 shrink-0 items-center justify-end px-4 text-white sm:px-6">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-white/10 p-2.5 transition hover:bg-white/20"
          aria-label="Close image viewer"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      <div
        className="relative min-h-0 flex-1 overflow-hidden"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onDoubleClick={() => updateZoom(zoom > MIN_ZOOM ? MIN_ZOOM : 2)}
      >
        <div
          className="absolute inset-0 transition-transform duration-150 ease-out"
          style={{ transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${zoom})` }}
        >
          <Image
            src={current.highResUrl || current.url}
            alt={current.altText || `${productName} image ${index + 1}`}
            fill
            sizes="100vw"
            quality={100}
            unoptimized
            priority
            className="pointer-events-none object-contain"
          />
        </div>

        {images.length > 1 && zoom === MIN_ZOOM ? (
          <div className="absolute bottom-4 left-1/2 z-10 flex max-w-[80vw] -translate-x-1/2 gap-2 overflow-hidden rounded-full bg-black/40 px-3 py-2 backdrop-blur-sm">
            {images.map((image, imageIndex) => (
              <button
                key={image.id}
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  goTo(imageIndex);
                }}
                className={`h-2 rounded-full transition-all ${
                  imageIndex === index ? 'w-6 bg-white' : 'w-2 bg-white/45 hover:bg-white/75'
                }`}
                aria-label={`View image ${imageIndex + 1}`}
                aria-current={imageIndex === index}
              />
            ))}
          </div>
        ) : null}
      </div>

      <p className="shrink-0 pb-3 text-center text-xs text-white/60 sm:pb-4">
        {zoom > MIN_ZOOM ? 'Drag to move · Double-click to reset' : 'Swipe or select a dot · Pinch to zoom'}
      </p>
    </div>
  );
}
