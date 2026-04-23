'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { GlassCard, GlassButton, GlassBadge } from '@markflow/ui';
import { processScannedPage, detectFiducialCorners } from '@/lib/opencv';
import type { DetectedCorners, ProcessedPage } from '@/lib/opencv';

interface ScanResult {
  id: string;
  blob: Blob;
  thumbnailUrl: string;
  corners: DetectedCorners;
  timestamp: number;
}

export function ScannerView() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);

  const [cameraActive, setCameraActive] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scannedPages, setScannedPages] = useState<ScanResult[]>([]);
  const [detectedCorners, setDetectedCorners] = useState<DetectedCorners | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Rear camera on mobile
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
      }
    } catch (err) {
      setError('Camera access denied. Please enable camera permissions.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    cancelAnimationFrame(animFrameRef.current);
    setCameraActive(false);
    setDetectedCorners(null);
  }, []);

  // Live corner detection overlay
  useEffect(() => {
    if (!cameraActive) return;

    let running = true;

    const detectLoop = async () => {
      if (!running || !videoRef.current || !overlayCanvasRef.current) return;

      const video = videoRef.current;
      const overlay = overlayCanvasRef.current;
      const ctx = overlay.getContext('2d');
      if (!ctx) return;

      overlay.width = video.videoWidth;
      overlay.height = video.videoHeight;
      ctx.clearRect(0, 0, overlay.width, overlay.height);

      try {
        // Draw video frame to hidden canvas for OpenCV processing
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = video.videoWidth;
        tempCanvas.height = video.videoHeight;
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) {
          tempCtx.drawImage(video, 0, 0);
          const corners = await detectFiducialCorners(tempCanvas);
          setDetectedCorners(corners);

          if (corners) {
            // Draw green dots at detected corners
            ctx.fillStyle = '#22c55e';
            for (const point of [corners.topLeft, corners.topRight, corners.bottomLeft, corners.bottomRight]) {
              ctx.beginPath();
              ctx.arc(point.x, point.y, 12, 0, Math.PI * 2);
              ctx.fill();
            }

            // Draw connecting lines
            ctx.strokeStyle = '#22c55e';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(corners.topLeft.x, corners.topLeft.y);
            ctx.lineTo(corners.topRight.x, corners.topRight.y);
            ctx.lineTo(corners.bottomRight.x, corners.bottomRight.y);
            ctx.lineTo(corners.bottomLeft.x, corners.bottomLeft.y);
            ctx.closePath();
            ctx.stroke();
          }
        }
      } catch {
        // Silently skip frame on detection errors
      }

      if (running) {
        // Run detection at ~5 FPS to save CPU
        setTimeout(() => {
          animFrameRef.current = requestAnimationFrame(detectLoop);
        }, 200);
      }
    };

    animFrameRef.current = requestAnimationFrame(detectLoop);
    return () => {
      running = false;
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [cameraActive]);

  const captureAndProcess = useCallback(async () => {
    if (!videoRef.current) return;

    setScanning(true);
    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(video, 0, 0);

      const result = await processScannedPage(canvas);
      if (!result) {
        setError('Could not detect paper edges. Make sure all 4 corner markers are visible.');
        return;
      }

      const thumbnailUrl = URL.createObjectURL(result.blob);
      setScannedPages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          blob: result.blob,
          thumbnailUrl,
          corners: result.corners,
          timestamp: Date.now(),
        },
      ]);
      setError(null);
    } catch (err) {
      setError('Processing failed. Try again with better lighting.');
    } finally {
      setScanning(false);
    }
  }, []);

  const removeScanned = useCallback((id: string) => {
    setScannedPages((prev) => {
      const page = prev.find((p) => p.id === id);
      if (page) URL.revokeObjectURL(page.thumbnailUrl);
      return prev.filter((p) => p.id !== id);
    });
  }, []);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Exam Scanner</h1>
        <GlassBadge variant={detectedCorners ? 'success' : 'warning'}>
          {detectedCorners ? '4 Markers Detected' : 'Searching for markers...'}
        </GlassBadge>
      </div>

      {error && (
        <GlassCard className="p-4 border-red-400/30 bg-red-500/10">
          <p className="text-sm text-red-300">{error}</p>
        </GlassCard>
      )}

      {/* Camera View */}
      <GlassCard className="overflow-hidden">
        <div className="relative aspect-[4/3] bg-black">
          <video
            ref={videoRef}
            className="absolute inset-0 h-full w-full object-cover"
            playsInline
            muted
          />
          <canvas
            ref={overlayCanvasRef}
            className="absolute inset-0 h-full w-full object-cover pointer-events-none"
          />
          <canvas ref={canvasRef} className="hidden" />

          {!cameraActive && (
            <div className="absolute inset-0 flex items-center justify-center">
              <GlassButton onClick={startCamera} size="lg">
                📷 Start Camera
              </GlassButton>
            </div>
          )}
        </div>

        {cameraActive && (
          <div className="flex gap-3 p-4 border-t border-white/10">
            <GlassButton
              onClick={captureAndProcess}
              loading={scanning}
              disabled={!detectedCorners}
            >
              📸 Capture Page
            </GlassButton>
            <GlassButton variant="ghost" onClick={stopCamera}>
              Stop Camera
            </GlassButton>
          </div>
        )}
      </GlassCard>

      {/* Scanned Pages Queue */}
      {scannedPages.length > 0 && (
        <GlassCard className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Scanned Pages ({scannedPages.length})
            </h2>
            <GlassButton variant="primary" size="sm" disabled={scannedPages.length === 0}>
              Upload Batch
            </GlassButton>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {scannedPages.map((page, idx) => (
              <div key={page.id} className="relative group">
                <img
                  src={page.thumbnailUrl}
                  alt={`Scanned page ${idx + 1}`}
                  className="rounded-lg border border-white/10 w-full aspect-[3/4] object-cover"
                />
                <div className="absolute top-2 left-2">
                  <GlassBadge variant="info">Page {idx + 1}</GlassBadge>
                </div>
                <button
                  onClick={() => removeScanned(page.id)}
                  className="absolute top-2 right-2 rounded-full bg-red-500/80 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Remove page"
                >
                  <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <p className="mt-1 text-xs text-white/40 text-center">
                  {(page.blob.size / 1024).toFixed(0)} KB
                </p>
              </div>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  );
}
