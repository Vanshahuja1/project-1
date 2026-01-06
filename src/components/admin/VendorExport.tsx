import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

type Vendor = {
  id: string;
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
  created_at: string;
  profile?: {
    full_name: string;
    email: string;
    phone: string | null;
  };
  projects_count?: number;
  total_revenue?: number;
};

interface VendorExportProps {
  vendors: Vendor[];
  selectedIds?: string[];
}

export function VendorExport({ vendors, selectedIds }: VendorExportProps) {
  const getExportData = () => {
    const dataToExport = selectedIds?.length 
      ? vendors.filter(v => selectedIds.includes(v.id))
      : vendors;
    return dataToExport;
  };

  const exportToCSV = () => {
    const data = getExportData();
    if (data.length === 0) {
      toast.error('No vendors to export');
      return;
    }

    const headers = [
      'Business Name',
      'Contact Name',
      'Email',
      'Phone',
      'GSTIN',
      'Type',
      'Status',
      'Wallet Balance',
      'Credit Limit',
      'Commission %',
      'Address',
      'City',
      'State',
      'Pincode',
      'Projects',
      'Revenue',
      'Created'
    ];

    const rows = data.map(v => [
      v.business_name,
      v.profile?.full_name || '',
      v.profile?.email || '',
      v.profile?.phone || '',
      v.gstin || '',
      v.is_master ? 'Master' : 'Sub-Vendor',
      v.active ? 'Active' : 'Suspended',
      v.wallet_balance || 0,
      v.credit_limit || 0,
      v.commission_percentage || 0,
      v.address || '',
      v.city || '',
      v.state || '',
      v.pincode || '',
      v.projects_count || 0,
      v.total_revenue || 0,
      format(new Date(v.created_at), 'yyyy-MM-dd')
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `vendors_export_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`;
    link.click();

    toast.success(`Exported ${data.length} vendors to CSV`);
  };

  const exportToJSON = () => {
    const data = getExportData();
    if (data.length === 0) {
      toast.error('No vendors to export');
      return;
    }

    const exportData = data.map(v => ({
      business_name: v.business_name,
      contact: {
        name: v.profile?.full_name,
        email: v.profile?.email,
        phone: v.profile?.phone,
      },
      gstin: v.gstin,
      type: v.is_master ? 'Master' : 'Sub-Vendor',
      status: v.active ? 'Active' : 'Suspended',
      financial: {
        wallet_balance: v.wallet_balance,
        credit_limit: v.credit_limit,
        commission_percentage: v.commission_percentage,
      },
      address: {
        street: v.address,
        city: v.city,
        state: v.state,
        pincode: v.pincode,
      },
      stats: {
        projects_count: v.projects_count,
        total_revenue: v.total_revenue,
      },
      created_at: v.created_at,
    }));

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `vendors_export_${format(new Date(), 'yyyyMMdd_HHmmss')}.json`;
    link.click();

    toast.success(`Exported ${data.length} vendors to JSON`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export {selectedIds?.length ? `(${selectedIds.length})` : ''}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportToCSV}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToJSON}>
          <FileText className="h-4 w-4 mr-2" />
          Export as JSON
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
