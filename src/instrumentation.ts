import type { Instrumentation } from 'next';

/** Runs once when the server starts: error tracking, the quarterly price update and log clean-up. */
export async function register() {
  // Written this way so the Node-only code is left out of the edge (middleware) build.
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
    const { startPriceSchedule } = await import('./lib/services/catalog-prices');
    startPriceSchedule();
    const { startEventCleanup } = await import('./lib/services/system-events');
    startEventCleanup();
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

/** Any error a page or API route didn't handle: sent to Sentry and logged with its request ID. */
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  const Sentry = await import('@sentry/nextjs');
  Sentry.captureRequestError(err, request, context);
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { log } = await import('./lib/log');
    const headers = request.headers as Record<string, string | string[] | undefined>;
    const id = headers['x-request-id'] ?? headers['fly-request-id'];
    log.error('Unhandled server error', {
      area: 'app',
      report: false, // already sent to Sentry above
      requestId: Array.isArray(id) ? id[0] : id,
      method: request.method,
      path: request.path.split('?')[0],
      route: context.routePath,
      err,
    });
  }
};
