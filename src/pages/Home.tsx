import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePageMeta } from '../lib/head';
import { useApp } from '../lib/app';
import { CATEGORY_META, TOOLS } from '../lib/registry';
import { ToolCard } from '../components/ToolCard';
import { Icon } from '../components/icons';
import { cn } from '../components/ui';
import { AdSlot } from '../components/sections';
import type { CategoryId } from '../lib/types';

type Filter = CategoryId | 'all' | 'favorites';

export function HomePage() {
  usePageMeta({
    title: 'Litely  -  Fast, private tools that run in your browser',
    description:
      'Compress images, merge PDFs, create QR codes and pull color palettes out of photos. Fast, private utilities that run entirely in your browser.',
    canonicalPath: '/',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'Litely',
      url: window.location.origin,
      description: 'Privacy-first browser tools for images, PDFs, QR codes and color palettes.'
    }
  });

  const { favorites, recent } = useApp();
  const [filter, setFilter] = useState<Filter>('all');

  const visible = useMemo(() => {
    if (filter === 'favorites') return TOOLS.filter((t) => favorites.includes(t.id));
    if (filter === 'all') return TOOLS;
    return TOOLS.filter((t) => t.category === filter);
  }, [filter, favorites]);

  const favDefs = useMemo(() => TOOLS.filter((t) => favorites.includes(t.id)), [favorites]);
  const recentDefs = useMemo(
    () => recent.map((id) => TOOLS.find((t) => t.id === id)).filter((x): x is NonNullable<typeof x> => Boolean(x)),
    [recent]
  );

  const filters: Array<{ value: Filter; label: string }> = [
    { value: 'all', label: 'All tools' },
    ...(favorites.length ? [{ value: 'favorites' as Filter, label: `Favorites (${favorites.length})` }] : []),
    ...Object.entries(CATEGORY_META).map(([key, meta]) => ({
      value: key as Filter,
      label: meta.label
    }))
  ];

  const scrollToTools = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    document.getElementById('tools')?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToHow = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      <section className="hero">
        <div className="container hero-inner">
          <span className="hero-eyebrow">
            <Icon name="lock" size={14} /> 100% local  -  files never leave your device
          </span>
          <h1 className="hero-title">Everyday tools, without the hassle.</h1>
          <p className="hero-sub">
            Fast, private utilities that run directly in your browser. No uploads, no accounts, no
            waiting.
          </p>
          <div className="hero-actions">
            <a href="#tools" className="btn btn-primary btn-lg" onClick={scrollToTools}>
              Explore tools <Icon name="arrowRight" size={18} />
            </a>
            <a href="#how" className="btn btn-secondary btn-lg" onClick={scrollToHow}>
              How it works
            </a>
          </div>
        </div>
      </section>

      <section className="container home-section" id="how" aria-label="How Litely works">
        <div className="section-head">
          <h2 className="section-title">How Litely works</h2>
        </div>
        <div className="how-grid">
          <div className="how-step">
            <span className="how-num">1</span>
            <h3>Choose a tool</h3>
            <p>Pick what you need  -  compress an image, merge PDFs, make a QR code.</p>
          </div>
          <div className="how-step">
            <span className="how-num">2</span>
            <h3>Add your file</h3>
            <p>Drop files in or paste from the clipboard. Nothing is uploaded.</p>
          </div>
          <div className="how-step">
            <span className="how-num">3</span>
            <h3>Process it locally</h3>
            <p>Your browser does the work on your device  -  fast and private.</p>
          </div>
          <div className="how-step">
            <span className="how-num">4</span>
            <h3>Download the result</h3>
            <p>Grab your optimized image, merged PDF, or freshly made QR code.</p>
          </div>
        </div>
      </section>

      {recentDefs.length > 0 ? (
        <section className="container home-section" aria-label="Recently used tools">
          <div className="section-head">
            <h2 className="section-title">Recently used</h2>
            <span className="section-sub">Stored only on this device</span>
          </div>
          <div className="tool-grid">
            {recentDefs.slice(0, 3).map((t) => (
              <ToolCard key={t.id} def={t} size="sm" />
            ))}
          </div>
        </section>
      ) : null}

      <section className="container home-section" id="tools" aria-label="All tools">
        <div className="section-head">
          <div>
            <h2 className="section-title">All tools</h2>
            <p className="section-sub" style={{ margin: '4px 0 0' }}>
              Professional, fast and private browser utilities.
            </p>
          </div>
        </div>

        <div className="chip-filter-row" role="tablist" aria-label="Filter tools by category">
          {filters.map((f) => (
            <button
              key={f.value}
              type="button"
              role="tab"
              aria-selected={filter === f.value}
              className={cn('chip', filter === f.value && 'chip-active')}
              onClick={() => setFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {filter === 'all' ? (
          Object.entries(CATEGORY_META).map(([key, meta]) => {
            const tools = TOOLS.filter((t) => t.category === key);
            if (!tools.length) return null;
            return (
              <div key={key} style={{ marginTop: 26 }}>
                <div className="section-head">
                  <h3 className="section-title" style={{ fontSize: 17 }}>
                    {meta.label}
                  </h3>
                  <span className="section-sub">{tools.length} tools</span>
                </div>
                <div className="tool-grid" style={{ marginTop: 12 }}>
                  {tools.map((t) => (
                    <ToolCard key={t.id} def={t} />
                  ))}
                </div>
                {key === 'image' ? <AdSlot position="home-between" style={{ marginTop: 24 }} /> : null}
              </div>
            );
          })
        ) : visible.length ? (
          <>
            <div className="tool-grid" style={{ marginTop: 12 }}>
              {visible.map((t) => (
                <ToolCard key={t.id} def={t} />
              ))}
            </div>
            {visible.length === 0 ? (
              <p className="muted small">Nothing here yet.</p>
            ) : null}
          </>
        ) : (
          <div className="empty-state" style={{ marginTop: 20 }}>
            <div className="empty-icon">
              <Icon name="star" size={24} />
            </div>
            <h3 className="empty-title">No favorites yet</h3>
            <p className="empty-text">Tap the star on any tool to pin it here for quick access.</p>
          </div>
        )}
      </section>
    </>
  );
}
