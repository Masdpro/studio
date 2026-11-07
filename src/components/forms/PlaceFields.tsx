'use client';

import { forwardRef, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { COUNTRIES, citySuggestionsFor } from '@/lib/places';
import { DAYS, HOURS_PRESETS, TIME_OPTIONS, formatHours, parseHours, to12h, type Day, type HoursRow } from '@/lib/opening-hours';
import { Plus, X } from 'lucide-react';

/* ------------------------------------------------------------------ */
/* Text input that suggests matches from a list as you type.           */
/* Anything can still be typed; a suggestion just fills it in.         */
/* ------------------------------------------------------------------ */

type SuggestInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & {
  value: string;
  onValueChange: (v: string) => void;
  suggestions: string[];
};

export const SuggestInput = forwardRef<HTMLInputElement, SuggestInputProps>(function SuggestInput(
  { value, onValueChange, suggestions, className, onBlur, onFocus, onKeyDown, ...rest },
  ref,
) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();

  const matches = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return suggestions.slice(0, 8);
    const starts = suggestions.filter((s) => s.toLowerCase().startsWith(q));
    const contains = suggestions.filter((s) => !s.toLowerCase().startsWith(q) && s.toLowerCase().includes(q));
    const all = [...starts, ...contains];
    return all.length === 1 && all[0].toLowerCase() === q ? [] : all.slice(0, 8);
  }, [value, suggestions]);

  const show = open && matches.length > 0;

  function pick(s: string) {
    onValueChange(s);
    setOpen(false);
  }

  return (
    <div className="relative">
      <Input
        ref={ref}
        {...rest}
        value={value}
        autoComplete="off"
        role="combobox"
        aria-expanded={show}
        aria-controls={listId}
        aria-autocomplete="list"
        className={className}
        onChange={(e) => {
          onValueChange(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onFocus={(e) => {
          setOpen(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setOpen(false);
          onBlur?.(e);
        }}
        onKeyDown={(e) => {
          if (show && e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((i) => (i + 1) % matches.length);
          } else if (show && e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((i) => (i - 1 + matches.length) % matches.length);
          } else if (show && e.key === 'Enter') {
            e.preventDefault();
            pick(matches[active]);
          } else if (e.key === 'Escape') {
            setOpen(false);
          }
          onKeyDown?.(e);
        }}
      />
      {show && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
        >
          {matches.map((s, i) => (
            <li
              key={s}
              role="option"
              aria-selected={i === active}
              className={cn('cursor-pointer rounded-sm px-2 py-1.5 text-sm', i === active && 'bg-accent text-accent-foreground')}
              onMouseDown={(e) => {
                e.preventDefault(); // keep focus so the click lands before blur closes the list
                pick(s);
              }}
              onMouseEnter={() => setActive(i)}
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});

/* ------------------------------------------------------------------ */
/* City and country                                                    */
/* ------------------------------------------------------------------ */

export const CityInput = forwardRef<
  HTMLInputElement,
  Omit<SuggestInputProps, 'suggestions'> & { country?: string }
>(function CityInput({ country, placeholder, ...rest }, ref) {
  const suggestions = useMemo(() => citySuggestionsFor(country), [country]);
  return <SuggestInput ref={ref} suggestions={suggestions} placeholder={placeholder ?? 'Start typing, e.g. Ikeja'} {...rest} />;
});

export function CountrySelect({ value, onValueChange, id }: { value: string; onValueChange: (v: string) => void; id?: string }) {
  // Keep an older free-typed value selectable so editing a profile never silently changes it.
  const options = value && !(COUNTRIES as readonly string[]).includes(value) ? [value, ...COUNTRIES] : [...COUNTRIES];
  return (
    <Select value={value || undefined} onValueChange={onValueChange}>
      <SelectTrigger id={id}>
        <SelectValue placeholder="Select country" />
      </SelectTrigger>
      <SelectContent>
        {options.map((c) => (
          <SelectItem key={c} value={c}>
            {c}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/* ------------------------------------------------------------------ */
/* Opening hours                                                       */
/* ------------------------------------------------------------------ */

const selectClass =
  'h-9 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50';

export function OperatingHoursInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [rows, setRows] = useState<HoursRow[] | null>(() => parseHours(value));
  const lastEmitted = useRef(value);

  // Follow outside changes (e.g. the form being reset or loaded).
  useEffect(() => {
    if (value !== lastEmitted.current) {
      lastEmitted.current = value;
      setRows(parseHours(value));
    }
  }, [value]);

  function update(next: HoursRow[]) {
    setRows(next);
    const text = formatHours(next);
    lastEmitted.current = text;
    onChange(text);
  }

  const used = new Set((rows ?? []).flatMap((r) => r.days));
  const legacyText = !rows && value.trim() ? value : null;

  return (
    <div className="space-y-3 rounded-md border p-3">
      <div className="flex flex-wrap gap-2">
        {HOURS_PRESETS.map((p) => {
          const text = formatHours(p.rows);
          const selected = value === text;
          return (
            <button
              key={p.label}
              type="button"
              onClick={() => update(p.rows.map((r) => ({ ...r, days: [...r.days] })))}
              className={cn(
                'rounded-full border px-3 py-1 text-xs transition-colors',
                selected ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-accent',
              )}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {legacyText && (
        <p className="text-sm text-muted-foreground">
          Current hours: <span className="text-foreground">{legacyText}</span>. Pick a preset above to change them.
        </p>
      )}

      {rows?.map((row, ri) => (
        <div key={ri} className="space-y-2 rounded-md bg-muted/40 p-2">
          <div className="flex flex-wrap items-center gap-1">
            {DAYS.map((d) => {
              const on = row.days.includes(d);
              const takenElsewhere = !on && used.has(d);
              return (
                <button
                  key={d}
                  type="button"
                  disabled={takenElsewhere}
                  aria-pressed={on}
                  onClick={() => {
                    const days = on ? row.days.filter((x) => x !== d) : [...row.days, d];
                    update(rows.map((r, i) => (i === ri ? { ...r, days: DAYS.filter((x) => days.includes(x)) as Day[] } : r)));
                  }}
                  className={cn(
                    'h-8 w-11 rounded-md border text-xs font-medium transition-colors',
                    on ? 'border-primary bg-primary text-primary-foreground' : 'bg-background hover:bg-accent',
                    takenElsewhere && 'cursor-not-allowed opacity-40',
                  )}
                >
                  {d}
                </button>
              );
            })}
            {rows.length > 1 && (
              <button
                type="button"
                aria-label="Remove these hours"
                className="ml-auto rounded-md p-1 text-muted-foreground hover:bg-accent"
                onClick={() => update(rows.filter((_, i) => i !== ri))}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <select
              aria-label="Opens at"
              className={selectClass}
              value={row.open}
              disabled={row.allDay}
              onChange={(e) => update(rows.map((r, i) => (i === ri ? { ...r, open: e.target.value } : r)))}
            >
              {TIME_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {to12h(t)}
                </option>
              ))}
            </select>
            <span className="text-muted-foreground">to</span>
            <select
              aria-label="Closes at"
              className={selectClass}
              value={row.close}
              disabled={row.allDay}
              onChange={(e) => update(rows.map((r, i) => (i === ri ? { ...r, close: e.target.value } : r)))}
            >
              {TIME_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {to12h(t)}
                </option>
              ))}
            </select>
            <label className="ml-1 flex items-center gap-1.5 text-xs">
              <input
                type="checkbox"
                checked={row.allDay}
                onChange={(e) => update(rows.map((r, i) => (i === ri ? { ...r, allDay: e.target.checked } : r)))}
              />
              24 hours
            </label>
          </div>
        </div>
      ))}

      {rows && used.size < 7 && (
        <button
          type="button"
          className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          onClick={() => update([...rows, { days: [], open: '09:00', close: '17:00', allDay: false }])}
        >
          <Plus className="h-3.5 w-3.5" /> Add different hours for other days
        </button>
      )}

      {value && rows && (
        <p className="text-xs text-muted-foreground">
          Customers will see: <span className="font-medium text-foreground">{value}</span>
          {used.size < 7 && ' (closed on the other days)'}
        </p>
      )}
    </div>
  );
}
