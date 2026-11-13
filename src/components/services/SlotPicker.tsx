'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { dayLabel } from '@/lib/booking-time';

type Slot = { startsAt: number; label: string };

/** Pick a day, then one of the free times that day. */
export function SlotPicker({ serviceId, dates, value, onChange, movingBookingId }: {
  serviceId: string; dates: string[]; value: number | null; onChange: (startsAt: number | null) => void; movingBookingId?: string;
}) {
  const [date, setDate] = useState(dates[0] ?? '');
  const [slots, setSlots] = useState<Slot[] | null>(null);

  useEffect(() => {
    if (!date) return;
    let live = true;
    setSlots(null);
    onChange(null);
    fetch(`/api/services/${serviceId}/slots?date=${date}${movingBookingId ? `&booking=${movingBookingId}` : ''}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => live && setSlots(d.slots ?? []))
      .catch(() => live && setSlots([]));
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, serviceId, movingBookingId]);

  if (!dates.length) return <p className="text-sm text-muted-foreground">No days are open for booking right now.</p>;
  return (
    <div className="min-w-0 space-y-3">
      <div className="flex max-w-full gap-2 overflow-x-auto pb-1" role="listbox" aria-label="Day">
        {dates.map((d) => (
          <button key={d} type="button" role="option" aria-selected={d === date} onClick={() => setDate(d)}
            className={cn('shrink-0 rounded-md border px-3 py-2 text-sm', d === date ? 'border-primary bg-primary text-primary-foreground' : 'bg-background hover:bg-muted')}>
            {dayLabel(d)}
          </button>
        ))}
      </div>
      {slots === null ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Finding free times…</p>
      ) : slots.length === 0 ? (
        <p className="text-sm text-muted-foreground">No free times that day. Try another day.</p>
      ) : (
        <div className="grid grid-cols-4 gap-2" role="listbox" aria-label="Time">
          {slots.map((s) => (
            <button key={s.startsAt} type="button" role="option" aria-selected={value === s.startsAt} onClick={() => onChange(s.startsAt)}
              className={cn('rounded-md border px-2 py-2 text-sm tabular-nums', value === s.startsAt ? 'border-primary bg-primary text-primary-foreground' : 'bg-background hover:bg-muted')}>
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
