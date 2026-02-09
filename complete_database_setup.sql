-- Complete Database Setup Script
-- Run this entire script in Supabase SQL Editor to set up your database
-- This combines all migrations in the correct order

-- ============================================
-- 1. ENABLE EXTENSIONS
-- ============================================
create extension if not exists "uuid-ossp";

-- ============================================
-- 2. CREATE TABLES
-- ============================================

-- Companies table (multi-tenant ready)
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

-- Users/Profiles table
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  company_id uuid references public.companies on delete cascade,
  email text unique not null,
  full_name text,
  role text default 'user', -- 'admin', 'user', 'accountant'
  avatar_url text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Ensure all columns exist (in case table was created without them)
do $$
begin
  -- Add company_id if it doesn't exist
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' 
    and table_name = 'profiles' 
    and column_name = 'company_id'
  ) then
    alter table public.profiles add column company_id uuid;
    alter table public.profiles add constraint profiles_company_id_fkey 
      foreign key (company_id) references public.companies(id) on delete cascade;
  end if;
  
  -- Add other columns if missing
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' 
    and table_name = 'profiles' 
    and column_name = 'email'
  ) then
    alter table public.profiles add column email text;
    alter table public.profiles alter column email set not null;
    alter table public.profiles add constraint profiles_email_unique unique (email);
  end if;
  
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' 
    and table_name = 'profiles' 
    and column_name = 'full_name'
  ) then
    alter table public.profiles add column full_name text;
  end if;
  
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' 
    and table_name = 'profiles' 
    and column_name = 'role'
  ) then
    alter table public.profiles add column role text default 'user';
  end if;
  
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' 
    and table_name = 'profiles' 
    and column_name = 'avatar_url'
  ) then
    alter table public.profiles add column avatar_url text;
  end if;
  
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' 
    and table_name = 'profiles' 
    and column_name = 'created_at'
  ) then
    alter table public.profiles add column created_at timestamp with time zone default now();
  end if;
  
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' 
    and table_name = 'profiles' 
    and column_name = 'updated_at'
  ) then
    alter table public.profiles add column updated_at timestamp with time zone default now();
  end if;
end $$;

