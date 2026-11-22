/**
 * The rules every sign-up and profile field must meet, shared by the website and the phone app
 * (native/src/lib/field-rules.ts is an exact copy; a test keeps the two identical).
 * Each rule returns a message to show under the field, or null when the entry is fine.
 * Safe to use in the browser: no server imports.
 */

export type Rule = (value: string) => string | null;

const LETTER = /\p{L}/u;
const clean = (v: string | null | undefined) => (v ?? '').trim();
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Accepts 08012345678, 8012345678, 2348012345678 or +2348012345678 and returns +2348012345678, or null. */
export function nigerianMobile(input: string): string | null {
  const digits = input.replace(/[\s()-]/g, '').replace(/^\+/, '');
  const m = digits.match(/^(?:234|0)?([789][01]\d{8})$/);
  return m ? `+234${m[1]}` : null;
}

export const rules = {
  personName: ((v) => {
    const s = clean(v);
    if (!s) return 'Enter your name.';
    if (s.length < 2) return 'Your name must be at least 2 characters.';
    if (s.length > 60) return 'Keep your name to 60 characters or fewer.';
    if (!/^[\p{L}][\p{L} .'-]*$/u.test(s)) return 'Use letters only (spaces, hyphens and apostrophes are fine).';
    return null;
  }) as Rule,

  businessName: ((v) => {
    const s = clean(v);
    if (!s) return 'Enter your business name.';
    if (s.length < 2) return 'The business name must be at least 2 characters.';
    if (s.length > 80) return 'Keep the business name to 80 characters or fewer.';
    if (!LETTER.test(s)) return 'The business name must include letters.';
    return null;
  }) as Rule,

  email: ((v) => {
    const s = clean(v);
    if (!s) return 'Enter your email address.';
    if (s.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s)) return 'Enter a valid email address, e.g. name@example.com.';
    return null;
  }) as Rule,

  newPassword: ((v) => {
    const s = v ?? '';
    if (!s) return 'Choose a password.';
    if (s.length < 8) return 'Use at least 8 characters.';
    if (s.length > 72) return 'Use 72 characters or fewer.';
    if (!s.trim()) return 'The password can’t be only spaces.';
    return null;
  }) as Rule,

  phone: ((v) => {
    const s = clean(v);
    if (!s) return 'Enter your mobile number.';
    if (!nigerianMobile(s)) return 'Enter a valid Nigerian mobile number, e.g. 08012345678.';
    return null;
  }) as Rule,

  streetAddress: ((v) => {
    const s = clean(v);
    if (!s) return 'Enter the street address.';
    if (s.length < 5) return 'Enter the full address, e.g. 12 Admiralty Way.';
    if (s.length > 200) return 'Keep the address to 200 characters or fewer.';
    if (!LETTER.test(s)) return 'The address must include the street name.';
    return null;
  }) as Rule,

  place: ((v) => {
    const s = clean(v);
    if (!s) return 'Fill this in.';
    if (s.length < 2) return 'Enter at least 2 characters.';
    if (s.length > 60) return 'Keep this to 60 characters or fewer.';
    if (!/^[\p{L}][\p{L}0-9 .,'()-]*$/u.test(s)) return 'Use letters only, e.g. Lagos.';
    return null;
  }) as Rule,

  /** Optional fields: empty is fine. */
  optionalUrl: ((v) => {
    const s = clean(v);
    if (!s) return null;
    try {
      const u = new URL(s);
      if (u.protocol !== 'https:' && u.protocol !== 'http:') throw new Error();
      if (!u.hostname.includes('.')) throw new Error();
      return null;
    } catch {
      return 'Enter a full web address starting with https://, or leave it empty.';
    }
  }) as Rule,

  /** A shop's short link name, e.g. mama-cass (optional). */
  optionalLinkName: ((v) => {
    const s = clean(v);
    if (!s) return null;
    if (s.length < 3 || s.length > 40) return 'Use 3 to 40 characters.';
    if (!/^[a-zA-Z0-9-]+$/.test(s)) return 'Use only letters, numbers and hyphens, e.g. mama-cass.';
    return null;
  }) as Rule,

  /** A year the business started, e.g. 2018 (optional). */
  optionalYear: ((v) => {
    const s = clean(v);
    if (!s) return null;
    const n = Number(s);
    const now = new Date().getFullYear();
    if (!/^\d{4}$/.test(s) || n < 1950 || n > now) return `Enter a year between 1950 and ${now}.`;
    return null;
  }) as Rule,

  /** Empty is fine; anything typed must pass `rule`. */
  optional: (rule: Rule): Rule => (v) => (clean(v) ? rule(v) : null),

  /** Text that must be filled in, between `min` and `max` characters. */
  text: (what: string, min = 2, max = 500): Rule => (v) => {
    const s = clean(v);
    if (!s) return `Enter ${what}.`;
    if (s.length < min) return `Enter at least ${min} characters for ${what}.`;
    if (s.length > max) return `Keep ${what} to ${max} characters or fewer.`;
    return null;
  },

  /** An amount in naira between `min` and `max` (whole naira; commas are fine). */
  naira: (what: string, min = 1, max = 100_000_000): Rule => (v) => {
    const s = clean(v).replace(/[,₦\s]/g, '');
    if (!s) return `Enter ${what}.`;
    if (!/^\d+(\.\d{1,2})?$/.test(s)) return `Enter ${what} as a number, e.g. 5000.`;
    const n = Number(s);
    if (n < min) return `${cap(what)} must be at least ₦${min.toLocaleString('en-NG')}.`;
    if (n > max) return `${cap(what)} can’t be more than ₦${max.toLocaleString('en-NG')}.`;
    return null;
  },

  /** A whole number between `min` and `max`, e.g. stock or minutes. */
  wholeNumber: (what: string, min = 0, max = 1_000_000): Rule => (v) => {
    const s = clean(v).replace(/,/g, '');
    if (!s) return `Enter ${what}.`;
    if (!/^\d+$/.test(s)) return `Enter ${what} as a whole number.`;
    const n = Number(s);
    if (n < min) return `${cap(what)} must be at least ${min}.`;
    if (n > max) return `${cap(what)} can’t be more than ${max.toLocaleString('en-NG')}.`;
    return null;
  },

  /** A code of exactly `length` digits, e.g. the 6-digit email code or a 4-digit delivery code. */
  digits: (length: number, what = 'the code'): Rule => (v) => {
    const s = clean(v);
    if (!s) return `Enter ${what}.`;
    if (!new RegExp(`^\\d{${length}}$`).test(s)) return `${cap(what)} is ${length} digits.`;
    return null;
  },

  /** A Nigerian bank account number (NUBAN): exactly 10 digits. */
  accountNumber: ((v) => {
    const s = clean(v);
    if (!s) return 'Enter the account number.';
    if (!/^\d{10}$/.test(s)) return 'Account numbers are 10 digits.';
    return null;
  }) as Rule,

  /** Something must be chosen (a select, chip row or picker). */
  chosen: (what: string): Rule => (v) => (clean(v) ? null : `Choose ${what}.`),

  maxLength: (max: number, what = 'this'): Rule => (v) => (clean(v).length > max ? `Keep ${what} to ${max} characters or fewer.` : null),
} as const;

/** The same password typed twice. */
export const confirmPassword = (password: string, confirm: string) => (!confirm ? 'Type the password again.' : confirm !== password ? 'The passwords don’t match.' : null);

/** Runs every rule for the given values; returns field → message for the fields with a problem. */
export function checkAll<K extends string>(values: Record<K, string | null | undefined>, fieldRules: Partial<Record<K, Rule>>): Partial<Record<K, string>> {
  const out: Partial<Record<K, string>> = {};
  for (const key of Object.keys(fieldRules) as K[]) {
    const msg = fieldRules[key]!(values[key] ?? '');
    if (msg) out[key] = msg;
  }
  return out;
}
