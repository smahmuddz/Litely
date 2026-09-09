import type { SVGProps } from 'react';
import type { IconName } from '../lib/types';

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number;
}

const base: SVGProps<SVGSVGElement> = {
  xmlns: 'http://www.w3.org/2000/svg',
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true
};

function Logo() {
  return (
    <svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden>
      <rect x="2" y="2" width="20" height="20" rx="6" fill="var(--accent)" />
      <rect x="5.5" y="6.5" width="13" height="3" rx="1.5" fill="#fff" opacity="0.92" />
      <rect x="5.5" y="10.6" width="13" height="3" rx="1.5" fill="#fff" opacity="0.7" />
      <rect x="5.5" y="14.7" width="13" height="3" rx="1.5" fill="#fff" />
    </svg>
  );
}

const P = (d: string) => <path d={d} />;

export function Icon({ name, size = 20, className, style, ...rest }: IconProps) {
  const s = { width: size, height: size, ...style };
  if (name === 'logo') {
    return (
      <span
        className={className}
        style={{ width: size, height: size, display: 'inline-block', ...style }}
      >
        <Logo />
      </span>
    );
  }
  const common = { ...base, width: size, height: size, ...rest, style: s, className: undefined };
  const cls = className;
  let body: React.ReactNode = null;
  switch (name) {
    case 'compress':
      body = (
        <>
          <path d="M4 14h6v6" />
          <path d="M20 10h-6V4" />
          <path d="M14 10l7-7" />
          <path d="M3 21l7-7" />
        </>
      );
      break;
    case 'convert':
      body = (
        <>
          <path d="m17 2 4 4-4 4" />
          <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
          <path d="m7 22-4-4 4-4" />
          <path d="M21 13v1a4 4 0 0 1-4 4H3" />
        </>
      );
      break;
    case 'merge':
      body = <>{P('m5 3 7 9 7-9')}{P('M12 12v9')}</>;
      break;
    case 'split':
      body = <>{P('M12 3v9')}{P('M5 21l7-9')}{P('m19 21-7-9')}</>;
      break;
    case 'extract':
      body = (
        <>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6" />
          <path d="M12 12v6" />
          <path d="m9 15 3 3 3-3" />
        </>
      );
      break;
    case 'reorder':
      body = (
        <>
          <path d="M3 6h11" />
          <path d="M3 12h11" />
          <path d="M3 18h11" />
          <path d="m17 15 3 3 3-3" />
          <path d="M20 18V3" />
        </>
      );
      break;
    case 'qr':
      body = (
        <>
          <rect x="3" y="3" width="6" height="6" rx="1" />
          <rect x="15" y="3" width="6" height="6" rx="1" />
          <rect x="3" y="15" width="6" height="6" rx="1" />
          <rect x="12" y="4" width="2" height="2" fill="currentColor" stroke="none" rx="0.4" />
          <rect x="12" y="8" width="2" height="2" fill="currentColor" stroke="none" rx="0.4" />
          <rect x="9" y="12" width="2" height="2" fill="currentColor" stroke="none" rx="0.4" />
          <rect x="12" y="12" width="2" height="2" fill="currentColor" stroke="none" rx="0.4" />
          <rect x="15" y="12" width="2" height="2" fill="currentColor" stroke="none" rx="0.4" />
          <rect x="12" y="16" width="2" height="2" fill="currentColor" stroke="none" rx="0.4" />
          <path d="M15 16v5" />
          <path d="M21 12v2" />
          <path d="M21 16v5" />
        </>
      );
      break;
    case 'password':
    case 'key':
      body = (
        <>
          <circle cx="7.5" cy="15.5" r="5.5" />
          <path d="m21 2-2 2" />
          <path d="m15.5 7.5 3 3L22 7l-3-3" />
          <path d="m15.5 7.5 3 3" />
          <path d="M21 2l-5.5 5.5" />
          <path d="m2 21 7-7" />
        </>
      );
      break;
    case 'palette':
    case 'paint':
      body = (
        <>
          <path d="M12 21a9 9 0 1 1 9-9c0 1.66-1.34 3-3 3h-1.67a2.33 2.33 0 0 0-2.33 2.33c0 .6.22 1.15.6 1.57.4.45.62 1.04.62 1.67 0 .8-.64 1.43-1.43 1.43Z" />
          <circle cx="7.5" cy="10.5" r="1.1" fill="currentColor" stroke="none" />
          <circle cx="11" cy="6.5" r="1.1" fill="currentColor" stroke="none" />
          <circle cx="16" cy="7.5" r="1.1" fill="currentColor" stroke="none" />
          <circle cx="18.5" cy="12" r="1.1" fill="currentColor" stroke="none" />
        </>
      );
      break;
    case 'search':
      body = (
        <>
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.35-4.35" />
        </>
      );
      break;
    case 'star':
      body = <path d="M12 2.5l2.95 5.98 6.6.96-4.78 4.66 1.13 6.58L12 17.57l-5.9 3.1 1.13-6.57L2.45 9.44l6.6-.96L12 2.5z" />;
      break;
    case 'sun':
      body = (
        <>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </>
      );
      break;
    case 'moon':
      body = <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />;
      break;
    case 'monitor':
      body = (
        <>
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <path d="M8 21h8M12 17v4" />
        </>
      );
      break;
    case 'settings':
      body = (
        <>
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
          <circle cx="12" cy="12" r="3" />
        </>
      );
      break;
    case 'menu':
      body = <path d="M4 6h16M4 12h16M4 18h16" />;
      break;
    case 'close':
      body = <path d="M18 6 6 18M6 6l12 12" />;
      break;
    case 'arrowLeft':
      body = (
        <>
          <path d="M19 12H5" />
          <path d="m12 19-7-7 7-7" />
        </>
      );
      break;
    case 'arrowRight':
      body = (
        <>
          <path d="M5 12h14" />
          <path d="m12 5 7 7-7 7" />
        </>
      );
      break;
    case 'arrowUp':
      body = (
        <>
          <path d="M12 19V5" />
          <path d="m5 12 7-7 7 7" />
        </>
      );
      break;
    case 'arrowDown':
      body = (
        <>
          <path d="M12 5v14" />
          <path d="m19 12-7 7-7-7" />
        </>
      );
      break;
    case 'chevronDown':
      body = <path d="m6 9 6 6 6-6" />;
      break;
    case 'check':
      body = <path d="M20 6 9 17l-5-5" />;
      break;
    case 'plus':
      body = <path d="M12 5v14M5 12h14" />;
      break;
    case 'minus':
      body = <path d="M5 12h14" />;
      break;
    case 'trash':
      body = (
        <>
          <path d="M3 6h18" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <path d="M10 11v6M14 11v6" />
        </>
      );
      break;
    case 'download':
      body = (
        <>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <path d="m7 10 5 5 5-5" />
          <path d="M12 15V3" />
        </>
      );
      break;
    case 'upload':
      body = (
        <>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <path d="m17 8-5-5-5 5" />
          <path d="M12 3v12" />
        </>
      );
      break;
    case 'copy':
      body = (
        <>
          <rect x="9" y="9" width="13" height="13" rx="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </>
      );
      break;
    case 'refresh':
      body = (
        <>
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
        </>
      );
      break;
    case 'eye':
      body = (
        <>
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
          <circle cx="12" cy="12" r="3" />
        </>
      );
      break;
    case 'eyeOff':
      body = (
        <>
          <path d="M10.7 5.1A9.8 9.8 0 0 1 12 5c6.5 0 10 7 10 7a17.5 17.5 0 0 1-3.4 4.1M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7c1.8 0 3.4-.5 4.8-1.3" />
          <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
          <path d="m2 2 20 20" />
        </>
      );
      break;
    case 'lock':
      body = (
        <>
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </>
      );
      break;
    case 'file':
      body = (
        <>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6" />
        </>
      );
      break;
    case 'link':
      body = (
        <>
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </>
      );
      break;
    case 'mail':
      body = (
        <>
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="m22 6-10 7L2 6" />
        </>
      );
      break;
    case 'phone':
      body = (
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
      );
      break;
    case 'message':
      body = (
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
      );
      break;
    case 'wifi':
      body = (
        <>
          <path d="M5 12.55a11 11 0 0 1 14.08 0" />
          <path d="M1.42 9a16 16 0 0 1 21.16 0" />
          <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
          <path d="M12 20h.01" />
        </>
      );
      break;
    case 'contact':
      body = (
        <>
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </>
      );
      break;
    case 'calendar':
      body = (
        <>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </>
      );
      break;
    case 'external':
      body = (
        <>
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
          <path d="M15 3h6v6" />
          <path d="M10 14 21 3" />
        </>
      );
      break;
    case 'warning':
      body = (
        <>
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
        </>
      );
      break;
    case 'alert':
      body = (
        <>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4" />
          <path d="M12 16h.01" />
        </>
      );
      break;
    case 'checkCircle':
      body = (
        <>
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <path d="M22 4 12 14.01l-3-3" />
        </>
      );
      break;
    case 'info':
      body = (
        <>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" />
          <path d="M12 8h.01" />
        </>
      );
      break;
    case 'grip':
      body = (
        <>
          <circle cx="9" cy="6" r="1" fill="currentColor" stroke="none" />
          <circle cx="15" cy="6" r="1" fill="currentColor" stroke="none" />
          <circle cx="9" cy="12" r="1" fill="currentColor" stroke="none" />
          <circle cx="15" cy="12" r="1" fill="currentColor" stroke="none" />
          <circle cx="9" cy="18" r="1" fill="currentColor" stroke="none" />
          <circle cx="15" cy="18" r="1" fill="currentColor" stroke="none" />
        </>
      );
      break;
    case 'rotate':
      body = (
        <>
          <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
          <path d="M21 3v5h-5" />
        </>
      );
      break;
    case 'zap':
      body = <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />;
      break;
    case 'layers':
      body = (
        <>
          <path d="m12 2 10 5-10 5L2 7l10-5z" />
          <path d="m2 17 10 5 10-5" />
          <path d="m2 12 10 5 10-5" />
        </>
      );
      break;
    case 'grid':
      body = (
        <>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
        </>
      );
      break;
    case 'image':
      body = (
        <>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="m21 15-5-5L5 21" />
        </>
      );
      break;
    case 'shield':
      body = <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />;
      break;
    case 'eyedropper':
      body = (
        <>
          <path d="m2 22 12-12" />
          <path d="M4 22h4l12-12" />
          <path d="m21.5 14.5-3.5-3.5" />
          <path d="m16 9 2-2c1-1 1.5-1 1.8-.4.4.8 0 2-1 3l-2 2" />
        </>
      );
      break;
    case 'home':
      body = (
        <>
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <path d="M9 22V12h6v10" />
        </>
      );
      break;
    default:
      body = <circle cx="12" cy="12" r="9" />;
  }
  return (
    <svg {...common} className={cls}>
      {body}
    </svg>
  );
}
