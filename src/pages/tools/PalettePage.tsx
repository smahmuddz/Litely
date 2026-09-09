import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import PaletteWorker from '../../workers/palette.worker?worker';
import { ToolHeader, PrivacyPill, ToolSeoBlock, AdSlot } from '../../components/sections';
import { Dropzone, useImagePaste } from '../../components/files';
import { Icon } from '../../components/icons';
import {
  Button,
  ColorInput,
  Field,
  Notice,
  NumberInput,
  Segmented,
  TextInput,
  cn,
  CopyButton
} from '../../components/ui';
import { useApp, useObjectUrl } from '../../lib/app';
import { TOOL_BY_ID } from '../../lib/registry';
import { analyzeColor, hexToRgb, luminance, rgbToHsl, rgbToString, readableOn } from '../../lib/color';
import { extractPalette, type PaletteMode } from '../../lib/palette';
import { downloadBlob, formatBytes, sniffFirstBytes, sniffImageType, uid } from '../../lib/format';
import type { Cluster } from '../../lib/palette';

const COUNT_OPTIONS = [
  { value: 5, label: '5 colors' },
  { value: 6, label: '6 colors' },
  { value: 8, label: '8 colors' },
  { value: 10, label: '10 colors' }
];

interface Role {
  key: string;
  name: string;
  hex: string;
}

const DEFAULT_ROLES: Array<Omit<Role, 'hex'>> = [
  { key: 'background', name: 'Background' },
  { key: 'primary', name: 'Primary' },
  { key: 'secondary', name: 'Secondary' },
  { key: 'accent', name: 'Accent' },
  { key: 'text', name: 'Text' },
  { key: 'card', name: 'Card' }
];

const ROLE_KEYS = DEFAULT_ROLES.map((r) => r.key);

function autoAssign(colors: string[]): Role[] {
  const sorted = [...colors].sort((a, b) => luminance(a) - luminance(b));
  const bySat = [...colors].sort((a, b) => {
    const sa = analyzeColor(a).hsl.s;
    const sb = analyzeColor(b).hsl.s;
    return sb - sa;
  });
  const pick = (i: number, fallback: number) => bySat[i] ?? sorted[fallback] ?? colors[colors.length - 1];
  const map: Record<string, string> = {
    background: sorted[sorted.length - 1] ?? colors[0],
    text: sorted[0] ?? colors[0],
    card: sorted[Math.max(0, sorted.length - 2)] ?? colors[0],
    primary: pick(0, 1),
    secondary: pick(1, 2),
    accent: pick(2, 3)
  };
  return DEFAULT_ROLES.map((r) => ({ ...r, hex: map[r.key] ?? colors[0] }));
}

function exportCss(roles: Role[]): string {
  const lines = roles
    .filter((r) => r.hex)
    .map((r) => `  --color-${slug(r.name)}: ${r.hex};`);
  return `:root {\n${lines.join('\n')}\n}`;
}

function slug(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'color'
  );
}

