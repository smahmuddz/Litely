import { useEffect, useMemo, useRef, useState } from 'react';
import { ToolHeader, PrivacyPill, ToolSeoBlock, AdSlot } from '../../components/sections';
import { Icon } from '../../components/icons';
import {
  Button,
  Checkbox,
  ColorInput,
  Field,
  Notice,
  NumberInput,
  RangeInput,
  Segmented,
  SelectInput,
  TextArea,
  TextInput,
  cn
} from '../../components/ui';
import { useApp } from '../../lib/app';
import { TOOL_BY_ID } from '../../lib/registry';
import {
  buildQrPayload,
  canvasToPngBlob,
  makeMatrix,
  renderQrCanvas,
  renderQrSvg,
  type QrContent,
  type QrWifiSecurity
} from '../../lib/qr';
import { contrastRatio, isHexColor, normalizeHex } from '../../lib/color';
import { downloadBlob } from '../../lib/format';
import type { IconName } from '../../lib/types';
import type { QrErrorLevel, QrType } from '../../lib/types';

const QR_TYPES: Array<{ value: QrType; label: string; icon: IconName }> = [
  { value: 'url', label: 'Link', icon: 'link' },
  { value: 'text', label: 'Text', icon: 'file' },
  { value: 'email', label: 'Email', icon: 'mail' },
  { value: 'phone', label: 'Phone', icon: 'phone' },
  { value: 'sms', label: 'SMS', icon: 'message' },
  { value: 'wifi', label: 'Wi-Fi', icon: 'wifi' },
  { value: 'contact', label: 'Contact', icon: 'contact' },
  { value: 'calendar', label: 'Event', icon: 'calendar' }
];

interface ModeState {
  url: string;
  text: string;
  emailTo: string;
  subject: string;
  body: string;
  phone: string;
  smsNumber: string;
  smsBody: string;
  wifiSsid: string;
  wifiPassword: string;
  wifiSecurity: QrWifiSecurity;
  wifiHidden: boolean;
  contactFirst: string;
  contactLast: string;
  contactOrg: string;
  contactPhone: string;
  contactEmail: string;
  contactWebsite: string;
  contactAddress: string;
  calTitle: string;
  calStart: string;
  calEnd: string;
  calLocation: string;
  calDesc: string;
}

const EMPTY: ModeState = {
  url: '',
  text: '',
  emailTo: '',
  subject: '',
  body: '',
  phone: '',
  smsNumber: '',
  smsBody: '',
  wifiSsid: '',
  wifiPassword: '',
  wifiSecurity: 'WPA',
  wifiHidden: false,
  contactFirst: '',
  contactLast: '',
  contactOrg: '',
  contactPhone: '',
  contactEmail: '',
  contactWebsite: '',
  contactAddress: '',
  calTitle: '',
  calStart: '',
  calEnd: '',
  calLocation: '',
  calDesc: ''
};

const nowLocal = () => {
  const d = new Date(Date.now() + 24 * 3600 * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T09:00`;
};

function initState(): ModeState {
  const oneHour = Date.now() + 3600 * 1000;
  const start = new Date(oneHour);
  const end = new Date(oneHour + 3600 * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    ...EMPTY,
    calStart: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}T${pad(start.getHours())}:${pad(start.getMinutes())}`,
    calEnd: `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}T${pad(end.getHours())}:${pad(end.getMinutes())}`
  };
}

