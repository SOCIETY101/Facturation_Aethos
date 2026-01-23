# Facturation - Invoice & Quote Management

A modern invoice and quote management application built with Vite, React, TypeScript, and shadcn/ui components.

## Features

- 📊 **Dashboard** - Overview with key metrics, revenue trends, and recent activity
- 👥 **Clients** - Manage clients with full CRUD operations
- 📝 **Quotes** - Create, edit, and manage quotes with PDF generation
- 🧾 **Invoices** - Invoice management with payment tracking
- ⚙️ **Settings** - Configure company info, invoice settings, and tax rates
- 💾 **Local Storage** - All data persists to browser localStorage
- 📱 **Responsive** - Mobile-friendly design

## Tech Stack

- **Vite** - Build tool and dev server
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI components
- **React Router** - Navigation
- **Zustand** - State management with localStorage persistence
- **jsPDF** - PDF generation
- **Recharts** - Charts and graphs
- **Lucide React** - Icons

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser and navigate to `http://localhost:5173`

### Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
src/
├── components/       # Reusable UI components
│   ├── ui/          # shadcn/ui components
│   └── layout/      # Layout components (Sidebar, Header)
├── pages/           # Page components
│   ├── Dashboard.tsx
│   ├── Clients.tsx
│   ├── Quotes.tsx
│   ├── Invoices.tsx
│   └── Settings.tsx
├── lib/             # Utilities and types
│   ├── types.ts     # TypeScript type definitions
│   ├── mockData.ts  # Mock data for MVP
│   ├── utils.ts     # Utility functions
│   └── pdf.ts       # PDF generation utilities
├── store/           # Zustand store
│   └── useStore.ts  # Global state management
└── hooks/           # Custom React hooks
    └── use-toast.ts # Toast notification hook
```

## Key Features

### Dashboard
- Total revenue, outstanding invoices, pending quotes, and monthly payments
- Revenue trend chart (last 6 months)
- Recent invoices and quotes tables

### Clients
- Add, edit, and delete clients
- Search functionality
- View client statistics (total invoices, outstanding amount)

### Quotes
- Create quotes with line items
- Auto-calculate subtotal, tax, and total
- Status management (Draft, Sent, Accepted, Rejected)
- Convert accepted quotes to invoices
- PDF generation and download

### Invoices
- Create invoices with line items
- Payment tracking with multiple payment methods
- Status management (Draft, Sent, Paid, Unpaid, Overdue)
- Convert quotes to invoices
- PDF generation and download

### Settings
- Company information (name, address, bank details)
- Invoice settings (prefix, starting number, terms)
- Tax rate management (add, edit, delete, set default)

## Data Persistence

All data is stored in browser localStorage using Zustand's persist middleware. The storage key is `facturation-storage`.

## PDF Generation

Invoices and quotes can be exported as PDFs using jsPDF. The PDFs include:
- Company and client information
- Line items table
- Totals breakdown
- Payment information (for invoices)
- Terms and conditions

## Mock Data

The application comes with pre-populated mock data:
- 12 clients
- 25 quotes
- 35 invoices
- 15 products/services
- Default tax rates

## Future Enhancements

- Backend integration
- User authentication
- Multi-currency support
- Email sending
- Advanced reporting
- Recurring invoices
- Inventory management

## License

MIT
