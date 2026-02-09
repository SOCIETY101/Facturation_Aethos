-- Quick Fix: Create payments table if missing
-- Run this if you're getting "relation public.payments does not exist" error

-- Ensure invoices table exists first (payments depends on it)
create table if not exists public.invoices (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references public.companies on delete cascade not null,
  client_id uuid references public.clients on delete restrict not null,
  quote_id uuid references public.quotes on delete set null,
  invoice_number text not null,
  status text not null default 'draft',
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

-- Create payments table
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

-- Create index
create index if not exists idx_payments_invoice on public.payments(invoice_id);

-- Enable RLS
alter table public.payments enable row level security;

-- Drop existing policies
drop policy if exists "Users can view payments" on public.payments;
drop policy if exists "Users can manage payments" on public.payments;

-- Create RLS policies
create policy "Users can view payments" 
  on public.payments for select
  using (invoice_id in (select id from public.invoices where company_id in (select company_id from public.profiles where id = auth.uid())));

create policy "Users can manage payments" 
  on public.payments for all
  using (invoice_id in (select id from public.invoices where company_id in (select company_id from public.profiles where id = auth.uid())));

-- Grant permissions
grant select, insert, update, delete on public.payments to authenticated;
grant select, insert, update, delete on public.payments to anon;

-- Create payment-related functions if they don't exist
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

-- Drop existing triggers
drop trigger if exists on_payment_added on public.payments;
drop trigger if exists on_payment_inserted on public.payments;
drop trigger if exists on_payment_deleted on public.payments;

-- Create triggers
create trigger on_payment_added
  after insert on public.payments
  for each row execute function public.update_invoice_status();

create trigger on_payment_inserted
  after insert on public.payments
  for each row execute function public.update_invoice_payment();

create trigger on_payment_deleted
  after delete on public.payments
  for each row execute function public.update_invoice_payment();

-- Verification
select 'payments table created successfully' as status;
