-- Fix company creation during signup
-- This migration addresses several issues:

-- 1. Add INSERT policy for companies (needed for the function to work properly)
-- Even though SECURITY DEFINER should bypass RLS, having an explicit policy helps
create policy "Users can insert companies via function"
  on companies for insert
  to authenticated
  with check (true);

-- 2. Improve the company creation function
create or replace function public.create_company_for_user(
  user_id uuid,
  company_name text,
  user_email text
)
returns uuid as $$
declare
  new_company_id uuid;
  profile_exists boolean;
  max_wait_seconds integer := 3;
  wait_count integer := 0;
begin
  -- Wait for profile to be created by trigger (max 3 seconds)
  -- The trigger should create it immediately, but we wait to be safe
  loop
    select exists(select 1 from public.profiles where id = user_id) into profile_exists;
    exit when profile_exists or wait_count >= max_wait_seconds * 10;
    perform pg_sleep(0.1); -- Wait 100ms
    wait_count := wait_count + 1;
  end loop;
  
  -- If profile still doesn't exist, create it
  if not profile_exists then
    insert into public.profiles (id, email, full_name)
    values (user_id, user_email, '')
    on conflict (id) do nothing;
  end if;
  
  -- Create company
  insert into public.companies (name, email)
  values (company_name, user_email)
  returning id into new_company_id;
  
  -- Link profile to company
  update public.profiles
  set company_id = new_company_id
  where id = user_id;
  
  -- Return the company ID
  return new_company_id;
exception
  when others then
    -- Log the error (you can check Supabase logs)
    raise exception 'Failed to create company: %', SQLERRM;
end;
$$ language plpgsql security definer;

-- Grant execute permission to authenticated users AND anon (for signup)
grant execute on function public.create_company_for_user(uuid, text, text) to authenticated, anon;

-- Also allow the function to insert into profiles if needed
grant insert on public.profiles to authenticated, anon;
