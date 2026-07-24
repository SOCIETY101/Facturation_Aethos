import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpDown, Briefcase, CalendarDays, Plus, Search, SlidersHorizontal, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useCompany } from '@/hooks/useCompany'
import { useAuth } from '@/contexts/AuthContext'
import { getClients } from '@/lib/api/clients'
import { createDeal, DealStage, DealWithRelations, getDeals, getDealStages, updateDeal } from '@/lib/api/crm'
import { formatCurrency, formatDateShort } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'

type ClientOption = { id: string; name: string }
const NO_ACCOUNT = '__none__'

const stageStatus = (stage: DealStage): 'open' | 'won' | 'lost' => !stage.is_closed ? 'open' : stage.is_won ? 'won' : 'lost'

export default function CRM() {
  const { company, loading: companyLoading } = useCompany()
  const { user } = useAuth()
  const { toast } = useToast()
  const [stages, setStages] = useState<DealStage[]>([])
  const [deals, setDeals] = useState<DealWithRelations[]>([])
  const [clients, setClients] = useState<ClientOption[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('open')
  const [accountFilter, setAccountFilter] = useState('all')

  useEffect(() => {
    if (!company) return
    setLoading(true)
    Promise.all([getDealStages(company.id), getDeals(company.id), getClients(company.id)])
      .then(([stageData, dealData, clientData]) => {
        setStages(stageData)
        setDeals(dealData)
        setClients(clientData.map((client) => ({ id: client.id, name: client.name })))
      })
      .catch((error) => { console.error('Error loading CRM opportunities:', error); toast({ title: 'Could not load opportunities', variant: 'destructive' }) })
      .finally(() => setLoading(false))
  }, [company, toast])

  const openDeals = deals.filter((deal) => deal.status === 'open')
  const openValue = openDeals.reduce((total, deal) => total + Number(deal.amount), 0)
  const weightedValue = openDeals.reduce((total, deal) => total + Number(deal.amount) * (deal.probability / 100), 0)
  const month = new Date().toISOString().slice(0, 7)
  const closingThisMonth = openDeals.filter((deal) => deal.expected_close_date?.startsWith(month)).length
  const filteredDeals = useMemo(() => {
    const term = search.trim().toLowerCase()
    return deals.filter((deal) => {
      const matchesSearch = !term || deal.name.toLowerCase().includes(term) || deal.clients?.name.toLowerCase().includes(term) || deal.source?.toLowerCase().includes(term)
      const matchesStage = stageFilter === 'all' || deal.stage_id === stageFilter
      const matchesStatus = statusFilter === 'all' || deal.status === statusFilter
      const matchesAccount = accountFilter === 'all' || (accountFilter === NO_ACCOUNT ? !deal.client_id : deal.client_id === accountFilter)
      return matchesSearch && matchesStage && matchesStatus && matchesAccount
    })
  }, [accountFilter, deals, search, stageFilter, statusFilter])

  const handleStageChange = async (deal: DealWithRelations, stageId: string) => {
    const stage = stages.find((item) => item.id === stageId)
    if (!stage) return
    try {
      const updated = await updateDeal(deal.id, { stage_id: stage.id, probability: stage.probability, status: stageStatus(stage) })
      setDeals((current) => current.map((item) => item.id === updated.id ? updated : item))
    } catch (error) { console.error('Error updating stage:', error); toast({ title: 'Stage was not updated', variant: 'destructive' }) }
  }

  const handleCreateDeal = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!company || !stages.length) return
    const form = new FormData(event.currentTarget)
    const stage = stages.find((item) => item.id === String(form.get('stageId'))) || stages[0]
    const clientId = String(form.get('clientId') || NO_ACCOUNT)
    try {
      const deal = await createDeal({
        company_id: company.id,
        client_id: clientId === NO_ACCOUNT ? null : clientId,
        stage_id: stage.id,
        owner_id: user?.id || null,
        name: String(form.get('name') || ''),
        description: null,
        amount: Number(form.get('amount') || 0),
        expected_close_date: String(form.get('expectedCloseDate') || '') || null,
        probability: stage.probability,
        source: String(form.get('source') || '') || null,
        status: stageStatus(stage),
        lost_reason: null,
        created_by: user?.id || null,
      })
      setDeals((current) => [deal, ...current])
      setIsDialogOpen(false)
      toast({ title: 'Opportunity created', description: clientId === NO_ACCOUNT ? 'Add an account later when you have the details.' : 'It is now in your opportunity list.' })
    } catch (error) { console.error('Error creating deal:', error); toast({ title: 'Could not create opportunity', variant: 'destructive' }) }
  }

  const clearFilters = () => { setSearch(''); setStageFilter('all'); setStatusFilter('open'); setAccountFilter('all') }
  if (companyLoading || loading) return <div className="flex min-h-[60vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" /></div>

  return <div className="space-y-6">
    <section className="flex flex-col gap-4 border-b pb-6 md:flex-row md:items-end md:justify-between"><div><div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary"><Briefcase className="h-4 w-4" /> Opportunities</div><h1 className="font-serif text-3xl font-semibold tracking-tight">Your revenue pipeline</h1><p className="mt-2 text-sm text-muted-foreground">A list-first view for prospecting, qualification, and closing work.</p></div><Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}><DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> New opportunity</Button></DialogTrigger><DialogContent className="sm:max-w-[540px]"><form onSubmit={handleCreateDeal}><DialogHeader><DialogTitle>New opportunity</DialogTitle><DialogDescription>Create the prospect first. You can attach a client account as soon as it is known.</DialogDescription></DialogHeader><div className="grid gap-4 py-5"><div className="grid gap-2"><Label htmlFor="deal-name">Opportunity name</Label><Input id="deal-name" name="name" placeholder="Website redesign retainer" required /></div><div className="grid gap-2"><Label>Account <span className="font-normal text-muted-foreground">(optional)</span></Label><Select name="clientId" defaultValue={NO_ACCOUNT}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value={NO_ACCOUNT}>No account yet</SelectItem>{clients.map((client) => <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>)}</SelectContent></Select></div><div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><div className="grid gap-2"><Label>Stage</Label><Select name="stageId" defaultValue={stages[0]?.id}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{stages.map((stage) => <SelectItem key={stage.id} value={stage.id}>{stage.name} · {stage.probability}%</SelectItem>)}</SelectContent></Select></div><div className="grid gap-2"><Label htmlFor="amount">Expected value (MAD)</Label><Input id="amount" name="amount" min="0" step="0.01" type="number" placeholder="25000" /></div></div><div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><div className="grid gap-2"><Label htmlFor="close-date">Expected close</Label><Input id="close-date" name="expectedCloseDate" type="date" /></div><div className="grid gap-2"><Label htmlFor="source">Source</Label><Input id="source" name="source" placeholder="Referral, LinkedIn…" /></div></div></div><DialogFooter><Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button><Button type="submit">Create opportunity</Button></DialogFooter></form></DialogContent></Dialog></section>
    <section className="grid gap-4 sm:grid-cols-3"><Metric label="Open pipeline" value={formatCurrency(openValue)} detail={`${openDeals.length} active opportunities`} icon={<Briefcase className="h-4 w-4" />} /><Metric label="Weighted forecast" value={formatCurrency(weightedValue)} detail="Stage-weighted potential value" icon={<TrendingUp className="h-4 w-4" />} /><Metric label="Closing this month" value={String(closingThisMonth)} detail="Open opportunities with a close date" icon={<CalendarDays className="h-4 w-4" />} /></section>
    <section className="overflow-hidden rounded-xl border bg-card shadow-[0_12px_35px_-30px_rgba(23,23,23,0.8)]"><div className="flex flex-col gap-3 border-b bg-muted/20 p-4 lg:flex-row lg:items-center"><div className="relative min-w-0 flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9" placeholder="Search opportunities, accounts, or source…" /></div><div className="grid grid-cols-3 gap-2 lg:flex"><Select value={stageFilter} onValueChange={setStageFilter}><SelectTrigger className="w-full lg:w-[150px]"><SelectValue placeholder="Stage" /></SelectTrigger><SelectContent><SelectItem value="all">All stages</SelectItem>{stages.map((stage) => <SelectItem key={stage.id} value={stage.id}>{stage.name}</SelectItem>)}</SelectContent></Select><Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-full lg:w-[125px]"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All status</SelectItem><SelectItem value="open">Open</SelectItem><SelectItem value="won">Won</SelectItem><SelectItem value="lost">Lost</SelectItem></SelectContent></Select><Select value={accountFilter} onValueChange={setAccountFilter}><SelectTrigger className="w-full lg:w-[155px]"><SelectValue placeholder="Account" /></SelectTrigger><SelectContent><SelectItem value="all">All accounts</SelectItem><SelectItem value={NO_ACCOUNT}>Unlinked</SelectItem>{clients.map((client) => <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>)}</SelectContent></Select></div><Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground"><SlidersHorizontal className="mr-2 h-4 w-4" /> Reset</Button></div>
      <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead className="min-w-[260px]">Opportunity</TableHead><TableHead>Account</TableHead><TableHead className="min-w-[165px]">Stage</TableHead><TableHead className="text-right">Value</TableHead><TableHead>Confidence</TableHead><TableHead>Expected close</TableHead><TableHead><span className="inline-flex items-center gap-1">Last updated <ArrowUpDown className="h-3 w-3" /></span></TableHead></TableRow></TableHeader><TableBody>{filteredDeals.length ? filteredDeals.map((deal) => <TableRow key={deal.id} className="group"><TableCell><div><p className="font-medium">{deal.name}</p>{deal.source && <p className="mt-0.5 text-xs text-muted-foreground">{deal.source}</p>}</div></TableCell><TableCell>{deal.clients && deal.client_id ? <Link className="font-medium text-primary hover:underline" to={`/crm/accounts/${deal.client_id}`}>{deal.clients.name}</Link> : <span className="text-sm text-muted-foreground">No account</span>}</TableCell><TableCell><Select value={deal.stage_id} onValueChange={(stageId) => handleStageChange(deal, stageId)}><SelectTrigger className="h-8 min-w-[145px] text-xs"><SelectValue /></SelectTrigger><SelectContent>{stages.map((stage) => <SelectItem key={stage.id} value={stage.id}><span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: stage.color }} />{stage.name}</span></SelectItem>)}</SelectContent></Select></TableCell><TableCell className="text-right font-serif font-semibold">{formatCurrency(Number(deal.amount))}</TableCell><TableCell><Badge variant={deal.status === 'won' ? 'success' : deal.status === 'lost' ? 'destructive' : 'secondary'}>{deal.probability}%</Badge></TableCell><TableCell className="text-sm text-muted-foreground">{deal.expected_close_date ? formatDateShort(deal.expected_close_date) : '—'}</TableCell><TableCell className="text-sm text-muted-foreground">{formatDateShort(deal.updated_at)}</TableCell></TableRow>) : <TableRow><TableCell colSpan={7} className="h-36 text-center text-muted-foreground">No opportunities match this view.</TableCell></TableRow>}</TableBody></Table></div><div className="flex items-center justify-between border-t bg-muted/10 px-4 py-3 text-xs text-muted-foreground"><span>{filteredDeals.length} of {deals.length} opportunities</span><span>List view · filters apply instantly</span></div></section>
  </div>
}

function Metric({ label, value, detail, icon }: { label: string; value: string; detail: string; icon: React.ReactNode }) { return <div className="rounded-xl border bg-card p-5 shadow-[0_8px_25px_-20px_rgba(23,23,23,0.5)]"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{icon}{label}</div><div className="mt-3 font-serif text-2xl font-semibold tracking-tight">{value}</div><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div> }
