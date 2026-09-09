import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import PdfWorker from '../../workers/pdf.worker?worker';
import ImageWorker from '../../workers/image.worker?worker';
import { ToolHeader, PrivacyPill, ToolSeoBlock, AdSlot } from '../../components/sections';
import { Dropzone } from '../../components/files';
import { Icon } from '../../components/icons';
import {
  Button,
  ConfirmDialog,
  Field,
  Notice,
  NumberInput,
  Segmented,
  TextInput,
  cn
} from '../../components/ui';
import { useApp } from '../../lib/app';
import { TOOL_BY_ID } from '../../lib/registry';
import { loadPdfHandle, type PdfHandle } from '../../lib/pdfPreview';
import {
  applySuffix,
  downloadBlob,
  formatBytes,
  plural,
  sniffFirstBytes,
  sniffImageType,
  stripExt,
  uid
} from '../../lib/format';
import { createZip } from '../../lib/zip';
import type { ToolDef } from '../../lib/types';

/* ------------------------------ pdf worker client ------------------------------ */

type PdfResp = {
  id?: string;
  type: string;
  pages?: number;
  message?: string;
  buffer?: ArrayBuffer;
  files?: Array<{ name: string; buffer: ArrayBuffer }>;
  count?: number;
};

class PdfClient {
  private worker: Worker;
  private seq = 0;
  private pending = new Map<string, { resolve: (m: PdfResp) => void; reject: (e: Error) => void }>();
  onProgress?: () => void;

  constructor() {
    this.worker = new PdfWorker();
    this.worker.onmessage = (e: MessageEvent) => {
      const m = e.data as PdfResp;
      // Progress ticks share the request id but must never resolve the request  - 
      // only the final result (transform-result / error) may do that.
      if (m.type === 'pdf-progress') {
        this.onProgress?.();
        return;
      }
      if (m.id && this.pending.has(m.id)) {
        const p = this.pending.get(m.id)!;
        this.pending.delete(m.id);
        if (m.type === 'error') p.reject(new Error(m.message ?? 'PDF processing failed'));
        else p.resolve(m);
        return;
      }
    };
    this.worker.onerror = () => {
      const err = new Error('The PDF engine crashed. Please try again.');
      for (const p of this.pending.values()) p.reject(err);
      this.pending.clear();
    };
  }

  request(type: string, payload: Record<string, unknown> = {}, transfer: Transferable[] = []): Promise<PdfResp> {
    const id = `req${++this.seq}`;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.worker.postMessage({ ...payload, type, id }, transfer);
    });
  }

  terminate(): void {
    this.worker.terminate();
    for (const p of this.pending.values()) p.reject(new Error('Cancelled'));
    this.pending.clear();
  }
}

/* ------------------------------ shared bits ------------------------------ */

async function countPdfPages(file: File): Promise<number | null> {
  const client = new PdfClient();
  try {
    const buf = await file.arrayBuffer();
    const resp = await client.request('count', { buffer: buf }, [buf]);
    return typeof resp.pages === 'number' ? resp.pages : null;
  } catch {
    return null;
  } finally {
    client.terminate();
  }
}

interface PdfFile {
  id: string;
  file: File;
  kind?: 'pdf' | 'image';
  pages?: number;
  counting?: boolean;
  countFailed?: boolean;
}

interface OutDoc {
  id: string;
  name: string;
  blob: Blob;
  bytes: number;
  pages?: number;
}

const isPdf = async (f: File): Promise<boolean> => {
  try {
    const head = await sniffFirstBytes(f, 5);
    return head[0] === 0x25 && head[1] === 0x50 && head[2] === 0x44 && head[3] === 0x46;
  } catch {
    return false;
  }
};

async function imageKind(f: File): Promise<'jpeg' | 'png' | 'webp' | 'avif' | null> {
  try {
    const kind = await sniffImageType(await sniffFirstBytes(f));
    return kind && kind !== 'gif' ? kind : null;
  } catch {
    return null;
  }
}

/**
 * Re-encode any image to a high-quality JPEG through the image worker.
 * pdf-lib embeds JPEG reliably (PNGs produced by some in-browser encoders
 * can render as blank pages in PDF viewers).
 */
function convertImageForPdf(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const worker = new ImageWorker();
    worker.onmessage = (e: MessageEvent) => {
      const m = e.data as { type: string; blob?: Blob; message?: string };
      if (m.type === 'result' && m.blob) {
        worker.terminate();
        resolve(new File([m.blob], applySuffix(file.name, '', 'jpg'), { type: 'image/jpeg' }));
      } else if (m.type === 'error') {
        worker.terminate();
        reject(new Error(m.message ?? 'The image could not be prepared.'));
      }
    };
    worker.onerror = () => {
      worker.terminate();
      reject(new Error('The image could not be prepared for merging.'));
    };
    worker.postMessage({
      file,
      index: 0,
      settings: {
        format: 'jpeg',
        quality: 0.92,
        resize: { mode: 'original', value: 0, lockAspect: true },
        background: 'white',
        backgroundColor: '#ffffff',
        pngQuantize: false,
        removeMetadata: true,
        suffix: ''
      }
    });
  });
}

function Head({ def, children }: { def: ToolDef; children?: ReactNode }) {
  return (
    <ToolHeader def={def}>
      <PrivacyPill />
      {children}
    </ToolHeader>
  );
}

function OutRow({ doc }: { doc: OutDoc }) {
  return (
    <div className="pdf-out">
      <span className="pdf-out-icon">
        <Icon name="file" size={18} />
      </span>
      <div className="pdf-out-main">
        <div className="pdf-out-name" title={doc.name}>
          {doc.name}
        </div>
        <div className="pdf-out-meta mono muted small">
          {formatBytes(doc.bytes)}
          {doc.pages != null ? ` · ${doc.pages} ${plural(doc.pages, 'page')}` : ''}
        </div>
      </div>
      <div className="pdf-out-actions">
        <Button variant="primary" size="sm" icon="download" onClick={() => downloadBlob(doc.blob, doc.name)}>
          Download
        </Button>
      </div>
    </div>
  );
}

