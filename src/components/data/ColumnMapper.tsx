import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';

interface ColumnMapperProps {
  detectedColumns: string[];
  onMappingComplete: (mapping: Record<string, string>) => void;
}

const VARIABLE_FIELDS = [
  'schoolCode',
  'admNo',
  'firstName',
  'lastName',
  'dob',
  'className',
  'sec',
  'gender',
  'profilePic',
  'link',
  'fatherName',
  'motherName',
  'fatherMobNo',
  'motherMobNo',
  'fatherWhatsApp',
  'motherWhatsApp',
  'fatherProfilePic',
  'motherProfilePic',
  'fatherAadhaar',
  'motherAadhaar',
  'fatherOccupation',
  'motherOccupation',
  'email',
  'password',
  'address',
  'religion',
  'caste',
  'subCaste',
  'bloodGroup',
  'boardingType',
  'schoolHouse',
  'transportMode',
  'vehicleNo',
  'admDate',
  'session',
  'rfid',
];

export function ColumnMapper({ detectedColumns, onMappingComplete }: ColumnMapperProps) {
  const [mapping, setMapping] = useState<Record<string, string>>({});

  useEffect(() => {
    // Auto-detect common column mappings - case insensitive matching
    const autoMapping: Record<string, string> = {};
    
    detectedColumns.forEach(col => {
      const normalized = col.toLowerCase().trim();
      
      // Try to find exact match first (case insensitive)
      VARIABLE_FIELDS.forEach(field => {
        if (normalized === field.toLowerCase()) {
          autoMapping[field] = col;
        }
      });
      
      // Partial matches as fallback
      if (!autoMapping['firstName'] && (normalized.includes('firstname') || normalized === 'first_name' || normalized === 'name')) {
        autoMapping['firstName'] = col;
      }
      if (!autoMapping['lastName'] && (normalized.includes('lastname') || normalized === 'last_name')) {
        autoMapping['lastName'] = col;
      }
      if (!autoMapping['className'] && (normalized.includes('classname') || normalized === 'class')) {
        autoMapping['className'] = col;
      }
      if (!autoMapping['sec'] && (normalized.includes('section') || normalized === 'sec')) {
        autoMapping['sec'] = col;
      }
      if (!autoMapping['admNo'] && (normalized.includes('admission') || normalized.includes('admno') || normalized === 'roll_no' || normalized === 'rollno')) {
        autoMapping['admNo'] = col;
      }
      if (!autoMapping['profilePic'] && (normalized.includes('profile') || normalized.includes('photo') || normalized.includes('pic') || normalized.includes('image'))) {
        autoMapping['profilePic'] = col;
      }
      if (!autoMapping['fatherName'] && normalized.includes('father') && normalized.includes('name')) {
        autoMapping['fatherName'] = col;
      }
      if (!autoMapping['motherName'] && normalized.includes('mother') && normalized.includes('name')) {
        autoMapping['motherName'] = col;
      }
      if (!autoMapping['fatherMobNo'] && normalized.includes('father') && (normalized.includes('mob') || normalized.includes('phone'))) {
        autoMapping['fatherMobNo'] = col;
      }
      if (!autoMapping['motherMobNo'] && normalized.includes('mother') && (normalized.includes('mob') || normalized.includes('phone'))) {
        autoMapping['motherMobNo'] = col;
      }
    });
    
    setMapping(autoMapping);
  }, [detectedColumns]);

  const handleMappingChange = (variableField: string, column: string) => {
    setMapping(prev => ({
      ...prev,
      [variableField]: column
    }));
  };

  const handleComplete = () => {
    onMappingComplete(mapping);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Map Columns to Variable Fields</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4">
          {VARIABLE_FIELDS.map(field => (
            <div key={field} className="grid grid-cols-2 gap-4 items-center">
              <Label className="text-sm font-medium">{field}</Label>
              <Select
                value={mapping[field] || '__none__'}
                onValueChange={(value) => handleMappingChange(field, value === '__none__' ? '' : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select column" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {detectedColumns.map(col => (
                    <SelectItem key={col} value={col}>
                      {col}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>

        <Button 
          onClick={handleComplete} 
          className="w-full"
          disabled={Object.keys(mapping).length === 0}
        >
          <CheckCircle2 className="h-4 w-4 mr-2" />
          Complete Mapping
        </Button>
      </CardContent>
    </Card>
  );
}
