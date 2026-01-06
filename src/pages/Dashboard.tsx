import { SidebarProvider } from '@/components/ui/sidebar';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardContent } from '@/components/dashboard/DashboardContent';
import { useLocation } from 'react-router-dom';
import Items from './Items';
import PrintOrders from './PrintOrders';
import Transactions from './Transactions';
import SuperAdmin from './SuperAdmin';
import Clients from './Clients';
import Projects from './Projects';
import ProjectTasks from './ProjectTasks';
import Staff from './Staff';
import Complaints from './Complaints';
import Reports from './Reports';
import Products from './Products';
import Vendors from './Vendors';
import Settings from './Settings';
import { useUserRole } from '@/hooks/useUserRole';
import { VendorManagement } from '@/components/admin/VendorManagement';
import { ClientManagement } from '@/components/admin/ClientManagement';
import { GlobalProjectsView } from '@/components/admin/GlobalProjectsView';
import { TemplateManagement } from '@/components/admin/TemplateManagement';
import { AdminReportsPanel } from '@/components/admin/AdminReportsPanel';
import { CreateVendorForm } from '@/components/admin/CreateVendorForm';
import { CreateStaffForm } from '@/components/admin/CreateStaffForm';
import { AdvancedTemplateDesigner } from '@/components/designer/AdvancedTemplateDesigner';
import { TeacherLinkManagement } from '@/components/admin/TeacherLinkManagement';

export default function Dashboard() {
  const location = useLocation();
  const { isSuperAdmin } = useUserRole();
  
  const renderContent = () => {
    // Super admin gets their own panel on dashboard
    if (isSuperAdmin && location.pathname === '/dashboard') {
      return <SuperAdmin />;
    }

    // Super admin specific routes
    if (isSuperAdmin) {
      switch (location.pathname) {
        case '/dashboard/vendors':
          return <VendorManagement />;
        case '/dashboard/clients':
          return <ClientManagement />;
        case '/dashboard/projects':
          return <GlobalProjectsView />;
        case '/dashboard/templates':
          return <TemplateManagement />;
        case '/dashboard/reports':
          return <AdminReportsPanel />;
        case '/dashboard/add-vendor':
          return <CreateVendorForm />;
        case '/dashboard/add-staff':
          return <CreateStaffForm />;
        case '/dashboard/template-designer':
          return <AdvancedTemplateDesigner />;
        case '/dashboard/teacher-links':
          return <TeacherLinkManagement />;
      }
    }

    switch (location.pathname) {
      case '/items':
        return <Items />;
      case '/dashboard/clients':
        return <Clients />;
      case '/dashboard/projects':
        return <Projects />;
      case '/dashboard/tasks':
        return <ProjectTasks />;
      case '/dashboard/print-orders':
        return <PrintOrders />;
      case '/dashboard/transactions':
        return <Transactions />;
      case '/dashboard/staff':
        return <Staff />;
      case '/dashboard/complaints':
        return <Complaints />;
      case '/dashboard/sales-report':
      case '/dashboard/profit-report':
      case '/dashboard/expected-sales':
        return <Reports />;
      case '/dashboard/products':
        return <Products />;
      case '/dashboard/vendors':
        return <Vendors />;
      case '/dashboard/settings':
        return <Settings />;
      default:
        return <DashboardContent />;
    }
  };
  
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <DashboardSidebar />
        <div className="flex-1 flex flex-col">
          <DashboardHeader />
          {renderContent()}
        </div>
      </div>
    </SidebarProvider>
  );
}