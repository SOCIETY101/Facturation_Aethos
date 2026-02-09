-- Ensure profiles table exists
-- This migration is safe to run multiple times
-- Run this AFTER 001_initial_schema.sql has been executed

-- Check if profiles table exists, if not create it
do $$
begin
  if not exists (
    select 1 from information_schema.tables 
    where table_schema = 'public' 
    and table_name = 'profiles'
  ) then
    -- Ensure companies table exists first
    if not exists (
      select 1 from information_schema.tables 
      where table_schema = 'public' 
      and table_name = 'companies'
    ) then
      raise exception 'Companies table must exist before creating profiles table. Please run 001_initial_schema.sql first.';
    end if;

    -- Create profiles table
    create table public.profiles (
      id uuid primary key references auth.users on delete cascade,
      company_id uuid references public.companies on delete cascade,
      email text unique not null,
      full_name text,
      role text default 'user', -- 'admin', 'user', 'accountant'
      avatar_url text,
      created_at timestamp with time zone default now(),
      updated_at timestamp with time zone default now()
    );
  end if;
end $$;

-- Create updated_at trigger if it doesn't exist
create trigger update_profiles_updated_at 
before update on public.profiles
for each row 
execute function update_updated_at_column();

-- Enable RLS if not already enabled
alter table public.profiles enable row level security;

-- Create policies if they don't exist (using IF NOT EXISTS equivalent)
do $$
begin
  -- Users can view own profile
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'public' 
    and tablename = 'profiles' 
    and policyname = 'Users can view own profile'
  ) then
    create policy "Users can view own profile"
      on public.profiles for select
      using (auth.uid() = id);
  end if;

  -- Users can update own profile
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'public' 
    and tablename = 'profiles' 
    and policyname = 'Users can update own profile'
  ) then
    create policy "Users can update own profile"
      on public.profiles for update
      using (auth.uid() = id);
  end if;
end $$;

-- Grant necessary permissions
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update on public.profiles to anon;
