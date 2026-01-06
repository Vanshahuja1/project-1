import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/hooks/useAuth';
import { Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Items() {
  const { user } = useAuth();
  const { isVendor } = useUserRole();
  const { toast } = useToast();

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name');

      if (error) throw error;
      return data;
    },
  });

  const { data: vendorData } = useQuery({
    queryKey: ['vendor', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('vendors')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && isVendor,
  });

  const { data: vendorPricing = [] } = useQuery({
    queryKey: ['vendor-pricing', vendorData?.id],
    queryFn: async () => {
      if (!vendorData?.id) return [];
      const { data, error } = await supabase
        .from('vendor_pricing')
        .select('*')
        .eq('vendor_id', vendorData.id);

      if (error) throw error;
      return data;
    },
    enabled: !!vendorData?.id,
  });

  const getPricing = (productId: string) => {
    return vendorPricing.find(p => p.product_id === productId);
  };

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
        <h1 className="text-3xl font-bold text-foreground">Items</h1>
        <Button>Manage Discount</Button>
      </div>

      <div className="bg-card rounded-lg border">
        <div className="p-4 border-b">
          <Button variant="outline" size="sm">
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Cost Price</TableHead>
              <TableHead>MRP</TableHead>
              <TableHead>Max Discount</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => {
              const pricing = getPricing(product.id);
              const costPrice = pricing?.price || product.base_price;
              const mrp = product.base_price;
              const maxDiscount = 0; // Can be calculated based on vendor settings

              return (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">
                    {product.category.substring(0, 3).toUpperCase()}
                    {product.default_width_mm && product.default_height_mm
                      ? `${product.default_width_mm}+${product.default_height_mm}`
                      : product.id.substring(0, 6)}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-2">
                      <div className="font-medium">{product.name}</div>
                      <div className="flex gap-2">
                        <Badge variant="outline" className="text-xs">
                          {product.category}
                        </Badge>
                        {product.default_width_mm && product.default_height_mm && (
                          <Badge variant="outline" className="text-xs">
                            {product.default_width_mm}×{product.default_height_mm}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-semibold">₹{Number(costPrice).toFixed(2)}</div>
                      <div className="text-xs text-muted-foreground">
                        Valid Till: 31/12/2025
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-semibold">
                    ₹{Number(mrp).toFixed(2)}
                  </TableCell>
                  <TableCell className="font-semibold">
                    {maxDiscount.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={product.active ? 'default' : 'secondary'}
                      className={
                        product.active
                          ? 'bg-green-500 hover:bg-green-600'
                          : ''
                      }
                    >
                      {product.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {products.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            No items found
          </div>
        )}
      </div>
    </main>
  );
}
