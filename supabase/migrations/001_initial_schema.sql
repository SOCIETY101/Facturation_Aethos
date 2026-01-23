-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Companies table (multi-tenant ready)
create table companies (
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

-- Users/Profiles table
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  company_id uuid references companies on delete cascade,
  email text unique not null,
  full_name text,
  role text default 'user', -- 'admin', 'user', 'accountant'
  avatar_url text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Clients table
create table clients (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references companies on delete cascade not null,
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
  created_by uuid references profiles on delete set null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Products/Services catalog
create table products (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references companies on delete cascade not null,
  name text not null,
  description text,
  unit_price numeric(10,2) not null,
  tax_rate numeric(5,2) default 20.00,
  is_active boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Tax rates
create table tax_rates (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references companies on delete cascade not null,
  name text not null, -- 'TVA 20%', 'TVA 10%', etc.
  rate numeric(5,2) not null,
  is_default boolean default false,
  created_at timestamp with time zone default now()
);

-- Quotes
create table quotes (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references companies on delete cascade not null,
  client_id uuid references clients on delete restrict not null,
  quote_number text not null,
  status text not null default 'draft', -- 'draft', 'sent', 'accepted', 'rejected', 'expired'
  date date not null default current_date,
  valid_until date not null,
  subtotal numeric(10,2) not null default 0,
  tax_amount numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  notes text,
  terms text,
  created_by uuid references profiles on delete set null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(company_id, quote_number)
);

-- Quote line items
create table quote_items (
  id uuid primary key default uuid_generate_v4(),
  quote_id uuid references quotes on delete cascade not null,
  product_id uuid references products on delete set null,
  description text not null,
  quantity numeric(10,2) not null default 1,
  unit_price numeric(10,2) not null,
  tax_rate numeric(5,2) not null default 20.00,
  total numeric(10,2) not null,
  sort_order integer default 0,
  created_at timestamp with time zone default now()
);

-- Invoices
create table invoices (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references companies on delete cascade not null,
  client_id uuid references clients on delete restrict not null,
  quote_id uuid references quotes on delete set null,
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
  created_by uuid references profiles on delete set null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(company_id, invoice_number)
);

-- Invoice line items
create table invoice_items (
  id uuid primary key default uuid_generate_v4(),
  invoice_id uuid references invoices on delete cascade not null,
  product_id uuid references products on delete set null,
  description text not null,
  quantity numeric(10,2) not null default 1,
  unit_price numeric(10,2) not null,
  tax_rate numeric(5,2) not null default 20.00,
  total numeric(10,2) not null,
  sort_order integer default 0,
  created_at timestamp with time zone default now()
);

-- Payments
create table payments (
  id uuid primary key default uuid_generate_v4(),
  invoice_id uuid references invoices on delete cascade not null,
  amount numeric(10,2) not null,
  payment_date date not null default current_date,
  payment_method text not null, -- 'bank_transfer', 'cash', 'check', 'card', 'other'
  reference text,
  notes text,
  created_by uuid references profiles on delete set null,
  created_at timestamp with time zone default now()
);

-- Indexes for performance
create index idx_clients_company on clients(company_id);
create index idx_quotes_company on quotes(company_id);
create index idx_quotes_client on quotes(client_id);
create index idx_quotes_status on quotes(status);
create index idx_invoices_company on invoices(company_id);
create index idx_invoices_client on invoices(client_id);
create index idx_invoices_status on invoices(status);
create index idx_payments_invoice on payments(invoice_id);

-- Updated at trigger function
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Apply updated_at triggers
create trigger update_companies_updated_at before update on companies
  for each row execute function update_updated_at_column();
create trigger update_profiles_updated_at before update on profiles
  for each row execute function update_updated_at_column();
create trigger update_clients_updated_at before update on clients
  for each row execute function update_updated_at_column();
create trigger update_quotes_updated_at before update on quotes
  for each row execute function update_updated_at_column();
create trigger update_invoices_updated_at before update on invoices
  for each row execute function update_updated_at_column();
