import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { QuoteTemplate } from '@/components/templates/QuoteTemplate'
import { getQuote } from '@/lib/api/quotes'
import { getCompanyByUserId } from '@/lib/api/company'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Download, Printer } from 'lucide-react'
import { generateQuotePDF } from '@/lib/pdf'
import { Database } from '@/lib/supabase'

type Quote = Database['public']['Tables']['quotes']['Row'] & {
  quote_items: Database['public']['Tables']['quote_items']['Row'][]
  clients: Database['public']['Tables']['clients']['Row']
}

export default function QuotePreview() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [quote, setQuote] = useState<Quote | null>(null)
  const [company, setCompany] = useState<Database['public']['Tables']['companies']['Row'] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id || !user) return

    const loadData = async () => {
      try {
        const [quoteData, companyData] = await Promise.all([
          getQuote(id),
          getCompanyByUserId(user.id),
        ])
        setQuote(quoteData as Quote)
        setCompany(companyData)
      } catch (error) {
        console.error('Error loading quote:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [id, user])

  const handleDownloadPDF = () => {
    if (!quote || !company) return

    // Convert database format to app format for PDF generation
    const client = quote.clients
    const appQuote = {
      id: quote.id,
      quoteNumber: quote.quote_number,
      clientId: quote.client_id,
      date: quote.date,
      validUntil: quote.valid_until,
      status: quote.status as any,
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

    generateQuotePDF(appQuote, appClient, appSettings)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!quote || !company) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Quote not found</h2>
          <Button onClick={() => navigate('/quotes')}>Back to Quotes</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-100 min-h-screen">
      {/* Action Bar */}
      <div className="bg-white border-b sticky top-0 z-10 print:hidden">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Button variant="outline" onClick={() => navigate('/quotes')}>
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
      <QuoteTemplate
        quote={{
          quote_number: quote.quote_number,
          date: quote.date,
          valid_until: quote.valid_until,
          subtotal: Number(quote.subtotal),
          tax_amount: Number(quote.tax_amount),
          total: Number(quote.total),
          notes: quote.notes,
          terms: quote.terms,
          quote_items: quote.quote_items,
        }}
        client={quote.clients}
        company={company}
      />
    </div>
  )
}
