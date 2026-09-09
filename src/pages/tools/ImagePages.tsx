import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import ImageWorker from '../../workers/image.worker?worker';
import { ToolHeader, PrivacyPill, ToolSeoBlock, AdSlot } from '../../components/sections';
import { Dropzone, useImagePaste } from '../../components/files';
import { Icon } from '../../components/icons';
import {
  Button,
  Checkbox,
  Field,
  Modal,
  Notice,
  NumberInput,
  RangeInput,
  Segmented,
  SelectInput,
  Switch,
  TextInput,
  cn,
  ConfirmDialog
} from '../../components/ui';
import { useApp } from '../../lib/app';
import { TOOL_BY_ID } from '../../lib/registry';
import { useObjectUrl } from '../../lib/app';
import { createZip } from '../../lib/zip';
import {
  applySuffix,
  downloadBlob,
  extOf,
  formatBytes,
  formatPercent,
  sniffFirstBytes,
  sniffImageType,
  uid,
  IMAGE_ACCEPT
} from '../../lib/format';
import type {
  ImageSettings,
  ItemResult,
  OutFormat,
  ProcessStatus,
  ResizeSpec
} from '../../lib/types';

type Mode = 'compress' | 'convert';

interface WorkItem {
  id: string;
  file: File;
  sourceFormat?: string;
  status: ProcessStatus;
  error?: string;
  result?: ItemResult;
  selected: boolean;
}

const PRESETS: Array<{ label: string; quality: number }> = [
  { label: 'Max compression', quality: 0.2 },
  { label: 'High compression', quality: 0.45 },
  { label: 'Balanced', quality: 0.7 },
  { label: 'High quality', quality: 0.85 },
  { label: 'Maximum quality', quality: 0.95 }
];

const RESIZE_PRESETS: Array<{ label: string; value: ResizeSpec }> = [
  { label: 'Original', value: { mode: 'original', value: 0, lockAspect: true } },
  { label: 'Max 3840', value: { mode: 'maxWidth', value: 3840, lockAspect: true } },
  { label: 'Max 2560', value: { mode: 'maxWidth', value: 2560, lockAspect: true } },
  { label: 'Max 1920', value: { mode: 'maxWidth', value: 1920, lockAspect: true } },
  { label: 'Max 1280', value: { mode: 'maxWidth', value: 1280, lockAspect: true } },
  { label: 'Max 720', value: { mode: 'maxWidth', value: 720, lockAspect: true } },
  { label: 'Width 1200', value: { mode: 'width', value: 1200, lockAspect: true } },
  { label: 'Max 1080', value: { mode: 'maxWidth', value: 1080, lockAspect: true } }
];

function defaults(mode: Mode): ImageSettings {
  return {
    format: mode === 'compress' ? 'original' : 'webp',
    quality: 0.8,
    resize: { mode: 'original', value: 0, lockAspect: true },
    background: 'white',
    backgroundColor: '#ffffff',
    pngQuantize: false,
    removeMetadata: true,
    suffix: ''
  };
}

function mimeToExt(mime: string): string {
  const m = mime.split('/')[1]?.toLowerCase() ?? '';
  if (m === 'jpeg') return 'jpg';
  if (m === 'avif' || m === 'png' || m === 'webp') return m;
  return m || 'bin';
}

const fmtName = (kind: string | undefined) => (kind ?? '').toUpperCase();

function diffPercent(a: number, b: number): number {
  return (a - b) / a;
}

function ResultImg({ blob }: { blob: Blob }) {
  const url = useObjectUrl(blob);
  return url ? <img src={url} alt="" loading="lazy" /> : null;
}

function OriginalImg({ file }: { file: File }) {
  const url = useObjectUrl(file);
  return url ? <img src={url} alt="" loading="lazy" /> : null;
}

