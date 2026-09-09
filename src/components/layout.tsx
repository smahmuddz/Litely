import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Icon } from './icons';
import { CommandPalette } from './CommandPalette';
import { useApp } from '../lib/app';
import { Button, IconBtn, Kbd, cn } from './ui';
import { TOOLS } from '../lib/registry';
import type { ResolvedTheme } from '../lib/types';

function ThemeToggle() {
  const { settings, resolvedTheme, setTheme } = useApp();
  const next = resolvedTheme === 'dark' ? 'light' : 'dark';
  const target: ResolvedTheme = settings.theme === 'system' ? next : next;
  const icon = target === 'dark' ? 'moon' : 'sun';
  return (
    <IconBtn
      icon={icon}
      label={`Switch to ${target} theme (currently ${resolvedTheme})`}
      onClick={() => setTheme(target)}
    />
  );
}

export function AppShell() {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();
  const { toasts, dismissToast } = useApp();

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      } else if (e.key === 'Escape') {
        setDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    document.body.classList.toggle('drawer-open', drawerOpen);
  }, [drawerOpen]);

  const headerClass = cn('site-header', location.pathname !== '/' && 'site-header-inner');

  return (
    <div className="app">
      <header className={headerClass}>
        <div className="header-inner">
          <div className="header-left">
            <Link to="/" className="brand" aria-label="Litely home">
              <span className="brand-logo">
                <Icon name="logo" size={26} />
              </span>
              <span className="brand-name">Litely</span>
            </Link>
            <nav className="nav-desktop" aria-label="Primary">
              <NavLink to="/" end className={({ isActive }) => cn('nav-link', isActive && 'nav-link-active')}>
                Tools
              </NavLink>
              <NavLink to="/favorites" className={({ isActive }) => cn('nav-link', isActive && 'nav-link-active')}>
                Favorites
              </NavLink>
            </nav>
          </div>
          <div className="header-right">
            <button
              type="button"
              className="btn btn-ghost btn-sm search-trigger"
              onClick={() => setPaletteOpen(true)}
            >
              <Icon name="search" size={15} />
              <span className="search-label">Search</span>
              <Kbd>Ctrl K</Kbd>
            </button>
            <ThemeToggle />
            <Link to="/settings" className="icon-link desktop-only" aria-label="Settings">
              <Icon name="settings" size={20} />
            </Link>
            <button
              type="button"
              className="icon-btn menu-btn"
              aria-label={drawerOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={drawerOpen}
              onClick={() => setDrawerOpen((v) => !v)}
            >
              <Icon name={drawerOpen ? 'close' : 'menu'} size={22} />
            </button>
          </div>
        </div>
      </header>

      {drawerOpen ? (
        <div
          className="drawer-overlay"
          onClick={(e) => {
            // Close only when tapping the backdrop itself. Closing on
            // pointer-down would unmount the drawer before link clicks land.
            if (e.target === e.currentTarget) setDrawerOpen(false);
          }}
        >
          <div className="drawer" role="dialog" aria-modal="true" aria-label="Menu">
            <div className="drawer-head">
              <span className="brand">
                <span className="brand-logo">
                  <Icon name="logo" size={24} />
                </span>
                <span className="brand-name">Litely</span>
              </span>
              <IconBtn icon="close" label="Close menu" onClick={() => setDrawerOpen(false)} />
            </div>
            <nav className="drawer-nav" aria-label="Mobile">
              <button
                type="button"
                className="drawer-action"
                onClick={() => {
                  setDrawerOpen(false);
                  setPaletteOpen(true);
                }}
              >
                <Icon name="search" size={19} />
                Search tools
                <Kbd>Ctrl K</Kbd>
              </button>
              <div className="drawer-group-label">Pages</div>
              <Link to="/" className="drawer-link">
                <Icon name="grid" size={19} />
                All tools
              </Link>
              <Link to="/favorites" className="drawer-link">
                <Icon name="star" size={19} />
                Favorites
              </Link>
              <Link to="/settings" className="drawer-link">
                <Icon name="settings" size={19} />
                Settings
              </Link>
              <Link to="/privacy" className="drawer-link">
                <Icon name="shield" size={19} />
                Privacy
              </Link>
              <Link to="/about" className="drawer-link">
                <Icon name="info" size={19} />
                About
              </Link>
              <div className="drawer-group-label">Tools</div>
              {TOOLS.map((t) => (
                <Link key={t.id} to={`/tools/${t.slug}`} className="drawer-link drawer-link-tool">
                  <Icon name={t.icon} size={19} />
                  {t.name}
                </Link>
              ))}
            </nav>
            <div className="drawer-foot">
              <ThemeToggle />
            </div>
          </div>
        </div>
      ) : null}

      <main className="site-main" id="main">
        <Outlet />
      </main>

      <SiteFooter />

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />

      <div className="toast-viewport" aria-live="polite" aria-label="Notifications">
        {toasts.map((t) => (
          <div key={t.id} className={cn('toast', `toast-${t.type}`)} role={t.type === 'error' ? 'alert' : 'status'}>
            <span className="toast-body">
              <Icon
                name={t.type === 'error' ? 'alert' : t.type === 'success' ? 'checkCircle' : 'info'}
                size={18}
              />
              <span className="toast-copy">
                <span className="toast-title">{t.title}</span>
                {t.message ? <span className="toast-message">{t.message}</span> : null}
              </span>
            </span>
            <button type="button" className="toast-close" aria-label="Dismiss notification" onClick={() => dismissToast(t.id)}>
              <Icon name="close" size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <span className="brand-logo">
            <Icon name="logo" size={22} />
          </span>
          <p className="footer-tagline">
            Everyday tools, without the hassle. Everything runs locally in your browser.
          </p>
        </div>
        <div className="footer-col">
          <h4>Popular tools</h4>
          <ul>
            <li><Link to="/tools/image-compressor">Image Compressor</Link></li>
            <li><Link to="/tools/pdf-merger">PDF Merger</Link></li>
            <li><Link to="/tools/qr-generator">QR Code Generator</Link></li>
            <li><Link to="/tools/color-palette-extractor">Color Palette Extractor</Link></li>
          </ul>
        </div>
        <div className="footer-col">
          <h4>Product</h4>
          <ul>
            <li><Link to="/tools">All tools</Link></li>
            <li><Link to="/favorites">Favorites</Link></li>
            <li><Link to="/settings">Settings</Link></li>
          </ul>
        </div>
        <div className="footer-col">
          <h4>Company</h4>
          <ul>
            <li><Link to="/privacy">Privacy</Link></li>
            <li><Link to="/about">About</Link></li>
          </ul>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© {new Date().getFullYear()} Litely.</span>
        <span className="footer-privacy">
          <Icon name="lock" size={13} /> No uploads. No accounts. Your files stay on your device.
        </span>
      </div>
    </footer>
  );
}

export function ToolLink({ slug }: { slug: string }) {
  const t = TOOLS.find((x) => x.slug === slug);
  return t ? <Link to={`/tools/${slug}`}>{t.name}</Link> : null;
}
