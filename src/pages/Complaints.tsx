import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
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
import { Search } from 'lucide-react';
import { format } from 'date-fns';
import { AddComplaintForm } from '@/components/admin/AddComplaintForm';

export default function Complaints() {
  const { user } = useAuth();
  const { isSuperAdmin } = useUserRole();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: complaints = [], isLoading } = useQuery({
    queryKey: ['complaints', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      let query = supabase
        .from('complaints')
        .select(`
          *,
          client:clients(name, institution_name),
          vendor:vendors(business_name)
        `)
        .order('created_at', { ascending: false });

      // If not super admin, filter by user
      if (!isSuperAdmin) {
        query = query.or(`vendor_id.eq.${user.id},client_id.eq.${user.id}`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const filteredComplaints = complaints.filter((complaint) =>
    searchQuery === '' ||
    complaint.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    complaint.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex-1 p-6 bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <main className="flex-1 p-4 sm:p-6 bg-background">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Complaints</h1>
          <p className="text-muted-foreground text-sm sm:text-base">Manage customer complaints and issues</p>
        </div>
        <AddComplaintForm />
      </div>

      <div className="mb-4">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search complaints..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="bg-card rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead className="hidden sm:table-cell">Client</TableHead>
              <TableHead className="hidden md:table-cell">Vendor</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead className="hidden sm:table-cell">Status</TableHead>
              <TableHead className="hidden lg:table-cell">Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredComplaints.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No complaints found
                </TableCell>
              </TableRow>
            ) : (
              filteredComplaints.map((complaint) => (
                <TableRow key={complaint.id}>
                  <TableCell className="font-medium">
                    <div>{complaint.title}</div>
                    <div className="sm:hidden text-xs text-muted-foreground">
                      {complaint.client?.institution_name || complaint.client?.name}
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {complaint.client?.institution_name || complaint.client?.name}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{complaint.vendor?.business_name}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        complaint.priority === 'high'
                          ? 'destructive'
                          : complaint.priority === 'medium'
                          ? 'default'
                          : 'secondary'
                      }
                      className="text-xs"
                    >
                      {complaint.priority?.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge
                      variant={
                        complaint.status === 'resolved'
                          ? 'default'
                          : complaint.status === 'in_progress'
                          ? 'secondary'
                          : 'outline'
                      }
                      className={`text-xs ${
                        complaint.status === 'resolved'
                          ? 'bg-green-500 hover:bg-green-600'
                          : ''
                      }`}
                    >
                      {complaint.status?.replace(/_/g, ' ').toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                    {format(new Date(complaint.created_at), 'dd MMM')}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </main>
  );
}
