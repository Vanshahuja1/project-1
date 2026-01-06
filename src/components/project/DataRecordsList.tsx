import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Trash2, X, Database } from 'lucide-react';
import { DataRecordItem } from './DataRecordItem';
import { AddDataDialog } from './AddDataDialog';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const SAMPLE_DATA = [
  { firstName: "Rahul", lastName: "Sharma", department: "Science", designation: "Teacher", email: "rahul.sharma@school.com", mob: "9876543210", gender: "Male", dob: "1985-05-15", bloodGroup: "B+" },
  { firstName: "Priya", lastName: "Patel", department: "Mathematics", designation: "HOD", email: "priya.patel@school.com", mob: "9876543211", gender: "Female", dob: "1982-08-22", bloodGroup: "A+" },
  { firstName: "Amit", lastName: "Kumar", department: "English", designation: "Teacher", email: "amit.kumar@school.com", mob: "9876543212", gender: "Male", dob: "1990-03-10", bloodGroup: "O+" },
  { firstName: "Sneha", lastName: "Gupta", department: "Science", designation: "Lab Assistant", email: "sneha.gupta@school.com", mob: "9876543213", gender: "Female", dob: "1995-11-28", bloodGroup: "AB+" },
  { firstName: "Vikram", lastName: "Singh", department: "Sports", designation: "Coach", email: "vikram.singh@school.com", mob: "9876543214", gender: "Male", dob: "1988-07-04", bloodGroup: "B-" },
  { firstName: "Anjali", lastName: "Verma", department: "Arts", designation: "Teacher", email: "anjali.verma@school.com", mob: "9876543215", gender: "Female", dob: "1992-01-18", bloodGroup: "A-" },
  { firstName: "Rajesh", lastName: "Nair", department: "Computer Science", designation: "HOD", email: "rajesh.nair@school.com", mob: "9876543216", gender: "Male", dob: "1980-09-30", bloodGroup: "O-" },
  { firstName: "Meera", lastName: "Krishnan", department: "Music", designation: "Teacher", email: "meera.k@school.com", mob: "9876543217", gender: "Female", dob: "1987-12-05", bloodGroup: "B+" },
];
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface DataRecord {
  id: string;
  record_number: number;
  group_id: string | null;
  processing_status: string | null;
  data_json: Record<string, any>;
}

interface DataRecordsListProps {
  records: DataRecord[];
  projectId: string;
}

export function DataRecordsList({ records, projectId }: DataRecordsListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const queryClient = useQueryClient();

  // Get unique statuses for filter
  const statuses = useMemo(() => {
    const statusSet = new Set(records.map(r => r.processing_status || 'pending'));
    return Array.from(statusSet);
  }, [records]);

  // Filter records based on search and status
  const filteredRecords = useMemo(() => {
    return records.filter(record => {
      // Status filter
      if (statusFilter !== 'all' && record.processing_status !== statusFilter) {
        return false;
      }

      // Search filter - search in data_json values
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const dataValues = Object.values(record.data_json)
          .filter(v => v !== null && typeof v !== 'object')
          .map(v => String(v).toLowerCase());
        
        const matchesData = dataValues.some(v => v.includes(query));
        const matchesRecordNumber = record.record_number.toString().includes(query);
        
        return matchesData || matchesRecordNumber;
      }

      return true;
    });
  }, [records, searchQuery, statusFilter]);

  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredRecords.map(r => r.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectRecord = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  const isAllSelected = filteredRecords.length > 0 && filteredRecords.every(r => selectedIds.has(r.id));
  const isSomeSelected = selectedIds.size > 0;

  // Bulk delete handler
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('data_records')
        .delete()
        .in('id', Array.from(selectedIds));

      if (error) throw error;

      toast.success(`Deleted ${selectedIds.size} records`);
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ['project-records', projectId] });
    } catch (error) {
      console.error('Error deleting records:', error);
      toast.error('Failed to delete records');
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
  };

  const [isLoadingSample, setIsLoadingSample] = useState(false);

  const loadSampleData = async () => {
    setIsLoadingSample(true);
    try {
      const startingNumber = (records[records.length - 1]?.record_number || 0) + 1;
      
      const sampleRecords = SAMPLE_DATA.map((data, index) => ({
        project_id: projectId,
        record_number: startingNumber + index,
        data_json: data,
        processing_status: index % 3 === 0 ? 'completed' : 'pending'
      }));

      const { error } = await supabase
        .from('data_records')
        .insert(sampleRecords);

      if (error) throw error;

      toast.success(`Added ${sampleRecords.length} sample records`);
      queryClient.invalidateQueries({ queryKey: ['project-records', projectId] });
    } catch (error) {
      console.error('Error loading sample data:', error);
      toast.error('Failed to load sample data');
    } finally {
      setIsLoadingSample(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with actions */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-1 gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search records..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {statuses.map(status => (
                <SelectItem key={status} value={status}>{status}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(searchQuery || statusFilter !== 'all') && (
            <Button variant="ghost" size="icon" onClick={clearFilters}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <AddDataDialog projectId={projectId} />
      </div>

      {/* Bulk actions bar */}
      {isSomeSelected && (
        <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Selected
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedIds(new Set())}
          >
            Clear Selection
          </Button>
        </div>
      )}

      {/* Select all checkbox */}
      {filteredRecords.length > 0 && (
        <div className="flex items-center gap-2 px-1">
          <Checkbox
            checked={isAllSelected}
            onCheckedChange={handleSelectAll}
            id="select-all"
          />
          <label htmlFor="select-all" className="text-sm text-muted-foreground cursor-pointer">
            Select all ({filteredRecords.length} records)
          </label>
        </div>
      )}

      {/* Records list */}
      <div className="space-y-2">
        {filteredRecords.length === 0 ? (
          <div className="text-center py-8">
            {records.length === 0 ? (
              <div className="space-y-4">
                <p className="text-muted-foreground">No data records yet.</p>
                <div className="flex gap-2 justify-center">
                  <AddDataDialog projectId={projectId} />
                  <Button 
                    variant="outline" 
                    onClick={loadSampleData}
                    disabled={isLoadingSample}
                  >
                    <Database className="h-4 w-4 mr-2" />
                    {isLoadingSample ? 'Loading...' : 'Load Sample Data'}
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">No records match your search criteria.</p>
            )}
          </div>
        ) : (
          filteredRecords.map((record) => (
            <div key={record.id} className="flex items-start gap-2">
              <Checkbox
                checked={selectedIds.has(record.id)}
                onCheckedChange={(checked) => handleSelectRecord(record.id, checked as boolean)}
                className="mt-4"
              />
              <div className="flex-1">
                <DataRecordItem 
                  record={record}
                  projectId={projectId}
                />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Results summary */}
      {records.length > 0 && (
        <p className="text-sm text-muted-foreground text-center">
          Showing {filteredRecords.length} of {records.length} records
        </p>
      )}

      {/* Bulk delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} Records</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedIds.size} selected records? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBulkDelete} 
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : `Delete ${selectedIds.size} Records`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
