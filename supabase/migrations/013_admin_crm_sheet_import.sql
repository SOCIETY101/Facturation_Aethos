-- Admin-only, idempotent importer for the AETHOS Clients & Proposals sheet.
-- Kept out of PostgREST roles; the app has its own authenticated importer.

create or replace function public.import_aethos_crm_sheet(
  target_company_id uuid,
  target_user_id uuid,
  payload jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  record jsonb;
  account_id uuid;
  deal_id uuid;
  stage_id uuid;
  stage_name text;
  deal_status text;
  source_name constant text := 'aethos-clients-proposals-v1';
begin
  if not exists (select 1 from public.companies where id = target_company_id) then
    raise exception 'Target company does not exist';
  end if;

  for record in select value from jsonb_array_elements(payload)
  loop
    account_id := null;
    select id into account_id
    from public.crm_accounts
    where company_id = target_company_id
      and client_id is not null
      and regexp_replace(replace(lower(name), 'groupe', 'group'), '[^a-z0-9]+', '', 'g')
        = regexp_replace(replace(lower(record->>'name'), 'groupe', 'group'), '[^a-z0-9]+', '', 'g')
    limit 1;

    if account_id is not null then
      update public.crm_accounts
      set import_source = source_name,
          source_row = (record->>'sourceRow')::integer
      where id = account_id;
    end if;

    insert into public.crm_accounts (
      company_id, client_id, name, relationship_type, lifecycle_status, source_stage,
      industry, country, city, website, services_need, original_budget_text,
      outcome_blocker, source_evidence, data_gaps, notes, last_contact_at,
      next_follow_up_at, next_action, meeting_date, proposal_sent, proposal_date,
      proposal_reference, priority, import_source, source_row, created_by
    ) values (
      target_company_id,
      null,
      record->>'name',
      case record->>'relationshipType'
        when 'Active Client' then 'active_client'
        when 'Client Project' then 'client_project'
        when 'Former Client' then 'former_client'
        when 'Reference' then 'reference'
        else 'prospect'
      end,
      case
        when record->>'pipelineStage' = 'Rejected / Lost' then 'lost'
        when record->>'pipelineStage' = 'Completed / Reference'
          and record->>'relationshipType' = 'Former Client' then 'past_customer'
        when record->>'pipelineStage' = 'Completed / Reference' then 'reference'
        when record->>'pipelineStage' in ('On Hold', 'Dispute') then 'on_hold'
        when record->>'pipelineStage' in ('No Response', 'Standby', 'Postponed') then 'nurture'
        when record->>'relationshipType' = 'Active Client' then 'customer'
        else 'active'
      end,
      record->>'pipelineStage',
      nullif(record->>'industry', ''),
      nullif(record->>'country', ''),
      nullif(record->>'city', ''),
      nullif(record->>'website', ''),
      nullif(record->>'servicesNeed', ''),
      nullif(record->>'originalBudget', ''),
      nullif(record->>'outcomeBlocker', ''),
      nullif(record->>'sourceEvidence', ''),
      nullif(record->>'dataGaps', ''),
      nullif(record->>'notes', ''),
      nullif(record->>'lastContact', '')::date,
      nullif(record->>'nextFollowUp', '')::date,
      nullif(record->>'nextAction', ''),
      nullif(record->>'meetingDate', '')::date,
      coalesce((record->>'proposalSent')::boolean, false),
      nullif(record->>'proposalDate', '')::date,
      nullif(record->>'proposalReference', ''),
      lower(record->>'priority'),
      source_name,
      (record->>'sourceRow')::integer,
      target_user_id
    )
    on conflict (company_id, import_source, source_row) do update set
      name = excluded.name,
      relationship_type = excluded.relationship_type,
      lifecycle_status = excluded.lifecycle_status,
      source_stage = excluded.source_stage,
      industry = excluded.industry,
      country = excluded.country,
      city = excluded.city,
      website = excluded.website,
      services_need = excluded.services_need,
      original_budget_text = excluded.original_budget_text,
      outcome_blocker = excluded.outcome_blocker,
      source_evidence = excluded.source_evidence,
      data_gaps = excluded.data_gaps,
      notes = excluded.notes,
      last_contact_at = excluded.last_contact_at,
      next_follow_up_at = excluded.next_follow_up_at,
      next_action = excluded.next_action,
      meeting_date = excluded.meeting_date,
      proposal_sent = excluded.proposal_sent,
      proposal_date = excluded.proposal_date,
      proposal_reference = excluded.proposal_reference,
      priority = excluded.priority
    returning id into account_id;

    if nullif(record->>'contactPerson', '') is not null then
      insert into public.contacts (
        company_id, client_id, account_id, first_name, last_name, email, phone,
        title, is_primary, notes, import_key, created_by
      ) values (
        target_company_id, null, account_id, record->>'contactPerson', null,
        nullif(record->>'email', ''), nullif(record->>'phone', ''),
        nullif(record->>'contactTitle', ''), true, nullif(record->>'dataGaps', ''),
        source_name || ':contact:' || (record->>'sourceRow'), target_user_id
      )
      on conflict (company_id, import_key) do update set
        account_id = excluded.account_id,
        first_name = excluded.first_name,
        email = excluded.email,
        phone = excluded.phone,
        title = excluded.title,
        notes = excluded.notes;
    end if;

    deal_id := null;
    if record->>'relationshipType' = 'Proposal Lead' then
      stage_name := case
        when record->>'pipelineStage' = 'Rejected / Lost' then 'Lost'
        when record->>'pipelineStage' in ('No Response', 'Standby', 'Postponed') then 'Nurture'
        when record->>'pipelineStage' in ('Under Review', 'Follow-up Due') then 'Proposal'
        else 'Discovery'
      end;

      select id into stage_id
      from public.deal_stages
      where company_id = target_company_id and name = stage_name
      limit 1;

      if stage_id is null then
        select id into stage_id
        from public.deal_stages
        where company_id = target_company_id and name = 'Discovery'
        limit 1;
      end if;

      deal_status := case when stage_name = 'Lost' then 'lost' else 'open' end;

      insert into public.deals (
        company_id, client_id, account_id, stage_id, owner_id, name, description,
        amount, expected_close_date, probability, source, status, lost_reason,
        priority, last_contact_at, next_follow_up_at, next_action, proposal_sent_at,
        proposal_reference, original_budget_text, outcome_blocker, source_evidence,
        data_gaps, import_key, created_by
      ) values (
        target_company_id, null, account_id, stage_id, target_user_id,
        coalesce(nullif(record->>'proposalReference', ''), (record->>'name') || ' opportunity'),
        nullif(record->>'servicesNeed', ''),
        coalesce(nullif(record->>'potentialBudgetMad', ''), '0')::numeric,
        null,
        (select probability from public.deal_stages where id = stage_id),
        'Google Sheets · Clients & Proposals',
        deal_status,
        case when deal_status = 'lost' then nullif(record->>'outcomeBlocker', '') else null end,
        lower(record->>'priority'),
        nullif(record->>'lastContact', '')::date,
        nullif(record->>'nextFollowUp', '')::date,
        nullif(record->>'nextAction', ''),
        nullif(record->>'proposalDate', '')::date,
        nullif(record->>'proposalReference', ''),
        nullif(record->>'originalBudget', ''),
        nullif(record->>'outcomeBlocker', ''),
        nullif(record->>'sourceEvidence', ''),
        nullif(record->>'dataGaps', ''),
        source_name || ':deal:' || (record->>'sourceRow'),
        target_user_id
      )
      on conflict (company_id, import_key) do update set
        account_id = excluded.account_id,
        stage_id = excluded.stage_id,
        name = excluded.name,
        description = excluded.description,
        amount = excluded.amount,
        probability = excluded.probability,
        status = excluded.status,
        lost_reason = excluded.lost_reason,
        priority = excluded.priority,
        last_contact_at = excluded.last_contact_at,
        next_follow_up_at = excluded.next_follow_up_at,
        next_action = excluded.next_action,
        proposal_sent_at = excluded.proposal_sent_at,
        proposal_reference = excluded.proposal_reference,
        original_budget_text = excluded.original_budget_text,
        outcome_blocker = excluded.outcome_blocker,
        source_evidence = excluded.source_evidence,
        data_gaps = excluded.data_gaps
      returning id into deal_id;
    end if;

    if nullif(record->>'nextAction', '') is not null
      and nullif(record->>'nextFollowUp', '') is not null
      and record->>'pipelineStage' not in ('Completed / Reference', 'Rejected / Lost')
    then
      insert into public.crm_tasks (
        company_id, client_id, account_id, deal_id, contact_id, assignee_id,
        title, description, due_date, priority, status, completed_at, import_key, created_by
      ) values (
        target_company_id, null, account_id, deal_id, null, target_user_id,
        record->>'nextAction',
        coalesce(nullif(record->>'outcomeBlocker', ''), nullif(record->>'servicesNeed', '')),
        (record->>'nextFollowUp')::date,
        lower(record->>'priority'),
        'open',
        null,
        source_name || ':task:' || (record->>'sourceRow'),
        target_user_id
      )
      on conflict (company_id, import_key) do update set
        account_id = excluded.account_id,
        deal_id = excluded.deal_id,
        title = excluded.title,
        description = excluded.description,
        due_date = excluded.due_date,
        priority = excluded.priority;
    end if;
  end loop;

  insert into public.crm_import_runs (
    company_id, source, source_url, imported_records, imported_by
  ) values (
    target_company_id,
    source_name,
    'https://docs.google.com/spreadsheets/d/1MbtzO5q9tXyRCkB9K2B2XhyMzEnGsEM7F512me7FQyM/edit?gid=731902468#gid=731902468',
    jsonb_array_length(payload),
    target_user_id
  )
  on conflict (company_id, source) do update set
    imported_records = excluded.imported_records,
    source_url = excluded.source_url,
    imported_by = excluded.imported_by,
    imported_at = now();

  return jsonb_build_object(
    'accounts', (select count(*) from public.crm_accounts where company_id = target_company_id and import_source = source_name),
    'deals', (select count(*) from public.deals where company_id = target_company_id and import_key like source_name || ':deal:%'),
    'tasks', (select count(*) from public.crm_tasks where company_id = target_company_id and import_key like source_name || ':task:%')
  );
end;
$$;

revoke all on function public.import_aethos_crm_sheet(uuid, uuid, jsonb) from public;
revoke execute on function public.import_aethos_crm_sheet(uuid, uuid, jsonb) from anon, authenticated;
