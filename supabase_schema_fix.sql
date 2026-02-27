-- Supabase schema fix for app tables
-- Run after complete_database_setup.sql if you already had legacy tables.

begin;

-- Ensure core tables exist
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

create table if not exists public.clients (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references public.companies on delete cascade,
  name text not null,
  email text,
  phone text,
  contact_person text,
  address text,
  city text,
  postal_code text,
  country text,
  tax_id text,
  notes text,
  created_by uuid references auth.users,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists public.products (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references public.companies on delete cascade,
  name text not null,
  description text,
  unit_price numeric not null,
  tax_rate numeric default 0,
  is_active boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists public.tax_rates (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references public.companies on delete cascade,
  name text not null,
  rate numeric not null,
  is_default boolean default false,
  created_at timestamp with time zone default now()
);

create table if not exists public.quotes (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references public.companies on delete cascade,
  client_id uuid references public.clients on delete cascade,
  quote_number text not null,
  status text default 'draft',
  date date not null,
  valid_until date,
  subtotal numeric not null,
  tax_amount numeric not null,
  total numeric not null,
  notes text,
  terms text,
  created_by uuid references auth.users,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists public.quote_items (
  id uuid primary key default uuid_generate_v4(),
  quote_id uuid references public.quotes on delete cascade,
  product_id uuid references public.products,
  description text not null,
  quantity numeric not null,
  unit_price numeric not null,
  tax_rate numeric default 0,
  total numeric not null,
  sort_order integer default 0,
  created_at timestamp with time zone default now()
);

create table if not exists public.invoices (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references public.companies on delete cascade,
  client_id uuid references public.clients on delete cascade,
  quote_id uuid references public.quotes,
  invoice_number text not null,
  status text default 'draft',
  date date not null,
  due_date date,
  subtotal numeric not null,
  tax_amount numeric not null,
  total numeric not null,
  paid_amount numeric default 0,
  balance numeric default 0,
  notes text,
  terms text,
  created_by uuid references auth.users,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists public.invoice_items (
  id uuid primary key default uuid_generate_v4(),
  invoice_id uuid references public.invoices on delete cascade,
  product_id uuid references public.products,
  description text not null,
  quantity numeric not null,
  unit_price numeric not null,
  tax_rate numeric default 0,
  total numeric not null,
  sort_order integer default 0,
  created_at timestamp with time zone default now()
);

create table if not exists public.payments (
  id uuid primary key default uuid_generate_v4(),
  invoice_id uuid references public.invoices on delete cascade,
  amount numeric not null,
  payment_date date not null,
  payment_method text,
  reference text,
  notes text,
  created_by uuid references auth.users,
  created_at timestamp with time zone default now()
);

-- Add missing columns to existing tables (safe to run multiple times)

alter table if exists public.clients add column if not exists company_id uuid;
alter table if exists public.clients add column if not exists name text;
alter table if exists public.clients add column if not exists email text;
alter table if exists public.clients add column if not exists phone text;
alter table if exists public.clients add column if not exists contact_person text;
alter table if exists public.clients add column if not exists address text;
alter table if exists public.clients add column if not exists city text;
alter table if exists public.clients add column if not exists postal_code text;
alter table if exists public.clients add column if not exists country text;
alter table if exists public.clients add column if not exists tax_id text;
alter table if exists public.clients add column if not exists notes text;
alter table if exists public.clients add column if not exists created_by uuid;
alter table if exists public.clients add column if not exists created_at timestamp with time zone;
alter table if exists public.clients add column if not exists updated_at timestamp with time zone;

alter table if exists public.quotes add column if not exists company_id uuid;
alter table if exists public.quotes add column if not exists client_id uuid;
alter table if exists public.quotes add column if not exists quote_number text;
alter table if exists public.quotes add column if not exists status text;
alter table if exists public.quotes add column if not exists date date;
alter table if exists public.quotes add column if not exists valid_until date;
alter table if exists public.quotes add column if not exists subtotal numeric;
alter table if exists public.quotes add column if not exists tax_amount numeric;
alter table if exists public.quotes add column if not exists total numeric;
alter table if exists public.quotes add column if not exists notes text;
alter table if exists public.quotes add column if not exists terms text;
alter table if exists public.quotes add column if not exists created_by uuid;
alter table if exists public.quotes add column if not exists created_at timestamp with time zone;
alter table if exists public.quotes add column if not exists updated_at timestamp with time zone;

alter table if exists public.quote_items add column if not exists quote_id uuid;
alter table if exists public.quote_items add column if not exists product_id uuid;
alter table if exists public.quote_items add column if not exists description text;
alter table if exists public.quote_items add column if not exists quantity numeric;
alter table if exists public.quote_items add column if not exists unit_price numeric;
alter table if exists public.quote_items add column if not exists tax_rate numeric;
alter table if exists public.quote_items add column if not exists total numeric;
alter table if exists public.quote_items add column if not exists sort_order integer;
alter table if exists public.quote_items add column if not exists created_at timestamp with time zone;

alter table if exists public.invoices add column if not exists company_id uuid;
alter table if exists public.invoices add column if not exists client_id uuid;
alter table if exists public.invoices add column if not exists quote_id uuid;
alter table if exists public.invoices add column if not exists invoice_number text;
alter table if exists public.invoices add column if not exists status text;
alter table if exists public.invoices add column if not exists date date;
alter table if exists public.invoices add column if not exists due_date date;
alter table if exists public.invoices add column if not exists subtotal numeric;
alter table if exists public.invoices add column if not exists tax_amount numeric;
alter table if exists public.invoices add column if not exists total numeric;
alter table if exists public.invoices add column if not exists paid_amount numeric;
alter table if exists public.invoices add column if not exists balance numeric;
alter table if exists public.invoices add column if not exists notes text;
alter table if exists public.invoices add column if not exists terms text;
alter table if exists public.invoices add column if not exists created_by uuid;
alter table if exists public.invoices add column if not exists created_at timestamp with time zone;
alter table if exists public.invoices add column if not exists updated_at timestamp with time zone;

alter table if exists public.invoice_items add column if not exists invoice_id uuid;
alter table if exists public.invoice_items add column if not exists product_id uuid;
alter table if exists public.invoice_items add column if not exists description text;
alter table if exists public.invoice_items add column if not exists quantity numeric;
alter table if exists public.invoice_items add column if not exists unit_price numeric;
alter table if exists public.invoice_items add column if not exists tax_rate numeric;
alter table if exists public.invoice_items add column if not exists total numeric;
alter table if exists public.invoice_items add column if not exists sort_order integer;
alter table if exists public.invoice_items add column if not exists created_at timestamp with time zone;

alter table if exists public.payments add column if not exists invoice_id uuid;
alter table if exists public.payments add column if not exists amount numeric;
alter table if exists public.payments add column if not exists payment_date date;
alter table if exists public.payments add column if not exists payment_method text;
alter table if exists public.payments add column if not exists reference text;
alter table if exists public.payments add column if not exists notes text;
alter table if exists public.payments add column if not exists created_by uuid;
alter table if exists public.payments add column if not exists created_at timestamp with time zone;

commit;