function SingleDrop({
  file,
  pages,
  reading,
  invalid,
  busy,
  onPick,
  onChange
}: {
  file: File | null;
  pages: number | null;
  reading: boolean;
  invalid: boolean;
  busy: boolean;
  onPick: () => void;
  onChange: (files: File[]) => void;
}) {
  if (!file) {
    return (
      <Dropzone
        onFiles={onChange}
        accept=".pdf,application/pdf"
        multiple={false}
        formats={['PDF']}
        icon="file"
        title="Drop a PDF"
        hint="One document at a time · up to 400 MB."
      />
    );
  }
  return (
    <div className="panel single-file">
      <span className="sf-icon">
        <Icon name="file" size={22} />
      </span>
      <div className="sf-main">
        <div className="sf-name" title={file.name}>
          {file.name}
        </div>
        <div className="sf-meta mono small muted">
          {invalid ? (
            <span className="danger-text">Couldn't read this PDF  -  try another file.</span>
          ) : reading ? (
            'Reading document…'
          ) : pages !== null ? (
            `${pages} ${plural(pages, 'page')} · ${formatBytes(file.size)}`
          ) : (
            formatBytes(file.size)
          )}
        </div>
      </div>
      <div className="pdf-row-actions">
        <Button variant="ghost" size="sm" icon="upload" disabled={busy} onClick={onPick}>
          Choose another
        </Button>
      </div>
    </div>
  );
}

function useHiddenInput(): [ReactNode, () => void, (cb: (files: File[]) => void) => void] {
  const ref = useRef<HTMLInputElement>(null);
  const cbRef = useRef<(files: File[]) => void>(() => {});
  const node = (
    <input
      ref={ref}
      type="file"
      accept=".pdf,application/pdf"
      className="visually-hidden"
      onChange={(e) => {
        if (e.target.files?.length) cbRef.current(Array.from(e.target.files));
        e.target.value = '';
      }}
    />
  );
  return [node, () => ref.current?.click(), (cb) => void (cbRef.current = cb)];
}

function useSinglePdf() {
  const { notify } = useApp();
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<number | null>(null);
  const [reading, setReading] = useState(false);
  const [invalid, setInvalid] = useState(false);

  const accept = useCallback(
    async (incoming: File[]) => {
      const f = incoming[0];
      if (!f) return;
      if (!(await isPdf(f))) {
        notify('error', 'Not a PDF', `${f.name} doesn't look like a valid PDF file.`);
        return;
      }
      setFile(f);
      setInvalid(false);
      setPages(null);
      setReading(true);
      const client = new PdfClient();
      try {
        const buf = await f.arrayBuffer();
        const resp = await client.request('count', { buffer: buf }, [buf]);
        if (resp.pages === 0) {
          setInvalid(true);
        } else {
          setPages(resp.pages ?? 0);
        }
      } catch (e) {
        setInvalid(true);
        notify('error', 'Could not open PDF', e instanceof Error ? e.message : undefined);
      } finally {
        setReading(false);
        client.terminate();
      }
    },
    [notify]
  );

  return { file, pages, reading, invalid, accept };
}

/* ============================== merge ============================== */

