-- Function to create company and link to profile on signup
-- This function runs with elevated privileges to bypass RLS
create or replace function public.create_company_for_user(
  user_id uuid,
  company_name text,
  user_email text
)
returns uuid as $$
declare
  new_company_id uuid;
  profile_exists boolean;
begin
  -- Wait for profile to be created (max 2 seconds)
  -- The trigger should create it, but we wait to be safe
  for i in 1..20 loop
    select exists(select 1 from public.profiles where id = user_id) into profile_exists;
    exit when profile_exists;
    perform pg_sleep(0.1); -- Wait 100ms
  end loop;
  
  -- If profile still doesn't exist, create it
  if not profile_exists then
    insert into public.profiles (id, email)
    values (user_id, user_email)
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
  
  return new_company_id;
end;
$$ language plpgsql security definer;

-- Grant execute permission to authenticated users
grant execute on function public.create_company_for_user(uuid, text, text) to authenticated;
