import { SuperAdminDashboard } from '@/components/admin/SuperAdminDashboard';

export default function SuperAdmin() {
  return (
    <main className="flex-1 p-4 sm:p-6 bg-background">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Super Admin Panel</h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          Full platform oversight and control
        </p>
      </div>
      <SuperAdminDashboard />
    </main>
  );
}
