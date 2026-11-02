'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface ReasonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  placeholder?: string;
  onConfirm: (reason: string) => Promise<void>;
}

/** Asks for a short reason before an admin action that affects someone else (refund, suspension). */
export function ReasonDialog({ open, onOpenChange, title, description, confirmLabel, placeholder, onConfirm }: ReasonDialogProps) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) setReason(''); }, [open]);

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="admin-reason">Reason (they will see this)</Label>
          <Textarea id="admin-reason" value={reason} maxLength={200} placeholder={placeholder} onChange={(e) => setReason(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button
            variant="destructive"
            disabled={busy || reason.trim().length < 3}
            onClick={async () => {
              setBusy(true);
              try { await onConfirm(reason.trim()); } finally { setBusy(false); }
            }}
          >
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
