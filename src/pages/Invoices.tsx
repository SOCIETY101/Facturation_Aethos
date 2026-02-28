import { useState, useMemo, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Plus, Search, Edit, Trash2, FileDown, DollarSign, Eye } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatCurrency, formatDateShort } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { Invoice, LineItem, Payment, Quote, Client } from '@/lib/types'
import { InvoicePDFCapture } from '@/components/InvoicePDFCapture'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useCompany } from '@/hooks/useCompany'
import { getClients } from '@/lib/api/clients'
import { addPayment as addPaymentApi, createInvoice, deleteInvoice, getInvoice, getInvoices, getNextInvoiceNumber, updateInvoice } from '@/lib/api/invoices'
import { getQuotes } from '@/lib/api/quotes'
import { getTaxRates } from '@/lib/api/company'
import { appLineItemsToInvoiceItems, appPaymentToInsert, dbClientToApp, dbInvoiceToApp, dbQuoteToApp } from '@/lib/mappers'
import { Database } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

export default function Invoices() {
  const { company, loading: companyLoading } = useCompany()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [taxRates, setTaxRates] = useState<Database['public']['Tables']['tax_rates']['Row'][]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null)
  const [deleteInvoiceId, setDeleteInvoiceId] = useState<string | null>(null)
  const [paymentInvoiceId, setPaymentInvoiceId] = useState<string | null>(null)
  const [pdfCaptureInvoice, setPdfCaptureInvoice] = useState<Invoice | null>(null)

  useEffect(() => {
    if (!company) return
    setLoading(true)
    Promise.all([getClients(company.id), getInvoices(company.id), getQuotes(company.id), getTaxRates(company.id)])
      .then(([clientsData, invoicesData, quotesData, taxRatesData]) => {
        setClients(clientsData.map(dbClientToApp))
        setInvoices(invoicesData.map(dbInvoiceToApp))
        setQuotes(quotesData.map(dbQuoteToApp))
        setTaxRates(taxRatesData)
      })
      .catch((error) => {
        console.error('Error loading invoices:', error)
        toast({
          title: 'Error',
          description: 'Failed to load invoices',
          variant: 'destructive',
        })
      })
      .finally(() => {
        setLoading(false)
      })
  }, [company, toast])

  const filteredInvoices = useMemo(() => {
    let filtered = invoices
    if (statusFilter !== 'all') {
      filtered = filtered.filter((inv) => inv.status === statusFilter)
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((inv) => {
        const client = clients.find((c) => c.id === inv.clientId)
        return (
          inv.invoiceNumber.toLowerCase().includes(query) ||
          client?.name.toLowerCase().includes(query)
        )
      })
    }
    return filtered
  }, [invoices, statusFilter, searchQuery, clients])

  const handleDownloadPDF = (invoice: Invoice) => {
    const client = clients.find((c) => c.id === invoice.clientId)
    if (!client) {
      toast({
        title: 'Error',
        description: 'Client not found',
        variant: 'destructive',
      })
      return
    }
    if (!company) return

    setPdfCaptureInvoice(invoice)
  }

  const handlePdfCaptureComplete = () => {
    setPdfCaptureInvoice(null)
    toast({
      title: 'PDF generated',
      description: 'Invoice PDF has been downloaded.',
    })
  }

  const getStatusBadge = (status: Invoice['status']) => {
    const variants: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'secondary'> = {
      draft: 'secondary',
      sent: 'default',
      paid: 'success',
      partial: 'warning',
      unpaid: 'warning',
      overdue: 'destructive',
    }
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>
  }

  const handleAddPayment = async (invoiceId: string, payment: Payment) => {
    try {
      await addPaymentApi(appPaymentToInsert(payment, invoiceId))
      const refreshed = await getInvoice(invoiceId)
      setInvoices((prev) => prev.map((inv) => (inv.id === invoiceId ? dbInvoiceToApp(refreshed) : inv)))
      toast({
        title: 'Payment recorded',
        description: 'Payment has been recorded successfully.',
      })
      setPaymentInvoiceId(null)
    } catch (error) {
      console.error('Error adding payment:', error)
      toast({
        title: 'Error',
        description: 'Failed to record payment',
        variant: 'destructive',
      })
    }
  }

  if (companyLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Invoices</h1>
          <p className="text-muted-foreground">Manage your invoices</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingInvoice(null)}>
              <Plus className="mr-2 h-4 w-4" />
              New Invoice
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <InvoiceForm
              invoice={editingInvoice}
              company={company!}
              clients={clients}
              quotes={quotes}
              taxRates={taxRates}
              onSaved={(saved) => {
                setInvoices((prev) => {
                  const exists = prev.some((inv) => inv.id === saved.id)
                  return exists ? prev.map((inv) => (inv.id === saved.id ? saved : inv)) : [saved, ...prev]
                })
              }}
              onClose={() => {
                setIsDialogOpen(false)
                setEditingInvoice(null)
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search invoices..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
            <SelectItem value="unpaid">Unpaid</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Paid</TableHead>
              <TableHead>Remaining</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInvoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground">
                  No invoices found
                </TableCell>
              </TableRow>
            ) : (
              filteredInvoices.map((invoice) => {
                const client = clients.find((c) => c.id === invoice.clientId)
                const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0)
                const remaining = invoice.total - totalPaid
                return (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                    <TableCell>{client?.name || 'Unknown'}</TableCell>
                    <TableCell>{formatDateShort(invoice.date)}</TableCell>
                    <TableCell>{formatDateShort(invoice.dueDate)}</TableCell>
                    <TableCell>
                      {formatCurrency(invoice.total)}
                    </TableCell>
                    <TableCell>{formatCurrency(totalPaid)}</TableCell>
                    <TableCell>{formatCurrency(remaining)}</TableCell>
                    <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" asChild>
                          <Link to={`/invoices/${invoice.id}/preview`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        {invoice.status !== 'paid' && remaining > 0 && (
                          <Button variant="ghost" size="icon" onClick={() => setPaymentInvoiceId(invoice.id)}>
                            <DollarSign className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => handleDownloadPDF(invoice)}>
                          <FileDown className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingInvoice(invoice)
                            setIsDialogOpen(true)
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteInvoiceId(invoice.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deleteInvoiceId} onOpenChange={() => setDeleteInvoiceId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the invoice.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!deleteInvoiceId) return
                try {
                  await deleteInvoice(deleteInvoiceId)
                  setInvoices((prev) => prev.filter((inv) => inv.id !== deleteInvoiceId))
                  toast({
                    title: 'Invoice deleted',
                    description: 'Invoice has been deleted successfully.',
                  })
                } catch (error) {
                  console.error('Error deleting invoice:', error)
                  toast({
                    title: 'Error',
                    description: 'Failed to delete invoice',
                    variant: 'destructive',
                  })
                } finally {
                  setDeleteInvoiceId(null)
                }
              }}
              className="bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {paymentInvoiceId && (
        <PaymentDialog
          invoiceId={paymentInvoiceId}
          invoice={invoices.find((inv) => inv.id === paymentInvoiceId)!}
          onClose={() => setPaymentInvoiceId(null)}
          onSave={handleAddPayment}
        />
      )}

      {pdfCaptureInvoice && company && (
        <InvoicePDFCapture
          invoice={pdfCaptureInvoice}
          client={clients.find((c) => c.id === pdfCaptureInvoice.clientId)!}
          company={company}
          onComplete={handlePdfCaptureComplete}
        />
      )}
    </div>
  )
}

