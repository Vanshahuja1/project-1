import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
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
import { Search, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { AddProjectForm } from '@/components/admin/AddProjectForm';

export default function Projects() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: vendorData } = useQuery({
    queryKey: ['vendor', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('vendors')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects', vendorData?.id],
    queryFn: async () => {
      if (!vendorData?.id) return [];
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          client:clients(name, institution_name),
          product:products(name, category)
        `)
        .eq('vendor_id', vendorData.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!vendorData?.id,
  });

  const filteredProjects = projects.filter((project) =>
    searchQuery === '' ||
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.project_number.toLowerCase().includes(searchQuery.toLowerCase())
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
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Projects</h1>
          <p className="text-muted-foreground text-sm sm:text-base">Manage your projects</p>
        </div>
        <AddProjectForm />
      </div>

      <div className="mb-4">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
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
              <TableHead>Project #</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="hidden sm:table-cell">Client</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell">Payment</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="hidden lg:table-cell">Delivery</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProjects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No projects found
                </TableCell>
              </TableRow>
            ) : (
              filteredProjects.map((project) => (
                <TableRow 
                  key={project.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/projects/${project.id}`)}
                >
                  <TableCell className="font-mono text-xs sm:text-sm">{project.project_number}</TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {project.name}
                      <ExternalLink className="h-3 w-3 text-muted-foreground hidden sm:block" />
                    </div>
                    <div className="sm:hidden text-xs text-muted-foreground">
                      {project.client?.institution_name || project.client?.name}
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">{project.client?.institution_name || project.client?.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs uppercase">
                      {project.status?.replace(/_/g, ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
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
                  <TableCell className="hidden lg:table-cell text-sm">
                    {project.expected_delivery_date
                      ? format(new Date(project.expected_delivery_date), 'dd MMM')
                      : '-'}
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
