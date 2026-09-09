import {
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes
} from 'react';
import { Icon } from './icons';
import { useApp } from '../lib/app';
import type { IconName, ToastType } from '../lib/types';

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

/* ---------------------------------- buttons --------------------------------- */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'danger-ghost' | 'outline';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: IconName;
}

export function Button({
  variant = 'secondary',
  size = 'md',
  loading,
  icon,
  children,
  className,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn('btn', `btn-${variant}`, `btn-${size}`, className)}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? (
        <span className="btn-spinner" aria-hidden />
      ) : (
        icon && <Icon name={icon} size={size === 'sm' ? 15 : size === 'lg' ? 19 : 16} />
      )}
      {children}
    </button>
  );
}

export function IconBtn({
  icon,
  label,
  className,
  size = 20,
  active,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: IconName;
  label: string;
  size?: number;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      className={cn('icon-btn', active && 'icon-btn-active', className)}
      aria-label={label}
      title={label}
      {...rest}
    >
      <Icon name={icon} size={size} />
    </button>
  );
}

/* ---------------------------------- misc small --------------------------------- */

export function Spinner({ size = 18, className }: { size?: number; className?: string }) {
  return <span className={cn('spinner', className)} style={{ width: size, height: size }} aria-hidden />;
}

export function Tag({ children, tone }: { children: ReactNode; tone?: 'neutral' | 'accent' | 'ok' }) {
  return <span className={cn('tag', tone && `tag-${tone}`)}>{children}</span>;
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="kbd">{children}</kbd>;
}

export function ProgressBar({
  value,
  label,
  indeterminate
}: {
  value?: number;
  label?: ReactNode;
  indeterminate?: boolean;
}) {
  return (
    <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={indeterminate ? undefined : Math.round(value ?? 0)} aria-label={typeof label === 'string' ? label : undefined}>
      <div
        className={cn('progress-bar', indeterminate && 'progress-indeterminate')}
        style={indeterminate ? undefined : { width: `${Math.min(100, Math.max(0, value ?? 0))}%` }}
      />
      {label ? <div className="progress-label">{label}</div> : null}
    </div>
  );
}

export function Skeleton({ className, style }: { className?: string; style?: CSSProperties }) {
  return <div className={cn('skeleton', className)} style={style} aria-hidden />;
}

export function Notice({
  tone = 'info',
  title,
  children,
  action,
  icon
}: {
  tone?: 'info' | 'success' | 'warning' | 'error' | 'privacy';
  title?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  icon?: IconName;
}) {
  const iconName: IconName =
    icon ?? (tone === 'warning' ? 'warning' : tone === 'error' ? 'alert' : tone === 'success' ? 'checkCircle' : tone === 'privacy' ? 'lock' : 'info');
  return (
    <div className={cn('notice', `notice-${tone}`)} role={tone === 'error' ? 'alert' : undefined}>
      <span className="notice-icon">
        <Icon name={iconName} size={18} />
      </span>
      <div className="notice-body">
        {title ? <div className="notice-title">{title}</div> : null}
        {children ? <div className="notice-text">{children}</div> : null}
      </div>
      {action ? <div className="notice-action">{action}</div> : null}
    </div>
  );
}

/* ---------------------------------- form controls --------------------------------- */

interface FieldShellProps {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}

export function Field({ label, hint, error, htmlFor, children, className }: FieldShellProps) {
  return (
    <div className={cn('field', error ? 'field-invalid' : null, className)}>
      {label ? (
        <label className="field-label" htmlFor={htmlFor}>
          {label}
        </label>
      ) : null}
      {children}
      {error ? <div className="field-error">{error}</div> : null}
      {hint && !error ? <div className="field-hint">{hint}</div> : null}
    </div>
  );
}

export function TextInput({ className, invalid, ...rest }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return <input className={cn('input', invalid && 'input-invalid', className)} {...rest} />;
}

export function NumberInput({
  className,
  min,
  max,
  ...rest
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="number"
      className={cn('input input-number', className)}
      min={min}
      max={max}
      step={rest.step ?? 1}
      {...rest}
    />
  );
}

export function SelectInput({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className="select-wrap">
      <select className={cn('input select', className)} {...rest}>
        {children}
      </select>
      <Icon name="chevronDown" size={16} className="select-caret" />
    </span>
  );
}

export function TextArea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn('input textarea', className)} {...rest} />;
}

export function ColorInput({
  value,
  onChange,
  'aria-label': ariaLabel,
  className
}: {
  value: string;
  onChange: (value: string) => void;
  'aria-label'?: string;
  className?: string;
}) {
  const id = useId();
  return (
    <span className={cn('color-field', className)}>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={ariaLabel}
        className="color-input-native"
      />
      <span className="color-input-hex">{value.toUpperCase()}</span>
    </span>
  );
}

