import * as Sentry from '@sentry/nextjs';
import { privateDataCollection, sentryDsn, sentryEnvironment, sentryRelease } from '@/lib/monitoring';

if (sentryDsn()) {
  Sentry.init({ dsn: sentryDsn(), environment: sentryEnvironment(), release: sentryRelease(), tracesSampleRate: 0, dataCollection: privateDataCollection });
}
