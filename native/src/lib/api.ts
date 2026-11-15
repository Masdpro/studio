import Constants from 'expo-constants';

/** The Closebuy server. Set EXPO_PUBLIC_API_URL to point the app at a test server. */
export const API_URL: string = (process.env.EXPO_PUBLIC_API_URL || (Constants.expoConfig?.extra?.apiUrl as string) || 'https://cbuyapp.com').replace(/\/$/, '');

let token: string | null = null;
let onSignedOut: (() => void) | null = null;
export const setApiToken = (t: string | null) => {
  token = t;
};
/** Headers for loading a private file (ID documents, selfie photos) in an image. */
export const authHeaders = (): Record<string, string> => (token ? { Authorization: `Bearer ${token}` } : {});
export const onApiSignedOut = (fn: () => void) => {
  onSignedOut = fn;
};

export class ApiError extends Error {
  constructor(message: string, public status: number, public data: Record<string, unknown> = {}) {
    super(message);
  }
}

/** Full URL for an image or file path from the server (uploads are relative, e.g. /api/uploads/x.jpg). */
export function fileUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  if (/^https?:\/\//.test(path) || path.startsWith('data:')) return path;
  return `${API_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}

type Options = { method?: string; body?: unknown; form?: FormData; signal?: AbortSignal };

/** Calls a Closebuy API with the signed-in token. Throws ApiError with the server's message on failure. */
export async function api<T = any>(path: string, opts: Options = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  let body: BodyInit | undefined;
  if (opts.form) body = opts.form;
  else if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(opts.body);
  }
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { method: opts.method ?? (body ? 'POST' : 'GET'), headers, body, signal: opts.signal });
  } catch {
    throw new ApiError('No connection. Check your internet and try again.', 0);
  }
  const text = await res.text();
  let data: any = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { error: res.ok ? undefined : 'Something went wrong. Please try again.' };
  }
  if (!res.ok) {
    if (res.status === 401 && token && path !== '/api/mobile/session') onSignedOut?.();
    throw new ApiError(data?.error || data?.message || `Something went wrong (${res.status}).`, res.status, data);
  }
  return data as T;
}

/** Uploads a photo picked on the phone to one of the upload APIs (field name "file"). */
export async function uploadImage(path: string, uri: string, extra: Record<string, string> = {}, field = 'file'): Promise<any> {
  const form = new FormData();
  const name = uri.split('/').pop()?.split('?')[0] || 'photo.jpg';
  const type = /\.png$/i.test(name) ? 'image/png' : /\.webp$/i.test(name) ? 'image/webp' : 'image/jpeg';
  if (uri.startsWith('blob:') || uri.startsWith('data:')) {
    const blob = await (await fetch(uri)).blob();
    form.append(field, blob, name.includes('.') ? name : `photo.${blob.type.split('/')[1] || 'jpg'}`);
  } else {
    form.append(field, { uri, name, type } as any);
  }
  for (const [k, v] of Object.entries(extra)) form.append(k, v);
  return api(path, { method: 'POST', form });
}
