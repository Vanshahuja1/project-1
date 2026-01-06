import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Filter, MoreHorizontal, Pencil, Trash2, Users, X, Search, Download } from 'lucide-react';
import { ImagePreviewDialog } from './ImagePreviewDialog';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
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
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import * as XLSX from 'xlsx';

interface DataRecord {
  id: string;
  record_number: number;
  group_id: string | null;
  processing_status: string | null;
  data_json: Record<string, any>;
  photo_url?: string | null;
  original_photo_url?: string | null;
}

interface ProjectGroup {
  id: string;
  name: string;
}

interface DataRecordsTableProps {
  records: DataRecord[];
  projectId: string;
  groups?: ProjectGroup[];
  onEditRecord?: (record: DataRecord) => void;
}

export function DataRecordsTable({ records, projectId, groups = [], onEditRecord }: DataRecordsTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<DataRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [imagePreview, setImagePreview] = useState<{
    open: boolean;
    imageUrl: string | null;
    originalPhotoUrl: string | null;
    recordId: string;
    recordName: string;
  }>({ open: false, imageUrl: null, originalPhotoUrl: null, recordId: '', recordName: '' });
  const queryClient = useQueryClient();

  // Get all unique column names from data_json across all records
  const columns = useMemo(() => {
    const columnSet = new Set<string>();
    records.forEach(record => {
      Object.keys(record.data_json).forEach(key => {
        if (key !== '_original' && key !== 'photo') {
          columnSet.add(key);
        }
      });
    });
    return Array.from(columnSet);
  }, [records]);

  // Get unique statuses
  const statuses = useMemo(() => {
    const statusSet = new Set(records.map(r => r.processing_status || 'pending'));
    return Array.from(statusSet);
  }, [records]);

  // Filter records
  const filteredRecords = useMemo(() => {
    return records.filter(record => {
      if (statusFilter !== 'all' && record.processing_status !== statusFilter) {
        return false;
      }
      if (groupFilter !== 'all') {
        if (groupFilter === 'unassigned' && record.group_id !== null) {
          return false;
        } else if (groupFilter !== 'unassigned' && record.group_id !== groupFilter) {
          return false;
        }
      }
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
  }, [records, searchQuery, statusFilter, groupFilter]);

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

  // Delete handlers
  const handleDeleteRecord = async (record: DataRecord) => {
    setRecordToDelete(record);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!recordToDelete) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('data_records')
        .delete()
        .eq('id', recordToDelete.id);

      if (error) throw error;
      toast.success('Record deleted');
      queryClient.invalidateQueries({ queryKey: ['project-records', projectId] });
    } catch (error) {
      console.error('Error deleting record:', error);
      toast.error('Failed to delete record');
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
      setRecordToDelete(null);
    }
  };

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
    }
  };

  const handleAssignGroup = async (groupId: string) => {
    if (selectedIds.size === 0) return;
    try {
      const recordIds = Array.from(selectedIds);
      const newGroupId = groupId === 'none' ? null : groupId;
      
      // Get the previous group IDs to update their counts
      const { data: recordsData } = await supabase
        .from('data_records')
        .select('id, group_id')
        .in('id', recordIds);
      
      const previousGroupIds = new Set(
        recordsData?.filter(r => r.group_id).map(r => r.group_id) || []
      );
      
      // Update records with new group
      const { error } = await supabase
        .from('data_records')
        .update({ group_id: newGroupId })
        .in('id', recordIds);

      if (error) throw error;
      
      // Update record_count for affected groups
      const affectedGroupIds = new Set([...previousGroupIds]);
      if (newGroupId) affectedGroupIds.add(newGroupId);
      
      for (const gId of affectedGroupIds) {
        // Count records in this group
        const { count } = await supabase
          .from('data_records')
          .select('*', { count: 'exact', head: true })
          .eq('project_id', projectId)
          .eq('group_id', gId);
        
        // Update the group's record_count
        await supabase
          .from('project_groups')
          .update({ record_count: count || 0 })
          .eq('id', gId);
      }
      
      toast.success('Group assigned successfully');
      setSelectedIds(new Set());
      // Invalidate both records and project queries to update group counts
      queryClient.invalidateQueries({ queryKey: ['project-records', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    } catch (error) {
      console.error('Error assigning group:', error);
      toast.error('Failed to assign group');
    }
  };

  const getGroupName = (groupId: string | null) => {
    if (!groupId) return 'N/A';
    const group = groups.find(g => g.id === groupId);
    return group?.name || 'N/A';
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setGroupFilter('all');
  };

  const hasActiveFilters = searchQuery || statusFilter !== 'all' || groupFilter !== 'all';

  // Get display name from record
  const getDisplayName = (record: DataRecord) => {
    const data = record.data_json;
    // Handle firstName + lastName combination
    if (data.firstName && data.lastName) return `${data.firstName} ${data.lastName}`;
    if (data.FirstName && data.LastName) return `${data.FirstName} ${data.LastName}`;
    if (data.Name) return data.Name;
    if (data.name) return data.name;
    return `Record #${record.record_number}`;
  };

  // Get role/designation from record
  const getRole = (record: DataRecord) => {
    const data = record.data_json;
    return data.role || data.Role || data.designation || data.Designation || data.type || data.Type || null;
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Get photo URL from record - check multiple fields and construct storage URL if needed
  const getPhotoUrl = (record: DataRecord) => {
    const data = record.data_json;
    // Check direct photo_url field first
    if (record.photo_url) return record.photo_url;
    
    // Check various photo field names in data_json (including profilePic)
    const photoFields = ['profilePic', 'photo', 'Photo', 'image', 'Image', 'picture', 'Picture', 'photo_url', 'photoUrl', 'imageUrl', 'image_url', 'profile_pic', 'ProfilePic'];
    let photoValue: string | null = null;
    
    for (const field of photoFields) {
      if (data[field]) {
        photoValue = data[field];
        break;
      }
    }
    
    if (!photoValue) return null;
    
    // If it's already a full URL, return as is
    if (photoValue.startsWith('http://') || photoValue.startsWith('https://') || photoValue.startsWith('data:')) {
      return photoValue;
    }
    
    // Otherwise, construct the storage URL for project-photos bucket
    const { data: { publicUrl } } = supabase.storage
      .from('project-photos')
      .getPublicUrl(`${projectId}/${photoValue}`);
    
    return publicUrl;
  };

  // Get specific field values with fallbacks
  const getFatherName = (record: DataRecord) => {
    const data = record.data_json;
    return data.fatherName || data.FatherName || data.father_name || data.Father_Name || 'N/A';
  };

  const getClassName = (record: DataRecord) => {
    const data = record.data_json;
    return data.className || data.ClassName || data.class_name || data.Class || data.class || 'N/A';
  };

  const getSection = (record: DataRecord) => {
    const data = record.data_json;
    return data.sec || data.Sec || data.section || data.Section || 'N/A';
  };

  const getAdmissionNo = (record: DataRecord) => {
    const data = record.data_json;
    return data.admNo || data.AdmNo || data.admission_no || data.AdmissionNo || data.admissionNumber || 'N/A';
  };

  // Export to Excel
  const exportToExcel = () => {
    const exportData = filteredRecords.map((record, index) => {
      const data = record.data_json;
      // Remove _original field and flatten data
      const cleanData: Record<string, any> = {};
      Object.entries(data).forEach(([key, value]) => {
        if (key !== '_original') {
          cleanData[key] = value;
        }
      });
      return {
        'S.No': index + 1,
        ...cleanData,
        'Group': getGroupName(record.group_id),
        'Status': record.processing_status || 'pending'
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Student Data');
    XLSX.writeFile(wb, `student_data_export_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success(`Exported ${filteredRecords.length} records to Excel`);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-normal px-3 py-1">
            Total Records: {records.length}
          </Badge>
          {filteredRecords.length !== records.length && (
            <Badge variant="secondary" className="font-normal">
              Showing: {filteredRecords.length}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Clear Selection */}
          {selectedIds.size > 0 && (
            <Button 
              variant="default"
              onClick={() => setSelectedIds(new Set())}
            >
              Clear Selection
            </Button>
          )}

          {/* Selected Actions */}
          {selectedIds.size > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <MoreHorizontal className="h-4 w-4" />
                  Selected Actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {groups.length > 0 && (
                  <>
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        <Users className="h-4 w-4 mr-2" />
                        Assign to Group
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        {groups.map((group) => (
                          <DropdownMenuItem 
                            key={group.id} 
                            onClick={() => handleAssignGroup(group.id)}
                          >
                            {group.name}
                          </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleAssignGroup('none')}>
                          Remove from Group
                        </DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem 
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <MoreHorizontal className="h-4 w-4" />
                Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <div className="px-2 py-1.5 text-sm font-semibold">Actions</div>
              <DropdownMenuItem disabled={selectedIds.size === 0}>
                <Users className="h-4 w-4 mr-2" />
                Assign Group
              </DropdownMenuItem>
              <DropdownMenuItem disabled={selectedIds.size === 0}>
                <Download className="h-4 w-4 mr-2" />
                Generate preview
              </DropdownMenuItem>
              <DropdownMenuItem disabled={selectedIds.size === 0}>
                <Download className="h-4 w-4 mr-2" />
                Generate Class and Section wise preview
              </DropdownMenuItem>
              <DropdownMenuItem 
                disabled={selectedIds.size === 0}
                onClick={() => setShowDeleteDialog(true)}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Filter Button */}
          <Popover open={showFilters} onOpenChange={setShowFilters}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter className="h-4 w-4" />
                Filter
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72" align="end">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Search</label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search records..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      {statuses.map(status => (
                        <SelectItem key={status} value={status}>{status}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Group</label>
                  <Select value={groupFilter} onValueChange={setGroupFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Groups" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Groups</SelectItem>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {groups.map(group => (
                        <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" className="w-full" onClick={clearFilters}>
                    <X className="h-4 w-4 mr-2" />
                    Clear Filters
                  </Button>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Selection Info Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between px-4 py-2 bg-primary/5 border rounded-lg">
          <span className="text-sm text-primary font-medium">
            All {selectedIds.size} records selected
          </span>
          <div className="flex items-center gap-2">
            <Checkbox
              checked={isAllSelected}
              onCheckedChange={handleSelectAll}
              id="deselect-all"
            />
            <label htmlFor="deselect-all" className="text-sm cursor-pointer">
              Deselect all
            </label>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="border rounded-lg">
        <ScrollArea className="w-full">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-12">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead className="w-16">S.No.</TableHead>
                <TableHead className="min-w-[200px]">Name</TableHead>
                {columns.slice(0, 6).map(col => (
                  <TableHead key={col} className="min-w-[120px]">{col}</TableHead>
                ))}
                <TableHead className="min-w-[100px]">Status</TableHead>
                <TableHead className="w-24">Group</TableHead>
                <TableHead className="w-20">Class</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length + 6} className="h-24 text-center">
                    <p className="text-muted-foreground">No records found</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredRecords.map((record, index) => (
                  <TableRow key={record.id} className="hover:bg-muted/30">
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(record.id)}
                        onCheckedChange={(checked) => handleSelectRecord(record.id, checked as boolean)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar 
                          className="h-10 w-10 cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                          onClick={() => setImagePreview({
                            open: true,
                            imageUrl: getPhotoUrl(record),
                            originalPhotoUrl: record.original_photo_url,
                            recordId: record.id,
                            recordName: getDisplayName(record),
                          })}
                        >
                          <AvatarImage src={getPhotoUrl(record) || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            {getInitials(getDisplayName(record))}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="font-medium">{getDisplayName(record)}</span>
                          <Badge 
                            variant={record.processing_status === 'completed' ? 'default' : 'secondary'} 
                            className="w-fit text-xs mt-0.5"
                          >
                            {record.processing_status?.toUpperCase() || 'PENDING'}
                          </Badge>
                          <span className="text-xs text-muted-foreground mt-0.5 font-mono">
                            {record.id.slice(0, 20)}...
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    {columns.slice(0, 6).map(col => (
                      <TableCell key={col}>
                        {record.data_json[col] || 'N/A'}
                      </TableCell>
                    ))}
                    <TableCell>
                      <Badge 
                        variant={record.processing_status === 'completed' ? 'default' : 'secondary'}
                        className={record.processing_status === 'completed' ? 'bg-green-500' : ''}
                      >
                        {record.processing_status?.toUpperCase() || 'PENDING'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={record.group_id ? 'outline' : 'secondary'} className="text-xs">
                        {getGroupName(record.group_id)}
                      </Badge>
                    </TableCell>
                    <TableCell>{getClassName(record)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {onEditRecord && (
                            <DropdownMenuItem onClick={() => onEditRecord(record)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem 
                            onClick={() => handleDeleteRecord(record)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      {/* Image Preview Dialog */}
      <ImagePreviewDialog
        open={imagePreview.open}
        onOpenChange={(open) => setImagePreview(prev => ({ ...prev, open }))}
        imageUrl={imagePreview.imageUrl}
        originalPhotoUrl={imagePreview.originalPhotoUrl}
        recordId={imagePreview.recordId}
        projectId={projectId}
        recordName={imagePreview.recordName}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {recordToDelete 
                ? `Delete Record #${recordToDelete.record_number}` 
                : `Delete ${selectedIds.size} Records`
              }
            </AlertDialogTitle>
            <AlertDialogDescription>
              {recordToDelete
                ? 'Are you sure you want to delete this record? This action cannot be undone.'
                : `Are you sure you want to delete ${selectedIds.size} selected records? This action cannot be undone.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={recordToDelete ? confirmDelete : handleBulkDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
