-- ============================================
-- FINAL RESET MIGRATION
-- This migration drops all existing tables and recreates them fresh
-- WARNING: This will delete ALL data in your database!
-- ============================================

-- ============================================
-- STEP 1: DROP ALL TRIGGERS
-- ============================================
drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists on_payment_added on public.payments;
drop trigger if exists on_payment_inserted on public.payments;
drop trigger if exists on_payment_deleted on public.payments;
drop trigger if exists update_companies_updated_at on public.companies;
drop trigger if exists update_profiles_updated_at on public.profiles;
drop trigger if exists update_clients_updated_at on public.clients;
drop trigger if exists update_quotes_updated_at on public.quotes;
drop trigger if exists update_invoices_updated_at on public.invoices;

-- ============================================
-- STEP 2: DROP ALL POLICIES
-- ============================================
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can insert profiles" on public.profiles;
drop policy if exists "Users can view own company" on public.companies;
drop policy if exists "Users can update own company" on public.companies;
drop policy if exists "Users can insert companies via function" on public.companies;
drop policy if exists "Users can view own company clients" on public.clients;
drop policy if exists "Users can insert clients" on public.clients;
drop policy if exists "Users can update own company clients" on public.clients;
drop policy if exists "Users can delete own company clients" on public.clients;
drop policy if exists "Users can view own company products" on public.products;
drop policy if exists "Users can insert products" on public.products;
drop policy if exists "Users can update own company products" on public.products;
drop policy if exists "Users can delete own company products" on public.products;
drop policy if exists "Users can view own company tax rates" on public.tax_rates;
drop policy if exists "Users can manage tax rates" on public.tax_rates;
drop policy if exists "Users can view own company quotes" on public.quotes;
drop policy if exists "Users can insert quotes" on public.quotes;
drop policy if exists "Users can update own company quotes" on public.quotes;
drop policy if exists "Users can delete own company quotes" on public.quotes;
drop policy if exists "Users can view quote items" on public.quote_items;
drop policy if exists "Users can manage quote items" on public.quote_items;
drop policy if exists "Users can view own company invoices" on public.invoices;
drop policy if exists "Users can insert invoices" on public.invoices;
drop policy if exists "Users can update own company invoices" on public.invoices;
drop policy if exists "Users can delete own company invoices" on public.invoices;
drop policy if exists "Users can view invoice items" on public.invoice_items;
drop policy if exists "Users can manage invoice items" on public.invoice_items;
drop policy if exists "Users can view payments" on public.payments;
drop policy if exists "Users can manage payments" on public.payments;

-- ============================================
-- STEP 3: DROP ALL TABLES (in reverse dependency order)
-- ============================================
-- Use CASCADE to handle dependencies automatically
drop table if exists public.payments cascade;
drop table if exists public.invoice_items cascade;
drop table if exists public.invoices cascade;
drop table if exists public.quote_items cascade;
drop table if exists public.quotes cascade;
drop table if exists public.tax_rates cascade;
drop table if exists public.products cascade;
drop table if exists public.clients cascade;
drop table if exists public.profiles cascade;
drop table if exists public.companies cascade;

-- Ensure all tables are dropped (handle any remaining dependencies)
do $$
begin
  -- Drop any remaining tables that might have dependencies
  execute 'drop table if exists public.payments cascade';
  execute 'drop table if exists public.invoice_items cascade';
  execute 'drop table if exists public.invoices cascade';
  execute 'drop table if exists public.quote_items cascade';
  execute 'drop table if exists public.quotes cascade';
  execute 'drop table if exists public.tax_rates cascade';
  execute 'drop table if exists public.products cascade';
  execute 'drop table if exists public.clients cascade';
  execute 'drop table if exists public.profiles cascade';
  execute 'drop table if exists public.companies cascade';
exception
  when others then
    -- Continue even if some tables don't exist
    null;
end $$;

-- ============================================
-- STEP 4: DROP ALL FUNCTIONS
-- ============================================
drop function if exists public.update_updated_at_column() cascade;
drop function if exists public.handle_new_user() cascade;
drop function if exists public.update_invoice_status() cascade;
drop function if exists public.update_invoice_payment() cascade;
drop function if exists public.create_company_for_user(uuid, text, text) cascade;

-- ============================================
-- STEP 5: CREATE EXTENSIONS
-- ============================================
create extension if not exists "uuid-ossp";

-- ============================================
-- STEP 6: CREATE ALL TABLES
-- ============================================

