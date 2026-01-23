import { Client, Quote, Invoice, Product, AppSettings, Payment } from './types'

export const mockClients: Client[] = [
  {
    id: '1',
    name: 'Acme Corporation',
    email: 'contact@acme.com',
    phone: '+33 1 23 45 67 89',
    address: '123 Rue de la Paix, 75001 Paris',
    taxId: 'FR12345678901',
    createdAt: '2023-01-15',
  },
  {
    id: '2',
    name: 'TechStart SAS',
    email: 'info@techstart.fr',
    phone: '+33 1 98 76 54 32',
    address: '45 Avenue des Champs, 69000 Lyon',
    taxId: 'FR98765432109',
    createdAt: '2023-02-20',
  },
  {
    id: '3',
    name: 'Design Studio',
    email: 'hello@designstudio.fr',
    phone: '+33 4 12 34 56 78',
    address: '78 Boulevard Saint-Michel, 13000 Marseille',
    createdAt: '2023-03-10',
  },
  {
    id: '4',
    name: 'Global Solutions',
    email: 'contact@globalsolutions.com',
    phone: '+33 1 11 22 33 44',
    address: '12 Place Bellecour, 69002 Lyon',
    taxId: 'FR11223344556',
    createdAt: '2023-04-05',
  },
  {
    id: '5',
    name: 'Digital Agency',
    email: 'info@digitalagency.fr',
    phone: '+33 5 55 66 77 88',
    address: '56 Rue de Rivoli, 75004 Paris',
    createdAt: '2023-05-12',
  },
  {
    id: '6',
    name: 'Innovation Labs',
    email: 'contact@innovationlabs.fr',
    phone: '+33 1 99 88 77 66',
    address: '89 Avenue de la République, 75011 Paris',
    taxId: 'FR99887766554',
    createdAt: '2023-06-18',
  },
  {
    id: '7',
    name: 'Marketing Pro',
    email: 'hello@marketingpro.fr',
    phone: '+33 4 44 55 66 77',
    address: '23 Rue du Commerce, 33000 Bordeaux',
    createdAt: '2023-07-22',
  },
  {
    id: '8',
    name: 'Consulting Group',
    email: 'info@consultinggroup.fr',
    phone: '+33 1 77 66 55 44',
    address: '34 Place de la Bourse, 33000 Bordeaux',
    taxId: 'FR77665544333',
    createdAt: '2023-08-30',
  },
  {
    id: '9',
    name: 'Web Services',
    email: 'contact@webservices.fr',
    phone: '+33 4 33 22 11 00',
    address: '67 Rue de la Soif, 35000 Rennes',
    createdAt: '2023-09-15',
  },
  {
    id: '10',
    name: 'Cloud Solutions',
    email: 'info@cloudsolutions.fr',
    phone: '+33 1 22 33 44 55',
    address: '90 Avenue Jean Jaurès, 31000 Toulouse',
    taxId: 'FR22334455667',
    createdAt: '2023-10-08',
  },
  {
    id: '11',
    name: 'Data Analytics',
    email: 'hello@dataanalytics.fr',
    phone: '+33 5 66 77 88 99',
    address: '45 Rue de la Gare, 67000 Strasbourg',
    createdAt: '2023-11-20',
  },
  {
    id: '12',
    name: 'Software Dev',
    email: 'contact@softwaredev.fr',
    phone: '+33 3 88 99 00 11',
    address: '12 Place Kléber, 67000 Strasbourg',
    taxId: 'FR88990011222',
    createdAt: '2023-12-05',
  },
]

export const mockProducts: Product[] = [
  { id: '1', name: 'Consultation', description: 'Hourly consultation', defaultPrice: 150, defaultTaxRate: 20 },
  { id: '2', name: 'Web Development', description: 'Website development', defaultPrice: 2500, defaultTaxRate: 20 },
  { id: '3', name: 'Design Services', description: 'Graphic design', defaultPrice: 800, defaultTaxRate: 20 },
  { id: '4', name: 'SEO Optimization', description: 'Search engine optimization', defaultPrice: 1200, defaultTaxRate: 20 },
  { id: '5', name: 'Content Writing', description: 'Content creation', defaultPrice: 50, defaultTaxRate: 10 },
  { id: '6', name: 'Social Media Management', description: 'Monthly social media', defaultPrice: 900, defaultTaxRate: 20 },
  { id: '7', name: 'Branding Package', description: 'Complete branding', defaultPrice: 3500, defaultTaxRate: 20 },
  { id: '8', name: 'E-commerce Setup', description: 'Online store setup', defaultPrice: 4500, defaultTaxRate: 20 },
  { id: '9', name: 'Mobile App Development', description: 'iOS/Android app', defaultPrice: 8000, defaultTaxRate: 20 },
  { id: '10', name: 'Hosting', description: 'Monthly hosting', defaultPrice: 25, defaultTaxRate: 20 },
  { id: '11', name: 'Domain Registration', description: 'Yearly domain', defaultPrice: 15, defaultTaxRate: 20 },
  { id: '12', name: 'SSL Certificate', description: 'Yearly SSL', defaultPrice: 80, defaultTaxRate: 20 },
  { id: '13', name: 'Maintenance', description: 'Monthly maintenance', defaultPrice: 300, defaultTaxRate: 20 },
  { id: '14', name: 'Training', description: 'Staff training', defaultPrice: 500, defaultTaxRate: 20 },
  { id: '15', name: 'Support', description: 'Technical support', defaultPrice: 100, defaultTaxRate: 20 },
]

