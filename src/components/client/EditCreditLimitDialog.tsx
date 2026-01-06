import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface EditCreditLimitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  currentLimit: number;
  currentBalance: number;
}

export function EditCreditLimitDialog({ open, onOpenChange, clientId, currentLimit, currentBalance }: EditCreditLimitDialogProps) {
  const [creditLimit, setCreditLimit] = useState(currentLimit.toString());
  const queryClient = useQueryClient();

  useEffect(() => {
    if (open) {
      setCreditLimit(currentLimit.toString());
    }
  }, [open, currentLimit]);

  const updateCreditMutation = useMutation({
    mutationFn: async () => {
      const limitNum = parseFloat(creditLimit);
      if (isNaN(limitNum) || limitNum < 0) {
        throw new Error('Credit limit cannot be negative');
      }
      
      if (limitNum < currentBalance) {
        throw new Error(`Credit limit cannot be less than current balance (₹${currentBalance.toFixed(2)})`);
      }

      const { error } = await supabase
        .from('clients')
        .update({ credit_limit: limitNum })
        .eq('id', clientId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Credit limit updated successfully');
      queryClient.invalidateQueries({ queryKey: ['client', clientId] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const limitNum = parseFloat(creditLimit) || 0;
  const isValid = limitNum >= 0 && limitNum >= currentBalance;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Edit Credit Limit</DialogTitle>
          <DialogDescription>Set the maximum credit limit for this client</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="creditLimit">Credit Limit (₹)</Label>
            <Input
              id="creditLimit"
              type="number"
              placeholder="Enter credit limit"
              value={creditLimit}
              onChange={(e) => setCreditLimit(e.target.value)}
              min={currentBalance}
              step="0.01"
            />
            {limitNum < currentBalance && (
              <p className="text-xs text-destructive">
                Cannot be less than current balance (₹{currentBalance.toFixed(2)})
              </p>
            )}
            {limitNum < 0 && (
              <p className="text-xs text-destructive">
                Credit limit cannot be negative
              </p>
            )}
          </div>
          <div className="text-sm text-muted-foreground">
            <p>Current Balance: ₹{currentBalance.toFixed(2)}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={() => updateCreditMutation.mutate()}
            disabled={updateCreditMutation.isPending || !isValid}
          >
            {updateCreditMutation.isPending ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
