import { Database } from '@/lib/supabase'
import { Client, Invoice, Quote, LineItem, Payment } from '@/lib/types'

type DbClient = Database['public']['Tables']['clients']['Row']
type DbQuote = Database['public']['Tables']['quotes']['Row']
type DbQuoteItem = Database['public']['Tables']['quote_items']['Row']
type DbInvoice = Database['public']['Tables']['invoices']['Row']
type DbInvoiceItem = Database['public']['Tables']['invoice_items']['Row']
type DbPayment = Database['public']['Tables']['payments']['Row']

type DbQuoteWithItems = DbQuote & { quote_items: DbQuoteItem[] }
type DbInvoiceWithItems = DbInvoice & { invoice_items: DbInvoiceItem[]; payments?: DbPayment[] }

type DbClientInsert = Database['public']['Tables']['clients']['Insert']

type DbQuoteItemInsert = Database['public']['Tables']['quote_items']['Insert']

type DbInvoiceItemInsert = Database['public']['Tables']['invoice_items']['Insert']

type DbPaymentInsert = Database['public']['Tables']['payments']['Insert']

export const dbClientToApp = (client: DbClient): Client => ({
  id: client.id,
  name: client.name,
  email: client.email || '',
  phone: client.phone || '',
  address: client.address || '',
  taxId: client.tax_id || undefined,
  createdAt: client.created_at,
})

export const dbQuoteToApp = (quote: DbQuoteWithItems): Quote => ({
  id: quote.id,
  quoteNumber: quote.quote_number,
  clientId: quote.client_id,
  date: quote.date,
  validUntil: quote.valid_until,
  status: quote.status as Quote['status'],
  lineItems: quote.quote_items.map((item) => ({
    id: item.id,
    description: item.description,
    quantity: Number(item.quantity),
    unitPrice: Number(item.unit_price),
    taxRate: Number(item.tax_rate),
  })),
  subtotal: Number(quote.subtotal),
  taxAmount: Number(quote.tax_amount),
  total: Number(quote.total),
  notes: quote.notes || undefined,
})

export const dbInvoiceToApp = (invoice: DbInvoiceWithItems): Invoice => ({
  id: invoice.id,
  invoiceNumber: invoice.invoice_number,
  clientId: invoice.client_id,
  quoteId: invoice.quote_id || undefined,
  date: invoice.date,
  dueDate: invoice.due_date,
  status: invoice.status as Invoice['status'],
  lineItems: invoice.invoice_items.map((item) => ({
    id: item.id,
    description: item.description,
    quantity: Number(item.quantity),
    unitPrice: Number(item.unit_price),
    taxRate: Number(item.tax_rate),
  })),
  subtotal: Number(invoice.subtotal),
  taxAmount: Number(invoice.tax_amount),
  total: Number(invoice.total),
  notes: invoice.notes || undefined,
  payments: (invoice.payments || []).map((payment) => ({
    id: payment.id,
    date: payment.payment_date,
    amount: Number(payment.amount),
    method: payment.payment_method as Payment['method'],
    reference: payment.reference || undefined,
  })),
})

export const appClientToInsert = (
  client: Partial<Client>,
  companyId: string,
  userId?: string
): DbClientInsert & { user_id?: string } => ({
  company_id: companyId,
  name: client.name || '',
  nom: client.name || '',
  email: client.email || null,
  phone: client.phone || null,
  address: client.address || null,
  city: null,
  postal_code: null,
  country: null,
  tax_id: client.taxId || null,
  notes: null,
  contact_person: null,
  created_by: userId || null,
  user_id: userId || undefined,
})

export const appLineItemsToQuoteItems = (
  lineItems: LineItem[]
): Omit<DbQuoteItemInsert, 'quote_id'>[] =>
  lineItems.map((item, index) => {
    const itemTotal = item.quantity * item.unitPrice
    const itemTax = itemTotal * (item.taxRate / 100)
    const total = itemTotal + itemTax
    return {
      product_id: null,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      tax_rate: item.taxRate,
      total,
      sort_order: index,
    }
  })

export const appLineItemsToInvoiceItems = (
  lineItems: LineItem[]
): Omit<DbInvoiceItemInsert, 'invoice_id'>[] =>
  lineItems.map((item, index) => {
    const itemTotal = item.quantity * item.unitPrice
    const itemTax = itemTotal * (item.taxRate / 100)
    const total = itemTotal + itemTax
    return {
      product_id: null,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      tax_rate: item.taxRate,
      total,
      sort_order: index,
    }
  })

export const appPaymentToInsert = (
  payment: Payment,
  invoiceId: string,
  userId?: string
): DbPaymentInsert => ({
  invoice_id: invoiceId,
  amount: payment.amount,
  payment_date: payment.date,
  payment_method: payment.method,
  reference: payment.reference || null,
  notes: null,
  created_by: userId || null,
})
