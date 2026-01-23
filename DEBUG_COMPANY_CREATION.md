# Debugging Company Creation During Signup

## Issues Found

Based on the schema analysis, here are the problems preventing company creation:

### 1. **Missing INSERT Policy for Companies Table**
- The RLS policies only allow SELECT and UPDATE on `companies`
- No INSERT policy exists, which blocks company creation
- Even though `SECURITY DEFINER` should bypass RLS, having an explicit policy helps

### 2. **Function Permissions**
- The function `create_company_for_user` is granted to `authenticated` only
- During signup (especially if email confirmation is required), the user might be `anon`
- Need to grant execute permission to `anon` as well

### 3. **Profile Creation Timing**
- The profile is created by a trigger after user signup
- There might be a race condition where the function runs before the profile exists
- The function waits for the profile, but might need more robust handling

## Solution Applied

### Migration `007_fix_company_creation.sql`:

1. **Added INSERT policy** for companies table
2. **Improved function** with better error handling
3. **Granted permissions** to both `authenticated` and `anon` users
4. **Added profile creation fallback** if trigger hasn't run yet

## Steps to Fix

1. **Run the new migration** in Supabase SQL Editor:
   ```sql
   -- Copy and paste the contents of:
   -- supabase/migrations/007_fix_company_creation.sql
   ```

2. **Verify the function exists**:
   ```sql
   SELECT proname, proargnames, prosecdef 
   FROM pg_proc 
   WHERE proname = 'create_company_for_user';
   ```

3. **Check RLS policies**:
   ```sql
   SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
   FROM pg_policies 
   WHERE tablename = 'companies';
   ```

4. **Test the function manually**:
   ```sql
   -- Replace with actual user ID from auth.users
   SELECT create_company_for_user(
     'your-user-id-here'::uuid,
     'Test Company',
     'test@example.com'
   );
   ```

## Common Errors and Solutions

### Error: "permission denied for table companies"
- **Cause**: RLS blocking INSERT
- **Fix**: Run migration 007 to add INSERT policy

### Error: "function create_company_for_user does not exist"
- **Cause**: Migration 006 or 007 not run
- **Fix**: Run migrations 006 and 007 in Supabase SQL Editor

### Error: "permission denied for function create_company_for_user"
- **Cause**: Function not granted to anon/authenticated
- **Fix**: Migration 007 grants to both roles

### Error: "relation profiles does not exist"
- **Cause**: Migration 001 not run
- **Fix**: Run all migrations in order (001, 002, 003, 006, 007)

## Testing

After applying the fix:

1. Try signing up a new user
2. Check browser console for detailed error messages
3. Check Supabase logs for database errors
4. Verify company was created:
   ```sql
   SELECT c.*, p.id as profile_id
   FROM companies c
   JOIN profiles p ON p.company_id = c.id
   WHERE p.id = 'your-user-id';
   ```

## If Still Not Working

Check these in order:

1. **All migrations run?** (001, 002, 003, 005, 006, 007)
2. **Function exists?** (see SQL above)
3. **RLS policies correct?** (see SQL above)
4. **Email confirmation required?** (might need to login first)
5. **Check Supabase logs** for detailed error messages
