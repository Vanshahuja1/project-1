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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, MoreHorizontal, Edit, Wallet, FileText, RefreshCcw, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Label } from '@/components/ui/label';

type Client = {
  id: string;
  name: string;
  institution_name: string;
  email: string | null;
  phone: string;
  city: string | null;
  state: string | null;
  active: boolean;
  wallet_balance: number;
  credit_limit: number;
  created_at: string;
  vendor?: {
    business_name: string;
  };
};

export function ClientManagement() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [ledgerDialogOpen, setLedgerDialogOpen] = useState(false);
  const [walletDialogOpen, setWalletDialogOpen] = useState(false);
  const [walletAmount, setWalletAmount] = useState('');
  const [editForm, setEditForm] = useState({
    credit_limit: 0,
  });

  const queryClient = useQueryClient();

  const { data: clients = [], isLoading, refetch } = useQuery({
    queryKey: ['clients-management'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select(`
          *,
          vendor:vendors(business_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Client[];
    },
  });

  const { data: ledgerData = [] } = useQuery({
    queryKey: ['client-ledger', selectedClient?.id],
    queryFn: async () => {
      if (!selectedClient) return [];
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('client_id', selectedClient.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
    enabled: !!selectedClient && ledgerDialogOpen,
  });

  const updateClientMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Client> }) => {
      const { error } = await supabase
        .from('clients')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Client updated successfully');
      queryClient.invalidateQueries({ queryKey: ['clients-management'] });
      setEditDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update client');
    },
  });

  const addWalletBalanceMutation = useMutation({
    mutationFn: async ({ clientId, amount }: { clientId: string; amount: number }) => {
      const client = clients.find(c => c.id === clientId);
      if (!client) throw new Error('Client not found');

      const newBalance = Number(client.wallet_balance || 0) + amount;

      const { error: updateError } = await supabase
        .from('clients')
        .update({ wallet_balance: newBalance })
        .eq('id', clientId);

      if (updateError) throw updateError;

      const { error: txError } = await supabase
        .from('wallet_transactions')
        .insert({
          client_id: clientId,
          amount: amount,
          balance_after: newBalance,
          transaction_type: 'credit',
          description: 'Manual balance addition by Super Admin',
        });

      if (txError) throw txError;
    },
    onSuccess: () => {
      toast.success('Wallet balance updated');
      queryClient.invalidateQueries({ queryKey: ['clients-management'] });
      setWalletDialogOpen(false);
      setWalletAmount('');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to add balance');
    },
  });

  const filteredClients = clients.filter((client) =>
    searchQuery === '' ||
    client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.institution_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.vendor?.business_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEditOpen = (client: Client) => {
    setSelectedClient(client);
    setEditForm({
      credit_limit: client.credit_limit || 0,
    });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!selectedClient) return;
    updateClientMutation.mutate({
      id: selectedClient.id,
      data: {
        credit_limit: editForm.credit_limit,
      },
    });
  };

  const handleAddWallet = () => {
    if (!selectedClient || !walletAmount) return;
    const amount = parseFloat(walletAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    addWalletBalanceMutation.mutate({ clientId: selectedClient.id, amount });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
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
            <Building2 className="h-5 w-5" />
            Client Management ({filteredClients.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {isLoading ? (
            <div className="text-muted-foreground text-center py-8">Loading clients...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Institution</TableHead>
                  <TableHead className="hidden md:table-cell">Contact</TableHead>
                  <TableHead className="hidden lg:table-cell">Vendor</TableHead>
                  <TableHead className="hidden md:table-cell">Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No clients found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredClients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell>
                        <div className="font-medium">{client.institution_name}</div>
                        <div className="text-xs text-muted-foreground">{client.name}</div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div>{client.email || '-'}</div>
                        <div className="text-xs text-muted-foreground">{client.phone}</div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <Badge variant="outline">{client.vendor?.business_name || '-'}</Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {client.city && client.state ? `${client.city}, ${client.state}` : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={client.active ? 'default' : 'secondary'}
                          className={client.active ? 'bg-green-500 hover:bg-green-600' : ''}
                        >
                          {client.active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        ₹{Number(client.wallet_balance || 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditOpen(client)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Credit Limit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              setSelectedClient(client);
                              setWalletDialogOpen(true);
                            }}>
                              <Wallet className="h-4 w-4 mr-2" />
                              Add Balance
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              setSelectedClient(client);
                              setLedgerDialogOpen(true);
                            }}>
                              <FileText className="h-4 w-4 mr-2" />
                              View Transactions
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

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Client: {selectedClient?.institution_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Credit Limit (₹)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={editForm.credit_limit}
                onChange={(e) => setEditForm({ ...editForm, credit_limit: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <Button onClick={handleSaveEdit} className="w-full" disabled={updateClientMutation.isPending}>
              {updateClientMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Wallet Dialog */}
      <Dialog open={walletDialogOpen} onOpenChange={setWalletDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Balance: {selectedClient?.institution_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground">Current Balance</div>
              <div className="text-2xl font-bold">₹{Number(selectedClient?.wallet_balance || 0).toLocaleString()}</div>
            </div>
            <div className="space-y-2">
              <Label>Amount to Add (₹)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={walletAmount}
                onChange={(e) => setWalletAmount(e.target.value)}
                placeholder="Enter amount"
              />
            </div>
            <Button onClick={handleAddWallet} className="w-full" disabled={addWalletBalanceMutation.isPending}>
              {addWalletBalanceMutation.isPending ? 'Adding...' : 'Add Balance'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Ledger Dialog */}
      <Dialog open={ledgerDialogOpen} onOpenChange={setLedgerDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Transactions: {selectedClient?.institution_name}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ledgerData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No transactions found
                    </TableCell>
                  </TableRow>
                ) : (
                  ledgerData.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="text-sm">
                        {format(new Date(tx.created_at), 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell>
                        <Badge variant={tx.transaction_type === 'credit' ? 'default' : 'secondary'}>
                          {tx.transaction_type}
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-right font-semibold ${tx.transaction_type === 'credit' ? 'text-green-500' : 'text-red-500'}`}>
                        {tx.transaction_type === 'credit' ? '+' : '-'}₹{Math.abs(tx.amount).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        ₹{tx.balance_after.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {tx.description || '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
