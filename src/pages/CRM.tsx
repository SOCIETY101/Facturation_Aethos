import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Briefcase, CalendarDays, Plus, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCompany } from '@/hooks/useCompany'
import { useAuth } from '@/contexts/AuthContext'
import { getClients } from '@/lib/api/clients'
import { createDeal, DealStage, DealWithRelations, getDeals, getDealStages, updateDeal } from '@/lib/api/crm'
import { formatCurrency, formatDateShort } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'

type ClientOption = { id: string; name: string }

const stageStatus = (stage: DealStage): 'open' | 'won' | 'lost' => {
  if (!stage.is_closed) return 'open'
  return stage.is_won ? 'won' : 'lost'
}

export default function CRM() {
  const { company, loading: companyLoading } = useCompany()
  const { user } = useAuth()
  const { toast } = useToast()
  const [stages, setStages] = useState<DealStage[]>([])
  const [deals, setDeals] = useState<DealWithRelations[]>([])
  const [clients, setClients] = useState<ClientOption[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  useEffect(() => {
    if (!company) return
    setLoading(true)
    Promise.all([getDealStages(company.id), getDeals(company.id), getClients(company.id)])
      .then(([stageData, dealData, clientData]) => {
        setStages(stageData)
        setDeals(dealData)
        setClients(clientData.map((client) => ({ id: client.id, name: client.name })))
      })
      .catch((error) => {
        console.error('Error loading CRM pipeline:', error)
        toast({ title: 'Could not load pipeline', description: 'Please refresh and try again.', variant: 'destructive' })
      })
      .finally(() => setLoading(false))
  }, [company, toast])

  const openDeals = deals.filter((deal) => deal.status === 'open')
  const openValue = openDeals.reduce((total, deal) => total + Number(deal.amount), 0)
  const weightedValue = openDeals.reduce((total, deal) => total + Number(deal.amount) * (deal.probability / 100), 0)

  const stageDeals = useMemo(() => {
    return new Map(stages.map((stage) => [stage.id, deals.filter((deal) => deal.stage_id === stage.id)]))
  }, [deals, stages])

  const handleStageChange = async (deal: DealWithRelations, stageId: string) => {
    const nextStage = stages.find((stage) => stage.id === stageId)
    if (!nextStage) return

    try {
      const updated = await updateDeal(deal.id, {
        stage_id: nextStage.id,
        probability: nextStage.probability,
        status: stageStatus(nextStage),
      })
      setDeals((current) => current.map((item) => (item.id === updated.id ? updated : item)))
    } catch (error) {
      console.error('Error moving deal:', error)
      toast({ title: 'Deal was not moved', description: 'Please try again.', variant: 'destructive' })
    }
  }

  const handleCreateDeal = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!company || stages.length === 0) return
    const form = new FormData(event.currentTarget)
    const clientId = String(form.get('clientId') || '')
    const stageId = String(form.get('stageId') || stages[0].id)
    const stage = stages.find((item) => item.id === stageId) || stages[0]

    if (!clientId) {
      toast({ title: 'Choose an account', description: 'Every opportunity needs a client account.', variant: 'destructive' })
      return
    }

    try {
      const deal = await createDeal({
        company_id: company.id,
        client_id: clientId,
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
      toast({ title: 'Opportunity created', description: 'It is now visible in the sales pipeline.' })
    } catch (error) {
      console.error('Error creating deal:', error)
      toast({ title: 'Could not create opportunity', description: 'Please try again.', variant: 'destructive' })
    }
  }

  if (companyLoading || loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" /></div>
  }

  return (
    <div className="space-y-7">
      <section className="relative overflow-hidden rounded-2xl border border-[#a0302a]/15 bg-[#351311] px-6 py-7 text-white shadow-[0_18px_55px_-30px_rgba(91,20,17,0.9)] md:px-8">
        <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full border border-white/10" />
        <div className="absolute right-12 top-16 h-24 w-24 rounded-full bg-[#e8b46a]/10 blur-2xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#e8b46a]"><Briefcase className="h-4 w-4" /> Revenue desk</div>
            <h1 className="font-serif text-3xl font-semibold tracking-tight md:text-4xl">Keep every opportunity moving.</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-white/70">The pipeline connects relationship work to quotes, invoices, and collected revenue.</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild><Button className="bg-[#e8b46a] text-[#351311] hover:bg-[#f2c980]"><Plus className="mr-2 h-4 w-4" /> New opportunity</Button></DialogTrigger>
            <DialogContent className="sm:max-w-[540px]">
              <form onSubmit={handleCreateDeal}>
                <DialogHeader><DialogTitle>Open a new opportunity</DialogTitle><DialogDescription>Start with the commercial outcome; add notes and contacts from the account workspace.</DialogDescription></DialogHeader>
                <div className="grid gap-4 py-5">
                  <div className="grid gap-2"><Label htmlFor="deal-name">Opportunity name</Label><Input id="deal-name" name="name" placeholder="Website redesign retainer" required /></div>
                  <div className="grid gap-2"><Label>Account</Label><Select name="clientId" required><SelectTrigger><SelectValue placeholder="Choose client" /></SelectTrigger><SelectContent>{clients.map((client) => <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>)}</SelectContent></Select></div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="grid gap-2"><Label>Pipeline stage</Label><Select name="stageId" defaultValue={stages[0]?.id}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{stages.map((stage) => <SelectItem key={stage.id} value={stage.id}>{stage.name} · {stage.probability}%</SelectItem>)}</SelectContent></Select></div>
                    <div className="grid gap-2"><Label htmlFor="amount">Expected value (MAD)</Label><Input id="amount" name="amount" type="number" min="0" step="0.01" placeholder="25000" /></div>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><div className="grid gap-2"><Label htmlFor="expected-close">Expected close</Label><Input id="expected-close" name="expectedCloseDate" type="date" /></div><div className="grid gap-2"><Label htmlFor="source">Source</Label><Input id="source" name="source" placeholder="Referral, LinkedIn…" /></div></div>
                </div>
                <DialogFooter><Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button><Button type="submit">Create opportunity</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <Metric label="Open pipeline" value={formatCurrency(openValue)} detail={`${openDeals.length} active opportunities`} icon={<Briefcase className="h-4 w-4" />} />
        <Metric label="Weighted forecast" value={formatCurrency(weightedValue)} detail="Value adjusted by stage confidence" icon={<TrendingUp className="h-4 w-4" />} />
        <Metric label="Closing this month" value={String(openDeals.filter((deal) => deal.expected_close_date?.startsWith(new Date().toISOString().slice(0, 7))).length)} detail="Opportunities with a close date" icon={<CalendarDays className="h-4 w-4" />} />
      </section>

      {clients.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-12 text-center"><h2 className="font-serif text-xl font-semibold">Create a client account first</h2><p className="mt-2 text-sm text-muted-foreground">Opportunities belong to accounts, so invoices and relationship history remain connected.</p><Button asChild className="mt-5"><Link to="/clients">Go to clients</Link></Button></div>
      ) : (
        <section className="-mx-4 overflow-x-auto px-4 pb-5 lg:-mx-8 lg:px-8">
          <div className="grid min-w-[1050px] grid-flow-col auto-cols-[260px] gap-4">
            {stages.map((stage) => {
              const columnDeals = stageDeals.get(stage.id) || []
              const columnValue = columnDeals.reduce((total, deal) => total + Number(deal.amount), 0)
              return <div key={stage.id} className="rounded-xl border bg-muted/30 p-3">
                <div className="mb-3 flex items-start justify-between px-1"><div><div className="flex items-center gap-2 text-sm font-semibold"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: stage.color }} />{stage.name}</div><p className="mt-1 text-xs text-muted-foreground">{columnDeals.length} deals · {formatCurrency(columnValue)}</p></div><span className="text-xs font-semibold text-muted-foreground">{stage.probability}%</span></div>
                <div className="space-y-3">{columnDeals.map((deal) => <DealCard key={deal.id} deal={deal} stages={stages} onStageChange={handleStageChange} />)}{columnDeals.length === 0 && <div className="rounded-lg border border-dashed bg-background/60 px-3 py-7 text-center text-xs text-muted-foreground">Clear runway</div>}</div>
              </div>
            })}
          </div>
        </section>
      )}
    </div>
  )
}

