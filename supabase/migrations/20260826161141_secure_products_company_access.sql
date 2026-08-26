-- Products are billing data and must follow the same company boundary as clients.

create index if not exists products_company_id_idx
  on public.products (company_id)
  where company_id is not null;

alter table public.products enable row level security;

create policy "Company members read products"
  on public.products
  for select
  to authenticated
  using (
    company_id in (
      select profiles.company_id
      from public.profiles
      where profiles.id = (select auth.uid())
    )
  );

create policy "Company members create products"
  on public.products
  for insert
  to authenticated
  with check (
    company_id in (
      select profiles.company_id
      from public.profiles
      where profiles.id = (select auth.uid())
    )
  );

create policy "Company members update products"
  on public.products
  for update
  to authenticated
  using (
    company_id in (
      select profiles.company_id
      from public.profiles
      where profiles.id = (select auth.uid())
    )
  )
  with check (
    company_id in (
      select profiles.company_id
      from public.profiles
      where profiles.id = (select auth.uid())
    )
  );

create policy "Company members delete products"
  on public.products
  for delete
  to authenticated
  using (
    company_id in (
      select profiles.company_id
      from public.profiles
      where profiles.id = (select auth.uid())
    )
  );

revoke all on table public.products from anon;
grant select, insert, update, delete on table public.products to authenticated;
