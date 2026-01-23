import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { InvoiceTemplate } from '@/components/templates/InvoiceTemplate'
import { getInvoice } from '@/lib/api/invoices'
import { getCompanyByUserId } from '@/lib/api/company'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Download, Printer } from 'lucide-react'
import { generateInvoicePDF } from '@/lib/pdf'
import { Database } from '@/lib/supabase'

type Invoice = Database['public']['Tables']['invoices']['Row'] & {
  invoice_items: Database['public']['Tables']['invoice_items']['Row'][]
  payments?: Database['public']['Tables']['payments']['Row'][]
  clients: Database['public']['Tables']['clients']['Row']
}

export default function InvoicePreview() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [company, setCompany] = useState<Database['public']['Tables']['companies']['Row'] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id || !user) return

    const loadData = async () => {
      try {
        const [invoiceData, companyData] = await Promise.all([
          getInvoice(id),
          getCompanyByUserId(user.id),
        ])
        setInvoice(invoiceData as Invoice)
        setCompany(companyData)
      } catch (error) {
        console.error('Error loading invoice:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [id, user])

  const handleDownloadPDF = () => {
    if (!invoice || !company) return

    // Convert database format to app format for PDF generation
    const client = invoice.clients
    const appInvoice = {
      id: invoice.id,
      invoiceNumber: invoice.invoice_number,
      clientId: invoice.client_id,
      date: invoice.date,
      dueDate: invoice.due_date,
      status: invoice.status as any,
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
      payments: invoice.payments?.map((p) => ({
        id: p.id,
        date: p.payment_date,
        amount: Number(p.amount),
        method: p.payment_method as any,
        reference: p.reference || undefined,
      })) || [],
    }

    const appClient = {
      id: client.id,
      name: client.name,
      email: client.email || '',
      phone: client.phone || '',
      address: client.address || '',
      taxId: client.tax_id || undefined,
      createdAt: client.created_at,
    }

    const appSettings = {
      company: {
        name: company.name,
        logo: company.logo_url || undefined,
        address: company.address || '',
        city: company.city || '',
        postalCode: company.postal_code || '',
        country: company.country || '',
        taxId: company.tax_id || '',
        bankName: company.bank_name || '',
        bankAccount: company.bank_account || '',
        bankIBAN: company.bank_account || '',
        bankBIC: company.bank_account || '',
      },
      invoice: {
        prefix: company.invoice_prefix,
        startingNumber: company.invoice_start_number,
        terms: company.default_payment_terms || '',
      },
      taxRates: [],
    }

    generateInvoicePDF(appInvoice, appClient, appSettings)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!invoice || !company) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Invoice not found</h2>
          <Button onClick={() => navigate('/invoices')}>Back to Invoices</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-100 min-h-screen">
      {/* Action Bar */}
      <div className="bg-white border-b sticky top-0 z-10 print:hidden">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Button variant="outline" onClick={() => navigate('/invoices')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div className="flex gap-2">
            <Button onClick={handleDownloadPDF}>
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </Button>
            <Button onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
          </div>
        </div>
      </div>

      {/* Template */}
      <InvoiceTemplate
        invoice={{
          invoice_number: invoice.invoice_number,
          date: invoice.date,
          due_date: invoice.due_date,
          subtotal: Number(invoice.subtotal),
          tax_amount: Number(invoice.tax_amount),
          total: Number(invoice.total),
          paid_amount: Number(invoice.paid_amount),
          balance: Number(invoice.balance),
          notes: invoice.notes,
          terms: invoice.terms,
          invoice_items: invoice.invoice_items,
          payments: invoice.payments,
        }}
        client={invoice.clients}
        company={company}
      />
    </div>
  )
}
