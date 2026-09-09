/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare module 'upng-js' {
  interface UPNG {
    encode(imgs: ArrayLike<number>[] | ArrayLike<number>, w: number, h: number, cnum: number, dels?: number[]): ArrayBuffer;
    toRGBA8(out: Uint8Array, w: number, h: number): ArrayBuffer[];
  }
  const UPNG: UPNG;
  export default UPNG;
}

declare module 'qrcode-generator' {
  interface QRCode {
    addData(data: string, mode?: 'Numeric' | 'Alphanumeric' | 'Byte' | 'Kanji'): void;
    make(): void;
    getModuleCount(): number;
    isDark(row: number, col: number): boolean;
    createSvgToFile?(): never;
    getSvgXml?(): string;
    getTypeNumber(): number;
    setTypeNumber(typeNumber: number): void;
  }
  export default function qrcode(
    typeNumber?: number,
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H'
  ): QRCode;
}