export function PalettePage() {
  const def = TOOL_BY_ID['color-palette-extractor'];
  const { notify } = useApp();
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<PaletteMode>('dominant');
  const [count, setCount] = useState(5);
  const [customCount, setCustomCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [rolesDirty, setRolesDirty] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const previewUrl = useObjectUrl(file);

  const effectiveCount = customCount ?? count;

  const palette = useMemo(() => clusters.map((c) => {
    const { r, g, b } = c;
    const hex = `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
    return hex;
  }), [clusters]);

  const analyze = useCallback(
    async (f: File, paletteCount: number, paletteMode: PaletteMode) => {
      workerRef.current?.terminate();
      setLoading(true);
      setError(null);
      const worker = new PaletteWorker();
      workerRef.current = worker;
      try {
        const buffer = await f.arrayBuffer();
        const id = 1;
        worker.postMessage({ buffer, name: f.name, mime: f.type, options: { count: paletteCount, mode: paletteMode }, id }, [buffer]);
        const resp = await new Promise<{ clusters: Cluster[] }>((resolve, reject) => {
          worker.onmessage = (e: MessageEvent) => {
            const m = e.data as { type: string; clusters?: Cluster[]; message?: string };
            if (m.type === 'result' && m.clusters) resolve({ clusters: m.clusters });
            else if (m.type === 'error') reject(new Error(m.message ?? 'Analysis failed'));
          };
          worker.onerror = () => reject(new Error('The palette worker crashed.'));
        });
        setClusters(resp.clusters);
        if (resp.clusters.length === 0) setError('No colors found in this image.');
        else if (!rolesDirty) setRoles(autoAssign(resp.clusters.map((c) => {
          return `#${[c.r, c.g, c.b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
        })));
      } catch (e) {
        setClusters([]);
        setError(e instanceof Error ? e.message : 'Could not analyze this image.');
      } finally {
        worker.terminate();
        workerRef.current = null;
        setLoading(false);
      }
    },
    [rolesDirty]
  );

  const acceptFile = useCallback(
    async (list: File[]) => {
      const f = list[0];
      if (!f) return;
      const head = await sniffFirstBytes(f);
      const kind = sniffImageType(head);
      if (!kind) {
        notify('error', 'Not a supported image', 'Drop a JPG, PNG, WebP or AVIF image.');
        return;
      }
      setFile(f);
      setError(null);
      setClusters([]);
      setRoles([]);
      setRolesDirty(false);
    },
    [notify]
  );

  useEffect(() => {
    if (!file) return;
    const t = setTimeout(() => {
      void analyze(file, effectiveCount, mode);
    }, 250);
    return () => clearTimeout(t);
  }, [file, effectiveCount, mode, analyze]);

  useImagePaste(!file, (files) => void acceptFile(files));

  const setRoleHex = (key: string, hex: string) => {
    setRolesDirty(true);
    setRoles((prev) => prev.map((r) => (r.key === key ? { ...r, hex } : r)));
  };

  const setRoleName = (key: string, name: string) => {
    setRolesDirty(true);
    setRoles((prev) => prev.map((r) => (r.key === key ? { ...r, name } : r)));
  };

  const addRole = () => {
    setRolesDirty(true);
    const n = roles.filter((r) => ROLE_KEYS.includes(r.key)).length + 1;
    setRoles((prev) => [
      ...prev,
      { key: `custom${Date.now()}`, name: `Role ${n}`, hex: palette[palette.length - 1] ?? '#888888' }
    ]);
  };

  const removeRole = (key: string) => {
    if (ROLE_KEYS.includes(key)) return; // keep the core roles stable
    setRolesDirty(true);
    setRoles((prev) => prev.filter((r) => r.key !== key));
  };

  const copyPaletteHex = () => navigator.clipboard.writeText(palette.join('\n'));

  const exportJson = () => {
    const data = {
      source: file?.name ?? 'unknown',
      mode,
      palette,
      roles: Object.fromEntries(roles.map((r) => [r.name, r.hex]))
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    downloadBlob(blob, 'litely-palette.json');
  };

  const exportPalettePng = async () => {
    const w = 900;
    const h = palette.length * 60 + 30;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.font = '14px ui-monospace, monospace';
    palette.forEach((hex, i) => {
      ctx.fillStyle = hex;
      ctx.fillRect(0, i * 60, w, 48);
      const text = hex.toUpperCase();
      ctx.fillStyle = readableOn(hex);
      ctx.font = '600 16px ui-monospace, monospace';
      ctx.fillText(text, 14, i * 60 + 30);
    });
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('export failed'))), 'image/png')
    );
    downloadBlob(blob, 'litely-palette.png');
  };

  const copyCss = () => navigator.clipboard.writeText(exportCss(roles));

  const hueCoverage = useMemo(() => {
    if (!clusters.length) return 0;
    const buckets = new Set<number>();
    for (const c of clusters) {
      buckets.add(Math.floor(analyzeColor(`#${[c.r, c.g, c.b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`).hsl.h / 30));
    }
    return buckets.size;
  }, [clusters]);

  const addColorToPalette = (hex: string) => {
    setClusters((prev) => {
      const lower = hex.toLowerCase();
      if (prev.some((c) => `#${[c.r, c.g, c.b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`.toLowerCase() === lower)) {
        notify('info', 'Already in palette', `${hex.toUpperCase()} is already listed.`);
        return prev;
      }
      const { r, g, b } = hexToRgb(hex);
      const { s, l } = rgbToHsl(hexToRgb(hex));
      return [...prev, { r, g, b, pop: 1, sat: s, light: l }];
    });
    notify('success', `Added ${hex.toUpperCase()} to the palette`);
  };

  const pickPixel = async (hex: string) => {
    try {
      await navigator.clipboard.writeText(hex);
      notify('success', `${hex.toUpperCase()} copied`, 'Pixel colour is on your clipboard.');
    } catch {
      notify('error', "Couldn't copy", 'Browser blocked clipboard access.');
    }
  };

  return (
    <div className="container tool-page">
      <ToolHeader def={def}>
        <PrivacyPill />
      </ToolHeader>
      <div className="workspace">
        {!file ? (
          <Dropzone
            onFiles={(fs) => void acceptFile(fs)}
            accept="image/*"
            multiple={false}
            formats={['JPG', 'PNG', 'WebP', 'AVIF']}
            icon="image"
            title="Drop an image to extract its palette"
            hint="Paste a copied image anywhere with Ctrl/⌘+V."
          />
        ) : (
          <>
            <div className="panel palette-file">
              {previewUrl ? <img className="palette-file-img" src={previewUrl} alt="Source image for palette extraction" /> : null}
              <div className="palette-file-info">
                <div className="palette-file-name" title={file.name}>
                  {file.name}
                </div>
                <div className="muted small mono">{formatBytes(file.size)}</div>
                <div className="row" style={{ gap: 8, marginTop: 10 }}>
                  <Button variant="secondary" size="sm" icon="upload" onClick={() => document.getElementById('palette-replace')?.click()}>
                    Replace
                  </Button>
                  <Button variant="ghost" size="sm" icon="trash" onClick={() => setFile(null)}>
                    Remove
                  </Button>
                  <input
                    id="palette-replace"
                    type="file"
                    accept="image/*"
                    className="visually-hidden"
                    onChange={(e) => {
                      if (e.target.files) void acceptFile(Array.from(e.target.files));
                      e.target.value = '';
                    }}
                  />
                </div>
              </div>
            </div>

            <ImageDropper file={file} onPicked={(hex) => void pickPixel(hex)} onAdd={addColorToPalette} />

            <div className="palette-opts panel">
              <Segmented
                label="Colour mood"
                options={[
                  { value: 'dominant', label: 'Most common' },
                  { value: 'vibrant', label: 'Vibrant' },
                  { value: 'muted', label: 'Calmer' },
                  { value: 'balanced', label: 'Balanced' }
                ]}
                value={mode}
                onChange={setMode}
              />
              <div className="palette-count-row">
                <Segmented
                  label="How many colours?"
                  options={COUNT_OPTIONS.map((c) => ({ value: String(c.value), label: c.label }))}
                  value={customCount ? `custom` : String(count)}
                  onChange={(v) => {
                    if (v === 'custom') setCustomCount(count);
                    else {
                      setCustomCount(null);
                      setCount(Number(v));
                    }
                  }}
                />
                <span className="seg-custom">
                  {customCount !== null ? (
                    <Field label="Custom count">
                      <NumberInput min={2} max={12} value={customCount} onChange={(e) => setCustomCount(Math.min(12, Math.max(2, Number(e.target.value) || 5)))} />
                    </Field>
                  ) : null}
                  <button type="button" className={cn('chip', customCount !== null && 'chip-active')} onClick={() => setCustomCount(customCount === null ? 7 : null)}>
                    Custom
                  </button>
                </span>
              </div>
              <p className="small muted" style={{ margin: 0 }}>
                Every colour is looked at and similar shades are grouped. Different "moods" simply
                change which shades get priority. {hueCoverage}/12 different colour families were
                found in this image.
              </p>
            </div>

            {error ? (
              <Notice tone="error" title="We couldn't analyze this image" action={<Button variant="secondary" size="sm" onClick={() => setFile(null)}>Choose another image</Button>}>
                {error}
              </Notice>
            ) : null}

            {loading ? (
              <div className="palette-loading panel">
                <span className="spinner" />
                <span className="small muted">Clustering {file.name}…</span>
              </div>
            ) : null}

            {palette.length > 0 ? (
              <>
                <div className="panel palette-strip-panel">
                  <div className="palette-strip" role="img" aria-label={`Palette: ${palette.join(', ')}`}>
                    {palette.map((hex) => (
                      <button
                        key={hex}
                        type="button"
                        className="palette-swatch"
                        style={{ background: hex }}
                        aria-label={`Copy ${hex}`}
                        onClick={() => {
                          void navigator.clipboard.writeText(hex);
                          notify('success', `${hex.toUpperCase()} copied`);
                        }}
                      />
                    ))}
                  </div>
                  <div className="palette-strip-actions">
                    <Button variant="secondary" size="sm" icon="copy" onClick={() => { void copyPaletteHex(); notify('success', 'Palette copied', `${palette.length} hex colors`); }}>
                      Copy HEX list
                    </Button>
                    <Button variant="ghost" size="sm" icon="refresh" onClick={() => void analyze(file, effectiveCount, mode)}>
                      Re-analyze
                    </Button>
                  </div>
                </div>

                <div className="color-grid">
                  {palette.map((hex) => (
                    <ColorCard key={hex} hex={hex} />
                  ))}
                </div>

                <div className="panel roles-panel">
                  <div className="panel-title">
                    <Icon name="palette" size={16} /> Palette editor
                  </div>
                  <p className="small muted" style={{ marginTop: 0 }}>
                    Assign extracted colors to roles. These are only suggestions  -  change any color or name.
                  </p>
                  <div className="roles-list">
                    {roles.map((role) => (
                      <div className="role-row" key={role.key}>
                        <span className="role-swatch" style={{ background: role.hex || '#ccc' }} aria-hidden />
                        <TextInput value={role.name} className="role-name" aria-label={`Name for ${role.hex}`} onChange={(e) => setRoleName(role.key, e.target.value)} />
                        <span className="select-wrap role-pick" style={{ display: 'inline-block' }}>
                          <select
                            value={role.hex}
                            aria-label={`Color for ${role.name}`}
                            className="input select"
                            onChange={(e) => setRoleHex(role.key, e.target.value)}
                          >
                            {palette.map((p) => (
                              <option key={p} value={p}>
                                {p.toUpperCase()}
                              </option>
                            ))}
                            <option value={role.hex}>Custom…</option>
                          </select>
                          <Icon name="chevronDown" size={16} className="select-caret" />
                        </span>
                        <ColorInput value={role.hex || '#888888'} onChange={(v) => setRoleHex(role.key, v)} aria-label={`Custom color for ${role.name}`} />
                        {!ROLE_KEYS.includes(role.key) ? (
                          <Button variant="ghost" size="sm" icon="trash" aria-label={`Delete role ${role.name}`} onClick={() => removeRole(role.key)} />
                        ) : null}
                      </div>
                    ))}
                  </div>
                  <Button variant="ghost" size="sm" icon="plus" onClick={addRole}>
                    Add role
                  </Button>
                </div>

                <div className="panel preview-panel">
                  <div className="panel-title">
                    <Icon name="eye" size={16} /> Usage preview
                  </div>
                  <PaletteUsage roles={roles} notify={(t) => notify(t.type, t.title, t.message)} />
                  <p className="small muted" style={{ margin: '10px 0 0' }}>
                    This is a rough suggestion  -  colors rarely map perfectly to real UI roles.
                  </p>
                </div>

                <div className="panel export-panel">
                  <div className="panel-title">
                    <Icon name="download" size={16} /> Export palette
                  </div>
                  <div className="export-actions">
                    <CopyButton text={palette.join('\n')} label="Copy HEX list" />
                    <CopyButton text={exportCss(roles)} label="Copy CSS variables" onCopy={() => notify('success', 'CSS variables copied')} />
                    <CopyButton text={JSON.stringify({ palette, roles: Object.fromEntries(roles.map((r) => [r.name, r.hex])) }, null, 2)} label="Copy JSON" onCopy={() => notify('success', 'JSON copied')} />
                    <Button variant="secondary" size="sm" icon="download" onClick={exportJson}>
                      Download JSON
                    </Button>
                    <Button variant="secondary" size="sm" icon="download" onClick={() => void exportPalettePng()}>
                      Download palette image
                    </Button>
                  </div>
                  <details className="css-details">
                    <summary>Preview CSS export</summary>
                    <pre className="css-pre mono">{exportCss(roles)}</pre>
                  </details>
                </div>
              </>
            ) : null}
          </>
        )}
      </div>
      <AdSlot position="palette-tool" style={{ marginTop: 18 }} />
      <ToolSeoBlock def={def} />
    </div>
  );
}

