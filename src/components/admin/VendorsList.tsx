import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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

export function VendorsList() {
  const { data: vendors = [], isLoading } = useQuery({
    queryKey: ['all-vendors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profiles separately
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

  if (isLoading) {
    return <div className="text-muted-foreground">Loading vendors...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Vendors</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Business Name</TableHead>
              <TableHead className="hidden sm:table-cell">Contact</TableHead>
              <TableHead className="hidden md:table-cell">Email</TableHead>
              <TableHead className="hidden lg:table-cell">GSTIN</TableHead>
              <TableHead className="hidden sm:table-cell">Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vendors.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No vendors found
                </TableCell>
              </TableRow>
            ) : (
              vendors.map((vendor) => (
                <TableRow key={vendor.id}>
                  <TableCell className="font-medium">
                    <div>{vendor.business_name}</div>
                    <div className="sm:hidden text-xs text-muted-foreground">
                      {vendor.profile?.full_name || '-'}
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">{vendor.profile?.full_name || '-'}</TableCell>
                  <TableCell className="hidden md:table-cell text-sm">{vendor.profile?.email || '-'}</TableCell>
                  <TableCell className="hidden lg:table-cell font-mono text-sm">{vendor.gstin || '-'}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant={vendor.is_master ? 'default' : 'secondary'}>
                      {vendor.is_master ? 'Master' : 'Sub'}
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
                    ₹{Number(vendor.wallet_balance || 0).toFixed(0)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
