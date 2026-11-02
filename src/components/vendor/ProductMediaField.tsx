'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, ImagePlus, Video, Star, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { MAX_PRODUCT_IMAGES } from '@/lib/product-media';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_VIDEO_BYTES = 25 * 1024 * 1024;

interface ProductMediaFieldProps {
  /** All product photos in display order; the first one is the homepage photo. */
  images: string[];
  video: string;
  onChange: (images: string[], video: string) => void;
}

async function upload(endpoint: string, file: File): Promise<string> {
  const body = new FormData();
  body.append('file', file);
  const res = await fetch(endpoint, { method: 'POST', body });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? 'Upload failed.');
  return data.url as string;
}

/** Several product photos plus one optional video. Files upload as soon as they are picked. */
export function ProductMediaField({ images, video, onChange }: ProductMediaFieldProps) {
  const { toast } = useToast();
  const imageInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<'image' | 'video' | null>(null);
  // A camera-scanned photo is embedded rather than uploaded, so it has to stay the main photo.
  const hasEmbedded = images.some((u) => u.startsWith('data:'));

  const fail = (err: unknown) =>
    toast({ title: 'Upload failed', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });

  async function addImages(files: FileList) {
    const room = MAX_PRODUCT_IMAGES - images.length;
    const picked = Array.from(files).slice(0, Math.max(room, 0));
    if (files.length > picked.length) {
      toast({ title: `Up to ${MAX_PRODUCT_IMAGES} photos`, description: 'Extra photos were skipped.' });
    }
    setBusy('image');
    const added: string[] = [];
    for (const file of picked) {
      if (!file.type.startsWith('image/')) { toast({ title: 'Not an image', description: `${file.name} was skipped.`, variant: 'destructive' }); continue; }
      if (file.size > MAX_IMAGE_BYTES) { toast({ title: 'Image too large', description: `${file.name} is over 5 MB.`, variant: 'destructive' }); continue; }
      try { added.push(await upload('/api/vendor/upload', file)); } catch (err) { fail(err); }
    }
    if (added.length) onChange([...images, ...added], video);
    setBusy(null);
    if (imageInput.current) imageInput.current.value = '';
  }

  async function addVideo(file: File) {
    if (file.size > MAX_VIDEO_BYTES) { toast({ title: 'Video too large', description: 'The limit is 25 MB.', variant: 'destructive' }); return; }
    setBusy('video');
    try { onChange(images, await upload('/api/vendor/upload-video', file)); } catch (err) { fail(err); }
    setBusy(null);
    if (videoInput.current) videoInput.current.value = '';
  }

  const makeMain = (i: number) => onChange([images[i], ...images.filter((_, j) => j !== i)], video);
  const removeImage = (i: number) => onChange(images.filter((_, j) => j !== i), video);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {images.map((src, i) => (
          <div key={src.slice(0, 80) + i} className="relative h-20 w-20 overflow-hidden rounded-md border bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={`Product photo ${i + 1}`} className="h-full w-full object-cover" />
            {i === 0 ? (
              <span className="absolute bottom-0 inset-x-0 bg-primary/90 text-center text-[10px] font-semibold text-primary-foreground">Main</span>
            ) : (
              !hasEmbedded && (
                <button type="button" title="Make main photo" onClick={() => makeMain(i)} className="absolute bottom-1 left-1 rounded-full bg-black/60 p-1 text-white hover:bg-black/80">
                  <Star className="h-3 w-3" />
                </button>
              )
            )}
            <button type="button" title="Remove photo" onClick={() => removeImage(i)} className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white hover:bg-black/80">
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        {images.length < MAX_PRODUCT_IMAGES && (
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => imageInput.current?.click()}
            className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-md border border-dashed text-xs text-muted-foreground hover:bg-muted/50 disabled:opacity-60"
          >
            {busy === 'image' ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : <ImagePlus className="h-5 w-5" />}
            Add photos
          </button>
        )}
      </div>
      <input ref={imageInput} type="file" multiple accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={(e) => e.target.files && addImages(e.target.files)} />
      <p className="text-xs text-muted-foreground">
        Up to {MAX_PRODUCT_IMAGES} photos, 5 MB each. The first (Main) photo is shown on the homepage; customers see the rest when they open the product.
      </p>

      <div className="space-y-2">
        {video ? (
          <div className="flex items-start gap-3">
            <video src={video} controls preload="metadata" playsInline className="h-28 rounded-md border bg-black" />
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange(images, '')} className="text-destructive hover:bg-destructive/10">
              <X className="mr-1 h-4 w-4" /> Remove video
            </Button>
          </div>
        ) : (
          <Button type="button" variant="outline" size="sm" disabled={busy !== null} onClick={() => videoInput.current?.click()}>
            {busy === 'video' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Video className="mr-2 h-4 w-4" />}
            {busy === 'video' ? 'Uploading video…' : 'Add a video'}
          </Button>
        )}
        <input ref={videoInput} type="file" accept="video/mp4,video/webm" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) addVideo(f); }} />
        <p className="text-xs text-muted-foreground">One optional video, MP4 or WebM, up to 25 MB.</p>
      </div>
    </div>
  );
}
