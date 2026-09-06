import { Suspense } from 'react';
import { LoginForm } from '@/components/auth/LoginForm';

export default function LoginPage() {
  return (
    <div className="container mx-auto py-12">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
