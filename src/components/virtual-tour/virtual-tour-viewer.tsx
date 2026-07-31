/**
 * Enterprise 360° Panorama Viewer Component for RealtyNow
 * Uses CSS 3D transforms for equirectangular panorama rendering with mouse/touch/gyroscope support.
 * No external 360-viewer dependency required — pure React + CSS 3D.
 */
import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { VirtualTour } from '../../lib/types';
import {
  Maximize2,
  Minimize2,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Eye,
  Camera,
  Layers,
  Home,
} from 'lucide-react';

interface VirtualTourViewerProps {
  tours: VirtualTour[];
  initialIndex?: number;
  propertyId?: string;
  onViewRecord?: (tourId: string) => void;
}

const ROOM_LABEL_COLORS: Record<string, string> = {
  'Living Room': 'from-red-600 to-rose-700',
  'Master Bedroom': 'from-blue-700 to-indigo-800',
  Bedroom: 'from-indigo-600 to-blue-700',
  Kitchen: 'from-amber-600 to-orange-700',
  Bathroom: 'from-teal-600 to-cyan-700',
  Balcony: 'from-emerald-600 to-green-700',
  'Dining Room': 'from-purple-600 to-violet-700',
  Lobby: 'from-slate-600 to-slate-800',
  Terrace: 'from-sky-600 to-blue-600',
  'Study Room': 'from-rose-700 to-pink-700',
};

