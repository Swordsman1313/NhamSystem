-- ========================================================
-- NHAM NHAM OPS - SUPABASE CLOUD DATABASE SCHEMA
-- Run this script in your Supabase SQL Editor to initialize tables
-- ========================================================

-- 1. App Settings Table
CREATE TABLE IF NOT EXISTS public.nham_settings (
  id TEXT PRIMARY KEY DEFAULT 'app_settings',
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Partner Stores Table
CREATE TABLE IF NOT EXISTS public.nham_stores (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE,
  customer_name TEXT,
  ship_to TEXT,
  address TEXT,
  phone TEXT,
  terms_days INTEGER DEFAULT 15,
  is_active BOOLEAN DEFAULT TRUE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Products & BOM Catalog Table
CREATE TABLE IF NOT EXISTS public.nham_products (
  id TEXT PRIMARY KEY,
  barcode TEXT UNIQUE,
  name TEXT,
  khmer_name TEXT,
  name_en TEXT,
  name_kh TEXT,
  wholesale_price NUMERIC DEFAULT 0,
  uom TEXT DEFAULT 'Pcs',
  bom JSONB DEFAULT '[]'::jsonb,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Packaging Inventory Table
CREATE TABLE IF NOT EXISTS public.nham_packaging (
  id TEXT PRIMARY KEY,
  name TEXT,
  khmer_name TEXT,
  category TEXT,
  unit_cost_khr NUMERIC DEFAULT 0,
  on_hand NUMERIC DEFAULT 0,
  low_stock_threshold NUMERIC DEFAULT 25,
  barcode_ref TEXT,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Packaging Categories Table
CREATE TABLE IF NOT EXISTS public.nham_categories (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE,
  is_protected BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Invoices & Delivery Notes Table
CREATE TABLE IF NOT EXISTS public.nham_invoices (
  id TEXT PRIMARY KEY,
  invoice_number TEXT UNIQUE,
  invoice_date TEXT,
  due_date TEXT,
  store_code TEXT,
  total_quantity NUMERIC DEFAULT 0,
  total_amount_usd NUMERIC DEFAULT 0,
  total_amount_khr NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending',
  items JSONB DEFAULT '[]'::jsonb,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Batch Costing History Table
CREATE TABLE IF NOT EXISTS public.nham_batches (
  id TEXT PRIMARY KEY,
  batch_number TEXT UNIQUE,
  date TEXT,
  market_spend_khr NUMERIC DEFAULT 0,
  fuel_expense_khr NUMERIC DEFAULT 0,
  total_boxes_yielded NUMERIC DEFAULT 0,
  landed_unit_cost_khr NUMERIC DEFAULT 0,
  landed_unit_cost_usd NUMERIC DEFAULT 0,
  delivery_revenue_usd NUMERIC DEFAULT 0,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================================
-- ENABLE ROW LEVEL SECURITY (RLS) & PUBLIC ACCESS
-- Allows seamless read/write from authenticated and anon clients
-- ========================================================
ALTER TABLE public.nham_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nham_stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nham_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nham_packaging ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nham_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nham_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nham_batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public full access settings" ON public.nham_settings;
CREATE POLICY "Public full access settings" ON public.nham_settings FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access stores" ON public.nham_stores;
CREATE POLICY "Public full access stores" ON public.nham_stores FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access products" ON public.nham_products;
CREATE POLICY "Public full access products" ON public.nham_products FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access packaging" ON public.nham_packaging;
CREATE POLICY "Public full access packaging" ON public.nham_packaging FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access categories" ON public.nham_categories;
CREATE POLICY "Public full access categories" ON public.nham_categories FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access invoices" ON public.nham_invoices;
CREATE POLICY "Public full access invoices" ON public.nham_invoices FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access batches" ON public.nham_batches;
CREATE POLICY "Public full access batches" ON public.nham_batches FOR ALL TO anon USING (true) WITH CHECK (true);

-- Enable Realtime Replication for Live Multi-Device Sync
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.nham_settings;
EXCEPTION WHEN OTHERS THEN NULL; END;
$$;
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.nham_stores;
EXCEPTION WHEN OTHERS THEN NULL; END;
$$;
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.nham_products;
EXCEPTION WHEN OTHERS THEN NULL; END;
$$;
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.nham_packaging;
EXCEPTION WHEN OTHERS THEN NULL; END;
$$;
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.nham_categories;
EXCEPTION WHEN OTHERS THEN NULL; END;
$$;
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.nham_invoices;
EXCEPTION WHEN OTHERS THEN NULL; END;
$$;
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.nham_batches;
EXCEPTION WHEN OTHERS THEN NULL; END;
$$;
