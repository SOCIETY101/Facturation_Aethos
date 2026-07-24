-- CRM v1: contacts, sales pipeline, relationship activity, and follow-up work.
-- Clients remain the billing account. These tables add the people and commercial
-- workflow around each account without changing existing invoices or quotes.

create table public.contacts (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references public.companies on delete cascade not null,
  client_id uuid references public.clients on delete cascade not null,
  first_name text not null,
  last_name text,
  email text,
  phone text,
  title text,
  is_primary boolean not null default false,
  notes text,
  created_by uuid references public.profiles on delete set null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table public.deal_stages (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references public.companies on delete cascade not null,
  name text not null,
  color text not null default '#A0302A',
  position integer not null,
  probability integer not null default 0 check (probability between 0 and 100),
  is_closed boolean not null default false,
  is_won boolean not null default false,
  created_at timestamp with time zone not null default now(),
  unique (company_id, position),
  unique (company_id, name)
);

create table public.deals (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references public.companies on delete cascade not null,
  client_id uuid references public.clients on delete restrict not null,
  stage_id uuid references public.deal_stages on delete restrict not null,
  owner_id uuid references public.profiles on delete set null,
  name text not null,
  description text,
  amount numeric(12,2) not null default 0,
  expected_close_date date,
  probability integer not null default 0 check (probability between 0 and 100),
  source text,
  status text not null default 'open' check (status in ('open', 'won', 'lost')),
  lost_reason text,
  created_by uuid references public.profiles on delete set null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

alter table public.quotes add column if not exists deal_id uuid references public.deals on delete set null;

create table public.crm_activities (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references public.companies on delete cascade not null,
  client_id uuid references public.clients on delete cascade not null,
  deal_id uuid references public.deals on delete cascade,
  contact_id uuid references public.contacts on delete set null,
  type text not null check (type in ('note', 'call', 'meeting', 'email', 'system')),
  subject text not null,
  body text,
  occurred_at timestamp with time zone not null default now(),
  created_by uuid references public.profiles on delete set null,
  created_at timestamp with time zone not null default now()
);

create table public.crm_tasks (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references public.companies on delete cascade not null,
  client_id uuid references public.clients on delete cascade,
  deal_id uuid references public.deals on delete cascade,
  contact_id uuid references public.contacts on delete set null,
  assignee_id uuid references public.profiles on delete set null,
  title text not null,
  description text,
  due_date date,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  status text not null default 'open' check (status in ('open', 'completed', 'cancelled')),
  completed_at timestamp with time zone,
  created_by uuid references public.profiles on delete set null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create index idx_contacts_client on public.contacts(client_id);
create index idx_contacts_company on public.contacts(company_id);
create index idx_deal_stages_company on public.deal_stages(company_id, position);
create index idx_deals_company_stage on public.deals(company_id, stage_id);
create index idx_deals_client on public.deals(client_id);
create index idx_deals_owner on public.deals(owner_id);
create index idx_activities_company_occurred on public.crm_activities(company_id, occurred_at desc);
create index idx_activities_deal on public.crm_activities(deal_id, occurred_at desc);
create index idx_tasks_company_status_due on public.crm_tasks(company_id, status, due_date);
create index idx_tasks_assignee on public.crm_tasks(assignee_id, status, due_date);
create index idx_quotes_deal on public.quotes(deal_id);

create or replace function public.seed_default_deal_stages(target_company_id uuid)
returns void as $$
begin
  insert into public.deal_stages (company_id, name, color, position, probability, is_closed, is_won)
  values
    (target_company_id, 'Discovery', '#64748B', 10, 15, false, false),
    (target_company_id, 'Qualified', '#2563EB', 20, 35, false, false),
    (target_company_id, 'Proposal', '#7C3AED', 30, 60, false, false),
    (target_company_id, 'Negotiation', '#D97706', 40, 80, false, false),
    (target_company_id, 'Won', '#15803D', 50, 100, true, true),
    (target_company_id, 'Lost', '#B91C1C', 60, 0, true, false)
  on conflict (company_id, position) do nothing;
end;
$$ language plpgsql;

create or replace function public.seed_crm_stages_for_new_company()
returns trigger as $$
begin
  perform public.seed_default_deal_stages(new.id);
  return new;
end;
$$ language plpgsql;

drop trigger if exists seed_crm_stages_after_company_create on public.companies;
create trigger seed_crm_stages_after_company_create
  after insert on public.companies
  for each row execute function public.seed_crm_stages_for_new_company();

-- Make CRM usable immediately for workspaces created before this migration.
do $$
declare
  existing_company record;
begin
  for existing_company in select id from public.companies loop
    perform public.seed_default_deal_stages(existing_company.id);
  end loop;
end $$;

create trigger update_contacts_updated_at before update on public.contacts
  for each row execute function public.update_updated_at_column();
create trigger update_deals_updated_at before update on public.deals
  for each row execute function public.update_updated_at_column();
create trigger update_crm_tasks_updated_at before update on public.crm_tasks
  for each row execute function public.update_updated_at_column();

alter table public.contacts enable row level security;
alter table public.deal_stages enable row level security;
alter table public.deals enable row level security;
alter table public.crm_activities enable row level security;
alter table public.crm_tasks enable row level security;

create policy "Company members manage contacts" on public.contacts for all
  using (company_id in (select company_id from public.profiles where id = auth.uid()))
  with check (company_id in (select company_id from public.profiles where id = auth.uid()));
create policy "Company members manage deal stages" on public.deal_stages for all
  using (company_id in (select company_id from public.profiles where id = auth.uid()))
  with check (company_id in (select company_id from public.profiles where id = auth.uid()));
create policy "Company members manage deals" on public.deals for all
  using (company_id in (select company_id from public.profiles where id = auth.uid()))
  with check (company_id in (select company_id from public.profiles where id = auth.uid()));
create policy "Company members manage CRM activities" on public.crm_activities for all
  using (company_id in (select company_id from public.profiles where id = auth.uid()))
  with check (company_id in (select company_id from public.profiles where id = auth.uid()));
create policy "Company members manage CRM tasks" on public.crm_tasks for all
  using (company_id in (select company_id from public.profiles where id = auth.uid()))
  with check (company_id in (select company_id from public.profiles where id = auth.uid()));
