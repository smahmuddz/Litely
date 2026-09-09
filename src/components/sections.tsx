import type { CSSProperties, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { ToolDef } from '../lib/types';
import { CATEGORY_META } from '../lib/registry';
import { Icon } from './icons';
import { cn } from './ui';

declare global {
  interface Window {
    __LITELY_ADS__?: { enabled?: boolean; label?: string; url?: string };
  }
}

/**
 * Ad slots are pure layout placeholders. They render nothing until an ad
 * provider is configured (window.__LITELY_ADS__). The product must look
 * professional both with and without ads.
 */
export function AdSlot({
  position,
  className,
  style
}: {
  position: string;
  className?: string;
  style?: CSSProperties;
}) {
  const config = window.__LITELY_ADS__;
  if (!config?.enabled) return null;
  return (
    <aside className={cn('ad-slot', className)} style={style} aria-label="Advertisement">
      <span className="ad-label">Advertisement</span>
      <a
        className="ad-inner"
        href={config.url ?? '#'}
        target="_blank"
        rel="noopener noreferrer nofollow sponsored"
      >
        {config.label ?? 'Your ad could be here.'}
      </a>
    </aside>
  );
}

export function ToolHeader({ def, children }: { def: ToolDef; children?: ReactNode }) {
  const cat = CATEGORY_META[def.category];
  return (
    <div className="tool-head">
      <div className="tool-crumb">
        <Link to="/" className="crumb-link">
          Tools
        </Link>
        <span aria-hidden> / </span>
        <span className="crumb-cat">{cat.label}</span>
      </div>
      <div className="tool-head-row">
        <h1 className="tool-title">
          <span className="tool-title-icon" aria-hidden>
            <Icon name={def.icon} size={24} />
          </span>
          {def.name}
        </h1>
      </div>
      <p className="tool-lead">{def.description}</p>
      {children}
    </div>
  );
}

export function PrivacyPill() {
  return (
    <div className="privacy-pill">
      <Icon name="lock" size={14} />
      Your files never leave your device. Everything is processed locally in your browser.
    </div>
  );
}

export function LocalProcessingNote() {
  return (
    <p className="local-note">
      <Icon name="zap" size={14} />
      All processing happens locally  -  nothing is uploaded to a server.
    </p>
  );
}

export function ToolSeoBlock({ def }: { def: ToolDef }) {
  return (
    <section className="seo-block" aria-label={`About ${def.name}`}>
      <h2>About {def.name}</h2>
      <p>{def.description}</p>
      <ul className="seo-list">
        {def.tags.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
    </section>
  );
}
