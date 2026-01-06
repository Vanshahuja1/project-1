import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ArrowLeft, Mail, Wallet, CreditCard, Pencil, Plus, Search, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { AddBalanceDialog } from '@/components/client/AddBalanceDialog';
import { EditCreditLimitDialog } from '@/components/client/EditCreditLimitDialog';

export default function ClientDetails() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [stageFilter, setStageFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [addBalanceOpen, setAddBalanceOpen] = useState(false);
  const [editCreditOpen, setEditCreditOpen] = useState(false);

  const { data: client, isLoading } = useQuery({
    queryKey: ['client', clientId],
    queryFn: async () => {
      if (!clientId) throw new Error('Client ID required');
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['client-projects', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          product:products(name, category)
        `)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  const { data: walletTransactions = [] } = useQuery({
    queryKey: ['client-wallet', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  const filteredProjects = projects.filter(project => {
    if (searchQuery && !project.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (statusFilter !== 'all' && project.status !== statusFilter) {
      return false;
    }
    return true;
  });

  const resetFilters = () => {
    setSearchQuery('');
    setTypeFilter('all');
    setStageFilter('all');
    setStatusFilter('all');
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-6 bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex-1 p-6 bg-background">
        <div className="text-destructive">Client not found</div>
      </div>
    );
  }

  const initials = client.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'C';

  return (
    <main className="flex-1 p-4 sm:p-6 bg-background">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/clients')} className="p-0 h-auto">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Clients
        </Button>
        <span>/</span>
        <span className="text-foreground">Client Details</span>
      </div>

      {/* Header Card */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Client Info */}
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14 bg-primary/10">
                <AvatarFallback className="text-lg font-semibold bg-primary/10 text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-xl font-bold">{client.institution_name || client.name}</h1>
                <div className="flex items-center gap-1 text-muted-foreground text-sm">
                  <Mail className="h-3 w-3" />
                  <span>{client.email || 'No email'}</span>
                </div>
              </div>
            </div>

            {/* Balance & Credit Cards */}
            <div className="flex flex-wrap gap-3">
              <Card className="border-green-200 bg-green-50 dark:bg-green-950/20 min-w-[160px]">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1 text-green-600 text-xs font-medium mb-1">
                      <Wallet className="h-3 w-3" />
                      Balance
                    </div>
                    <div className="text-lg font-bold text-green-700 dark:text-green-500">
                      ₹ {Number(client.wallet_balance || 0).toFixed(2)}
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600 hover:bg-green-100" onClick={() => setAddBalanceOpen(true)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 min-w-[160px]">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1 text-blue-600 text-xs font-medium mb-1">
                      <CreditCard className="h-3 w-3" />
                      Credit Limit
                    </div>
                    <div className="text-lg font-bold text-blue-700 dark:text-blue-500">
                      ₹ {Number(client.credit_limit || 0).toFixed(2)}
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-600 hover:bg-blue-100" onClick={() => setEditCreditOpen(true)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </div>

            <Button size="icon" variant="outline">
              <Pencil className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="projects" className="w-full">
        <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent">
          <TabsTrigger value="account" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
            Account Details
          </TabsTrigger>
          <TabsTrigger value="projects" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
            Projects
          </TabsTrigger>
          <TabsTrigger value="wallet" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
            Wallet
          </TabsTrigger>
          <TabsTrigger value="addresses" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
            Addresses
          </TabsTrigger>
        </TabsList>

        {/* Account Details Tab */}
        <TabsContent value="account" className="mt-6">
          <Card>
            <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-muted-foreground">Contact Name</p>
                <p className="font-medium">{client.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Institution</p>
                <p className="font-medium">{client.institution_name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium">{client.phone}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{client.email || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge variant={client.active ? 'default' : 'secondary'} className={client.active ? 'bg-green-500' : ''}>
                  {client.active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Created</p>
                <p className="font-medium">{format(new Date(client.created_at), 'dd MMM yyyy')}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Projects Tab */}
        <TabsContent value="projects" className="mt-6 space-y-4">
          {/* Filters Row */}
          <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between">
            <div className="flex flex-wrap gap-3 flex-1">
              <div className="w-full sm:w-auto">
                <label className="text-xs text-muted-foreground mb-1 block">Keyword search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 w-full sm:w-[180px]"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Type</label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="coaching">Coaching</SelectItem>
                    <SelectItem value="school">School</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Stage</label>
                <Select value={stageFilter} onValueChange={setStageFilter}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="design">Design</SelectItem>
                    <SelectItem value="printing">Printing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button variant="outline" onClick={resetFilters}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset all
                </Button>
              </div>
            </div>
            <Button className="bg-primary">
              <Plus className="h-4 w-4 mr-2" />
              Add New
            </Button>
          </div>

          {/* Total Records Badge */}
          <Badge variant="secondary" className="bg-primary/10 text-primary">
            Total Records : {filteredProjects.length}
          </Badge>

          {/* Projects Table */}
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project Name</TableHead>
                  <TableHead>Client Name</TableHead>
                  <TableHead className="hidden md:table-cell">Sales Person</TableHead>
                  <TableHead className="hidden lg:table-cell">Assigned Staff</TableHead>
                  <TableHead className="hidden sm:table-cell">Type</TableHead>
                  <TableHead className="hidden md:table-cell">Created At</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProjects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <div className="flex flex-col items-center text-muted-foreground">
                        <div className="h-16 w-16 bg-muted rounded-lg flex items-center justify-center mb-2">
                          📋
                        </div>
                        <p>No data found</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProjects.map((project) => (
                    <TableRow 
                      key={project.id} 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/projects/${project.id}`)}
                    >
                      <TableCell className="font-medium">{project.name}</TableCell>
                      <TableCell>{client.name}</TableCell>
                      <TableCell className="hidden md:table-cell">-</TableCell>
                      <TableCell className="hidden lg:table-cell">-</TableCell>
                      <TableCell className="hidden sm:table-cell">{project.product?.category || '-'}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        {format(new Date(project.created_at), 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {project.status?.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Wallet Tab */}
        <TabsContent value="wallet" className="mt-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Transaction History</h3>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Transaction
                </Button>
              </div>
              {walletTransactions.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No transactions yet</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {walletTransactions.map((txn) => (
                      <TableRow key={txn.id}>
                        <TableCell>{format(new Date(txn.created_at), 'dd MMM yyyy')}</TableCell>
                        <TableCell className="capitalize">{txn.transaction_type}</TableCell>
                        <TableCell>{txn.description || '-'}</TableCell>
                        <TableCell className={`text-right font-medium ${txn.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {txn.amount >= 0 ? '+' : ''}₹{Number(txn.amount).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">₹{Number(txn.balance_after).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Addresses Tab */}
        <TabsContent value="addresses" className="mt-6">
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Address</p>
                  <p className="font-medium">{client.address || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">City</p>
                  <p className="font-medium">{client.city || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">State</p>
                  <p className="font-medium">{client.state || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pincode</p>
                  <p className="font-medium">{client.pincode || '-'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AddBalanceDialog
        open={addBalanceOpen}
        onOpenChange={setAddBalanceOpen}
        clientId={clientId!}
        currentBalance={Number(client.wallet_balance || 0)}
        creditLimit={Number(client.credit_limit || 0)}
      />
      <EditCreditLimitDialog
        open={editCreditOpen}
        onOpenChange={setEditCreditOpen}
        clientId={clientId!}
        currentLimit={Number(client.credit_limit || 0)}
        currentBalance={Number(client.wallet_balance || 0)}
      />
    </main>
  );
}
