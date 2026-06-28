
-- 1) customer_rate_history
CREATE TABLE public.customer_rate_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  cow_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  buffalo_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  effective_from DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_rate_history_customer_date ON public.customer_rate_history(customer_id, effective_from DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_rate_history TO authenticated;
GRANT ALL ON public.customer_rate_history TO service_role;
ALTER TABLE public.customer_rate_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage their rate history" ON public.customer_rate_history
  FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

-- Seed initial rate history from existing customers
INSERT INTO public.customer_rate_history (owner_id, customer_id, cow_price, buffalo_price, effective_from)
SELECT owner_id, id, cow_price, buffalo_price, COALESCE(created_at::date, CURRENT_DATE)
FROM public.customers;

-- 2) bills
CREATE TABLE public.bills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  cow_litres NUMERIC(10,2) NOT NULL DEFAULT 0,
  buffalo_litres NUMERIC(10,2) NOT NULL DEFAULT 0,
  cow_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  buffalo_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','issued','paid','void')),
  issued_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  share_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (customer_id, period_start, period_end)
);
CREATE INDEX idx_bills_owner_period ON public.bills(owner_id, period_start);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bills TO authenticated;
GRANT SELECT ON public.bills TO anon;
GRANT ALL ON public.bills TO service_role;
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage their bills" ON public.bills
  FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Anyone can read a bill via share token" ON public.bills
  FOR SELECT TO anon USING (share_token IS NOT NULL);

CREATE TRIGGER trg_bills_touch BEFORE UPDATE ON public.bills
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 3) payments
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bill_id UUID NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  method TEXT NOT NULL DEFAULT 'cash' CHECK (method IN ('cash','upi','bank','other')),
  reference TEXT,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_payments_bill ON public.payments(bill_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage their payments" ON public.payments
  FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
