import QRCode from 'qrcode';
import type { QRPayload } from '@markflow/shared-types';
import { encodeQRPayload } from '@markflow/shared-types';

// QR code render size in points (≈ 25mm square)
const QR_SIZE_PT = 70;

export interface QRConfig {
  /** QR code render size in points (default: 70pt ≈ 25mm) */
  size?: number;
  /** Error correction level (default: 'M') */
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
}

/**
 * Generate a QR code as a PNG data URL encoding the exam/student/page metadata.
 * The PNG is then embedded into the PDF page.
 */
export async function generateQRCodePng(
  payload: QRPayload,
  config: QRConfig = {},
): Promise<Uint8Array> {
  const data = encodeQRPayload(payload);
  const ecLevel = config.errorCorrectionLevel ?? 'M';

  const dataUrl = await QRCode.toDataURL(data, {
    errorCorrectionLevel: ecLevel,
    margin: 1,
    width: 200,
    color: { dark: '#000000', light: '#ffffff' },
  });

  // Strip the data URL prefix to get raw base64
  const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

export { QR_SIZE_PT };
