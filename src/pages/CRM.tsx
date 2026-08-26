import { DragEvent as ReactDragEvent, PointerEvent as ReactPointerEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import {
  ArrowRight, ArrowUpRight, Building2, CalendarClock, ChevronRight,
  AlertCircle, Clock3, ExternalLink, GripVertical, LayoutGrid, ListFilter, Plus, Search,
  Sparkles, Target, TrendingUp, UsersRound, X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCompany } from '@/hooks/useCompany'
import { useAuth } from '@/contexts/AuthContext'
import {
  createDeal, CrmAccount, DealStage, DealWithRelations, getAccounts, getDeals,
  getDealStages, importCrmSheet, updateDeal,
} from '@/lib/api/crm'
import { formatCurrency, formatDateShort } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

type WorkspaceView = 'pipeline' | 'accounts'

const today = () => new Date().toLocaleDateString('en-CA')

export default function CRM() {
  const { company, loading: companyLoading } = useCompany()
  const { user } = useAuth()
  const { toast } = useToast()
  const [stages, setStages] = useState<DealStage[]>([])
  const [deals, setDeals] = useState<DealWithRelations[]>([])
  const [accounts, setAccounts] = useState<CrmAccount[]>([])
  const [view, setView] = useState<WorkspaceView>('pipeline')
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [selectedDeal, setSelectedDeal] = useState<DealWithRelations | null>(null)
  const [search, setSearch] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [relationshipFilter, setRelationshipFilter] = useState('all')

  const loadWorkspace = useCallback(async () => {
    if (!company) return
    setLoading(true)
    setLoadError(null)
    try {
      setImporting(true)
      await importCrmSheet(company.id, user?.id || null)
      const [stageData, dealData, accountData] = await Promise.all([
        getDealStages(company.id), getDeals(company.id), getAccounts(company.id),
      ])
      setStages(stageData)
      setDeals(dealData)
      setAccounts(accountData)
    } catch (error) {
      console.error('Error loading revenue workspace:', error)
      const message = error instanceof Error ? error.message : 'The CRM workspace could not be loaded.'
      setLoadError(message)
    } finally {
      setImporting(false)
      setLoading(false)
    }
  }, [company, user?.id])

  useEffect(() => { void loadWorkspace() }, [loadWorkspace])

  const openDeals = deals.filter((deal) => deal.status === 'open')
  const openValue = openDeals.reduce((total, deal) => total + Number(deal.amount), 0)
  const weightedValue = openDeals.reduce((total, deal) => total + Number(deal.amount) * deal.probability / 100, 0)
  const urgentDeals = openDeals.filter((deal) => deal.next_follow_up_at && deal.next_follow_up_at <= today())
  const dueToday = urgentDeals.filter((deal) => deal.next_follow_up_at === today()).length

  const filteredDeals = useMemo(() => {
    const term = search.trim().toLowerCase()
    return deals.filter((deal) => {
      const account = deal.crm_accounts?.name || deal.clients?.name || ''
      const matchesTerm = !term || `${deal.name} ${account} ${deal.description || ''}`.toLowerCase().includes(term)
      return matchesTerm && (priorityFilter === 'all' || deal.priority === priorityFilter)
    })
  }, [deals, priorityFilter, search])

  const filteredAccounts = useMemo(() => {
    const term = search.trim().toLowerCase()
    return accounts.filter((account) => {
      const matchesTerm = !term || `${account.name} ${account.industry || ''} ${account.country || ''}`.toLowerCase().includes(term)
      return matchesTerm && (relationshipFilter === 'all' || account.relationship_type === relationshipFilter)
    })
  }, [accounts, relationshipFilter, search])

  const handleStageChange = async (deal: DealWithRelations, stageId: string) => {
    const stage = stages.find((item) => item.id === stageId)
    if (!stage || deal.stage_id === stageId) return
    const status = !stage.is_closed ? 'open' : stage.is_won ? 'won' : 'lost'
    const optimistic: DealWithRelations = {
      ...deal,
      stage_id: stage.id,
      probability: stage.probability,
      status,
      deal_stages: stage,
    }
    setDeals((current) => current.map((item) => item.id === deal.id ? optimistic : item))
    setSelectedDeal((current) => current?.id === deal.id ? optimistic : current)
    try {
      const updated = await updateDeal(deal.id, { stage_id: stage.id, probability: stage.probability, status })
      setDeals((current) => current.map((item) => item.id === updated.id ? updated : item))
      setSelectedDeal((current) => current?.id === updated.id ? updated : current)
      toast({ title: `Moved to ${stage.name}`, description: 'Forecast and pipeline totals are now up to date.' })
    } catch (error) {
      console.error('Error updating stage:', error)
      setDeals((current) => current.map((item) => item.id === deal.id ? deal : item))
      setSelectedDeal((current) => current?.id === deal.id ? deal : current)
      toast({ title: 'Stage was not updated', description: 'The card has been returned to its previous lane.', variant: 'destructive' })
    }
  }

  const handleCreateDeal = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!company || !stages.length) return
    const form = new FormData(event.currentTarget)
    const stage = stages.find((item) => item.id === String(form.get('stageId'))) || stages[0]
    const accountId = String(form.get('accountId') || '') || null
    try {
      const deal = await createDeal({
        company_id: company.id, client_id: null, account_id: accountId, stage_id: stage.id,
        owner_id: user?.id || null, name: String(form.get('name') || ''), description: String(form.get('description') || '') || null,
        amount: Number(form.get('amount') || 0), expected_close_date: String(form.get('expectedCloseDate') || '') || null,
        probability: stage.probability, source: String(form.get('source') || '') || null,
        status: !stage.is_closed ? 'open' : stage.is_won ? 'won' : 'lost', lost_reason: null,
        priority: String(form.get('priority') || 'medium') as 'low' | 'medium' | 'high',
        next_follow_up_at: String(form.get('nextFollowUp') || '') || null, created_by: user?.id || null,
      })
      setDeals((current) => [deal, ...current])
      setCreateOpen(false)
      toast({ title: 'Opportunity created', description: 'It is ready for its first next action.' })
    } catch (error) {
      console.error('Error creating deal:', error)
      toast({ title: 'Could not create opportunity', variant: 'destructive' })
    }
  }

  if (companyLoading || loading) return <WorkspaceSkeleton importing={importing} />
  if (loadError) return <MigrationState message={loadError} onRetry={loadWorkspace} />

  return (
    <div className="crm-workspace -mx-4 -mt-6 min-h-[calc(100vh-4rem)] px-4 pb-12 pt-6 lg:-mx-8 lg:px-8">
      <section className="mx-auto max-w-[1680px]">
        <header className="flex flex-col gap-6 pb-7 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8f2f2a]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#a0302a] shadow-[0_0_0_4px_rgba(160,48,42,.1)]" />
              Revenue room
            </div>
            <h1 className="font-crm-display text-[clamp(2rem,4vw,3.75rem)] font-semibold leading-[0.96] tracking-[-0.045em] text-[#171614]">
              Make the next move obvious.
            </h1>
            <p className="mt-4 max-w-xl text-[15px] leading-6 text-[#6f6a63]">
              Accounts, opportunities, and follow-ups from your Aethos tracker—now shaped into one focused sales workflow.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ViewSwitch view={view} onChange={setView} />
            <CreateDealDialog open={createOpen} onOpenChange={setCreateOpen} accounts={accounts} stages={stages} onSubmit={handleCreateDeal} />
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Open pipeline" value={formatCurrency(openValue)} detail={`${openDeals.length} live opportunities`} icon={<Target />} tone="dark" />
          <MetricCard label="Weighted forecast" value={formatCurrency(weightedValue)} detail="Confidence-adjusted value" icon={<TrendingUp />} />
          <MetricCard label="Needs attention" value={String(urgentDeals.length)} detail={`${dueToday} due today`} icon={<AlertCircle />} tone={urgentDeals.length ? 'urgent' : 'plain'} />
          <MetricCard label="Relationships" value={String(accounts.length)} detail={`${accounts.filter((a) => a.relationship_type === 'prospect').length} prospects · ${accounts.filter((a) => a.lifecycle_status === 'customer').length} active clients`} icon={<UsersRound />} />
        </section>

        {urgentDeals.length > 0 && (
          <section className="mt-4 rounded-[22px] border border-[#dfd8cf] bg-[rgba(255,255,255,.72)] p-3 shadow-[0_22px_50px_-44px_rgba(40,32,24,.65)] backdrop-blur-xl">
            <div className="flex items-center justify-between px-2 pb-2 pt-1">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#2a2723]"><Clock3 className="h-4 w-4 text-[#a0302a]" /> Today’s pressure points</div>
              <span className="text-xs text-[#807970]">Ordered by follow-up date</span>
            </div>
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
              {urgentDeals.slice(0, 4).map((deal) => (
                <button key={deal.id} onClick={() => setSelectedDeal(deal)} className="crm-press group rounded-2xl border border-[#ebe6df] bg-white p-4 text-left shadow-[0_12px_30px_-28px_rgba(25,20,16,.7)]">
                  <div className="flex items-start justify-between gap-3">
                    <p className="line-clamp-1 text-sm font-semibold text-[#24211e]">{deal.crm_accounts?.name || deal.clients?.name || deal.name}</p>
                    <ArrowUpRight className="h-4 w-4 shrink-0 text-[#aaa197] transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#a0302a]" />
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-[#777067]">{deal.next_action || deal.name}</p>
                  <div className="mt-3 flex items-center justify-between"><DuePill date={deal.next_follow_up_at} /><PriorityDot priority={deal.priority} /></div>
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="mt-5 overflow-hidden rounded-[26px] border border-[#ddd7cf] bg-[rgba(251,250,248,.86)] shadow-[0_32px_80px_-64px_rgba(30,24,18,.8)] backdrop-blur-xl">
          <div className="flex flex-col gap-3 border-b border-[#e5e0da] p-4 lg:flex-row lg:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#938b82]" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} className="h-11 rounded-xl border-[#ded8d0] bg-white/80 pl-10 shadow-none" placeholder={view === 'pipeline' ? 'Search opportunity, account, or need…' : 'Search account, industry, or country…'} />
              {search && <button onClick={() => setSearch('')} className="crm-press absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-[#958d84]" aria-label="Clear search"><X className="h-4 w-4" /></button>}
            </div>
            <div className="flex items-center gap-2">
              <ListFilter className="hidden h-4 w-4 text-[#8c847b] sm:block" />
              {view === 'pipeline' ? (
                <Select value={priorityFilter} onValueChange={setPriorityFilter}><SelectTrigger className="h-11 w-[150px] rounded-xl bg-white"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All priorities</SelectItem><SelectItem value="high">High priority</SelectItem><SelectItem value="medium">Medium priority</SelectItem><SelectItem value="low">Low priority</SelectItem></SelectContent></Select>
              ) : (
                <Select value={relationshipFilter} onValueChange={setRelationshipFilter}><SelectTrigger className="h-11 w-[170px] rounded-xl bg-white"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All relationships</SelectItem><SelectItem value="prospect">Prospects</SelectItem><SelectItem value="active_client">Active clients</SelectItem><SelectItem value="client_project">Client projects</SelectItem><SelectItem value="former_client">Former clients</SelectItem><SelectItem value="reference">References</SelectItem></SelectContent></Select>
              )}
            </div>
          </div>

          {view === 'pipeline' ? (
            <PipelineBoard stages={stages} deals={filteredDeals} onSelect={setSelectedDeal} onStageChange={handleStageChange} />
          ) : (
            <AccountsView accounts={filteredAccounts} />
          )}
        </section>
      </section>

      <DealInspector deal={selectedDeal} stages={stages} onClose={() => setSelectedDeal(null)} onStageChange={handleStageChange} />
    </div>
  )
}

function ViewSwitch({ view, onChange }: { view: WorkspaceView; onChange: (view: WorkspaceView) => void }) {
  return <div className="inline-flex h-11 items-center rounded-xl border border-[#dcd5cd] bg-white/75 p-1 shadow-[0_10px_26px_-24px_rgba(30,24,18,.8)] backdrop-blur-xl">
    {(['pipeline', 'accounts'] as const).map((item) => <button key={item} onClick={() => onChange(item)} className={cn('crm-press flex h-8 items-center gap-2 rounded-lg px-3 text-xs font-semibold capitalize text-[#716a62]', view === item && 'bg-[#1e1c1a] text-white shadow-sm')}><LayoutGrid className="h-3.5 w-3.5" />{item}</button>)}
  </div>
}

function MetricCard({ label, value, detail, icon, tone = 'plain' }: { label: string; value: string; detail: string; icon: React.ReactElement; tone?: 'plain' | 'dark' | 'urgent' }) {
  return <div className={cn('relative overflow-hidden rounded-[22px] border p-5', tone === 'dark' ? 'border-[#201e1b] bg-[#211f1c] text-white' : tone === 'urgent' ? 'border-[#e4c5be] bg-[#fff8f5]' : 'border-[#ded8d0] bg-white/75 text-[#211f1c]')}>
    <div className="flex items-center justify-between"><span className={cn('text-[11px] font-semibold uppercase tracking-[0.14em]', tone === 'dark' ? 'text-white/55' : 'text-[#837b72]')}>{label}</span><span className={cn('[&>svg]:h-4 [&>svg]:w-4', tone === 'urgent' ? 'text-[#a0302a]' : tone === 'dark' ? 'text-[#d8b3a8]' : 'text-[#8c837a]')}>{icon}</span></div>
    <p className="mt-5 font-crm-display text-[1.7rem] font-semibold leading-none tracking-[-0.035em]">{value}</p>
    <p className={cn('mt-2 text-xs', tone === 'dark' ? 'text-white/50' : 'text-[#817970]')}>{detail}</p>
    {tone === 'dark' && <span className="absolute -bottom-12 -right-12 h-28 w-28 rounded-full bg-[#a0302a]/25 blur-2xl" />}
  </div>
}

interface PipelineDrag {
  deal: DealWithRelations
  pointerId: number
  startX: number
  startY: number
  x: number
  y: number
  grabX: number
  grabY: number
  width: number
  height: number
  velocityX: number
  lastX: number
  lastAt: number
  active: boolean
  overStageId: string | null
}

function PipelineBoard({ stages, deals, onSelect, onStageChange }: { stages: DealStage[]; deals: DealWithRelations[]; onSelect: (deal: DealWithRelations) => void; onStageChange: (deal: DealWithRelations, stageId: string) => void }) {
  const [drag, setDrag] = useState<PipelineDrag | null>(null)
  const [nativeDrag, setNativeDrag] = useState<{ deal: DealWithRelations; overStageId: string | null } | null>(null)
  const dragRef = useRef<PipelineDrag | null>(null)
  const commitDrag = (next: PipelineDrag | null) => { dragRef.current = next; setDrag(next) }

  const startDrag = (event: ReactPointerEvent<HTMLButtonElement>, deal: DealWithRelations) => {
    // Mouse uses the browser's native drag lifecycle; touch/pen stay 1:1 with Pointer Events.
    if (event.pointerType === 'mouse' || event.button !== 0) return
    const card = event.currentTarget.closest<HTMLElement>('[data-deal-card]')
    if (!card) return
    const bounds = card.getBoundingClientRect()
    event.currentTarget.setPointerCapture(event.pointerId)
    commitDrag({ deal, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, x: event.clientX, y: event.clientY, grabX: event.clientX - bounds.left, grabY: event.clientY - bounds.top, width: bounds.width, height: bounds.height, velocityX: 0, lastX: event.clientX, lastAt: event.timeStamp, active: false, overStageId: deal.stage_id })
  }

  const moveDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const current = dragRef.current
    if (!current || current.pointerId !== event.pointerId) return
    const active = current.active || Math.hypot(event.clientX - current.startX, event.clientY - current.startY) >= 8
    if (active) event.preventDefault()
    const hit = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-stage-id]')
    const elapsed = Math.max(1, event.timeStamp - current.lastAt)
    commitDrag({ ...current, x: event.clientX, y: event.clientY, velocityX: ((event.clientX - current.lastX) / elapsed) * 1000, lastX: event.clientX, lastAt: event.timeStamp, active, overStageId: hit?.dataset.stageId || null })
  }

  const endDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const current = dragRef.current
    if (!current || current.pointerId !== event.pointerId) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    commitDrag(null)
    if (current.active && current.overStageId && current.overStageId !== current.deal.stage_id) onStageChange(current.deal, current.overStageId)
  }

  const startNativeDrag = (event: ReactDragEvent<HTMLButtonElement>, deal: DealWithRelations) => {
    const card = event.currentTarget.closest<HTMLElement>('[data-deal-card]')
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', deal.id)
    if (card) event.dataTransfer.setDragImage(card, Math.min(event.nativeEvent.offsetX, card.offsetWidth - 1), Math.min(event.nativeEvent.offsetY, card.offsetHeight - 1))
    setNativeDrag({ deal, overStageId: deal.stage_id })
  }

  const dropNativeDrag = (event: ReactDragEvent<HTMLElement>, stageId: string) => {
    event.preventDefault()
    const current = nativeDrag
    setNativeDrag(null)
    if (current && current.deal.stage_id !== stageId) onStageChange(current.deal, stageId)
  }

  return <div>
    <div className="flex items-center justify-between border-b border-[#e8e3dd] px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8f877e]">
      <span>{deals.length} opportunities shown</span>
      <span className="flex items-center gap-1.5"><GripVertical className="h-3.5 w-3.5" /> Drag the grip to move a deal</span>
    </div>
    <div className="overflow-x-auto p-4 pb-6">
      <div className="grid auto-cols-[minmax(240px,1fr)] grid-flow-col gap-3" style={{ minWidth: Math.max(1180, stages.length * 252) }}>
        {stages.map((stage) => {
          const stageDeals = deals.filter((deal) => deal.stage_id === stage.id)
          const value = stageDeals.reduce((sum, deal) => sum + Number(deal.amount), 0)
          const isTarget = (drag?.active && drag.overStageId === stage.id) || nativeDrag?.overStageId === stage.id
          return <div key={stage.id} data-stage-id={stage.id} onDragEnter={() => nativeDrag && setNativeDrag({ ...nativeDrag, overStageId: stage.id })} onDragOver={(event) => { if (nativeDrag) { event.preventDefault(); event.dataTransfer.dropEffect = 'move' } }} onDrop={(event) => dropNativeDrag(event, stage.id)} className={cn('min-h-[320px] rounded-[20px] border border-transparent bg-[#f0ede8]/80 p-2 transition-[background-color,border-color,box-shadow] duration-150', stage.is_closed && 'bg-[#ece9e4]/65', isTarget && 'border-[#a0302a]/45 bg-[#fff8f5] shadow-[inset_0_0_0_1px_rgba(160,48,42,.08),0_18px_40px_-34px_rgba(160,48,42,.75)]')}>
            <div className="px-2 pb-3 pt-2"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: stage.color }} /><h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-[#57514b]">{stage.name}</h2></div><span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-[#777067] shadow-sm">{stageDeals.length}</span></div><p className="mt-2 text-[11px] text-[#91887f]">{value ? formatCurrency(value) : stage.is_closed ? 'Closed outcome' : 'No quantified value'}</p></div>
            <div className="space-y-2">
              {stageDeals.map((deal) => <DealCard key={deal.id} deal={deal} stages={stages} isDragging={Boolean((drag?.active && drag.deal.id === deal.id) || nativeDrag?.deal.id === deal.id)} onSelect={onSelect} onStageChange={onStageChange} onPointerDragStart={startDrag} onDragMove={moveDrag} onPointerDragEnd={endDrag} onNativeDragStart={startNativeDrag} onNativeDragEnd={() => setNativeDrag(null)} />)}
              {stageDeals.length === 0 && <div className={cn('flex h-28 items-center justify-center rounded-2xl border border-dashed border-[#d8d0c7] text-xs text-[#aaa198]', isTarget && 'border-[#b85a52] bg-white/70 text-[#8f2f2a]')}>{isTarget ? `Drop in ${stage.name}` : 'Clear'}</div>}
            </div>
          </div>
        })}
      </div>
    </div>
    {drag?.active && createPortal(<DragPreview drag={drag} />, document.body)}
  </div>
}

