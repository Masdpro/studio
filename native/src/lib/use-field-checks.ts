import { useCallback, useState } from 'react';
import { checkAll, type Rule } from './field-rules';

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
    error: (key: K) => errors[key] ?? null,
    /** Call when the person leaves the field. */
    blur: (key: K, value: string) => {
      setTouched((t) => ({ ...t, [key]: true }));
      check(key, value);
    },
    /** Call on every change: once a field has been flagged, the message updates as they type. */
    changed: (key: K, value: string) => {
      if (touched[key]) check(key, value);
    },
    /**
     * Everything a <Field> needs: the message is worked out from the current value once the person
     * has left the field, so it always matches what is on screen (even after a change is filtered).
     */
    input: (key: K, value: string | undefined, onChangeText: (v: string) => void) => {
      const shown = touched[key] ? (fieldRules[key]?.(value ?? '') ?? null) : null;
      return {
        value,
        onChangeText,
        onBlur: () => setTouched((t) => ({ ...t, [key]: true })),
        error: shown ?? (touched[key] ? null : errors[key] ?? null),
      };
    },
    validateAll: (values: Partial<Record<K, string>>) => {
      const found = checkAll(values as Record<K, string>, fieldRules);
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
