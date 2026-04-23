import { PDFDocument, rgb } from 'pdf-lib';

// Fiducial marker size: 15mm ≈ 42.52 points (1mm = 2.8346pt)
const MARKER_SIZE_PT = 42.52;
// Margin from page edge to marker outer corner
const MARKER_MARGIN_PT = 20;

export interface FiducialConfig {
  /** Marker size in points (default: 42.52pt = 15mm) */
  size?: number;
  /** Margin from page edge in points (default: 20pt) */
  margin?: number;
}

/**
 * Draw four black fiducial squares at the corners of a PDF page.
 * These are used by OpenCV.js in the scanner to detect perspective transform anchors.
 *
 * Returns the four corner coordinates (center of each marker) for reference.
 */
export function drawFiducialMarkers(
  page: ReturnType<PDFDocument['addPage']>,
  config: FiducialConfig = {},
): { topLeft: [number, number]; topRight: [number, number]; bottomLeft: [number, number]; bottomRight: [number, number] } {
  const size = config.size ?? MARKER_SIZE_PT;
  const margin = config.margin ?? MARKER_MARGIN_PT;
  const { width, height } = page.getSize();

  // Coordinates are in PDF coordinate system (origin at bottom-left)
  const positions = {
    bottomLeft: { x: margin, y: margin },
    bottomRight: { x: width - margin - size, y: margin },
    topLeft: { x: margin, y: height - margin - size },
    topRight: { x: width - margin - size, y: height - margin - size },
  };

  for (const pos of Object.values(positions)) {
    page.drawRectangle({
      x: pos.x,
      y: pos.y,
      width: size,
      height: size,
      color: rgb(0, 0, 0),
    });
  }

  // Return center points of each marker
  const half = size / 2;
  return {
    topLeft: [positions.topLeft.x + half, positions.topLeft.y + half],
    topRight: [positions.topRight.x + half, positions.topRight.y + half],
    bottomLeft: [positions.bottomLeft.x + half, positions.bottomLeft.y + half],
    bottomRight: [positions.bottomRight.x + half, positions.bottomRight.y + half],
  };
}