function DragPreview({ drag }: { drag: PipelineDrag }) {
  const account = drag.deal.crm_accounts?.name || drag.deal.clients?.name || 'Unlinked account'
  const tilt = Math.max(-2, Math.min(2, drag.velocityX / 450))
  return <div className="pointer-events-none fixed left-0 top-0 z-[100] rounded-2xl border border-[#c9beb4] bg-white/95 p-4 shadow-[0_28px_70px_-24px_rgba(28,22,18,.65)] backdrop-blur-xl" style={{ width: drag.width, minHeight: drag.height, transform: `translate3d(${drag.x - drag.grabX}px, ${drag.y - drag.grabY}px, 0) rotate(${tilt}deg)`, willChange: 'transform' }} aria-hidden>
    <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-[#25221f]">{account}</p><p className="mt-1 line-clamp-2 text-xs leading-5 text-[#797168]">{drag.deal.name}</p></div><GripVertical className="h-4 w-4 text-[#a0302a]" /></div>
    <p className="mt-4 font-crm-display text-lg font-semibold text-[#211f1c]">{Number(drag.deal.amount) ? formatCurrency(Number(drag.deal.amount)) : 'Unquantified'}</p>
  </div>
}

function DealCard({ deal, stages, isDragging, onSelect, onStageChange, onPointerDragStart, onDragMove, onPointerDragEnd, onNativeDragStart, onNativeDragEnd }: { deal: DealWithRelations; stages: DealStage[]; isDragging: boolean; onSelect: (deal: DealWithRelations) => void; onStageChange: (deal: DealWithRelations, stageId: string) => void; onPointerDragStart: (event: ReactPointerEvent<HTMLButtonElement>, deal: DealWithRelations) => void; onDragMove: (event: ReactPointerEvent<HTMLButtonElement>) => void; onPointerDragEnd: (event: ReactPointerEvent<HTMLButtonElement>) => void; onNativeDragStart: (event: ReactDragEvent<HTMLButtonElement>, deal: DealWithRelations) => void; onNativeDragEnd: () => void }) {
  const account = deal.crm_accounts?.name || deal.clients?.name || 'Unlinked account'
  return <article data-deal-card className={cn('group relative rounded-2xl border border-[#e0dad2] bg-white p-4 shadow-[0_14px_32px_-30px_rgba(30,24,18,.8)] transition-[transform,box-shadow,border-color,opacity] duration-200 ease-swift hover:-translate-y-0.5 hover:border-[#cfc5bb] hover:shadow-[0_18px_38px_-28px_rgba(30,24,18,.7)]', isDragging && 'opacity-25')}>
    <button type="button" draggable className="crm-press absolute right-2.5 top-2.5 flex h-7 w-7 touch-none items-center justify-center rounded-lg text-[#aaa198] hover:bg-[#f1ede8] hover:text-[#6e655d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a0302a]/45" aria-label={`Drag ${account} to another stage`} aria-grabbed={isDragging} onPointerDown={(event) => onPointerDragStart(event, deal)} onPointerMove={onDragMove} onPointerUp={onPointerDragEnd} onPointerCancel={onPointerDragEnd} onDragStart={(event) => onNativeDragStart(event, deal)} onDragEnd={onNativeDragEnd}><GripVertical className="h-4 w-4" /></button>
    <button onClick={() => onSelect(deal)} className="w-full pr-6 text-left">
      <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold leading-5 text-[#25221f]">{account}</p><p className="mt-1 line-clamp-2 text-xs leading-5 text-[#797168]">{deal.name}</p></div><PriorityDot priority={deal.priority} /></div>
      <div className="mt-4"><p className="font-crm-display text-lg font-semibold tracking-[-0.025em] text-[#211f1c]">{Number(deal.amount) ? formatCurrency(Number(deal.amount)) : 'Unquantified'}</p>{!Number(deal.amount) && deal.original_budget_text && <p className="mt-1 line-clamp-1 text-[10px] text-[#9a9187]">{deal.original_budget_text}</p>}</div>
      {deal.next_action && <p className="mt-3 line-clamp-2 border-l-2 border-[#d7c2ba] pl-2 text-[11px] leading-[1.55] text-[#6f675f]">{deal.next_action}</p>}
    </button>
    <div className="mt-4 flex items-center justify-between gap-2"><DuePill date={deal.next_follow_up_at} /><Select value={deal.stage_id} onValueChange={(id) => onStageChange(deal, id)}><SelectTrigger aria-label="Move opportunity" className="h-7 w-8 border-0 bg-transparent p-0 text-transparent shadow-none [&>svg]:h-3.5 [&>svg]:w-3.5 [&>svg]:text-[#9b9289]"><SelectValue /></SelectTrigger><SelectContent>{stages.map((stage) => <SelectItem key={stage.id} value={stage.id}>{stage.name}</SelectItem>)}</SelectContent></Select></div>
  </article>
}

function AccountsView({ accounts }: { accounts: CrmAccount[] }) {
  if (!accounts.length) return <div className="flex h-48 flex-col items-center justify-center text-center"><Building2 className="h-7 w-7 text-[#b7afa6]" /><p className="mt-3 text-sm font-semibold text-[#5d5650]">No relationships match this view</p><p className="mt-1 text-xs text-[#948c83]">Try a different search or filter.</p></div>
  return <div>
    <div className="max-h-[68vh] overflow-auto">
      <table className="w-full min-w-[1180px] border-separate border-spacing-0 text-left">
        <thead className="sticky top-0 z-20 bg-[#f6f3ef]/95 text-[10px] font-semibold uppercase tracking-[0.13em] text-[#887f76] backdrop-blur-xl">
          <tr>
            <th className="sticky left-0 z-30 w-[300px] border-b border-[#ddd7cf] bg-[#f6f3ef]/95 px-5 py-3">Account</th>
            <th className="w-[190px] border-b border-[#ddd7cf] px-4 py-3">Relationship</th>
            <th className="w-[250px] border-b border-[#ddd7cf] px-4 py-3">Market</th>
            <th className="w-[180px] border-b border-[#ddd7cf] px-4 py-3">Territory</th>
            <th className="w-[230px] border-b border-[#ddd7cf] px-4 py-3">Next move</th>
            <th className="w-[100px] border-b border-[#ddd7cf] px-4 py-3">Priority</th>
            <th className="w-[70px] border-b border-[#ddd7cf] px-4 py-3 text-right">Open</th>
          </tr>
        </thead>
        <tbody>
          {accounts.map((account) => <tr key={account.id} className="group bg-[rgba(251,250,248,.75)] transition-colors hover:bg-white">
            <td className="sticky left-0 z-10 border-b border-[#e7e2dc] bg-[#fbfaf8] px-5 py-3.5 group-hover:bg-white">
              <Link to={`/crm/accounts/${account.id}`} className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#ebe6df] text-xs font-semibold text-[#5f5851]">{account.name.slice(0, 2).toUpperCase()}</span>
                <span><span className="block max-w-[230px] truncate text-sm font-semibold text-[#27231f]">{account.name}</span><span className="mt-0.5 block text-[10px] text-[#948b82]">{account.import_source?.includes('verified') ? 'Verified direct lead' : account.import_source?.includes('prospects') ? 'Research prospect' : 'Commercial record'}</span></span>
              </Link>
            </td>
            <td className="border-b border-[#e7e2dc] px-4 py-3.5"><span className={cn('inline-flex rounded-full px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.08em]', lifecycleTone(account.lifecycle_status))}>{relationshipLabel(account.relationship_type)} · {account.lifecycle_status.replace('_', ' ')}</span></td>
            <td className="border-b border-[#e7e2dc] px-4 py-3.5"><p className="line-clamp-1 text-xs font-medium text-[#5f5851]">{account.industry || 'Industry not captured'}</p><p className="mt-1 line-clamp-1 text-[10px] text-[#979087]">{account.source_stage || 'No source signal'}</p></td>
            <td className="border-b border-[#e7e2dc] px-4 py-3.5"><p className="text-xs text-[#645d56]">{[account.city, account.country].filter(Boolean).join(', ') || 'Location missing'}</p>{account.website && <a href={account.website} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-[#8f2f2a]">Website <ExternalLink className="h-2.5 w-2.5" /></a>}</td>
            <td className="border-b border-[#e7e2dc] px-4 py-3.5"><DuePill date={account.next_follow_up_at} /><p className="mt-1.5 line-clamp-1 text-[10px] text-[#817970]">{account.next_action || 'No next move recorded'}</p></td>
            <td className="border-b border-[#e7e2dc] px-4 py-3.5"><PriorityDot priority={account.priority} /></td>
            <td className="border-b border-[#e7e2dc] px-4 py-3.5 text-right"><Button asChild variant="ghost" size="icon" className="crm-press h-8 w-8 rounded-lg"><Link to={`/crm/accounts/${account.id}`} aria-label={`Open ${account.name}`}><ChevronRight className="h-4 w-4" /></Link></Button></td>
          </tr>)}
        </tbody>
      </table>
    </div>
    <div className="flex items-center justify-between border-t border-[#e5e0da] px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#948c83]"><span>{accounts.length} accounts shown</span><span>Source-backed lead pool</span></div>
  </div>
}

function DealInspector({ deal, stages, onClose, onStageChange }: { deal: DealWithRelations | null; stages: DealStage[]; onClose: () => void; onStageChange: (deal: DealWithRelations, stageId: string) => void }) {
  if (!deal) return null
  const account = deal.crm_accounts
  return <Dialog open={Boolean(deal)} onOpenChange={(open) => !open && onClose()}><DialogContent className="max-h-[92vh] overflow-y-auto border-[#d9d2ca] bg-[#fbfaf8] p-0 sm:max-w-[680px] sm:rounded-[26px]">
    <div className="border-b border-[#e4dfd8] p-6 pr-14"><div className="flex flex-wrap items-center gap-2"><PriorityPill priority={deal.priority} /><DuePill date={deal.next_follow_up_at} /></div><DialogTitle className="mt-4 font-crm-display text-3xl font-semibold leading-tight tracking-[-0.035em] text-[#211f1c]">{account?.name || deal.clients?.name || deal.name}</DialogTitle><DialogDescription className="mt-2 text-sm leading-6">{deal.name}</DialogDescription></div>
    <div className="grid gap-6 p-6 md:grid-cols-[1fr_210px]">
      <div className="space-y-6">
        <DetailSection label="The opportunity" value={deal.description} />
        <DetailSection label="Next move" value={deal.next_action} accent />
        <DetailSection label="Outcome / blocker" value={deal.outcome_blocker} />
        <DetailSection label="Source evidence" value={deal.source_evidence} />
        <DetailSection label="Data to complete" value={deal.data_gaps} />
      </div>
      <aside className="space-y-3">
        <div className="rounded-2xl border border-[#ded8d0] bg-white p-4"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8d857c]">Stage</p><Select value={deal.stage_id} onValueChange={(id) => onStageChange(deal, id)}><SelectTrigger className="mt-2 h-9"><SelectValue /></SelectTrigger><SelectContent>{stages.map((stage) => <SelectItem key={stage.id} value={stage.id}>{stage.name} · {stage.probability}%</SelectItem>)}</SelectContent></Select><div className="mt-4 grid grid-cols-2 gap-3"><MiniFact label="Value" value={Number(deal.amount) ? formatCurrency(Number(deal.amount)) : '—'} /><MiniFact label="Confidence" value={`${deal.probability}%`} /><MiniFact label="Last contact" value={deal.last_contact_at ? formatDateShort(deal.last_contact_at) : '—'} /><MiniFact label="Proposal" value={deal.proposal_sent_at ? formatDateShort(deal.proposal_sent_at) : '—'} /></div></div>
        {deal.original_budget_text && <div className="rounded-2xl border border-[#ded8d0] bg-white p-4"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8d857c]">Original commercial context</p><p className="mt-2 text-xs leading-5 text-[#605951]">{deal.original_budget_text}</p></div>}
        {account && <Button asChild variant="outline" className="crm-press h-10 w-full rounded-xl bg-white"><Link to={`/crm/accounts/${account.id}`}>Open relationship <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>}
      </aside>
    </div>
  </DialogContent></Dialog>
}

function CreateDealDialog({ open, onOpenChange, accounts, stages, onSubmit }: { open: boolean; onOpenChange: (value: boolean) => void; accounts: CrmAccount[]; stages: DealStage[]; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void }) {
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogTrigger asChild><Button className="crm-press h-11 rounded-xl bg-[#a0302a] px-4 shadow-[0_10px_28px_-16px_rgba(160,48,42,.75)] hover:bg-[#8e2924]"><Plus className="mr-2 h-4 w-4" /> New opportunity</Button></DialogTrigger><DialogContent className="border-[#d9d2ca] bg-[#fbfaf8] sm:max-w-[600px] sm:rounded-[24px]"><form onSubmit={onSubmit}><DialogHeader><DialogTitle className="font-crm-display text-2xl tracking-[-0.025em]">Create an opportunity</DialogTitle><DialogDescription>Capture the value and next commitment. Everything else can become richer over time.</DialogDescription></DialogHeader><div className="grid gap-4 py-5"><div className="grid gap-2"><Label htmlFor="deal-name">Opportunity</Label><Input id="deal-name" name="name" placeholder="ERP advisory and implementation" required /></div><div className="grid gap-2"><Label>Account</Label><Select name="accountId"><SelectTrigger><SelectValue placeholder="Select an account" /></SelectTrigger><SelectContent>{accounts.map((account) => <SelectItem key={account.id} value={account.id}>{account.name}</SelectItem>)}</SelectContent></Select></div><div className="grid gap-4 sm:grid-cols-3"><FieldSelect label="Stage" name="stageId" defaultValue={stages.find((s) => s.name === 'Discovery')?.id || stages[0]?.id}>{stages.filter((s) => !s.is_closed).map((stage) => <SelectItem key={stage.id} value={stage.id}>{stage.name}</SelectItem>)}</FieldSelect><FieldSelect label="Priority" name="priority" defaultValue="medium"><SelectItem value="high">High</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="low">Low</SelectItem></FieldSelect><div className="grid gap-2"><Label htmlFor="amount">Value (MAD)</Label><Input id="amount" name="amount" min="0" step="0.01" type="number" placeholder="25000" /></div></div><div className="grid gap-4 sm:grid-cols-2"><div className="grid gap-2"><Label htmlFor="follow-up">Next follow-up</Label><Input id="follow-up" name="nextFollowUp" type="date" /></div><div className="grid gap-2"><Label htmlFor="close-date">Expected close</Label><Input id="close-date" name="expectedCloseDate" type="date" /></div></div><div className="grid gap-2"><Label htmlFor="description">Need / context</Label><Input id="description" name="description" placeholder="What are they trying to change?" /></div><div className="grid gap-2"><Label htmlFor="source">Source</Label><Input id="source" name="source" placeholder="Referral, Sortlist, inbound…" /></div></div><DialogFooter><Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" className="crm-press bg-[#a0302a] hover:bg-[#8e2924]">Create opportunity</Button></DialogFooter></form></DialogContent></Dialog>
}

function FieldSelect({ label, name, defaultValue, children }: { label: string; name: string; defaultValue?: string; children: React.ReactNode }) { return <div className="grid gap-2"><Label>{label}</Label><Select name={name} defaultValue={defaultValue}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{children}</SelectContent></Select></div> }
function DetailSection({ label, value, accent = false }: { label: string; value: string | null; accent?: boolean }) { if (!value) return null; return <section className={cn(accent && 'rounded-2xl border border-[#e4cbc4] bg-[#fff7f4] p-4')}><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#8b8279]">{label}</p><p className={cn('mt-2 text-sm leading-6 text-[#514b45]', accent && 'font-medium text-[#71332f]')}>{value}</p></section> }
function MiniFact({ label, value }: { label: string; value: string }) { return <div><p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#9a9289]">{label}</p><p className="mt-1 text-[11px] font-semibold leading-4 text-[#514b45]">{value}</p></div> }
function PriorityDot({ priority }: { priority: string }) { return <span className="flex shrink-0 items-center gap-1.5 text-[10px] font-semibold capitalize text-[#8f877e]"><span className={cn('h-2 w-2 rounded-full', priority === 'high' ? 'bg-[#b63d32]' : priority === 'medium' ? 'bg-[#d09b3f]' : 'bg-[#8f9b8e]')} />{priority}</span> }
function PriorityPill({ priority }: { priority: string }) { return <span className={cn('rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em]', priority === 'high' ? 'bg-[#f8e2dd] text-[#96352e]' : priority === 'medium' ? 'bg-[#f5ead3] text-[#866124]' : 'bg-[#e7ece6] text-[#576457]')}>{priority} priority</span> }

function DuePill({ date }: { date: string | null }) {
  if (!date) return <span className="text-[10px] text-[#aaa198]">No follow-up</span>
  const overdue = date < today(), due = date === today()
  return <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold', overdue ? 'bg-[#f8e2dd] text-[#9d352e]' : due ? 'bg-[#f5ead3] text-[#896324]' : 'bg-[#eeeae5] text-[#766e65]')}><CalendarClock className="h-3 w-3" />{overdue ? 'Overdue' : due ? 'Today' : formatDateShort(date)}</span>
}

function relationshipLabel(value: CrmAccount['relationship_type']) { return ({ prospect: 'Prospect', active_client: 'Active client', client_project: 'Client project', former_client: 'Former client', reference: 'Reference' })[value] }
function lifecycleTone(value: CrmAccount['lifecycle_status']) { if (value === 'customer' || value === 'active') return 'bg-[#e5eee7] text-[#4c6751]'; if (value === 'on_hold' || value === 'nurture') return 'bg-[#f5ead3] text-[#806023]'; if (value === 'lost') return 'bg-[#f6e2de] text-[#96352e]'; return 'bg-[#ebe8e4] text-[#6e675f]' }

function WorkspaceSkeleton({ importing }: { importing: boolean }) { return <div className="-mx-4 -mt-6 min-h-[calc(100vh-4rem)] bg-[#f4f1ed] px-6 py-12 lg:-mx-8"><div className="mx-auto max-w-[1680px]"><div className="h-3 w-28 animate-pulse rounded bg-[#ddd7cf]" /><div className="mt-5 h-12 w-[min(600px,85vw)] animate-pulse rounded-xl bg-[#ded8d0]" /><div className="mt-8 grid gap-3 sm:grid-cols-4">{[1,2,3,4].map((i) => <div key={i} className="h-32 animate-pulse rounded-[22px] bg-white/75" />)}</div><div className="mt-5 h-80 animate-pulse rounded-[26px] bg-white/70" /><p className="mt-4 flex items-center gap-2 text-xs text-[#817970]"><Sparkles className="h-3.5 w-3.5" />{importing ? 'Preparing 178 source-backed relationships from your tracker…' : 'Loading the revenue workspace…'}</p></div></div> }
function MigrationState({ message, onRetry }: { message: string; onRetry: () => void }) { const schemaIssue = /crm_accounts|crm_import_runs|column.*account_id|schema cache/i.test(message); return <div className="flex min-h-[65vh] items-center justify-center"><div className="max-w-xl rounded-[28px] border border-[#ded7cf] bg-[#fbfaf8] p-8 text-center shadow-[0_30px_90px_-60px_rgba(30,24,18,.8)]"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f5e5e1] text-[#a0302a]">{schemaIssue ? <Building2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}</div><h1 className="mt-5 font-crm-display text-2xl font-semibold tracking-[-0.025em]">{schemaIssue ? 'CRM migration required' : 'Revenue room unavailable'}</h1><p className="mt-3 text-sm leading-6 text-[#756e66]">{schemaIssue ? 'Apply Supabase migration 012_upgrade_crm_sales_workspace.sql, then retry. Your billing data remains untouched.' : message}</p><Button onClick={onRetry} className="crm-press mt-6 rounded-xl bg-[#a0302a] hover:bg-[#8e2924]">Retry connection</Button></div></div> }