-- Clients table
create table if not exists public.clients (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references public.companies on delete cascade not null,
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
  created_by uuid references public.profiles on delete set null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Products/Services catalog
create table if not exists public.products (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references public.companies on delete cascade not null,
  name text not null,
  description text,
  unit_price numeric(10,2) not null,
  tax_rate numeric(5,2) default 20.00,
  is_active boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Tax rates
create table if not exists public.tax_rates (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references public.companies on delete cascade not null,
  name text not null, -- 'TVA 20%', 'TVA 10%', etc.
  rate numeric(5,2) not null,
  is_default boolean default false,
  created_at timestamp with time zone default now()
);

-- Quotes
create table if not exists public.quotes (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references public.companies on delete cascade not null,
  client_id uuid references public.clients on delete restrict not null,
  quote_number text not null,
  status text not null default 'draft', -- 'draft', 'sent', 'accepted', 'rejected', 'expired'
  date date not null default current_date,
  valid_until date not null,
  subtotal numeric(10,2) not null default 0,
  tax_amount numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  notes text,
  terms text,
  created_by uuid references public.profiles on delete set null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(company_id, quote_number)
);

-- Quote line items
create table if not exists public.quote_items (
  id uuid primary key default uuid_generate_v4(),
  quote_id uuid references public.quotes on delete cascade not null,
  product_id uuid references public.products on delete set null,
  description text not null,
  quantity numeric(10,2) not null default 1,
  unit_price numeric(10,2) not null,
  tax_rate numeric(5,2) not null default 20.00,
  total numeric(10,2) not null,
  sort_order integer default 0,
  created_at timestamp with time zone default now()
);

-- Invoices
create table if not exists public.invoices (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references public.companies on delete cascade not null,
  client_id uuid references public.clients on delete restrict not null,
  quote_id uuid references public.quotes on delete set null,
  invoice_number text not null,
  status text not null default 'draft', -- 'draft', 'sent', 'paid', 'partial', 'overdue', 'cancelled'
  date date not null default current_date,
  due_date date not null,
  subtotal numeric(10,2) not null default 0,
  tax_amount numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  paid_amount numeric(10,2) not null default 0,
  balance numeric(10,2) not null default 0,
  notes text,
  terms text,
  created_by uuid references public.profiles on delete set null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(company_id, invoice_number)
);

-- Invoice line items
create table if not exists public.invoice_items (
  id uuid primary key default uuid_generate_v4(),
  invoice_id uuid references public.invoices on delete cascade not null,
  product_id uuid references public.products on delete set null,
  description text not null,
  quantity numeric(10,2) not null default 1,
  unit_price numeric(10,2) not null,
  tax_rate numeric(5,2) not null default 20.00,
  total numeric(10,2) not null,
  sort_order integer default 0,
  created_at timestamp with time zone default now()
);

-- Payments
create table if not exists public.payments (
  id uuid primary key default uuid_generate_v4(),
  invoice_id uuid references public.invoices on delete cascade not null,
  amount numeric(10,2) not null,
  payment_date date not null default current_date,
  payment_method text not null, -- 'bank_transfer', 'cash', 'check', 'card', 'other'
  reference text,
  notes text,
  created_by uuid references public.profiles on delete set null,
  created_at timestamp with time zone default now()
);

-- ============================================
-- 3. CREATE INDEXES
-- ============================================
create index if not exists idx_clients_company on public.clients(company_id);
create index if not exists idx_quotes_company on public.quotes(company_id);
create index if not exists idx_quotes_client on public.quotes(client_id);
create index if not exists idx_quotes_status on public.quotes(status);
create index if not exists idx_invoices_company on public.invoices(company_id);
create index if not exists idx_invoices_client on public.invoices(client_id);
create index if not exists idx_invoices_status on public.invoices(status);
create index if not exists idx_payments_invoice on public.payments(invoice_id);

-- ============================================
-- 4. CREATE FUNCTIONS
-- ============================================

-- Updated at trigger function
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Function to create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

-- Function to auto-update invoice status based on payments
create or replace function public.update_invoice_status()
returns trigger as $$
declare
  invoice_total numeric(10,2);
  invoice_paid numeric(10,2);
begin
  select total, paid_amount into invoice_total, invoice_paid
  from public.invoices where id = new.invoice_id;
  
  if invoice_paid >= invoice_total then
    update public.invoices set status = 'paid' where id = new.invoice_id;
  elsif invoice_paid > 0 then
    update public.invoices set status = 'partial' where id = new.invoice_id;
  end if;
  
  return new;
end;
$$ language plpgsql;

-- Function to update invoice paid_amount and balance when payment is added
create or replace function public.update_invoice_payment()
returns trigger as $$
begin
  update public.invoices
  set paid_amount = (
    select coalesce(sum(amount), 0)
    from public.payments
    where invoice_id = new.invoice_id
  ),
  balance = total - (
    select coalesce(sum(amount), 0)
    from public.payments
    where invoice_id = new.invoice_id
  )
  where id = new.invoice_id;
  
  return new;
end;
$$ language plpgsql;

-- Function to create company and link to profile on signup
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
    on conflict (id) do nothing;
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

-- ============================================
-- 5. CREATE TRIGGERS
-- ============================================

-- Drop existing triggers if they exist
drop trigger if exists update_companies_updated_at on public.companies;
drop trigger if exists update_profiles_updated_at on public.profiles;
drop trigger if exists update_clients_updated_at on public.clients;
drop trigger if exists update_quotes_updated_at on public.quotes;
drop trigger if exists update_invoices_updated_at on public.invoices;
drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists on_payment_added on public.payments;
drop trigger if exists on_payment_inserted on public.payments;
drop trigger if exists on_payment_deleted on public.payments;

-- Apply updated_at triggers
create trigger update_companies_updated_at before update on public.companies
  for each row execute function public.update_updated_at_column();
create trigger update_profiles_updated_at before update on public.profiles
  for each row execute function public.update_updated_at_column();
create trigger update_clients_updated_at before update on public.clients
  for each row execute function public.update_updated_at_column();
create trigger update_quotes_updated_at before update on public.quotes
  for each row execute function public.update_updated_at_column();
create trigger update_invoices_updated_at before update on public.invoices
  for each row execute function public.update_updated_at_column();

-- Trigger for new user signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Payment triggers
create trigger on_payment_added
  after insert on public.payments
  for each row execute function public.update_invoice_status();

create trigger on_payment_inserted
  after insert on public.payments
  for each row execute function public.update_invoice_payment();

create trigger on_payment_deleted
  after delete on public.payments
  for each row execute function public.update_invoice_payment();

-- ============================================
-- 6. ENABLE ROW LEVEL SECURITY
-- ============================================
alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.products enable row level security;
alter table public.tax_rates enable row level security;
alter table public.quotes enable row level security;
alter table public.quote_items enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.payments enable row level security;

-- ============================================
-- 7. VERIFY TABLE STRUCTURE BEFORE POLICIES
-- ============================================

-- Ensure profiles table has company_id column before creating policies
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' 
    and table_name = 'profiles' 
    and column_name = 'company_id'
  ) then
    raise exception 'profiles table is missing company_id column. Please drop and recreate the table.';
  end if;
end $$;

-- ============================================
-- 8. CREATE RLS POLICIES
-- ============================================

-- Drop existing policies to avoid conflicts
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can view own company" on public.companies;
drop policy if exists "Users can update own company" on public.companies;
drop policy if exists "Users can insert companies via function" on public.companies;

-- Profiles policies
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Companies policies
create policy "Users can view own company"
  on public.companies for select
  using (id in (select company_id from public.profiles where id = auth.uid()));

create policy "Users can update own company"
  on public.companies for update
  using (id in (select company_id from public.profiles where id = auth.uid()));

create policy "Users can insert companies via function"
  on public.companies for insert
  to authenticated
  with check (true);

-- Clients policies
create policy "Users can view own company clients"
  on public.clients for select
  using (company_id in (select company_id from public.profiles where id = auth.uid()));

create policy "Users can insert clients"
  on public.clients for insert
  with check (company_id in (select company_id from public.profiles where id = auth.uid()));

create policy "Users can update own company clients"
  on public.clients for update
  using (company_id in (select company_id from public.profiles where id = auth.uid()));

create policy "Users can delete own company clients"
  on public.clients for delete
  using (company_id in (select company_id from public.profiles where id = auth.uid()));

-- Products policies
drop policy if exists "Users can view own company products" on public.products;
drop policy if exists "Users can insert products" on public.products;
drop policy if exists "Users can update own company products" on public.products;
drop policy if exists "Users can delete own company products" on public.products;

create policy "Users can view own company products" on public.products for select
  using (company_id in (select company_id from public.profiles where id = auth.uid()));
create policy "Users can insert products" on public.products for insert
  with check (company_id in (select company_id from public.profiles where id = auth.uid()));
create policy "Users can update own company products" on public.products for update
  using (company_id in (select company_id from public.profiles where id = auth.uid()));
create policy "Users can delete own company products" on public.products for delete
  using (company_id in (select company_id from public.profiles where id = auth.uid()));

-- Tax rates policies
drop policy if exists "Users can view own company tax rates" on public.tax_rates;
drop policy if exists "Users can manage tax rates" on public.tax_rates;

create policy "Users can view own company tax rates" on public.tax_rates for select
  using (company_id in (select company_id from public.profiles where id = auth.uid()));
create policy "Users can manage tax rates" on public.tax_rates for all
  using (company_id in (select company_id from public.profiles where id = auth.uid()));

-- Quotes policies
drop policy if exists "Users can view own company quotes" on public.quotes;
drop policy if exists "Users can insert quotes" on public.quotes;
drop policy if exists "Users can update own company quotes" on public.quotes;
drop policy if exists "Users can delete own company quotes" on public.quotes;

create policy "Users can view own company quotes" on public.quotes for select
  using (company_id in (select company_id from public.profiles where id = auth.uid()));
create policy "Users can insert quotes" on public.quotes for insert
  with check (company_id in (select company_id from public.profiles where id = auth.uid()));
create policy "Users can update own company quotes" on public.quotes for update
  using (company_id in (select company_id from public.profiles where id = auth.uid()));
create policy "Users can delete own company quotes" on public.quotes for delete
  using (company_id in (select company_id from public.profiles where id = auth.uid()));

-- Quote items policies
drop policy if exists "Users can view quote items" on public.quote_items;
drop policy if exists "Users can manage quote items" on public.quote_items;

create policy "Users can view quote items" on public.quote_items for select
  using (quote_id in (select id from public.quotes where company_id in (select company_id from public.profiles where id = auth.uid())));
create policy "Users can manage quote items" on public.quote_items for all
  using (quote_id in (select id from public.quotes where company_id in (select company_id from public.profiles where id = auth.uid())));

-- Invoices policies
drop policy if exists "Users can view own company invoices" on public.invoices;
drop policy if exists "Users can insert invoices" on public.invoices;
drop policy if exists "Users can update own company invoices" on public.invoices;
drop policy if exists "Users can delete own company invoices" on public.invoices;

create policy "Users can view own company invoices" on public.invoices for select
  using (company_id in (select company_id from public.profiles where id = auth.uid()));
create policy "Users can insert invoices" on public.invoices for insert
  with check (company_id in (select company_id from public.profiles where id = auth.uid()));
create policy "Users can update own company invoices" on public.invoices for update
  using (company_id in (select company_id from public.profiles where id = auth.uid()));
create policy "Users can delete own company invoices" on public.invoices for delete
  using (company_id in (select company_id from public.profiles where id = auth.uid()));

-- Invoice items policies
drop policy if exists "Users can view invoice items" on public.invoice_items;
drop policy if exists "Users can manage invoice items" on public.invoice_items;

create policy "Users can view invoice items" on public.invoice_items for select
  using (invoice_id in (select id from public.invoices where company_id in (select company_id from public.profiles where id = auth.uid())));
create policy "Users can manage invoice items" on public.invoice_items for all
  using (invoice_id in (select id from public.invoices where company_id in (select company_id from public.profiles where id = auth.uid())));

-- Payments policies
drop policy if exists "Users can view payments" on public.payments;
drop policy if exists "Users can manage payments" on public.payments;

create policy "Users can view payments" on public.payments for select
  using (invoice_id in (select id from public.invoices where company_id in (select company_id from public.profiles where id = auth.uid())));
create policy "Users can manage payments" on public.payments for all
  using (invoice_id in (select id from public.invoices where company_id in (select company_id from public.profiles where id = auth.uid())));

-- ============================================
-- 9. GRANT PERMISSIONS
-- ============================================
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update on public.profiles to anon;
grant execute on function public.create_company_for_user(uuid, text, text) to authenticated, anon;

-- ============================================
-- SETUP COMPLETE!
-- ============================================
-- Your database is now fully configured.
-- You can now use the application with all tables, policies, and functions in place.
