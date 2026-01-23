# Supabase Integration Guide

This document outlines what has been implemented and what needs to be done to complete the Supabase integration.

## ✅ Completed

### 1. Authentication System
- ✅ Supabase client configuration (`src/lib/supabase.ts`)
- ✅ Auth context and provider (`src/contexts/AuthContext.tsx`)
- ✅ Login page (`src/pages/Login.tsx`)
- ✅ Signup page (`src/pages/Signup.tsx`)
- ✅ Forgot password page (`src/pages/ForgotPassword.tsx`)
- ✅ Reset password page (`src/pages/ResetPassword.tsx`)
- ✅ Protected route wrapper (`src/components/auth/ProtectedRoute.tsx`)
- ✅ Updated App.tsx with auth routes
- ✅ Updated Header with user info and logout

### 2. API Services
- ✅ Clients API (`src/lib/api/clients.ts`)
- ✅ Quotes API (`src/lib/api/quotes.ts`)
- ✅ Invoices API (`src/lib/api/invoices.ts`)
- ✅ Company API (`src/lib/api/company.ts`)
- ✅ Products API (`src/lib/api/products.ts`)

### 3. Database Schema
- ✅ SQL migrations created:
  - `001_initial_schema.sql` - All tables and indexes
  - `002_rls_policies.sql` - Row Level Security policies
  - `003_functions.sql` - Database functions and triggers
  - `004_seed_data.sql` - Example seed data structure

### 4. Utilities
- ✅ Company hook (`src/hooks/useCompany.ts`)
- ✅ TypeScript types for database (`src/lib/supabase.ts`)

## 🔄 In Progress / To Do

### 1. Update Pages to Use Supabase

The following pages still use mock data from Zustand store and need to be migrated:

#### Dashboard (`src/pages/Dashboard.tsx`)
- Replace `useStore` with API calls
- Use `useCompany()` hook to get company data
- Fetch invoices and quotes from Supabase
- Calculate metrics from database

#### Clients (`src/pages/Clients.tsx`)
- Replace `useStore` with `getClients`, `createClient`, `updateClient`, `deleteClient`
- Use `useCompany()` to get company ID
- Handle loading and error states

#### Quotes (`src/pages/Quotes.tsx`)
- Replace mock data with `getQuotes`, `createQuote`, `updateQuote`, `deleteQuote`
- Use `getNextQuoteNumber` for auto-numbering
- Update QuoteForm to use Supabase

#### Invoices (`src/pages/Invoices.tsx`)
- Replace mock data with `getInvoices`, `createInvoice`, `updateInvoice`, `deleteInvoice`
- Use `addPayment` for payment tracking
- Use `getNextInvoiceNumber` for auto-numbering
- Update InvoiceForm to use Supabase

#### Settings (`src/pages/Settings.tsx`)
- Replace mock settings with `getCompany`, `updateCompany`
- Use `getTaxRates`, `createTaxRate`, `updateTaxRate`, `deleteTaxRate`
- Implement logo upload using `uploadLogo`

### 2. Update Zustand Store

The store (`src/store/useStore.ts`) currently uses localStorage. Options:

**Option A: Remove Zustand, use React Query/SWR**
- Install `@tanstack/react-query` or `swr`
- Use API services directly in components
- Better for server state management

**Option B: Keep Zustand, sync with Supabase**
- Keep Zustand for local UI state
- Sync with Supabase on mount and after mutations
- Use Supabase real-time subscriptions for updates

**Recommended: Option A** - Use React Query for better data fetching and caching.

### 3. File Upload for Logos

- ✅ API function created (`uploadLogo` in `src/lib/api/company.ts`)
- ⏳ Need to:
  - Create file input component in Settings page
  - Handle file selection and upload
  - Show upload progress
  - Display uploaded logo
  - Handle errors

### 4. Real-time Updates (Optional)

- Set up Supabase real-time subscriptions
- Auto-refresh data when changes occur
- Show notifications for updates

### 5. Error Handling

- Add error boundaries
- Improve error messages
- Handle network errors gracefully
- Show retry options

## Migration Steps

### Step 1: Set Up Supabase
1. Follow `SUPABASE_SETUP.md`
2. Run all migrations
3. Configure environment variables
4. Test authentication

### Step 2: Migrate Pages One by One

Start with the simplest page (Clients), then move to more complex ones:

1. **Clients Page**
   ```typescript
   // Replace
   const { clients } = useStore()
   
   // With
   const { company } = useCompany()
   const [clients, setClients] = useState([])
   const [loading, setLoading] = useState(true)
   
   useEffect(() => {
     if (company) {
       getClients(company.id).then(setClients).finally(() => setLoading(false))
     }
   }, [company])
   ```

2. **Quotes Page** - Similar pattern, but also handle line items
3. **Invoices Page** - Similar to quotes, plus payments
4. **Dashboard** - Aggregate data from multiple sources
5. **Settings** - Company and tax rate management

### Step 3: Update PDF Generation

Update `src/lib/pdf.ts` to use company data from Supabase instead of settings store.

### Step 4: Testing

Test each feature:
- ✅ User can sign up and log in
- ⏳ User can only see their company's data (RLS)
- ⏳ CRUD operations work for all entities
- ⏳ Quote to invoice conversion
- ⏳ Payment tracking updates invoice status
- ⏳ Dashboard shows accurate metrics
- ⏳ PDF generation works
- ⏳ Settings update company info
- ⏳ Logo upload works

## Example: Migrating Clients Page

Here's how to migrate the Clients page:

```typescript
import { useState, useEffect } from 'react'
import { useCompany } from '@/hooks/useCompany'
import { getClients, createClient, updateClient, deleteClient } from '@/lib/api/clients'
import { useToast } from '@/hooks/use-toast'

export default function Clients() {
  const { company, loading: companyLoading } = useCompany()
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    if (company) {
      loadClients()
    }
  }, [company])

  const loadClients = async () => {
    if (!company) return
    try {
      setLoading(true)
      const data = await getClients(company.id)
      setClients(data)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load clients',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (clientData) => {
    if (!company) return
    try {
      const newClient = await createClient({
        ...clientData,
        company_id: company.id,
      })
      setClients([...clients, newClient])
      toast({ title: 'Client created' })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create client',
        variant: 'destructive',
      })
    }
  }

  // Similar for update and delete...

  if (companyLoading || loading) {
    return <div>Loading...</div>
  }

  // Rest of component...
}
```

## Next Steps

1. Complete Supabase setup (follow SUPABASE_SETUP.md)
2. Test authentication flow
3. Migrate pages one by one, starting with Clients
4. Test thoroughly after each migration
5. Add error handling and loading states
6. Implement logo upload
7. Add real-time updates (optional)

## Notes

- All API functions are ready to use
- Types are defined in `src/lib/supabase.ts`
- RLS policies ensure users only see their company's data
- Database triggers handle invoice status updates automatically
- The migration can be done incrementally - you can keep mock data for pages not yet migrated