export function Checkbox({
  checked,
  onChange,
  label,
  description,
  disabled,
  ariaLabel
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  const id = useId();
  return (
    <div className={cn('check-row', disabled && 'is-disabled')}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        aria-label={ariaLabel}
        onChange={(e) => onChange(e.target.checked)}
        className="check-input"
      />
      <label htmlFor={id} className="check-label">
        <span className="check-box" aria-hidden>
          <Icon name="check" size={13} className="check-mark" />
        </span>
        {label ? (
          <span className="check-copy">
            <span className="check-title">{label}</span>
            {description ? <span className="check-desc">{description}</span> : null}
          </span>
        ) : null}
      </label>
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  description
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
}) {
  const id = useId();
  return (
    <div className="switch-row">
      <div className="switch-copy">
        <label className="switch-label" htmlFor={id}>
          {label}
        </label>
        {description ? <div className="switch-desc">{description}</div> : null}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        className={cn('switch', checked && 'switch-on')}
        onClick={() => onChange(!checked)}
      >
        <span className="switch-knob" />
      </button>
    </div>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  full
}: {
  options: Array<{ value: T; label: ReactNode }>;
  value: T;
  onChange: (value: T) => void;
  label?: string;
  full?: boolean;
}) {
  const id = useId();
  return (
    <div className="seg" role={label ? 'group' : undefined} aria-label={label ?? undefined}>
      {label ? (
        <div className="seg-title" id={id}>
          {label}
        </div>
      ) : null}
      <div className={cn('seg-buttons', full && 'seg-full')} role="radiogroup" aria-labelledby={label ? id : undefined}>
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={value === opt.value}
            className={cn('seg-btn', value === opt.value && 'seg-btn-active')}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function RangeInput({
  value,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  label,
  format,
  ariaLabel
}: {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (v: number) => void;
  label?: string;
  format?: (v: number) => string;
  ariaLabel?: string;
}) {
  return (
    <div className="range-row">
      <input
        type="range"
        className="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={ariaLabel ?? label}
      />
      <span className="range-value">{format ? format(value) : value}</span>
    </div>
  );
}

export function PresetChips<T extends string>({
  options,
  value,
  onChange,
  allowNone
}: {
  options: Array<{ value: T; label: string }>;
  value: T | null;
  onChange: (v: T | null) => void;
  allowNone?: boolean;
}) {
  return (
    <div className="chips">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          className={cn('chip', value === o.value && 'chip-active')}
          onClick={() => onChange(value === o.value && allowNone ? null : o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ---------------------------------- overlays --------------------------------- */

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  labelledBy,
  width
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  labelledBy?: string;
  width?: 'sm' | 'md';
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.classList.add('modal-open');
    const prev = document.activeElement as HTMLElement | null;
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.classList.remove('modal-open');
      prev?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className={cn('modal', `modal-${width ?? 'md'}`)}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
      >
        {title ? <div className="modal-head">{title}</div> : null}
        <div className="modal-body">{children}</div>
        {footer ? <div className="modal-foot">{footer}</div> : null}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'danger',
  onConfirm,
  onClose
}: {
  open: boolean;
  title: string;
  body: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'primary';
  onConfirm: () => void;
  onClose: () => void;
}) {
  const titleId = useId();
  return (
    <Modal open={open} onClose={onClose} width="sm" labelledBy={titleId}>
      <h3 className="modal-title" id={titleId}>
        {title}
      </h3>
      <div className="modal-text">{body}</div>
      <div className="modal-actions">
        <Button variant="ghost" onClick={onClose} autoFocus>
          {cancelLabel}
        </Button>
        <Button
          variant={tone === 'danger' ? 'danger' : 'primary'}
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}

export function EmptyState({
  icon,
  title,
  children,
  action
}: {
  icon: IconName;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <Icon name={icon} size={26} />
      </div>
      <h3 className="empty-title">{title}</h3>
      {children ? <div className="empty-text">{children}</div> : null}
      {action ? <div className="empty-actions">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  title,
  children,
  action
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="error-state" role="alert">
      <div className="error-icon">
        <Icon name="warning" size={24} />
      </div>
      <h3 className="error-title">{title}</h3>
      {children ? <div className="error-text">{children}</div> : null}
      {action ? <div className="error-actions">{action}</div> : null}
    </div>
  );
}

/* ---------------------------------- misc UI --------------------------------- */

export function CopyButton({
  text,
  label = 'Copy',
  copiedLabel = 'Copied',
  size = 'sm',
  variant = 'ghost',
  onCopy
}: {
  text: string;
  label?: string;
  copiedLabel?: string;
  size?: 'sm' | 'md';
  variant?: ButtonVariant;
  onCopy?: () => void;
}) {
  const { notify } = useApp();
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      onCopy?.();
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1600);
    } catch {
      notify('error', "Couldn't copy", 'Your browser blocked clipboard access. Select and copy manually.');
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={copy}
      className={cn(copied && 'btn-copied')}
      icon={copied ? 'check' : 'copy'}
    >
      {copied ? copiedLabel : label}
    </Button>
  );
}

export function NotifyProviderToast({ type, title, message }: { type: ToastType; title: string; message?: string }) {
  return (
    <div className="toast-content">
      <Icon name={type === 'error' ? 'alert' : type === 'success' ? 'checkCircle' : 'info'} size={18} />
      <div className="toast-copy">
        <div className="toast-title">{title}</div>
        {message ? <div className="toast-message">{message}</div> : null}
      </div>
    </div>
  );
}
