import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface AddBalanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  currentBalance: number;
  creditLimit: number;
}

export function AddBalanceDialog({ open, onOpenChange, clientId, currentBalance, creditLimit }: AddBalanceDialogProps) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const queryClient = useQueryClient();

  const addBalanceMutation = useMutation({
    mutationFn: async () => {
      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        throw new Error('Please enter a valid positive amount');
      }

      const newBalance = currentBalance + amountNum;
      
      if (newBalance > creditLimit) {
        throw new Error(`Balance cannot exceed credit limit (₹${creditLimit.toFixed(2)})`);
      }

      // Create wallet transaction
      const { error: txnError } = await supabase
        .from('wallet_transactions')
        .insert({
          client_id: clientId,
          amount: amountNum,
          balance_after: newBalance,
          transaction_type: 'credit',
          description: description || 'Balance added',
        });

      if (txnError) throw txnError;

      // Update client balance
      const { error: clientError } = await supabase
        .from('clients')
        .update({ wallet_balance: newBalance })
        .eq('id', clientId);

      if (clientError) throw clientError;
    },
    onSuccess: () => {
      toast.success('Balance added successfully');
      queryClient.invalidateQueries({ queryKey: ['client', clientId] });
      queryClient.invalidateQueries({ queryKey: ['client-wallet', clientId] });
      onOpenChange(false);
      setAmount('');
      setDescription('');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const maxAddable = creditLimit - currentBalance;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Add Balance</DialogTitle>
          <DialogDescription>Add funds to client wallet</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (₹)</Label>
            <Input
              id="amount"
              type="number"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="0"
              max={maxAddable}
              step="0.01"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              placeholder="Enter description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>Current Balance: ₹{currentBalance.toFixed(2)}</p>
            <p>Credit Limit: ₹{creditLimit.toFixed(2)}</p>
            <p className="text-primary">Max addable: ₹{maxAddable.toFixed(2)}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={() => addBalanceMutation.mutate()}
            disabled={addBalanceMutation.isPending || maxAddable <= 0}
          >
            {addBalanceMutation.isPending ? 'Adding...' : 'Add Balance'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
