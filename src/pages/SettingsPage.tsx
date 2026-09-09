import { usePageMeta } from '../lib/head';
import { useApp } from '../lib/app';
import { Segmented, Switch, Notice } from '../components/ui';
import { Icon } from '../components/icons';
import type { ThemePref } from '../lib/types';

const THEME_OPTIONS: Array<{ value: ThemePref; label: string }> = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' }
];

export function SettingsPage() {
  usePageMeta({
    title: 'Settings  -  Litely',
    description: 'Appearance, behavior and privacy settings for Litely.',
    canonicalPath: '/settings'
  });
  const { settings, setTheme, updateSettings } = useApp();

  return (
    <div className="container page page-narrow">
      <div className="page-head">
        <h1 className="page-title">Settings</h1>
        <p className="page-sub">Preferences are stored locally on this device only.</p>
      </div>

      <section className="settings-card" aria-labelledby="appearance-h">
        <h2 className="settings-title" id="appearance-h">
          <Icon name="monitor" size={18} /> Appearance
        </h2>
        <div className="settings-row">
          <div>
            <div className="settings-label">Theme</div>
            <div className="settings-desc">Choose light, dark or follow your system.</div>
          </div>
          <Segmented
            value={settings.theme}
            onChange={setTheme}
            options={THEME_OPTIONS}
            label="Theme"
          />
        </div>
      </section>

      <section className="settings-card" aria-labelledby="behavior-h">
        <h2 className="settings-title" id="behavior-h">
          <Icon name="zap" size={18} /> Behavior
        </h2>
        <div className="settings-list">
          <Switch
            checked={settings.confirmClear}
            onChange={(v) => updateSettings({ confirmClear: v })}
            label="Confirm before clearing files"
            description="Ask before removing every file from a workspace."
          />
          <Switch
            checked={settings.autoDownload}
            onChange={(v) => updateSettings({ autoDownload: v })}
            label="Automatically download results"
            description="Start the download as soon as a result is ready."
          />
          <Switch
            checked={settings.rememberFavorites}
            onChange={(v) => updateSettings({ rememberFavorites: v })}
            label="Remember favorite tools"
            description="Keep your starred tools across visits."
          />
        </div>
      </section>

      <section className="settings-card" aria-labelledby="privacy-h">
        <h2 className="settings-title" id="privacy-h">
          <Icon name="shield" size={18} /> Privacy
        </h2>
        <div className="settings-text">
          <p>
            <strong>Browser processing.</strong> Every tool in Litely runs inside your browser.
            Files are decoded and processed locally on your device.
          </p>
          <p>
            <strong>Stored locally.</strong> Only lightweight preferences are saved with{' '}
            <code>localStorage</code>: theme choice, favorite tools and recently opened tools. No
            files or generated content is ever written to disk.
          </p>
          <p>
            <strong>Never uploaded.</strong> File names and contents are not sent anywhere. If a
            future feature requires an external service, it will say so explicitly and ask first.
          </p>
        </div>
        <Notice tone="privacy" title="Local-first by design">
          You can close this tab at any time and all processing data disappears with it.
        </Notice>
      </section>
    </div>
  );
}
