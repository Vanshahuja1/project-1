import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Download, RefreshCcw, TrendingUp, DollarSign, Users, 
  Building2, BarChart3, Calendar, FileSpreadsheet
} from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';

export function AdminReportsPanel() {
  const [selectedPeriod, setSelectedPeriod] = useState('this_month');

  const getDateRange = () => {
    const now = new Date();
    switch (selectedPeriod) {
      case 'this_month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'last_month':
        const lastMonth = subMonths(now, 1);
        return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
      case 'last_3_months':
        return { start: startOfMonth(subMonths(now, 2)), end: endOfMonth(now) };
      case 'last_6_months':
        return { start: startOfMonth(subMonths(now, 5)), end: endOfMonth(now) };
      case 'this_year':
        return { start: new Date(now.getFullYear(), 0, 1), end: now };
      default:
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  };

  const { data: vendorReport = [], isLoading: vendorLoading, refetch: refetchVendor } = useQuery({
    queryKey: ['vendor-sales-report', selectedPeriod],
    queryFn: async () => {
      const { start, end } = getDateRange();
      
      const { data: vendors, error: vendorsError } = await supabase
        .from('vendors')
        .select('id, business_name, commission_percentage, wallet_balance');

      if (vendorsError) throw vendorsError;

      const vendorStats = await Promise.all(
        (vendors || []).map(async (vendor) => {
          const [projectsRes, paymentsRes] = await Promise.all([
            supabase
              .from('projects')
              .select('id, total_amount, paid_amount, quantity')
              .eq('vendor_id', vendor.id)
              .gte('created_at', start.toISOString())
              .lte('created_at', end.toISOString()),
            supabase
              .from('payments')
              .select('amount')
              .eq('vendor_id', vendor.id)
              .gte('created_at', start.toISOString())
              .lte('created_at', end.toISOString()),
          ]);

          const projects = projectsRes.data || [];
          const payments = paymentsRes.data || [];

          const totalSales = projects.reduce((sum, p) => sum + Number(p.total_amount || 0), 0);
          const totalCollected = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
          const totalQuantity = projects.reduce((sum, p) => sum + Number(p.quantity || 0), 0);
          const commission = totalSales * (vendor.commission_percentage || 0) / 100;
          const profit = totalSales - commission;

          return {
            ...vendor,
            projectsCount: projects.length,
            totalSales,
            totalCollected,
            totalQuantity,
            commission,
            profit,
            pending: totalSales - totalCollected,
          };
        })
      );

      return vendorStats.sort((a, b) => b.totalSales - a.totalSales);
    },
  });

  const { data: revenueStats, isLoading: revenueLoading } = useQuery({
    queryKey: ['revenue-summary', selectedPeriod],
    queryFn: async () => {
      const { start, end } = getDateRange();

      const [projectsRes, paymentsRes] = await Promise.all([
        supabase
          .from('projects')
          .select('total_amount, paid_amount, quantity, status')
          .gte('created_at', start.toISOString())
          .lte('created_at', end.toISOString()),
        supabase
          .from('payments')
          .select('amount, payment_method')
          .gte('created_at', start.toISOString())
          .lte('created_at', end.toISOString()),
      ]);

      const projects = projectsRes.data || [];
      const payments = paymentsRes.data || [];

      const totalProjectValue = projects.reduce((sum, p) => sum + Number(p.total_amount || 0), 0);
      const totalReceived = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const totalQuantity = projects.reduce((sum, p) => sum + Number(p.quantity || 0), 0);
      const completedProjects = projects.filter(p => p.status === 'delivered').length;

      return {
        totalProjectValue,
        totalReceived,
        pending: totalProjectValue - totalReceived,
        projectsCount: projects.length,
        totalQuantity,
        completedProjects,
        paymentsCount: payments.length,
      };
    },
  });

  const { data: staffReport = [], isLoading: staffLoading } = useQuery({
    queryKey: ['staff-performance', selectedPeriod],
    queryFn: async () => {
      const { start, end } = getDateRange();

      const { data: tasks, error } = await supabase
        .from('project_tasks')
        .select(`
          id, status, assigned_to, task_type, completed_at,
          project:projects(name)
        `)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      if (error) throw error;

      // Group by assigned_to
      const staffStats: Record<string, any> = {};
      (tasks || []).forEach((task) => {
        const userId = task.assigned_to || 'unassigned';
        if (!staffStats[userId]) {
          staffStats[userId] = {
            userId,
            totalTasks: 0,
            completedTasks: 0,
            pendingTasks: 0,
            inProgressTasks: 0,
          };
        }
        staffStats[userId].totalTasks++;
        if (task.status === 'completed') {
          staffStats[userId].completedTasks++;
        } else if (task.status === 'in_progress') {
          staffStats[userId].inProgressTasks++;
        } else {
          staffStats[userId].pendingTasks++;
        }
      });

      // Get profiles for staff
      const userIds = Object.keys(staffStats).filter(id => id !== 'unassigned');
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);

        (profiles || []).forEach((profile) => {
          if (staffStats[profile.id]) {
            staffStats[profile.id].name = profile.full_name;
            staffStats[profile.id].email = profile.email;
          }
        });
      }

      return Object.values(staffStats).filter((s: any) => s.userId !== 'unassigned');
    },
  });

  const exportToExcel = (data: any[], filename: string) => {
    // Simple CSV export
    if (data.length === 0) {
      toast.error('No data to export');
      return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(h => `"${row[h] || ''}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    toast.success('Report downloaded');
  };

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this_month">This Month</SelectItem>
              <SelectItem value="last_month">Last Month</SelectItem>
              <SelectItem value="last_3_months">Last 3 Months</SelectItem>
              <SelectItem value="last_6_months">Last 6 Months</SelectItem>
              <SelectItem value="this_year">This Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Revenue Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Sales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{(revenueStats?.totalProjectValue || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {revenueStats?.projectsCount || 0} projects
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Collected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              ₹{(revenueStats?.totalReceived || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {revenueStats?.paymentsCount || 0} payments
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">
              ₹{(revenueStats?.pending || 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Items Processed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(revenueStats?.totalQuantity || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {revenueStats?.completedProjects || 0} delivered
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="vendor" className="space-y-4">
        <TabsList>
          <TabsTrigger value="vendor" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Vendor Sales
          </TabsTrigger>
          <TabsTrigger value="staff" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Staff Performance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vendor" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Vendor-wise Sales Report</CardTitle>
                <CardDescription>Sales and profit breakdown by vendor</CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => exportToExcel(vendorReport, 'vendor_sales_report')}
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Export
              </Button>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {vendorLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vendor</TableHead>
                      <TableHead className="text-right">Projects</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Total Sales</TableHead>
                      <TableHead className="text-right">Collected</TableHead>
                      <TableHead className="text-right">Pending</TableHead>
                      <TableHead className="text-right">Commission</TableHead>
                      <TableHead className="text-right">Profit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vendorReport.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No data for selected period
                        </TableCell>
                      </TableRow>
                    ) : (
                      vendorReport.map((vendor: any) => (
                        <TableRow key={vendor.id}>
                          <TableCell className="font-medium">{vendor.business_name}</TableCell>
                          <TableCell className="text-right">{vendor.projectsCount}</TableCell>
                          <TableCell className="text-right">{vendor.totalQuantity.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-semibold">
                            ₹{vendor.totalSales.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right text-green-500">
                            ₹{vendor.totalCollected.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right text-orange-500">
                            ₹{vendor.pending.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            ₹{vendor.commission.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-emerald-500">
                            ₹{vendor.profit.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="staff" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Staff Performance Report</CardTitle>
                <CardDescription>Task completion by staff members</CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => exportToExcel(staffReport, 'staff_performance_report')}
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Export
              </Button>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {staffLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Staff Member</TableHead>
                      <TableHead className="text-right">Total Tasks</TableHead>
                      <TableHead className="text-right">Completed</TableHead>
                      <TableHead className="text-right">In Progress</TableHead>
                      <TableHead className="text-right">Pending</TableHead>
                      <TableHead className="text-right">Completion Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {staffReport.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No staff tasks for selected period
                        </TableCell>
                      </TableRow>
                    ) : (
                      staffReport.map((staff: any) => (
                        <TableRow key={staff.userId}>
                          <TableCell>
                            <div className="font-medium">{staff.name || 'Unknown'}</div>
                            <div className="text-xs text-muted-foreground">{staff.email}</div>
                          </TableCell>
                          <TableCell className="text-right">{staff.totalTasks}</TableCell>
                          <TableCell className="text-right text-green-500">{staff.completedTasks}</TableCell>
                          <TableCell className="text-right text-blue-500">{staff.inProgressTasks}</TableCell>
                          <TableCell className="text-right text-orange-500">{staff.pendingTasks}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={staff.completedTasks / staff.totalTasks > 0.7 ? 'default' : 'secondary'}>
                              {Math.round((staff.completedTasks / staff.totalTasks) * 100)}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
