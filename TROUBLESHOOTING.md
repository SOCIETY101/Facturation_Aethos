# Troubleshooting Guide

## 422 Error on Signup

If you're getting a 422 Unprocessable Content error when trying to sign up, check the following:

### 1. Verify Environment Variables

Make sure your `.env` file exists and has the correct values:

```bash
VITE_SUPABASE_URL=https://sicysobnnwqsqmakzgcu.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_bdkoaEu_yel6CzdI_gcodA_rojpSRn4
```

**Important**: 
- Restart your dev server after creating/updating `.env`
- Check browser console for any environment variable errors

### 2. Check Supabase Project Settings

Go to your Supabase Dashboard → Authentication → Settings:

1. **Email Auth**: Make sure "Enable Email Signup" is ON
2. **Email Confirmation**: 
   - If enabled: Users must verify email before signing in
   - If disabled: Users can sign in immediately after signup
3. **Site URL**: Should be `http://localhost:5173` (or your dev URL)
4. **Redirect URLs**: Should include `http://localhost:5173/**`

### 3. Verify API Key Format

The anon key should be a JWT token (usually starts with `eyJ...`). 

If your key format is different:
- Go to Supabase Dashboard → Settings → API
- Copy the **anon/public** key (not the service_role key)
- Make sure it's the full key

### 4. Check Browser Console

Open browser DevTools (F12) → Console tab and look for:
- Environment variable errors
- Detailed Supabase error messages
- Network request details

### 5. Common 422 Causes

**Invalid Email Format**
- Make sure email is valid (e.g., `user@example.com`)
- No spaces or special characters

**Password Requirements**
- Minimum 6 characters (enforced)
- Some Supabase instances require stronger passwords
- Try a password with 8+ characters, including numbers

**Email Already Exists**
- Try a different email address
- Or check if the user already exists in Supabase Auth

**Rate Limiting**
- Too many signup attempts
- Wait a few minutes and try again

### 6. Test Supabase Connection

Add this to your browser console to test:

```javascript
// In browser console
const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm')
const supabase = createClient(
  'https://sicysobnnwqsqmakzgcu.supabase.co',
  'sb_publishable_bdkoaEu_yel6CzdI_gcodA_rojpSRn4'
)

// Test signup
const { data, error } = await supabase.auth.signUp({
  email: 'test@example.com',
  password: 'testpassword123'
})
console.log('Result:', { data, error })
```

### 7. Check Database Migrations

Make sure you've run all SQL migrations:
1. Go to Supabase Dashboard → SQL Editor
2. Run migrations in order:
   - `001_initial_schema.sql`
   - `002_rls_policies.sql`
   - `003_functions.sql`

### 8. Verify RLS Policies

If RLS is blocking operations:
- Check that policies are created correctly
- Test with a user that has proper permissions

### 9. Network Issues

- Check if Supabase URL is accessible
- Try accessing `https://sicysobnnwqsqmakzgcu.supabase.co` in browser
- Check for CORS errors in console

### 10. Get Detailed Error Info

The updated code now logs detailed errors. Check:
- Browser console for full error details
- Network tab → Signup request → Response tab for error body

## Still Having Issues?

1. Check Supabase Dashboard → Logs for server-side errors
2. Verify your Supabase project is active (not paused)
3. Check your Supabase plan limits (free tier has limits)
4. Try creating a test user directly in Supabase Dashboard → Authentication → Users

## Quick Fixes

**Disable Email Confirmation (for testing):**
1. Supabase Dashboard → Authentication → Settings
2. Turn OFF "Enable email confirmations"
3. Try signup again

**Reset Password Requirements:**
- Try a longer password: `TestPassword123!`
- Include uppercase, lowercase, numbers

**Clear Browser Data:**
- Clear localStorage
- Clear cookies
- Hard refresh (Ctrl+Shift+R / Cmd+Shift+R)
