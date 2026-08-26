-- Keep an immutable, company-scoped record of every opportunity stage move.
-- The trigger runs with the caller's privileges so RLS remains authoritative.

create table public.crm_deal_stage_history (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies on delete cascade,
  deal_id uuid not null references public.deals on delete cascade,
  from_stage_id uuid references public.deal_stages on delete set null,
  to_stage_id uuid not null references public.deal_stages on delete restrict,
  changed_by uuid references public.profiles on delete set null,
  change_source text not null default 'pipeline',
  changed_at timestamp with time zone not null default now(),
  constraint crm_deal_stage_history_stage_changed
    check (from_stage_id is distinct from to_stage_id)
);

create index crm_deal_stage_history_company_changed_idx
  on public.crm_deal_stage_history (company_id, changed_at desc);

create index crm_deal_stage_history_deal_changed_idx
  on public.crm_deal_stage_history (deal_id, changed_at desc);

create index crm_deal_stage_history_from_stage_idx
  on public.crm_deal_stage_history (from_stage_id)
  where from_stage_id is not null;

create index crm_deal_stage_history_to_stage_idx
  on public.crm_deal_stage_history (to_stage_id);

create index crm_deal_stage_history_changed_by_idx
  on public.crm_deal_stage_history (changed_by)
  where changed_by is not null;

create index if not exists deals_company_stage_status_idx
  on public.deals (company_id, stage_id, status);

alter table public.crm_deal_stage_history enable row level security;

create policy "Company members read deal stage history"
  on public.crm_deal_stage_history
  for select
  to authenticated
  using (
    company_id in (
      select profiles.company_id
      from public.profiles
      where profiles.id = (select auth.uid())
    )
  );

create policy "Company members append deal stage history"
  on public.crm_deal_stage_history
  for insert
  to authenticated
  with check (
    company_id in (
      select profiles.company_id
      from public.profiles
      where profiles.id = (select auth.uid())
    )
  );

grant select, insert on table public.crm_deal_stage_history to authenticated;
revoke all on table public.crm_deal_stage_history from anon;

create or replace function public.log_crm_deal_stage_change()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.stage_id is distinct from new.stage_id then
    insert into public.crm_deal_stage_history (
      company_id,
      deal_id,
      from_stage_id,
      to_stage_id,
      changed_by,
      change_source
    ) values (
      new.company_id,
      new.id,
      old.stage_id,
      new.stage_id,
      (select auth.uid()),
      'pipeline'
    );
  end if;

  return new;
end;
$$;

revoke all on function public.log_crm_deal_stage_change() from public;
grant execute on function public.log_crm_deal_stage_change() to authenticated;

drop trigger if exists log_crm_deal_stage_change on public.deals;
create trigger log_crm_deal_stage_change
  after update of stage_id on public.deals
  for each row
  when (old.stage_id is distinct from new.stage_id)
  execute function public.log_crm_deal_stage_change();
