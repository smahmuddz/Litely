import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from 'react';
import type { ResolvedTheme, Settings, ThemePref, Toast, ToastType } from './types';
import { uid } from './format';

const SETTINGS_KEY = 'litely:settings';
const FAVORITES_KEY = 'litely:favorites';
const RECENT_KEY = 'litely:recent';
const RECENT_LIMIT = 6;

const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  confirmClear: true,
  autoDownload: false,
  rememberFavorites: true
};

interface AppState {
  settings: Settings;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: ThemePref) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  favorites: string[];
  isFavorite: (toolId: string) => boolean;
  toggleFavorite: (toolId: string) => void;
  recent: string[];
  recordRecent: (toolId: string) => void;
  clearRecent: () => void;
  toasts: Toast[];
  notify: (type: ToastType, title: string, message?: string, duration?: number) => void;
  dismissToast: (id: number) => void;
}

const Ctx = createContext<AppState | null>(null);

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return { ...fallback, ...(JSON.parse(raw) as T) };
  } catch {
    return fallback;
  }
}

function loadArray(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function systemPrefersDark(): boolean {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() =>
    loadJson<Settings>(SETTINGS_KEY, DEFAULT_SETTINGS)
  );
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    (settings.theme === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : settings.theme) ===
    'dark'
      ? 'dark'
      : 'light'
  );
  const [favorites, setFavorites] = useState<string[]>(() => loadArray(FAVORITES_KEY));
  const [recent, setRecent] = useState<string[]>(() => loadArray(RECENT_KEY));
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);

  // Apply theme to the document root
  useEffect(() => {
    const theme = settings.theme;
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && systemPrefersDark());
      const resolved: ResolvedTheme = dark ? 'dark' : 'light';
      document.documentElement.dataset.theme = resolved;
      document.documentElement.style.colorScheme = resolved;
      setResolvedTheme(resolved);
    };
    apply();
    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      mq.addEventListener('change', apply);
      return () => mq.removeEventListener('change', apply);
    }
  }, [settings.theme]);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
      } catch {
        /* storage unavailable */
      }
      return next;
    });
  }, []);

  const setTheme = useCallback(
    (theme: ThemePref) => updateSettings({ theme }),
    [updateSettings]
  );

  const toggleFavorite = useCallback(
    (toolId: string) => {
      setFavorites((prev) => {
        const next = prev.includes(toolId)
          ? prev.filter((id) => id !== toolId)
          : [...prev, toolId];
        try {
          localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
        } catch {
          /* ignore */
        }
        return next;
      });
    },
    []
  );

  const isFavorite = useCallback(
    (toolId: string) => favorites.includes(toolId),
    [favorites]
  );

  const recordRecent = useCallback((toolId: string) => {
    setRecent((prev) => {
      const next = [toolId, ...prev.filter((id) => id !== toolId)].slice(0, RECENT_LIMIT);
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const clearRecent = useCallback(() => {
    setRecent([]);
    try {
      localStorage.removeItem(RECENT_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback(
    (type: ToastType, title: string, message?: string, duration = 3800) => {
      const id = ++toastId.current;
      setToasts((prev) => [...prev.slice(-3), { id, type, title, message, duration }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    },
    []
  );

  const value = useMemo<AppState>(
    () => ({
      settings,
      resolvedTheme,
      setTheme,
      updateSettings,
      favorites,
      isFavorite,
      toggleFavorite,
      recent,
      recordRecent,
      clearRecent,
      toasts,
      notify,
      dismissToast
    }),
    [
      settings,
      resolvedTheme,
      setTheme,
      updateSettings,
      favorites,
      isFavorite,
      toggleFavorite,
      recent,
      recordRecent,
      clearRecent,
      toasts,
      notify,
      dismissToast
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}

/** Create an object URL for a blob and revoke it when the component unmounts. */
export function useObjectUrl(blob: Blob | null): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!blob) {
      setUrl(null);
      return;
    }
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  return url;
}

export function nextFileId(): string {
  return uid();
}
