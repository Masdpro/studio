const ACTIVE_KEY = 'closebuy-delivery-address';
const HISTORY_KEY = 'closebuy-address-history';
const MAX_HISTORY = 6;

export type SavedAddress = { address: string; latitude?: number; longitude?: number };

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function write(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable */
  }
}

/** The address currently selected in the home-page location filter; checkout pre-fills it. */
export function getSavedAddress(): SavedAddress | null {
  const v = read<SavedAddress>(ACTIVE_KEY);
  return v && typeof v.address === 'string' && v.address.trim() ? v : null;
}
export function saveAddress(a: SavedAddress | null) {
  write(ACTIVE_KEY, a && a.address.trim() ? a : null);
}

/** Addresses the customer has used before, most recent first. */
export function getAddressHistory(): SavedAddress[] {
  const v = read<SavedAddress[]>(HISTORY_KEY);
  return Array.isArray(v) ? v.filter((a) => a && typeof a.address === 'string') : [];
}
export function rememberAddress(a: SavedAddress): SavedAddress[] {
  const next = [a, ...getAddressHistory().filter((x) => x.address.toLowerCase() !== a.address.toLowerCase())].slice(0, MAX_HISTORY);
  write(HISTORY_KEY, next);
  return next;
}
export function forgetAddress(address: string): SavedAddress[] {
  const next = getAddressHistory().filter((x) => x.address !== address);
  write(HISTORY_KEY, next);
  if (getSavedAddress()?.address === address) saveAddress(null);
  return next;
}
