# Facturation Project Reference (Current State)

## What This Project Is
Facturation is a web application for managing invoices and quotes with Supabase as the source of truth. It includes dashboards, clients, quotes, invoices, payments, and company settings, plus PDF previews/exports that follow the Aethos brand design.

This codebase is Vite + React + TypeScript with Supabase (auth + Postgres + storage). LocalStorage is only used for one-time migration of legacy data; after that, all data lives in Supabase.

## Primary Capabilities
- Authentication via Supabase (email/password).
- Company profile and settings (bank details, numbering prefixes, tax rates, currency).
- Client management (CRUD, contact details).
- Quotes with line items, status management, and PDF preview/export.
- Invoices with line items, status management, **partial payments**, and PDF preview/export.
- Payment tracking with history, paid/remaining totals, and overpayment prevention.
- Dashboard metrics (revenue, outstanding, pending quotes) based on Supabase data.

## Partial Payments (Current Behavior)
- Invoice status supports: `draft`, `sent`, `unpaid`, `overdue`, `partial`, `paid`.
- When a payment is recorded:
  - `paid_amount` and `balance` are updated.
  - Status becomes `partial` if paid amount is > 0 and < total.
  - Status becomes `paid` if paid amount >= total.
- Overpayment is blocked in both UI and API.

## Tech Stack
- Vite + React 18 + TypeScript
- Tailwind CSS + shadcn/ui + Radix UI
- Supabase (auth, Postgres, storage)
- jsPDF (PDF generation)
- Recharts (charts)

## How Data Works (Supabase)
Supabase is configured in `src/lib/supabase.ts` and expects:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Core tables (app schema):
- `companies`, `profiles`
- `clients`, `products`, `tax_rates`
- `quotes`, `quote_items`
- `invoices`, `invoice_items`, `payments`

API modules under `src/lib/api/` wrap table access:
- `clients.ts`, `company.ts`, `quotes.ts`, `invoices.ts`

### LocalStorage → Supabase Migration
- `src/lib/sync.ts` runs once per browser session on login.
- Reads `facturation-storage`, inserts into Supabase, and sets `facturation-supabase-migrated`.
- Mapping utilities live in `src/lib/mappers.ts`.

### Row Level Security (RLS)
RLS must allow authenticated users to CRUD rows for their `company_id`. Without policies, inserts will fail with RLS errors.

## Current UI/UX Notes
- Invoice list shows **Amount**, **Paid**, **Remaining** in separate columns.
- Invoice preview (template) includes payment history and paid/remaining totals.
- Edit invoice dialog includes an inline payments section for partial payments.

## PDF Generation
- Invoice and quote PDFs are generated with jsPDF.
- Invoice PDFs show **Paid** and **Remaining**.
- Templates follow Aethos branding (colors #b00d0b, #2b2b2b) and use:
  - `src/assets/Logo.png`
  - `src/assets/Segnature.png`
  - `src/assets/Devis RealMeetVerse 2 (2).pdf` (design reference)

## Application Structure
- `src/App.tsx`: router and app initialization; triggers localStorage → Supabase sync.
- `src/pages/`: Dashboard, Clients, Quotes, Invoices, Settings, Templates, Auth.
- `src/components/`: UI components, layouts, invoice/quote templates.
- `src/contexts/`: Auth context + route protection.
- `src/lib/`: Supabase client, API wrappers, PDF generation, mappers, sync.
- `src/store/`: legacy Zustand store (no longer the primary data source).

## Setup and Operational Docs
- `QUICK_SETUP.md`
- `SUPABASE_SETUP.md`
- `INTEGRATION_GUIDE.md`
- `VERIFY_SETUP.md`
- `TROUBLESHOOTING.md`

SQL scripts:
- `complete_database_setup.sql`
- `supabase_schema_fix.sql` (adds missing app columns)
- `cleanup_unused_tables.sql` (removes legacy tables)
- `fix_*` and `quick_fix_profiles.sql`

## Dev Commands
- `npm run dev`
- `npm run build`
- `npm run preview`
- `npm run lint`

## Quick Orientation (What to Read First)
- `src/lib/supabase.ts`: environment requirements and DB types.
- `src/lib/api/`: data access layer.
- `src/lib/mappers.ts`: app↔DB mapping.
- `src/lib/sync.ts`: localStorage migration.
- `src/components/templates/InvoiceTemplate.tsx` and `QuoteTemplate.tsx`: document layout.

## Architecture Diagram
```mermaid
flowchart LR
  subgraph UI[Frontend (Vite + React)]
    App[App Router]
    Pages[Pages]
    Components[Components]
    Templates[PDF Templates]
  end

  subgraph Data[Supabase]
    Auth[Auth]
    DB[(Postgres DB)]
    Storage[Storage (Company Logos)]
  end

  App --> Pages
  Pages --> Components
  Pages --> Templates

  Pages -->|API wrappers| DB
  Pages -->|AuthContext| Auth
  Pages -->|Uploads| Storage

  subgraph Tables[Core Tables]
    Companies[companies]
    Profiles[profiles]
    Clients[clients]
    Products[products]
    TaxRates[tax_rates]
    Quotes[quotes]
    QuoteItems[quote_items]
    Invoices[invoices]
    InvoiceItems[invoice_items]
    Payments[payments]
  end

  DB --- Tables
```
