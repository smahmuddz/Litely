export const uid = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

export function formatBytes(bytes: number, decimals = 1): string {
  if (!Number.isFinite(bytes) || bytes < 0) return ' - ';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(k)));
  const value = bytes / Math.pow(k, i);
  const digits = value >= 100 || i === 0 ? 0 : decimals;
  return `${value.toFixed(digits)} ${units[i]}`;
}

export function formatPercent(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return ' - ';
  return `${(value * 100).toFixed(digits)}%`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function debounce<T extends (...args: never[]) => void>(
  fn: T,
  wait = 300
): (...args: Parameters<T>) => void {
  let handle: ReturnType<typeof setTimeout> | undefined;
  return (...args: Parameters<T>) => {
    if (handle !== undefined) clearTimeout(handle);
    handle = setTimeout(() => fn(...args), wait);
  };
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  // let the browser start the download before revoking
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export async function readAsArrayBuffer(file: Blob): Promise<ArrayBuffer> {
  return file.arrayBuffer();
}

export function extOf(name: string): string {
  const idx = name.lastIndexOf('.');
  return idx > 0 ? name.slice(idx + 1).toLowerCase() : '';
}

export function stripExt(name: string): string {
  const idx = name.lastIndexOf('.');
  return idx > 0 ? name.slice(0, idx) : name;
}

export function applySuffix(name: string, suffix: string, newExt?: string): string {
  const base = stripExt(name);
  const ext = newExt ?? extOf(name);
  const suffixed = suffix ? `${base}${suffix}` : base;
  return ext ? `${suffixed}.${ext}` : suffixed;
}

export function plural(count: number, singular: string, pluralWord?: string): string {
  return count === 1 ? singular : pluralWord ?? `${singular}s`;
}

export async function readFileText(file: File): Promise<string> {
  return file.text();
}

/** Detect image type by magic bytes (more reliable than mime type). */
export function sniffImageType(bytes: Uint8Array): 'jpeg' | 'png' | 'webp' | 'avif' | 'gif' | null {
  if (!bytes || bytes.length < 12) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpeg';
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  )
    return 'png';
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) {
    if (bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50)
      return 'webp';
  }
  // ISO BMFF (AVIF/HEIC)  -  check for `ftyp` box with an avif brand
  if (bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) {
    const slice = String.fromCharCode(...bytes.slice(8, 20));
    if (/avif|avis/i.test(slice)) return 'avif';
  }
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return 'gif';
  return null;
}

export async function sniffFirstBytes(file: File, count = 16): Promise<Uint8Array> {
  const buf = new Uint8Array(await file.slice(0, count).arrayBuffer());
  return buf;
}

export const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.avif'];
export const PDF_EXTENSION = ['.pdf'];
export const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/avif';

export function filenameForResult(base: string, format: string, suffix: string): string {
  return applySuffix(base, suffix, format === 'original' ? undefined : format);
}
