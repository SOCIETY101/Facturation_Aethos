import { Database } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import Logo from '@/assets/logonor.png'

type Company = Database['public']['Tables']['companies']['Row']
type Client = Database['public']['Tables']['clients']['Row']
type QuoteItem = Database['public']['Tables']['quote_items']['Row']

interface QuoteTemplateProps {
  quote: {
    quote_number: string
    date: string
    valid_until: string
    subtotal: number
    tax_amount: number
    total: number
    notes?: string | null
    terms?: string | null
    quote_items: QuoteItem[]
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

export function QuoteTemplate({ quote, client, company }: QuoteTemplateProps) {
  return (
    <div className="min-h-screen bg-white p-10 print:p-6 text-[#2b2b2b]">
      <div className="max-w-4xl mx-auto">
        {/* Logo */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            {company.logo_url ? (
               <img
                src={company.logo_url}
                alt={company.name || 'Logo'}
                className="h-[160px] w-auto object-contain"
              />
            ) : (
              <img
                src={Logo}
                alt="Logo"
                className="h-[160px] w-auto object-contain"
              />
            )}
          </div>
        </div>

        {/* Title Row */}
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <span className="text-[28px] font-bold tracking-wider mr-2">
              DEVIS
            </span>
            <span className="border border-gray-400 rounded-full px-5 py-1 text-[15px] font-medium text-gray-800">
              N°{quote.quote_number}
            </span>
          </div>
          <div className="ml-auto flex items-center gap-4">
             <span className="bg-[#990a0a] text-white rounded-[20px] px-6 py-2 text-[15px] font-bold tracking-wide">
              {formatDateNumeric(quote.date)}
            </span>
            <span className="border border-[#2b2b2b] rounded-full px-4 py-1.5 text-xs font-medium text-gray-700">
              Valable jusqu'au {formatDateNumeric(quote.valid_until)}
            </span>
          </div>
        </div>

        <div className="mt-8 mb-8 h-px bg-gray-400" />

        {/* Parties */}
        <div className="flex justify-between text-[15px] mt-6 leading-[1.6]">
          <div className="w-1/2">
            <p className="font-bold uppercase tracking-wide text-[#1a1a1a] text-[16px] mb-1">{company.name || 'AETHOS TECH'}</p>
            {company.tax_id && <p className="text-[#333333]">ICE : {company.tax_id}</p>}
            {company.email && <p className="text-[#333333]">{company.email}</p>}
          </div>
          <div className="w-1/2 flex justify-end">
            <div className="w-[350px] text-left">
              <p className="font-bold uppercase tracking-wide text-[#1a1a1a] text-[16px] mb-1">{client.name}</p>
              {client.tax_id && <p className="text-[#333333]">ICE : {client.tax_id}</p>}
              {client.email && <p className="text-[#333333]">{client.email}</p>}
              {client.phone && <p className="text-[#333333]">{client.phone}</p>}
            </div>
          </div>
        </div>

        {/* Line Items */}
        <div className="mt-10 min-h-[400px] flex flex-col border border-[#2b2b2b] bg-white">
          <div className="flex bg-[#1a1a1a] text-white">
            <div className="flex-1 px-4 py-3 text-center font-bold tracking-wide border-r border-[#2b2b2b]">DESCRIPTION</div>
            <div className="w-[120px] px-4 py-3 text-center font-bold tracking-wide border-r border-[#2b2b2b]">QTE</div>
            <div className="w-[250px] px-4 py-3 text-center font-bold tracking-wide">TOTAL TTC</div>
          </div>
          <div className="flex-1 flex flex-col text-[15px]">
            {quote.quote_items.map((item) => {
              const itemTotal = Number(item.quantity) * Number(item.unit_price)
              const itemTax = itemTotal * (Number(item.tax_rate) / 100)
              const itemTotalWithTax = itemTotal + itemTax
              
              const descParts = item.description.split('\n')
              const title = descParts[0]
              const details = descParts.slice(1).join('\n')

              return (
                <div key={item.id} className="flex">
                  <div className="flex-1 px-4 py-3 border-r border-[#2b2b2b] align-top leading-snug">
                    <div className="font-bold text-[#1a1a1a] text-[15px]">{title}</div>
                    {details && <div className="text-[#444444] text-[14px] whitespace-pre-wrap mt-0.5">{details}</div>}
                  </div>
                  <div className="w-[120px] px-4 py-3 text-center border-r border-[#2b2b2b] align-top font-medium">
                    {item.quantity}
                  </div>
                  <div className="w-[250px] px-4 py-3 text-center align-top font-medium">
                    {itemTotalWithTax.toLocaleString('fr-FR')}
                  </div>
                </div>
              )
            })}
            <div className="flex-1 flex">
              <div className="flex-1 border-r border-[#2b2b2b]"></div>
              <div className="w-[120px] border-r border-[#2b2b2b]"></div>
              <div className="w-[250px]"></div>
            </div>
          </div>
        </div>

        {/* Totals */}
        <div className="mt-10 flex justify-end">
          <div className="w-[250px]">
            <div className="flex justify-between items-center mb-5 px-3">
              <span className="font-bold text-[16px]">HT Total :</span>
              <span className="font-bold text-[16px]">{formatCurrency(quote.subtotal)}</span>
            </div>
            <div className="flex justify-between items-center mb-6 px-3">
              <span className="font-bold text-[16px]">TVA 20% :</span>
              <span className="font-bold text-[16px]">{formatCurrency(quote.total - quote.subtotal)}</span>
            </div>
            <div className="bg-[#1a1a1a] text-white px-5 py-3.5 flex justify-between items-center w-full">
              <span className="font-bold uppercase tracking-wide text-[16px]">TOTAL TTC :</span>
              <span className="font-bold text-[16px]">{formatCurrency(quote.total)}</span>
            </div>
          </div>
        </div>

        {/* Notes / Terms */}
        {quote.notes && (
          <div className="mt-6 text-sm">
            <div className="font-semibold uppercase mb-1">Notes</div>
            <p className="whitespace-pre-wrap">{quote.notes}</p>
          </div>
        )}

        {quote.terms && (
          <div className="mt-4 text-sm">
            <div className="font-semibold uppercase mb-1">Conditions</div>
            <p className="whitespace-pre-wrap">{quote.terms}</p>
          </div>
        )}

        {/* Payment Mode */}
        <div className="mt-16 text-[16px] leading-[1.7]">
          <div className="font-bold uppercase mb-2 tracking-wide text-[#1a1a1a]">INTITULÉ DU COMPTE : {company.name || 'STE AETHOS TECH SARL'}</div>
          <div className="font-bold uppercase mb-1 text-[#1a1a1a]">
            RIB : 230 640 6333711221011800 40
          </div>
          <div className="font-bold uppercase mb-1 text-[#1a1a1a]">
            IBAN : {company.bank_iban || 'MA64230640633371122101180040'}
          </div>
          <div className="font-bold uppercase text-[#1a1a1a]">
            CODE SWIFT : {company.bank_bic || 'CIHMMAMC'}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-20 pt-4 border-t border-[#2b2b2b]/40 text-xs text-center font-medium leading-relaxed">
          STE AETHOS TECH SARL - ICE N°003619027000094 - RC N°156509 - Siège Social : <br/>
          AV AL QODS L IMCOPA LT 2 1ER ETG N 5 AOUAMA , Tanger - Capital Social(Devise) : 100000,00 MAD
        </div>
      </div>
    </div>
  )
}
