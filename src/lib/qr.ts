import qrcode from 'qrcode-generator';
import type { QrErrorLevel } from './types';

export type QrWifiSecurity = 'WPA' | 'WEP' | 'nopass';

export type QrContent =
  | { kind: 'url'; url: string }
  | { kind: 'text'; text: string }
  | { kind: 'email'; to: string; subject: string; body: string }
  | { kind: 'phone'; number: string }
  | { kind: 'sms'; number: string; body: string }
  | { kind: 'wifi'; ssid: string; password: string; security: QrWifiSecurity; hidden: boolean }
  | {
      kind: 'contact';
      first: string;
      last: string;
      org: string;
      phone: string;
      email: string;
      website: string;
      address: string;
    }
  | {
      kind: 'calendar';
      title: string;
      start: string; // yyyy-mm-ddThh:mm
      end: string;
      location: string;
      description: string;
    };

const escWifi = (s: string) =>
  s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/:/g, '\\:').replace(/"/g, '\\"');

const escMecard = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,');

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function toIcalDate(local: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})$/.exec(local);
  if (!m) return '';
  return `${m[1]}${m[2]}${m[3]}T${m[4]}${m[5]}00`;
}

export function buildQrPayload(content: QrContent): string {
  switch (content.kind) {
    case 'url':
      return content.url.trim();
    case 'text':
      return content.text;
    case 'email': {
      const parts = [`mailto:${content.to.trim()}`];
      const query: string[] = [];
      if (content.subject) query.push(`subject=${encodeURIComponent(content.subject)}`);
      if (content.body) query.push(`body=${encodeURIComponent(content.body)}`);
      if (query.length) parts.push(`?${query.join('&')}`);
      return parts.join('');
    }
    case 'phone':
      return `tel:${content.number.trim().replace(/[^\d+]/g, '')}`;
    case 'sms':
      return `SMSTO:${content.number.trim()}:${content.body}`;
    case 'wifi': {
      const sec = content.security === 'nopass' ? '' : content.security;
      return `WIFI:T:${sec};S:${escWifi(content.ssid)};P:${escWifi(content.password)};${content.hidden ? 'H:true;' : ''};`;
    }
    case 'contact': {
      const fields = ['MECARD:'];
      const name = [content.last.trim(), content.first.trim()].filter(Boolean).join(',');
      if (name) fields.push(`N:${escMecard(name)};`);
      if (content.org.trim()) fields.push(`ORG:${escMecard(content.org.trim())};`);
      if (content.phone.trim()) fields.push(`TEL:${escMecard(content.phone.trim())};`);
      if (content.email.trim()) fields.push(`EMAIL:${escMecard(content.email.trim())};`);
      if (content.website.trim()) fields.push(`URL:${escMecard(content.website.trim())};`);
      if (content.address.trim()) fields.push(`ADR:${escMecard(content.address.trim())};`);
      fields.push(';');
      return fields.join('');
    }
    case 'calendar': {
      const dtstart = toIcalDate(content.start);
      const dtend = toIcalDate(content.end);
      const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'BEGIN:VEVENT',
        `SUMMARY:${content.title.replace(/\n/g, ' ')}`
      ];
      if (dtstart) lines.push(`DTSTART:${dtstart}`);
      if (dtend) lines.push(`DTEND:${dtend}`);
      if (content.location) lines.push(`LOCATION:${content.location}`);
      if (content.description) lines.push(`DESCRIPTION:${content.description}`);
      lines.push('END:VEVENT', 'END:VCALENDAR');
      return lines.join('\n');
    }
  }
}

export interface QrRenderStyle {
  size: number;
  margin: number;
  errorLevel: QrErrorLevel;
  fg: string;
  bg: string;
  rounded: boolean;
}

export interface MatrixResult {
  qr: ReturnType<typeof qrcode>;
  modules: number;
}

export function makeMatrix(content: string, level: QrErrorLevel): MatrixResult {
  const qr = qrcode(0, level);
  qr.addData(content, 'Byte');
  qr.make();
  return { qr, modules: qr.getModuleCount() };
}

export function totalModules(modules: number, margin: number): number {
  return modules + margin * 2;
}

export function renderQrCanvas(
  qr: ReturnType<typeof qrcode>,
  style: QrRenderStyle
): HTMLCanvasElement {
  const { margin, fg, bg, rounded } = style;
  const modules = qr.getModuleCount();
  const total = totalModules(modules, margin);
  const scale = Math.max(1, Math.ceil(style.size / total));
  const px = total * scale;
  const canvas = document.createElement('canvas');
  canvas.width = px;
  canvas.height = px;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, px, px);
  ctx.fillStyle = fg;
  const radius = rounded ? Math.max(1, scale * 0.32) : 0;
  for (let r = 0; r < modules; r += 1) {
    for (let c = 0; c < modules; c += 1) {
      if (!qr.isDark(r, c)) continue;
      const x = (c + margin) * scale;
      const y = (r + margin) * scale;
      if (radius > 0 && 'roundRect' in ctx) {
        ctx.beginPath();
        ctx.roundRect(x, y, scale, scale, radius);
        ctx.fill();
      } else {
        ctx.fillRect(x, y, scale, scale);
      }
    }
  }
  return canvas;
}

export function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png');
  });
}

export function renderQrSvg(qr: ReturnType<typeof qrcode>, style: QrRenderStyle): string {
  const modules = qr.getModuleCount();
  const total = totalModules(modules, style.margin);
  const rects: string[] = [];
  for (let r = 0; r < modules; r += 1) {
    for (let c = 0; c < modules; c += 1) {
      if (!qr.isDark(r, c)) continue;
      const x = c + style.margin;
      const y = r + style.margin;
      const rx = style.rounded ? 0.28 : 0;
      rects.push(`<rect x="${x}" y="${y}" width="1" height="1" rx="${rx}"/>`);
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges" width="${style.size}" height="${style.size}"><rect width="${total}" height="${total}" fill="${style.bg}"/><g fill="${style.fg}">${rects.join('')}</g></svg>`;
}
