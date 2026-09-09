import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Icon } from './icons';
import { cn } from './ui';
import type { IconName } from '../lib/types';

interface DropzoneProps {
  onFiles: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  formats?: string[];
  hint?: string;
  title?: string;
  sub?: string;
  icon?: IconName;
  className?: string;
  disabled?: boolean;
}

export function Dropzone({
  onFiles,
  accept,
  multiple = true,
  formats,
  hint,
  title,
  sub,
  icon = 'upload',
  className,
  disabled
}: DropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [active, setActive] = useState(false);
  const dragDepth = useRef(0);

  const openPicker = () => inputRef.current?.click();

  const handleFiles = (list: FileList | File[] | null) => {
    if (!list) return;
    const files = Array.from(list);
    if (files.length) onFiles(files);
  };

  useEffect(() => {
    if (disabled) return;
    const prevent = (e: DragEvent) => e.preventDefault();
    window.addEventListener('dragover', prevent);
    window.addEventListener('drop', prevent);
    return () => {
      window.removeEventListener('dragover', prevent);
      window.removeEventListener('drop', prevent);
    };
  }, [disabled]);

  return (
    <div
      className={cn('dropzone', active && 'dz-active', disabled && 'dz-disabled', className)}
      onClick={openPicker}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
          e.preventDefault();
          openPicker();
        }
      }}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled || undefined}
      aria-label={title ?? 'Choose files'}
      onDragEnter={(e) => {
        e.preventDefault();
        dragDepth.current++;
        setActive(true);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={(e) => {
        e.preventDefault();
        dragDepth.current--;
        if (dragDepth.current <= 0) {
          dragDepth.current = 0;
          setActive(false);
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        dragDepth.current = 0;
        setActive(false);
        if (!disabled) handleFiles(e.dataTransfer.files);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        className="visually-hidden"
        accept={accept}
        multiple={multiple}
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = '';
        }}
        tabIndex={-1}
        aria-hidden
      />
      <span className="dz-icon" aria-hidden>
        <Icon name={icon} size={28} />
      </span>
      <span className="dz-title">{title ?? (multiple ? 'Drop files here' : 'Drop a file here')}</span>
      <span className="dz-sub">
        {sub ?? (
          <>
            or <span className="dz-link">choose files</span> from your device
          </>
        )}
      </span>
      {formats && formats.length ? (
        <span className="dz-formats">
          {formats.map((f) => (
            <span key={f} className="tag">
              {f}
            </span>
          ))}
        </span>
      ) : null}
      {hint ? <span className="dz-hint">{hint}</span> : null}
    </div>
  );
}

/** Adds a global paste listener that forwards image files dropped from the clipboard. */
export function useImagePaste(enabled: boolean, onFiles: (files: File[]) => void): boolean {
  useEffect(() => {
    if (!enabled) return;
    const onPaste = (e: ClipboardEvent) => {
      if (!e.clipboardData) return;
      const items = Array.from(e.clipboardData.items);
      const files = items
        .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
        .map((item) => item.getAsFile())
        .filter((f): f is File => f !== null);
      if (files.length) {
        e.preventDefault();
        onFiles(files);
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [enabled, onFiles]);
  return enabled;
}

export function TooltipHint({ children }: { children: ReactNode }) {
  return <span className="tip-text">{children}</span>;
}
