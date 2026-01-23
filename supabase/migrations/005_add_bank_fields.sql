-- Add missing bank fields to companies table
alter table companies 
  add column if not exists bank_iban text,
  add column if not exists bank_bic text;