function generateQuotes(): Quote[] {
  const statuses: Quote['status'][] = ['draft', 'sent', 'accepted', 'rejected']
  const quotes: Quote[] = []
  
  for (let i = 1; i <= 25; i++) {
    const clientId = mockClients[Math.floor(Math.random() * mockClients.length)].id
    const status = statuses[Math.floor(Math.random() * statuses.length)]
    const date = new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1)
    const validUntil = new Date(date)
    validUntil.setDate(validUntil.getDate() + 30)
    
    const lineItems = []
    const itemCount = Math.floor(Math.random() * 5) + 1
    for (let j = 0; j < itemCount; j++) {
      const product = mockProducts[Math.floor(Math.random() * mockProducts.length)]
      const quantity = Math.floor(Math.random() * 5) + 1
      lineItems.push({
        id: `${i}-${j}`,
        description: product.name,
        quantity,
        unitPrice: product.defaultPrice,
        taxRate: product.defaultTaxRate,
      })
    }
    
    const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
    const taxAmount = lineItems.reduce((sum, item) => {
      return sum + (item.quantity * item.unitPrice * item.taxRate / 100)
    }, 0)
    const total = subtotal + taxAmount
    
    quotes.push({
      id: `q-${i}`,
      quoteNumber: `QUO-${String(i).padStart(4, '0')}`,
      clientId,
      date: date.toISOString().split('T')[0],
      validUntil: validUntil.toISOString().split('T')[0],
      status,
      lineItems,
      subtotal,
      taxAmount,
      total,
      notes: i % 3 === 0 ? 'Payment terms: Net 30 days' : undefined,
    })
  }
  
  return quotes
}

function generateInvoices(): Invoice[] {
  const statuses: Invoice['status'][] = ['draft', 'sent', 'paid', 'overdue', 'unpaid']
  const invoices: Invoice[] = []
  
  for (let i = 1; i <= 35; i++) {
    const clientId = mockClients[Math.floor(Math.random() * mockClients.length)].id
    const status = statuses[Math.floor(Math.random() * statuses.length)]
    const date = new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1)
    const dueDate = new Date(date)
    dueDate.setDate(dueDate.getDate() + 30)
    
    const lineItems = []
    const itemCount = Math.floor(Math.random() * 5) + 1
    for (let j = 0; j < itemCount; j++) {
      const product = mockProducts[Math.floor(Math.random() * mockProducts.length)]
      const quantity = Math.floor(Math.random() * 5) + 1
      lineItems.push({
        id: `${i}-${j}`,
        description: product.name,
        quantity,
        unitPrice: product.defaultPrice,
        taxRate: product.defaultTaxRate,
      })
    }
    
    const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
    const taxAmount = lineItems.reduce((sum, item) => {
      return sum + (item.quantity * item.unitPrice * item.taxRate / 100)
    }, 0)
    const total = subtotal + taxAmount
    
    const payments: Invoice['payments'] = []
    if (status === 'paid') {
      payments.push({
        id: `p-${i}`,
        date: new Date(date.getTime() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        amount: total,
        method: ['bank_transfer', 'card', 'check'][Math.floor(Math.random() * 3)] as Payment['method'],
      })
    } else if (status === 'unpaid' && Math.random() > 0.5) {
      const partialAmount = total * (0.3 + Math.random() * 0.4)
      payments.push({
        id: `p-${i}`,
        date: new Date(date.getTime() + Math.random() * 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        amount: partialAmount,
        method: 'bank_transfer',
      })
    }
    
    invoices.push({
      id: `inv-${i}`,
      invoiceNumber: `INV-${String(i).padStart(4, '0')}`,
      clientId,
      quoteId: i % 3 === 0 ? `q-${Math.floor(Math.random() * 25) + 1}` : undefined,
      date: date.toISOString().split('T')[0],
      dueDate: dueDate.toISOString().split('T')[0],
      status,
      lineItems,
      subtotal,
      taxAmount,
      total,
      notes: 'Payment terms: Net 30 days',
      payments,
    })
  }
  
  return invoices
}

export const mockQuotes: Quote[] = generateQuotes()
export const mockInvoices: Invoice[] = generateInvoices()

export const defaultSettings: AppSettings = {
  company: {
    name: 'My Company',
    address: '123 Business Street',
    city: 'Paris',
    postalCode: '75001',
    country: 'France',
    taxId: 'FR12345678901',
    bankName: 'Bank Name',
    bankAccount: 'Account Name',
    bankIBAN: 'FR76 1234 5678 9012 3456 7890 123',
    bankBIC: 'BANKFRPP',
  },
  invoice: {
    prefix: 'INV-',
    startingNumber: 1,
    terms: 'Payment is due within 30 days of invoice date. Late payments may incur additional fees.',
  },
  taxRates: [
    { id: '1', name: 'TVA Standard', rate: 20, default: true },
    { id: '2', name: 'TVA Réduite', rate: 10, default: false },
    { id: '3', name: 'TVA Intermédiaire', rate: 5.5, default: false },
  ],
}
