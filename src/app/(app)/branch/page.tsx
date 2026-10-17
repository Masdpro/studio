'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { VendorAnalytics } from '@/components/vendor/VendorAnalytics';

export default function BranchDashboardPage() {
  const { user, roles, loading } = useAuth();
  if (loading) return <div className="container mx-auto py-8 text-center text-muted-foreground">Loading\u2026</div>;
  if (!user || !roles.includes('branch')) {
    return (
      <div className="container mx-auto space-y-4 py-8 text-center">
        <p className="text-lg text-muted-foreground">Sign in with a branch account to view this page.</p>
        <Button asChild><Link href="/auth/login">Sign In</Link></Button>
      </div>
    );
  }
  return (
    <div className="container mx-auto max-w-5xl space-y-6 py-8">
      <h1 className="text-3xl font-bold text-primary">{user.name ?? 'Branch'} Dashboard</h1>
      <VendorAnalytics endpoint="/api/branch/analytics" showBranchFilter={false} />
    </div>
  );
}
