-- Fix: Create tax_rates table
-- Run this in Supabase SQL Editor if you're getting "Could not find the table 'public.tax_rates'" error

-- ============================================
-- CREATE TAX_RATES TABLE
-- ============================================

-- Create tax_rates table if it doesn't exist
create table if not exists public.tax_rates (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references public.companies on delete cascade not null,
  name text not null, -- 'TVA 20%', 'TVA 10%', etc.
  rate numeric(5,2) not null,
  is_default boolean default false,
  created_at timestamp with time zone default now()
);

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================

alter table public.tax_rates enable row level security;

-- ============================================
-- CREATE RLS POLICIES
-- ============================================

-- Drop existing policies to avoid conflicts
drop policy if exists "Users can view own company tax rates" on public.tax_rates;
drop policy if exists "Users can manage tax rates" on public.tax_rates;

-- Create policies
create policy "Users can view own company tax rates" 
  on public.tax_rates for select
  using (company_id in (select company_id from public.profiles where id = auth.uid()));

create policy "Users can manage tax rates" 
  on public.tax_rates for all
  using (company_id in (select company_id from public.profiles where id = auth.uid()));

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

grant select, insert, update, delete on public.tax_rates to authenticated;
grant select, insert, update, delete on public.tax_rates to anon;

-- ============================================
-- VERIFICATION
-- ============================================

-- Verify table exists
select 
  'tax_rates table created successfully' as status,
  count(*) as column_count
from information_schema.columns 
where table_schema = 'public' 
and table_name = 'tax_rates';

-- Show table structure
select 
  column_name, 
  data_type, 
  is_nullable,
  column_default
from information_schema.columns 
where table_schema = 'public' 
and table_name = 'tax_rates'
order by ordinal_position;
