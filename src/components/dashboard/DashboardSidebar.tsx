import { useState, useEffect } from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { 
  Home,
  Package, 
  CheckSquare,
  Printer,
  ArrowLeftRight,
  AlertCircle,
  Users, 
  FolderKanban, 
  UserCog,
  BarChart3,
  TrendingUp,
  PieChart,
  ChevronDown,
  Settings as SettingsIcon
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export function DashboardSidebar() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isSuperAdmin, isVendor, hasRole } = useUserRole();
  
  // Persist activeMode in localStorage
  const [activeMode, setActiveMode] = useState<'vendor' | 'self'>(() => {
    const saved = localStorage.getItem('sidebar-active-mode');
    return (saved === 'self' || saved === 'vendor') ? saved : 'vendor';
  });
  
  // Save to localStorage when mode changes
  useEffect(() => {
    localStorage.setItem('sidebar-active-mode', activeMode);
  }, [activeMode]);
  
  const isVendorStaff = hasRole('vendor_staff');

  // Fetch user profile
  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch vendor data
  const { data: vendorData } = useQuery({
    queryKey: ['vendor', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .eq('user_id', user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && isVendor,
  });

  // Vendor Mode Menu (when activeMode = 'vendor')
  const vendorModeMenu = [
    { icon: Home, label: 'Home', path: '/dashboard' },
    { icon: Package, label: 'Items', path: '/items' },
    { icon: CheckSquare, label: 'Project Task', path: '/dashboard/tasks' },
    { icon: Printer, label: 'Print Orders', path: '/dashboard/print-orders' },
    { icon: ArrowLeftRight, label: 'Transactions', path: '/dashboard/transactions' },
    { icon: AlertCircle, label: 'Complaints', path: '/dashboard/complaints' },
  ];

  // Self Mode Menu (when activeMode = 'self')
  const selfModeMenu = [
    { icon: Package, label: 'Items', path: '/items' },
    { icon: Users, label: 'Clients', path: '/dashboard/clients' },
    { icon: FolderKanban, label: 'Projects', path: '/dashboard/projects' },
    { icon: CheckSquare, label: 'Project Task', path: '/dashboard/tasks' },
    { icon: UserCog, label: 'Staff', path: '/dashboard/staff' },
    { icon: BarChart3, label: 'Sales Report', path: '/dashboard/sales-report' },
    { icon: TrendingUp, label: 'Profit Report', path: '/dashboard/profit-report' },
    { icon: PieChart, label: 'Expected Sales Report', path: '/dashboard/expected-sales' },
  ];

  // Role-specific menus for staff
  const designerStaffMenu = [
    { icon: Home, label: 'Home', path: '/dashboard' },
    { icon: FolderKanban, label: 'Projects', path: '/dashboard/projects' },
    { icon: CheckSquare, label: 'My Tasks', path: '/dashboard/tasks' },
  ];

  const dataOperatorMenu = [
    { icon: Home, label: 'Home', path: '/dashboard' },
    { icon: FolderKanban, label: 'Projects', path: '/dashboard/projects' },
    { icon: CheckSquare, label: 'My Tasks', path: '/dashboard/tasks' },
  ];

  const salesPersonMenu = [
    { icon: Home, label: 'Home', path: '/dashboard' },
    { icon: Users, label: 'Clients', path: '/dashboard/clients' },
    { icon: FolderKanban, label: 'Projects', path: '/dashboard/projects' },
    { icon: BarChart3, label: 'Sales Report', path: '/dashboard/sales-report' },
  ];

  const accountsManagerMenu = [
    { icon: Home, label: 'Home', path: '/dashboard' },
    { icon: ArrowLeftRight, label: 'Transactions', path: '/dashboard/transactions' },
    { icon: BarChart3, label: 'Sales Report', path: '/dashboard/sales-report' },
    { icon: TrendingUp, label: 'Profit Report', path: '/dashboard/profit-report' },
  ];

  const productionManagerMenu = [
    { icon: Home, label: 'Home', path: '/dashboard' },
    { icon: FolderKanban, label: 'Projects', path: '/dashboard/projects' },
    { icon: Printer, label: 'Print Orders', path: '/dashboard/print-orders' },
    { icon: CheckSquare, label: 'Tasks', path: '/dashboard/tasks' },
  ];

  // Default vendor staff menu (fallback)
  const vendorStaffMenu = [
    { icon: Home, label: 'Home', path: '/dashboard' },
    { icon: Package, label: 'Items', path: '/items' },
    { icon: CheckSquare, label: 'Project Task', path: '/dashboard/tasks' },
    { icon: Printer, label: 'Print Orders', path: '/dashboard/print-orders' },
    { icon: AlertCircle, label: 'Complaints', path: '/dashboard/complaints' },
  ];

  // Super Admin Menu
  const superAdminMenu = [
    { icon: Home, label: 'Overview', path: '/dashboard' },
    { icon: Users, label: 'Vendors', path: '/dashboard/vendors' },
    { icon: FolderKanban, label: 'Clients', path: '/dashboard/clients' },
    { icon: Package, label: 'Projects', path: '/dashboard/projects' },
    { icon: Package, label: 'Products', path: '/dashboard/products' },
    { icon: CheckSquare, label: 'Templates', path: '/dashboard/templates' },
    { icon: CheckSquare, label: 'Template Designer', path: '/template-designer' },
    { icon: CheckSquare, label: 'Teacher Links', path: '/dashboard/teacher-links' },
    { icon: BarChart3, label: 'Reports', path: '/dashboard/reports' },
    { icon: UserCog, label: 'Add Vendor', path: '/dashboard/add-vendor' },
    { icon: UserCog, label: 'Add Staff', path: '/dashboard/add-staff' },
    { icon: AlertCircle, label: 'Complaints', path: '/dashboard/complaints' },
  ];

  // Determine which menu to show based on role
  const getStaffMenu = () => {
    if (hasRole('designer_staff')) return designerStaffMenu;
    if (hasRole('data_operator')) return dataOperatorMenu;
    if (hasRole('sales_person')) return salesPersonMenu;
    if (hasRole('accounts_manager')) return accountsManagerMenu;
    if (hasRole('production_manager')) return productionManagerMenu;
    return vendorStaffMenu;
  };

  let menuItems = [];
  if (isSuperAdmin) {
    menuItems = superAdminMenu;
  } else if (isVendor && !isVendorStaff) {
    // Master vendor - switch between vendor mode and self mode
    menuItems = activeMode === 'vendor' ? vendorModeMenu : selfModeMenu;
  } else {
    // Staff members get role-specific menus
    menuItems = getStaffMenu();
  }

  const userName = profile?.full_name || 'User';
  const userInitials = userName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);


  return (
    <Sidebar className="border-r">
      {/* User Profile Header */}
      <SidebarHeader className="border-b p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 bg-muted">
            <AvatarFallback className="bg-primary text-primary-foreground">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h3 className="font-semibold text-sm">{userName}</h3>
            <p className="text-xs text-muted-foreground">
              {isSuperAdmin ? 'Super Admin' : isVendor ? 'Vendor' : 'Staff'}
            </p>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 py-4">
        {/* Active Mode Toggle - Only for vendors (not vendor staff) */}
        {isVendor && !isVendorStaff && (
          <div className="mb-4">
            <Card className="p-3">
              <div className="mb-2">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  <span className="text-xs font-medium text-muted-foreground uppercase">
                    Active Mode
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={activeMode === 'vendor' ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1 h-8"
                  onClick={() => setActiveMode('vendor')}
                >
                  Vendor
                </Button>
                <Button
                  variant={activeMode === 'self' ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1 h-8"
                  onClick={() => setActiveMode('self')}
                >
                  Self
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Menu Items */}
        <SidebarMenu className="space-y-1">
          {menuItems.map((item: any) => (
            <SidebarMenuItem key={item.path}>
              <SidebarMenuButton
                onClick={() => {
                  if (item.external) {
                    window.open(item.path, '_blank');
                  } else {
                    navigate(item.path);
                  }
                }}
                className="w-full justify-start gap-3 px-3 py-2"
              >
                <item.icon className="h-4 w-4" />
                <span className="text-sm">{item.label}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="border-t p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => navigate('/dashboard/settings')}>
              <SettingsIcon className="h-4 w-4" />
              <span className="text-sm">Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}