function PaletteUsage({ roles, notify }: { roles: Role[]; notify: (n: { type: 'info' | 'success' | 'error'; title: string; message?: string }) => void }) {
  const get = (key: string) => roles.find((r) => r.key === key)?.hex ?? '#777777';
  const style = {
    background: get('background'),
    color: get('text'),
    '--mock-primary': get('primary'),
    '--mock-accent': get('accent'),
    '--mock-card': get('card'),
    '--mock-secondary': get('secondary'),
    '--mock-text': get('text')
  } as CSSProperties;
  return (
    <div className="usage-mock" style={style}>
      <div className="mock-card">
        <span className="mock-chip" style={{ background: 'var(--mock-accent)' }} />
        <h4 style={{ margin: '10px 0 4px', color: 'var(--mock-primary)' }}>Litely preview</h4>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--mock-text)' }}>
          A sample card using your palette.
        </p>
        <button
          type="button"
          className="mock-btn"
          style={{ background: 'var(--mock-primary)', color: 'var(--mock-card)' }}
          onClick={() => notify({ type: 'info', title: 'Just a preview', message: 'Colors are extracted from your image.' })}
        >
          Primary action
        </button>
      </div>
    </div>
  );
}

function hexOf(r: number, g: number, b: number): string {
  const to = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

/**
 * Interactive eyedropper: hover/click the preview to read the exact colour
 * of any original pixel (sampled straight from the decoded ImageBitmap).
 */
function ImageDropper({
  file,
  onPicked,
  onAdd
}: {
  file: File;
  onPicked: (hex: string) => void;
  onAdd: (hex: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const bitmapRef = useRef<ImageBitmap | null>(null);
  const dimsRef = useRef({ w: 0, h: 0 });
  const draggingRef = useRef(false);
  const [active, setActive] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [hex, setHex] = useState<string | null>(null);
  const [pt, setPt] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    let alive = true;
    setReady(false);
    setFailed(false);
    setHex(null);
    setPt(null);
    setActive(false);
    bitmapRef.current?.close();
    bitmapRef.current = null;
    void (async () => {
      let bmp: ImageBitmap | null = null;
      try {
        bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
      } catch {
        if (alive) setFailed(true);
        return;
      }
      if (!alive) {
        bmp.close();
        return;
      }
      bitmapRef.current = bmp;
      dimsRef.current = { w: bmp.width, h: bmp.height };
      if (alive) setReady(true);
    })();
    return () => {
      alive = false;
      bitmapRef.current?.close();
      bitmapRef.current = null;
    };
  }, [file]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const bmp = bitmapRef.current;
    if (!active || !canvas || !bmp) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { w, h } = dimsRef.current;
    const MAX_PREVIEW = 1400;
    const scale = Math.min(1, MAX_PREVIEW / Math.max(w, h));
    canvas.width = Math.max(1, Math.round(w * scale));
    canvas.height = Math.max(1, Math.round(h * scale));
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  }, [ready, active, file]);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActive(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active]);

  const sample = (clientX: number, clientY: number): string | null => {
    const canvas = canvasRef.current;
    const bmp = bitmapRef.current;
    if (!canvas || !bmp) return null;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    const { w, h } = dimsRef.current;
    const sx = Math.min(w - 1, Math.max(0, Math.floor(((clientX - rect.left) / rect.width) * w)));
    const sy = Math.min(h - 1, Math.max(0, Math.floor(((clientY - rect.top) / rect.height) * h)));
    const probe = document.createElement('canvas');
    probe.width = 1;
    probe.height = 1;
    const pctx = probe.getContext('2d', { willReadFrequently: true });
    if (!pctx) return null;
    pctx.drawImage(bmp, sx, sy, 1, 1, 0, 0, 1, 1);
    const d = pctx.getImageData(0, 0, 1, 1).data;
    const value = hexOf(d[0], d[1], d[2]);
    setHex(value);
    setPt({ x: sx, y: sy });
    return value;
  };

  if (!file) return null;

  return (
    <div className={cn('panel drop-panel', active && 'drop-panel-active')}>
      <div className="drop-toolbar">
        <div className="drop-toolbar-copy">
          <div className="panel-title" style={{ margin: 0 }}>
            <Icon name="eyedropper" size={16} /> Pixel picker
          </div>
          <p className="small muted" style={{ margin: '2px 0 0' }}>
            Click or drag over the image to read the exact colour of any pixel and copy it.
          </p>
        </div>
        <Button
          variant={active ? 'primary' : 'secondary'}
          size="sm"
          icon="eyedropper"
          aria-pressed={active}
          onClick={() => {
            if (!ready || failed) return;
            setActive((v) => !v);
          }}
          disabled={!ready || failed}
        >
          {active ? 'Dropper on  -  click a pixel' : 'Pick a colour'}
        </Button>
      </div>

      <div className={cn('drop-canvas-wrap', !active && 'drop-canvas-idle')}>
        {ready ? (
          <canvas
            ref={canvasRef}
            className={cn('drop-canvas', active && 'drop-canvas-active')}
            width={1}
            height={1}
            style={{ maxHeight: '420px' }}
            aria-label="Image preview  -  pick a pixel colour"
            onPointerDown={(e) => {
              if (!active) return;
              e.preventDefault();
              draggingRef.current = true;
              e.currentTarget.setPointerCapture(e.pointerId);
              sample(e.clientX, e.clientY);
            }}
            onPointerMove={(e) => {
              if (!active) return;
              sample(e.clientX, e.clientY);
            }}
            onPointerUp={(e) => {
              if (!active) return;
              const value = sample(e.clientX, e.clientY);
              draggingRef.current = false;
              try {
                e.currentTarget.releasePointerCapture(e.pointerId);
              } catch {
                /* no capture */
              }
              if (value) onPicked(value);
            }}
            onPointerLeave={() => {
              if (!draggingRef.current) {
                setPt(null);
                setHex(null);
              }
            }}
          />
        ) : failed ? (
          <div className="drop-failed small muted">This image can't be opened for pixel picking.</div>
        ) : (
          <div className="drop-loading">
            <span className="spinner" style={{ width: 16, height: 16 }} aria-hidden />
            <span className="small muted">Preparing image…</span>
          </div>
        )}
        {active && ready ? (
          <span className="drop-hint">
            <Icon name="info" size={13} /> Hover to inspect · click / release to copy · Esc to stop
          </span>
        ) : null}
        {!active && ready ? (
          <button type="button" className="drop-overlay" onClick={() => setActive(true)}>
            <Icon name="eyedropper" size={16} /> Enable the dropper to sample pixels
          </button>
        ) : null}
      </div>

      {hex ? (
        <div className="drop-readout">
          <span className="drop-swatch" style={{ background: hex }} aria-hidden />
          <code className="drop-hex mono">{hex.toUpperCase()}</code>
          {pt ? (
            <span className="drop-pos mono muted small">
              x {pt.x} · y {pt.y}
            </span>
          ) : null}
          <span className="drop-actions">
            <CopyButton text={hex} label="Copy again" />
            <Button variant="ghost" size="sm" icon="plus" onClick={() => onAdd(hex)}>
              Add to palette
            </Button>
          </span>
        </div>
      ) : null}
    </div>
  );
}


