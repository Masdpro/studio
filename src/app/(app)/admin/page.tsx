import { AdminGate } from '@/components/admin/AdminGate';
import { AnalyticsDashboard } from '@/components/admin/dashboard/AnalyticsDashboard';

export default function AdminDashboardPage() {
  return (
    <AdminGate>
      <div className="container mx-auto py-8">
        <AnalyticsDashboard />
      </div>
    </AdminGate>
  );
}
