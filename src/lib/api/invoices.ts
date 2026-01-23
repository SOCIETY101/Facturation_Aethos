import { supabase } from '../supabase'
import { Database } from '../supabase'

type Invoice = Database['public']['Tables']['invoices']['Row']
type InvoiceInsert = Database['public']['Tables']['invoices']['Insert']
type InvoiceUpdate = Database['public']['Tables']['invoices']['Update']
type InvoiceItem = Database['public']['Tables']['invoice_items']['Row']
type InvoiceItemInsert = Database['public']['Tables']['invoice_items']['Insert']
type Payment = Database['public']['Tables']['payments']['Row']
type PaymentInsert = Database['public']['Tables']['payments']['Insert']

export interface InvoiceWithItems extends Invoice {
  invoice_items: InvoiceItem[]
  payments: Payment[]
  clients?: Database['public']['Tables']['clients']['Row']
}

export async function getInvoices(companyId: string) {
  const { data, error } = await supabase
    .from('invoices')
    .select(`
      *,
      invoice_items (*),
      payments (*),
      clients (*)
    `)
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as InvoiceWithItems[]
}

export async function getInvoice(id: string) {
  const { data, error } = await supabase
    .from('invoices')
    .select(`
      *,
      invoice_items (*),
      payments (*),
      clients (*)
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return data as InvoiceWithItems
}

export async function createInvoice(
  invoice: Omit<InvoiceInsert, 'invoice_number'>,
  items: Omit<InvoiceItemInsert, 'invoice_id'>[],
  invoiceNumber: string
) {
  const { data: invoiceData, error: invoiceError } = await supabase
    .from('invoices')
    .insert({ ...invoice, invoice_number: invoiceNumber })
    .select()
    .single()

  if (invoiceError) throw invoiceError

  if (items.length > 0) {
    const invoiceItems = items.map((item) => ({
      ...item,
      invoice_id: invoiceData.id,
    }))

    const { error: itemsError } = await supabase
      .from('invoice_items')
      .insert(invoiceItems)

    if (itemsError) throw itemsError
  }

  return getInvoice(invoiceData.id)
}

export async function updateInvoice(
  id: string,
  updates: InvoiceUpdate,
  items?: Omit<InvoiceItemInsert, 'invoice_id'>[]
) {
  const { error: invoiceError } = await supabase
    .from('invoices')
    .update(updates)
    .eq('id', id)

  if (invoiceError) throw invoiceError

  if (items) {
    // Delete existing items
    await supabase.from('invoice_items').delete().eq('invoice_id', id)

    // Insert new items
    if (items.length > 0) {
      const invoiceItems = items.map((item) => ({
        ...item,
        invoice_id: id,
      }))

      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(invoiceItems)

      if (itemsError) throw itemsError
    }
  }

  return getInvoice(id)
}

export async function deleteInvoice(id: string) {
  const { error } = await supabase.from('invoices').delete().eq('id', id)
  if (error) throw error
}

export async function addPayment(payment: PaymentInsert) {
  const { data, error } = await supabase
    .from('payments')
    .insert(payment)
    .select()
    .single()

  if (error) throw error

  // Update invoice paid_amount and balance
  const invoice = await getInvoice(payment.invoice_id)
  const newPaidAmount = invoice.paid_amount + payment.amount
  const newBalance = invoice.total - newPaidAmount

  await supabase
    .from('invoices')
    .update({
      paid_amount: newPaidAmount,
      balance: newBalance,
    })
    .eq('id', payment.invoice_id)

  return data as Payment
}

export async function getNextInvoiceNumber(companyId: string, prefix: string) {
  const { data } = await supabase
    .from('invoices')
    .select('invoice_number')
    .eq('company_id', companyId)
    .like('invoice_number', `${prefix}%`)
    .order('invoice_number', { ascending: false })
    .limit(1)

  if (!data || data.length === 0) {
    const { data: company } = await supabase
      .from('companies')
      .select('invoice_start_number')
      .eq('id', companyId)
      .single()

    return company?.invoice_start_number || 1000
  }

  const lastNumber = parseInt(data[0].invoice_number.replace(prefix, '').replace(/-/g, ''))
  return isNaN(lastNumber) ? 1000 : lastNumber + 1
}
