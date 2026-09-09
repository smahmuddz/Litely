import { Link } from 'react-router-dom';
import { usePageMeta } from '../lib/head';
import { useApp } from '../lib/app';
import { TOOLS } from '../lib/registry';
import { ToolCard } from '../components/ToolCard';
import { Icon } from '../components/icons';
import { Button } from '../components/ui';
import type { CategoryId } from '../lib/types';

export function FavoritesPage() {
  usePageMeta({
    title: 'Favorite tools  -  Litely',
    description: 'Your favorite Litely utilities, saved locally on this device.',
    canonicalPath: '/favorites'
  });
  const { favorites, clearRecent } = useApp();
  const defs = TOOLS.filter((t) => favorites.includes(t.id));

  return (
    <div className="container page">
      <div className="page-head">
        <h1 className="page-title">Favorite tools</h1>
        <p className="page-sub">
          Tools you have starred. This list is stored only on your device.
        </p>
      </div>
      {defs.length === 0 ? (
        <div className="empty-state" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16 }}>
          <div className="empty-icon">
            <Icon name="star" size={26} />
          </div>
          <h3 className="empty-title">No favorites yet</h3>
          <p className="empty-text">
            Open any tool and press the star on its card to pin it here. Favorites never sync
            anywhere.
          </p>
          <div className="empty-actions">
            <Link to="/" className="btn btn-primary">
              Browse tools
            </Link>
          </div>
        </div>
      ) : (
        <div className="tool-grid" style={{ marginTop: 4 }}>
          {defs.map((t) => (
            <ToolCard key={t.id} def={t} />
          ))}
        </div>
      )}
    </div>
  );
}