function Metric({ label, value, detail, icon }: { label: string; value: string; detail: string; icon: React.ReactNode }) {
  return <div className="rounded-xl border bg-card p-5 shadow-[0_8px_25px_-20px_rgba(23,23,23,0.5)]"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{icon}{label}</div><div className="mt-3 font-serif text-2xl font-semibold tracking-tight">{value}</div><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div>
}

function DealCard({ deal, stages, onStageChange }: { deal: DealWithRelations; stages: DealStage[]; onStageChange: (deal: DealWithRelations, stageId: string) => void }) {
  return <article className="group rounded-xl border bg-card p-3.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
    <div className="flex items-start justify-between gap-2"><Link to={`/crm/accounts/${deal.client_id}`} className="min-w-0 text-xs font-medium text-primary hover:underline">{deal.clients?.name}</Link>{deal.status !== 'open' && <Badge variant={deal.status === 'won' ? 'success' : 'destructive'} className="shrink-0 text-[10px]">{deal.status}</Badge>}</div>
    <h3 className="mt-1.5 line-clamp-2 font-medium leading-5">{deal.name}</h3>
    <div className="mt-3 flex items-end justify-between"><div><p className="font-serif text-lg font-semibold">{formatCurrency(Number(deal.amount))}</p><p className="text-[11px] text-muted-foreground">{deal.expected_close_date ? formatDateShort(deal.expected_close_date) : 'No close date'}</p></div><Link to={`/crm/accounts/${deal.client_id}`} className="rounded-md p-1 text-muted-foreground opacity-0 transition hover:bg-muted hover:text-primary group-hover:opacity-100" aria-label={`Open ${deal.clients?.name} account`}><ArrowUpRight className="h-4 w-4" /></Link></div>
    <Select value={deal.stage_id} onValueChange={(stageId) => onStageChange(deal, stageId)}><SelectTrigger className="mt-3 h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent>{stages.map((stage) => <SelectItem key={stage.id} value={stage.id}>{stage.name}</SelectItem>)}</SelectContent></Select>
  </article>
}