function InvoiceForm({
  invoice,
  company,
  clients,
  quotes,
  taxRates,
  onClose,
  onSaved,
}: {
  invoice: Invoice | null
  company: Database['public']['Tables']['companies']['Row']
  clients: Client[]
  quotes: Quote[]
  taxRates: Database['public']['Tables']['tax_rates']['Row'][]
  onClose: () => void
  onSaved: (invoice: Invoice) => void
}) {
  const { toast } = useToast()
  const { user } = useAuth()
  const [clientId, setClientId] = useState(invoice?.clientId || '')
  const [quoteId, setQuoteId] = useState(invoice?.quoteId || '')
  const [date, setDate] = useState(invoice?.date || new Date().toISOString().split('T')[0])
  const [dueDate, setDueDate] = useState(
    invoice?.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  )
  const [status, setStatus] = useState<Invoice['status']>(invoice?.status || 'draft')
  const [lineItems, setLineItems] = useState<LineItem[]>(
    invoice?.lineItems || [
      {
        id: '1',
        description: '',
        quantity: 1,
        unitPrice: 0,
        taxRate: taxRates.find((t) => t.is_default)?.rate || 20,
      },
    ]
  )
  const [notes, setNotes] = useState(invoice?.notes || '')
  const [payments, setPayments] = useState<Payment[]>(invoice?.payments || [])
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [paymentMethod, setPaymentMethod] = useState<Payment['method']>('bank_transfer')
  const [paymentReference, setPaymentReference] = useState('')

  useEffect(() => {
    setPayments(invoice?.payments || [])
    setStatus(invoice?.status || 'draft')
  }, [invoice?.id])

  const availableQuotes = useMemo(
    () => quotes.filter((q) => q.clientId === clientId && q.status === 'accepted'),
    [quotes, clientId]
  )

  const handleQuoteSelect = (selectedQuoteId: string) => {
    const quote = quotes.find((q) => q.id === selectedQuoteId)
    if (quote) {
      setQuoteId(selectedQuoteId)
      setLineItems(quote.lineItems)
    }
  }

  const calculations = useMemo(() => {
    const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
    const taxAmount = lineItems.reduce((sum, item) => {
      return sum + (item.quantity * item.unitPrice * item.taxRate) / 100
    }, 0)
    const total = subtotal + taxAmount
    return { subtotal, taxAmount, total }
  }, [lineItems])

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0)
  const paymentTotal = invoice ? invoice.total : calculations.total
  const remaining = paymentTotal - totalPaid

  const handleAddLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        id: Date.now().toString(),
        description: '',
        quantity: 1,
        unitPrice: 0,
        taxRate: taxRates.find((t) => t.is_default)?.rate || 20,
      },
    ])
  }

  const handleRemoveLineItem = (id: string) => {
    setLineItems(lineItems.filter((item) => item.id !== id))
  }

  const handleLineItemChange = (id: string, field: keyof LineItem, value: string | number) => {
    setLineItems(lineItems.map((item) => (item.id === id ? { ...item, [field]: value } : item)))
  }

  const handleAddPaymentInline = async () => {
    if (!invoice) return
    const amount = parseFloat(paymentAmount)
    if (Number.isNaN(amount) || amount <= 0 || amount > remaining) {
      toast({
        title: 'Error',
        description: `Payment amount must be between 0 and ${formatCurrency(remaining)}`,
        variant: 'destructive',
      })
      return
    }

    try {
      await addPaymentApi(appPaymentToInsert({
        id: `p-${Date.now()}`,
        date: paymentDate,
        amount,
        method: paymentMethod,
        reference: paymentReference || undefined,
      }, invoice.id, user?.id))

      const refreshed = await getInvoice(invoice.id)
      const updated = dbInvoiceToApp(refreshed)
      setPayments(updated.payments)
      setStatus(updated.status)
      onSaved(updated)

      setPaymentAmount('')
      setPaymentReference('')
      toast({
        title: 'Payment recorded',
        description: 'Payment has been recorded successfully.',
      })
    } catch (error) {
      console.error('Error recording payment:', error)
      toast({
        title: 'Error',
        description: 'Failed to record payment',
        variant: 'destructive',
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clientId) {
      toast({
        title: 'Error',
        description: 'Please select a client',
        variant: 'destructive',
      })
      return
    }

    try {
      if (invoice) {
        const updated = await updateInvoice(
          invoice.id,
          {
            client_id: clientId,
            quote_id: quoteId || null,
            date,
            due_date: dueDate,
            status,
            subtotal: calculations.subtotal,
            tax_amount: calculations.taxAmount,
            total: calculations.total,
            notes: notes || null,
            terms: null,
          },
          appLineItemsToInvoiceItems(lineItems)
        )
        onSaved(dbInvoiceToApp(updated))
        toast({
          title: 'Invoice updated',
          description: 'Invoice has been updated successfully.',
        })
      } else {
        const nextNumber = await getNextInvoiceNumber(company.id, company.invoice_prefix)
        const invoiceNumber = `${company.invoice_prefix}${String(nextNumber).padStart(4, '0')}`
        const created = await createInvoice(
          {
            company_id: company.id,
            client_id: clientId,
            quote_id: quoteId || null,
            status,
            date,
            due_date: dueDate,
            subtotal: calculations.subtotal,
            tax_amount: calculations.taxAmount,
            total: calculations.total,
            paid_amount: 0,
            balance: calculations.total,
            notes: notes || null,
            terms: null,
            created_by: null,
          },
          appLineItemsToInvoiceItems(lineItems),
          invoiceNumber
        )
        onSaved(dbInvoiceToApp(created))
        toast({
          title: 'Invoice created',
          description: 'Invoice has been created successfully.',
        })
      }
      onClose()
    } catch (error) {
      console.error('Error saving invoice:', error)
      toast({
        title: 'Error',
        description: 'Failed to save invoice',
        variant: 'destructive',
      })
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>{invoice ? 'Edit Invoice' : 'New Invoice'}</DialogTitle>
        <DialogDescription>
          {invoice ? 'Update invoice information' : 'Create a new invoice'}
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="client">Client *</Label>
            <Select value={clientId} onValueChange={setClientId} required>
              <SelectTrigger>
                <SelectValue placeholder="Select a client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as Invoice['status'])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {availableQuotes.length > 0 && !invoice && (
          <div className="grid gap-2">
            <Label htmlFor="quote">Convert from Quote (optional)</Label>
            <Select value={quoteId} onValueChange={handleQuoteSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Select a quote to convert" />
              </SelectTrigger>
              <SelectContent>
                {availableQuotes.map((quote) => (
                  <SelectItem key={quote.id} value={quote.id}>
                    {quote.quoteNumber} - {formatCurrency(quote.total)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="date">Date *</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="dueDate">Due Date *</Label>
            <Input
              id="dueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Line Items</Label>
            <Button type="button" variant="outline" size="sm" onClick={handleAddLineItem}>
              Add Item
            </Button>
          </div>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-24">Quantity</TableHead>
                  <TableHead className="w-32">Unit Price</TableHead>
                  <TableHead className="w-24">Tax %</TableHead>
                  <TableHead className="w-32">Total</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lineItems.map((item) => {
                  const itemTotal = item.quantity * item.unitPrice
                  const itemTax = itemTotal * (item.taxRate / 100)
                  const itemTotalWithTax = itemTotal + itemTax
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Input
                          value={item.description}
                          onChange={(e) =>
                            handleLineItemChange(item.id, 'description', e.target.value)
                          }
                          placeholder="Description"
                          required
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.quantity}
                          onChange={(e) =>
                            handleLineItemChange(item.id, 'quantity', parseFloat(e.target.value) || 0)
                          }
                          required
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) =>
                            handleLineItemChange(item.id, 'unitPrice', parseFloat(e.target.value) || 0)
                          }
                          required
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="0.1"
                          value={item.taxRate}
                          onChange={(e) =>
                            handleLineItemChange(item.id, 'taxRate', parseFloat(e.target.value) || 0)
                          }
                          required
                        />
                      </TableCell>
                      <TableCell>{formatCurrency(itemTotalWithTax)}</TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveLineItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="flex justify-end gap-4 border-t pt-4">
          <div className="text-right space-y-1">
            <div className="text-sm text-muted-foreground">Subtotal HT: {formatCurrency(calculations.subtotal)}</div>
            <div className="text-sm text-muted-foreground">TVA: {formatCurrency(calculations.taxAmount)}</div>
            <div className="text-lg font-bold">Total TTC: {formatCurrency(calculations.total)}</div>
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional notes or terms..."
            rows={3}
          />
        </div>

        {invoice && (
          <div className="mt-4 border-t pt-4 space-y-3">
            <div className="font-semibold">Payments</div>
            <div className="text-sm text-muted-foreground">
              Paid: {formatCurrency(totalPaid)} — Remaining: {formatCurrency(remaining)}
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="paymentAmount">Payment Amount</Label>
                <Input
                  id="paymentAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  max={remaining}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder={formatCurrency(remaining)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="paymentDate">Payment Date</Label>
                <Input
                  id="paymentDate"
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="paymentMethod">Payment Method</Label>
                <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as Payment['method'])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="check">Check</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="paymentReference">Reference</Label>
                <Input
                  id="paymentReference"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="Payment reference or check number"
                />
              </div>
            </div>
            <Button type="button" onClick={handleAddPaymentInline}>
              Record Payment
            </Button>

            {payments.length > 0 && (
              <div className="text-sm text-muted-foreground space-y-1">
                {payments.map((payment) => (
                  <div key={payment.id}>
                    {payment.date} — {formatCurrency(payment.amount)} ({payment.method})
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit">{invoice ? 'Update' : 'Create'} Invoice</Button>
      </DialogFooter>
    </form>
  )
}

function PaymentDialog({
  invoiceId,
  invoice,
  onClose,
  onSave,
}: {
  invoiceId: string
  invoice: Invoice
  onClose: () => void
  onSave: (invoiceId: string, payment: Payment) => void
}) {
  const { toast } = useToast()
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [method, setMethod] = useState<Payment['method']>('bank_transfer')
  const [reference, setReference] = useState('')

  const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0)
  const remaining = invoice.total - totalPaid

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const paymentAmount = parseFloat(amount)
    if (paymentAmount <= 0 || paymentAmount > remaining) {
      toast({
        title: 'Error',
        description: `Payment amount must be between 0 and ${formatCurrency(remaining)}`,
        variant: 'destructive',
      })
      return
    }

    const payment: Payment = {
      id: `p-${Date.now()}`,
      date,
      amount: paymentAmount,
      method,
      reference: reference || undefined,
    }

    onSave(invoiceId, payment)
  }

  return (
    <Dialog open={!!invoiceId} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>
            Invoice {invoice.invoiceNumber} - Total: {formatCurrency(invoice.total)} - Remaining:{' '}
            {formatCurrency(remaining)}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                type="number"
                min="0"
                step="0.01"
                max={remaining}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={formatCurrency(remaining)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="method">Payment Method *</Label>
              <Select value={method} onValueChange={(v) => setMethod(v as Payment['method'])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="reference">Reference</Label>
              <Input
                id="reference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Payment reference or check number"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Record Payment</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
