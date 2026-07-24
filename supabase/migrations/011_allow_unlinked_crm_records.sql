-- In a real CRM, an opportunity can be captured before a company is known.
-- Keep account links optional for early-stage prospecting and later qualification.

alter table public.deals alter column client_id drop not null;
alter table public.crm_activities alter column client_id drop not null;
