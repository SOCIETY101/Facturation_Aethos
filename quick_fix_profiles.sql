-- Quick Fix: Add missing company_id column to profiles table
-- Run this in Supabase SQL Editor if you're getting "column company_id does not exist" error

-- Step 1: Add the company_id column if it doesn't exist
alter table public.profiles 
add column if not exists company_id uuid;

-- Step 2: Add foreign key constraint (only if companies table exists)
do $$
begin
  if exists (
    select 1 from information_schema.tables 
    where table_schema = 'public' 
    and table_name = 'companies'
  ) then
    -- Drop existing constraint if it exists
    alter table public.profiles 
    drop constraint if exists profiles_company_id_fkey;
    
    -- Add the foreign key constraint
    alter table public.profiles 
    add constraint profiles_company_id_fkey 
    foreign key (company_id) references public.companies(id) on delete cascade;
  end if;
end $$;

-- Step 3: Ensure other required columns exist
alter table public.profiles 
add column if not exists email text,
add column if not exists full_name text,
add column if not exists role text default 'user',
add column if not exists avatar_url text,
add column if not exists created_at timestamp with time zone default now(),
add column if not exists updated_at timestamp with time zone default now();

-- Step 4: Set NOT NULL and UNIQUE constraints on email if needed
do $$
begin
  -- Make email NOT NULL if it's not already
  if exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' 
    and table_name = 'profiles' 
    and column_name = 'email'
    and is_nullable = 'YES'
  ) then
    -- First, set a default for any NULL values
    update public.profiles set email = 'unknown@example.com' where email is null;
    alter table public.profiles alter column email set not null;
  end if;
  
  -- Add unique constraint if it doesn't exist
  if not exists (
    select 1 from information_schema.table_constraints 
    where constraint_schema = 'public' 
    and table_name = 'profiles' 
    and constraint_name = 'profiles_email_key'
  ) then
    alter table public.profiles add constraint profiles_email_key unique (email);
  end if;
end $$;

-- Verification: Check that company_id column now exists
select 
  column_name, 
  data_type, 
  is_nullable
from information_schema.columns 
where table_schema = 'public' 
and table_name = 'profiles'
order by ordinal_position;
