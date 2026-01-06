import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import { Building2, User, MapPin, Wallet, Calendar, FileText, Users } from 'lucide-react';

type Vendor = {
  id: string;
  business_name: string;
  gstin: string | null;
  is_master: boolean;
  active: boolean;
  wallet_balance: number;
  credit_limit: number;
  commission_percentage: number;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  parent_vendor_id: string | null;
  user_id: string;
  created_at: string;
  profile?: {
    full_name: string;
    email: string;
    phone: string | null;
  };
};

interface VendorDetailsDialogProps {
  vendor: Vendor | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VendorDetailsDialog({ vendor, open, onOpenChange }: VendorDetailsDialogProps) {
  // Fetch vendor's projects
  const { data: projects = [] } = useQuery({
    queryKey: ['vendor-projects', vendor?.id],
    queryFn: async () => {
      if (!vendor) return [];
      const { data, error } = await supabase
        .from('projects')
        .select(`
          id, name, project_number, status, payment_status, total_amount, created_at,
          client:clients(name, institution_name)
        `)
        .eq('vendor_id', vendor.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
    enabled: !!vendor && open,
  });

  // Fetch sub-vendors if master
  const { data: subVendors = [] } = useQuery({
    queryKey: ['sub-vendors', vendor?.id],
    queryFn: async () => {
      if (!vendor || !vendor.is_master) return [];
      const { data, error } = await supabase
        .from('vendors')
        .select('id, business_name, active, wallet_balance, created_at')
        .eq('parent_vendor_id', vendor.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!vendor && vendor.is_master && open,
  });

  // Fetch vendor's clients
  const { data: clients = [] } = useQuery({
    queryKey: ['vendor-clients', vendor?.id],
    queryFn: async () => {
      if (!vendor) return [];
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, institution_name, active, wallet_balance, created_at')
        .eq('vendor_id', vendor.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
    enabled: !!vendor && open,
  });

  if (!vendor) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-500';
      case 'data_upload': return 'bg-blue-500';
      case 'design': return 'bg-yellow-500';
      case 'approved': return 'bg-green-500';
      case 'printing': return 'bg-orange-500';
      case 'delivered': return 'bg-emerald-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {vendor.business_name}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Basic Info */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <User className="h-4 w-4" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Name:</span>
                <span className="font-medium">{vendor.profile?.full_name || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email:</span>
                <span className="font-medium">{vendor.profile?.email || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Phone:</span>
                <span className="font-medium">{vendor.profile?.phone || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">GSTIN:</span>
                <span className="font-mono">{vendor.gstin || '-'}</span>
              </div>
            </CardContent>
          </Card>

          {/* Address */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Address
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>{vendor.address || 'No address provided'}</p>
              <p>
                {[vendor.city, vendor.state, vendor.pincode].filter(Boolean).join(', ') || '-'}
              </p>
            </CardContent>
          </Card>

          {/* Financial */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                Financial
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Wallet Balance:</span>
                <span className="font-bold text-green-600">₹{Number(vendor.wallet_balance || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Credit Limit:</span>
                <span className="font-medium">₹{Number(vendor.credit_limit || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Commission:</span>
                <span className="font-medium">{vendor.commission_percentage || 0}%</span>
              </div>
            </CardContent>
          </Card>

          {/* Status */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Status & Type
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Status:</span>
                <Badge variant={vendor.active ? 'default' : 'secondary'} className={vendor.active ? 'bg-green-500' : ''}>
                  {vendor.active ? 'Active' : 'Suspended'}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Type:</span>
                <Badge variant={vendor.is_master ? 'default' : 'outline'}>
                  {vendor.is_master ? 'Master Vendor' : 'Sub-Vendor'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created:</span>
                <span className="font-medium">{format(new Date(vendor.created_at), 'dd MMM yyyy')}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="projects" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="projects">
              <FileText className="h-4 w-4 mr-1" />
              Projects ({projects.length})
            </TabsTrigger>
            <TabsTrigger value="clients">
              <Users className="h-4 w-4 mr-1" />
              Clients ({clients.length})
            </TabsTrigger>
            {vendor.is_master && (
              <TabsTrigger value="subvendors">
                <Building2 className="h-4 w-4 mr-1" />
                Sub-Vendors ({subVendors.length})
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="projects" className="mt-4">
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                        No projects found
                      </TableCell>
                    </TableRow>
                  ) : (
                    projects.map((project) => (
                      <TableRow key={project.id}>
                        <TableCell>
                          <div className="font-medium">{project.name}</div>
                          <div className="text-xs text-muted-foreground font-mono">{project.project_number}</div>
                        </TableCell>
                        <TableCell>{project.client?.institution_name || project.client?.name || '-'}</TableCell>
                        <TableCell>
                          <Badge className={`${getStatusColor(project.status || 'draft')} text-white text-xs`}>
                            {project.status?.replace(/_/g, ' ') || 'Draft'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          ₹{Number(project.total_amount || 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(project.created_at), 'dd MMM')}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="clients" className="mt-4">
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Added</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                        No clients found
                      </TableCell>
                    </TableRow>
                  ) : (
                    clients.map((client) => (
                      <TableRow key={client.id}>
                        <TableCell>
                          <div className="font-medium">{client.institution_name}</div>
                          <div className="text-xs text-muted-foreground">{client.name}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={client.active ? 'default' : 'secondary'} className={client.active ? 'bg-green-500' : ''}>
                            {client.active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          ₹{Number(client.wallet_balance || 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(client.created_at), 'dd MMM yyyy')}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {vendor.is_master && (
            <TabsContent value="subvendors" className="mt-4">
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Business Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead>Added</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subVendors.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                          No sub-vendors found
                        </TableCell>
                      </TableRow>
                    ) : (
                      subVendors.map((sub) => (
                        <TableRow key={sub.id}>
                          <TableCell className="font-medium">{sub.business_name}</TableCell>
                          <TableCell>
                            <Badge variant={sub.active ? 'default' : 'secondary'} className={sub.active ? 'bg-green-500' : ''}>
                              {sub.active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            ₹{Number(sub.wallet_balance || 0).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(sub.created_at), 'dd MMM yyyy')}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