-- Companies table (multi-tenant ready)
create table public.companies (
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
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  company_id uuid references public.companies on delete cascade,
  email text unique not null,
  full_name text,
  role text default 'user', -- 'admin', 'user', 'accountant'
  avatar_url text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Clients table
create table public.clients (
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
create table public.products (
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
create table public.tax_rates (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references public.companies on delete cascade not null,
  name text not null, -- 'TVA 20%', 'TVA 10%', etc.
  rate numeric(5,2) not null,
  is_default boolean default false,
  created_at timestamp with time zone default now()
);

-- Quotes
create table public.quotes (
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
create table public.quote_items (
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
create table public.invoices (
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
create table public.invoice_items (
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
create table public.payments (
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
-- STEP 7: CREATE INDEXES
-- ============================================
create index idx_clients_company on public.clients(company_id);
create index idx_quotes_company on public.quotes(company_id);
create index idx_quotes_client on public.quotes(client_id);
create index idx_quotes_status on public.quotes(status);
create index idx_invoices_company on public.invoices(company_id);
create index idx_invoices_client on public.invoices(client_id);
create index idx_invoices_status on public.invoices(status);
create index idx_payments_invoice on public.payments(invoice_id);

-- ============================================
-- STEP 8: CREATE FUNCTIONS
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
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do update set email = new.email;
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

-- ============================================
-- STEP 9: CREATE TRIGGERS
-- ============================================

-- Updated_at triggers
create trigger update_companies_updated_at 
before update on public.companies
for each row execute function public.update_updated_at_column();

create trigger update_profiles_updated_at 
before update on public.profiles
for each row execute function public.update_updated_at_column();

create trigger update_clients_updated_at 
before update on public.clients
for each row execute function public.update_updated_at_column();

create trigger update_quotes_updated_at 
before update on public.quotes
for each row execute function public.update_updated_at_column();

create trigger update_invoices_updated_at 
before update on public.invoices
for each row execute function public.update_updated_at_column();

-- Auth trigger for profile creation
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
-- STEP 10: ENABLE ROW LEVEL SECURITY
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
-- STEP 11: CREATE RLS POLICIES
-- ============================================

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
create policy "Users can view own company products" 
  on public.products for select
  using (company_id in (select company_id from public.profiles where id = auth.uid()));

create policy "Users can insert products" 
  on public.products for insert
  with check (company_id in (select company_id from public.profiles where id = auth.uid()));

create policy "Users can update own company products" 
  on public.products for update
  using (company_id in (select company_id from public.profiles where id = auth.uid()));

create policy "Users can delete own company products" 
  on public.products for delete
  using (company_id in (select company_id from public.profiles where id = auth.uid()));

-- Tax rates policies
create policy "Users can view own company tax rates" 
  on public.tax_rates for select
  using (company_id in (select company_id from public.profiles where id = auth.uid()));

create policy "Users can manage tax rates" 
  on public.tax_rates for all
  using (company_id in (select company_id from public.profiles where id = auth.uid()));

-- Quotes policies
create policy "Users can view own company quotes" 
  on public.quotes for select
  using (company_id in (select company_id from public.profiles where id = auth.uid()));

create policy "Users can insert quotes" 
  on public.quotes for insert
  with check (company_id in (select company_id from public.profiles where id = auth.uid()));

create policy "Users can update own company quotes" 
  on public.quotes for update
  using (company_id in (select company_id from public.profiles where id = auth.uid()));

create policy "Users can delete own company quotes" 
  on public.quotes for delete
  using (company_id in (select company_id from public.profiles where id = auth.uid()));

-- Quote items policies
create policy "Users can view quote items" 
  on public.quote_items for select
  using (quote_id in (select id from public.quotes where company_id in (select company_id from public.profiles where id = auth.uid())));

create policy "Users can manage quote items" 
  on public.quote_items for all
  using (quote_id in (select id from public.quotes where company_id in (select company_id from public.profiles where id = auth.uid())));

-- Invoices policies
create policy "Users can view own company invoices" 
  on public.invoices for select
  using (company_id in (select company_id from public.profiles where id = auth.uid()));

create policy "Users can insert invoices" 
  on public.invoices for insert
  with check (company_id in (select company_id from public.profiles where id = auth.uid()));

create policy "Users can update own company invoices" 
  on public.invoices for update
  using (company_id in (select company_id from public.profiles where id = auth.uid()));

create policy "Users can delete own company invoices" 
  on public.invoices for delete
  using (company_id in (select company_id from public.profiles where id = auth.uid()));

-- Invoice items policies
create policy "Users can view invoice items" 
  on public.invoice_items for select
  using (invoice_id in (select id from public.invoices where company_id in (select company_id from public.profiles where id = auth.uid())));

create policy "Users can manage invoice items" 
  on public.invoice_items for all
  using (invoice_id in (select id from public.invoices where company_id in (select company_id from public.profiles where id = auth.uid())));

-- Payments policies
create policy "Users can view payments" 
  on public.payments for select
  using (invoice_id in (select id from public.invoices where company_id in (select company_id from public.profiles where id = auth.uid())));

create policy "Users can manage payments" 
  on public.payments for all
  using (invoice_id in (select id from public.invoices where company_id in (select company_id from public.profiles where id = auth.uid())));

-- ============================================
-- STEP 12: GRANT PERMISSIONS
-- ============================================
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update on public.profiles to anon;
grant select, insert, update on public.companies to authenticated;
grant select, insert, update on public.companies to anon;
grant execute on function public.create_company_for_user(uuid, text, text) to authenticated, anon;

-- ============================================
-- MIGRATION COMPLETE!
-- ============================================
-- All tables have been dropped and recreated fresh.
-- All functions, triggers, and RLS policies are in place.
