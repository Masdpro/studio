import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const LOOK: Record<string, { word: string; cls: string }> = {
  Requested: { word: 'Waiting for vendor', cls: 'bg-amber-100 text-amber-900 border-amber-200' },
  Confirmed: { word: 'Confirmed', cls: 'bg-emerald-100 text-emerald-900 border-emerald-200' },
  Completed: { word: 'Completed', cls: 'bg-muted text-foreground' },
  Declined: { word: 'Declined', cls: 'bg-muted text-muted-foreground' },
  Expired: { word: 'Not answered', cls: 'bg-muted text-muted-foreground' },
  Cancelled: { word: 'Cancelled', cls: 'bg-muted text-muted-foreground' },
  NoShow: { word: 'No-show', cls: 'bg-red-100 text-red-900 border-red-200' },
};

export function BookingStatusBadge({ status }: { status: string }) {
  const l = LOOK[status] ?? { word: status, cls: '' };
  return <Badge variant="outline" className={cn('whitespace-nowrap', l.cls)}>{l.word}</Badge>;
}
