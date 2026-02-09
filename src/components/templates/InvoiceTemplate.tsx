import { Database } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import Logo from '@/assets/Logo.png'
import Signature from '@/assets/Segnature.png'

type Company = Database['public']['Tables']['companies']['Row']
type Client = Database['public']['Tables']['clients']['Row']
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
  client: Client
  company: Company
}

const formatDateNumeric = (date: string | Date) => {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d)
}

export function InvoiceTemplate({ invoice, client, company }: InvoiceTemplateProps) {
  const totalPaid = invoice.payments?.reduce((sum, p) => sum + p.amount, 0) || invoice.paid_amount || 0
  const remaining = invoice.total - totalPaid

  const footerParts = [
    company.name || 'STE AETHOS TECH SARL',
    company.tax_id ? `ICE ${company.tax_id}` : null,
    company.address || null,
    company.city ? `${company.city}${company.postal_code ? ` ${company.postal_code}` : ''}` : null,
  ].filter(Boolean) as string[]

  return (
    <div className="min-h-screen bg-white p-10 print:p-6 text-[#2b2b2b]">
      <div className="max-w-4xl mx-auto">
        {/* Logo */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            {company.logo_url && (
              <img
                src={company.logo_url}
                alt={company.name || 'Logo'}
                className="h-16 w-auto"
              />
            )}
            {!company.logo_url && (
              <img
                src={Logo}
                alt="Logo"
                className="h-16 w-auto"
              />
            )}
          </div>
        </div>

        {/* Title Row */}
        <div className="mt-6 flex items-center justify-between gap-4">
          <div className="flex items-center">
            <span className="bg-[#b00d0b]/15 px-2 py-1 text-2xl font-bold tracking-wide">
              FACTURE
            </span>
          </div>
          <div className="flex-1 flex justify-center">
            <span className="border-2 border-[#2b2b2b] rounded-full px-4 py-1 text-sm font-semibold">
              N°{invoice.invoice_number}
            </span>
          </div>
          <div>
            <span className="bg-[#b00d0b] text-white rounded-full px-4 py-1 text-sm font-semibold">
              {formatDateNumeric(invoice.date)}
            </span>
          </div>
        </div>

        <div className="my-6 h-px bg-[#2b2b2b]/40" />

        {/* Parties */}
        <div className="flex justify-between gap-8 text-sm">
          <div>
            <p className="font-semibold uppercase">{client.name}</p>
            {client.tax_id && <p>ICE : {client.tax_id}</p>}
            {client.email && <p>{client.email}</p>}
            {client.phone && <p>{client.phone}</p>}
          </div>
          <div className="text-right">
            <p className="font-semibold uppercase">{company.name || 'AETHOS TECH'}</p>
            {company.tax_id && <p>ICE : {company.tax_id}</p>}
            {company.email && <p>{company.email}</p>}
          </div>
        </div>

        {/* Line Items */}
        <div className="mt-6">
          <table className="w-full border border-[#2b2b2b] border-collapse text-sm">
            <thead>
              <tr className="bg-[#2b2b2b] text-white">
                <th className="border border-[#2b2b2b] px-3 py-2 text-center">DESCRIPTION</th>
                <th className="border border-[#2b2b2b] px-3 py-2 text-center w-28">QTE</th>
                <th className="border border-[#2b2b2b] px-3 py-2 text-center w-32">TOTAL TTC</th>
              </tr>
            </thead>
            <tbody>
              {invoice.invoice_items.map((item) => {
                const itemTotal = Number(item.quantity) * Number(item.unit_price)
                const itemTax = itemTotal * (Number(item.tax_rate) / 100)
                const itemTotalWithTax = itemTotal + itemTax
                return (
                  <tr key={item.id}>
                    <td className="border border-[#2b2b2b] px-3 py-3">{item.description}</td>
                    <td className="border border-[#2b2b2b] px-3 py-3 text-center">{item.quantity}</td>
                    <td className="border border-[#2b2b2b] px-3 py-3 text-right">
                      {formatCurrency(itemTotalWithTax)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="mt-6 flex justify-end">
          <div className="text-right text-sm">
            <div className="flex justify-end gap-2">
              <span className="font-semibold">HT Total :</span>
              <span className="font-semibold">{formatCurrency(invoice.subtotal)}</span>
            </div>
          </div>
        </div>
        <div className="mt-3 bg-[#2b2b2b] text-white px-4 py-2 flex justify-end">
          <span className="font-semibold">TOTAL TTC : {formatCurrency(invoice.total)}</span>
        </div>

        {/* Payments (optional) */}
        {invoice.payments && invoice.payments.length > 0 && (
          <div className="mt-6 text-sm">
            <div className="font-semibold uppercase mb-2">Paiements</div>
            <div className="space-y-1">
              {invoice.payments.map((payment) => (
                <div key={payment.id}>
                  {formatDateNumeric(payment.payment_date)} - {formatCurrency(Number(payment.amount))} ({payment.payment_method})
                </div>
              ))}
            </div>
            {remaining > 0 && (
              <div className="mt-2 font-semibold">Reste à payer : {formatCurrency(remaining)}</div>
            )}
          </div>
        )}

        {/* Notes / Terms */}
        {invoice.notes && (
          <div className="mt-6 text-sm">
            <div className="font-semibold uppercase mb-1">Notes</div>
            <p className="whitespace-pre-wrap">{invoice.notes}</p>
          </div>
        )}

        {invoice.terms && (
          <div className="mt-4 text-sm">
            <div className="font-semibold uppercase mb-1">Conditions</div>
            <p className="whitespace-pre-wrap">{invoice.terms}</p>
          </div>
        )}

        {/* Payment Mode + Signature */}
        <div className="mt-10 flex justify-between items-start gap-8">
          <div className="text-sm">
            <div className="font-semibold uppercase mb-2">Mode de paiement</div>
            <div className="space-y-1">
              <div>
                <span className="font-semibold">INTITULE DU COMPTE :</span> {company.name || 'STE AETHOS TECH SARL'}
              </div>
              {company.bank_account && (
                <div>
                  <span className="font-semibold">RIB :</span> {company.bank_account}
                </div>
              )}
              {company.bank_iban && (
                <div>
                  <span className="font-semibold">IBAN :</span> {company.bank_iban}
                </div>
              )}
              {company.bank_bic && (
                <div>
                  <span className="font-semibold">CODE SWIFT :</span> {company.bank_bic}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-end justify-end">
            <img
              src={Signature}
              alt="Signature"
              className="h-24 w-auto opacity-90"
            />
          </div>
        </div>

        {/* Footer */}
        {footerParts.length > 0 && (
          <div className="mt-10 pt-3 border-t border-[#2b2b2b]/40 text-xs text-center">
            {footerParts.join(' - ')}
          </div>
        )}
      </div>
    </div>
  )
}