function CompareSlider({ file, result }: { file: File; result: ItemResult }) {
  const [pos, setPos] = useState(0.5);
  const [dragging, setDragging] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const origUrl = useObjectUrl(file);
  const newUrl = useObjectUrl(result.blob);

  const updateFromX = useCallback((clientX: number) => {
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0) return;
    const next = (clientX - rect.left) / rect.width;
    setPos(Math.min(1, Math.max(0, next)));
  }, []);

  const down = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!origUrl) return;
    e.preventDefault();
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    updateFromX(e.clientX);
  };

  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragging) updateFromX(e.clientX);
  };

  const up = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragging) updateFromX(e.clientX);
    setDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* no capture */
    }
  };

  const pct = Math.round(pos * 1000) / 10;

  return (
    <div className="compare">
      <div
        className={cn('compare-track', dragging && 'compare-dragging')}
        ref={trackRef}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={() => setDragging(false)}
      >
        <div className="compare-base">
          {newUrl ? (
            <img src={newUrl} alt="After" draggable={false} onDragStart={(e) => e.preventDefault()} />
          ) : null}
          <span className="compare-chip compare-chip-after">After</span>
        </div>
        {origUrl ? (
          <div className="compare-overlay" style={{ clipPath: `inset(0 ${100 - pos * 100}% 0 0)` }}>
            <img src={origUrl} alt="Before" draggable={false} onDragStart={(e) => e.preventDefault()} />
            <span className="compare-chip compare-chip-before">Before</span>
          </div>
        ) : null}
        <span className="compare-line" style={{ left: `${pos * 100}%` }} aria-hidden>
          <span className="compare-knob">
            <Icon name="arrowLeft" size={12} />
            <Icon name="arrowRight" size={12} />
          </span>
        </span>
        <div
          className="compare-slider"
          role="slider"
          aria-label="Comparison position"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(pos * 100)}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
              e.preventDefault();
              setPos((p) => Math.max(0, p - 0.02));
            } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
              e.preventDefault();
              setPos((p) => Math.min(1, p + 0.02));
            } else if (e.key === 'Home') {
              e.preventDefault();
              setPos(0);
            } else if (e.key === 'End') {
              e.preventDefault();
              setPos(1);
            }
          }}
        />
      </div>
      <div className="compare-stats">
        <div>
          <div className="muted small">Before</div>
          <strong className="mono">{formatBytes(result.originalSize)}</strong>
        </div>
        <Icon name="arrowRight" size={16} className="muted" />
        <div>
          <div className="muted small">After</div>
          <strong className="mono">{formatBytes(result.size)}</strong>
        </div>
        <span className={cn('saved-pill', result.size >= result.originalSize && 'saved-pill-neg')}>
          {result.size < result.originalSize
            ? `${formatPercent(diffPercent(result.originalSize, result.size))} smaller`
            : result.size > result.originalSize
              ? `${formatPercent(-diffPercent(result.originalSize, result.size))} larger`
              : 'Same size'}
        </span>
      </div>
      <div className="small muted" style={{ textAlign: 'center' }}>
        Drag or use the arrow keys at {pct}%
      </div>
    </div>
  );
}

function RowThumbs({ item }: { item: WorkItem }) {
  return (
    <div className="row-thumbs">
      <div className="row-thumb">
        <OriginalImg file={item.file} />
      </div>
      {item.result ? (
        <div className="row-thumb row-thumb-out">
          <ResultImg blob={item.result.blob} />
        </div>
      ) : null}
    </div>
  );
}

export function ImageCompressorPage() {
  return <ImageWorkflowPage mode="compress" />;
}

export function ImageConverterPage() {
  return <ImageWorkflowPage mode="convert" />;
}

