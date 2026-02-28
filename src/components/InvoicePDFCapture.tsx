import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { InvoiceTemplate } from '@/components/templates/InvoiceTemplate'
import { generateInvoicePDFFromElement } from '@/lib/pdf'
import type { Invoice, Client } from '@/lib/types'
import type { Database } from '@/lib/supabase'

type Company = Database['public']['Tables']['companies']['Row']
type InvoiceItem = Database['public']['Tables']['invoice_items']['Row']
type Payment = Database['public']['Tables']['payments']['Row']

interface InvoicePDFCaptureProps {
  invoice: Invoice
  client: Client
  company: Company
  onComplete: () => void
}

/** Converts app format to template (DB) format */
function toTemplateFormat(
  invoice: Invoice,
  client: Client,
  companyId: string
): {
  invoice: {
    invoice_number: string
    date: string
    due_date: string
    subtotal: number
    tax_amount: number
    total: number
    paid_amount: number
    balance: number
    notes?: string | null
    terms?: string | null
    invoice_items: InvoiceItem[]
    payments?: Payment[]
  }
  client: Database['public']['Tables']['clients']['Row']
} {
  const paidAmount = invoice.payments?.reduce((s, p) => s + p.amount, 0) ?? 0
  return {
    invoice: {
      invoice_number: invoice.invoiceNumber,
      date: invoice.date,
      due_date: invoice.dueDate,
      subtotal: invoice.subtotal,
      tax_amount: invoice.taxAmount,
      total: invoice.total,
      paid_amount: paidAmount,
      balance: invoice.total - paidAmount,
      notes: invoice.notes,
      terms: undefined,
      invoice_items: invoice.lineItems.map((l, idx) => {
        const itemTotal = l.quantity * l.unitPrice
        const itemTax = itemTotal * (l.taxRate / 100)
        return {
          id: l.id,
          invoice_id: invoice.id,
          product_id: null,
          description: l.description,
          quantity: l.quantity,
          unit_price: l.unitPrice,
          tax_rate: l.taxRate,
          total: itemTotal + itemTax,
          sort_order: idx,
          created_at: new Date().toISOString(),
        } as InvoiceItem
      }),
      payments: invoice.payments?.map((p) => ({
        id: p.id,
        invoice_id: invoice.id,
        payment_date: p.date,
        amount: p.amount,
        payment_method: p.method,
        reference: p.reference ?? null,
        notes: null,
        created_by: null,
        created_at: new Date().toISOString(),
      } as Payment)),
    },
    client: {
      id: client.id,
      company_id: companyId,
      name: client.name,
      email: client.email || null,
      phone: client.phone || null,
      contact_person: null,
      address: client.address || null,
      city: null,
      postal_code: null,
      country: null,
      tax_id: client.taxId ?? null,
      notes: null,
      created_by: null,
      created_at: client.createdAt,
      updated_at: client.createdAt,
    } as Database['public']['Tables']['clients']['Row'],
  }
}

export function InvoicePDFCapture({ invoice, client, company, onComplete }: InvoicePDFCaptureProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { invoice: templateInvoice, client: templateClient } = toTemplateFormat(invoice, client, company.id)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const capture = async () => {
      await new Promise((r) => setTimeout(r, 600))
      const content = container.querySelector('[data-pdf-content]') as HTMLElement
      if (content) {
        await generateInvoicePDFFromElement(content, `invoice-${invoice.invoiceNumber}.pdf`)
      }
      onComplete()
    }

    capture()
  }, [invoice.invoiceNumber, onComplete])

  const portalTarget = document.getElementById('pdf-portal')
  if (!portalTarget) return null

  const content = (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        left: '-9999px',
        top: 0,
        width: '210mm',
        minWidth: '210mm',
        zIndex: -1,
        visibility: 'hidden',
      }}
    >
      <div data-pdf-content style={{ width: '210mm', minWidth: '210mm', backgroundColor: 'white' }}>
        <InvoiceTemplate
          invoice={templateInvoice}
          client={templateClient}
          company={company}
          compact
        />
      </div>
    </div>
  )

  return createPortal(content, portalTarget)
}
