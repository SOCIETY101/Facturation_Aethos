# Facturation Project Reference

## What This Project Is
Facturation is a web application for managing invoices and quotes. It includes dashboards, clients, products/services, quotes, invoices, payments, and company settings, with PDF previews for quotes and invoices.

The current codebase is a Vite + React + TypeScript frontend backed by Supabase (auth + database + storage). It is not purely localStorage-based; the app uses Supabase APIs and database tables for persistence.

## Primary Capabilities
- Authentication via Supabase (email/password flows).
- Company profile and settings (bank details, numbering prefixes, tax rates, currency).
- Client management (CRUD, contact details).
- Quotes with line items, status management, and PDF preview/export.
- Invoices with line items, status management, payments tracking, and PDF preview/export.
- Products/services catalog used for line items.
- Dashboard metrics and recent activity views.

## Tech Stack
- Vite + React 18 + TypeScript
- Tailwind CSS + shadcn/ui + Radix UI primitives
- Zustand (state management, where used)
- Supabase (auth, Postgres, storage)
- jsPDF (PDF generation)
- Recharts (charts)

## How Data Works (Supabase)
Supabase is configured in `src/lib/supabase.ts` and expects these environment variables:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Database tables are typed in `src/lib/supabase.ts`. Core tables include:
- `companies`, `profiles`
- `clients`, `products`, `tax_rates`
- `quotes`, `quote_items`
- `invoices`, `invoice_items`, `payments`

API modules under `src/lib/api/` wrap table access:
- `clients.ts`, `products.ts`, `company.ts`, `quotes.ts`, `invoices.ts`

Auth flows are centralized in `src/contexts/AuthContext.tsx`, with route protection in `src/components/auth/ProtectedRoute`.

## Application Structure
- `src/App.tsx`: router and high-level app structure.
- `src/pages/`: page-level views (Dashboard, Clients, Quotes, Invoices, Settings, Signup, etc.).
- `src/components/`: UI components, layouts, templates, dialogs.
- `src/contexts/`: auth context and providers.
- `src/lib/`: utilities, Supabase client, PDF helpers, API wrappers.
- `src/store/`: shared state (Zustand).

## PDF Generation
PDF previews are rendered from templates in `src/components/templates/` and helper functions in `src/lib/`.

## Setup and Operational Docs
The repository includes setup/checklist docs that explain Supabase setup and verification:
- `QUICK_SETUP.md`
- `SUPABASE_SETUP.md`
- `INTEGRATION_GUIDE.md`
- `VERIFY_SETUP.md`
- `TROUBLESHOOTING.md`

There are SQL scripts in the repo root to set up or fix tables:
- `complete_database_setup.sql`
- `fix_*` and `quick_fix_profiles.sql`

## Dev Commands
From `package.json`:
- `npm run dev`: start dev server
- `npm run build`: typecheck + build
- `npm run preview`: preview prod build
- `npm run lint`: eslint

## Notes and Assumptions
- The README mentions localStorage persistence; the current codebase uses Supabase and expects environment variables. Treat Supabase as the source of truth unless you intentionally switch to local-only mode.
- The app includes test utilities for Supabase auth in `src/lib/test-auth.ts` and debug helpers in `src/lib/supabase-debug.ts`.

## Quick Orientation (What to Read First)
- `README.md`: high-level features and structure.
- `src/lib/supabase.ts`: environment requirements and database types.
- `src/contexts/AuthContext.tsx`: auth flows.
- `src/lib/api/`: data access layer.
- `src/pages/`: UI flow and feature scope.


## Architecture Diagram
```mermaid
flowchart LR
  subgraph UI[Frontend (Vite + React)]
    App[App Router]
    Pages[Pages]
    Components[Components]
    Templates[PDF Templates]
    Store[State (Zustand)]
  end

  subgraph Data[Supabase]
    Auth[Auth]
    DB[(Postgres DB)]
    Storage[Storage (Company Logos)]
  end

  App --> Pages
  Pages --> Components
  Pages --> Store
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
