import { useState, useMemo } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Search, MoreHorizontal, Edit, UserX, Wallet, FileText, Eye, RefreshCcw, 
  Plus, Check, X, Building2
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Label } from '@/components/ui/label';
import { VendorStatsCards } from './VendorStatsCards';
import { VendorDetailsDialog } from './VendorDetailsDialog';
import { VendorExport } from './VendorExport';

type Vendor = {
  id: string;
  user_id: string;
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
  created_at: string;
  profile?: {
    full_name: string;
    email: string;
    phone: string | null;
  };
  projects_count?: number;
  total_revenue?: number;
};

const LOW_BALANCE_THRESHOLD = 5000;

export function VendorManagement() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [ledgerDialogOpen, setLedgerDialogOpen] = useState(false);
  const [walletDialogOpen, setWalletDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [walletAmount, setWalletAmount] = useState('');
  const [walletNote, setWalletNote] = useState('');
  const [editForm, setEditForm] = useState({
    commission_percentage: 0,
    credit_limit: 0,
    gstin: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
  });

  const queryClient = useQueryClient();

  const { data: vendors = [], isLoading, refetch } = useQuery({
    queryKey: ['vendors-management'],
    queryFn: async () => {
      const { data: vendorsData, error } = await supabase
        .from('vendors')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const vendorsWithDetails = await Promise.all(
        vendorsData.map(async (vendor) => {
          const [profileRes, projectsRes, paymentsRes] = await Promise.all([
            supabase.from('profiles').select('full_name, email, phone').eq('id', vendor.user_id).maybeSingle(),
            supabase.from('projects').select('id', { count: 'exact' }).eq('vendor_id', vendor.id),
            supabase.from('payments').select('amount').eq('vendor_id', vendor.id),
          ]);

          const totalRevenue = (paymentsRes.data || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);

          return {
            ...vendor,
            profile: profileRes.data || undefined,
            projects_count: projectsRes.count || 0,
            total_revenue: totalRevenue,
          };
        })
      );

      return vendorsWithDetails as Vendor[];
    },
  });

  const { data: ledgerData = [] } = useQuery({
    queryKey: ['vendor-ledger', selectedVendor?.id],
    queryFn: async () => {
      if (!selectedVendor) return [];
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('vendor_id', selectedVendor.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    },
    enabled: !!selectedVendor && ledgerDialogOpen,
  });

  // Calculate stats
  const stats = useMemo(() => {
    const active = vendors.filter(v => v.active).length;
    const masters = vendors.filter(v => v.is_master).length;
    const totalBalance = vendors.reduce((sum, v) => sum + Number(v.wallet_balance || 0), 0);
    const totalRevenue = vendors.reduce((sum, v) => sum + Number(v.total_revenue || 0), 0);
    const lowBalance = vendors.filter(v => Number(v.wallet_balance || 0) < LOW_BALANCE_THRESHOLD).length;

    return {
      total: vendors.length,
      active,
      suspended: vendors.length - active,
      masters,
      subVendors: vendors.length - masters,
      totalBalance,
      totalRevenue,
      lowBalanceCount: lowBalance,
    };
  }, [vendors]);

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from('vendors')
        .update({ active: !active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Vendor status updated');
      queryClient.invalidateQueries({ queryKey: ['vendors-management'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update vendor');
    },
  });

  const updateVendorMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Vendor> }) => {
      const { error } = await supabase
        .from('vendors')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Vendor updated successfully');
      queryClient.invalidateQueries({ queryKey: ['vendors-management'] });
      setEditDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update vendor');
    },
  });

  const addWalletBalanceMutation = useMutation({
    mutationFn: async ({ vendorId, amount, note }: { vendorId: string; amount: number; note?: string }) => {
      const vendor = vendors.find(v => v.id === vendorId);
      if (!vendor) throw new Error('Vendor not found');

      const newBalance = Number(vendor.wallet_balance || 0) + amount;

      const { error: updateError } = await supabase
        .from('vendors')
        .update({ wallet_balance: newBalance })
        .eq('id', vendorId);

      if (updateError) throw updateError;

      const { error: txError } = await supabase
        .from('wallet_transactions')
        .insert({
          vendor_id: vendorId,
          amount: amount,
          balance_after: newBalance,
          transaction_type: amount >= 0 ? 'credit' : 'debit',
          description: note || 'Manual balance adjustment by Super Admin',
        });

      if (txError) throw txError;
    },
    onSuccess: () => {
      toast.success('Wallet balance updated');
      queryClient.invalidateQueries({ queryKey: ['vendors-management'] });
      setWalletDialogOpen(false);
      setWalletAmount('');
      setWalletNote('');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to add balance');
    },
  });

  const bulkToggleStatusMutation = useMutation({
    mutationFn: async ({ ids, activate }: { ids: string[]; activate: boolean }) => {
      const { error } = await supabase
        .from('vendors')
        .update({ active: activate })
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Vendors updated');
      queryClient.invalidateQueries({ queryKey: ['vendors-management'] });
      setSelectedIds([]);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update vendors');
    },
  });

  // Filter vendors
  const filteredVendors = useMemo(() => {
    return vendors.filter((vendor) => {
      const matchesSearch = searchQuery === '' ||
        vendor.business_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vendor.profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vendor.profile?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vendor.gstin?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'active' && vendor.active) ||
        (statusFilter === 'suspended' && !vendor.active) ||
        (statusFilter === 'low_balance' && Number(vendor.wallet_balance || 0) < LOW_BALANCE_THRESHOLD);

      const matchesType = typeFilter === 'all' ||
        (typeFilter === 'master' && vendor.is_master) ||
        (typeFilter === 'sub' && !vendor.is_master);

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [vendors, searchQuery, statusFilter, typeFilter]);

  const handleEditOpen = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setEditForm({
      commission_percentage: vendor.commission_percentage || 0,
      credit_limit: vendor.credit_limit || 0,
      gstin: vendor.gstin || '',
      address: vendor.address || '',
      city: vendor.city || '',
      state: vendor.state || '',
      pincode: vendor.pincode || '',
    });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!selectedVendor) return;
    updateVendorMutation.mutate({
      id: selectedVendor.id,
      data: {
        commission_percentage: editForm.commission_percentage,
        credit_limit: editForm.credit_limit,
        gstin: editForm.gstin || null,
        address: editForm.address || null,
        city: editForm.city || null,
        state: editForm.state || null,
        pincode: editForm.pincode || null,
      },
    });
  };

  const handleAddWallet = () => {
    if (!selectedVendor || !walletAmount) return;
    const amount = parseFloat(walletAmount);
    if (isNaN(amount) || amount === 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    addWalletBalanceMutation.mutate({ vendorId: selectedVendor.id, amount, note: walletNote });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredVendors.map(v => v.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(i => i !== id));
    }
  };

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <VendorStatsCards stats={stats} lowBalanceThreshold={LOW_BALANCE_THRESHOLD} />

      {/* Filters & Actions */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search vendors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-full sm:w-[250px]"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
              <SelectItem value="low_balance">Low Balance</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="master">Master Vendors</SelectItem>
              <SelectItem value="sub">Sub-Vendors</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2 flex-wrap">
          {selectedIds.length > 0 && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => bulkToggleStatusMutation.mutate({ ids: selectedIds, activate: true })}
              >
                <Check className="h-4 w-4 mr-1" />
                Activate ({selectedIds.length})
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => bulkToggleStatusMutation.mutate({ ids: selectedIds, activate: false })}
              >
                <X className="h-4 w-4 mr-1" />
                Suspend ({selectedIds.length})
              </Button>
            </>
          )}
          <VendorExport vendors={filteredVendors} selectedIds={selectedIds.length > 0 ? selectedIds : undefined} />
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCcw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Vendors Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Vendors ({filteredVendors.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {isLoading ? (
            <div className="text-muted-foreground text-center py-8">Loading vendors...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={selectedIds.length === filteredVendors.length && filteredVendors.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Business Name</TableHead>
                  <TableHead className="hidden md:table-cell">Contact</TableHead>
                  <TableHead className="hidden lg:table-cell">GSTIN</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="hidden lg:table-cell text-right">Projects</TableHead>
                  <TableHead className="hidden xl:table-cell text-right">Revenue</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVendors.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      No vendors found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredVendors.map((vendor) => (
                    <TableRow key={vendor.id} className={Number(vendor.wallet_balance || 0) < LOW_BALANCE_THRESHOLD ? 'bg-red-500/5' : ''}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.includes(vendor.id)}
                          onCheckedChange={(checked) => handleSelectOne(vendor.id, !!checked)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{vendor.business_name}</div>
                        <div className="text-xs text-muted-foreground md:hidden">
                          {vendor.profile?.email || '-'}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div>{vendor.profile?.full_name || '-'}</div>
                        <div className="text-xs text-muted-foreground">{vendor.profile?.email || '-'}</div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell font-mono text-sm">
                        {vendor.gstin || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={vendor.is_master ? 'default' : 'secondary'}>
                          {vendor.is_master ? 'Master' : 'Sub'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={vendor.active ? 'default' : 'secondary'}
                          className={vendor.active ? 'bg-green-500 hover:bg-green-600' : ''}
                        >
                          {vendor.active ? 'Active' : 'Suspended'}
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-right font-semibold ${Number(vendor.wallet_balance || 0) < LOW_BALANCE_THRESHOLD ? 'text-red-500' : ''}`}>
                        ₹{Number(vendor.wallet_balance || 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-right">
                        {vendor.projects_count || 0}
                      </TableCell>
                      <TableCell className="hidden xl:table-cell text-right">
                        ₹{(vendor.total_revenue || 0).toLocaleString()}
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
                              setSelectedVendor(vendor);
                              setDetailsDialogOpen(true);
                            }}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditOpen(vendor)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Settings
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              setSelectedVendor(vendor);
                              setWalletDialogOpen(true);
                            }}>
                              <Wallet className="h-4 w-4 mr-2" />
                              Add Balance
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              setSelectedVendor(vendor);
                              setLedgerDialogOpen(true);
                            }}>
                              <FileText className="h-4 w-4 mr-2" />
                              View Ledger
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => toggleStatusMutation.mutate({ id: vendor.id, active: vendor.active })}
                              className={vendor.active ? 'text-red-500' : 'text-green-500'}
                            >
                              <UserX className="h-4 w-4 mr-2" />
                              {vendor.active ? 'Suspend' : 'Activate'}
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
      <VendorDetailsDialog
        vendor={selectedVendor}
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
      />

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Vendor: {selectedVendor?.business_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Commission %</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={editForm.commission_percentage}
                  onChange={(e) => setEditForm({ ...editForm, commission_percentage: parseFloat(e.target.value) || 0 })}
                />
              </div>
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
            </div>
            <div className="space-y-2">
              <Label>GSTIN</Label>
              <Input
                value={editForm.gstin}
                onChange={(e) => setEditForm({ ...editForm, gstin: e.target.value })}
                placeholder="22AAAAA0000A1Z5"
              />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input
                value={editForm.address}
                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                placeholder="Street address"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>City</Label>
                <Input
                  value={editForm.city}
                  onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>State</Label>
                <Input
                  value={editForm.state}
                  onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Pincode</Label>
                <Input
                  value={editForm.pincode}
                  onChange={(e) => setEditForm({ ...editForm, pincode: e.target.value })}
                />
              </div>
            </div>
            <Button onClick={handleSaveEdit} className="w-full" disabled={updateVendorMutation.isPending}>
              {updateVendorMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Wallet Dialog */}
      <Dialog open={walletDialogOpen} onOpenChange={setWalletDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add/Deduct Balance: {selectedVendor?.business_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground">Current Balance</div>
              <div className="text-2xl font-bold">₹{Number(selectedVendor?.wallet_balance || 0).toLocaleString()}</div>
            </div>
            <div className="space-y-2">
              <Label>Amount (₹) - Use negative for deduction</Label>
              <Input
                type="number"
                step="0.01"
                value={walletAmount}
                onChange={(e) => setWalletAmount(e.target.value)}
                placeholder="Enter amount (e.g., 5000 or -1000)"
              />
            </div>
            <div className="space-y-2">
              <Label>Note (Optional)</Label>
              <Input
                value={walletNote}
                onChange={(e) => setWalletNote(e.target.value)}
                placeholder="Reason for adjustment"
              />
            </div>
            <Button onClick={handleAddWallet} className="w-full" disabled={addWalletBalanceMutation.isPending}>
              {addWalletBalanceMutation.isPending ? 'Processing...' : 'Update Balance'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Ledger Dialog */}
      <Dialog open={ledgerDialogOpen} onOpenChange={setLedgerDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Ledger: {selectedVendor?.business_name}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Balance After</TableHead>
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
                        {format(new Date(tx.created_at), 'dd MMM yyyy HH:mm')}
                      </TableCell>
                      <TableCell>
                        <Badge variant={tx.transaction_type === 'credit' ? 'default' : 'secondary'}
                          className={tx.transaction_type === 'credit' ? 'bg-green-500' : 'bg-red-500'}>
                          {tx.transaction_type}
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-right font-semibold ${tx.transaction_type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                        {tx.transaction_type === 'credit' ? '+' : '-'}₹{Math.abs(Number(tx.amount || 0)).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        ₹{Number(tx.balance_after || 0).toLocaleString()}
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
