import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const LOOK: Record<string, { word: string; cls: string }> = {
  Requested: { word: 'Awaiting reply', cls: 'bg-amber-100 text-amber-900 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30' },
  Confirmed: { word: 'Confirmed', cls: 'bg-emerald-100 text-emerald-900 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30' },
  Completed: { word: 'Completed', cls: 'bg-muted text-foreground' },
  Declined: { word: 'Declined', cls: 'bg-muted text-muted-foreground' },
  Expired: { word: 'Not answered', cls: 'bg-muted text-muted-foreground' },
  Cancelled: { word: 'Cancelled', cls: 'bg-muted text-muted-foreground' },
  NoShow: { word: 'No-show', cls: 'bg-red-100 text-red-900 border-red-200 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/30' },
};

export function BookingStatusBadge({ status }: { status: string }) {
  const l = LOOK[status] ?? { word: status, cls: '' };
  return <Badge variant="outline" className={cn('whitespace-nowrap', l.cls)}>{l.word}</Badge>;
}
