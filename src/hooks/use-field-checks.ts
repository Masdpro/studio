'use client';

import { useCallback, useState } from 'react';
import { checkAll, type Rule } from '@/lib/field-rules';

/**
 * Checks each entry when the person leaves it (and again as they fix it), so problems are flagged
 * before they move on, not only when the form is sent. `validateAll` checks everything before saving.
 */
export function useFieldChecks<K extends string>(fieldRules: Partial<Record<K, Rule>>) {
  const [errors, setErrors] = useState<Partial<Record<K, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<K, boolean>>>({});

  const check = useCallback(
    (key: K, value: string) => {
      const message = fieldRules[key]?.(value) ?? null;
      setErrors((e) => ({ ...e, [key]: message ?? undefined }));
      return !message;
    },
    [fieldRules],
  );

  return {
    error: (key: K) => errors[key],
    /** Props for an input: checks on leaving the field, and re-checks while typing once flagged. */
    bind: (key: K, value: string) => ({
      onBlur: () => {
        setTouched((t) => ({ ...t, [key]: true }));
        check(key, value);
      },
      'aria-invalid': errors[key] ? true : undefined,
    }),
    /** Call when the person leaves a field that isn't a plain input (pickers, suggestion boxes). */
    blur: (key: K, value: string) => {
      setTouched((t) => ({ ...t, [key]: true }));
      check(key, value);
    },
    changed: (key: K, value: string) => {
      if (touched[key]) check(key, value);
    },
    /** Everything an <Input> or <Textarea> needs: value, change and leave handlers. */
    field: (key: K, value: string, setValue: (v: string) => void) => ({
      value,
      onChange: (e: { target: { value: string } }) => {
        setValue(e.target.value);
        if (touched[key]) check(key, e.target.value);
      },
      onBlur: () => {
        setTouched((t) => ({ ...t, [key]: true }));
        check(key, value);
      },
      'aria-invalid': errors[key] ? true : undefined,
    }),
    validateAll: (values: Record<K, string>) => {
      const found = checkAll(values, fieldRules);
      setErrors(found);
      setTouched(Object.fromEntries(Object.keys(fieldRules).map((k) => [k, true])) as Partial<Record<K, boolean>>);
      return Object.keys(found).length === 0;
    },
    reset: () => {
      setErrors({});
      setTouched({});
    },
    hasErrors: Object.values(errors).some(Boolean),
  };
}
