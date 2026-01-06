import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, MoreHorizontal, Eye, RefreshCcw, Users, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  master_vendor: 'Master Vendor',
  vendor_staff: 'Vendor Staff',
  designer_staff: 'Designer',
  data_operator: 'Data Operator',
  sales_person: 'Sales Person',
  accounts_manager: 'Accounts Manager',
  production_manager: 'Production Manager',
  client: 'Client',
};

const ROLE_COLORS: Record<string, string> = {
  super_admin: 'bg-red-500',
  master_vendor: 'bg-purple-500',
  vendor_staff: 'bg-blue-500',
  designer_staff: 'bg-pink-500',
  data_operator: 'bg-cyan-500',
  sales_person: 'bg-green-500',
  accounts_manager: 'bg-orange-500',
  production_manager: 'bg-indigo-500',
  client: 'bg-gray-500',
};

type StaffMember = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  created_at: string;
  roles: string[];
};

export function StaffManagement() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  const queryClient = useQueryClient();

  const { data: staffMembers = [], isLoading, refetch } = useQuery({
    queryKey: ['staff-management'],
    queryFn: async () => {
      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Get all roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Combine profiles with roles
      const staffWithRoles = profiles.map((profile) => {
        const userRoles = roles
          .filter((r) => r.user_id === profile.id)
          .map((r) => r.role);

        return {
          ...profile,
          roles: userRoles,
        };
      });

      // Filter to only include staff (not clients, not vendors)
      return staffWithRoles.filter((staff) => 
        staff.roles.some((role: string) => 
          ['super_admin', 'designer_staff', 'data_operator', 'sales_person', 'accounts_manager', 'production_manager'].includes(role)
        )
      );
    },
  });

  const filteredStaff = staffMembers.filter((staff) =>
    searchQuery === '' ||
    staff.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    staff.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    staff.roles.some((role: string) => ROLE_LABELS[role]?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search staff..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCcw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Staff Management ({filteredStaff.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {isLoading ? (
            <div className="text-muted-foreground text-center py-8">Loading staff...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden md:table-cell">Email</TableHead>
                  <TableHead className="hidden lg:table-cell">Phone</TableHead>
                  <TableHead>Role(s)</TableHead>
                  <TableHead className="hidden sm:table-cell">Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStaff.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No staff members found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStaff.map((staff) => (
                    <TableRow key={staff.id}>
                      <TableCell>
                        <div className="font-medium">{staff.full_name}</div>
                        <div className="text-xs text-muted-foreground md:hidden">{staff.email}</div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{staff.email}</TableCell>
                      <TableCell className="hidden lg:table-cell">{staff.phone || '-'}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {staff.roles.map((role: string) => (
                            <Badge 
                              key={role} 
                              className={`${ROLE_COLORS[role] || 'bg-gray-500'} text-white text-xs`}
                            >
                              {ROLE_LABELS[role] || role}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                        {format(new Date(staff.created_at), 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              setSelectedStaff(staff);
                              setDetailsDialogOpen(true);
                            }}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Shield className="h-4 w-4 mr-2" />
                              Manage Permissions
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Staff Details</DialogTitle>
          </DialogHeader>
          {selectedStaff && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Name</div>
                  <div className="font-medium">{selectedStaff.full_name}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Email</div>
                  <div className="font-medium">{selectedStaff.email}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Phone</div>
                  <div className="font-medium">{selectedStaff.phone || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Joined</div>
                  <div className="font-medium">{format(new Date(selectedStaff.created_at), 'dd MMM yyyy')}</div>
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-2">Roles</div>
                <div className="flex flex-wrap gap-2">
                  {selectedStaff.roles.map((role: string) => (
                    <Badge 
                      key={role} 
                      className={`${ROLE_COLORS[role] || 'bg-gray-500'} text-white`}
                    >
                      {ROLE_LABELS[role] || role}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
