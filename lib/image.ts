export interface CompressedImage {
  dataUrl: string;
  base64: string;
  mimeType: string;
  sizeBytes: number;
  width: number;
  height: number;
  previewUrl: string;
  /** String waktu WIB yang dicap pada foto, mis. "21/10/2026 09.05.30 WIB". */
  capturedAt: string;
}

export const MAX_EDGE = 1280;
export const JPEG_QUALITY = 0.75;
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/** Cap waktu WIB ringkas untuk dibakar ke dalam foto. */
export function formatCaptureStamp(date: Date): string {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Jakarta',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(date);

    const pick = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((p) => p.type === type)?.value ?? '00';

    return `${pick('day')}/${pick('month')}/${pick('year')} ${pick('hour')}.${pick('minute')}.${pick(
      'second',
    )} WIB`;
  } catch {
    return date.toISOString();
  }
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') resolve(result);
      else reject(new Error('Gagal membaca berkas foto.'));
    };
    reader.onerror = () => reject(new Error('Gagal membaca berkas foto.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Kompres foto di sisi klien lewat Canvas sebelum dikirim ke Google Apps Script.
 * Cap waktu WIB dibakar langsung ke sudut kiri-bawah foto (bukti waktu ambil).
 * Target: sisi terpanjang maksimal 1280px, kualitas JPEG 0.75.
 */
export async function compressImage(file: File, capturedAt: Date = new Date()): Promise<CompressedImage> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Berkas yang dipilih bukan gambar.');
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error('Ukuran foto maksimal 5 MB.');
  }

  const dataUrl = await fileToBase64(file);
  const image = await loadImage(dataUrl);

  const scale = Math.min(1, MAX_EDGE / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Browser tidak mendukung pemrosesan foto.');
  }
  context.drawImage(image, 0, 0, width, height);

  const stamp = formatCaptureStamp(capturedAt);
  burnTimestamp(context, stamp, width, height);

  const output = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
  const base64 = output.split(',')[1] ?? '';

  return {
    dataUrl: output,
    base64,
    mimeType: 'image/jpeg',
    sizeBytes: Math.round((base64.length * 3) / 4),
    width,
    height,
    previewUrl: output,
    capturedAt: stamp,
  };
}

/** Gambar cap waktu dengan latar semi-transparan agar terbaca di foto apa pun. */
function burnTimestamp(
  context: CanvasRenderingContext2D,
  text: string,
  width: number,
  height: number,
) {
  const fontSize = Math.max(14, Math.round(width * 0.035));
  const paddingX = Math.round(fontSize * 0.6);
  const paddingY = Math.round(fontSize * 0.45);
  const margin = Math.round(fontSize * 0.7);

  context.save();
  context.font = `600 ${fontSize}px "JetBrains Mono", ui-monospace, monospace`;
  context.textBaseline = 'bottom';
  const metrics = context.measureText(text);
  const textWidth = metrics.width;

  const boxW = textWidth + paddingX * 2;
  const boxH = fontSize + paddingY * 2;
  const boxX = margin;
  const boxY = height - margin - boxH;

  context.fillStyle = 'rgba(7, 26, 46, 0.62)';
  const radius = Math.round(boxH / 2);
  roundRect(context, boxX, boxY, boxW, boxH, radius);
  context.fill();

  context.fillStyle = '#ffffff';
  context.fillText(text, boxX + paddingX, boxY + boxH - paddingY);
  context.restore();
}

function roundRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, h / 2, w / 2);
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + w, y, x + w, y + h, radius);
  context.arcTo(x + w, y + h, x, y + h, radius);
  context.arcTo(x, y + h, x, y, radius);
  context.arcTo(x, y, x + w, y, radius);
  context.closePath();
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Format foto tidak didukung.'));
    image.src = src;
  });
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
