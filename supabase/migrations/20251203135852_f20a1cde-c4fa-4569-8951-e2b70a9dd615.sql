-- Allow vendors to insert wallet transactions for their own clients
CREATE POLICY "Vendors can insert wallet transactions for own clients"
ON public.wallet_transactions
FOR INSERT
WITH CHECK (
  client_id IN (
    SELECT c.id FROM clients c
    WHERE c.vendor_id IN (
      SELECT v.id FROM vendors v WHERE v.user_id = auth.uid()
    )
  )
);

-- Allow vendors to insert wallet transactions for their own vendor account
CREATE POLICY "Vendors can insert own wallet transactions"
ON public.wallet_transactions
FOR INSERT
WITH CHECK (
  vendor_id IN (
    SELECT v.id FROM vendors v WHERE v.user_id = auth.uid()
  )
);