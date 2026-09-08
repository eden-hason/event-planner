import jsQR from 'jsqr';
import type { BitDecodeResult } from '../types';
import { validateBitLink } from './validate-links';

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_EDGE = 1600; // longest edge fed to jsQR, for speed
const SUPPORTED = /^image\/(png|jpe?g|webp)$/i;

/**
 * Read a Bit payment link out of an uploaded QR image, entirely in the
 * browser. The image itself is never uploaded anywhere - only the decoded
 * link is kept.
 *
 * HEIC is rejected up front: `<canvas>` cannot decode it in most browsers, so
 * `createImageBitmap` would throw and the user would get the useless
 * "generic" error instead of a clear "use a PNG/JPG" message.
 */
export async function decodeBitQr(file: File): Promise<BitDecodeResult> {
  if (!SUPPORTED.test(file.type)) {
    return { ok: false, kind: 'unsupported' };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, kind: 'oversized' };
  }

  let imageData: ImageData;
  try {
    imageData = await fileToImageData(file);
  } catch {
    return { ok: false, kind: 'generic' };
  }

  const code = jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: 'attemptBoth',
  });

  if (!code || !code.data.trim()) {
    return { ok: false, kind: 'noqr' };
  }
  if (validateBitLink(code.data) !== null) {
    return { ok: false, kind: 'notbit' };
  }
  return { ok: true, link: code.data.trim() };
}

async function fileToImageData(file: File): Promise<ImageData> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('no 2d context');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return ctx.getImageData(0, 0, width, height);
}
