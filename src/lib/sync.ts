import { getCompanyByUserId } from '@/lib/api/company'
import { createClient } from '@/lib/api/clients'
import { createQuote } from '@/lib/api/quotes'
import { addPayment, createInvoice } from '@/lib/api/invoices'
import { Client, Quote, Invoice } from '@/lib/types'
import { appClientToInsert, appLineItemsToInvoiceItems, appLineItemsToQuoteItems, appPaymentToInsert } from '@/lib/mappers'

const STORAGE_KEY = 'facturation-storage'
const MIGRATION_KEY = 'facturation-supabase-migrated'

export async function syncLocalDataToSupabase(userId: string): Promise<void> {
  if (localStorage.getItem(MIGRATION_KEY) === 'true') return

  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    localStorage.setItem(MIGRATION_KEY, 'true')
    return
  }

  let parsed: any
  try {
    parsed = JSON.parse(raw)
  } catch {
    localStorage.setItem(MIGRATION_KEY, 'true')
    return
  }

  const state = parsed?.state
  if (!state) {
    localStorage.setItem(MIGRATION_KEY, 'true')
    return
  }

  const company = await getCompanyByUserId(userId)
  if (!company) return

  const clients: Client[] = state.clients || []
  const quotes: Quote[] = state.quotes || []
  const invoices: Invoice[] = state.invoices || []

  if (clients.length === 0 && quotes.length === 0 && invoices.length === 0) {
    localStorage.setItem(MIGRATION_KEY, 'true')
    return
  }

  const clientIdMap = new Map<string, string>()
  for (const client of clients) {
    const created = await createClient(appClientToInsert(client, company.id, userId))
    clientIdMap.set(client.id, created.id)
  }

  const quoteIdMap = new Map<string, string>()
  for (const quote of quotes) {
    const clientId = clientIdMap.get(quote.clientId)
    if (!clientId) continue

    const created = await createQuote(
      {
        company_id: company.id,
        client_id: clientId,
        status: quote.status,
        date: quote.date,
        valid_until: quote.validUntil,
        subtotal: quote.subtotal,
        tax_amount: quote.taxAmount,
        total: quote.total,
        notes: quote.notes || null,
        terms: null,
        created_by: userId,
      },
      appLineItemsToQuoteItems(quote.lineItems),
      quote.quoteNumber
    )

    quoteIdMap.set(quote.id, created.id)
  }

  for (const invoice of invoices) {
    const clientId = clientIdMap.get(invoice.clientId)
    if (!clientId) continue

    const quoteId = invoice.quoteId ? quoteIdMap.get(invoice.quoteId) || null : null

    const created = await createInvoice(
      {
        company_id: company.id,
        client_id: clientId,
        quote_id: quoteId,
        status: invoice.status,
        date: invoice.date,
        due_date: invoice.dueDate,
        subtotal: invoice.subtotal,
        tax_amount: invoice.taxAmount,
        total: invoice.total,
        paid_amount: 0,
        balance: invoice.total,
        notes: invoice.notes || null,
        terms: null,
        created_by: userId,
      },
      appLineItemsToInvoiceItems(invoice.lineItems),
      invoice.invoiceNumber
    )

    for (const payment of invoice.payments) {
      await addPayment(appPaymentToInsert(payment, created.id, userId))
    }
  }

  localStorage.setItem(MIGRATION_KEY, 'true')
}
