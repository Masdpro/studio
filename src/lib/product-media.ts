/** A product can show up to this many photos (the first is the homepage photo). */
export const MAX_PRODUCT_IMAGES = 5;

const IMAGE_RE = /^\/api\/uploads\/[0-9a-f-]{36}\.(jpg|png|gif|webp)$/;
const VIDEO_RE = /^\/api\/uploads\/[0-9a-f-]{36}\.(mp4|webm)$/;

/** Extra photos beyond the main one: only images uploaded through this app are kept. */
export function sanitizeGallery(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string' && IMAGE_RE.test(v)).slice(0, MAX_PRODUCT_IMAGES - 1);
}

/** The product video: '' / undefined when none or when the URL isn't one of our uploads. */
export function sanitizeVideo(value: unknown): string | undefined {
  return typeof value === 'string' && VIDEO_RE.test(value) ? value : undefined;
}

/** Colour / size choices a vendor offers: a list or a comma-separated string, trimmed, de-duplicated and capped. */
export function sanitizeOptions(value: unknown): string[] {
  const raw = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : [];
  const out: string[] = [];
  for (const v of raw) {
    const t = typeof v === 'string' ? v.trim().slice(0, 30) : '';
    if (t && !out.some((o) => o.toLowerCase() === t.toLowerCase())) out.push(t);
  }
  return out.slice(0, 12);
}
