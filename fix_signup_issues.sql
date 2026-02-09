-- Fix Signup Issues: Create profiles table and company creation function
-- Run this in Supabase SQL Editor to fix both errors

-- ============================================
-- 1. CREATE PROFILES TABLE (if it doesn't exist)
-- ============================================

-- First ensure companies table exists
create table if not exists public.companies (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  email text,
  phone text,
  address text,
  city text,
  postal_code text,
  country text,
  tax_id text,
  logo_url text,
  bank_name text,
  bank_account text,
  bank_iban text,
  bank_bic text,
  invoice_prefix text default 'INV-',
  invoice_start_number integer default 1000,
  quote_prefix text default 'QUO-',
  quote_start_number integer default 1000,
  currency text default 'EUR',
  default_payment_terms text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create profiles table
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  company_id uuid references public.companies on delete cascade,
  email text unique not null,
  full_name text,
  role text default 'user',
  avatar_url text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create tax_rates table
create table if not exists public.tax_rates (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references public.companies on delete cascade not null,
  name text not null, -- 'TVA 20%', 'TVA 10%', etc.
  rate numeric(5,2) not null,
  is_default boolean default false,
  created_at timestamp with time zone default now()
);

-- ============================================
-- 2. CREATE/FIX COMPANY CREATION FUNCTION
-- ============================================

-- Drop and recreate the function to ensure it exists with correct signature
drop function if exists public.create_company_for_user(uuid, text, text);
drop function if exists public.create_company_for_user(text, text, uuid);

create or replace function public.create_company_for_user(
  user_id uuid,
  company_name text,
  user_email text
)
returns uuid as $$
declare
  new_company_id uuid;
  profile_exists boolean;
  max_wait_seconds integer := 3;
  wait_count integer := 0;
begin
  -- Wait for profile to be created by trigger (max 3 seconds)
  loop
    select exists(select 1 from public.profiles where id = user_id) into profile_exists;
    exit when profile_exists or wait_count >= max_wait_seconds * 10;
    perform pg_sleep(0.1); -- Wait 100ms
    wait_count := wait_count + 1;
  end loop;
  
  -- If profile still doesn't exist, create it
  if not profile_exists then
    insert into public.profiles (id, email, full_name)
    values (user_id, user_email, '')
    on conflict (id) do update set email = user_email;
  end if;
  
  -- Create company
  insert into public.companies (name, email)
  values (company_name, user_email)
  returning id into new_company_id;
  
  -- Link profile to company
  update public.profiles
  set company_id = new_company_id
  where id = user_id;
  
  -- Return the company ID
  return new_company_id;
exception
  when others then
    raise exception 'Failed to create company: %', SQLERRM;
end;
$$ language plpgsql security definer;

-- Grant execute permission
grant execute on function public.create_company_for_user(uuid, text, text) to authenticated, anon;

-- ============================================
-- 3. CREATE PROFILE CREATION TRIGGER
-- ============================================

-- Function to create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do update set email = new.email;
  return new;
end;
$$ language plpgsql security definer;

-- Drop and recreate trigger
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================
-- 4. ENABLE RLS AND CREATE POLICIES
-- ============================================

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.companies enable row level security;

-- Drop existing policies
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can insert companies via function" on public.companies;
drop policy if exists "Users can view own company" on public.companies;
drop policy if exists "Users can update own company" on public.companies;

-- Profiles policies
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert profiles"
  on public.profiles for insert
  to authenticated, anon
  with check (true);

-- Companies policies
create policy "Users can insert companies via function"
  on public.companies for insert
  to authenticated, anon
  with check (true);

create policy "Users can view own company"
  on public.companies for select
  using (id in (select company_id from public.profiles where id = auth.uid()));

create policy "Users can update own company"
  on public.companies for update
  using (id in (select company_id from public.profiles where id = auth.uid()));

-- Tax rates policies
drop policy if exists "Users can view own company tax rates" on public.tax_rates;
drop policy if exists "Users can manage tax rates" on public.tax_rates;

create policy "Users can view own company tax rates" 
  on public.tax_rates for select
  using (company_id in (select company_id from public.profiles where id = auth.uid()));

create policy "Users can manage tax rates" 
  on public.tax_rates for all
  using (company_id in (select company_id from public.profiles where id = auth.uid()));

-- ============================================
-- 5. GRANT PERMISSIONS
-- ============================================

grant select, insert, update on public.profiles to authenticated;
grant select, insert, update on public.profiles to anon;
grant select, insert, update on public.companies to authenticated;
grant select, insert, update on public.companies to anon;
grant select, insert, update, delete on public.tax_rates to authenticated;
grant select, insert, update, delete on public.tax_rates to anon;

-- ============================================
-- 6. CREATE UPDATED_AT FUNCTION AND TRIGGER
-- ============================================

create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Drop and recreate triggers
drop trigger if exists update_profiles_updated_at on public.profiles;
drop trigger if exists update_companies_updated_at on public.companies;

create trigger update_profiles_updated_at 
before update on public.profiles
for each row execute function public.update_updated_at_column();

create trigger update_companies_updated_at 
before update on public.companies
for each row execute function public.update_updated_at_column();

-- ============================================
-- VERIFICATION
-- ============================================

-- Verify tables exist
select 'profiles table exists' as status 
where exists (select 1 from information_schema.tables where table_name = 'profiles' and table_schema = 'public')
union all
select 'companies table exists' as status 
where exists (select 1 from information_schema.tables where table_name = 'companies' and table_schema = 'public')
union all
select 'tax_rates table exists' as status 
where exists (select 1 from information_schema.tables where table_name = 'tax_rates' and table_schema = 'public')
union all
select 'create_company_for_user function exists' as status 
where exists (
  select 1 from pg_proc p
  join pg_namespace n on p.pronamespace = n.oid
  where n.nspname = 'public' and p.proname = 'create_company_for_user'
);
