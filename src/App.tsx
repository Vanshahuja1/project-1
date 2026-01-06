import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RoleProtectedRoute } from "@/components/RoleProtectedRoute";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import DataManagement from "./pages/DataManagement";
import Projects from "./pages/Projects";
import ProjectDetails from "./pages/ProjectDetails";
import ProjectTasks from "./pages/ProjectTasks";
import Clients from "./pages/Clients";
import ClientDetails from "./pages/ClientDetails";
import Vendors from "./pages/Vendors";
import Staff from "./pages/Staff";
import Products from "./pages/Products";
import Complaints from "./pages/Complaints";
import PrintOrders from "./pages/PrintOrders";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Transactions from "./pages/Transactions";
import SuperAdmin from "./pages/SuperAdmin";
import TeacherEntry from "./pages/TeacherEntry";
import TemplateDesigner from "./pages/TemplateDesigner";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route 
            path="/dashboard/*" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/items" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/data-management" 
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <DataManagement />
                </DashboardLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/projects"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Projects />
                </DashboardLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/projects/:projectId" 
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <ProjectDetails />
                </DashboardLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/projects/:projectId/tasks" 
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <ProjectTasks />
                </DashboardLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/clients" 
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Clients />
                </DashboardLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/clients/:clientId" 
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <ClientDetails />
                </DashboardLayout>
              </ProtectedRoute>
            } 
          />
          <Route
            path="/vendors" 
            element={
              <RoleProtectedRoute allowedRoles={['super_admin', 'master_vendor']}>
                <DashboardLayout>
                  <Vendors />
                </DashboardLayout>
              </RoleProtectedRoute>
            } 
          />
          <Route 
            path="/staff" 
            element={
              <RoleProtectedRoute allowedRoles={['super_admin', 'master_vendor']}>
                <DashboardLayout>
                  <Staff />
                </DashboardLayout>
              </RoleProtectedRoute>
            } 
          />
          <Route 
            path="/products" 
            element={
              <RoleProtectedRoute allowedRoles={['super_admin', 'master_vendor']}>
                <DashboardLayout>
                  <Products />
                </DashboardLayout>
              </RoleProtectedRoute>
            } 
          />
          <Route 
            path="/complaints" 
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Complaints />
                </DashboardLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/print-orders" 
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <PrintOrders />
                </DashboardLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/reports" 
            element={
              <RoleProtectedRoute allowedRoles={['super_admin', 'master_vendor', 'accounts_manager']}>
                <DashboardLayout>
                  <Reports />
                </DashboardLayout>
              </RoleProtectedRoute>
            } 
          />
          <Route 
            path="/settings" 
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Settings />
                </DashboardLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/transactions" 
            element={
              <RoleProtectedRoute allowedRoles={['super_admin', 'master_vendor', 'accounts_manager']}>
                <DashboardLayout>
                  <Transactions />
                </DashboardLayout>
              </RoleProtectedRoute>
            } 
          />
          <Route 
            path="/super-admin" 
            element={
              <RoleProtectedRoute allowedRoles={['super_admin']}>
                <DashboardLayout>
                  <SuperAdmin />
                </DashboardLayout>
              </RoleProtectedRoute>
            } 
          />
          {/* Teacher Entry - Public route (no auth required) */}
          <Route path="/teacher-entry/:token" element={<TeacherEntry />} />
          {/* Template Designer - Opens separately without dashboard chrome */}
          <Route 
            path="/template-designer" 
            element={
              <ProtectedRoute>
                <TemplateDesigner />
              </ProtectedRoute>
            } 
          />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
