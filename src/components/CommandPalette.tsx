import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TOOLS, CATEGORY_META } from '../lib/registry';
import { useApp } from '../lib/app';
import { Icon } from './icons';
import { cn, Kbd } from './ui';
import type { CategoryId, IconName } from '../lib/types';

interface Entry {
  id: string;
  kind: 'tool' | 'nav' | 'action';
  label: string;
  hint?: string;
  icon: IconName;
  category?: CategoryId;
  keywords: string;
  run: () => void;
  favorite?: boolean;
  onToggleFavorite?: () => void;
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const { recent, setTheme, isFavorite, toggleFavorite } = useApp();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const openTool = (slug: string) => {
    navigate(`/tools/${slug}`);
    onClose();
  };

  const entries = useMemo<Entry[]>(() => {
    const base: Entry[] = [];
    if (recent.length > 0) {
      for (const id of recent) {
        const t = TOOLS.find((x) => x.id === id);
        if (t)
          base.push({
            id: `recent-${t.id}`,
            kind: 'tool',
            label: t.name,
            hint: 'Recent',
            icon: t.icon,
            category: t.category,
            keywords: t.name,
            run: () => openTool(t.slug),
            favorite: isFavorite(t.id),
            onToggleFavorite: () => toggleFavorite(t.id)
          });
      }
    }
    for (const t of TOOLS) {
      base.push({
        id: t.id,
        kind: 'tool',
        label: t.name,
        hint: CATEGORY_META[t.category].label,
        icon: t.icon,
        category: t.category,
        keywords: `${t.name} ${t.tags.join(' ')} ${t.keywords.join(' ')} ${t.tagline}`,
        run: () => openTool(t.slug),
        favorite: isFavorite(t.id),
        onToggleFavorite: () => toggleFavorite(t.id)
      });
    }
    const actions: Entry[] = [
      {
        id: 'theme-light',
        kind: 'action',
        label: 'Use light theme',
        icon: 'sun',
        keywords: 'light theme appearance',
        run: () => setTheme('light')
      },
      {
        id: 'theme-dark',
        kind: 'action',
        label: 'Use dark theme',
        icon: 'moon',
        keywords: 'dark theme appearance',
        run: () => setTheme('dark')
      },
      {
        id: 'theme-system',
        kind: 'action',
        label: 'Follow system theme',
        icon: 'monitor',
        keywords: 'system theme appearance',
        run: () => setTheme('system')
      },
      {
        id: 'nav-favorites',
        kind: 'nav',
        label: 'Open Favorites',
        icon: 'star',
        keywords: 'favorites saved tools',
        run: () => {
          navigate('/favorites');
          onClose();
        }
      },
      {
        id: 'nav-settings',
        kind: 'nav',
        label: 'Open Settings',
        icon: 'settings',
        keywords: 'settings preferences theme',
        run: () => {
          navigate('/settings');
          onClose();
        }
      },
      {
        id: 'nav-privacy',
        kind: 'nav',
        label: 'Read the Privacy page',
        icon: 'shield',
        keywords: 'privacy local files uploads',
        run: () => {
          navigate('/privacy');
          onClose();
        }
      },
      {
        id: 'nav-about',
        kind: 'nav',
        label: 'About Litely',
        icon: 'info',
        keywords: 'about philosophy',
        run: () => {
          navigate('/about');
          onClose();
        }
      }
    ];
    return [...base, ...actions];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recent, isFavorite]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(
      (e) =>
        e.label.toLowerCase().includes(q) ||
        e.keywords.toLowerCase().includes(q) ||
        e.hint?.toLowerCase().includes(q)
    );
  }, [entries, query]);

  const runAt = (index: number) => {
    const entry = filtered[index];
    if (!entry) return;
    entry.run();
  };

  const activeItem = (index: number) => {
    if (index < 0) index = filtered.length - 1;
    if (index >= filtered.length) index = 0;
    setActive(index);
    requestAnimationFrame(() => {
      const el = listRef.current?.querySelector<HTMLElement>(`[data-pidx="${index}"]`);
      el?.scrollIntoView({ block: 'nearest' });
    });
  };

  const onOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setQuery('');
      setActive(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  };

  useEffect(() => {
    if (open) onOpenChange(true);
    if (open) document.body.classList.add('modal-open');
    else document.body.classList.remove('modal-open');
  }, [open]);

  return (
    <div
      className={cn('palette-root', open && 'palette-root-open')}
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="palette">
        <div className="palette-search">
          <Icon name="search" size={18} />
          <input
            ref={inputRef}
            className="palette-input"
            placeholder="Search tools and actions…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                activeItem(active + 1);
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                activeItem(active - 1);
              } else if (e.key === 'Enter') {
                e.preventDefault();
                runAt(active);
              } else if (e.key === 'Escape') {
                onClose();
              }
            }}
            aria-label="Search tools and actions"
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-list"
            aria-activedescendant={filtered[active] ? `palette-item-${active}` : undefined}
          />
          <Kbd>esc</Kbd>
        </div>
        <div className="palette-list" id="palette-list" ref={listRef} role="listbox">
          {filtered.length === 0 ? (
            <div className="palette-empty">
              No results for “{query}”. Try “pdf”, “image”, “qr” or “theme”.
            </div>
          ) : (
            filtered.map((entry, i) => (
              <div
                key={`${entry.kind}-${entry.id}`}
                id={`palette-item-${i}`}
                data-pidx={i}
                role="option"
                aria-selected={active === i}
                className={cn('palette-item', active === i && 'pi-active')}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  entry.run();
                }}
              >
                <span className="pi-icon">
                  <Icon name={entry.icon} size={17} />
                </span>
                <span className="pi-label">{entry.label}</span>
                {entry.hint ? <span className="pi-hint">{entry.hint}</span> : null}
                {entry.kind === 'tool' && entry.onToggleFavorite ? (
                  <button
                    type="button"
                    className={cn('pi-fav', entry.favorite && 'pi-fav-on')}
                    aria-label={entry.favorite ? 'Remove from favorites' : 'Add to favorites'}
                    title="Toggle favorite"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      entry.onToggleFavorite?.();
                    }}
                  >
                    <Icon name="star" size={16} className={cn(entry.favorite && 'icon-star-filled')} />
                  </button>
                ) : null}
              </div>
            ))
          )}
        </div>
        <div className="palette-footer">
          <span>
            <Kbd>↑</Kbd> <Kbd>↓</Kbd> to navigate
          </span>
          <span>
            <Kbd>↵</Kbd> to open
          </span>
        </div>
      </div>
    </div>
  );
}
