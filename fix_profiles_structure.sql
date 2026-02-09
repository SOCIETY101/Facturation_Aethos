-- Fix profiles table structure
-- Run this BEFORE running complete_database_setup.sql if you're getting "column company_id does not exist" error

-- Check if profiles table exists and has the correct structure
do $$
begin
  -- If profiles table exists but is missing company_id column
  if exists (
    select 1 from information_schema.tables 
    where table_schema = 'public' 
    and table_name = 'profiles'
  ) and not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' 
    and table_name = 'profiles' 
    and column_name = 'company_id'
  ) then
    -- Drop the table and recreate it (WARNING: This will delete all profile data!)
    -- Uncomment the next line only if you're okay with losing profile data
    -- drop table if exists public.profiles cascade;
    
    -- OR: Try to add the column (safer but may fail if there are constraints)
    alter table public.profiles add column company_id uuid;
    
    -- Add foreign key constraint if companies table exists
    if exists (
      select 1 from information_schema.tables 
      where table_schema = 'public' 
      and table_name = 'companies'
    ) then
      alter table public.profiles 
      add constraint profiles_company_id_fkey 
      foreign key (company_id) references public.companies(id) on delete cascade;
    end if;
  end if;
end $$;

-- Alternative: If the above doesn't work, manually run these commands:
-- 1. Drop the profiles table (WARNING: Deletes all data!)
--    DROP TABLE IF EXISTS public.profiles CASCADE;
-- 2. Then run complete_database_setup.sql
