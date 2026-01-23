import { useState } from 'react'
import { useCompany } from '@/hooks/useCompany'
import { InvoiceTemplate } from '@/components/templates/InvoiceTemplate'
import { QuoteTemplate } from '@/components/templates/QuoteTemplate'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, Printer } from 'lucide-react'
import { Database } from '@/lib/supabase'

// Sample data for template preview
const sampleClient = {
  id: 'sample',
  name: 'Client Exemple SARL',
  email: 'contact@exemple.ma',
  phone: '+212 5 22 123 456',
  address: '123 Rue Example',
  city: 'Casablanca',
  postal_code: '20000',
  country: 'Morocco',
  tax_id: 'ICE123456789',
  contact_person: null,
  notes: null,
  company_id: '',
  created_by: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

const sampleInvoiceItems = [
  {
    id: '1',
    invoice_id: 'sample',
    product_id: null,
    description: 'Développement Web',
    quantity: 1,
    unit_price: 15000,
    tax_rate: 20,
    total: 18000,
    sort_order: 0,
    created_at: new Date().toISOString(),
  },
  {
    id: '2',
    invoice_id: 'sample',
    product_id: null,
    description: 'Design Graphique',
    quantity: 1,
    unit_price: 5000,
    tax_rate: 20,
    total: 6000,
    sort_order: 1,
    created_at: new Date().toISOString(),
  },
]

const sampleQuoteItems = [
  {
    id: '1',
    quote_id: 'sample',
    product_id: null,
    description: 'Application Mobile',
    quantity: 1,
    unit_price: 25000,
    tax_rate: 20,
    total: 30000,
    sort_order: 0,
    created_at: new Date().toISOString(),
  },
  {
    id: '2',
    quote_id: 'sample',
    product_id: null,
    description: 'Maintenance Mensuelle',
    quantity: 3,
    unit_price: 2000,
    tax_rate: 20,
    total: 7200,
    sort_order: 1,
    created_at: new Date().toISOString(),
  },
]

export default function Templates() {
  const { company, loading } = useCompany()
  const [activeTab, setActiveTab] = useState('invoice')

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!company) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Company not found</h2>
          <p className="text-muted-foreground">Please set up your company in Settings first.</p>
        </div>
      </div>
    )
  }

  const sampleInvoice = {
    invoice_number: 'INV-2025-001',
    date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    subtotal: 20000,
    tax_amount: 4000,
    total: 24000,
    paid_amount: 0,
    balance: 24000,
    notes: 'Merci pour votre confiance.',
    terms: 'Paiement à réception de facture. Délai de paiement: 30 jours.',
    invoice_items: sampleInvoiceItems,
    payments: [],
  }

  const sampleQuote = {
    quote_number: 'QUO-2025-001',
    date: new Date().toISOString().split('T')[0],
    valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    subtotal: 31000,
    tax_amount: 6200,
    total: 37200,
    notes: 'Ce devis inclut tous les services mentionnés.',
    terms: 'Valable 30 jours. Conditions de paiement: 50% à la commande, 50% à la livraison.',
    quote_items: sampleQuoteItems,
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Templates</h1>
        <p className="text-muted-foreground">Preview invoice and quote templates</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Template Preview</CardTitle>
          <CardDescription>
            These are sample templates showing how your invoices and quotes will look
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="invoice">Invoice Template</TabsTrigger>
              <TabsTrigger value="quote">Quote Template</TabsTrigger>
            </TabsList>

            <TabsContent value="invoice" className="mt-4">
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-white p-4 border-b flex justify-end gap-2 print:hidden">
                  <Button onClick={() => window.print()} variant="outline" size="sm">
                    <Printer className="mr-2 h-4 w-4" />
                    Print Preview
                  </Button>
                </div>
                <div className="bg-gray-50">
                  <InvoiceTemplate
                    invoice={sampleInvoice}
                    client={sampleClient}
                    company={company}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="quote" className="mt-4">
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-white p-4 border-b flex justify-end gap-2 print:hidden">
                  <Button onClick={() => window.print()} variant="outline" size="sm">
                    <Printer className="mr-2 h-4 w-4" />
                    Print Preview
                  </Button>
                </div>
                <div className="bg-gray-50">
                  <QuoteTemplate
                    quote={sampleQuote}
                    client={sampleClient}
                    company={company}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
