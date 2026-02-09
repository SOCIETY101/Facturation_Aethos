-- Quick fix: Create profiles table if missing
-- Run this in Supabase SQL Editor if you're getting "Could not find the table 'public.profiles'" error

-- First, ensure companies table exists
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
  invoice_prefix text default 'INV-',
  invoice_start_number integer default 1000,
  quote_prefix text default 'QUO-',
  quote_start_number integer default 1000,
  currency text default 'EUR',
  default_payment_terms text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create profiles table if it doesn't exist
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

-- Enable RLS
alter table public.profiles enable row level security;

-- Drop existing policies if they exist (to avoid conflicts)
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;

-- Create RLS policies
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Grant permissions
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update on public.profiles to anon;

-- Ensure update_updated_at_column function exists
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Create trigger for updated_at
drop trigger if exists update_profiles_updated_at on public.profiles;
create trigger update_profiles_updated_at 
before update on public.profiles
for each row 
execute function update_updated_at_column();
