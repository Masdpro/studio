import type { Metadata } from 'next';
import { ProviderRegistrationForm } from '@/components/auth/ProviderRegistrationForm';

export const metadata: Metadata = { title: 'Register your service business · Closebuy' };

export default function ProviderRegistrationPage() {
  return (
    <div className="container mx-auto py-12">
      <ProviderRegistrationForm />
    </div>
  );
}
