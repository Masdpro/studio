/** Shared Sentry settings. Error tracking is on only when SENTRY_DSN is set (a Fly secret). */
export const sentryDsn = () => process.env.SENTRY_DSN || undefined;
export const sentryEnvironment = () => process.env.SENTRY_ENVIRONMENT ?? (process.env.FLY_APP_NAME ? 'production' : process.env.NODE_ENV ?? 'development');
/** The deployed image (Fly sets FLY_IMAGE_REF), so errors can be tied to a release. */
export const sentryRelease = () => process.env.FLY_IMAGE_REF?.split(':').pop() || undefined;

/** Drops cookies, auth headers and request bodies before anything leaves the server. */
export function scrubEvent<T extends { request?: { headers?: Record<string, string>; cookies?: unknown; data?: unknown } }>(event: T): T {
  if (event.request) {
    delete event.request.cookies;
    delete event.request.data;
    if (event.request.headers) {
      for (const h of Object.keys(event.request.headers)) {
        if (/cookie|authorization|x-paystack-signature/i.test(h)) delete event.request.headers[h];
      }
    }
  }
  return event;
}

/** Keep personal data out of Sentry: no user details, cookies, bodies, auth headers or tokens in URLs. */
export const privateDataCollection: import('@sentry/nextjs').BrowserOptions['dataCollection'] = {
  userInfo: false,
  cookies: false,
  httpHeaders: { request: { deny: ['cookie', 'authorization', 'x-paystack-signature'] }, response: false },
  httpBodies: [],
  urlQueryParams: { deny: ['token', 'code', 'reference', 'email', 'phone', 'callbackUrl'] },
};
