// Wrong-password throttle: after 5 misses on one email within 15 minutes,
// that email is locked for 15 minutes. Shared by sign-in and by sign-up when
// an existing account adds a vendor / agent profile, so neither can be used to guess passwords.
const FAILS = new Map<string, number[]>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILS = 5;

function recentFails(email: string) {
  const now = Date.now();
  const list = (FAILS.get(email) ?? []).filter((t) => now - t < WINDOW_MS);
  FAILS.set(email, list);
  return list;
}

export const isLockedOut = (email: string) => recentFails(email).length >= MAX_FAILS;
export const recordFailedPassword = (email: string) => void recentFails(email).push(Date.now());
export const clearFailedPasswords = (email: string) => void FAILS.delete(email);
