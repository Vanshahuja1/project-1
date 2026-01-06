-- Fix search_path for update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Complete RLS Policies for profiles
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Super admins can manage all profiles" ON public.profiles FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));

-- Complete RLS Policies for vendors
CREATE POLICY "Vendors can insert own data" ON public.vendors FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Vendors can update own data" ON public.vendors FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Super admins can manage all vendors" ON public.vendors FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));

-- Complete RLS Policies for clients
CREATE POLICY "Vendors can insert clients" ON public.clients FOR INSERT WITH CHECK (
  vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid())
);
CREATE POLICY "Vendors can update own clients" ON public.clients FOR UPDATE USING (
  vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid())
);
CREATE POLICY "Vendors can delete own clients" ON public.clients FOR DELETE USING (
  vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid())
);
CREATE POLICY "Super admins can manage all clients" ON public.clients FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));

-- Complete RLS Policies for vendor_pricing
CREATE POLICY "Vendors can view own pricing" ON public.vendor_pricing FOR SELECT USING (
  vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid())
);
CREATE POLICY "Vendors can manage own pricing" ON public.vendor_pricing FOR ALL USING (
  vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid())
);
CREATE POLICY "Super admins can manage all pricing" ON public.vendor_pricing FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));

-- Complete RLS Policies for templates
CREATE POLICY "Vendors can manage own templates" ON public.templates FOR ALL USING (
  vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid())
);

-- Complete RLS Policies for projects
CREATE POLICY "Vendors can manage own projects" ON public.projects FOR ALL USING (
  vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid())
);
CREATE POLICY "Super admins can manage all projects" ON public.projects FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));

-- Complete RLS Policies for project_groups
CREATE POLICY "Users can view project groups" ON public.project_groups FOR SELECT USING (
  project_id IN (
    SELECT id FROM public.projects WHERE 
    vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid())
    OR client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
  )
);
CREATE POLICY "Vendors can manage project groups" ON public.project_groups FOR ALL USING (
  project_id IN (SELECT id FROM public.projects WHERE vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid()))
);

-- Complete RLS Policies for project_tasks
CREATE POLICY "Users can view assigned tasks" ON public.project_tasks FOR SELECT USING (
  assigned_to = auth.uid() OR
  project_id IN (SELECT id FROM public.projects WHERE vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid()))
);
CREATE POLICY "Vendors can manage project tasks" ON public.project_tasks FOR ALL USING (
  project_id IN (SELECT id FROM public.projects WHERE vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid()))
);

-- Complete RLS Policies for data_records
CREATE POLICY "Users can view data records" ON public.data_records FOR SELECT USING (
  project_id IN (
    SELECT id FROM public.projects WHERE 
    vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid())
    OR client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
  )
);
CREATE POLICY "Vendors can manage data records" ON public.data_records FOR ALL USING (
  project_id IN (SELECT id FROM public.projects WHERE vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid()))
);

-- Complete RLS Policies for payments
CREATE POLICY "Users can view own payments" ON public.payments FOR SELECT USING (
  vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid())
  OR client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
);
CREATE POLICY "Vendors can manage payments" ON public.payments FOR ALL USING (
  vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid())
  OR public.has_role(auth.uid(), 'accounts_manager')
);

-- Complete RLS Policies for wallet_transactions
CREATE POLICY "Users can view own wallet transactions" ON public.wallet_transactions FOR SELECT USING (
  vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid())
  OR client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
);
CREATE POLICY "Accounts managers can manage wallet transactions" ON public.wallet_transactions FOR ALL USING (
  public.has_role(auth.uid(), 'accounts_manager')
  OR public.has_role(auth.uid(), 'super_admin')
);

-- Complete RLS Policies for complaints
CREATE POLICY "Users can view own complaints" ON public.complaints FOR SELECT USING (
  vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid())
  OR client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
);
CREATE POLICY "Clients can create complaints" ON public.complaints FOR INSERT WITH CHECK (
  client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
);
CREATE POLICY "Vendors can manage complaints" ON public.complaints FOR ALL USING (
  vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid())
);

-- Complete RLS Policies for notifications
CREATE POLICY "System can create notifications" ON public.notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can delete own notifications" ON public.notifications FOR DELETE USING (auth.uid() = user_id);