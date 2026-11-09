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

// Per-IP failed-login tracking, to blunt password spraying (one source trying many emails).
// Higher threshold than per-email because many people can share one IP (office/mobile NAT).
const IP_FAILS = new Map<string, number[]>();
const MAX_IP_FAILS = 30;
function recentIpFails(ip: string) {
  const now = Date.now();
  const list = (IP_FAILS.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  IP_FAILS.set(ip, list);
  return list;
}
export const isIpLockedOut = (ip: string) => ip !== 'unknown' && recentIpFails(ip).length >= MAX_IP_FAILS;
export const recordFailedIp = (ip: string) => void (ip !== 'unknown' && recentIpFails(ip).push(Date.now()));

export const isLockedOut = (email: string) => recentFails(email).length >= MAX_FAILS;
export const recordFailedPassword = (email: string) => void recentFails(email).push(Date.now());
export const clearFailedPasswords = (email: string) => void FAILS.delete(email);