function ColorCard({ hex }: { hex: string }) {
  const { notify } = useApp();
  const info = analyzeColor(hex);
  const textOn = readableOn(hex);
  return (
    <div className="color-card" style={{ background: hex, color: textOn }}>
      <div className="color-card-top">
        <button type="button" className="color-copy" onClick={() => { void navigator.clipboard.writeText(hex); notify('success', `${hex.toUpperCase()} copied`); }}>
          <Icon name="copy" size={14} /> {hex.toUpperCase()}
        </button>
      </div>
      <div className="color-card-meta">
        <div className="mono small">{rgbToString(info.rgb)}</div>
        <div className="mono small">
          hsl({Math.round(info.hsl.h)}, {Math.round(info.hsl.s)}%, {Math.round(info.hsl.l)}%)
        </div>
        <div className="mono small">
          hsv({Math.round(info.hsv.h)}, {Math.round(info.hsv.s)}%, {Math.round(info.hsv.v)}%)
        </div>
        <div className="contrast-row small mono">
          <span>
            <span className="cw" /> {info.contrastWhite.toFixed(2)}:1 vs white
          </span>
          <span>
            <span className="ck" /> {info.contrastBlack.toFixed(2)}:1 vs black
          </span>
        </div>
      </div>
    </div>
  );
}
