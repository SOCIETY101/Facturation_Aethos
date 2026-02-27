import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, formatDateShort } from '@/lib/utils'
import { TrendingUp, FileText, Receipt, DollarSign } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useMemo, useEffect, useState } from 'react'
import { useCompany } from '@/hooks/useCompany'
import { getClients } from '@/lib/api/clients'
import { getQuotes } from '@/lib/api/quotes'
import { getInvoices } from '@/lib/api/invoices'
import { dbClientToApp, dbInvoiceToApp, dbQuoteToApp } from '@/lib/mappers'
import { Client, Quote, Invoice } from '@/lib/types'

export default function Dashboard() {
  const { company, loading: companyLoading } = useCompany()
  const [clients, setClients] = useState<Client[]>([])
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!company) return

    setLoading(true)
    Promise.all([
      getClients(company.id),
      getQuotes(company.id),
      getInvoices(company.id),
    ])
      .then(([clientsData, quotesData, invoicesData]) => {
        setClients(clientsData.map(dbClientToApp))
        setQuotes(quotesData.map(dbQuoteToApp))
        setInvoices(invoicesData.map(dbInvoiceToApp))
      })
      .catch((error) => {
        console.error('Error loading dashboard data:', error)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [company])

  const metrics = useMemo(() => {
    const totalRevenue = invoices
      .filter((inv) => inv.status === 'paid')
      .reduce((sum, inv) => sum + inv.total, 0)

    const outstandingInvoices = invoices.filter(
      (inv) => inv.status === 'unpaid' || inv.status === 'overdue' || inv.status === 'partial'
    )
    const outstandingAmount = outstandingInvoices.reduce(
      (sum, inv) => {
        const paid = inv.payments.reduce((pSum, p) => pSum + p.amount, 0)
        return sum + (inv.total - paid)
      },
      0
    )

    const pendingQuotes = quotes.filter((q) => q.status === 'sent')

    const thisMonth = new Date()
    thisMonth.setDate(1)
    const paidThisMonth = invoices
      .filter((inv) => {
        if (inv.status !== 'paid') return false
        const invDate = new Date(inv.date)
        return invDate >= thisMonth
      })
      .reduce((sum, inv) => sum + inv.total, 0)

    return {
      totalRevenue,
      outstandingAmount,
      pendingQuotes: pendingQuotes.length,
      paidThisMonth,
    }
  }, [invoices, quotes])

  const recentInvoices = useMemo(
    () =>
      [...invoices]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5),
    [invoices]
  )

  const recentQuotes = useMemo(
    () =>
      [...quotes]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5),
    [quotes]
  )

  const revenueData = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, i) => {
      const date = new Date()
      date.setMonth(date.getMonth() - (5 - i))
      return date
    })

    return months.map((month) => {
      const monthInvoices = invoices.filter((inv) => {
        const invDate = new Date(inv.date)
        return (
          invDate.getMonth() === month.getMonth() &&
          invDate.getFullYear() === month.getFullYear() &&
          inv.status === 'paid'
        )
      })
      const revenue = monthInvoices.reduce((sum, inv) => sum + inv.total, 0)
      return {
        month: month.toLocaleDateString('fr-FR', { month: 'short' }),
        revenue,
      }
    })
  }, [invoices])

  if (companyLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'secondary'> = {
      paid: 'success',
      partial: 'warning',
      sent: 'default',
      unpaid: 'warning',
      overdue: 'destructive',
      draft: 'secondary',
      accepted: 'success',
      rejected: 'destructive',
    }
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your business</p>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.outstandingAmount)}</div>
            <p className="text-xs text-muted-foreground">
              {invoices.filter((inv) => inv.status === 'unpaid' || inv.status === 'overdue' || inv.status === 'partial').length} invoices
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Quotes</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.pendingQuotes}</div>
            <p className="text-xs text-muted-foreground">Awaiting response</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid This Month</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.paidThisMonth)}</div>
            <p className="text-xs text-muted-foreground">Current month</p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Trend</CardTitle>
          <CardDescription>Last 6 months revenue</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Recent Invoices */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Invoices</CardTitle>
                <CardDescription>Last 5 invoices</CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link to="/invoices">View All</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentInvoices.map((invoice) => {
                  const client = clients.find((c) => c.id === invoice.clientId)
                  return (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                      <TableCell>{client?.name || 'Unknown'}</TableCell>
                      <TableCell>{formatCurrency(invoice.total)}</TableCell>
                      <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Recent Quotes */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Quotes</CardTitle>
                <CardDescription>Last 5 quotes</CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link to="/quotes">View All</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quote #</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentQuotes.map((quote) => {
                  const client = clients.find((c) => c.id === quote.clientId)
                  return (
                    <TableRow key={quote.id}>
                      <TableCell className="font-medium">{quote.quoteNumber}</TableCell>
                      <TableCell>{client?.name || 'Unknown'}</TableCell>
                      <TableCell>{formatCurrency(quote.total)}</TableCell>
                      <TableCell>{getStatusBadge(quote.status)}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
