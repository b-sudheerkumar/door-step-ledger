
-- Add Telegram fields to customers
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS telegram_chat_id BIGINT,
  ADD COLUMN IF NOT EXISTS telegram_link_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(12), 'base64');

CREATE INDEX IF NOT EXISTS idx_customers_telegram_chat_id ON public.customers(telegram_chat_id);
CREATE INDEX IF NOT EXISTS idx_customers_telegram_link_token ON public.customers(telegram_link_token);

-- Deliveries table
CREATE TABLE public.deliveries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL,
  delivery_date DATE NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Kolkata')::date,
  cow_qty NUMERIC NOT NULL DEFAULT 0,
  buffalo_qty NUMERIC NOT NULL DEFAULT 0,
  delivered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (customer_id, delivery_date)
);

CREATE INDEX idx_deliveries_owner_date ON public.deliveries(owner_id, delivery_date DESC);
CREATE INDEX idx_deliveries_customer_date ON public.deliveries(customer_id, delivery_date DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.deliveries TO authenticated;
GRANT ALL ON public.deliveries TO service_role;

ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view own deliveries" ON public.deliveries
  FOR SELECT TO authenticated
  USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owners can insert own deliveries" ON public.deliveries
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update own deliveries" ON public.deliveries
  FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owners can delete own deliveries" ON public.deliveries
  FOR DELETE TO authenticated
  USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER touch_deliveries_updated_at
  BEFORE UPDATE ON public.deliveries
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Backfill tokens for any existing customers missing one
UPDATE public.customers
  SET telegram_link_token = encode(gen_random_bytes(12), 'base64')
  WHERE telegram_link_token IS NULL;
