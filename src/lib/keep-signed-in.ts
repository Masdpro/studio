/**
 * "Keep me signed in": the person's choice, asked on the sign-in form (unticked by default).
 * Ticked → the website keeps them signed in on this browser for 30 days, then asks again.
 * Not ticked → they stay signed in only until the browser is closed.
 * The choice is stored in KEEP_COOKIE next to the sign-in cookie; the middleware signs out any
 * session whose KEEP_COOKIE has gone. The server also ends every session 30 days after sign-in.
 */
export const KEEP_COOKIE = 'cb-keep';
export const KEEP_DAYS = 30;
export const KEEP_SECONDS = KEEP_DAYS * 24 * 60 * 60;

/** Browser only: record the choice when signing in. */
export function rememberChoice(remember: boolean) {
  if (typeof document === 'undefined') return;
  const secure = location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${KEEP_COOKIE}=${remember ? 'remember' : 'session'}; Path=/; SameSite=Lax${remember ? `; Max-Age=${KEEP_SECONDS}` : ''}${secure}`;
}