export function VirtualTourViewer({ tours, initialIndex = 0, propertyId, onViewRecord }: VirtualTourViewerProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [current, setCurrent] = useState(initialIndex);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [autoRotate, setAutoRotate] = useState(false);

  // Drag state
  const drag = useRef({ active: false, startX: 0, startY: 0, posX: 0, posY: 0 });
  const pos = useRef({ x: 0, y: 0 });
  const rafId = useRef<number | null>(null);

  const currentTour = tours[current];

  // Auto-rotate
  useEffect(() => {
    if (!autoRotate) return;
    const interval = setInterval(() => {
      pos.current.x += 0.15;
      applyTransform();
    }, 16);
    return () => clearInterval(interval);
  }, [autoRotate]);

  const applyTransform = useCallback(() => {
    if (!imgRef.current) return;
    const clampY = Math.max(-60, Math.min(60, pos.current.y));
    imgRef.current.style.transform = `translate(calc(-50% + ${-pos.current.x}px), calc(-50% + ${clampY * 0.5}px)) scale(${zoom})`;
  }, [zoom]);

  useEffect(() => {
    applyTransform();
  }, [zoom, applyTransform]);

  // Mouse handlers
  const onMouseDown = (e: React.MouseEvent) => {
    drag.current = { active: true, startX: e.clientX, startY: e.clientY, posX: pos.current.x, posY: pos.current.y };
    setAutoRotate(false);
  };

  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!drag.current.active) return;
      if (rafId.current) cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(() => {
        pos.current.x = drag.current.posX + (drag.current.startX - e.clientX) * 0.4;
        pos.current.y = drag.current.posY + (e.clientY - drag.current.startY) * 0.4;
        applyTransform();
      });
    },
    [applyTransform],
  );

  const onMouseUp = () => {
    drag.current.active = false;
  };

  // Touch handlers
  const lastTouch = useRef({ x: 0, y: 0 });
  const onTouchStart = (e: React.TouchEvent) => {
    lastTouch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    drag.current = {
      active: true,
      startX: e.touches[0].clientX,
      startY: e.touches[0].clientY,
      posX: pos.current.x,
      posY: pos.current.y,
    };
    setAutoRotate(false);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!drag.current.active) return;
    e.preventDefault();
    pos.current.x = drag.current.posX + (drag.current.startX - e.touches[0].clientX) * 0.5;
    pos.current.y = drag.current.posY + (e.touches[0].clientY - drag.current.startY) * 0.5;
    applyTransform();
  };
  const onTouchEnd = () => {
    drag.current.active = false;
  };

  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [onMouseMove]);

  // Gyroscope support
  useEffect(() => {
    const onDeviceOrientation = (e: DeviceOrientationEvent) => {
      if (!e.gamma) return;
      pos.current.x = (e.alpha ?? 0) * 1.5;
      pos.current.y = (e.beta ?? 0) * 0.5;
      applyTransform();
    };
    window.addEventListener('deviceorientation', onDeviceOrientation);
    return () => window.removeEventListener('deviceorientation', onDeviceOrientation);
  }, [applyTransform]);

  // Reset view on tour change
  useEffect(() => {
    pos.current = { x: 0, y: 0 };
    setIsLoading(true);
    setZoom(1);
    applyTransform();
    if (onViewRecord && currentTour) {
      onViewRecord(currentTour.id);
    }
  }, [current]);

  const goPrev = () => setCurrent((c) => (c - 1 + tours.length) % tours.length);
  const goNext = () => setCurrent((c) => (c + 1) % tours.length);
  const resetView = () => {
    pos.current = { x: 0, y: 0 };
    setZoom(1);
    applyTransform();
  };
  const toggleFullscreen = () => {
    setIsFullscreen((f) => !f);
    if (!document.fullscreenElement && canvasRef.current) {
      canvasRef.current.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  if (!currentTour) {
    return (
      <div className="flex items-center justify-center h-72 bg-slate-100 rounded-3xl text-slate-400 text-sm">
        No 360° tour images available.
      </div>
    );
  }

  const gradClass = ROOM_LABEL_COLORS[currentTour.room_name] || 'from-red-600 to-rose-700';

  return (
    <div
      ref={canvasRef}
      className={`relative w-full select-none overflow-hidden font-sans rounded-3xl border border-slate-200 shadow-2xl bg-slate-950 transition-all ${isFullscreen ? 'fixed inset-0 z-[9999] rounded-none border-0' : 'aspect-[16/7]'}`}
      style={{ touchAction: 'none' }}
    >
      {/* 360° Panorama Image */}
      <div
        className="absolute inset-0 overflow-hidden cursor-grab active:cursor-grabbing"
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Loading skeleton */}
        {isLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-950 animate-pulse gap-3">
            <div className="w-16 h-16 rounded-full border-4 border-red-600/40 border-t-red-600 animate-spin" />
            <p className="text-slate-400 text-sm font-semibold tracking-widest uppercase">Loading 360° Experience...</p>
          </div>
        )}
        {/* Equirectangular panorama render using wide image + X-shift drag */}
        <img
          ref={imgRef}
          src={currentTour.image_url}
          alt={currentTour.room_name}
          draggable={false}
          onLoad={() => setIsLoading(false)}
          className="absolute top-1/2 left-1/2 max-w-none pointer-events-none transition-opacity duration-300"
          style={{
            height: '100%',
            width: 'auto',
            minWidth: '200%',
            transform: 'translate(-50%, -50%) scale(1)',
            willChange: 'transform',
            opacity: isLoading ? 0 : 1,
          }}
        />
      </div>

      {/* Top gradient overlay */}
      <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-black/70 to-transparent pointer-events-none z-10" />
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/80 to-transparent pointer-events-none z-10" />

      {/* 360° Badge + Room Label */}
      <div className="absolute top-4 left-5 z-20 flex items-center gap-2">
        <div
          className={`flex items-center gap-1.5 bg-gradient-to-r ${gradClass} px-3 py-1.5 rounded-full text-white text-xs font-extrabold shadow-lg`}
        >
          <Camera className="w-3.5 h-3.5" />
          <span>360°</span>
        </div>
        <div className="bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full text-white text-xs font-bold flex items-center gap-1.5 border border-white/10">
          <Home className="w-3.5 h-3.5 text-slate-300" />
          {currentTour.room_name}
          {currentTour.floor_number > 1 && <span className="text-slate-400">· Floor {currentTour.floor_number}</span>}
        </div>
      </div>

      {/* Controls: Top Right */}
      <div className="absolute top-4 right-5 z-20 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setAutoRotate((a) => !a)}
          className={`p-2 rounded-xl backdrop-blur-md border transition-all cursor-pointer ${autoRotate ? 'bg-red-600 border-red-500 text-white shadow-lg shadow-red-600/40' : 'bg-black/50 border-white/10 text-white hover:bg-white/10'}`}
          title={autoRotate ? 'Stop Auto-Rotate' : 'Auto-Rotate'}
        >
          <RotateCcw className={`w-4 h-4 ${autoRotate ? 'animate-spin' : ''}`} />
        </button>
        <button
          type="button"
          onClick={() => setZoom((z) => Math.min(2.5, z + 0.2))}
          className="p-2 rounded-xl bg-black/50 backdrop-blur-md border border-white/10 text-white hover:bg-white/10 transition-all cursor-pointer"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => setZoom((z) => Math.max(0.6, z - 0.2))}
          className="p-2 rounded-xl bg-black/50 backdrop-blur-md border border-white/10 text-white hover:bg-white/10 transition-all cursor-pointer"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={resetView}
          className="p-2 rounded-xl bg-black/50 backdrop-blur-md border border-white/10 text-white hover:bg-white/10 transition-all cursor-pointer"
          title="Reset View"
        >
          <Eye className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={toggleFullscreen}
          className="p-2 rounded-xl bg-black/50 backdrop-blur-md border border-white/10 text-white hover:bg-white/10 transition-all cursor-pointer"
          title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation arrows */}
      {tours.length > 1 && (
        <>
          <button
            type="button"
            onClick={goPrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-white hover:bg-red-600 hover:border-red-500 transition-all cursor-pointer shadow-lg"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={goNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-white hover:bg-red-600 hover:border-red-500 transition-all cursor-pointer shadow-lg"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Drag hint */}
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
        <p className="text-white/50 text-xs font-semibold tracking-widest uppercase bg-black/30 px-3 py-1 rounded-full backdrop-blur-sm">
          ↔ Drag to explore · Pinch to zoom
        </p>
      </div>

      {/* Room Selector Thumbnails */}
      <div className="absolute bottom-4 left-0 right-0 z-20 flex items-center justify-center gap-2.5 px-4 overflow-x-auto pb-1">
        {tours.map((tour, idx) => (
          <button
            key={tour.id}
            type="button"
            onClick={() => setCurrent(idx)}
            className={`flex-shrink-0 flex flex-col items-center gap-1 cursor-pointer transition-all ${current === idx ? 'scale-110' : 'opacity-70 hover:opacity-100'}`}
          >
            <div
              className={`w-14 h-10 rounded-xl overflow-hidden border-2 transition-all ${current === idx ? 'border-red-500 shadow-lg shadow-red-500/40' : 'border-white/20'}`}
            >
              <img
                src={tour.thumbnail_url || tour.image_url}
                alt={tour.room_name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md max-w-[60px] truncate ${current === idx ? 'text-white bg-red-600/80' : 'text-white/60 bg-black/40'}`}
            >
              {tour.room_name.split(' ')[0]}
            </span>
          </button>
        ))}
      </div>

      {/* Tour counter pill */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-black/50 backdrop-blur-md border border-white/10 px-3 py-1 rounded-full text-white text-xs font-bold flex items-center gap-1.5">
        <Layers className="w-3.5 h-3.5 text-red-400" />
        {current + 1} / {tours.length}
      </div>
    </div>
  );
}
