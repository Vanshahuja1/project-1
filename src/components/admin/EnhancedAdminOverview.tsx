import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  Building2,
  FolderOpen,
  CreditCard,
  AlertCircle,
  FileText,
  Package,
  TrendingUp,
  Printer,
  Clock,
  CheckCircle,
  Truck,
  RefreshCcw,
} from 'lucide-react';
import { RecentActivityFeed } from './RecentActivityFeed';
import { Button } from '@/components/ui/button';

export function EnhancedAdminOverview() {
  const { data: stats, isLoading, refetch } = useQuery({
    queryKey: ['admin-enhanced-stats'],
    queryFn: async () => {
      const [
        vendorsRes,
        clientsRes,
        projectsRes,
        paymentsRes,
        complaintsRes,
        productsRes,
        templatesRes,
        dataRecordsRes,
        tasksRes,
      ] = await Promise.all([
        supabase.from('vendors').select('id, active, wallet_balance', { count: 'exact' }),
        supabase.from('clients').select('id, active, wallet_balance', { count: 'exact' }),
        supabase.from('projects').select('id, status, payment_status, total_amount, paid_amount, product_id, quantity', { count: 'exact' }),
        supabase.from('payments').select('id, amount, created_at', { count: 'exact' }),
        supabase.from('complaints').select('id, status, priority', { count: 'exact' }),
        supabase.from('products').select('id, active, category', { count: 'exact' }),
        supabase.from('templates').select('id, is_public, vendor_id', { count: 'exact' }),
        supabase.from('data_records').select('id, processing_status', { count: 'exact' }),
        supabase.from('project_tasks').select('id, status', { count: 'exact' }),
      ]);

      const vendors = vendorsRes.data || [];
      const clients = clientsRes.data || [];
      const projects = projectsRes.data || [];
      const payments = paymentsRes.data || [];
      const complaints = complaintsRes.data || [];
      const products = productsRes.data || [];
      const templates = templatesRes.data || [];
      const dataRecords = dataRecordsRes.data || [];
      const tasks = tasksRes.data || [];

      const totalRevenue = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const totalProjectValue = projects.reduce((sum, p) => sum + Number(p.total_amount || 0), 0);
      const totalPaid = projects.reduce((sum, p) => sum + Number(p.paid_amount || 0), 0);
      const pendingAmount = totalProjectValue - totalPaid;
      const totalQuantity = projects.reduce((sum, p) => sum + Number(p.quantity || 0), 0);

      const activeVendors = vendors.filter(v => v.active).length;
      const activeClients = clients.filter(c => c.active).length;
      const openComplaints = complaints.filter(c => c.status !== 'resolved').length;
      const highPriorityComplaints = complaints.filter(c => c.priority === 'high' && c.status !== 'resolved').length;
      const activeProducts = products.filter(p => p.active).length;
      const publicTemplates = templates.filter(t => t.is_public).length;
      const pendingTasks = tasks.filter(t => t.status === 'pending').length;

      // Projects without design templates
      const projectsWithoutTemplate = projects.filter(p => p.status === 'draft' || p.status === 'data_upload').length;

      const projectsByStatus = {
        draft: projects.filter(p => p.status === 'draft').length,
        data_upload: projects.filter(p => p.status === 'data_upload').length,
        design: projects.filter(p => p.status === 'design').length,
        proof_ready: projects.filter(p => p.status === 'proof_ready').length,
        approved: projects.filter(p => p.status === 'approved').length,
        printing: projects.filter(p => p.status === 'printing').length,
        dispatched: projects.filter(p => p.status === 'dispatched').length,
        delivered: projects.filter(p => p.status === 'delivered').length,
        cancelled: projects.filter(p => p.status === 'cancelled').length,
      };

      // Data records processing status
      const recordsByStatus = {
        pending: dataRecords.filter(r => r.processing_status === 'pending').length,
        processing: dataRecords.filter(r => r.processing_status === 'processing').length,
        completed: dataRecords.filter(r => r.processing_status === 'completed').length,
        error: dataRecords.filter(r => r.processing_status === 'error').length,
      };

      return {
        vendors: { total: vendors.length, active: activeVendors },
        clients: { total: clients.length, active: activeClients },
        projects: { total: projects.length, byStatus: projectsByStatus, withoutTemplate: projectsWithoutTemplate, totalQuantity },
        payments: { total: payments.length, revenue: totalRevenue },
        complaints: { total: complaints.length, open: openComplaints, highPriority: highPriorityComplaints },
        products: { total: products.length, active: activeProducts },
        templates: { total: templates.length, public: publicTemplates },
        tasks: { total: tasks.length, pending: pendingTasks },
        dataRecords: { total: dataRecords.length, byStatus: recordsByStatus },
        financial: { totalValue: totalProjectValue, paid: totalPaid, pending: pendingAmount },
      };
    },
    refetchInterval: 60000, // Refresh every minute
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
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
      </div>
    );
  }

  const primaryStats = [
    {
      title: 'Total Vendors',
      value: stats?.vendors.total || 0,
      subtitle: `${stats?.vendors.active || 0} active`,
      icon: Building2,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Total Clients',
      value: stats?.clients.total || 0,
      subtitle: `${stats?.clients.active || 0} active`,
      icon: Users,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      title: 'Active Projects',
      value: stats?.projects.total || 0,
      subtitle: `${stats?.projects.totalQuantity || 0} total items`,
      icon: FolderOpen,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    {
      title: 'Total Revenue',
      value: `₹${(stats?.payments.revenue || 0).toLocaleString()}`,
      subtitle: `${stats?.payments.total || 0} transactions`,
      icon: CreditCard,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
    },
  ];

  const secondaryStats = [
    {
      title: 'Pending Amount',
      value: `₹${(stats?.financial.pending || 0).toLocaleString()}`,
      subtitle: `of ₹${(stats?.financial.totalValue || 0).toLocaleString()} total`,
      icon: TrendingUp,
      color: 'text-orange-500',
    },
    {
      title: 'Open Complaints',
      value: stats?.complaints.open || 0,
      subtitle: stats?.complaints.highPriority ? `${stats.complaints.highPriority} high priority` : 'None high priority',
      icon: AlertCircle,
      color: stats?.complaints.highPriority ? 'text-red-500' : 'text-yellow-500',
    },
    {
      title: 'Pending Tasks',
      value: stats?.tasks.pending || 0,
      subtitle: `${stats?.tasks.total || 0} total tasks`,
      icon: Clock,
      color: 'text-cyan-500',
    },
    {
      title: 'Without Templates',
      value: stats?.projects.withoutTemplate || 0,
      subtitle: 'Projects need design',
      icon: FileText,
      color: 'text-pink-500',
    },
  ];

  const projectStatusCards = [
    { label: 'Draft', value: stats?.projects.byStatus.draft || 0, icon: FileText, color: 'text-gray-500' },
    { label: 'Data Upload', value: stats?.projects.byStatus.data_upload || 0, icon: Package, color: 'text-blue-500' },
    { label: 'Design', value: stats?.projects.byStatus.design || 0, icon: FileText, color: 'text-yellow-500' },
    { label: 'Proof Ready', value: stats?.projects.byStatus.proof_ready || 0, icon: CheckCircle, color: 'text-indigo-500' },
    { label: 'Approved', value: stats?.projects.byStatus.approved || 0, icon: CheckCircle, color: 'text-green-500' },
    { label: 'Printing', value: stats?.projects.byStatus.printing || 0, icon: Printer, color: 'text-orange-500' },
    { label: 'Dispatched', value: stats?.projects.byStatus.dispatched || 0, icon: Truck, color: 'text-purple-500' },
    { label: 'Delivered', value: stats?.projects.byStatus.delivered || 0, icon: CheckCircle, color: 'text-emerald-500' },
  ];

  const collectionRate = stats?.financial.totalValue 
    ? Math.round((stats.financial.paid / stats.financial.totalValue) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      {/* Refresh Button */}
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCcw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Primary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {primaryStats.map((stat) => (
          <Card key={stat.title} className="relative overflow-hidden">
            <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full ${stat.bgColor} opacity-50`} />
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

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {secondaryStats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Project Status Pipeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Project Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {projectStatusCards.map((item) => (
              <div key={item.label} className="text-center p-3 rounded-lg bg-muted/50">
                <item.icon className={`h-5 w-5 mx-auto mb-1 ${item.color}`} />
                <div className="text-lg font-bold">{item.value}</div>
                <div className="text-xs text-muted-foreground truncate">{item.label}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Financial Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Financial Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
            <div className="pt-2 border-t space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Collection Rate</span>
                <span className="font-semibold">{collectionRate}%</span>
              </div>
              <Progress value={collectionRate} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Data Processing Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Data Processing Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Total Records</span>
              <Badge variant="outline">{stats?.dataRecords.total || 0}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-yellow-500/10">
                <div className="text-lg font-bold text-yellow-600">{stats?.dataRecords.byStatus.pending || 0}</div>
                <div className="text-xs text-muted-foreground">Pending</div>
              </div>
              <div className="p-3 rounded-lg bg-blue-500/10">
                <div className="text-lg font-bold text-blue-600">{stats?.dataRecords.byStatus.processing || 0}</div>
                <div className="text-xs text-muted-foreground">Processing</div>
              </div>
              <div className="p-3 rounded-lg bg-green-500/10">
                <div className="text-lg font-bold text-green-600">{stats?.dataRecords.byStatus.completed || 0}</div>
                <div className="text-xs text-muted-foreground">Completed</div>
              </div>
              <div className="p-3 rounded-lg bg-red-500/10">
                <div className="text-lg font-bold text-red-600">{stats?.dataRecords.byStatus.error || 0}</div>
                <div className="text-xs text-muted-foreground">Errors</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Products & Templates Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-5 w-5 text-orange-500" />
              Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{stats?.products.total || 0}</span>
              <Badge variant="outline">{stats?.products.active || 0} active</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-cyan-500" />
              Templates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{stats?.templates.total || 0}</span>
              <Badge variant="outline">{stats?.templates.public || 0} public</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <RecentActivityFeed />
    </div>
  );
}
