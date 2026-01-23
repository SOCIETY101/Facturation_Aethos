# Verify Supabase Setup

## Quick Verification Steps

### 1. Check if Tables Exist

Open your browser console (F12) and run:

```javascript
window.testAuth()
```

This will check:
- ✅ Connection to Supabase
- ✅ Current session status  
- ✅ If all required tables exist

### 2. Manual Check in Supabase Dashboard

1. Go to: https://supabase.com/dashboard/project/sicysobnnwqsqmakzgcu
2. Click **Table Editor** (left sidebar)
3. You should see these tables:
   - ✅ companies
   - ✅ profiles
   - ✅ clients
   - ✅ products
   - ✅ tax_rates
   - ✅ quotes
   - ✅ quote_items
   - ✅ invoices
   - ✅ invoice_items
   - ✅ payments

**If tables are missing**: Run the SQL migrations (see QUICK_SETUP.md)

### 3. Check Auth Settings

1. Go to **Authentication** → **Settings**
2. Verify:
   - ✅ **Enable Email Signup**: ON
   - ⚠️ **Enable Email Confirmations**: 
     - OFF for testing (login immediately)
     - ON for production (verify email first)
   - ✅ **Site URL**: `http://localhost:5173`
   - ✅ **Redirect URLs**: Includes `http://localhost:5173/**`

### 4. Test Signup Flow

1. Go to `/signup` page
2. Fill in the form
3. Check browser console for errors
4. If successful:
   - If email confirmation OFF → Should redirect to login
   - If email confirmation ON → Check email for verification link

### 5. Test Login Flow

1. Go to `/login` page
2. Enter credentials
3. If 400 error:
   - Check if email is verified (if confirmation is ON)
   - Verify password is correct
   - Check console for detailed error

### 6. Common Issues & Fixes

#### Issue: 404 errors on profiles/companies tables
**Fix**: Run SQL migrations in Supabase SQL Editor

#### Issue: 400 Bad Request on login
**Possible causes**:
- Email not verified (if confirmation is ON)
- Wrong password
- User doesn't exist

**Fix**: 
- Disable email confirmation for testing
- Or verify email first
- Or create user manually in Supabase Dashboard

#### Issue: Profile not found after signup
**Fix**: 
- Check if migration `003_functions.sql` ran (creates profile trigger)
- Or manually create profile in Supabase Dashboard

#### Issue: Company creation fails
**Fix**: 
- Make sure `companies` table exists
- Check RLS policies allow insert
- Verify user has proper permissions

## Next Steps After Verification

Once everything is verified:

1. ✅ Tables exist
2. ✅ Auth works (signup/login)
3. ✅ Profile created on signup
4. ✅ Company created on signup

You can then:
- Test creating clients
- Test creating quotes
- Test creating invoices
- Test the full application flow