function ImageWorkflowPage({ mode }: { mode: Mode }) {
  const def = TOOL_BY_ID[mode === 'compress' ? 'image-compressor' : 'image-converter'];
  const { notify, settings: prefs } = useApp();
  const [items, setItems] = useState<WorkItem[]>([]);
  const [imgSettings, setImgSettings] = useState<ImageSettings>(() => defaults(mode));
  const [processing, setProcessing] = useState(false);
  const [procState, setProcState] = useState({ done: 0, total: 0, current: '' });
  const [zipBusy, setZipBusy] = useState(false);
  const [compareItem, setCompareItem] = useState<WorkItem | null>(null);
  const [confirmLarge, setConfirmLarge] = useState<File[] | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [dragAdd, setDragAdd] = useState<File[] | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const cancelledRef = useRef(false);
  const resolverRef = useRef<((r: { ok: true; result: ItemResult } | { ok: false; message: string; cancelled?: boolean }) => void) | null>(null);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      cancelledRef.current = true;
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  const totalQueued = items.filter((i) => i.status === 'queued' || i.status === 'cancelled').length;
  const doneItems = items.filter((i) => i.status === 'done' && i.result);
  const failedItems = items.filter((i) => i.status === 'error');
  const selectedQueued = items.filter(
    (i) => i.selected && (i.status === 'queued' || i.status === 'cancelled')
  ).length;
  const selectedDone = items.filter((i) => i.selected && i.status === 'done').length;
  const allSelected = items.length > 0 && items.every((i) => i.selected);

  const targetOutExt = useMemo(() => {
    if (imgSettings.format === 'original') return undefined;
    const map: Record<OutFormat, string> = { jpeg: 'jpg', png: 'png', webp: 'webp', avif: 'avif', original: '' };
    return map[imgSettings.format];
  }, [imgSettings.format]);

  const outName = useCallback((base: string, used: Set<string>): string => {
    const proposed = applySuffix(base, imgSettings.suffix, targetOutExt);
    let name = proposed;
    let n = 2;
    while (used.has(name.toLowerCase())) {
      const stem = proposed.slice(0, proposed.lastIndexOf('.')) || proposed;
      const ext = proposed.slice(proposed.lastIndexOf('.') + 1);
      name = `${stem}-${n}.${ext}`;
      n += 1;
    }
    used.add(name.toLowerCase());
    return name;
  }, [imgSettings.suffix, targetOutExt]);

  const addFiles = useCallback(
    async (fileList: File[], force = false) => {
      const accepted: File[] = [];
      const big: File[] = [];
      const dupKeys = new Set(items.map((i) => `${i.file.name}|${i.file.size}|${i.file.lastModified}`));
      for (const file of fileList) {
        if (file.size === 0) {
          notify('error', 'Empty file skipped', `${file.name} is empty.`);
          continue;
        }
        if (items.length + accepted.length >= 200) {
          notify('error', 'Too many files', 'Litely processes up to 200 images per batch.');
          break;
        }
        const key = `${file.name}|${file.size}|${file.lastModified}`;
        if (dupKeys.has(key)) {
          notify('info', 'Duplicate skipped', `${file.name} is already in your list.`);
          continue;
        }
        dupKeys.add(key);
        let kind: string | null = null;
        try {
          const head = await sniffFirstBytes(file);
          kind = sniffImageType(head);
        } catch {
          kind = null;
        }
        if (!kind) {
          notify('error', 'Unsupported file', `${file.name} doesn't look like a JPG, PNG, WebP or AVIF image.`);
          continue;
        }
        if (file.size > 90 * 1024 * 1024 && !force) {
          big.push(file);
          continue;
        }
        accepted.push(file);
      }
      if (big.length) {
        setConfirmLarge(big);
      }
      if (accepted.length) {
        setItems((prev) => [
          ...prev,
          ...accepted.map((f) => ({ id: uid(), file: f, status: 'queued' as ProcessStatus, selected: true }))
        ]);
      }
    },
    [items, notify]
  );

  const removeItems = useCallback((ids: string[]) => {
    setItems((prev) => prev.filter((i) => !ids.includes(i.id)));
  }, []);

  const removeFailedOrSelected = () => removeItems(items.filter((i) => i.selected).map((i) => i.id));

  const setSelected = (ids: string[], value: boolean) => {
    setItems((prev) => prev.map((i) => (ids.includes(i.id) ? { ...i, selected: value } : i)));
  };

  const runWorker = useCallback(
    async (targets: WorkItem[]) => {
      if (processing || targets.length === 0) return;
      const stats = { n: 0, in: 0, out: 0 };
      const worker = new ImageWorker();
      workerRef.current = worker;
      cancelledRef.current = false;
      setProcessing(true);
      setProcState({ done: 0, total: targets.length, current: '' });

      const usedNames = new Set<string>();
      worker.onmessage = (e: MessageEvent) => {
        const msg = e.data as {
          type: string;
          index: number;
          error?: string;
          width?: number;
          height?: number;
          mime?: string;
          origWidth?: number;
          origHeight?: number;
          blob?: Blob;
        };
        const resolve = resolverRef.current;
        resolverRef.current = null;
        if (msg.type === 'result' && msg.blob) {
          const t = targets[msg.index];
          const name = t ? outName(t.file.name, usedNames) : 'output';
          const result: ItemResult = {
            id: uid(),
            blob: msg.blob,
            name,
            mime: msg.mime ?? 'image/octet-stream',
            width: msg.width,
            height: msg.height,
            origWidth: msg.origWidth,
            origHeight: msg.origHeight,
            originalSize: t?.file.size ?? 0,
            size: msg.blob.size
          };
          resolve?.({ ok: true, result });
        } else if (msg.type === 'error') {
          resolve?.({ ok: false, message: msg.error ?? 'Processing failed' });
        }
      };
      worker.onerror = (e: ErrorEvent) => {
        const resolve = resolverRef.current;
        resolverRef.current = null;
        resolve?.({ ok: false, message: e.message || 'The image worker crashed. Try again.' });
      };

      try {
        for (let i = 0; i < targets.length; i += 1) {
          const t = targets[i];
          if (cancelledRef.current) break;
          setItems((prev) => prev.map((it) => (it.id === t.id ? { ...it, status: 'processing', error: undefined } : it)));
          setProcState((s) => ({ ...s, current: t.file.name }));
          const outcome = await new Promise<{ ok: true; result: ItemResult } | { ok: false; message: string }>(
            (resolve) => {
              resolverRef.current = resolve;
              worker.postMessage({ file: t.file, settings: imgSettings, index: i });
            }
          );
          if (cancelledRef.current || !aliveRef.current) break;
          if (outcome.ok) {
            stats.n += 1;
            stats.in += outcome.result.originalSize;
            stats.out += outcome.result.size;
            setItems((prev) =>
              prev.map((it) =>
                it.id === t.id
                  ? { ...it, status: 'done', result: outcome.result }
                  : it
              )
            );
            if (prefs.autoDownload) {
              downloadBlob(outcome.result.blob, outcome.result.name);
            }
          } else {
            setItems((prev) => prev.map((it) => (it.id === t.id ? { ...it, status: 'error', error: outcome.message } : it)));
          }
          setProcState((s) => ({ ...s, done: s.done + 1 }));
        }
      } finally {
        worker.terminate();
        workerRef.current = null;
        setProcessing(false);
        if (!cancelledRef.current && aliveRef.current) {
          setItems((prev) =>
            prev.map((it) =>
              it.status === 'processing' ? { ...it, status: 'queued' } : it
            )
          );
        }
        if (stats.n > 0 && aliveRef.current) {
          const saved = stats.in - stats.out;
          if (mode === 'compress' && saved > 0 && stats.in > 0) {
            notify('success', `${stats.n} ${stats.n === 1 ? 'image' : 'images'} compressed`, `Saved ${formatBytes(saved)} (${formatPercent(saved / stats.in)})`);
          } else {
            notify('success', 'Ready', `${stats.n} ${stats.n === 1 ? 'file' : 'files'} processed.`);
          }
        }
      }
    },
    [processing, imgSettings, outName, notify, prefs.autoDownload, mode]
  );

  const processAll = () => {
    const targets = items.filter((i) => i.status === 'queued' || i.status === 'cancelled');
    void runWorker(targets);
  };

  const processSelected = () => {
    const targets = items.filter(
      (i) => i.selected && (i.status === 'queued' || i.status === 'cancelled')
    );
    if (targets.length === 0) {
      notify('info', 'Nothing selected', 'Select at least one pending file to process.');
      return;
    }
    void runWorker(targets);
  };

  const cancelProcessing = () => {
    cancelledRef.current = true;
    const resolve = resolverRef.current;
    resolverRef.current = null;
    resolve?.({ ok: false, message: 'Cancelled', cancelled: true });
  };

  const downloadOne = (item: WorkItem) => {
    if (!item.result) return;
    downloadBlob(item.result.blob, item.result.name);
    notify('success', 'Download started', item.result.name);
  };

  const zipSelected = async (which: 'selected' | 'all') => {
    const set = which === 'selected' ? doneItems.filter((i) => i.selected) : doneItems;
    const files = set
      .filter((i) => i.result)
      .map((i) => ({ name: i.result!.name, blob: i.result!.blob }));
    if (files.length === 0) {
      notify('info', 'Nothing to download', 'Process some files first.');
      return;
    }
    setZipBusy(true);
    try {
      const zip = await createZip(files, (n, total) =>
        setProcState({ done: n, total, current: 'Zipping…' })
      );
      const label = mode === 'compress' ? 'litely-compressed' : 'litely-converted';
      downloadBlob(zip, `${label}-${files.length}-files.zip`);
      notify('success', `ZIP with ${files.length} files ready`, 'Download started.');
    } catch {
      notify('error', 'ZIP failed', 'The browser could not package these files. Download individually instead.');
    } finally {
      setZipBusy(false);
      setProcState({ done: 0, total: 0, current: '' });
    }
  };

  useImagePaste(!processing && items.length < 100, (files) => void addFiles(files));

  const confirmClearWorkspace = () => {
    if (!items.length) return;
    if (prefs.confirmClear) setConfirmClear(true);
    else clearWorkspace();
  };

  const clearWorkspace = () => {
    setItems([]);
    setCompareItem(null);
  };

  const queuedMeta = useMemo(() => {
    const all = items.filter((i) => i.status === 'queued' || i.status === 'cancelled');
    return { count: all.length, bytes: all.reduce((a, i) => a + i.file.size, 0) };
  }, [items]);

  return (
    <div className="container tool-page">
      <ToolHeader def={def}>
        <PrivacyPill />
      </ToolHeader>
      <div className="workspace">
        {items.length === 0 ? (
          <div className="workspace-stage">
            <Dropzone
              onFiles={(f) => void addFiles(f)}
              accept={IMAGE_ACCEPT}
              multiple
              formats={['JPG', 'PNG', 'WebP', 'AVIF']}
              icon="image"
              title={mode === 'compress' ? 'Add the photos you want to shrink' : 'Add the images you want to convert'}
              hint="Drag & drop, tap to choose files, or paste a screenshot with Ctrl/⌘+V."
            />
          </div>
        ) : (
          <>
            <SettingsPanel mode={mode} settings={imgSettings} onChange={setImgSettings} />

            <div className="queue-head">
              <div className="queue-title">
                <Icon name="image" size={17} />
                <strong>{items.length} {items.length === 1 ? 'file' : 'files'}</strong>
                <span className="muted small">· {formatBytes(items.reduce((a, i) => a + i.file.size, 0))} total</span>
              </div>
              <div className="queue-tools">
                <label className="btn btn-secondary btn-sm" role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && document.getElementById('img-more')?.click()}>
                  <Icon name="plus" size={15} /> Add more
                  <input
                    id="img-more"
                    type="file"
                    accept={IMAGE_ACCEPT}
                    multiple
                    className="visually-hidden"
                    onChange={(e) => {
                      if (e.target.files) void addFiles(Array.from(e.target.files));
                      e.target.value = '';
                    }}
                  />
                </label>
                <Checkbox
                  checked={allSelected}
                  onChange={(v) => setSelected(items.map((i) => i.id), v)}
                  label={allSelected ? 'Deselect all' : 'Select all'}
                />
                <Button variant="ghost" size="sm" onClick={confirmClearWorkspace} disabled={processing} icon="trash">
                  Clear
                </Button>
              </div>
            </div>

            <div className="file-list">
              {items.map((item) => (
                <ImageRow
                  key={item.id}
                  item={item}
                  processing={processing}
                  onToggleSelected={() => setSelected([item.id], !item.selected)}
                  onRemove={() => removeItems([item.id])}
                  onDownload={() => downloadOne(item)}
                  onCompare={() => item.result && setCompareItem(item)}
                  onRetry={() => item.status === 'error' && void runWorker([{ ...item, status: 'queued', error: undefined }])}
                />
              ))}
            </div>

            <div className="queue-foot">
              <div className="queue-foot-actions">
                {processing ? (
                  <Button variant="danger-ghost" size="sm" icon="close" onClick={cancelProcessing}>
                    Cancel
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={processing || selectedDone === 0}
                      loading={zipBusy}
                      icon="download"
                      onClick={() => void zipSelected('selected')}
                    >
                      {selectedDone
                        ? `Save these ${selectedDone} as one file (.zip)`
                        : 'Tick some results to save them'}
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={processing || doneItems.length === 0}
                      loading={zipBusy}
                      icon="download"
                      onClick={() => void zipSelected('all')}
                    >
                      Save everything (.zip, {doneItems.length})
                    </Button>
                  </>
                )}
              </div>
              {processing ? (
                <span className="small muted mono queue-status" aria-live="polite">
                  {mode === 'compress' ? 'Shrinking' : 'Converting'} {procState.done + 1} of {procState.total} · {procState.current}
                </span>
              ) : (
                <Button
                  variant="primary"
                  size="lg"
                  disabled={totalQueued === 0}
                  onClick={processAll}
                  icon={mode === 'compress' ? 'compress' : 'convert'}
                >
                  {selectedQueued > 0 && selectedQueued < totalQueued
                    ? mode === 'compress'
                      ? `Compress the ${selectedQueued} files you ticked`
                      : `Convert the ${selectedQueued} files you ticked`
                    : totalQueued > 0
                      ? mode === 'compress'
                        ? `Compress ${totalQueued} ${totalQueued === 1 ? 'photo' : 'photos'}`
                        : `Convert ${totalQueued} ${totalQueued === 1 ? 'image' : 'images'}`
                      : mode === 'compress'
                        ? 'Ready  -  add more photos'
                        : 'Ready  -  add more images'}
                </Button>
              )}
            </div>
            {failedItems.length > 0 ? (
              <Notice tone="warning" title="A couple of files didn't make it">
                Check the red rows  -  those files may be damaged or in a format we can't read.
              </Notice>
            ) : null}
          </>
        )}
      </div>
      <AdSlot position="image-tool" style={{ marginTop: 22 }} />
      <ToolSeoBlock def={def} />

      <ConfirmDialog
        open={confirmClear}
        title="Clear the workspace?"
        body={
          <span>
            This will remove <strong>{items.length} files</strong> from the list. Results are only
            lost if you haven't downloaded them yet.
          </span>
        }
        confirmLabel="Clear files"
        onConfirm={clearWorkspace}
        onClose={() => setConfirmClear(false)}
      />
      <ConfirmDialog
        open={confirmLarge !== null}
        title="Large file detected"
        body={
          <span>
            {confirmLarge?.length === 1 ? (
              <span>
                <strong>{confirmLarge?.[0]?.name}</strong> is{' '}
                {formatBytes(confirmLarge?.[0]?.size ?? 0)}. Processing it fully in the browser may
                take a while and use a lot of memory.
              </span>
            ) : (
              <span>
                {confirmLarge?.length} files are larger than 90 MB. Processing them in the browser
                may be slow.
              </span>
            )}
          </span>
        }
        confirmLabel="Continue anyway"
        tone="primary"
        onConfirm={() => {
          if (confirmLarge) void addFiles(confirmLarge, true);
          setConfirmLarge(null);
        }}
        onClose={() => setConfirmLarge(null)}
      />

      {compareItem?.result ? (
        <Modal open onClose={() => setCompareItem(null)} title="Before vs after">
          <CompareSlider file={compareItem.file} result={compareItem.result} />
        </Modal>
      ) : null}
    </div>
  );
}

