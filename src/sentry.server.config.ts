import * as Sentry from '@sentry/nextjs';
import { privateDataCollection, scrubEvent, sentryDsn, sentryEnvironment, sentryRelease } from '@/lib/monitoring';

if (sentryDsn()) {
  Sentry.init({
    dsn: sentryDsn(),
    environment: sentryEnvironment(),
    release: sentryRelease(),
    tracesSampleRate: 0.05, // a small sample of request timings, to spot slow pages without using up the quota
    dataCollection: privateDataCollection,
    beforeSend: (event) => scrubEvent(event),
  });
}
