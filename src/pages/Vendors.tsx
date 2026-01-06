import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import { Plus, Search } from 'lucide-react';

export default function Vendors() {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: vendors = [], isLoading } = useQuery({
    queryKey: ['all-vendors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const vendorsWithProfiles = await Promise.all(
        data.map(async (vendor) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', vendor.user_id)
            .maybeSingle();

          return { ...vendor, profile };
        })
      );

      return vendorsWithProfiles;
    },
  });

  const filteredVendors = vendors.filter((vendor) =>
    searchQuery === '' ||
    vendor.business_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    vendor.profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    vendor.profile?.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex-1 p-6 bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <main className="flex-1 p-6 bg-background">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Vendors</h1>
          <p className="text-muted-foreground">Manage vendor accounts</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Vendor
        </Button>
      </div>

      <div className="mb-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search vendors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="bg-card rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Business Name</TableHead>
              <TableHead>Contact Person</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>GSTIN</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Wallet Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredVendors.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No vendors found
                </TableCell>
              </TableRow>
            ) : (
              filteredVendors.map((vendor) => (
                <TableRow key={vendor.id}>
                  <TableCell className="font-medium">{vendor.business_name}</TableCell>
                  <TableCell>{vendor.profile?.full_name || '-'}</TableCell>
                  <TableCell>{vendor.profile?.email || '-'}</TableCell>
                  <TableCell className="font-mono text-sm">{vendor.gstin || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={vendor.is_master ? 'default' : 'secondary'}>
                      {vendor.is_master ? 'Master' : 'Sub-Vendor'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={vendor.active ? 'default' : 'secondary'}
                      className={vendor.active ? 'bg-green-500 hover:bg-green-600' : ''}
                    >
                      {vendor.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    ₹{Number(vendor.wallet_balance || 0).toFixed(2)}
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
