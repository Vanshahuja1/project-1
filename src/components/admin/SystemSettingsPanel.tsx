import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Settings, Key, Image, FileText, Database, 
  Shield, CreditCard, Printer, RefreshCcw, Save,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';

export function SystemSettingsPanel() {
  const [settings, setSettings] = useState({
    // Print settings
    defaultDPI: 300,
    defaultPaperSize: 'A4',
    marginTop: 5,
    marginBottom: 5,
    marginLeft: 5,
    marginRight: 5,
    
    // Image processing
    autoFaceCrop: true,
    autoBackgroundRemoval: true,
    maxImageSize: 5, // MB
    
    // Payment settings
    enableOnlinePayment: false,
    gatewayChargePercentage: 2,
    gatewayChargeBearer: 'platform', // platform | vendor | client
    
    // API keys (masked)
    imageKitConfigured: true,
    bgRemovalApiConfigured: true,
  });

  const handleSave = () => {
    // In a real app, this would save to the database
    toast.success('Settings saved successfully');
  };

  return (
    <div className="space-y-6">
      {/* Print Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Print Settings
          </CardTitle>
          <CardDescription>Default settings for PDF generation and printing</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Default DPI</Label>
              <Select
                value={settings.defaultDPI.toString()}
                onValueChange={(value) => setSettings({ ...settings, defaultDPI: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="150">150 DPI (Draft)</SelectItem>
                  <SelectItem value="300">300 DPI (Standard)</SelectItem>
                  <SelectItem value="600">600 DPI (High Quality)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Default Paper Size</Label>
              <Select
                value={settings.defaultPaperSize}
                onValueChange={(value) => setSettings({ ...settings, defaultPaperSize: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A4">A4 (210 × 297 mm)</SelectItem>
                  <SelectItem value="A3">A3 (297 × 420 mm)</SelectItem>
                  <SelectItem value="Letter">Letter (8.5 × 11 in)</SelectItem>
                  <SelectItem value="Legal">Legal (8.5 × 14 in)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <Separator />
          
          <div>
            <Label className="mb-2 block">Page Margins (mm)</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Top</Label>
                <Input
                  type="number"
                  value={settings.marginTop}
                  onChange={(e) => setSettings({ ...settings, marginTop: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Bottom</Label>
                <Input
                  type="number"
                  value={settings.marginBottom}
                  onChange={(e) => setSettings({ ...settings, marginBottom: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Left</Label>
                <Input
                  type="number"
                  value={settings.marginLeft}
                  onChange={(e) => setSettings({ ...settings, marginLeft: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Right</Label>
                <Input
                  type="number"
                  value={settings.marginRight}
                  onChange={(e) => setSettings({ ...settings, marginRight: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Image Processing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            Image Processing
          </CardTitle>
          <CardDescription>Configure automatic image processing features</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Auto Face Crop</Label>
              <p className="text-sm text-muted-foreground">Automatically detect and crop faces from photos</p>
            </div>
            <Switch
              checked={settings.autoFaceCrop}
              onCheckedChange={(checked) => setSettings({ ...settings, autoFaceCrop: checked })}
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div>
              <Label>Auto Background Removal</Label>
              <p className="text-sm text-muted-foreground">Automatically remove backgrounds from photos</p>
            </div>
            <Switch
              checked={settings.autoBackgroundRemoval}
              onCheckedChange={(checked) => setSettings({ ...settings, autoBackgroundRemoval: checked })}
            />
          </div>
          
          <Separator />
          
          <div className="space-y-2">
            <Label>Maximum Image Upload Size (MB)</Label>
            <Input
              type="number"
              value={settings.maxImageSize}
              onChange={(e) => setSettings({ ...settings, maxImageSize: parseInt(e.target.value) || 5 })}
              className="w-32"
            />
          </div>
        </CardContent>
      </Card>

      {/* API Keys Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            API Integrations
          </CardTitle>
          <CardDescription>Status of external API integrations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <Image className="h-5 w-5" />
              <div>
                <div className="font-medium">ImageKit.io</div>
                <div className="text-sm text-muted-foreground">Image hosting and transformation</div>
              </div>
            </div>
            <Badge variant={settings.imageKitConfigured ? 'default' : 'secondary'} className={settings.imageKitConfigured ? 'bg-green-500' : ''}>
              {settings.imageKitConfigured ? 'Configured' : 'Not Configured'}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5" />
              <div>
                <div className="font-medium">Background Removal API</div>
                <div className="text-sm text-muted-foreground">Remove.bg / similar service</div>
              </div>
            </div>
            <Badge variant={settings.bgRemovalApiConfigured ? 'default' : 'secondary'} className={settings.bgRemovalApiConfigured ? 'bg-green-500' : ''}>
              {settings.bgRemovalApiConfigured ? 'Configured' : 'Not Configured'}
            </Badge>
          </div>

          <div className="p-4 rounded-lg border border-yellow-500/50 bg-yellow-500/10">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
              <div>
                <div className="font-medium text-yellow-600">API Key Management</div>
                <p className="text-sm text-muted-foreground">
                  API keys are managed securely through Supabase Edge Function secrets. 
                  Contact your system administrator to update API keys.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Gateway */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Gateway
          </CardTitle>
          <CardDescription>Configure online payment options</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable Online Payment</Label>
              <p className="text-sm text-muted-foreground">Allow clients to pay online via Razorpay/UPI</p>
            </div>
            <Switch
              checked={settings.enableOnlinePayment}
              onCheckedChange={(checked) => setSettings({ ...settings, enableOnlinePayment: checked })}
            />
          </div>
          
          {settings.enableOnlinePayment && (
            <>
              <Separator />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Gateway Charge (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={settings.gatewayChargePercentage}
                    onChange={(e) => setSettings({ ...settings, gatewayChargePercentage: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Charge Bearer</Label>
                  <Select
                    value={settings.gatewayChargeBearer}
                    onValueChange={(value) => setSettings({ ...settings, gatewayChargeBearer: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="platform">Platform (absorb cost)</SelectItem>
                      <SelectItem value="vendor">Vendor</SelectItem>
                      <SelectItem value="client">Client (added to invoice)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Database & Backup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Database & Backup
          </CardTitle>
          <CardDescription>Database management options</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-muted/50">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Database Status</div>
                <div className="text-sm text-muted-foreground">Connected to Supabase</div>
              </div>
              <Badge className="bg-green-500">Healthy</Badge>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1">
              <Database className="h-4 w-4 mr-2" />
              View Logs
            </Button>
            <Button variant="outline" className="flex-1">
              <RefreshCcw className="h-4 w-4 mr-2" />
              Clear Cache
            </Button>
          </div>
          
          <p className="text-sm text-muted-foreground">
            Automatic backups are managed by Supabase. For manual backups or data export, 
            use the Supabase dashboard.
          </p>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave}>
          <Save className="h-4 w-4 mr-2" />
          Save All Settings
        </Button>
      </div>
    </div>
  );
}
