'use client';

import { useRef, useState } from 'react';
import { ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

export type PortfolioItem = { id: string; imageUrl: string; caption: string | null };

const LIMIT = 12;

/**
 * Where a provider adds photos of past work to one service. Customers see them under "View portfolio",
 * so they know what kind of job to expect before booking.
 */
export function PortfolioDialog({ serviceId, serviceName, items, onClose, onChanged }: { serviceId: string; serviceName: string; items: PortfolioItem[]; onClose: () => void; onChanged: () => void }) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);
  const [captions, setCaptions] = useState<Record<string, string>>({});

  const fail = (title: string, err: unknown) => toast({ title, description: err instanceof Error ? err.message : undefined, variant: 'destructive' });

  async function addFiles(files: FileList | null) {
    if (!files?.length) return;
    const room = LIMIT - items.length;
    const list = Array.from(files).slice(0, Math.max(0, room));
    if (files.length > list.length) toast({ title: `A service can show up to ${LIMIT} photos`, description: list.length ? `Adding the first ${list.length}.` : 'Remove one to add another.' });
    for (const file of list) {
      setUploading((n) => n + 1);
      try {
        const fd = new FormData();
        fd.append('file', file);
        const up = await fetch('/api/provider/upload', { method: 'POST', body: fd });
        const u = await up.json().catch(() => ({}));
        if (!up.ok) throw new Error(u.error ?? 'Upload failed.');
        const res = await fetch(`/api/provider/services/${serviceId}/portfolio`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageUrl: u.url }) });
        const d = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(d.error ?? 'Could not add the photo.');
      } catch (err) {
        fail(`Couldn't add ${file.name}`, err);
      } finally {
        setUploading((n) => n - 1);
      }
    }
    if (fileRef.current) fileRef.current.value = '';
    onChanged();
  }

  async function saveCaption(item: PortfolioItem) {
    const caption = captions[item.id];
    if (caption === undefined || caption === (item.caption ?? '')) return;
    const res = await fetch(`/api/provider/portfolio/${item.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ caption }) });
    if (!res.ok) return fail('Caption not saved', new Error((await res.json().catch(() => ({}))).error));
    onChanged();
  }

  async function remove(item: PortfolioItem) {
    const res = await fetch(`/api/provider/portfolio/${item.id}`, { method: 'DELETE' });
    if (!res.ok) return fail('Could not remove the photo', new Error((await res.json().catch(() => ({}))).error));
    onChanged();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Portfolio: {serviceName}</DialogTitle>
          <DialogDescription>Photos of this kind of job you&apos;ve done before. Customers see them before they book. Up to {LIMIT} photos.</DialogDescription>
        </DialogHeader>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple className="hidden" onChange={(e) => addFiles(e.target.files)} />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {items.map((item) => (
            <figure key={item.id} className="space-y-1.5">
              <div className="relative aspect-square overflow-hidden rounded-lg border bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.imageUrl} alt={item.caption ?? serviceName} className="h-full w-full object-cover" />
                <Button size="icon" variant="secondary" className="absolute right-1.5 top-1.5 h-7 w-7" onClick={() => remove(item)} aria-label="Remove this photo"><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
              <Input
                className="h-8 text-xs"
                placeholder="Caption (optional)"
                maxLength={140}
                value={captions[item.id] ?? item.caption ?? ''}
                onChange={(e) => setCaptions((c) => ({ ...c, [item.id]: e.target.value }))}
                onBlur={() => saveCaption(item)}
                aria-label="Photo caption"
              />
            </figure>
          ))}
          {items.length < LIMIT && (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading > 0}
              className="flex aspect-square flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground disabled:opacity-60"
            >
              {uploading > 0 ? <Loader2 className="h-6 w-6 animate-spin" /> : <ImagePlus className="h-6 w-6" />}
              {uploading > 0 ? 'Uploading…' : 'Add photos'}
            </button>
          )}
        </div>
        {!items.length && !uploading && <p className="text-center text-xs text-muted-foreground">No photos yet. Services with photos of real work get booked more.</p>}
      </DialogContent>
    </Dialog>
  );
}