function validateContent(kind: QrType, s: ModeState): { error: string | null; content: QrContent | null } {
  switch (kind) {
    case 'url': {
      const value = s.url.trim();
      if (!value) return { error: 'Enter a URL.', content: null };
      try {
        const u = new URL(value);
        if (u.protocol !== 'http:' && u.protocol !== 'https:') {
          return { error: 'Use a full http:// or https:// link.', content: null };
        }
        return { error: null, content: { kind: 'url', url: value } };
      } catch {
        return { error: "That isn't a valid URL  -  include the full address, e.g. https://example.com/page.", content: null };
      }
    }
    case 'text': {
      if (!s.text.trim()) return { error: 'Type something first.', content: null };
      return { error: null, content: { kind: 'text', text: s.text } };
    }
    case 'email': {
      const to = s.emailTo.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
        return { error: 'Enter a valid email address.', content: null };
      }
      return { error: null, content: { kind: 'email', to, subject: s.subject, body: s.body } };
    }
    case 'phone': {
      const n = s.phone.trim();
      if (!/^\+?[\d\s().-]{3,25}$/.test(n)) {
        return { error: 'Enter a phone number with country code, e.g. +1 555 123 4567.', content: null };
      }
      return { error: null, content: { kind: 'phone', number: n } };
    }
    case 'sms': {
      const n = s.smsNumber.trim();
      if (!/^\+?[\d\s().-]{3,25}$/.test(n)) {
        return { error: 'Enter a phone number for the SMS.', content: null };
      }
      return { error: null, content: { kind: 'sms', number: n, body: s.smsBody } };
    }
    case 'wifi': {
      if (!s.wifiSsid.trim()) return { error: 'Enter the network name (SSID).', content: null };
      if (s.wifiSecurity !== 'nopass' && s.wifiPassword.length === 0) {
        return { error: 'Enter the Wi-Fi password, or set security to “None”.', content: null };
      }
      return {
        error: null,
        content: {
          kind: 'wifi',
          ssid: s.wifiSsid,
          password: s.wifiPassword,
          security: s.wifiSecurity,
          hidden: s.wifiHidden
        }
      };
    }
    case 'contact': {
      const any =
        s.contactFirst.trim() ||
        s.contactLast.trim() ||
        s.contactOrg.trim() ||
        s.contactPhone.trim() ||
        s.contactEmail.trim() ||
        s.contactWebsite.trim() ||
        s.contactAddress.trim();
      if (!any) return { error: 'Add at least one contact detail.', content: null };
      return {
        error: null,
        content: {
          kind: 'contact',
          first: s.contactFirst,
          last: s.contactLast,
          org: s.contactOrg,
          phone: s.contactPhone,
          email: s.contactEmail,
          website: s.contactWebsite,
          address: s.contactAddress
        }
      };
    }
    case 'calendar': {
      if (!s.calTitle.trim()) return { error: 'Give the event a title.', content: null };
      if (!s.calStart) return { error: 'Pick a start date and time.', content: null };
      if (s.calEnd && s.calEnd < s.calStart) {
        return { error: 'The event ends before it starts.', content: null };
      }
      return {
        error: null,
        content: {
          kind: 'calendar',
          title: s.calTitle,
          start: s.calStart,
          end: s.calEnd || s.calStart,
          location: s.calLocation,
          description: s.calDesc
        }
      };
    }
  }
}

