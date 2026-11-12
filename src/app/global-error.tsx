'use client';

import { ErrorScreen } from '@/components/monitoring/ErrorScreen';

/** Used when even the main layout fails, so it brings its own <html> and <body>. */
export default function GlobalError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#fbf8ec' }}>
        <ErrorScreen {...props} />
      </body>
    </html>
  );
}
