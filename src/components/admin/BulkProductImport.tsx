import { useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Upload, FileSpreadsheet, Check, X, AlertCircle } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

interface ProductRow {
  name: string;
  category: string;
  description?: string;
  base_price: string;
  default_width_mm?: string;
  default_height_mm?: string;
  active?: string;
  valid: boolean;
  errors: string[];
}

export function BulkProductImport() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [parsedData, setParsedData] = useState<ProductRow[]>([]);
  const [fileName, setFileName] = useState('');

  const validateRow = (row: any): ProductRow => {
    const errors: string[] = [];
    
    if (!row.name?.trim()) errors.push('Name is required');
    if (!row.category?.trim()) errors.push('Category is required');
    if (!row.base_price || isNaN(parseFloat(row.base_price))) errors.push('Valid base price is required');
    if (row.default_width_mm && isNaN(parseFloat(row.default_width_mm))) errors.push('Invalid width');
    if (row.default_height_mm && isNaN(parseFloat(row.default_height_mm))) errors.push('Invalid height');

    return {
      name: row.name?.trim() || '',
      category: row.category?.trim() || '',
      description: row.description?.trim() || '',
      base_price: row.base_price || '',
      default_width_mm: row.default_width_mm || '',
      default_height_mm: row.default_height_mm || '',
      active: row.active?.toLowerCase() === 'false' ? 'false' : 'true',
      valid: errors.length === 0,
      errors,
    };
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const extension = file.name.split('.').pop()?.toLowerCase();

    if (extension === 'xlsx' || extension === 'xls') {
      // Handle Excel files
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = event.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          const validated = jsonData.map(validateRow);
          setParsedData(validated);
        } catch (error: any) {
          toast.error(`Failed to parse Excel file: ${error.message}`);
        }
      };
      reader.readAsBinaryString(file);
    } else {
      // Handle CSV files
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const validated = results.data.map(validateRow);
          setParsedData(validated);
        },
        error: (error) => {
          toast.error(`Failed to parse file: ${error.message}`);
        },
      });
    }
  };

  const handleImport = async () => {
    const validRows = parsedData.filter(row => row.valid);
    if (validRows.length === 0) {
      toast.error('No valid rows to import');
      return;
    }

    setLoading(true);
    try {
      const products = validRows.map(row => ({
        name: row.name,
        category: row.category,
        description: row.description || null,
        base_price: parseFloat(row.base_price),
        default_width_mm: row.default_width_mm ? parseFloat(row.default_width_mm) : null,
        default_height_mm: row.default_height_mm ? parseFloat(row.default_height_mm) : null,
        active: row.active !== 'false',
      }));

      const { error } = await supabase.from('products').insert(products);

      if (error) throw error;

      toast.success(`Successfully imported ${validRows.length} products`);
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setOpen(false);
      setParsedData([]);
      setFileName('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to import products');
    } finally {
      setLoading(false);
    }
  };

  const validCount = parsedData.filter(r => r.valid).length;
  const invalidCount = parsedData.filter(r => !r.valid).length;

  const downloadCSVTemplate = () => {
    const template = 'name,category,description,base_price,default_width_mm,default_height_mm,active\nID Card,ID Cards,Standard PVC ID Card,25,85.6,54,true\nCertificate,Certificates,A4 Certificate,50,297,210,true';
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'products_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadExcelTemplate = () => {
    const templateData = [
      { name: 'ID Card', category: 'ID Cards', description: 'Standard PVC ID Card', base_price: 25, default_width_mm: 85.6, default_height_mm: 54, active: true },
      { name: 'Certificate', category: 'Certificates', description: 'A4 Certificate', base_price: 50, default_width_mm: 297, default_height_mm: 210, active: true },
    ];
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');
    XLSX.writeFile(workbook, 'products_template.xlsx');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Bulk Import</span>
          <span className="sm:hidden">Import</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Import Products</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" size="sm" onClick={downloadCSVTemplate}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              CSV Template
            </Button>
            <Button variant="outline" size="sm" onClick={downloadExcelTemplate}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Excel Template
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Upload CSV or Excel File</Label>
            <Input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt,.xlsx,.xls"
              onChange={handleFileChange}
              className="cursor-pointer"
            />
            {fileName && (
              <p className="text-sm text-muted-foreground">Selected: {fileName}</p>
            )}
          </div>

          {parsedData.length > 0 && (
            <>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="text-green-500 border-green-500">
                  <Check className="h-3 w-3 mr-1" />
                  {validCount} valid
                </Badge>
                {invalidCount > 0 && (
                  <Badge variant="outline" className="text-red-500 border-red-500">
                    <X className="h-3 w-3 mr-1" />
                    {invalidCount} invalid
                  </Badge>
                )}
              </div>

              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">Status</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className="hidden sm:table-cell">Category</TableHead>
                      <TableHead className="hidden md:table-cell">Price</TableHead>
                      <TableHead className="hidden lg:table-cell">Dimensions</TableHead>
                      <TableHead>Errors</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.slice(0, 10).map((row, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          {row.valid ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-red-500" />
                          )}
                        </TableCell>
                        <TableCell className="font-medium max-w-[150px] truncate">{row.name}</TableCell>
                        <TableCell className="hidden sm:table-cell">{row.category}</TableCell>
                        <TableCell className="hidden md:table-cell">₹{row.base_price}</TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {row.default_width_mm && row.default_height_mm
                            ? `${row.default_width_mm}×${row.default_height_mm}`
                            : '-'}
                        </TableCell>
                        <TableCell className="text-red-500 text-xs max-w-[200px] truncate">
                          {row.errors.join(', ')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {parsedData.length > 10 && (
                  <p className="text-sm text-muted-foreground p-3 text-center">
                    Showing 10 of {parsedData.length} rows
                  </p>
                )}
              </div>

              <Button
                onClick={handleImport}
                disabled={loading || validCount === 0}
                className="w-full"
              >
                {loading ? 'Importing...' : `Import ${validCount} Products`}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
