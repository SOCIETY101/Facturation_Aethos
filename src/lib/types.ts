export interface Client {
  id: string
  name: string
  email: string
  phone: string
  address: string
  taxId?: string
  createdAt: string
}

export interface LineItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
  taxRate: number
}

export interface Quote {
  id: string
  quoteNumber: string
  clientId: string
  date: string
  validUntil: string
  status: 'draft' | 'sent' | 'accepted' | 'rejected'
  lineItems: LineItem[]
  subtotal: number
  taxAmount: number
  total: number
  notes?: string
}

export interface Payment {
  id: string
  date: string
  amount: number
  method: 'cash' | 'bank_transfer' | 'check' | 'card' | 'other'
  reference?: string
}

export interface Invoice {
  id: string
  invoiceNumber: string
  clientId: string
  quoteId?: string
  date: string
  dueDate: string
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'unpaid'
  lineItems: LineItem[]
  subtotal: number
  taxAmount: number
  total: number
  notes?: string
  payments: Payment[]
}

export interface Product {
  id: string
  name: string
  description: string
  defaultPrice: number
  defaultTaxRate: number
}

export interface CompanySettings {
  name: string
  logo?: string
  address: string
  city: string
  postalCode: string
  country: string
  taxId: string
  bankName: string
  bankAccount: string
  bankIBAN: string
  bankBIC: string
}

export interface InvoiceSettings {
  prefix: string
  startingNumber: number
  terms: string
}

export interface TaxRate {
  id: string
  name: string
  rate: number
  default: boolean
}

export interface AppSettings {
  company: CompanySettings
  invoice: InvoiceSettings
  taxRates: TaxRate[]
}
