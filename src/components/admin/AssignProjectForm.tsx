import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

export function AssignProjectForm() {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    vendor_id: '',
    client_id: '',
    product_id: '',
    quantity: '',
    total_amount: '',
    expected_delivery_date: '',
    sales_person_id: '',
    notes: '',
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ['all-vendors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendors')
        .select('id, business_name')
        .eq('active', true)
        .order('business_name');
      if (error) throw error;
      return data;
    },
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients-by-vendor', formData.vendor_id],
    queryFn: async () => {
      if (!formData.vendor_id) return [];
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, institution_name')
        .eq('vendor_id', formData.vendor_id)
        .eq('active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!formData.vendor_id,
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, base_price')
        .eq('active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['vendor-staff', formData.vendor_id],
    queryFn: async () => {
      if (!formData.vendor_id) return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .order('full_name');
      if (error) throw error;
      return data;
    },
    enabled: !!formData.vendor_id,
  });

  const generateProjectNumber = () => {
    const prefix = 'PRJ';
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}-${timestamp}-${random}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.from('projects').insert({
        project_number: generateProjectNumber(),
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        vendor_id: formData.vendor_id,
        client_id: formData.client_id,
        product_id: formData.product_id || null,
        quantity: parseInt(formData.quantity) || 0,
        total_amount: parseFloat(formData.total_amount) || 0,
        expected_delivery_date: formData.expected_delivery_date || null,
        sales_person_id: formData.sales_person_id || null,
        notes: formData.notes.trim() || null,
        status: 'draft',
        payment_status: 'pending',
      });

      if (error) throw error;

      toast.success('Project assigned successfully');
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['projects-by-vendor'] });
      setFormData({
        name: '',
        description: '',
        vendor_id: '',
        client_id: '',
        product_id: '',
        quantity: '',
        total_amount: '',
        expected_delivery_date: '',
        sales_person_id: '',
        notes: '',
      });
    } catch (error: any) {
      toast.error(error.message || 'Failed to assign project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assign Project to Vendor</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="vendor">Vendor *</Label>
              <Select
                value={formData.vendor_id}
                onValueChange={(value) => setFormData({ ...formData, vendor_id: value, client_id: '', sales_person_id: '' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map((vendor) => (
                    <SelectItem key={vendor.id} value={vendor.id}>
                      {vendor.business_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="client">Client *</Label>
              <Select
                value={formData.client_id}
                onValueChange={(value) => setFormData({ ...formData, client_id: value })}
                disabled={!formData.vendor_id}
              >
                <SelectTrigger>
                  <SelectValue placeholder={formData.vendor_id ? "Select client" : "Select vendor first"} />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.institution_name || client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Project Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="product">Product</Label>
              <Select
                value={formData.product_id}
                onValueChange={(value) => setFormData({ ...formData, product_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} (₹{product.base_price})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min="0"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="total_amount">Total Amount (₹)</Label>
              <Input
                id="total_amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.total_amount}
                onChange={(e) => setFormData({ ...formData, total_amount: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expected_delivery_date">Expected Delivery Date</Label>
              <Input
                id="expected_delivery_date"
                type="date"
                value={formData.expected_delivery_date}
                onChange={(e) => setFormData({ ...formData, expected_delivery_date: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sales_person">Assign to Staff (Optional)</Label>
            <Select
              value={formData.sales_person_id}
              onValueChange={(value) => setFormData({ ...formData, sales_person_id: value })}
              disabled={!formData.vendor_id}
            >
              <SelectTrigger>
                <SelectValue placeholder={formData.vendor_id ? "Select staff member" : "Select vendor first"} />
              </SelectTrigger>
              <SelectContent>
                {staff.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.full_name} ({member.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading || !formData.vendor_id || !formData.client_id || !formData.name}>
            {loading ? 'Assigning...' : 'Assign Project'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
