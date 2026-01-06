import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExcelUpload } from '@/components/data/ExcelUpload';
import { ColumnMapper } from '@/components/data/ColumnMapper';
import { PhotoUpload } from '@/components/data/PhotoUpload';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Database, Image, Wand2, Download } from 'lucide-react';
import { toast } from 'sonner';

export default function DataManagement() {
  const [uploadedData, setUploadedData] = useState<any[] | null>(null);
  const [detectedColumns, setDetectedColumns] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string> | null>(null);
  const [uploadedPhotos, setUploadedPhotos] = useState<{ filename: string; blob: Blob }[]>([]);
  const [currentStep, setCurrentStep] = useState<'upload' | 'map' | 'photos' | 'process'>('upload');

  const handleDataParsed = (data: any[], columns: string[]) => {
    setUploadedData(data);
    setDetectedColumns(columns);
    setCurrentStep('map');
  };

  const handleMappingComplete = (mapping: Record<string, string>) => {
    setColumnMapping(mapping);
    setCurrentStep('photos');
    toast.success('Column mapping saved');
  };

  const handlePhotosUploaded = (photos: { filename: string; blob: Blob }[]) => {
    setUploadedPhotos(photos);
    setCurrentStep('process');
    toast.success(`${photos.length.toLocaleString()} photos uploaded successfully`);
  };

  const handleProcessData = async () => {
    toast.info('Processing data with AI...');
    // TODO: Implement actual processing with face detection and background removal
  };

  return (
    <main className="flex-1 p-6 bg-background">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Data & Photo Management</h1>
        <p className="text-muted-foreground">Upload and process data with AI-powered face detection and background removal</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column - Upload & Mapping */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs value={currentStep} onValueChange={(v) => setCurrentStep(v as any)}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="upload" disabled={!uploadedData && currentStep !== 'upload'}>
                <Database className="h-4 w-4 mr-2" />
                Upload Data
              </TabsTrigger>
              <TabsTrigger value="map" disabled={!uploadedData}>
                Map Columns
              </TabsTrigger>
              <TabsTrigger value="photos" disabled={!columnMapping}>
                <Image className="h-4 w-4 mr-2" />
                Upload Photos
              </TabsTrigger>
              <TabsTrigger value="process" disabled={!uploadedPhotos.length}>
                <Wand2 className="h-4 w-4 mr-2" />
                Process
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upload">
              <ExcelUpload onDataParsed={handleDataParsed} />
            </TabsContent>

            <TabsContent value="map">
              {detectedColumns.length > 0 && (
                <ColumnMapper 
                  detectedColumns={detectedColumns}
                  onMappingComplete={handleMappingComplete}
                />
              )}
            </TabsContent>

            <TabsContent value="photos">
              <PhotoUpload onPhotosUploaded={handlePhotosUploaded} />
            </TabsContent>

            <TabsContent value="process">
              <Card>
                <CardHeader>
                  <CardTitle>AI Processing Options</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Button 
                      className="w-full" 
                      onClick={handleProcessData}
                    >
                      <Wand2 className="h-4 w-4 mr-2" />
                      Run Face Detection & Auto-Crop
                    </Button>
                    
                    <Button 
                      className="w-full" 
                      variant="outline"
                    >
                      Remove Backgrounds
                    </Button>
                    
                    <Button 
                      className="w-full" 
                      variant="outline"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Processed Photos
                    </Button>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    <p className="font-medium mb-1">AI Features:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Face detection runs in browser (free, no API needed)</li>
                      <li>Background removal uses rotating free API keys</li>
                      <li>All processing is automatic and fast</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column - Summary */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Progress Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Data Records</span>
                  <span className="font-medium">{uploadedData?.length || 0}</span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Columns Detected</span>
                  <span className="font-medium">{detectedColumns.length}</span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Fields Mapped</span>
                  <span className="font-medium">{columnMapping ? Object.keys(columnMapping).length : 0}</span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Photos Uploaded</span>
                  <span className="font-medium">{uploadedPhotos.length.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start"
                disabled={!uploadedData}
              >
                Reset Data
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start"
                disabled={!uploadedPhotos.length}
              >
                Reset Photos
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start"
              >
                Import Sample Data
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
