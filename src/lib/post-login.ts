/**
 * Where to send someone right after they sign in, when no specific page was asked for:
 * vendors and delivery agents who still have verification steps go to their checklist.
 */
export async function postLoginDestination(fallback = '/shop'): Promise<string> {
  try {
    const res = await fetch('/api/account/verification', { cache: 'no-store' });
    if (!res.ok) return fallback;
    const { state } = (await res.json()) as { state?: { needsReview?: boolean; mayTrade?: boolean } | null };
    if (state?.needsReview && !state.mayTrade) return '/account/verification';
  } catch {}
  return fallback;
}
