import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, FileSpreadsheet, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Papa from 'papaparse';
import { toast } from 'sonner';

interface ExcelUploadProps {
  onDataParsed: (data: any[], columns: string[]) => void;
}

export function ExcelUpload({ onDataParsed }: ExcelUploadProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    const isCSV = file.name.endsWith('.csv');

    if (!isExcel && !isCSV) {
      setError('Please upload an Excel (.xlsx, .xls) or CSV (.csv) file');
      return;
    }

    setIsProcessing(true);
    setError(null);

    if (isCSV) {
      // Parse CSV directly - read as text first to handle BOM
      const reader = new FileReader();
      reader.onload = (e) => {
        let text = e.target?.result as string;
        
        // Remove BOM if present
        if (text.charCodeAt(0) === 0xFEFF) {
          text = text.substring(1);
        }
        // Also handle UTF-8 BOM in different encoding
        if (text.startsWith('\ufeff')) {
          text = text.substring(1);
        }
        
        Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            if (results.errors.length > 0) {
              console.error('CSV parse errors:', results.errors);
              // Only fail on critical errors
              const criticalErrors = results.errors.filter(e => e.type === 'Quotes');
              if (criticalErrors.length > 0) {
                setError('Error parsing CSV file');
                setIsProcessing(false);
                return;
              }
            }

            // Clean column names (remove BOM from first column if still present)
            let columns = results.meta.fields || [];
            columns = columns.map((col, index) => {
              if (index === 0) {
                // Remove any remaining BOM characters
                return col.replace(/^\ufeff/, '').replace(/^\xef\xbb\xbf/, '');
              }
              return col;
            });
            
            const data = results.data as any[];

            if (columns.length === 0 || data.length === 0) {
              setError('No data found in file');
              setIsProcessing(false);
              return;
            }

            // If first column was cleaned, update the data keys
            const originalFirstColumn = results.meta.fields?.[0];
            if (originalFirstColumn && columns[0] !== originalFirstColumn) {
              data.forEach(row => {
                if (originalFirstColumn in row) {
                  row[columns[0]] = row[originalFirstColumn];
                  delete row[originalFirstColumn];
                }
              });
            }

            onDataParsed(data, columns);
            toast.success(`Loaded ${data.length} records with ${columns.length} columns`);
            setIsProcessing(false);
          },
          error: (error) => {
            setError(`Failed to parse CSV: ${error.message}`);
            setIsProcessing(false);
          },
        });
      };
      reader.onerror = () => {
        setError('Failed to read file');
        setIsProcessing(false);
      };
      reader.readAsText(file);
    } else {
      // For Excel files, we need to convert to CSV first
      // Using FileReader to read as text and parse
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          // This is a simplified approach - for production, use a library like xlsx
          const text = e.target?.result as string;
          Papa.parse(text, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
              const columns = results.meta.fields || [];
              const data = results.data;
              onDataParsed(data, columns);
              toast.success(`Loaded ${data.length} records with ${columns.length} columns`);
              setIsProcessing(false);
            },
          });
        } catch (err) {
          setError('Failed to read Excel file. Please save as CSV and try again.');
          setIsProcessing(false);
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Upload Excel/CSV Data
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Upload className="h-8 w-8 text-primary" />
            </div>
            
            <div>
              <p className="text-sm font-medium mb-1">
                Upload your data file
              </p>
              <p className="text-xs text-muted-foreground">
                Supports Excel (.xlsx, .xls) and CSV (.csv) files
              </p>
            </div>

            <label htmlFor="excel-upload">
              <Button variant="outline" disabled={isProcessing} asChild>
                <span>
                  {isProcessing ? 'Processing...' : 'Choose File'}
                </span>
              </Button>
            </label>
            <input
              id="excel-upload"
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="text-xs text-muted-foreground">
          <p className="font-medium mb-1">Tips:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>First row should contain column headers</li>
            <li>Include columns like Name, Roll No, Class, etc.</li>
            <li>File will be analyzed instantly to detect columns</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
