'use client';

import { useEffect, useState } from 'react';
import { Check, Copy, Link2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

/** The vendor's own Closebuy link, for those without a website of their own. */
export function StoreLinkCard({ slug, onSaved }: { slug?: string; onSaved: () => void }) {
  const { toast } = useToast();
  const [value, setValue] = useState(slug ?? '');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  useEffect(() => setValue(slug ?? ''), [slug]);
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const url = slug ? `${origin}/s/${slug}` : '';

  async function save() {
    setSaving(true);
    try {
      const res = await fetch('/api/vendor/profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug: value }) });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: 'Could not save.' }));
        toast({ variant: 'destructive', title: 'Link not saved', description: error });
      } else {
        toast({ title: 'Store link updated' });
        onSaved();
      }
    } finally {
      setSaving(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl">
          <Link2 className="h-6 w-6 text-primary" />
          Your store link
        </CardTitle>
        <CardDescription>
          No website? Share this link instead. Customers who open it see only your products.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {url && (
          <div className="flex items-center gap-2">
            <Input readOnly value={url} onFocus={(e) => e.currentTarget.select()} />
            <Button type="button" variant="outline" onClick={copy}>
              {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">/s/</span>
          <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="your-business-name" />
          <Button type="button" onClick={save} disabled={saving || !value.trim() || value === slug}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Change link
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
