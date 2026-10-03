import { Suspense } from 'react';
import { CheckEmail } from '@/components/auth/CheckEmail';

export default function CheckEmailPage() {
  return (
    <div className="container mx-auto py-12">
      <Suspense>
        <CheckEmail />
      </Suspense>
    </div>
  );
}
