import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Settings, Key, Image, FileText, CreditCard, Database, Shield, Bell } from 'lucide-react';
import { toast } from 'sonner';

export function SystemSettings() {
  const [settings, setSettings] = useState({
    // Print Settings
    defaultDPI: '300',
    defaultPaperSize: 'A4',
    marginTop: '10',
    marginBottom: '10',
    marginLeft: '10',
    marginRight: '10',
    
    // Image Processing
    imageKitEnabled: true,
    autoFaceCrop: true,
    autoBackgroundRemoval: true,
    maxUploadSize: '10',
    
    // Payment Gateway
    razorpayEnabled: false,
    upiEnabled: true,
    gatewayChargeBearer: 'vendor',
    gatewayChargePercent: '2',
    
    // Notifications
    emailNotifications: true,
    smsNotifications: false,
    whatsappNotifications: false,
    
    // Security
    twoFactorRequired: true,
    sessionTimeout: '15',
    ipWhitelisting: false,
  });

  const handleSave = () => {
    // TODO: Implement actual save to database
    toast.success('Settings saved successfully');
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="print" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="print" className="text-xs sm:text-sm">
            <FileText className="h-4 w-4 mr-2" />
            Print Settings
          </TabsTrigger>
          <TabsTrigger value="image" className="text-xs sm:text-sm">
            <Image className="h-4 w-4 mr-2" />
            Image Processing
          </TabsTrigger>
          <TabsTrigger value="payment" className="text-xs sm:text-sm">
            <CreditCard className="h-4 w-4 mr-2" />
            Payment Gateway
          </TabsTrigger>
          <TabsTrigger value="notifications" className="text-xs sm:text-sm">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security" className="text-xs sm:text-sm">
            <Shield className="h-4 w-4 mr-2" />
            Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="print">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Print Settings
              </CardTitle>
              <CardDescription>Configure default print and PDF generation settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Default DPI</Label>
                  <Select value={settings.defaultDPI} onValueChange={(v) => setSettings({ ...settings, defaultDPI: v })}>
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
                  <Select value={settings.defaultPaperSize} onValueChange={(v) => setSettings({ ...settings, defaultPaperSize: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A4">A4</SelectItem>
                      <SelectItem value="A3">A3</SelectItem>
                      <SelectItem value="Letter">Letter</SelectItem>
                      <SelectItem value="Legal">Legal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="text-sm font-medium mb-3">Default Margins (mm)</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Top</Label>
                    <Input
                      type="number"
                      value={settings.marginTop}
                      onChange={(e) => setSettings({ ...settings, marginTop: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Bottom</Label>
                    <Input
                      type="number"
                      value={settings.marginBottom}
                      onChange={(e) => setSettings({ ...settings, marginBottom: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Left</Label>
                    <Input
                      type="number"
                      value={settings.marginLeft}
                      onChange={(e) => setSettings({ ...settings, marginLeft: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Right</Label>
                    <Input
                      type="number"
                      value={settings.marginRight}
                      onChange={(e) => setSettings({ ...settings, marginRight: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <Button onClick={handleSave}>Save Print Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="image">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="h-5 w-5" />
                Image Processing
              </CardTitle>
              <CardDescription>Configure image processing and optimization settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>ImageKit.io Integration</Label>
                    <p className="text-sm text-muted-foreground">Use ImageKit for image optimization</p>
                  </div>
                  <Switch
                    checked={settings.imageKitEnabled}
                    onCheckedChange={(v) => setSettings({ ...settings, imageKitEnabled: v })}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto Face Crop</Label>
                    <p className="text-sm text-muted-foreground">Automatically detect and crop faces in photos</p>
                  </div>
                  <Switch
                    checked={settings.autoFaceCrop}
                    onCheckedChange={(v) => setSettings({ ...settings, autoFaceCrop: v })}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto Background Removal</Label>
                    <p className="text-sm text-muted-foreground">Automatically remove backgrounds from photos</p>
                  </div>
                  <Switch
                    checked={settings.autoBackgroundRemoval}
                    onCheckedChange={(v) => setSettings({ ...settings, autoBackgroundRemoval: v })}
                  />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Max Upload Size (MB)</Label>
                  <Input
                    type="number"
                    value={settings.maxUploadSize}
                    onChange={(e) => setSettings({ ...settings, maxUploadSize: e.target.value })}
                    className="max-w-[200px]"
                  />
                </div>
              </div>

              <Button onClick={handleSave}>Save Image Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payment">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Gateway
              </CardTitle>
              <CardDescription>Configure online payment options</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="flex items-center gap-2">
                      Razorpay Integration
                      <Badge variant="outline">Cards & Netbanking</Badge>
                    </Label>
                    <p className="text-sm text-muted-foreground">Accept card and netbanking payments</p>
                  </div>
                  <Switch
                    checked={settings.razorpayEnabled}
                    onCheckedChange={(v) => setSettings({ ...settings, razorpayEnabled: v })}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="flex items-center gap-2">
                      UPI Payments
                      <Badge variant="outline" className="bg-green-500/10 text-green-600">Free</Badge>
                    </Label>
                    <p className="text-sm text-muted-foreground">Accept UPI payments (no transaction fee)</p>
                  </div>
                  <Switch
                    checked={settings.upiEnabled}
                    onCheckedChange={(v) => setSettings({ ...settings, upiEnabled: v })}
                  />
                </div>

                <Separator />

                {settings.razorpayEnabled && (
                  <>
                    <div className="space-y-2">
                      <Label>Gateway Charge Bearer</Label>
                      <Select 
                        value={settings.gatewayChargeBearer} 
                        onValueChange={(v) => setSettings({ ...settings, gatewayChargeBearer: v })}
                      >
                        <SelectTrigger className="max-w-[200px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="vendor">Vendor</SelectItem>
                          <SelectItem value="client">Client</SelectItem>
                          <SelectItem value="split">Split 50-50</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Gateway Charge (%)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={settings.gatewayChargePercent}
                        onChange={(e) => setSettings({ ...settings, gatewayChargePercent: e.target.value })}
                        className="max-w-[200px]"
                      />
                    </div>
                  </>
                )}
              </div>

              <Button onClick={handleSave}>Save Payment Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Settings
              </CardTitle>
              <CardDescription>Configure notification channels</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">Send notifications via email</p>
                  </div>
                  <Switch
                    checked={settings.emailNotifications}
                    onCheckedChange={(v) => setSettings({ ...settings, emailNotifications: v })}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>SMS Notifications</Label>
                    <p className="text-sm text-muted-foreground">Send notifications via SMS</p>
                  </div>
                  <Switch
                    checked={settings.smsNotifications}
                    onCheckedChange={(v) => setSettings({ ...settings, smsNotifications: v })}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>WhatsApp Notifications</Label>
                    <p className="text-sm text-muted-foreground">Send notifications via WhatsApp</p>
                  </div>
                  <Switch
                    checked={settings.whatsappNotifications}
                    onCheckedChange={(v) => setSettings({ ...settings, whatsappNotifications: v })}
                  />
                </div>
              </div>

              <Button onClick={handleSave}>Save Notification Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security Settings
              </CardTitle>
              <CardDescription>Configure security and access control</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Two-Factor Authentication Required</Label>
                    <p className="text-sm text-muted-foreground">Require 2FA for all admin logins</p>
                  </div>
                  <Switch
                    checked={settings.twoFactorRequired}
                    onCheckedChange={(v) => setSettings({ ...settings, twoFactorRequired: v })}
                  />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Session Timeout (minutes)</Label>
                  <Input
                    type="number"
                    value={settings.sessionTimeout}
                    onChange={(e) => setSettings({ ...settings, sessionTimeout: e.target.value })}
                    className="max-w-[200px]"
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>IP Whitelisting</Label>
                    <p className="text-sm text-muted-foreground">Restrict login to specific IP addresses</p>
                  </div>
                  <Switch
                    checked={settings.ipWhitelisting}
                    onCheckedChange={(v) => setSettings({ ...settings, ipWhitelisting: v })}
                  />
                </div>
              </div>

              <Button onClick={handleSave}>Save Security Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
