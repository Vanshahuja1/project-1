import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, FolderKanban, DollarSign, MessageSquare, PrinterIcon } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { Skeleton } from '@/components/ui/skeleton';

export function DashboardContent() {
  const { isSuperAdmin, isVendor } = useUserRole();

  // Fetch vendor ID if user is a vendor
  const { data: vendorData } = useQuery({
    queryKey: ['vendor-profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data } = await supabase
        .from('vendors')
        .select('id')
        .eq('user_id', user.id)
        .single();
      
      return data;
    },
    enabled: isVendor,
  });

  // Fetch dashboard statistics
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats', vendorData?.id],
    queryFn: async () => {
      const vendorId = vendorData?.id;
      
      // Clients count
      const clientsQuery = supabase
        .from('clients')
        .select('id', { count: 'exact', head: true });
      
      if (isVendor && vendorId) {
        clientsQuery.eq('vendor_id', vendorId);
      }
      
      const { count: clientsCount } = await clientsQuery;

      // Projects count (ongoing)
      const projectsQuery = supabase
        .from('projects')
        .select('id', { count: 'exact', head: true })
        .in('status', ['draft', 'data_upload', 'design', 'proof_ready', 'approved', 'printing']);
      
      if (isVendor && vendorId) {
        projectsQuery.eq('vendor_id', vendorId);
      }
      
      const { count: projectsCount } = await projectsQuery;

      // Total payments
      const paymentsQuery = supabase
        .from('payments')
        .select('amount');
      
      if (isVendor && vendorId) {
        paymentsQuery.eq('vendor_id', vendorId);
      }
      
      const { data: payments } = await paymentsQuery;
      const totalPayments = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

      // Open complaints
      const complaintsQuery = supabase
        .from('complaints')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'open');
      
      if (isVendor && vendorId) {
        complaintsQuery.eq('vendor_id', vendorId);
      }
      
      const { count: complaintsCount } = await complaintsQuery;

      // Print orders (projects in production or ready status)
      const printOrdersQuery = supabase
        .from('projects')
        .select('id', { count: 'exact', head: true })
        .in('status', ['printing', 'dispatched']);
      
      if (isVendor && vendorId) {
        printOrdersQuery.eq('vendor_id', vendorId);
      }
      
      const { count: printOrdersCount } = await printOrdersQuery;

      return {
        clients: clientsCount || 0,
        projects: projectsCount || 0,
        payments: totalPayments,
        complaints: complaintsCount || 0,
        printOrders: printOrdersCount || 0,
      };
    },
    enabled: !isVendor || !!vendorData?.id,
  });

  const statCards = [
    { title: 'Total Clients', value: stats?.clients || 0, icon: Users, color: 'text-primary' },
    { title: 'Ongoing Projects', value: stats?.projects || 0, icon: FolderKanban, color: 'text-success' },
    { title: 'Print Orders', value: stats?.printOrders || 0, icon: PrinterIcon, color: 'text-accent' },
    { title: 'Total Payments', value: `₹${stats?.payments.toLocaleString('en-IN') || 0}`, icon: DollarSign, color: 'text-warning' },
    { title: 'Open Complaints', value: stats?.complaints || 0, icon: MessageSquare, color: 'text-destructive' },
  ];

  return (
    <main className="flex-1 p-6 bg-background">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here's your overview.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5 mb-6">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-5 w-5 rounded" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))
        ) : (
          statCards.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No recent activity to display
          </p>
        </CardContent>
      </Card>
    </main>
  );
}