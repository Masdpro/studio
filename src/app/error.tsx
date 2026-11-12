'use client';

import { ErrorScreen } from '@/components/monitoring/ErrorScreen';

export default function Error(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorScreen {...props} />;
}
