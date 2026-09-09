export type ThemePref = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

export interface Settings {
  theme: ThemePref;
  confirmClear: boolean;
  autoDownload: boolean;
  rememberFavorites: boolean;
}

export type CategoryId = 'image' | 'pdf' | 'generate' | 'analyze';

export type IconName =
  | 'logo'
  | 'compress'
  | 'convert'
  | 'merge'
  | 'split'
  | 'extract'
  | 'reorder'
  | 'qr'
  | 'password'
  | 'palette'
  | 'search'
  | 'star'
  | 'sun'
  | 'moon'
  | 'monitor'
  | 'settings'
  | 'menu'
  | 'close'
  | 'arrowLeft'
  | 'arrowRight'
  | 'chevronDown'
  | 'check'
  | 'plus'
  | 'minus'
  | 'trash'
  | 'download'
  | 'upload'
  | 'copy'
  | 'refresh'
  | 'eye'
  | 'eyeOff'
  | 'lock'
  | 'file'
  | 'link'
  | 'mail'
  | 'phone'
  | 'message'
  | 'wifi'
  | 'contact'
  | 'calendar'
  | 'external'
  | 'warning'
  | 'alert'
  | 'checkCircle'
  | 'info'
  | 'grip'
  | 'rotate'
  | 'zap'
  | 'layers'
  | 'grid'
  | 'image'
  | 'arrowUp'
  | 'arrowDown'
  | 'key'
  | 'shield'
  | 'home'
  | 'paint'
  | 'eyedropper';

export interface ToolDef {
  id: string;
  slug: string;
  name: string;
  category: CategoryId;
  icon: IconName;
  /** short card + search tagline */
  tagline: string;
  /** longer human description for SEO / lead paragraph */
  description: string;
  tags: string[];
  keywords: string[];
}

export type ToastType = 'info' | 'success' | 'error';

export interface Toast {
  id: number;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

export interface FileMeta {
  id: string;
  name: string;
  size: number;
  mime: string;
}

export type ProcessStatus =
  | 'queued'
  | 'processing'
  | 'done'
  | 'error'
  | 'cancelled';

export interface QueueEntry {
  id: string;
  file: File;
  status: ProcessStatus;
  error?: string;
  /** results for this entry when processing completes */
  result?: ItemResult;
}

export interface ItemResult {
  id: string;
  blob: Blob;
  name: string;
  mime: string;
  width?: number;
  height?: number;
  originalSize: number;
  size: number;
  origWidth?: number;
  origHeight?: number;
  /** time to process in ms */
  durationMs?: number;
}

export type OutFormat = 'original' | 'jpeg' | 'png' | 'webp' | 'avif';

export type ResizeMode =
  | 'original'
  | 'width'
  | 'height'
  | 'maxWidth'
  | 'maxHeight'
  | 'percent';

export interface ResizeSpec {
  mode: ResizeMode | 'custom';
  value: number;
  width?: number;
  height?: number;
  lockAspect: boolean;
}

export interface ImageSettings {
  format: OutFormat;
  quality: number; // 0..1
  resize: ResizeSpec;
  /** fill behind transparent images when flattening to JPEG */
  background: 'white' | 'black' | 'custom' | 'transparent';
  backgroundColor: string; // #rrggbb
  /** quantize PNG to a reduced palette (lossy) */
  pngQuantize: boolean;
  removeMetadata: boolean;
  /** apply file suffix before extension */
  suffix: string;
}

export type ImageTaskRequest = {
  kind: 'image';
  file: File;
  settings: ImageSettings;
};

export interface PdfFileMeta {
  id: string;
  name: string;
  size: number;
  pages?: number;
}

export type QrType =
  | 'url'
  | 'text'
  | 'email'
  | 'phone'
  | 'sms'
  | 'wifi'
  | 'contact'
  | 'calendar';

export type QrErrorLevel = 'L' | 'M' | 'Q' | 'H';

export interface QrStyle {
  size: number;
  margin: number; // quiet zone modules
  errorLevel: QrErrorLevel;
  fg: string;
  bg: string;
  rounded: boolean;
}

export interface PasswordOptions {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
  excludeAmbiguous: boolean;
  excludeSimilar: boolean;
  noRepeat: boolean;
  customSymbols: string;
  minNumbers: number;
  minSymbols: number;
}

export interface PassphraseOptions {
  words: number;
  separator: string;
  capitalize: boolean;
  includeNumber: boolean;
  includeSymbol?: boolean;
}