export function QrPage() {
  const def = TOOL_BY_ID['qr-generator'];
  const { notify } = useApp();
  const [kind, setKind] = useState<QrType>('url');
  const [state, setState] = useState<ModeState>(initState);
  const [errorLevel, setErrorLevel] = useState<QrErrorLevel>('M');
  const [margin, setMargin] = useState(2);
  const [size, setSize] = useState(640);
  const [fg, setFg] = useState('#0f1115');
  const [bg, setBg] = useState('#ffffff');
  const [rounded, setRounded] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastCanvas = useRef<HTMLCanvasElement | null>(null);

  const update = (patch: Partial<ModeState>) => setState((prev) => ({ ...prev, ...patch }));

  const { error, content } = useMemo(
    () => validateContent(kind, state),
    [kind, state]
  );

  const payload = useMemo(() => {
    if (error || !content) return null;
    return buildQrPayload(content);
  }, [error, content]);

  const contrast = useMemo(() => {
    if (!isHexColor(fg) || !isHexColor(bg)) return 1;
    return contrastRatio(fg, bg);
  }, [fg, bg]);

  const badColor = isHexColor(fg) && isHexColor(bg) && contrast < 2.1;

  const matrix = useMemo(() => {
    if (!payload) return null;
    try {
      return makeMatrix(payload, errorLevel);
    } catch {
      return null;
    }
  }, [payload, errorLevel]);

  useEffect(() => {
    if (!matrix) return;
    const style = { size: Math.max(128, Math.min(1024, size)), margin, errorLevel, fg: normalizeHex(fg) ?? '#000000', bg: normalizeHex(bg) ?? '#ffffff', rounded };
    const canvas = renderQrCanvas(matrix.qr, style);
    lastCanvas.current = canvas;
    const host = canvasRef.current;
    if (host) {
      host.width = canvas.width;
      host.height = canvas.height;
      const ctx = host.getContext('2d');
      ctx?.drawImage(canvas, 0, 0);
    }
  }, [matrix, size, margin, errorLevel, fg, bg, rounded]);

  const copyImage = async () => {
    const canvas = lastCanvas.current;
    if (!canvas) return;
    try {
      const blob = await canvasToPngBlob(canvas);
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      notify('success', 'QR code copied', 'Paste it anywhere with Ctrl/⌘+V.');
    } catch {
      notify('error', 'Copy failed', 'Your browser blocked clipboard image access  -  download the PNG instead.');
    }
  };

  const downloadPng = async () => {
    const canvas = lastCanvas.current;
    if (!canvas) return;
    const blob = await canvasToPngBlob(canvas);
    downloadBlob(blob, 'litely-qr-code.png');
    notify('success', 'Download started', 'litely-qr-code.png');
  };

  const downloadSvg = () => {
    if (!matrix || !payload) return;
    const style = { size: Math.max(128, Math.min(1024, size)), margin, errorLevel, fg: normalizeHex(fg) ?? '#000000', bg: normalizeHex(bg) ?? '#ffffff', rounded };
    const svg = renderQrSvg(matrix.qr, style);
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    downloadBlob(blob, 'litely-qr-code.svg');
    notify('success', 'SVG downloaded');
  };

  const copyPayload = async () => {
    if (!payload) return;
    await navigator.clipboard.writeText(payload);
    notify('success', 'Encoded content copied');
  };

  const contentLength = payload?.length ?? 0;

  return (
    <div className="container tool-page">
      <ToolHeader def={def}>
        <PrivacyPill />
      </ToolHeader>
      <div className="qr-layout">
        <div className="panel qr-controls">
          <div className="panel-title">
            <Icon name="qr" size={16} /> Content
          </div>

          <div className="qr-types">
            {QR_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                aria-pressed={kind === t.value}
                className={cn('qr-type', kind === t.value && 'qr-type-active')}
                onClick={() => setKind(t.value)}
              >
                <Icon name={t.icon} size={17} />
                {t.label}
              </button>
            ))}
          </div>

          {kind === 'url' ? (
            <Field label="Website URL" hint="Needs the full address, including https://." error={kind === 'url' && error ? error : undefined}>
              <TextInput value={state.url} onChange={(e) => update({ url: e.target.value })} placeholder="https://example.com" inputMode="url" aria-label="Website URL" />
            </Field>
          ) : null}

          {kind === 'text' ? (
            <Field label="Text content" hint="Scanners decode this verbatim  -  keep it short enough to scan reliably." error={kind === 'text' && error ? error : undefined}>
              <TextArea value={state.text} onChange={(e) => update({ text: e.target.value })} rows={4} aria-label="Text content" />
            </Field>
          ) : null}

          {kind === 'email' ? (
            <div className="opt-grid">
              <Field label="To" error={kind === 'email' && error ? error : undefined}>
                <TextInput value={state.emailTo} onChange={(e) => update({ emailTo: e.target.value })} placeholder="you@example.com" inputMode="email" aria-label="Email recipient" />
              </Field>
              <Field label="Subject">
                <TextInput value={state.subject} onChange={(e) => update({ subject: e.target.value })} aria-label="Email subject" />
              </Field>
              <Field label="Body" className="opt-span">
                <TextArea value={state.body} onChange={(e) => update({ body: e.target.value })} rows={3} aria-label="Email body" />
              </Field>
            </div>
          ) : null}

          {kind === 'phone' ? (
            <Field label="Phone number" hint="Use the international format, e.g. +1 555 123 4567." error={kind === 'phone' && error ? error : undefined}>
              <TextInput value={state.phone} onChange={(e) => update({ phone: e.target.value })} placeholder="+1 555 123 4567" inputMode="tel" aria-label="Phone number" />
            </Field>
          ) : null}

          {kind === 'sms' ? (
            <div className="opt-grid">
              <Field label="Phone number" error={kind === 'sms' && error ? error : undefined}>
                <TextInput value={state.smsNumber} onChange={(e) => update({ smsNumber: e.target.value })} placeholder="+1 555 123 4567" inputMode="tel" aria-label="SMS phone number" />
              </Field>
              <Field label="Message" className="opt-span">
                <TextArea value={state.smsBody} onChange={(e) => update({ smsBody: e.target.value })} rows={3} aria-label="SMS body" />
              </Field>
            </div>
          ) : null}

          {kind === 'wifi' ? (
            <div className="opt-grid">
              <Field label="Network name (SSID)" error={kind === 'wifi' && error ? error : undefined} className="opt-span">
                <TextInput value={state.wifiSsid} onChange={(e) => update({ wifiSsid: e.target.value })} placeholder="MyNetwork" aria-label="Wi-Fi network name" />
              </Field>
              <Field label="Security type">
                <SelectInput value={state.wifiSecurity} onChange={(e) => update({ wifiSecurity: e.target.value as QrWifiSecurity })} aria-label="Wi-Fi security type">
                  <option value="WPA">WPA / WPA2 / WPA3</option>
                  <option value="WEP">WEP</option>
                  <option value="nopass">None (open)</option>
                </SelectInput>
              </Field>
              <Field label="Password">
                <TextInput value={state.wifiPassword} onChange={(e) => update({ wifiPassword: e.target.value })} placeholder="••••••••••••" aria-label="Wi-Fi password" type={state.wifiPassword ? 'text' : 'password'} />
              </Field>
              <Checkbox
                checked={state.wifiHidden}
                onChange={(v) => update({ wifiHidden: v })}
                label="Hidden network"
                description="Adds the hidden-network flag used by some routers."
              />
            </div>
          ) : null}

          {kind === 'contact' ? (
            <div className="opt-grid">
              <Field label="First name">
                <TextInput value={state.contactFirst} onChange={(e) => update({ contactFirst: e.target.value })} aria-label="First name" />
              </Field>
              <Field label="Last name">
                <TextInput value={state.contactLast} onChange={(e) => update({ contactLast: e.target.value })} aria-label="Last name" />
              </Field>
              <Field label="Organization">
                <TextInput value={state.contactOrg} onChange={(e) => update({ contactOrg: e.target.value })} aria-label="Organization" />
              </Field>
              <Field label="Phone">
                <TextInput value={state.contactPhone} onChange={(e) => update({ contactPhone: e.target.value })} inputMode="tel" aria-label="Contact phone" />
              </Field>
              <Field label="Email">
                <TextInput value={state.contactEmail} onChange={(e) => update({ contactEmail: e.target.value })} inputMode="email" aria-label="Contact email" />
              </Field>
              <Field label="Website">
                <TextInput value={state.contactWebsite} onChange={(e) => update({ contactWebsite: e.target.value })} inputMode="url" aria-label="Contact website" />
              </Field>
              <Field label="Address" className="opt-span">
                <TextInput value={state.contactAddress} onChange={(e) => update({ contactAddress: e.target.value })} aria-label="Contact address" />
              </Field>
              {kind === 'contact' && error ? <Notice tone="error" title="Check your contact details">{error}</Notice> : null}
            </div>
          ) : null}

          {kind === 'calendar' ? (
            <div className="opt-grid">
              <Field label="Event title" className="opt-span" error={kind === 'calendar' && error ? error : undefined}>
                <TextInput value={state.calTitle} onChange={(e) => update({ calTitle: e.target.value })} aria-label="Event title" />
              </Field>
              <Field label="Starts">
                <TextInput type="datetime-local" value={state.calStart} onChange={(e) => update({ calStart: e.target.value })} aria-label="Event start" />
              </Field>
              <Field label="Ends">
                <TextInput type="datetime-local" value={state.calEnd} onChange={(e) => update({ calEnd: e.target.value })} aria-label="Event end" />
              </Field>
              <Field label="Location">
                <TextInput value={state.calLocation} onChange={(e) => update({ calLocation: e.target.value })} aria-label="Event location" />
              </Field>
              <Field label="Description" className="opt-span">
                <TextArea value={state.calDesc} onChange={(e) => update({ calDesc: e.target.value })} rows={2} aria-label="Event description" />
              </Field>
            </div>
          ) : null}

          <div className="panel-title" style={{ marginTop: 18 }}>
            <Icon name="settings" size={16} /> Style
          </div>

          <div className="opt-grid">
            <Field label="Foreground color">
              <ColorInput value={fg} onChange={(v) => isHexColor(v) && setFg(v)} aria-label="QR foreground color" />
            </Field>
            <Field label="Background color">
              <ColorInput value={bg} onChange={(v) => isHexColor(v) && setBg(v)} aria-label="QR background color" />
            </Field>
          </div>

          <Field label="Size" hint="Preview stays crisp; PNG/SVG export at this pixel size.">
            <RangeInput value={size} min={160} max={1024} step={32} onChange={setSize} format={(v) => `${v}px`} label="Size" />
          </Field>

          <div className="opt-grid">
            <Field label="Error correction">
              <SelectInput value={errorLevel} onChange={(e) => setErrorLevel(e.target.value as QrErrorLevel)} aria-label="Error correction">
                <option value="L">L · 7% recovery</option>
                <option value="M">M · 15% recovery</option>
                <option value="Q">Q · 25% recovery</option>
                <option value="H">H · 30% recovery</option>
              </SelectInput>
            </Field>
            <Field label="Quiet zone">
              <SelectInput value={margin} onChange={(e) => setMargin(Number(e.target.value))} aria-label="Quiet zone margin">
                {[0, 1, 2, 3, 4].map((m) => (
                  <option key={m} value={m}>
                    {m} module{m > 1 ? 's' : ''}
                  </option>
                ))}
              </SelectInput>
            </Field>
          </div>

          <Checkbox
            checked={rounded}
            onChange={setRounded}
            label="Rounded modules"
            description="Softens the dots. Keep plenty of contrast so scanners still read it."
          />

          {badColor ? (
            <Notice tone="warning" title="Low contrast">
              These two colors will be hard for phone cameras to read. Use a dark code on a light
              background (or vice-versa).
            </Notice>
          ) : null}
          {payload && contentLength > 700 ? (
            <Notice tone="warning" title="Long content">
              This content is {contentLength} characters. Very long QR codes are dense and harder
              to scan  -  use a larger size and higher error correction.
            </Notice>
          ) : null}
        </div>

        <div className="qr-preview-col">
          <div className="panel qr-preview-panel">
            <div className="qr-preview-wrap" style={badColor ? { filter: 'saturate(0.6)' } : undefined}>
              {payload && matrix ? (
                <canvas
                  ref={canvasRef}
                  className="qr-canvas"
                  role="img"
                  aria-label={`QR code preview encoding ${payload.slice(0, 80)}`}
                  style={{ width: 'min(100%, 360px)', aspectRatio: '1 / 1' }}
                />
              ) : (
                <div className="qr-empty">
                  <Icon name="qr" size={34} />
                  <p>Your QR code will appear here as you type.</p>
                  {error ? <span className="danger-text small">{error}</span> : null}
                </div>
              )}
            </div>
            {payload ? (
              <div className="qr-enc">
                <span className="small muted">Encoded content</span>
                <code className="qr-enc-value">{payload}</code>
                <Button variant="ghost" size="sm" icon="copy" onClick={() => void copyPayload()}>
                  Copy content
                </Button>
              </div>
            ) : null}
          </div>

          {payload && matrix ? (
            <div className="panel qr-export">
              <div className="panel-title">
                <Icon name="download" size={16} /> Export
              </div>
              <div className="qr-export-actions">
                <Button variant="primary" icon="download" onClick={() => void downloadPng()}>
                  PNG
                </Button>
                <Button variant="secondary" icon="download" onClick={downloadSvg}>
                  SVG
                </Button>
                <Button variant="secondary" icon="copy" onClick={() => void copyImage()}>
                  Copy image
                </Button>
              </div>
              <div className="qr-filename small muted mono">litely-qr-code.png / .svg</div>
            </div>
          ) : null}
          <AdSlot position="qr-tool" />
        </div>
      </div>
      <ToolSeoBlock def={def} />
    </div>
  );
}
