import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { Client, Quote, Invoice, AppSettings, Payment } from '@/lib/types'
import { mockClients, mockQuotes, mockInvoices, defaultSettings } from '@/lib/mockData'

interface StoreState {
  clients: Client[]
  quotes: Quote[]
  invoices: Invoice[]
  settings: AppSettings
  
  // Client actions
  addClient: (client: Client) => void
  updateClient: (id: string, client: Partial<Client>) => void
  deleteClient: (id: string) => void
  
  // Quote actions
  addQuote: (quote: Quote) => void
  updateQuote: (id: string, quote: Partial<Quote>) => void
  deleteQuote: (id: string) => void
  
  // Invoice actions
  addInvoice: (invoice: Invoice) => void
  updateInvoice: (id: string, invoice: Partial<Invoice>) => void
  deleteInvoice: (id: string) => void
  addPayment: (invoiceId: string, payment: Payment) => void
  
  // Settings actions
  updateSettings: (settings: Partial<AppSettings>) => void
}

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      clients: mockClients,
      quotes: mockQuotes,
      invoices: mockInvoices,
      settings: defaultSettings,
      
      addClient: (client) =>
        set((state) => ({
          clients: [...state.clients, client],
        })),
      
      updateClient: (id, client) =>
        set((state) => ({
          clients: state.clients.map((c) =>
            c.id === id ? { ...c, ...client } : c
          ),
        })),
      
      deleteClient: (id) =>
        set((state) => ({
          clients: state.clients.filter((c) => c.id !== id),
        })),
      
      addQuote: (quote) =>
        set((state) => ({
          quotes: [...state.quotes, quote],
        })),
      
      updateQuote: (id, quote) =>
        set((state) => ({
          quotes: state.quotes.map((q) =>
            q.id === id ? { ...q, ...quote } : q
          ),
        })),
      
      deleteQuote: (id) =>
        set((state) => ({
          quotes: state.quotes.filter((q) => q.id !== id),
        })),
      
      addInvoice: (invoice) =>
        set((state) => ({
          invoices: [...state.invoices, invoice],
        })),
      
      updateInvoice: (id, invoice) =>
        set((state) => ({
          invoices: state.invoices.map((inv) =>
            inv.id === id ? { ...inv, ...invoice } : inv
          ),
        })),
      
      deleteInvoice: (id) =>
        set((state) => ({
          invoices: state.invoices.filter((inv) => inv.id !== id),
        })),
      
      addPayment: (invoiceId, payment) =>
        set((state) => ({
          invoices: state.invoices.map((inv) => {
            if (inv.id === invoiceId) {
              const totalPaid = inv.payments.reduce((sum, p) => sum + p.amount, 0) + payment.amount
              const newStatus = totalPaid >= inv.total ? 'paid' : inv.status === 'draft' ? 'unpaid' : inv.status
              return {
                ...inv,
                payments: [...inv.payments, payment],
                status: newStatus as Invoice['status'],
              }
            }
            return inv
          }),
        })),
      
      updateSettings: (settings) =>
        set((state) => ({
          settings: { ...state.settings, ...settings },
        })),
    }),
    {
      name: 'facturation-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
