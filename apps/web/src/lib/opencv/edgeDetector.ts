/**
 * Edge detection & perspective correction pipeline using OpenCV.js.
 *
 * Process:
 * 1. Convert to grayscale
 * 2. Gaussian blur (reduce noise)
 * 3. Adaptive threshold (binarize for contour detection)
 * 4. Find contours → filter for 4 large square-ish contours (fiducial markers)
 * 5. Compute perspective transform from detected corners to ideal rectangle
 * 6. Apply warpPerspective → produce deskewed, cropped page
 * 7. Otsu threshold for final clean B&W output
 */

import { loadOpenCV } from './loader';

export interface DetectedCorners {
  topLeft: { x: number; y: number };
  topRight: { x: number; y: number };
  bottomLeft: { x: number; y: number };
  bottomRight: { x: number; y: number };
}

export interface ProcessedPage {
  /** The deskewed, binarized image as a JPEG Blob */
  blob: Blob;
  /** Detected corner positions in original image coordinates */
  corners: DetectedCorners;
  /** Output image dimensions */
  width: number;
  height: number;
}

// Target output dimensions (A4 proportions at ~150 DPI)
const OUTPUT_WIDTH = 1240;
const OUTPUT_HEIGHT = 1754;

// Minimum contour area ratio to image area to qualify as a fiducial
const MIN_FIDUCIAL_AREA_RATIO = 0.0005;
const MAX_FIDUCIAL_AREA_RATIO = 0.01;

/**
 * Detect the four fiducial markers in an image and return their center coordinates.
 */
export async function detectFiducialCorners(
  imageSource: HTMLCanvasElement | HTMLVideoElement | HTMLImageElement,
): Promise<DetectedCorners | null> {
  const cv = await loadOpenCV();

  let src: InstanceType<typeof cv.Mat> | null = null;
  let gray: InstanceType<typeof cv.Mat> | null = null;
  let blurred: InstanceType<typeof cv.Mat> | null = null;
  let thresh: InstanceType<typeof cv.Mat> | null = null;
  let contours: InstanceType<typeof cv.MatVector> | null = null;
  let hierarchy: InstanceType<typeof cv.Mat> | null = null;

  try {
    src = cv.imread(imageSource);
    gray = new cv.Mat();
    blurred = new cv.Mat();
    thresh = new cv.Mat();
    contours = new cv.MatVector();
    hierarchy = new cv.Mat();

    // Grayscale
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

    // Gaussian blur
    const ksize = new cv.Size(5, 5);
    cv.GaussianBlur(gray, blurred, ksize, 0);

    // Adaptive threshold
    cv.adaptiveThreshold(blurred, thresh, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY_INV, 11, 2);

    // Find contours
    cv.findContours(thresh, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

    const imageArea = src.rows * src.cols;
    const candidates: { center: { x: number; y: number }; area: number }[] = [];

    for (let i = 0; i < contours.size(); i++) {
      const contour = contours.get(i);
      const area = cv.contourArea(contour);
      const areaRatio = area / imageArea;

      // Filter by area
      if (areaRatio < MIN_FIDUCIAL_AREA_RATIO || areaRatio > MAX_FIDUCIAL_AREA_RATIO) continue;

      // Approximate polygon
      const approx = new cv.Mat();
      const peri = cv.arcLength(contour, true);
      cv.approxPolyDP(contour, approx, 0.04 * peri, true);

      // Must be roughly rectangular (4 vertices)
      if (approx.rows === 4) {
        // Check aspect ratio (should be roughly square)
        const rect = cv.boundingRect(contour);
        const aspect = rect.width / rect.height;
        if (aspect > 0.7 && aspect < 1.3) {
          candidates.push({
            center: {
              x: rect.x + rect.width / 2,
              y: rect.y + rect.height / 2,
            },
            area,
          });
        }
      }
      approx.delete();
    }

    // We need exactly 4 fiducial markers
    if (candidates.length < 4) return null;

    // Sort by area descending and take top 4
    candidates.sort((a, b) => b.area - a.area);
    const topFour = candidates.slice(0, 4);

    // Classify into corners based on position
    return classifyCorners(topFour.map((c) => c.center), src.cols, src.rows);
  } finally {
    src?.delete();
    gray?.delete();
    blurred?.delete();
    thresh?.delete();
    contours?.delete();
    hierarchy?.delete();
  }
}

/**
 * Given 4 detected center points, classify them as TL/TR/BL/BR.
 */
function classifyCorners(
  points: { x: number; y: number }[],
  imageWidth: number,
  imageHeight: number,
): DetectedCorners {
  const sorted = [...points];

  // Sort by y first (top two vs bottom two)
  sorted.sort((a, b) => a.y - b.y);
  const topTwo = sorted.slice(0, 2).sort((a, b) => a.x - b.x);
  const bottomTwo = sorted.slice(2, 4).sort((a, b) => a.x - b.x);

  return {
    topLeft: topTwo[0],
    topRight: topTwo[1],
    bottomLeft: bottomTwo[0],
    bottomRight: bottomTwo[1],
  };
}

/**
 * Full pipeline: detect fiducials → perspective transform → binarize → compress to JPEG.
 */
export async function processScannedPage(
  imageSource: HTMLCanvasElement | HTMLVideoElement | HTMLImageElement,
): Promise<ProcessedPage | null> {
  const corners = await detectFiducialCorners(imageSource);
  if (!corners) return null;

  const cv = await loadOpenCV();

  let src: InstanceType<typeof cv.Mat> | null = null;
  let warped: InstanceType<typeof cv.Mat> | null = null;
  let gray: InstanceType<typeof cv.Mat> | null = null;
  let binarized: InstanceType<typeof cv.Mat> | null = null;

  try {
    src = cv.imread(imageSource);

    // Source points (detected fiducial centers)
    const srcPoints = cv.matFromArray(4, 1, cv.CV_32FC2, [
      corners.topLeft.x, corners.topLeft.y,
      corners.topRight.x, corners.topRight.y,
      corners.bottomLeft.x, corners.bottomLeft.y,
      corners.bottomRight.x, corners.bottomRight.y,
    ]);

    // Destination points (ideal rectangle)
    const dstPoints = cv.matFromArray(4, 1, cv.CV_32FC2, [
      0, 0,
      OUTPUT_WIDTH, 0,
      0, OUTPUT_HEIGHT,
      OUTPUT_WIDTH, OUTPUT_HEIGHT,
    ]);

    // Compute perspective transform
    const M = cv.getPerspectiveTransform(srcPoints, dstPoints);
    warped = new cv.Mat();
    const dsize = new cv.Size(OUTPUT_WIDTH, OUTPUT_HEIGHT);
    cv.warpPerspective(src, warped, M, dsize);

    // Convert to grayscale
    gray = new cv.Mat();
    cv.cvtColor(warped, gray, cv.COLOR_RGBA2GRAY);

    // Otsu's threshold for clean B&W
    binarized = new cv.Mat();
    cv.threshold(gray, binarized, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU);

    // Render to canvas and extract as JPEG
    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT_WIDTH;
    canvas.height = OUTPUT_HEIGHT;
    cv.imshow(canvas, binarized);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Canvas toBlob failed'))),
        'image/jpeg',
        0.85,
      );
    });

    // Cleanup OpenCV matrices
    srcPoints.delete();
    dstPoints.delete();
    M.delete();

    return {
      blob,
      corners,
      width: OUTPUT_WIDTH,
      height: OUTPUT_HEIGHT,
    };
  } finally {
    src?.delete();
    warped?.delete();
    gray?.delete();
    binarized?.delete();
  }
}
