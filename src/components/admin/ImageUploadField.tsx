'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, ImagePlus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const MAX_BYTES = 5 * 1024 * 1024;

interface ImageUploadFieldProps {
  value: string;
  onChange: (url: string) => void;
  /** Shown when there's no image yet. */
  emptyLabel?: string;
}

/** Pick an image from the device; it uploads straight away and `onChange` receives its URL ('' when removed). */
export function ImageUploadField({ value, onChange, emptyLabel = 'No image yet' }: ImageUploadFieldProps) {
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
      const res = await fetch('/api/admin/upload', { method: 'POST', body });
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

  return (
    <div className="flex items-center gap-4">
      <div className="relative h-24 w-32 shrink-0 overflow-hidden rounded-md border bg-muted flex items-center justify-center">
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
      </div>
      <div className="space-y-2">
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
        <Button type="button" variant="outline" size="sm" disabled={isUploading} onClick={() => inputRef.current?.click()}>
          <ImagePlus className="mr-2 h-4 w-4" />
          {value ? 'Replace image' : 'Upload image'}
        </Button>
        {value && (
          <Button type="button" variant="ghost" size="sm" disabled={isUploading} onClick={() => onChange('')}>
            <Trash2 className="mr-2 h-4 w-4" /> Remove
          </Button>
        )}
        <p className="text-xs text-muted-foreground">JPG, PNG, GIF or WebP, up to 5 MB.</p>
      </div>
    </div>
  );
}
