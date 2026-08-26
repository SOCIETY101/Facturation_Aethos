-- CRM v2: a true sales workspace separated from billing clients.
-- Accounts hold companies and relationship context. Deals hold revenue opportunities.
-- Existing billing links remain intact and are backfilled into CRM accounts.

create table public.crm_accounts (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references public.companies on delete cascade not null,
  client_id uuid references public.clients on delete set null,
  name text not null,
  relationship_type text not null default 'prospect'
    check (relationship_type in ('prospect', 'active_client', 'client_project', 'former_client', 'reference')),
  lifecycle_status text not null default 'active'
    check (lifecycle_status in ('active', 'customer', 'on_hold', 'nurture', 'past_customer', 'reference', 'lost')),
  source_stage text,
  industry text,
  country text,
  city text,
  website text,
  services_need text,
  original_budget_text text,
  outcome_blocker text,
  source_evidence text,
  data_gaps text,
  notes text,
  last_contact_at date,
  next_follow_up_at date,
  next_action text,
  meeting_date date,
  proposal_sent boolean not null default false,
  proposal_date date,
  proposal_reference text,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  import_source text,
  source_row integer,
  created_by uuid references public.profiles on delete set null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

alter table public.crm_accounts
  add constraint crm_accounts_company_source_row_key unique (company_id, import_source, source_row);
create unique index crm_accounts_company_client_key
  on public.crm_accounts(company_id, client_id)
  where client_id is not null;
create index crm_accounts_company_relationship_idx
  on public.crm_accounts(company_id, relationship_type, lifecycle_status);
create index crm_accounts_follow_up_idx
  on public.crm_accounts(company_id, next_follow_up_at)
  where next_follow_up_at is not null;

alter table public.contacts alter column client_id drop not null;
alter table public.contacts add column account_id uuid references public.crm_accounts on delete cascade;
alter table public.contacts add column import_key text;
create index contacts_account_idx on public.contacts(account_id);
create unique index contacts_company_import_key on public.contacts(company_id, import_key);

alter table public.deals add column account_id uuid references public.crm_accounts on delete set null;
alter table public.deals add column priority text not null default 'medium'
  check (priority in ('low', 'medium', 'high'));
alter table public.deals add column last_contact_at date;
alter table public.deals add column next_follow_up_at date;
alter table public.deals add column next_action text;
alter table public.deals add column proposal_sent_at date;
alter table public.deals add column proposal_reference text;
alter table public.deals add column original_budget_text text;
alter table public.deals add column outcome_blocker text;
alter table public.deals add column source_evidence text;
alter table public.deals add column data_gaps text;
alter table public.deals add column import_key text;
create index deals_account_idx on public.deals(account_id);
create index deals_company_follow_up_idx on public.deals(company_id, status, next_follow_up_at);
create unique index deals_company_import_key on public.deals(company_id, import_key);

alter table public.crm_activities add column account_id uuid references public.crm_accounts on delete cascade;
create index crm_activities_account_idx on public.crm_activities(account_id, occurred_at desc);

alter table public.crm_tasks add column account_id uuid references public.crm_accounts on delete cascade;
alter table public.crm_tasks add column import_key text;
create index crm_tasks_account_idx on public.crm_tasks(account_id, status, due_date);
create unique index crm_tasks_company_import_key on public.crm_tasks(company_id, import_key);

create table public.crm_import_runs (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references public.companies on delete cascade not null,
  source text not null,
  source_url text,
  imported_records integer not null default 0,
  imported_by uuid references public.profiles on delete set null,
  imported_at timestamp with time zone not null default now(),
  unique (company_id, source)
);

-- Preserve the billing model while making every existing client available in CRM.
insert into public.crm_accounts (
  company_id, client_id, name, relationship_type, lifecycle_status,
  country, city, notes, created_by
)
select
  c.company_id, c.id, c.name, 'active_client', 'customer',
  c.country, c.city, c.notes, c.created_by
from public.clients c
on conflict do nothing;

update public.deals d
set account_id = a.id
from public.crm_accounts a
where d.account_id is null
  and d.client_id is not null
  and a.client_id = d.client_id
  and a.company_id = d.company_id;

update public.contacts c
set account_id = a.id
from public.crm_accounts a
where c.account_id is null
  and c.client_id is not null
  and a.client_id = c.client_id
  and a.company_id = c.company_id;

update public.crm_activities a
set account_id = ca.id
from public.crm_accounts ca
where a.account_id is null
  and a.client_id is not null
  and ca.client_id = a.client_id
  and ca.company_id = a.company_id;

update public.crm_tasks t
set account_id = a.id
from public.crm_accounts a
where t.account_id is null
  and t.client_id is not null
  and a.client_id = t.client_id
  and a.company_id = t.company_id;

-- Nurture is intentionally separate from an active sales stage.
insert into public.deal_stages (company_id, name, color, position, probability, is_closed, is_won)
select id, 'Nurture', '#8A7F71', 15, 15, false, false
from public.companies
on conflict (company_id, position) do nothing;

create or replace function public.seed_default_deal_stages(target_company_id uuid)
returns void as $$
begin
  insert into public.deal_stages (company_id, name, color, position, probability, is_closed, is_won)
  values
    (target_company_id, 'Discovery', '#64748B', 10, 15, false, false),
    (target_company_id, 'Nurture', '#8A7F71', 15, 15, false, false),
    (target_company_id, 'Qualified', '#2563EB', 20, 35, false, false),
    (target_company_id, 'Proposal', '#7C3AED', 30, 60, false, false),
    (target_company_id, 'Negotiation', '#D97706', 40, 80, false, false),
    (target_company_id, 'Won', '#15803D', 50, 100, true, true),
    (target_company_id, 'Lost', '#B91C1C', 60, 0, true, false)
  on conflict (company_id, position) do nothing;
end;
$$ language plpgsql;

do $$
declare
  existing_company record;
begin
  for existing_company in select id from public.companies loop
    perform public.seed_default_deal_stages(existing_company.id);
  end loop;
end $$;

create trigger update_crm_accounts_updated_at before update on public.crm_accounts
  for each row execute function public.update_updated_at_column();

alter table public.crm_accounts enable row level security;
alter table public.crm_import_runs enable row level security;

create policy "Company members manage CRM accounts" on public.crm_accounts for all
  using (company_id in (select company_id from public.profiles where id = auth.uid()))
  with check (company_id in (select company_id from public.profiles where id = auth.uid()));

create policy "Company members manage CRM imports" on public.crm_import_runs for all
  using (company_id in (select company_id from public.profiles where id = auth.uid()))
  with check (company_id in (select company_id from public.profiles where id = auth.uid()));
