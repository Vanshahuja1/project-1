import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users,
  Building2,
  FolderOpen,
  CreditCard,
  AlertCircle,
  FileText,
  Package,
  TrendingUp,
} from 'lucide-react';
import { RecentActivityFeed } from './RecentActivityFeed';

export function AdminOverview() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-overview-stats'],
    queryFn: async () => {
      const [
        vendorsRes,
        clientsRes,
        projectsRes,
        paymentsRes,
        complaintsRes,
        productsRes,
        templatesRes,
      ] = await Promise.all([
        supabase.from('vendors').select('id, active, wallet_balance', { count: 'exact' }),
        supabase.from('clients').select('id, active, wallet_balance', { count: 'exact' }),
        supabase.from('projects').select('id, status, total_amount, paid_amount', { count: 'exact' }),
        supabase.from('payments').select('id, amount', { count: 'exact' }),
        supabase.from('complaints').select('id, status', { count: 'exact' }),
        supabase.from('products').select('id, active', { count: 'exact' }),
        supabase.from('templates').select('id, is_public', { count: 'exact' }),
      ]);

      const vendors = vendorsRes.data || [];
      const clients = clientsRes.data || [];
      const projects = projectsRes.data || [];
      const payments = paymentsRes.data || [];
      const complaints = complaintsRes.data || [];
      const products = productsRes.data || [];
      const templates = templatesRes.data || [];

      const totalRevenue = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const totalProjectValue = projects.reduce((sum, p) => sum + Number(p.total_amount || 0), 0);
      const totalPaid = projects.reduce((sum, p) => sum + Number(p.paid_amount || 0), 0);
      const pendingAmount = totalProjectValue - totalPaid;

      const activeVendors = vendors.filter(v => v.active).length;
      const activeClients = clients.filter(c => c.active).length;
      const openComplaints = complaints.filter(c => c.status !== 'resolved').length;
      const activeProducts = products.filter(p => p.active).length;
      const publicTemplates = templates.filter(t => t.is_public).length;

      const projectsByStatus = {
        draft: projects.filter(p => p.status === 'draft').length,
        data_upload: projects.filter(p => p.status === 'data_upload').length,
        design: projects.filter(p => p.status === 'design').length,
        printing: projects.filter(p => p.status === 'printing').length,
        delivered: projects.filter(p => p.status === 'delivered').length,
      };

      return {
        vendors: { total: vendors.length, active: activeVendors },
        clients: { total: clients.length, active: activeClients },
        projects: { total: projects.length, byStatus: projectsByStatus },
        payments: { total: payments.length, revenue: totalRevenue },
        complaints: { total: complaints.length, open: openComplaints },
        products: { total: products.length, active: activeProducts },
        templates: { total: templates.length, public: publicTemplates },
        financial: { totalValue: totalProjectValue, paid: totalPaid, pending: pendingAmount },
      };
    },
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Vendors',
      value: stats?.vendors.total || 0,
      subtitle: `${stats?.vendors.active || 0} active`,
      icon: Building2,
      color: 'text-blue-500',
    },
    {
      title: 'Total Clients',
      value: stats?.clients.total || 0,
      subtitle: `${stats?.clients.active || 0} active`,
      icon: Users,
      color: 'text-green-500',
    },
    {
      title: 'Total Projects',
      value: stats?.projects.total || 0,
      subtitle: `${stats?.projects.byStatus.design || 0} in design`,
      icon: FolderOpen,
      color: 'text-purple-500',
    },
    {
      title: 'Total Revenue',
      value: `₹${(stats?.payments.revenue || 0).toLocaleString()}`,
      subtitle: `${stats?.payments.total || 0} payments`,
      icon: CreditCard,
      color: 'text-emerald-500',
    },
    {
      title: 'Open Complaints',
      value: stats?.complaints.open || 0,
      subtitle: `${stats?.complaints.total || 0} total`,
      icon: AlertCircle,
      color: 'text-red-500',
    },
    {
      title: 'Products',
      value: stats?.products.total || 0,
      subtitle: `${stats?.products.active || 0} active`,
      icon: Package,
      color: 'text-orange-500',
    },
    {
      title: 'Templates',
      value: stats?.templates.total || 0,
      subtitle: `${stats?.templates.public || 0} public`,
      icon: FileText,
      color: 'text-cyan-500',
    },
    {
      title: 'Pending Amount',
      value: `₹${(stats?.financial.pending || 0).toLocaleString()}`,
      subtitle: `of ₹${(stats?.financial.totalValue || 0).toLocaleString()} total`,
      icon: TrendingUp,
      color: 'text-yellow-500',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Projects by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { label: 'Draft', value: stats?.projects.byStatus.draft || 0, color: 'bg-gray-500' },
                { label: 'Data Upload', value: stats?.projects.byStatus.data_upload || 0, color: 'bg-blue-500' },
                { label: 'Design', value: stats?.projects.byStatus.design || 0, color: 'bg-yellow-500' },
                { label: 'Printing', value: stats?.projects.byStatus.printing || 0, color: 'bg-green-500' },
                { label: 'Delivered', value: stats?.projects.byStatus.delivered || 0, color: 'bg-purple-500' },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${item.color}`} />
                    <span className="text-sm">{item.label}</span>
                  </div>
                  <span className="font-semibold">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Financial Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Project Value</span>
                <span className="font-semibold">₹{(stats?.financial.totalValue || 0).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Amount Received</span>
                <span className="font-semibold text-green-500">₹{(stats?.financial.paid || 0).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Pending Amount</span>
                <span className="font-semibold text-orange-500">₹{(stats?.financial.pending || 0).toLocaleString()}</span>
              </div>
              <div className="pt-2 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Collection Rate</span>
                  <span className="font-semibold">
                    {stats?.financial.totalValue ? Math.round((stats.financial.paid / stats.financial.totalValue) * 100) : 0}%
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <RecentActivityFeed />
    </div>
  );
}
