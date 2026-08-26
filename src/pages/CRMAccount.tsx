import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft, ArrowUpRight, CalendarClock, CheckCircle2, Circle, ExternalLink,
  Mail, MapPin, MessageSquare, Phone, Plus, UserRound,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useCompany } from '@/hooks/useCompany'
import { useAuth } from '@/contexts/AuthContext'
import {
  Contact, createActivity, createContact, CrmAccount, CrmActivity, DealWithRelations,
  getAccount, getActivities, getContacts, getDealsForAccount, getTasks, TaskWithRelations,
} from '@/lib/api/crm'
import { formatCurrency, formatDateShort } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

export default function CRMAccount() {
  const { clientId: accountId } = useParams<{ clientId: string }>()
  const { company, loading: companyLoading } = useCompany()
  const { user } = useAuth()
  const { toast } = useToast()
  const [account, setAccount] = useState<CrmAccount | null>(null)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [deals, setDeals] = useState<DealWithRelations[]>([])
  const [activities, setActivities] = useState<CrmActivity[]>([])
  const [tasks, setTasks] = useState<TaskWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [contactOpen, setContactOpen] = useState(false)
  const [noteOpen, setNoteOpen] = useState(false)

  useEffect(() => {
    if (!company || !accountId) return
    setLoading(true)
    Promise.all([getAccount(accountId), getContacts(accountId), getDealsForAccount(accountId), getActivities(accountId), getTasks(company.id, accountId)])
      .then(([accountData, contactsData, dealsData, activityData, taskData]) => {
        setAccount(accountData); setContacts(contactsData); setDeals(dealsData); setActivities(activityData); setTasks(taskData)
      })
      .catch((error) => { console.error('Error loading relationship:', error); toast({ title: 'Could not load relationship', variant: 'destructive' }) })
      .finally(() => setLoading(false))
  }, [accountId, company, toast])

  const openPipeline = deals.filter((deal) => deal.status === 'open').reduce((sum, deal) => sum + Number(deal.amount), 0)
  const openTasks = tasks.filter((task) => task.status === 'open')
  const recentActivity = useMemo(() => activities.slice(0, 8), [activities])

  const addContact = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!company || !accountId) return
    const form = new FormData(event.currentTarget)
    try {
      const contact = await createContact({
        company_id: company.id, client_id: null, account_id: accountId,
        first_name: String(form.get('name') || ''), last_name: null,
        email: String(form.get('email') || '') || null, phone: String(form.get('phone') || '') || null,
        title: String(form.get('title') || '') || null, is_primary: contacts.length === 0,
        notes: null, created_by: user?.id || null,
      })
      setContacts((current) => [...current, contact]); setContactOpen(false)
      toast({ title: 'Contact added' })
    } catch (error) { console.error(error); toast({ title: 'Could not add contact', variant: 'destructive' }) }
  }

  const addNote = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!company || !accountId) return
    const form = new FormData(event.currentTarget)
    try {
      const activity = await createActivity({
        company_id: company.id, client_id: null, account_id: accountId, deal_id: null, contact_id: null,
        type: 'note', subject: String(form.get('subject') || ''), body: String(form.get('body') || '') || null,
        occurred_at: new Date().toISOString(), created_by: user?.id || null,
      })
      setActivities((current) => [activity, ...current]); setNoteOpen(false)
      toast({ title: 'Note saved', description: 'The relationship history is up to date.' })
    } catch (error) { console.error(error); toast({ title: 'Could not save note', variant: 'destructive' }) }
  }

  if (companyLoading || loading) return <div className="flex min-h-[65vh] items-center justify-center bg-[#f4f1ed]"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[#d8d0c8] border-t-[#a0302a]" /></div>
  if (!account) return <div className="rounded-2xl border p-8"><h1 className="font-crm-display text-2xl font-semibold">Relationship not found</h1><Button asChild variant="outline" className="mt-4"><Link to="/crm">Return to pipeline</Link></Button></div>

  return <div className="crm-workspace -mx-4 -mt-6 min-h-[calc(100vh-4rem)] px-4 pb-12 pt-6 lg:-mx-8 lg:px-8">
    <div className="mx-auto max-w-[1480px]">
      <Link to="/crm" className="crm-press inline-flex items-center gap-2 rounded-lg px-2 py-1 text-xs font-semibold text-[#7f776f] hover:text-[#a0302a]"><ArrowLeft className="h-4 w-4" /> Revenue room</Link>
      <header className="mt-6 grid gap-6 border-b border-[#ddd7cf] pb-7 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <div className="flex flex-wrap items-center gap-2"><RelationshipPill type={account.relationship_type} /><LifecyclePill status={account.lifecycle_status} /></div>
          <h1 className="mt-4 font-crm-display text-[clamp(2.2rem,5vw,4.5rem)] font-semibold leading-[0.95] tracking-[-0.05em] text-[#1d1b19]">{account.name}</h1>
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-[#756e66]">
            {account.industry && <span>{account.industry}</span>}
            {(account.city || account.country) && <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{[account.city, account.country].filter(Boolean).join(', ')}</span>}
            {account.website && <a href={account.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-medium text-[#8f2f2a] hover:underline">Website <ExternalLink className="h-3.5 w-3.5" /></a>}
          </div>
        </div>
        <div className="flex gap-2"><NoteDialog open={noteOpen} onOpenChange={setNoteOpen} onSubmit={addNote} /><ContactDialog open={contactOpen} onOpenChange={setContactOpen} onSubmit={addContact} /></div>
      </header>

      <section className="mt-5 grid gap-3 sm:grid-cols-3">
        <AccountMetric label="Open pipeline" value={formatCurrency(openPipeline)} detail={`${deals.filter((d) => d.status === 'open').length} opportunities`} />
        <AccountMetric label="Next follow-up" value={account.next_follow_up_at ? formatDateShort(account.next_follow_up_at) : 'Not set'} detail={account.next_follow_up_at && account.next_follow_up_at < new Date().toLocaleDateString('en-CA') ? 'Action is overdue' : account.next_action || 'No action captured'} alert={Boolean(account.next_follow_up_at && account.next_follow_up_at <= new Date().toLocaleDateString('en-CA'))} />
        <AccountMetric label="Open work" value={String(openTasks.length)} detail={`${contacts.length} known contact${contacts.length === 1 ? '' : 's'}`} />
      </section>

      <main className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(340px,.7fr)]">
        <div className="space-y-5">
          <Panel title="Commercial context" eyebrow="What matters now">
            <div className="grid gap-6 md:grid-cols-2"><ContextBlock label="Services / need" value={account.services_need} /><ContextBlock label="Next action" value={account.next_action} accent /><ContextBlock label="Outcome / blocker" value={account.outcome_blocker} /><ContextBlock label="Original budget" value={account.original_budget_text} /><ContextBlock label="Evidence" value={account.source_evidence} /><ContextBlock label="Data gaps" value={account.data_gaps} /></div>
            {account.notes && <div className="mt-6 rounded-2xl bg-[#f0ece7] p-4 text-sm leading-6 text-[#655e57]">{account.notes}</div>}
          </Panel>

          <Panel title="Opportunities" eyebrow={`${deals.length} linked`}>
            <div className="space-y-2">{deals.map((deal) => <div key={deal.id} className="grid gap-3 rounded-2xl border border-[#e2dcd5] bg-white p-4 md:grid-cols-[1fr_auto_auto] md:items-center"><div><p className="font-semibold text-[#292622]">{deal.name}</p><p className="mt-1 line-clamp-1 text-xs text-[#817970]">{deal.description || deal.source || 'No context yet'}</p></div><div className="text-left md:text-right"><p className="font-crm-display text-lg font-semibold">{Number(deal.amount) ? formatCurrency(Number(deal.amount)) : 'Unquantified'}</p><p className="text-[10px] text-[#918980]">{deal.probability}% confidence</p></div><span className="rounded-full bg-[#eee9e3] px-2.5 py-1 text-[10px] font-semibold text-[#676058]">{deal.deal_stages.name}</span></div>)}{!deals.length && <EmptyLine text="No revenue opportunity is linked yet." />}</div>
          </Panel>

          <Panel title="Relationship history" eyebrow="Timeline">
            <div className="relative space-y-5 before:absolute before:bottom-2 before:left-[7px] before:top-2 before:w-px before:bg-[#ddd7cf]">{recentActivity.map((activity) => <div key={activity.id} className="relative pl-7"><span className="absolute left-0 top-1.5 h-[15px] w-[15px] rounded-full border-[4px] border-[#fbfaf8] bg-[#a0302a]" /><div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between"><p className="text-sm font-semibold text-[#342f2b]">{activity.subject}</p><time className="text-[10px] text-[#948c83]">{formatDateShort(activity.occurred_at)}</time></div>{activity.body && <p className="mt-1 text-sm leading-6 text-[#716a62]">{activity.body}</p>}</div>)}{!recentActivity.length && <EmptyLine text="No activity yet. Add a note after the next conversation." />}</div>
          </Panel>
        </div>

        <aside className="space-y-5">
          <Panel title="People" eyebrow={`${contacts.length} contacts`} compact>
            <div className="space-y-2">{contacts.map((contact) => <div key={contact.id} className="rounded-2xl border border-[#e2dcd5] bg-white p-4"><div className="flex items-start gap-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#ece7e0] text-[#766e65]"><UserRound className="h-4 w-4" /></div><div className="min-w-0"><p className="font-semibold text-[#2d2925]">{[contact.first_name, contact.last_name].filter(Boolean).join(' ')}</p><p className="mt-0.5 text-xs text-[#8a8279]">{contact.title || (contact.is_primary ? 'Primary contact' : 'Contact')}</p></div></div><div className="mt-3 space-y-1.5">{contact.email && <a href={`mailto:${contact.email}`} className="flex items-center gap-2 truncate text-xs text-[#6b645d] hover:text-[#a0302a]"><Mail className="h-3.5 w-3.5" />{contact.email}</a>}{contact.phone && <a href={`tel:${contact.phone}`} className="flex items-center gap-2 text-xs text-[#6b645d] hover:text-[#a0302a]"><Phone className="h-3.5 w-3.5" />{contact.phone}</a>}</div></div>)}{!contacts.length && <EmptyLine text="No decision-maker captured." />}</div>
          </Panel>

          <Panel title="Follow-up work" eyebrow={`${openTasks.length} open`} compact>
            <div className="space-y-2">{tasks.slice(0, 8).map((task) => <div key={task.id} className={cn('rounded-2xl border border-[#e2dcd5] bg-white p-4', task.status !== 'open' && 'opacity-55')}><div className="flex gap-3">{task.status === 'completed' ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#5e7d64]" /> : <Circle className="mt-0.5 h-4 w-4 shrink-0 text-[#a0302a]" />}<div><p className="text-xs font-semibold leading-5 text-[#39342f]">{task.title}</p>{task.due_date && <p className={cn('mt-1 inline-flex items-center gap-1 text-[10px]', task.due_date < new Date().toLocaleDateString('en-CA') && task.status === 'open' ? 'font-semibold text-[#a0302a]' : 'text-[#928a81]')}><CalendarClock className="h-3 w-3" />{formatDateShort(task.due_date)}</p>}</div></div></div>)}{!tasks.length && <EmptyLine text="No follow-up tasks yet." />}</div>
            <Button asChild variant="outline" className="crm-press mt-4 w-full rounded-xl bg-white"><Link to="/crm/work">Open all work <ArrowUpRight className="ml-2 h-4 w-4" /></Link></Button>
          </Panel>
        </aside>
      </main>
    </div>
  </div>
}

function Panel({ title, eyebrow, children, compact = false }: { title: string; eyebrow: string; children: React.ReactNode; compact?: boolean }) { return <section className={cn('rounded-[24px] border border-[#ddd7cf] bg-[rgba(251,250,248,.86)] shadow-[0_26px_65px_-58px_rgba(30,24,18,.8)] backdrop-blur-xl', compact ? 'p-5' : 'p-6')}><div className="mb-5 flex items-baseline justify-between gap-4"><h2 className="font-crm-display text-xl font-semibold tracking-[-0.025em] text-[#292521]">{title}</h2><span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#978f86]">{eyebrow}</span></div>{children}</section> }
function ContextBlock({ label, value, accent = false }: { label: string; value: string | null; accent?: boolean }) { return <div className={cn(accent && 'rounded-2xl border border-[#e4cbc4] bg-[#fff7f4] p-4')}><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#928a81]">{label}</p><p className={cn('mt-2 text-sm leading-6 text-[#5f5851]', !value && 'italic text-[#aaa198]', accent && 'font-medium text-[#783833]')}>{value || 'Not captured yet'}</p></div> }
function AccountMetric({ label, value, detail, alert = false }: { label: string; value: string; detail: string; alert?: boolean }) { return <div className={cn('rounded-[20px] border p-5', alert ? 'border-[#e5c7c0] bg-[#fff7f4]' : 'border-[#ddd7cf] bg-white/75')}><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8e867d]">{label}</p><p className={cn('mt-3 font-crm-display text-2xl font-semibold tracking-[-0.03em]', alert && 'text-[#9f352e]')}>{value}</p><p className="mt-1 line-clamp-1 text-xs text-[#837b72]">{detail}</p></div> }
function EmptyLine({ text }: { text: string }) { return <div className="rounded-2xl border border-dashed border-[#dad3cb] p-5 text-center text-xs text-[#9c948b]">{text}</div> }
function RelationshipPill({ type }: { type: CrmAccount['relationship_type'] }) { const label = ({ prospect: 'Proposal lead', active_client: 'Active client', client_project: 'Client project', former_client: 'Former client', reference: 'Reference' })[type]; return <span className="rounded-full bg-[#211f1c] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-white">{label}</span> }
function LifecyclePill({ status }: { status: CrmAccount['lifecycle_status'] }) { return <span className="rounded-full bg-[#eae5df] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#696159]">{status.replace('_', ' ')}</span> }

function ContactDialog({ open, onOpenChange, onSubmit }: { open: boolean; onOpenChange: (open: boolean) => void; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void }) { return <Dialog open={open} onOpenChange={onOpenChange}><DialogTrigger asChild><Button className="crm-press rounded-xl bg-[#a0302a] hover:bg-[#8e2924]"><Plus className="mr-2 h-4 w-4" /> Contact</Button></DialogTrigger><DialogContent className="bg-[#fbfaf8] sm:rounded-[24px]"><form onSubmit={onSubmit}><DialogHeader><DialogTitle className="font-crm-display text-2xl">Add a contact</DialogTitle><DialogDescription>Keep the people behind the relationship close to the work.</DialogDescription></DialogHeader><div className="grid gap-4 py-5"><Field label="Name" name="name" required /><Field label="Role" name="title" /><Field label="Email" name="email" type="email" /><Field label="Phone" name="phone" /></div><DialogFooter><Button variant="ghost" type="button" onClick={() => onOpenChange(false)}>Cancel</Button><Button className="bg-[#a0302a] hover:bg-[#8e2924]">Add contact</Button></DialogFooter></form></DialogContent></Dialog> }
function NoteDialog({ open, onOpenChange, onSubmit }: { open: boolean; onOpenChange: (open: boolean) => void; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void }) { return <Dialog open={open} onOpenChange={onOpenChange}><DialogTrigger asChild><Button variant="outline" className="crm-press rounded-xl bg-white"><MessageSquare className="mr-2 h-4 w-4" /> Add note</Button></DialogTrigger><DialogContent className="bg-[#fbfaf8] sm:rounded-[24px]"><form onSubmit={onSubmit}><DialogHeader><DialogTitle className="font-crm-display text-2xl">Log a note</DialogTitle><DialogDescription>Capture the decision, signal, or context future-you will need.</DialogDescription></DialogHeader><div className="grid gap-4 py-5"><Field label="Subject" name="subject" required /><div className="grid gap-2"><Label htmlFor="note-body">Details</Label><Textarea id="note-body" name="body" rows={5} /></div></div><DialogFooter><Button variant="ghost" type="button" onClick={() => onOpenChange(false)}>Cancel</Button><Button className="bg-[#a0302a] hover:bg-[#8e2924]">Save note</Button></DialogFooter></form></DialogContent></Dialog> }
function Field({ label, name, type = 'text', required = false }: { label: string; name: string; type?: string; required?: boolean }) { return <div className="grid gap-2"><Label htmlFor={name}>{label}</Label><Input id={name} name={name} type={type} required={required} /></div> }
