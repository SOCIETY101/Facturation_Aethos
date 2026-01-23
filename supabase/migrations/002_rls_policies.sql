-- Enable RLS on all tables
alter table companies enable row level security;
alter table profiles enable row level security;
alter table clients enable row level security;
alter table products enable row level security;
alter table tax_rates enable row level security;
alter table quotes enable row level security;
alter table quote_items enable row level security;
alter table invoices enable row level security;
alter table invoice_items enable row level security;
alter table payments enable row level security;

-- Profiles policies
create policy "Users can view own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id);

-- Companies policies
create policy "Users can view own company"
  on companies for select
  using (id in (select company_id from profiles where id = auth.uid()));

create policy "Users can update own company"
  on companies for update
  using (id in (select company_id from profiles where id = auth.uid()));

-- Clients policies
create policy "Users can view own company clients"
  on clients for select
  using (company_id in (select company_id from profiles where id = auth.uid()));

create policy "Users can insert clients"
  on clients for insert
  with check (company_id in (select company_id from profiles where id = auth.uid()));

create policy "Users can update own company clients"
  on clients for update
  using (company_id in (select company_id from profiles where id = auth.uid()));

create policy "Users can delete own company clients"
  on clients for delete
  using (company_id in (select company_id from profiles where id = auth.uid()));

-- Products policies
create policy "Users can view own company products" on products for select
  using (company_id in (select company_id from profiles where id = auth.uid()));
create policy "Users can insert products" on products for insert
  with check (company_id in (select company_id from profiles where id = auth.uid()));
create policy "Users can update own company products" on products for update
  using (company_id in (select company_id from profiles where id = auth.uid()));
create policy "Users can delete own company products" on products for delete
  using (company_id in (select company_id from profiles where id = auth.uid()));

-- Tax rates policies
create policy "Users can view own company tax rates" on tax_rates for select
  using (company_id in (select company_id from profiles where id = auth.uid()));
create policy "Users can manage tax rates" on tax_rates for all
  using (company_id in (select company_id from profiles where id = auth.uid()));

-- Quotes policies
create policy "Users can view own company quotes" on quotes for select
  using (company_id in (select company_id from profiles where id = auth.uid()));
create policy "Users can insert quotes" on quotes for insert
  with check (company_id in (select company_id from profiles where id = auth.uid()));
create policy "Users can update own company quotes" on quotes for update
  using (company_id in (select company_id from profiles where id = auth.uid()));
create policy "Users can delete own company quotes" on quotes for delete
  using (company_id in (select company_id from profiles where id = auth.uid()));

-- Quote items policies
create policy "Users can view quote items" on quote_items for select
  using (quote_id in (select id from quotes where company_id in (select company_id from profiles where id = auth.uid())));
create policy "Users can manage quote items" on quote_items for all
  using (quote_id in (select id from quotes where company_id in (select company_id from profiles where id = auth.uid())));

-- Invoices policies
create policy "Users can view own company invoices" on invoices for select
  using (company_id in (select company_id from profiles where id = auth.uid()));
create policy "Users can insert invoices" on invoices for insert
  with check (company_id in (select company_id from profiles where id = auth.uid()));
create policy "Users can update own company invoices" on invoices for update
  using (company_id in (select company_id from profiles where id = auth.uid()));
create policy "Users can delete own company invoices" on invoices for delete
  using (company_id in (select company_id from profiles where id = auth.uid()));

-- Invoice items policies
create policy "Users can view invoice items" on invoice_items for select
  using (invoice_id in (select id from invoices where company_id in (select company_id from profiles where id = auth.uid())));
create policy "Users can manage invoice items" on invoice_items for all
  using (invoice_id in (select id from invoices where company_id in (select company_id from profiles where id = auth.uid())));

-- Payments policies
create policy "Users can view payments" on payments for select
  using (invoice_id in (select id from invoices where company_id in (select company_id from profiles where id = auth.uid())));
create policy "Users can manage payments" on payments for all
  using (invoice_id in (select id from invoices where company_id in (select company_id from profiles where id = auth.uid())));
