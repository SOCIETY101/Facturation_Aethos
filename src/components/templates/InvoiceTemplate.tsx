import { Invoice, Client } from '@/lib/types'
import { Database } from '@/lib/supabase'
import { formatCurrency, formatDateShort } from '@/lib/utils'
import Logo from '@/assets/Logo.png'
import Signature from '@/assets/Segnature.png'

type Company = Database['public']['Tables']['companies']['Row']
type InvoiceItem = Database['public']['Tables']['invoice_items']['Row']
type Payment = Database['public']['Tables']['payments']['Row']

interface InvoiceTemplateProps {
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
  client: Client | Database['public']['Tables']['clients']['Row']
  company: Company
}

export function InvoiceTemplate({ invoice, client, company }: InvoiceTemplateProps) {
  const totalPaid = invoice.payments?.reduce((sum, p) => sum + p.amount, 0) || invoice.paid_amount || 0
  const remaining = invoice.total - totalPaid

  return (
    <div className="min-h-screen bg-white p-8 print:p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div className="flex items-center gap-4">
            {company.logo_url && (
              <img 
                src={company.logo_url} 
                alt={company.name}
                className="h-20 w-auto"
              />
            )}
            {!company.logo_url && (
              <img 
                src={Logo} 
                alt="Logo"
                className="h-20 w-auto"
              />
            )}
            <div>
              <h1 className="text-2xl font-bold text-[#1e3a8a]">{company.name || 'STE AETHOS TECH SARL'}</h1>
              {company.tax_id && (
                <p className="text-sm text-gray-600">ICE: {company.tax_id}</p>
              )}
              {company.address && (
                <p className="text-sm text-gray-600">{company.address}</p>
              )}
              {company.city && company.postal_code && (
                <p className="text-sm text-gray-600">{company.postal_code} {company.city}</p>
              )}
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-3xl font-bold text-[#1e3a8a] mb-2">FACTURE</h2>
            <p className="text-lg text-gray-700">N° {invoice.invoice_number}</p>
          </div>
        </div>

        {/* Client Info */}
        <div className="mb-8 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold text-[#1e3a8a] mb-3">Facturé à:</h3>
          <div className="text-gray-700">
            <p className="font-semibold">{client.name}</p>
            {client.address && <p>{client.address}</p>}
            {client.city && client.postal_code && (
              <p>{client.postal_code} {client.city}</p>
            )}
            {client.tax_id && <p>ICE: {client.tax_id}</p>}
            {client.email && <p>{client.email}</p>}
            {client.phone && <p>{client.phone}</p>}
          </div>
        </div>

        {/* Invoice Details */}
        <div className="mb-6 grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-semibold text-[#1e3a8a]">Date d'émission:</span>{' '}
            <span className="text-gray-700">{formatDateShort(invoice.date)}</span>
          </div>
          <div>
            <span className="font-semibold text-[#1e3a8a]">Date d'échéance:</span>{' '}
            <span className="text-gray-700">{formatDateShort(invoice.due_date)}</span>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="mb-6 overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#1e3a8a] text-white">
                <th className="border border-gray-300 px-4 py-3 text-left">Description</th>
                <th className="border border-gray-300 px-4 py-3 text-center w-20">Qté</th>
                <th className="border border-gray-300 px-4 py-3 text-right w-32">Prix unit.</th>
                <th className="border border-gray-300 px-4 py-3 text-center w-24">TVA</th>
                <th className="border border-gray-300 px-4 py-3 text-right w-32">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.invoice_items.map((item, index) => {
                const itemTotal = Number(item.quantity) * Number(item.unit_price)
                const itemTax = itemTotal * (Number(item.tax_rate) / 100)
                const itemTotalWithTax = itemTotal + itemTax
                return (
                  <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="border border-gray-300 px-4 py-3">{item.description}</td>
                    <td className="border border-gray-300 px-4 py-3 text-center">{item.quantity}</td>
                    <td className="border border-gray-300 px-4 py-3 text-right">{formatCurrency(Number(item.unit_price))}</td>
                    <td className="border border-gray-300 px-4 py-3 text-center">{item.tax_rate}%</td>
                    <td className="border border-gray-300 px-4 py-3 text-right font-semibold">
                      {formatCurrency(itemTotalWithTax)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end mb-6">
          <div className="w-80">
            <div className="flex justify-between py-2 border-b border-gray-300">
              <span className="text-gray-700">Sous-total HT:</span>
              <span className="font-semibold">{formatCurrency(invoice.subtotal)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-300">
              <span className="text-gray-700">TVA:</span>
              <span className="font-semibold">{formatCurrency(invoice.tax_amount)}</span>
            </div>
            <div className="flex justify-between py-3 border-t-2 border-[#1e3a8a] mt-2">
              <span className="text-lg font-bold text-[#1e3a8a]">Total TTC:</span>
              <span className="text-lg font-bold text-[#1e3a8a]">{formatCurrency(invoice.total)}</span>
            </div>
          </div>
        </div>

        {/* Payments */}
        {invoice.payments && invoice.payments.length > 0 && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-[#1e3a8a] mb-2">Paiements:</h3>
            {invoice.payments.map((payment) => (
              <div key={payment.id} className="text-sm text-gray-700">
                {formatDateShort(payment.payment_date)} - {formatCurrency(Number(payment.amount))} ({payment.payment_method})
              </div>
            ))}
            {remaining > 0 && (
              <div className="mt-2 font-semibold text-[#1e3a8a]">
                Reste à payer: {formatCurrency(remaining)}
              </div>
            )}
          </div>
        )}

        {/* Notes */}
        {invoice.notes && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-[#1e3a8a] mb-2">Notes:</h3>
            <p className="text-gray-700 whitespace-pre-wrap">{invoice.notes}</p>
          </div>
        )}

        {/* Terms */}
        {invoice.terms && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-[#1e3a8a] mb-2">Conditions de paiement:</h3>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{invoice.terms}</p>
          </div>
        )}

        {/* Footer with Signature */}
        <div className="mt-12 pt-8 border-t-2 border-gray-300">
          <div className="flex justify-between items-end">
            <div className="text-xs text-gray-600">
              {company.bank_name && (
                <p>Banque: {company.bank_name}</p>
              )}
              {company.bank_account && (
                <p>Compte: {company.bank_account}</p>
              )}
            </div>
            <div className="text-right">
              <img 
                src={Signature} 
                alt="Signature"
                className="h-16 w-auto opacity-90"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
