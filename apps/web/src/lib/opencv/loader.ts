/**
 * OpenCV.js WASM loader.
 * Lazy-loads the OpenCV.js library from /opencv/opencv.js and resolves
 * once the `cv` global is ready.
 *
 * NOTE: You must place the pre-compiled opencv.js + opencv_js.wasm in public/opencv/.
 * Download from: https://docs.opencv.org/4.x/opencv.js (or build with emscripten)
 */

declare global {
  interface Window {
    cv: typeof import('cv');
    Module: Record<string, unknown>;
  }
}

let cvPromise: Promise<typeof import('cv')> | null = null;

export function loadOpenCV(): Promise<typeof import('cv')> {
  if (cvPromise) return cvPromise;

  cvPromise = new Promise((resolve, reject) => {
    // If already loaded
    if (typeof window !== 'undefined' && window.cv && window.cv.Mat) {
      resolve(window.cv);
      return;
    }

    const script = document.createElement('script');
    script.src = '/opencv/opencv.js';
    script.async = true;

    // OpenCV.js calls Module.onRuntimeInitialized when WASM is ready
    window.Module = {
      onRuntimeInitialized() {
        if (window.cv) {
          resolve(window.cv);
        } else {
          reject(new Error('OpenCV.js loaded but cv global not found'));
        }
      },
    };

    script.onerror = () => {
      cvPromise = null;
      reject(new Error('Failed to load OpenCV.js from /opencv/opencv.js'));
    };

    document.head.appendChild(script);
  });

  return cvPromise;
}
