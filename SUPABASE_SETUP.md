# Supabase Setup Guide

This guide will help you set up Supabase for the Facturation application.

## 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Fill in project details:
   - Name: `facturation` (or your preferred name)
   - Database Password: Choose a strong password
   - Region: Choose closest to your users
4. Wait for project to be created (2-3 minutes)

## 2. Get API Keys

1. Go to Project Settings → API
2. Copy the following:
   - **Project URL** (under Project URL)
   - **anon/public key** (under Project API keys → anon public)

## 3. Configure Environment Variables

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Add your Supabase credentials to `.env.local`:
   ```
   VITE_SUPABASE_URL=your_project_url_here
   VITE_SUPABASE_ANON_KEY=your_anon_key_here
   ```

## 4. Run Database Migrations

1. Go to Supabase Dashboard → SQL Editor
2. Run each migration file in order:
   - `001_initial_schema.sql` - Creates all tables
   - `002_rls_policies.sql` - Sets up Row Level Security
   - `003_functions.sql` - Creates database functions and triggers
   - `004_seed_data.sql` - (Optional) Example seed data structure

## 5. Set Up Storage Bucket

1. Go to Storage in Supabase Dashboard
2. Create a new bucket:
   - Name: `company-logos`
   - Public: ✅ Yes (so logos can be accessed)
   - File size limit: 5MB
   - Allowed MIME types: `image/*`

3. Set up bucket policies:
   ```sql
   -- Allow authenticated users to upload
   CREATE POLICY "Users can upload logos"
   ON storage.objects FOR INSERT
   TO authenticated
   WITH CHECK (bucket_id = 'company-logos');

   -- Allow authenticated users to update their own logos
   CREATE POLICY "Users can update logos"
   ON storage.objects FOR UPDATE
   TO authenticated
   USING (bucket_id = 'company-logos');

   -- Allow public read access
   CREATE POLICY "Public can view logos"
   ON storage.objects FOR SELECT
   TO public
   USING (bucket_id = 'company-logos');
   ```

## 6. Configure Authentication

1. Go to Authentication → Settings
2. Enable Email provider (should be enabled by default)
3. Configure email templates (optional):
   - Customize confirmation email
   - Customize password reset email
4. Set Site URL: `http://localhost:5173` (for development)
5. Add Redirect URLs:
   - `http://localhost:5173/**`
   - `https://your-production-domain.com/**`

## 7. Test the Setup

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Navigate to `http://localhost:5173/signup`
3. Create a test account
4. After signup, you should be redirected to login
5. Log in with your credentials

## 8. Create Company Profile (After First Login)

After the first user signs up, you'll need to create a company profile. This can be done:

1. **Via the application**: The signup flow should create a company
2. **Via SQL** (if needed):
   ```sql
   -- Get your user ID from auth.users table
   -- Then create a company and link it to your profile
   INSERT INTO companies (name, email)
   VALUES ('Your Company Name', 'your@email.com')
   RETURNING id;

   -- Update your profile with company_id
   UPDATE profiles
   SET company_id = 'company-id-from-above'
   WHERE id = 'your-user-id';
   ```

## 9. Verify RLS Policies

Test that Row Level Security is working:

1. Create a test user account
2. Try to access data from another company
3. You should only see your own company's data

## Troubleshooting

### "Missing Supabase environment variables"
- Make sure `.env.local` exists and has correct values
- Restart the dev server after adding environment variables

### "Row Level Security policy violation"
- Check that RLS policies are correctly set up
- Verify your user has a `company_id` in the profiles table

### "Storage bucket not found"
- Make sure the bucket `company-logos` exists
- Check bucket policies allow your operations

### "Function does not exist"
- Run migration `003_functions.sql` again
- Check that functions are created in the public schema

## Next Steps

After setup is complete:
1. Test all CRUD operations
2. Verify PDF generation works with Supabase data
3. Test file uploads for company logos
4. Set up production environment variables in Vercel/deployment platform
