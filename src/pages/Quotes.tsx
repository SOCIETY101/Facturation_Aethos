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
import { Plus, Search, Edit, Trash2, FileDown, ArrowRight, Eye } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatCurrency, formatDateShort } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { Quote, LineItem, Client } from '@/lib/types'
import { generateQuotePDF } from '@/lib/pdf'
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

export default function Quotes() {
  const { quotes, clients, invoices, addQuote, updateQuote, deleteQuote, addInvoice } = useStore()
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null)
  const [deleteQuoteId, setDeleteQuoteId] = useState<string | null>(null)
  const [convertQuoteId, setConvertQuoteId] = useState<string | null>(null)

  const filteredQuotes = useMemo(() => {
    let filtered = quotes
    if (statusFilter !== 'all') {
      filtered = filtered.filter((q) => q.status === statusFilter)
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((q) => {
        const client = clients.find((c) => c.id === q.clientId)
        return (
          q.quoteNumber.toLowerCase().includes(query) ||
          client?.name.toLowerCase().includes(query)
        )
      })
    }
    return filtered
  }, [quotes, statusFilter, searchQuery, clients])

  const handleDownloadPDF = (quote: Quote) => {
    const client = clients.find((c) => c.id === quote.clientId)
    if (!client) {
      toast({
        title: 'Error',
        description: 'Client not found',
        variant: 'destructive',
      })
      return
    }
    const settings = useStore.getState().settings
    generateQuotePDF(quote, client, settings)
    toast({
      title: 'PDF generated',
      description: 'Quote PDF has been downloaded.',
    })
  }

  const handleConvertToInvoice = () => {
    if (!convertQuoteId) return
    const quote = quotes.find((q) => q.id === convertQuoteId)
    if (!quote) return

    const dueDate = new Date(quote.date)
    dueDate.setDate(dueDate.getDate() + 30)

    const invoiceNumber = `INV-${String(invoices.length + 1).padStart(4, '0')}`
    const newInvoice = {
      id: `inv-${Date.now()}`,
      invoiceNumber,
      clientId: quote.clientId,
      quoteId: quote.id,
      date: new Date().toISOString().split('T')[0],
      dueDate: dueDate.toISOString().split('T')[0],
      status: 'draft' as const,
      lineItems: quote.lineItems,
      subtotal: quote.subtotal,
      taxAmount: quote.taxAmount,
      total: quote.total,
      notes: quote.notes,
      payments: [],
    }
    addInvoice(newInvoice)
    updateQuote(quote.id, { status: 'accepted' })
    toast({
      title: 'Invoice created',
      description: 'Quote has been converted to an invoice.',
    })
    setConvertQuoteId(null)
  }

  const getStatusBadge = (status: Quote['status']) => {
    const variants: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'secondary'> = {
      draft: 'secondary',
      sent: 'default',
      accepted: 'success',
      rejected: 'destructive',
    }
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Quotes</h1>
          <p className="text-muted-foreground">Manage your quotes</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingQuote(null)}>
              <Plus className="mr-2 h-4 w-4" />
              New Quote
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <QuoteForm
              quote={editingQuote}
              onClose={() => {
                setIsDialogOpen(false)
                setEditingQuote(null)
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search quotes..."
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
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Quote #</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Valid Until</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredQuotes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  No quotes found
                </TableCell>
              </TableRow>
            ) : (
              filteredQuotes.map((quote) => {
                const client = clients.find((c) => c.id === quote.clientId)
                return (
                  <TableRow key={quote.id}>
                    <TableCell className="font-medium">{quote.quoteNumber}</TableCell>
                    <TableCell>{client?.name || 'Unknown'}</TableCell>
                    <TableCell>{formatDateShort(quote.date)}</TableCell>
                    <TableCell>{formatCurrency(quote.total)}</TableCell>
                    <TableCell>{getStatusBadge(quote.status)}</TableCell>
                    <TableCell>{formatDateShort(quote.validUntil)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          asChild
                        >
                          <Link to={`/quotes/${quote.id}/preview`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDownloadPDF(quote)}
                        >
                          <FileDown className="h-4 w-4" />
                        </Button>
                        {quote.status === 'accepted' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setConvertQuoteId(quote.id)}
                          >
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingQuote(quote)
                            setIsDialogOpen(true)
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteQuoteId(quote.id)}
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

      <AlertDialog open={!!deleteQuoteId} onOpenChange={() => setDeleteQuoteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the quote.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteQuoteId) {
                  deleteQuote(deleteQuoteId)
                  toast({
                    title: 'Quote deleted',
                    description: 'Quote has been deleted successfully.',
                  })
                  setDeleteQuoteId(null)
                }
              }}
              className="bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!convertQuoteId} onOpenChange={() => setConvertQuoteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Convert to Invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              This will create a new invoice from this quote. The quote status will be updated to accepted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConvertToInvoice}>
              Convert
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function QuoteForm({ quote, onClose }: { quote: Quote | null; onClose: () => void }) {
  const { clients, quotes, addQuote, updateQuote, settings } = useStore()
  const { toast } = useToast()
  const [clientId, setClientId] = useState(quote?.clientId || '')
  const [date, setDate] = useState(quote?.date || new Date().toISOString().split('T')[0])
  const [validUntil, setValidUntil] = useState(
    quote?.validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  )
  const [status, setStatus] = useState<Quote['status']>(quote?.status || 'draft')
  const [lineItems, setLineItems] = useState<LineItem[]>(
    quote?.lineItems || [
      {
        id: '1',
        description: '',
        quantity: 1,
        unitPrice: 0,
        taxRate: settings.taxRates.find((t) => t.default)?.rate || 20,
      },
    ]
  )
  const [notes, setNotes] = useState(quote?.notes || '')

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

    const quoteData: Quote = {
      id: quote?.id || `q-${Date.now()}`,
      quoteNumber: quote?.quoteNumber || `QUO-${String(quotes.length + 1).padStart(4, '0')}`,
      clientId,
      date,
      validUntil,
      status,
      lineItems,
      subtotal: calculations.subtotal,
      taxAmount: calculations.taxAmount,
      total: calculations.total,
      notes: notes || undefined,
    }

    if (quote) {
      updateQuote(quote.id, quoteData)
      toast({
        title: 'Quote updated',
        description: 'Quote has been updated successfully.',
      })
    } else {
      addQuote(quoteData)
      toast({
        title: 'Quote created',
        description: 'Quote has been created successfully.',
      })
    }
    onClose()
  }

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>{quote ? 'Edit Quote' : 'New Quote'}</DialogTitle>
        <DialogDescription>
          {quote ? 'Update quote information' : 'Create a new quote'}
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
            <Select value={status} onValueChange={(v) => setStatus(v as Quote['status'])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
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
            <Label htmlFor="validUntil">Valid Until *</Label>
            <Input
              id="validUntil"
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
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
        <Button type="submit">{quote ? 'Update' : 'Create'} Quote</Button>
      </DialogFooter>
    </form>
  )
}
