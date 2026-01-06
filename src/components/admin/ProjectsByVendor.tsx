import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export function ProjectsByVendor() {
  const [selectedVendor, setSelectedVendor] = useState<string>('all');

  const { data: vendors = [] } = useQuery({
    queryKey: ['vendors-dropdown'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendors')
        .select('id, business_name')
        .order('business_name');

      if (error) throw error;
      return data;
    },
  });

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects-by-vendor', selectedVendor],
    queryFn: async () => {
      let query = supabase
        .from('projects')
        .select(`
          *,
          vendor:vendors(business_name),
          client:clients(name, institution_name),
          product:products(name, category)
        `)
        .order('created_at', { ascending: false });

      if (selectedVendor !== 'all') {
        query = query.eq('vendor_id', selectedVendor);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Projects by Vendor</CardTitle>
        <div className="mt-4">
          <Select value={selectedVendor} onValueChange={setSelectedVendor}>
            <SelectTrigger className="w-full md:w-[300px]">
              <SelectValue placeholder="Select vendor" />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              <SelectItem value="all">All Vendors</SelectItem>
              {vendors.map((vendor) => (
                <SelectItem key={vendor.id} value={vendor.id}>
                  {vendor.business_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {isLoading ? (
          <div className="text-muted-foreground">Loading projects...</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project #</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Vendor</TableHead>
                <TableHead className="hidden sm:table-cell">Client</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden lg:table-cell">Payment</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="hidden sm:table-cell">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No projects found
                  </TableCell>
                </TableRow>
              ) : (
                projects.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell className="font-mono text-xs sm:text-sm">
                      {project.project_number}
                    </TableCell>
                    <TableCell className="font-medium">
                      <div>{project.name}</div>
                      <div className="sm:hidden text-xs text-muted-foreground">
                        {project.client?.institution_name || project.client?.name}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{project.vendor?.business_name}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {project.client?.institution_name || project.client?.name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs uppercase">
                        {project.status?.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <Badge
                        variant={
                          project.payment_status === 'completed'
                            ? 'default'
                            : project.payment_status === 'partial'
                            ? 'secondary'
                            : 'outline'
                        }
                        className={
                          project.payment_status === 'completed'
                            ? 'bg-green-500 hover:bg-green-600'
                            : ''
                        }
                      >
                        {project.payment_status?.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      ₹{Number(project.total_amount || 0).toFixed(0)}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                      {format(new Date(project.created_at), 'dd MMM')}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
