# Quick Setup Guide - Run Database Migrations

## Step 1: Run SQL Migrations in Supabase

The 404 errors mean the database tables don't exist. You need to run the migrations:

1. **Go to Supabase Dashboard**: https://supabase.com/dashboard
2. **Select your project**: `sicysobnnwqsqmakzgcu`
3. **Go to SQL Editor** (left sidebar)
4. **Click "New Query"**

### Run Migration 1: Initial Schema

Copy and paste the entire contents of `supabase/migrations/001_initial_schema.sql` into the SQL Editor, then click **RUN**.

This creates all the tables:
- companies
- profiles  
- clients
- products
- tax_rates
- quotes
- quote_items
- invoices
- invoice_items
- payments

### Run Migration 2: RLS Policies

Copy and paste `supabase/migrations/002_rls_policies.sql` and click **RUN**.

This sets up Row Level Security so users can only see their own data.

### Run Migration 3: Functions & Triggers

Copy and paste `supabase/migrations/003_functions.sql` and click **RUN**.

This creates:
- Function to auto-create profiles on signup
- Function to update invoice status when payments are added

## Step 2: Verify Tables Exist

After running migrations, verify tables exist:

1. Go to **Table Editor** (left sidebar)
2. You should see all tables listed:
   - companies ✅
   - profiles ✅
   - clients ✅
   - products ✅
   - tax_rates ✅
   - quotes ✅
   - quote_items ✅
   - invoices ✅
   - invoice_items ✅
   - payments ✅

## Step 3: Configure Auth Settings

1. Go to **Authentication** → **Settings**
2. **Enable Email Signup**: Should be ON ✅
3. **Enable Email Confirmations**: 
   - For testing: Turn OFF (users can login immediately)
   - For production: Turn ON (users must verify email)
4. **Site URL**: `http://localhost:5173`
5. **Redirect URLs**: Add `http://localhost:5173/**`

## Step 4: Test Auth

After migrations are complete:

1. Try signing up again
2. If email confirmation is OFF, you should be able to login immediately
3. Check browser console - 404 errors should be gone

## Troubleshooting

### Still getting 404 errors?
- Make sure you ran ALL 3 migrations
- Check Table Editor to verify tables exist
- Refresh your browser

### Auth 400 error?
- Check if email confirmation is required
- Try disabling email confirmation for testing
- Verify credentials are correct

### Profile not found?
- The trigger should auto-create profiles on signup
- Check if migration 003_functions.sql ran successfully
- You can manually create a profile if needed
