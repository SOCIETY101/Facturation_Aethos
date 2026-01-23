import { useState, useMemo } from 'react'
import { useStore } from '@/store/useStore'
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
import { Plus, Search, Edit, Trash2, FileDown, DollarSign } from 'lucide-react'
import { formatCurrency, formatDateShort } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { Invoice, LineItem, Payment } from '@/lib/types'
import { generateInvoicePDF } from '@/lib/pdf'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function Invoices() {
  const { invoices, clients, addInvoice, updateInvoice, deleteInvoice, addPayment } = useStore()
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null)
  const [deleteInvoiceId, setDeleteInvoiceId] = useState<string | null>(null)
  const [paymentInvoiceId, setPaymentInvoiceId] = useState<string | null>(null)

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
    const settings = useStore.getState().settings
    generateInvoicePDF(invoice, client, settings)
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
      unpaid: 'warning',
      overdue: 'destructive',
    }
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>
  }

  const handleAddPayment = (invoiceId: string, payment: Payment) => {
    addPayment(invoiceId, payment)
    toast({
      title: 'Payment recorded',
      description: 'Payment has been recorded successfully.',
    })
    setPaymentInvoiceId(null)
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
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInvoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
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
                      <div>
                        <div>{formatCurrency(invoice.total)}</div>
                        {remaining > 0 && invoice.status !== 'paid' && (
                          <div className="text-xs text-muted-foreground">
                            Remaining: {formatCurrency(remaining)}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {invoice.status !== 'paid' && remaining > 0 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setPaymentInvoiceId(invoice.id)}
                          >
                            <DollarSign className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDownloadPDF(invoice)}
                        >
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
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteInvoiceId(invoice.id)}
                        >
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
              onClick={() => {
                if (deleteInvoiceId) {
                  deleteInvoice(deleteInvoiceId)
                  toast({
                    title: 'Invoice deleted',
                    description: 'Invoice has been deleted successfully.',
                  })
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
    </div>
  )
}

function InvoiceForm({ invoice, onClose }: { invoice: Invoice | null; onClose: () => void }) {
  const { clients, quotes, invoices, addInvoice, updateInvoice, settings } = useStore()
  const { toast } = useToast()
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
        taxRate: settings.taxRates.find((t) => t.default)?.rate || 20,
      },
    ]
  )
  const [notes, setNotes] = useState(invoice?.notes || '')

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

  const handleAddLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        id: Date.now().toString(),
        description: '',
        quantity: 1,
        unitPrice: 0,
        taxRate: settings.taxRates.find((t) => t.default)?.rate || 20,
      },
    ])
  }

  const handleRemoveLineItem = (id: string) => {
    setLineItems(lineItems.filter((item) => item.id !== id))
  }

  const handleLineItemChange = (id: string, field: keyof LineItem, value: string | number) => {
    setLineItems(
      lineItems.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!clientId) {
      toast({
        title: 'Error',
        description: 'Please select a client',
        variant: 'destructive',
      })
      return
    }

    const invoiceData: Invoice = {
      id: invoice?.id || `inv-${Date.now()}`,
      invoiceNumber: invoice?.invoiceNumber || `INV-${String(invoices.length + 1).padStart(4, '0')}`,
      clientId,
      quoteId: quoteId || undefined,
      date,
      dueDate,
      status,
      lineItems,
      subtotal: calculations.subtotal,
      taxAmount: calculations.taxAmount,
      total: calculations.total,
      notes: notes || undefined,
      payments: invoice?.payments || [],
    }

    if (invoice) {
      updateInvoice(invoice.id, invoiceData)
      toast({
        title: 'Invoice updated',
        description: 'Invoice has been updated successfully.',
      })
    } else {
      addInvoice(invoiceData)
      toast({
        title: 'Invoice created',
        description: 'Invoice has been created successfully.',
      })
    }
    onClose()
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