/* ============================== settings panel ============================== */

function SettingsPanel({
  mode,
  settings,
  onChange
}: {
  mode: Mode;
  settings: ImageSettings;
  onChange: (next: ImageSettings) => void;
}) {
  const set = (patch: Partial<ImageSettings>) => onChange({ ...settings, ...patch });

  const [advancedOpen, setAdvancedOpen] = useState(false);

  const qualityPreset = PRESETS.find((p) => Math.abs(p.quality - settings.quality) < 0.001);

  const matchesResize = (spec: ResizeSpec) => {
    const r = settings.resize;
    return (
      r.mode === spec.mode &&
      r.value === spec.value &&
      (spec.mode === 'custom' ? r.width === spec.width && r.height === spec.height : true)
    );
  };

  const setResizePreset = (spec: ResizeSpec) => {
    set({ resize: { ...spec } });
  };

  const QUICK_SIZES = [
    { label: 'Original size', spec: { mode: 'original' as const, value: 0, lockAspect: true } },
    { label: 'Up to 2560px (4K screen)', spec: { mode: 'maxWidth' as const, value: 2560, lockAspect: true } },
    { label: 'Up to 1920px (Full HD)', spec: { mode: 'maxWidth' as const, value: 1920, lockAspect: true } },
    { label: 'Up to 1280px', spec: { mode: 'maxWidth' as const, value: 1280, lockAspect: true } },
    { label: 'Up to 720px', spec: { mode: 'maxWidth' as const, value: 720, lockAspect: true } },
    { label: 'Set my own size…', custom: true }
  ] as const;

  const quickSizeValue = useMemo(() => {
    if (settings.resize.mode === 'original' || settings.resize.mode === 'maxWidth') {
      const found = QUICK_SIZES.find(
        (q) => !('custom' in q) && q.spec.mode === settings.resize.mode && q.spec.value === settings.resize.value
      );
      if (found) return found.label;
    }
    return 'Set my own size…';
  }, [settings.resize]);

  const onQuickSize = (label: string) => {
    if (label === 'Set my own size…') {
      setResizePreset({
        mode: 'custom',
        value: 0,
        width: settings.resize.width ?? 1080,
        height: settings.resize.height ?? 1080,
        lockAspect: true
      });
      setAdvancedOpen(true);
      return;
    }
    const found = QUICK_SIZES.find((q) => q.label === label);
    if (found && !('custom' in found)) setResizePreset(found.spec);
  };

  const resizeModeOptions = [
    { value: 'original' as const, label: 'Original' },
    { value: 'width' as const, label: 'Width' },
    { value: 'maxWidth' as const, label: 'Max W' },
    { value: 'maxHeight' as const, label: 'Max H' },
    { value: 'percent' as const, label: '%' },
    { value: 'custom' as const, label: 'Custom' }
  ];

  const switchResizeMode = (m: ResizeSpec['mode']) => {
    const defaults: Record<string, ResizeSpec['value']> = {
      width: 1920,
      maxWidth: 1920,
      maxHeight: 1080,
      height: 1080,
      percent: 100
    };
    set({ resize: { ...settings.resize, mode: m, value: defaults[m] ?? 0 } });
  };

  const showBackground = settings.format === 'jpeg';

  const onWidthChange = (w: number) => {
    if (settings.resize.lockAspect && settings.resize.width) {
      const ratio = (settings.resize.height ?? 1) / settings.resize.width;
      set({
        resize: { ...settings.resize, width: w, height: Math.max(1, Math.round(w * ratio)) }
      });
    } else {
      set({ resize: { ...settings.resize, width: w } });
    }
  };

  const onHeightChange = (h: number) => {
    if (settings.resize.lockAspect && settings.resize.height) {
      const ratio = (settings.resize.width ?? 1) / settings.resize.height;
      set({
        resize: { ...settings.resize, height: h, width: Math.max(1, Math.round(h * ratio)) }
      });
    } else {
      set({ resize: { ...settings.resize, height: h } });
    }
  };

  return (
    <div className="panel settings-panel">
      <div className="panel-title">
        <Icon name={mode === 'compress' ? 'compress' : 'convert'} size={16} />
        {mode === 'compress' ? 'Compress your images' : 'Convert your images'}
      </div>
      {mode === 'compress' ? (
        <p className="small muted" style={{ margin: '-6px 0 0' }}>
          The defaults already make files noticeably smaller  -  press the big button and you're
          done.
        </p>
      ) : null}

      <div className="opt-grid">
        <Field label="Save as">
          <SelectInput
            value={settings.format}
            onChange={(e) => set({ format: e.target.value as ImageSettings['format'] })}
            aria-label="Output format"
          >
            {mode === 'compress' ? <option value="original">Same format (keep it simple)</option> : null}
            <option value="jpeg">JPG  -  great for photos</option>
            <option value="png">PNG  -  keeps text & transparency sharp</option>
            <option value="webp">WebP  -  smallest for websites</option>
            <option value="avif">AVIF  -  newest & smallest (needs browser support)</option>
          </SelectInput>
        </Field>

        <Field label="Quality">
          <RangeInput
            value={Math.round(settings.quality * 100)}
            min={1}
            max={100}
            format={(v) => `${v}%`}
            onChange={(v) => set({ quality: v / 100 })}
            label="Quality"
          />
        </Field>
      </div>
      <div className="small muted" style={{ marginTop: -2 }}>
        {settings.format === 'png' && !settings.pngQuantize
          ? 'PNG is saved without any quality loss. Lower quality only reduces size in More options.'
          : 'Higher = better quality but a bigger file. Around 80% is the sweet spot for photos.'}
      </div>

      <div className="opt-block">
        <div className="field-label" style={{ marginBottom: 7 }}>
          Make the file smaller?
        </div>
        <SelectInput value={quickSizeValue} onChange={(e) => onQuickSize(e.target.value)} aria-label="Resize to a smaller size">
          {QUICK_SIZES.map((q) => (
            <option key={q.label} value={q.label}>
              {q.label}
            </option>
          ))}
        </SelectInput>
        <div className="field-hint" style={{ marginTop: 6 }}>
          Big photos are shrunk so they upload and send faster. Nothing is stretched or cropped.
        </div>
      </div>

      <details className="advanced-options" open={advancedOpen}>
        <summary
          onClick={(e) => {
            e.preventDefault();
            setAdvancedOpen((v) => !v);
          }}
        >
          <span className="advanced-summary-label">
            <Icon name="settings" size={15} /> More options
          </span>
          <Icon name="chevronDown" size={15} className="advanced-chev" />
        </summary>
        <div className="advanced-body">

      <div className="opt-block">
        <div className="field-label" style={{ marginBottom: 7 }}>Quality presets</div>
        <div className="chips">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              aria-pressed={qualityPreset?.label === p.label}
              className={cn('chip', qualityPreset?.label === p.label && 'chip-active')}
              onClick={() => set({ quality: p.quality })}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="opt-block">
        <div className="field-label" style={{ marginBottom: 7 }}>Resize</div>
        <Segmented
          options={resizeModeOptions}
          value={settings.resize.mode}
          onChange={switchResizeMode}
          label="Resize mode"
        />
        <div className="resize-controls">
          {(settings.resize.mode === 'width' || settings.resize.mode === 'maxWidth') && (
            <Field label="Target width (px)" className="resize-input">
              <NumberInput
                min={1}
                max={16384}
                value={settings.resize.value || 1920}
                onChange={(e) => set({ resize: { ...settings.resize, value: Number(e.target.value) || 1 } })}
              />
            </Field>
          )}
          {settings.resize.mode === 'height' || settings.resize.mode === 'maxHeight' ? (
            <Field label="Target height (px)" className="resize-input">
              <NumberInput
                min={1}
                max={16384}
                value={settings.resize.value || 1080}
                onChange={(e) => set({ resize: { ...settings.resize, value: Number(e.target.value) || 1 } })}
              />
            </Field>
          ) : null}
          {settings.resize.mode === 'percent' ? (
            <Field label="Scale (%)" className="resize-input">
              <NumberInput
                min={1}
                max={400}
                value={settings.resize.value || 100}
                onChange={(e) => set({ resize: { ...settings.resize, value: Number(e.target.value) || 1 } })}
              />
            </Field>
          ) : null}
          {settings.resize.mode === 'custom' ? (
            <div className="resize-custom">
              <Field label="Width (px)">
                <NumberInput
                  min={1}
                  value={settings.resize.width || 1080}
                  onChange={(e) => onWidthChange(Number(e.target.value) || 1)}
                />
              </Field>
              <span className="resize-x">×</span>
              <Field label="Height (px)">
                <NumberInput
                  min={1}
                  value={settings.resize.height || 1080}
                  onChange={(e) => onHeightChange(Number(e.target.value) || 1)}
                />
              </Field>
            </div>
          ) : null}
          {settings.resize.mode === 'width' ||
          settings.resize.mode === 'height' ||
          settings.resize.mode === 'custom' ? (
            <div className="resize-lock">
              <Switch
                checked={settings.resize.lockAspect}
                onChange={(v) => set({ resize: { ...settings.resize, lockAspect: v } })}
                label="Lock aspect ratio"
              />
              {!settings.resize.lockAspect && settings.resize.mode === 'custom' ? (
                <span className="resize-warn">Unlocked custom sizes may stretch or squash the image.</span>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="chips" style={{ marginTop: 8 }}>
          {RESIZE_PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              aria-pressed={matchesResize(p.value)}
              className={cn('chip', matchesResize(p.value) && 'chip-active')}
              onClick={() => setResizePreset(p.value)}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="resize-note small muted" style={{ marginTop: 6 }}>
          Images are never enlarged by Width / Height presets  -  anything bigger stays at its
          original size.
        </div>
      </div>

      {settings.format === 'png' ? (
        <div className="opt-block">
          <Switch
            checked={settings.pngQuantize}
            onChange={(v) => set({ pngQuantize: v })}
            label="Reduce PNG size with a color palette"
            description="Lossy  -  quantizes the image to a smaller palette. Quality controls how many colors are kept."
          />
        </div>
      ) : null}

      {showBackground ? (
        <div className="opt-block">
          <div className="field-label" style={{ marginBottom: 7 }}>
            Background for transparent pixels
          </div>
          <Segmented
            full
            options={[
              { value: 'white' as const, label: 'White' },
              { value: 'black' as const, label: 'Black' },
              { value: 'custom' as const, label: 'Custom' },
              { value: 'transparent' as const, label: 'Auto' }
            ]}
            value={settings.background}
            onChange={(v) => set({ background: v })}
            label="Background"
          />
          <div className="field-hint" style={{ marginTop: 6 }}>
            PNGs with transparency are flattened onto this color when saved as JPEG. “Auto” uses
            white.
          </div>
          {settings.background === 'custom' ? (
            <div style={{ marginTop: 8 }}>
              <ColorFieldShort
                value={settings.backgroundColor}
                onChange={(v) => set({ backgroundColor: v })}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="opt-block">
        <Switch
          checked={settings.removeMetadata}
          onChange={(v) => set({ removeMetadata: v })}
          label="Remove metadata (EXIF / GPS)"
          description={
            settings.format === 'original' && settings.quality >= 1
              ? 'Off with “Keep original” at 100% quality leaves the original file bytes untouched.'
              : 'Re-encoding removes embedded metadata automatically. Turning this off only helps if you keep the format and use 100% quality.'
          }
        />
      </div>

      {settings.format === 'png' ? (
        <div className="resize-note small muted">
          {settings.pngQuantize
            ? 'PNG output is palette-based at the quality you set  -  good for web, screenshots and flat graphics.'
            : 'PNG output is lossless. The quality slider only affects size when “Reduce PNG size with a color palette” is on.'}
        </div>
      ) : null}

      <div className="opt-block">
        <Field label="Filename suffix" hint="Appended before the extension, e.g. “-small” → photo-small.jpg.">
          <TextInput
            value={settings.suffix}
            onChange={(e) => set({ suffix: e.target.value.replace(/[\\/:*?"<>|]/g, '') })}
            placeholder="-optimized"
            aria-label="Filename suffix"
          />
        </Field>
      </div>
        </div>
      </details>
    </div>
  );
}

function ColorFieldShort({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <span className="color-field">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="color-input-native"
        aria-label="Background color"
      />
      <span className="color-input-hex">{value.toUpperCase()}</span>
    </span>
  );
}

/* ============================== row ============================== */

function ImageRow({
  item,
  processing,
  onToggleSelected,
  onRemove,
  onDownload,
  onCompare,
  onRetry
}: {
  item: WorkItem;
  processing: boolean;
  onToggleSelected: () => void;
  onRemove: () => void;
  onDownload: () => void;
  onCompare: () => void;
  onRetry: () => void;
}) {
  const busy = item.status === 'processing';
  return (
    <div className={cn('frow', item.status === 'error' && 'frow-error', item.status === 'done' && 'frow-done')}>
      <Checkbox checked={item.selected} onChange={onToggleSelected} label="" ariaLabel={`Select ${item.file.name}`} />
      <RowThumbs item={item} />
      <div className="frow-main">
        <div className="frow-name" title={item.file.name}>
          {item.file.name}
        </div>
        <div className="frow-sub mono">
          {formatBytes(item.file.size)}
          {item.sourceFormat ? ` · ${fmtName(item.sourceFormat)}` : ''}
          {item.result?.origWidth ? ` · ${item.result.origWidth}×${item.result.origHeight}` : ''}
        </div>
        {item.status === 'done' && item.result ? (
          <div className="frow-result">
            <span className="mono">
              {item.result.name}
            </span>
            <span className={cn('delta', item.result.size <= item.result.originalSize ? 'delta-good' : 'delta-bad')}>
              {formatBytes(item.result.size)}
              {item.result.size !== item.result.originalSize
                ? item.result.size < item.result.originalSize
                  ? `  (−${formatPercent(diffPercent(item.result.originalSize, item.result.size))})`
                  : `  (+${formatPercent(-diffPercent(item.result.originalSize, item.result.size))})`
                : ''}
            </span>
            {item.result.width ? (
              <span className="muted small mono">
                {item.result.width}×{item.result.height} · {extOf(item.result.name).toUpperCase()}
              </span>
            ) : null}
          </div>
        ) : null}
        {item.error ? (
          <div className="frow-error-text">
            <Icon name="warning" size={13} /> {item.error}
          </div>
        ) : null}
        {busy ? (
          <div className="frow-progress">
            <span className="spinner" style={{ width: 14, height: 14 }} aria-hidden />
            <span className="small muted">Processing…</span>
          </div>
        ) : null}
      </div>
      <div className="frow-actions">
        {item.status === 'done' && item.result ? (
          <>
            <Button variant="primary" size="sm" icon="download" onClick={onDownload}>
              Download
            </Button>
            <Button variant="ghost" size="sm" icon="eye" onClick={onCompare}>
              Compare
            </Button>
          </>
        ) : null}
        {item.status === 'error' ? (
          <Button variant="secondary" size="sm" icon="refresh" onClick={onRetry}>
            Retry
          </Button>
        ) : null}
        <Button
          variant="ghost"
          size="sm"
          icon="trash"
          aria-label={`Remove ${item.file.name}`}
          disabled={processing && (busy || item.status === 'queued')}
          onClick={onRemove}
          className="icon-ghost"
        />
      </div>
    </div>
  );
}