export function PdfMergerPage() {
  const def = TOOL_BY_ID['pdf-merger'];
  const { notify, settings: prefs } = useApp();
  const [files, setFiles] = useState<PdfFile[]>([]);
  const [busy, setBusy] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [confirmLarge, setConfirmLarge] = useState<File[] | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [result, setResult] = useState<OutDoc | null>(null);
  const clientRef = useRef<PdfClient | null>(null);
  const cancelRef = useRef(false);

  const addIncoming = useCallback(
    async (incoming: File[], force = false) => {
      type Pending = { file: File; kind: 'pdf' | 'image' };
      const pending: Pending[] = [];
      const big: File[] = [];
      for (const f of incoming) {
        let kind: Pending['kind'];
        if (await isPdf(f)) {
          kind = 'pdf';
        } else {
          const img = await imageKind(f);
          if (!img) {
            notify('error', 'Not a PDF or supported image', `${f.name} isn't a PDF or a JPG/PNG/WebP/AVIF photo.`);
            continue;
          }
          kind = 'image';
        }
        if (f.size > 400 * 1024 * 1024) {
          notify('error', 'File too large', `${f.name} is over 400 MB and can't be merged in a browser.`);
          continue;
        }
        if (!force && f.size > 120 * 1024 * 1024) big.push(f);
        else pending.push({ file: f, kind });
      }
      if (big.length) {
        setConfirmLarge((prev) => [...(prev ?? []), ...big]);
      }
      if (pending.length) {
        setResult(null);
        // Add files one at a time, reading each PDF's page count before it
        // appears so the list is never left in a "reading pages" limbo.
        for (const item of pending) {
          let file = item.file;
          if (item.kind === 'image') {
            try {
              file = await convertImageForPdf(item.file);
            } catch (e) {
              notify('error', 'Could not use this image', e instanceof Error ? e.message : `${item.file.name} couldn't be prepared.`);
              continue;
            }
            setFiles((prev) => [...prev, { id: uid(), file, kind: 'image', pages: 1 }]);
          } else {
            const counted = await countPdfPages(item.file);
            setFiles((prev) => [
              ...prev,
              {
                id: uid(),
                file: item.file,
                kind: 'pdf',
                pages: counted != null ? Math.max(0, counted) : undefined,
                countFailed: counted == null
              }
            ]);
          }
        }
      }
    },
    [notify]
  );

  const move = (index: number, dir: -1 | 1) => {
    setFiles((prev) => {
      const to = index + dir;
      if (to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      const [m] = next.splice(index, 1);
      next.splice(to, 0, m);
      return next;
    });
  };

  const merge = async () => {
    if (busy || files.length === 0) return;
    if (files.some((f) => f.kind !== 'image' && (f.countFailed || f.pages === -1))) {
      notify('error', 'A file could not be read', 'Remove the invalid file and try again.');
      return;
    }
    setBusy(true);
    setResult(null);
    cancelRef.current = false;
    const client = new PdfClient();
    clientRef.current = client;
    try {
      let totalPages = 0;
      for (let i = 0; i < files.length; i += 1) {
        if (cancelRef.current || !clientRef.current) break;
        const item = files[i];
        setStatusText(`${item.kind === 'image' ? 'Adding photo' : 'Reading PDF'} ${i + 1} of ${files.length}…`);
        const buf = await item.file.arrayBuffer();
        if (item.kind === 'image') {
          await client.request('merge-add-image', { buffer: buf, mime: item.file.type || 'image/jpeg', name: item.file.name, index: i }, [buf]);
        } else {
          await client.request('merge-add', { buffer: buf, name: item.file.name, index: i }, [buf]);
        }
        totalPages += item.pages ?? (item.kind === 'image' ? 1 : 0);
      }
      if (cancelRef.current || !clientRef.current) return;
      setStatusText('Creating the merged document…');
      const resp = await client.request('merge-finish', { name: `${stripExt(files[0].file.name)}-merged.pdf` });
      if (resp.buffer) {
        const blob = new Blob([resp.buffer], { type: 'application/pdf' });
        setResult({
          id: uid(),
          name: `${stripExt(files[0].file.name)}-merged.pdf`,
          blob,
          bytes: blob.size,
          pages: totalPages
        });
        const docCount = files.filter((f) => f.kind === 'pdf').length;
        const photoCount = files.length - docCount;
        notify(
          'success',
          'Everything merged',
          `${docCount} ${plural(docCount, 'PDF')}${photoCount ? ` + ${photoCount} ${plural(photoCount, 'photo')}` : ''} combined into ${formatBytes(blob.size)}.`
        );
        if (prefs.autoDownload) downloadBlob(blob, `${stripExt(files[0].file.name)}-merged.pdf`);
      }
    } catch (e) {
      if (!cancelRef.current) {
        notify('error', 'Merge failed', e instanceof Error ? e.message : 'Something went wrong while merging.');
      }
    } finally {
      setBusy(false);
      setStatusText('');
      clientRef.current?.terminate();
      clientRef.current = null;
    }
  };

  const cancelMerge = () => {
    cancelRef.current = true;
    clientRef.current?.terminate();
    clientRef.current = null;
    setBusy(false);
    setStatusText('');
    notify('info', 'Merge cancelled', 'The merged document was not created.');
  };

  const clearAll = () => {
    setFiles([]);
    setResult(null);
  };

  const readingCounts = files.some((f) => f.kind !== 'image' && !f.countFailed && f.pages === undefined);
  const hasUnreadable = files.some((f) => f.kind !== 'image' && f.countFailed);

  return (
    <div className="container tool-page">
      <Head def={def}>
        <p className="tool-blurb">
          Combine multiple PDFs into one document. Drag to reorder, duplicate, then merge  -  all locally.
        </p>
      </Head>
      <div className="workspace">
        {files.length === 0 ? (
          <Dropzone
            onFiles={(fs) => void addIncoming(fs)}
            accept=".pdf,image/jpeg,image/png,image/webp,image/avif"
            multiple
            formats={['PDF', 'JPG', 'PNG', 'WebP']}
            icon="file"
            title="Drop PDFs or photos to combine"
            hint="Drag them into the order you want  -  the list becomes the final document. Photos become their own pages."
          />
        ) : (
          <div className="panel merge-panel">
            <div className="queue-head">
              <div className="queue-title">
                <Icon name="layers" size={17} />
                <strong>
                  {files.length} {plural(files.length, 'item')}
                </strong>
                <span className="muted small">
                  · {files.filter((f) => f.kind === 'pdf').length} PDF
                  {files.some((f) => f.kind === 'image') ? ` + ${files.filter((f) => f.kind === 'image').length} photo${files.filter((f) => f.kind === 'image').length > 1 ? 's' : ''}` : ''} · {formatBytes(files.reduce((a, f) => a + f.file.size, 0))}
                </span>
              </div>
              <div className="queue-tools">
                <label className="btn btn-secondary btn-sm" role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && document.getElementById('merge-more')?.click()}>
                  <Icon name="plus" size={15} /> Add more
                  <input id="merge-more" type="file" accept=".pdf,image/jpeg,image/png,image/webp,image/avif" multiple className="visually-hidden" onChange={(e) => { if (e.target.files) void addIncoming(Array.from(e.target.files)); e.target.value = ''; }} />
                </label>
                <Button variant="ghost" size="sm" icon="trash" disabled={busy} onClick={() => (prefs.confirmClear ? setConfirmClear(true) : clearAll())}>
                  Clear
                </Button>
              </div>
            </div>

            <div className="pdf-list">
              {files.map((item, i) => (
                <div
                  key={item.id}
                  className="pdf-row"
                  draggable={!busy}
                  onDragStart={(e) => e.dataTransfer.setData('text/plain', String(i))}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const from = Number(e.dataTransfer.getData('text/plain'));
                    if (Number.isInteger(from) && from !== i) move(from, i > from ? 1 : -1);
                  }}
                >
                  <span className="pdf-row-grip" aria-hidden>
                    <Icon name="grip" size={17} />
                  </span>
                  <span className="pdf-row-num mono">{i + 1}</span>
                  <span className={cn('pdf-row-file', item.kind === 'image' && 'pdf-row-file-img')}>
                    <Icon name={item.kind === 'image' ? 'image' : 'file'} size={18} />
                  </span>
                  <div className="pdf-row-main">
                    <div className="pdf-row-name" title={item.file.name}>
                      {item.file.name}
                    </div>
                    <div className="pdf-row-meta mono small muted">
                      {item.kind === 'image' ? (
                        <>Photo · {formatBytes(item.file.size)}</>
                      ) : item.countFailed ? (
                        <span className="danger-text">Couldn't read this PDF  -  remove it before merging.</span>
                      ) : item.pages !== undefined ? (
                        `${item.pages} ${plural(item.pages, 'page')} · ${formatBytes(item.file.size)}`
                      ) : (
                        'Reading pages…'
                      )}
                    </div>
                  </div>
                  <div className="pdf-row-actions">
                    <Button variant="ghost" size="sm" icon="arrowUp" aria-label="Move up" disabled={i === 0 || busy} onClick={() => move(i, -1)} />
                    <Button variant="ghost" size="sm" icon="arrowDown" aria-label="Move down" disabled={i === files.length - 1 || busy} onClick={() => move(i, 1)} />
                    <Button variant="ghost" size="sm" icon="copy" aria-label="Duplicate" disabled={busy} onClick={() => setFiles((p) => [...p.slice(0, i + 1), { ...item, id: uid() }, ...p.slice(i + 1)])} />
                    <Button variant="ghost" size="sm" icon="trash" aria-label="Remove" disabled={busy} onClick={() => setFiles((p) => p.filter((x) => x.id !== item.id))} />
                  </div>
                </div>
              ))}
            </div>

            <div className="pdf-footer">
              <span className="small muted">
                Drag rows to reorder · duplicate a row to include it twice · photos become pages.
              </span>
              <div className="queue-foot-actions">
                {busy ? (
                  <Button variant="danger-ghost" size="lg" icon="close" onClick={cancelMerge}>
                    Cancel
                  </Button>
                ) : null}
                <Button variant="primary" size="lg" disabled={busy || files.length === 0 || readingCounts || hasUnreadable} loading={busy} onClick={merge} icon="merge">
                  {busy
                    ? statusText
                    : hasUnreadable
                      ? 'Remove the unreadable file'
                      : readingCounts
                        ? 'Reading PDF pages…'
                        : `Combine ${files.length} ${files.length === 1 ? 'file' : 'files'} into one PDF`}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {result ? (
        <div className="panel result-card" role="status">
          <div className="result-card-head">
            <span className="result-ok-icon">
              <Icon name="checkCircle" size={20} />
            </span>
            <div>
              <h3 className="result-title">Merge complete</h3>
              <p className="result-sub muted small">Your combined document is ready.</p>
            </div>
          </div>
          <div className="pdf-outputs">
            <OutRow doc={result} />
          </div>
          <div className="result-actions">
            <Button variant="ghost" icon="refresh" onClick={clearAll}>
              Merge more files
            </Button>
          </div>
        </div>
      ) : null}

      <AdSlot position="pdf-tool" style={{ marginTop: 18 }} />
      <ToolSeoBlock def={def} />

      <ConfirmDialog
        open={confirmClear}
        title="Clear the list?"
        body={<span>Remove all {files.length} {plural(files.length, 'item')} from the list?</span>}
        confirmLabel="Clear files"
        onConfirm={clearAll}
        onClose={() => setConfirmClear(false)}
      />
      <ConfirmDialog
        open={confirmLarge !== null}
        title="Large files"
        body={<span>{confirmLarge?.length} {plural(confirmLarge?.length ?? 0, 'file')} {confirmLarge && confirmLarge.length > 1 ? 'are' : 'is'} larger than 120 MB. Very large files can be slow to combine in a browser.</span>}
        confirmLabel="Add anyway"
        tone="primary"
        onConfirm={() => {
          if (confirmLarge) void addIncoming(confirmLarge, true);
          setConfirmLarge(null);
        }}
        onClose={() => setConfirmLarge(null)}
      />
    </div>
  );
}

