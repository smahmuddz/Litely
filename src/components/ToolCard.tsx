import { Link } from 'react-router-dom';
import type { ToolDef } from '../lib/types';
import { CATEGORY_META } from '../lib/registry';
import { useApp } from '../lib/app';
import { Icon } from './icons';
import { cn } from './ui';

export function ToolCard({ def, size }: { def: ToolDef; size?: 'sm' }) {
  const { isFavorite, toggleFavorite } = useApp();
  const fav = isFavorite(def.id);
  return (
    <div className={cn('tool-card-wrap', size === 'sm' && 'tool-card-wrap-sm')}>
      <Link to={`/tools/${def.slug}`} className="tool-card" aria-label={`Open ${def.name}`}>
        <div className="tc-top">
          <span className={cn('tc-icon', `cat-${def.category}`)}>
            <Icon name={def.icon} size={21} />
          </span>
        </div>
        <h3 className="tc-name">{def.name}</h3>
        <p className="tc-desc">{def.tagline}</p>
        <div className="tc-tags">
          {def.tags.map((t) => (
            <span className="tag" key={t}>
              {t}
            </span>
          ))}
        </div>
        <div className="tc-foot">
          <span className="tc-cat">{CATEGORY_META[def.category].label}</span>
          <span className="btn btn-secondary btn-sm tc-open">
            Open <Icon name="arrowRight" size={14} />
          </span>
        </div>
      </Link>
      <button
        type="button"
        className={cn('fav-float', fav && 'fav-float-on')}
        aria-label={fav ? `Remove ${def.name} from favorites` : `Add ${def.name} to favorites`}
        aria-pressed={fav}
        title={fav ? 'Remove from favorites' : 'Add to favorites'}
        onClick={() => toggleFavorite(def.id)}
      >
        <Icon name="star" size={18} className={cn(fav && 'icon-star-filled')} />
      </button>
    </div>
  );
}
