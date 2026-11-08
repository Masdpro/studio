'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, ImagePlus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const MAX_BYTES = 5 * 1024 * 1024;

interface ImageUploadFieldProps {
  value: string;
  onChange: (url: string) => void;
  /** Shown when there's no image yet. */
  emptyLabel?: string;
  /** Where the file is posted (admins and vendors have separate, permission-checked endpoints). */
  endpoint?: string;
}

/** Pick an image from the device; it uploads straight away and `onChange` receives its URL ('' when removed). */
export function ImageUploadField({ value, onChange, emptyLabel = 'No image yet', endpoint = '/api/admin/upload' }: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Not an image', description: 'Choose a JPG, PNG, GIF or WebP file.', variant: 'destructive' });
      return;
    }
    if (file.size > MAX_BYTES) {
      toast({ title: 'Image too large', description: 'The limit is 5 MB.', variant: 'destructive' });
      return;
    }
    setIsUploading(true);
    try {
      const body = new FormData();
      body.append('file', file);
      const res = await fetch(endpoint, { method: 'POST', body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Upload failed.');
      onChange(data.url);
    } catch (err) {
      toast({
        title: 'Upload failed',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  const uploadLabel = value ? 'Replace photo' : 'Upload photo';
  return (
    <div className="flex items-start gap-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isUploading}
        aria-label={uploadLabel}
        className="relative flex h-24 w-28 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted"
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="Preview" className="h-full w-full object-cover" />
        ) : (
          <span className="px-2 text-center text-xs text-muted-foreground">{emptyLabel}</span>
        )}
        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="hidden"
        data-testid="image-file-input"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      <div className="flex flex-col gap-1.5">
        <IconAction label={uploadLabel} hint="JPG, PNG, GIF or WebP, up to 5 MB" disabled={isUploading} onClick={() => inputRef.current?.click()}>
          <ImagePlus className="h-4 w-4" />
        </IconAction>
        {value && (
          <IconAction label="Remove photo" hint="Tap again to remove" confirm destructive disabled={isUploading} onClick={() => onChange('')}>
            <Trash2 className="h-4 w-4" />
          </IconAction>
        )}
      </div>
    </div>
  );
}

/**
 * A small icon-only button that names itself: the label shows on hover or keyboard focus, and on touch
 * screens it shows when tapped. With `confirm`, a touch tap first shows the label and a second tap acts.
 */
function IconAction({
  label,
  hint,
  confirm = false,
  destructive = false,
  disabled,
  onClick,
  children,
}: {
  label: string;
  hint?: string;
  confirm?: boolean;
  destructive?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const [show, setShow] = useState(false);
  const [armed, setArmed] = useState(false);
  const touch = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(timer.current), []);

  const flash = (ms: number) => {
    setShow(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setShow(false);
      setArmed(false);
    }, ms);
  };

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={label}
        title={label}
        disabled={disabled}
        onPointerDown={(e) => {
          touch.current = e.pointerType !== 'mouse';
        }}
        // Touch screens fire emulated mouse events around a tap; only real mice use hover.
        onPointerEnter={(e) => e.pointerType === 'mouse' && setShow(true)}
        onPointerLeave={(e) => {
          if (e.pointerType !== 'mouse') return;
          setShow(false);
          setArmed(false);
        }}
        onFocus={() => !touch.current && setShow(true)}
        onBlur={() => {
          setShow(false);
          setArmed(false);
        }}
        onClick={() => {
          if (touch.current && confirm && !armed) {
            setArmed(true);
            flash(2500);
            return;
          }
          if (touch.current) flash(1500);
          setArmed(false);
          onClick();
        }}
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-md border bg-background transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
          destructive && 'text-destructive hover:bg-destructive/10',
          armed && 'border-destructive bg-destructive/10',
        )}
      >
        {children}
      </button>
      {show && (
        <span
          role="tooltip"
          className="pointer-events-none absolute left-full top-1/2 z-20 ml-2 w-max max-w-[9.5rem] -translate-y-1/2 rounded-md bg-foreground px-2 py-1 text-xs leading-snug text-background shadow"
        >
          {armed && hint ? hint : label}
          {!armed && hint && !confirm && <span className="block opacity-75">{hint}</span>}
        </span>
      )}
    </div>
  );
}