/* ============================== split ============================== */

type SplitMode = 'pages' | 'ranges' | 'each' | 'groups';

type Parsed =
  | { kind: 'pages'; indices: number[]; error: string | null }
  | { kind: 'ranges'; ranges: Array<{ from: number; to: number }>; pagesOut: number; error: string | null };

export function PdfSplitterPage() {
  const def = TOOL_BY_ID['pdf-splitter'];
  const { notify, settings: prefs } = useApp();
  const { file, pages, reading, invalid, accept } = useSinglePdf();
  const [hiddenNode, openPicker, setCb] = useHiddenInput();
  const [mode, setMode] = useState<SplitMode>('pages');
  const [pagesText, setPagesText] = useState('');
  const [rangeText, setRangeText] = useState('');
  const [groupSize, setGroupSize] = useState(5);
  const [busy, setBusy] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [outputs, setOutputs] = useState<OutDoc[]>([]);
  const [emptyRun, setEmptyRun] = useState(false);
  const clientRef = useRef<PdfClient | null>(null);
  const cancelRef = useRef(false);

  useEffect(() => {
    setEmptyRun(false);
    setOutputs([]);
  }, [file, mode]);

  useEffect(() => setCb((fs) => void accept(fs)), [accept, setCb]);

  const parsed = useMemo<Parsed | null>(() => {
    if (pages === null) return null;
    const text = (mode === 'pages' ? pagesText : rangeText).trim();
    if (!text) {
      return mode === 'pages'
        ? { kind: 'pages', indices: [], error: null }
        : { kind: 'ranges', ranges: [], pagesOut: 0, error: null };
    }
    const invalidTok: string[] = [];
    const isPages = mode === 'pages';
    const indices: number[] = [];
    const ranges: Array<{ from: number; to: number }> = [];
    for (const raw of text.split(',')) {
      const token = raw.trim();
      if (!token) continue;
      const m = /^(\d+)\s*-\s*(\d+)$/.exec(token);
      if (m) {
        const from = Number(m[1]);
        const to = Number(m[2]);
        if (from < 1 || to < from) {
          invalidTok.push(token);
          continue;
        }
        if (isPages) {
          for (let p = from; p <= to && p <= pages; p += 1) indices.push(p - 1);
        } else {
          ranges.push({ from: from - 1, to: to - 1 });
        }
      } else if (/^\d+$/.test(token)) {
        const p = Number(token);
        if (isPages) indices.push(p - 1);
        else ranges.push({ from: p - 1, to: p - 1 });
      } else {
        invalidTok.push(token);
      }
    }
    if (invalidTok.length) {
      return {
        kind: isPages ? 'pages' : 'ranges',
        indices,
        ranges,
        pagesOut: 0,
        error: `“${invalidTok.join('”, “')}” isn't a valid page or range (use numbers like 3 or 5-9).`
      };
    }
    if (isPages) {
      if (indices.some((i) => i >= pages)) {
        return { kind: 'pages', indices: [], error: `Some pages don't exist  -  this PDF has ${pages} ${plural(pages, 'page')}.` };
      }
      return { kind: 'pages', indices, error: indices.length ? null : 'Enter at least one page to extract.' };
    }
    if (ranges.some((r) => r.from >= pages)) {
      return { kind: 'ranges', ranges: [], pagesOut: 0, error: `A range starts past page ${pages}.` };
    }
    let out = 0;
    for (const r of ranges) out += Math.min(r.to, pages - 1) - r.from + 1;
    return {
      kind: 'ranges',
      ranges,
      pagesOut: out,
      error: ranges.length ? null : 'Enter at least one range.'
    };
  }, [mode, pagesText, rangeText, pages]);

  const canRun = pages !== null && !invalid && pages > 0;
  const inputReady =
    (mode === 'pages' || mode === 'ranges') ? (parsed?.error ? false : true) : true;
  const plan = useMemo(() => {
    if (!file || pages === null) return null;
    if (mode === 'pages') {
      const n = parsed?.kind === 'pages' ? parsed.indices.length : 0;
      return n ? `${n} ${plural(n, 'page')} → one PDF` : 'Enter pages like “1, 3, 7, 10”.';
    }
    if (mode === 'ranges') {
      const n = parsed?.kind === 'ranges' ? parsed.ranges.length : 0;
      const out = parsed?.kind === 'ranges' ? parsed.pagesOut : 0;
      return n ? `${n} ${plural(n, 'PDF')} · ${out} ${plural(out, 'page')} total` : 'Enter ranges like “1-3, 5-7”.';
    }
    if (mode === 'each') return `${pages} single-page PDFs`;
    return `${Math.ceil(pages / Math.max(1, groupSize))} ${plural(Math.ceil(pages / Math.max(1, groupSize)), 'PDF')} of ≤ ${groupSize} pages`;
  }, [mode, pages, file, parsed, groupSize]);

  const run = async () => {
    if (!file || pages === null || busy) return;
    if ((mode === 'pages' || mode === 'ranges') && parsed?.error) {
      notify('error', 'Check your input', parsed.error);
      return;
    }
    const estimated =
      mode === 'each' ? pages : mode === 'groups' ? Math.ceil(pages / Math.max(1, groupSize)) : mode === 'ranges' ? (parsed?.kind === 'ranges' ? parsed.ranges.length : 0) : 1;
    if (estimated > 1200) {
      notify('error', 'That would create too many files', `This would produce ${estimated} PDFs. Use a larger group size or a smaller page selection.`);
      return;
    }
      setBusy(true);
      setOutputs([]);
      setEmptyRun(false);
      setStatusText('Preparing document…');
      cancelRef.current = false;
    const client = new PdfClient();
    clientRef.current = client;
    try {
      const buf = await file.arrayBuffer();
      const payload: Record<string, unknown> = { buffer: buf, base: file.name };
      if (mode === 'pages') {
        payload.mode = 'extract';
        payload.pages = parsed?.kind === 'pages' ? parsed.indices : [];
      } else if (mode === 'ranges') {
        payload.mode = 'ranges';
        payload.ranges = parsed?.kind === 'ranges' ? parsed.ranges : [];
      } else if (mode === 'each') {
        payload.mode = 'each';
      } else {
        payload.mode = 'groups';
        payload.groupSize = groupSize;
      }
      setStatusText('Processing pages…');
      const resp = await client.request('transform', payload, [buf]);
      const got: OutDoc[] = (resp.files ?? []).map((f) => {
        const blob = new Blob([f.buffer], { type: 'application/pdf' });
        return { id: uid(), name: f.name, blob, bytes: blob.size };
      });
      setStatusText('Complete');
      if (got.length === 0) {
        setEmptyRun(true);
        notify('error', 'Nothing was produced', 'No pages matched the current settings  -  check the page numbers and document length, then try again.');
        return;
      }
      setOutputs(got);
      notify(
        'success',
        `Created ${got.length} ${got.length === 1 ? 'PDF' : 'PDFs'}`,
        got.length === 1 ? 'Your file is ready below.' : 'Download individually or as a ZIP.'
      );
      if (prefs.autoDownload && got.length === 1) downloadBlob(got[0].blob, got[0].name);
    } catch (e) {
      if (!cancelRef.current) {
        setEmptyRun(true);
        notify('error', 'Could not split the PDF', e instanceof Error ? e.message : 'Something went wrong.');
      }
    } finally {
      setBusy(false);
      setStatusText('');
      clientRef.current?.terminate();
      clientRef.current = null;
    }
  };

  const cancelSplit = () => {
    cancelRef.current = true;
    clientRef.current?.terminate();
    clientRef.current = null;
    setBusy(false);
    setStatusText('');
    notify('info', 'Split cancelled', 'No files were created.');
  };

  const zipAll = async () => {
    const zip = await createZip(outputs.map((o) => ({ name: o.name, blob: o.blob })));
    downloadBlob(zip, `${stripExt(file?.name ?? 'document')}-split.zip`);
  };

  return (
    <div className="container tool-page">
      <Head def={def}>
        <p className="tool-blurb">
          Split a PDF by selected pages, page ranges, every page, or groups of pages.
        </p>
      </Head>
      <div className="workspace">
        {hiddenNode}
        <SingleDrop
          file={file}
          pages={pages}
          reading={reading}
          invalid={invalid}
          busy={busy}
          onPick={openPicker}
          onChange={(fs) => void accept(fs)}
        />
        {canRun ? (
          <div className="panel split-panel">
            <Segmented
              label="Splitting mode"
              options={[
                { value: 'pages', label: 'Selected pages' },
                { value: 'ranges', label: 'Ranges' },
                { value: 'each', label: 'Every page' },
                { value: 'groups', label: 'Groups' }
              ]}
              value={mode}
              onChange={(m) => {
                setMode(m);
                setOutputs([]);
              }}
            />
            <div className="split-input">
              {mode === 'pages' ? (
                <Field
                  label="Pages to extract (one combined PDF)"
                  hint="Examples: 1, 3, 7, 10 · or 1-5, 8-12"
                  error={parsed?.kind === 'pages' && parsed.error ? parsed.error : undefined}
                >
                  <TextInput value={pagesText} onChange={(e) => setPagesText(e.target.value)} placeholder="1, 3, 7, 10" aria-label="Pages to extract" />
                </Field>
              ) : null}
              {mode === 'ranges' ? (
                <Field
                  label="Page ranges (one PDF per range)"
                  hint="Example: 1-3, 5, 8-10"
                  error={parsed?.kind === 'ranges' && parsed.error ? parsed.error : undefined}
                >
                  <TextInput value={rangeText} onChange={(e) => setRangeText(e.target.value)} placeholder="1-3, 5-7" aria-label="Page ranges" />
                </Field>
              ) : null}
              {mode === 'groups' ? (
                <Field label="Pages per group">
                  <NumberInput min={1} max={1000} value={groupSize} onChange={(e) => setGroupSize(Math.max(1, Number(e.target.value) || 1))} />
                </Field>
              ) : null}
            </div>
            <div className="split-summary small muted">
              <Icon name="info" size={14} /> {plan}
            </div>
            <div className="pdf-footer">
              <span className="small muted">Invalid ranges are flagged before you run anything.</span>
              <div className="queue-foot-actions">
                {busy ? (
                  <Button variant="danger-ghost" size="lg" icon="close" onClick={cancelSplit}>
                    Cancel
                  </Button>
                ) : null}
                <Button variant="primary" size="lg" disabled={busy || !inputReady} loading={busy} onClick={run} icon="split">
                  {busy ? statusText || 'Splitting…' : inputReady ? 'Split PDF' : 'Fix the pages above'}
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {emptyRun ? (
        <Notice
          tone="error"
          title="No PDFs were created"
          action={
            <Button variant="secondary" size="sm" onClick={() => setEmptyRun(false)}>
              Try again
            </Button>
          }
        >
          The current settings didn't match any pages in this document. Double-check the page
          numbers against the {pages ?? '?'}-page count shown next to the file, then split again.
          If this keeps happening, the PDF may use unsupported internals  -  try splitting every
          page into a smaller number of groups instead.
        </Notice>
      ) : null}

      {outputs.length > 0 ? (
        <div className="panel result-card" role="status">
          <div className="result-card-head">
            <span className="result-ok-icon">
              <Icon name="checkCircle" size={20} />
            </span>
            <div>
              <h3 className="result-title">Split complete</h3>
              <p className="result-sub muted small">
                {outputs.length} {plural(outputs.length, 'file')} from “{file?.name}”.
              </p>
            </div>
            {outputs.length > 1 ? (
              <div className="result-card-actions">
                <Button variant="secondary" size="sm" icon="download" onClick={() => void zipAll()}>
                  Download all as ZIP
                </Button>
              </div>
            ) : null}
          </div>
          <div className="pdf-outputs">
            {outputs.map((o) => (
              <OutRow key={o.id} doc={o} />
            ))}
          </div>
          <div className="result-actions">
            <Button variant="ghost" icon="refresh" onClick={() => { setOutputs([]); setPagesText(''); setRangeText(''); }}>
              Split another document
            </Button>
          </div>
        </div>
      ) : null}

      <AdSlot position="pdf-tool" style={{ marginTop: 18 }} />
      <ToolSeoBlock def={def} />
    </div>
  );
}

/* ============================== page grids ============================== */

interface PageSpec {
  orig: number; // original page number (1-based)
  rotation: number; // added degrees
}

function usePageDoc(file: File | null) {
  const [handle, setHandle] = useState<PdfHandle | null>(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(false);
  const handleRef = useRef<PdfHandle | null>(null);

  useEffect(() => {
    let alive = true;
    setHandle(null);
    setFailed(false);
    if (!file) return;
    setLoading(true);
    loadPdfHandle(file)
      .then((h) => {
        if (alive) {
          handleRef.current?.destroy();
          handleRef.current = h;
          setHandle(h);
        } else {
          h.destroy();
        }
      })
      .catch(() => alive && setFailed(true))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [file]);

  useEffect(
    () => () => {
      handleRef.current?.destroy();
    },
    []
  );

  const pagesCount = handle?.numPages ?? null;
  return { handle, failed, loading, pagesCount };
}

function PageThumb({
  spec,
  label,
  handle,
  selected,
  selectable,
  onActivate,
  onKeyDown,
  dragProps,
  actions
}: {
  spec: PageSpec;
  label: string;
  handle: PdfHandle;
  selected: boolean;
  selectable?: boolean;
  onActivate?: (e: React.MouseEvent) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  dragProps?: {
    draggable: boolean;
    onDragStart: (e: React.DragEvent) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
  };
  actions?: ReactNode;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'failed'>('idle');
  const [pageW, setPageW] = useState(0);

  useEffect(() => {
    if (!canvasRef.current || status !== 'idle') return;
    const el = canvasRef.current;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((en) => en.isIntersecting)) return;
        io.disconnect();
        setStatus('loading');
        handle
          .render(spec.orig, el, 168)
          .then(() => {
            setPageW(el.width);
            setStatus('done');
          })
          .catch(() => setStatus('failed'));
      },
      { rootMargin: '320px' }
    );
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spec.orig, handle]);

  return (
    <div
      className={cn('page-tile', selected && 'page-tile-selected', selectable === false && 'page-tile-dim')}
      onClick={onActivate}
      onKeyDown={onKeyDown}
      role={onActivate ? 'button' : undefined}
      tabIndex={onActivate ? 0 : undefined}
      aria-pressed={selectable !== false && onActivate ? selected : undefined}
      {...(dragProps ?? {})}
    >
      <div className="page-tile-canvas" style={{ width: pageW || 168 }}>
        <canvas ref={canvasRef} width={1} height={1} style={{ width: pageW || 168, height: pageW ? 'auto' : 90 }} />
        {spec.rotation % 360 !== 0 ? (
          <span className="pt-rot" title={`Rotated ${spec.rotation % 360}°`}>
            <Icon name="rotate" size={13} /> {spec.rotation % 360}°
          </span>
        ) : null}
        {status === 'failed' ? <span className="pt-fail">Preview unavailable</span> : null}
      </div>
      <div className="page-tile-foot">
        <span className="page-tile-num mono">{label}</span>
        {actions}
      </div>
    </div>
  );
}

function PageToolbar({ left, right }: { left?: ReactNode; right?: ReactNode }) {
  return (
    <div className="page-toolbar">
      <div className="page-toolbar-left">{left}</div>
      <div className="page-toolbar-right">{right}</div>
    </div>
  );
}

/* ============================== extract ============================== */

export function PdfExtractorPage() {
  const def = TOOL_BY_ID['pdf-extractor'];
  const { notify, settings: prefs } = useApp();
  const { file, invalid, accept } = useSinglePdf();
  const { handle, failed, loading, pagesCount } = usePageDoc(file);
  const [hiddenNode, openPicker, setCb] = useHiddenInput();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [result, setResult] = useState<OutDoc | null>(null);
  const lastClicked = useRef<number | null>(null);
  const clientRef = useRef<PdfClient | null>(null);

  useEffect(() => setCb((fs) => void accept(fs)), [accept, setCb]);
  useEffect(() => {
    setSelected(new Set());
    setResult(null);
  }, [file]);

  const toggle = (pageNum: number, e: React.MouseEvent | React.KeyboardEvent) => {
    if (e.shiftKey && lastClicked.current !== null) {
      const a = Math.min(lastClicked.current, pageNum);
      const b = Math.max(lastClicked.current, pageNum);
      setSelected((prev) => {
        const next = new Set(prev);
        for (let p = a; p <= b; p += 1) next.add(p);
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(pageNum)) next.delete(pageNum);
        else next.add(pageNum);
        return next;
      });
    }
    lastClicked.current = pageNum;
  };

  const setAll = (value: boolean) => {
    if (!pagesCount) return;
    const next = new Set<number>();
    if (value) for (let p = 1; p <= pagesCount; p += 1) next.add(p);
    setSelected(next);
  };

  const invert = () => {
    if (!pagesCount) return;
    setSelected((prev) => {
      const next = new Set<number>();
      for (let p = 1; p <= pagesCount; p += 1) if (!prev.has(p)) next.add(p);
      return next;
    });
  };

  const extract = async () => {
    if (!file || busy || selected.size === 0) return;
    setBusy(true);
    setStatusText('Extracting pages…');
    const client = new PdfClient();
    clientRef.current = client;
    try {
      const buf = await file.arrayBuffer();
      const indices = [...selected].sort((a, b) => a - b).map((p) => p - 1);
      const resp = await client.request('transform', { mode: 'extract', buffer: buf, base: file.name, pages: indices }, [buf]);
      const f = resp.files?.[0];
      if (f) {
        const blob = new Blob([f.buffer], { type: 'application/pdf' });
        setResult({ id: uid(), name: f.name, blob, bytes: blob.size, pages: selected.size });
        notify('success', 'Pages extracted', `${selected.size} ${plural(selected.size, 'page')} ready to download.`);
        if (prefs.autoDownload) downloadBlob(blob, f.name);
      }
    } catch (e) {
      notify('error', 'Extraction failed', e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy(false);
      setStatusText('');
      clientRef.current?.terminate();
      clientRef.current = null;
    }
  };

  return (
    <div className="container tool-page">
      <Head def={def}>
        <p className="tool-blurb">Visually select the pages you need, then extract them into a new PDF.</p>
      </Head>
      <div className="workspace">
        {hiddenNode}
        <SingleDrop file={file} pages={pagesCount} reading={loading} invalid={invalid || failed} busy={busy} onPick={openPicker} onChange={(fs) => void accept(fs)} />
        {handle && pagesCount !== null ? (
          <>
            <PageToolbar
              left={
                <>
                  <span className="small">
                    <strong>{selected.size}</strong> of {pagesCount} selected
                  </span>
                </>
              }
              right={
                <>
                  <Button variant="ghost" size="sm" onClick={() => setAll(true)}>Select all</Button>
                  <Button variant="ghost" size="sm" onClick={() => setAll(false)}>Clear</Button>
                  <Button variant="ghost" size="sm" onClick={invert}>Invert</Button>
                </>
              }
            />
            <div className="page-grid">
              {Array.from({ length: pagesCount }, (_, i) => i + 1).map((p) => (
                <PageThumb
                  key={p}
                  spec={{ orig: p, rotation: 0 }}
                  label={`Page ${p}`}
                  handle={handle}
                  selected={selected.has(p)}
                  onActivate={(e) => toggle(p, e)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggle(p, e);
                    }
                  }}
                />
              ))}
            </div>
            <div className="page-action-bar">
              <Button variant="primary" size="lg" disabled={busy || selected.size === 0} loading={busy} onClick={extract} icon="extract">
                {busy ? statusText : `Extract selected (${selected.size})`}
              </Button>
            </div>
          </>
        ) : null}
      </div>

      {result ? (
        <div className="panel result-card" role="status">
          <div className="result-card-head">
            <span className="result-ok-icon">
              <Icon name="checkCircle" size={20} />
            </span>
            <div>
              <h3 className="result-title">Extraction complete</h3>
              <p className="result-sub muted small">{selected.size} pages extracted.</p>
            </div>
            <div className="result-card-actions">
              <OutRow doc={result} />
            </div>
          </div>
          <div className="result-actions">
            <Button variant="ghost" icon="refresh" onClick={() => setResult(null)}>
              Extract from another file
            </Button>
          </div>
        </div>
      ) : null}
      <AdSlot position="pdf-tool" style={{ marginTop: 18 }} />
      <ToolSeoBlock def={def} />
    </div>
  );
}

/* ============================== reorder ============================== */

export function PdfReorderPage() {
  const def = TOOL_BY_ID['pdf-reorder'];
  const { notify, settings: prefs } = useApp();
  const { file, invalid, accept } = useSinglePdf();
  const { handle, failed, loading, pagesCount } = usePageDoc(file);
  const [hiddenNode, openPicker, setCb] = useHiddenInput();
  const [order, setOrder] = useState<PageSpec[]>([]);
  const [selectedOrig, setSelectedOrig] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [result, setResult] = useState<OutDoc | null>(null);
  const dragIndex = useRef<number | null>(null);
  const clientRef = useRef<PdfClient | null>(null);

  useEffect(() => setCb((fs) => void accept(fs)), [accept, setCb]);
  useEffect(() => {
    if (pagesCount != null) {
      setOrder(Array.from({ length: pagesCount }, (_, i) => ({ orig: i + 1, rotation: 0 })));
      setSelectedOrig(new Set());
      setResult(null);
    } else {
      setOrder([]);
    }
  }, [pagesCount]);

  const selectedPositions = useMemo(
    () => order.map((o, i) => ({ o, i })).filter(({ o }) => selectedOrig.has(o.orig)).map(({ i }) => i),
    [order, selectedOrig]
  );

  const toggleSel = (orig: number, additive: boolean) => {
    setSelectedOrig((prev) => {
      const next = additive ? new Set(prev) : new Set<number>();
      if (next.has(orig)) next.delete(orig);
      else next.add(orig);
      return next;
    });
  };

  const rotateSelected = () => {
    setOrder((prev) =>
      prev.map((s) => (selectedOrig.has(s.orig) ? { ...s, rotation: (s.rotation + 90) % 360 } : s))
    );
  };

  const deleteSelected = () => {
    if (order.length === selectedOrig.size && order.length > 1) {
      notify('error', 'Keep at least one page', 'A PDF needs at least one page. Deselect some pages first.');
      return;
    }
    if (order.length === selectedOrig.size) {
      notify('error', 'Keep at least one page', 'A PDF needs at least one page.');
      return;
    }
    setOrder((prev) => prev.filter((s) => !selectedOrig.has(s.orig)));
    setSelectedOrig(new Set());
  };

  const contiguousMove = (dir: -1 | 1) => {
    if (selectedPositions.length === 0) return;
    const sorted = [...selectedPositions].sort((a, b) => a - b);
    const contiguous = sorted.length === 1 || sorted.every((v, i) => i === 0 || v === sorted[i - 1] + 1);
    if (!contiguous) {
      notify('info', 'Select pages in a row first', 'Move works on pages that are next to each other. Drag individual pages anywhere.');
      return;
    }
    const edge = dir === -1 ? sorted[0] : sorted[sorted.length - 1];
    const swapIdx = edge + dir;
    if (swapIdx < 0 || swapIdx >= order.length) return;
    setOrder((prev) => {
      const next = [...prev];
      const item = next.splice(edge, 1)[0];
      next.splice(swapIdx, 0, item);
      return next;
    });
  };

  const moveToEnd = (dir: 'start' | 'end') => {
    if (!selectedPositions.length) return;
    const origs = selectedOrig;
    setOrder((prev) => {
      const chosen = prev.filter((s) => origs.has(s.orig));
      const rest = prev.filter((s) => !origs.has(s.orig));
      return dir === 'start' ? [...chosen, ...rest] : [...rest, ...chosen];
    });
  };

  const exportPdf = async () => {
    if (!file || busy || order.length === 0) return;
    setBusy(true);
    setStatusText('Creating PDF…');
    const client = new PdfClient();
    clientRef.current = client;
    try {
      const buf = await file.arrayBuffer();
      const resp = await client.request(
        'transform',
        {
          mode: 'reorder',
          buffer: buf,
          base: file.name,
          order: order.map((s) => s.orig - 1),
          rotate: order.map((s) => s.rotation)
        },
        [buf]
      );
      const f = resp.files?.[0];
      if (f) {
        const blob = new Blob([f.buffer], { type: 'application/pdf' });
        setResult({ id: uid(), name: f.name, blob, bytes: blob.size, pages: order.length });
        notify('success', 'PDF reorganized', `${order.length} ${plural(order.length, 'page')} ready to download.`);
        if (prefs.autoDownload) downloadBlob(blob, f.name);
      }
    } catch (e) {
      notify('error', 'Could not create the PDF', e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy(false);
      setStatusText('');
      clientRef.current?.terminate();
      clientRef.current = null;
    }
  };

  const unchanged = order.every((s, i) => s.orig === i + 1 && s.rotation % 360 === 0);

  return (
    <div className="container tool-page">
      <Head def={def}>
        <p className="tool-blurb">Reorder, rotate and delete pages in a visual grid, then export.</p>
      </Head>
      <div className="workspace">
        {hiddenNode}
        <SingleDrop file={file} pages={pagesCount} reading={loading} invalid={invalid || failed} busy={busy} onPick={openPicker} onChange={(fs) => void accept(fs)} />
        {handle && pagesCount !== null ? (
          <>
            <PageToolbar
              left={
                <>
                  <span className="small">
                    <strong>{selectedOrig.size}</strong> selected · {order.length} {plural(order.length, 'page')} in document
                  </span>
                </>
              }
              right={
                <>
                  <Button variant="ghost" size="sm" icon="rotate" disabled={selectedOrig.size === 0 || busy} onClick={rotateSelected} aria-label="Rotate selected pages 90°">
                    Rotate 90°
                  </Button>
                  <Button variant="ghost" size="sm" disabled={selectedOrig.size === 0 || busy} onClick={() => contiguousMove(-1)} aria-label="Move selected pages left">
                    ← Move
                  </Button>
                  <Button variant="ghost" size="sm" disabled={selectedOrig.size === 0 || busy} onClick={() => contiguousMove(1)} aria-label="Move selected pages right">
                    Move →
                  </Button>
                  <Button variant="ghost" size="sm" disabled={selectedOrig.size === 0 || busy} onClick={() => moveToEnd('start')}>
                    To start
                  </Button>
                  <Button variant="ghost" size="sm" disabled={selectedOrig.size === 0 || busy} onClick={() => moveToEnd('end')}>
                    To end
                  </Button>
                  <Button variant="danger-ghost" size="sm" icon="trash" disabled={selectedOrig.size === 0 || busy} onClick={deleteSelected} aria-label="Delete selected pages">
                    Delete
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedOrig(new Set())}>Clear</Button>
                </>
              }
            />
            <div className="page-grid">
              {order.map((spec, pos) => (
                <PageThumb
                  key={`${spec.orig}-${pos}`}
                  spec={spec}
                  label={`Page ${pos + 1}`}
                  handle={handle}
                  selected={selectedOrig.has(spec.orig)}
                  onActivate={(e) => toggleSel(spec.orig, e.shiftKey || e.metaKey || e.ctrlKey)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggleSel(spec.orig, e.shiftKey);
                    }
                  }}
                  dragProps={{
                    draggable: !busy,
                    onDragStart: (e) => {
                      dragIndex.current = pos;
                      e.dataTransfer.effectAllowed = 'move';
                    },
                    onDragOver: (e) => e.preventDefault(),
                    onDrop: (e) => {
                      e.preventDefault();
                      const from = dragIndex.current;
                      dragIndex.current = null;
                      if (from === null || from === pos) return;
                      setOrder((prev) => {
                        const next = [...prev];
                        const [m] = next.splice(from, 1);
                        next.splice(pos, 0, m);
                        return next;
                      });
                    }
                  }}
                />
              ))}
            </div>
            <div className="page-action-bar">
              <span className="small muted">Tip: drag pages to reorder · click to select, Shift-click for a range, Ctrl/Cmd-click for several.</span>
              <Button variant="primary" size="lg" disabled={busy || unchanged} loading={busy} onClick={exportPdf} icon="download">
                {busy ? statusText : unchanged ? 'Reorder the pages first' : `Export reordered PDF (${order.length} ${plural(order.length, 'page')})`}
              </Button>
            </div>
          </>
        ) : null}
      </div>

      {result ? (
        <div className="panel result-card" role="status">
          <div className="result-card-head">
            <span className="result-ok-icon">
              <Icon name="checkCircle" size={20} />
            </span>
            <div>
              <h3 className="result-title">PDF ready</h3>
              <p className="result-sub muted small">{order.length} pages in their new order.</p>
            </div>
            <div className="result-card-actions">
              <OutRow doc={result} />
            </div>
          </div>
          <div className="result-actions">
            <Button variant="ghost" icon="refresh" onClick={() => setResult(null)}>
              Edit another PDF
            </Button>
          </div>
        </div>
      ) : null}
      <AdSlot position="pdf-tool" style={{ marginTop: 18 }} />
      <ToolSeoBlock def={def} />
    </div>
  );
}
