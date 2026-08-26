import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CalendarClock, Check, Circle, ListFilter, ListTodo, Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useCompany } from '@/hooks/useCompany'
import { useAuth } from '@/contexts/AuthContext'
import { completeTask, createTask, CrmAccount, getAccounts, getDeals, getTasks, TaskWithRelations } from '@/lib/api/crm'
import { formatDateShort } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

const NONE = '__none__'
const localToday = () => new Date().toLocaleDateString('en-CA')

export default function CRMWork() {
  const { company, loading: companyLoading } = useCompany()
  const { user } = useAuth()
  const { toast } = useToast()
  const [params] = useSearchParams()
  const initialAccount = params.get('account') || params.get('client') || 'all'
  const [tasks, setTasks] = useState<TaskWithRelations[]>([])
  const [accounts, setAccounts] = useState<CrmAccount[]>([])
  const [deals, setDeals] = useState<{ id: string; name: string; account_id: string | null }[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('open')
  const [priority, setPriority] = useState('all')
  const [due, setDue] = useState('all')
  const [account, setAccount] = useState(initialAccount)

  useEffect(() => {
    if (!company) return
    setLoading(true)
    Promise.all([getTasks(company.id), getAccounts(company.id), getDeals(company.id)])
      .then(([taskData, accountData, dealData]) => {
        setTasks(taskData); setAccounts(accountData); setDeals(dealData.map((deal) => ({ id: deal.id, name: deal.name, account_id: deal.account_id })))
      })
      .catch((error) => { console.error(error); toast({ title: 'Could not load the work queue', variant: 'destructive' }) })
      .finally(() => setLoading(false))
  }, [company, toast])

  const openTasks = tasks.filter((task) => task.status === 'open')
  const overdue = openTasks.filter((task) => task.due_date && task.due_date < localToday())
  const dueToday = openTasks.filter((task) => task.due_date === localToday())
  const filtered = useMemo(() => tasks.filter((task) => {
    const term = search.trim().toLowerCase()
    const accountName = task.crm_accounts?.name || task.clients?.name || ''
    const matchesText = !term || `${task.title} ${task.description || ''} ${accountName} ${task.deals?.name || ''}`.toLowerCase().includes(term)
    const matchesDue = due === 'all' || (due === 'overdue' ? Boolean(task.due_date && task.due_date < localToday() && task.status === 'open') : due === 'today' ? task.due_date === localToday() : due === 'upcoming' ? Boolean(task.due_date && task.due_date > localToday()) : !task.due_date)
    const matchesAccount = account === 'all' || (account === NONE ? !task.account_id : task.account_id === account)
    return matchesText && (status === 'all' || task.status === status) && (priority === 'all' || task.priority === priority) && matchesDue && matchesAccount
  }), [account, due, priority, search, status, tasks])

  const toggle = async (task: TaskWithRelations) => {
    try {
      const updated = await completeTask(task.id, task.status !== 'completed')
      setTasks((current) => current.map((item) => item.id === updated.id ? updated : item))
    } catch (error) { console.error(error); toast({ title: 'Task was not updated', variant: 'destructive' }) }
  }

  const create = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!company) return
    const form = new FormData(event.currentTarget)
    const accountId = String(form.get('accountId') || NONE)
    const dealId = String(form.get('dealId') || NONE)
    try {
      const task = await createTask({
        company_id: company.id, client_id: null, account_id: accountId === NONE ? null : accountId,
        deal_id: dealId === NONE ? null : dealId, contact_id: null, assignee_id: user?.id || null,
        title: String(form.get('title') || ''), description: String(form.get('description') || '') || null,
        due_date: String(form.get('dueDate') || '') || null,
        priority: String(form.get('priority') || 'medium') as 'low' | 'medium' | 'high',
        status: 'open', completed_at: null, created_by: user?.id || null,
      })
      setTasks((current) => [task, ...current]); setCreateOpen(false)
      toast({ title: 'Follow-up scheduled' })
    } catch (error) { console.error(error); toast({ title: 'Could not schedule follow-up', variant: 'destructive' }) }
  }

  if (companyLoading || loading) return <div className="flex min-h-[65vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[#d8d0c8] border-t-[#a0302a]" /></div>

  return <div className="crm-workspace -mx-4 -mt-6 min-h-[calc(100vh-4rem)] px-4 pb-12 pt-6 lg:-mx-8 lg:px-8">
    <div className="mx-auto max-w-[1480px]">
      <header className="flex flex-col gap-5 border-b border-[#ddd7cf] pb-7 lg:flex-row lg:items-end lg:justify-between">
        <div><div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8f2f2a]"><ListTodo className="h-4 w-4" /> Commitments</div><h1 className="font-crm-display text-[clamp(2.2rem,5vw,4.25rem)] font-semibold leading-[0.95] tracking-[-0.05em] text-[#1d1b19]">The work that moves revenue.</h1><p className="mt-4 text-sm text-[#756e66]">One queue for every promise, follow-up, and decision.</p></div>
        <TaskDialog open={createOpen} onOpenChange={setCreateOpen} accounts={accounts} deals={deals} onSubmit={create} />
      </header>

      <section className="mt-5 grid gap-3 sm:grid-cols-3">
        <WorkMetric label="Overdue" value={overdue.length} detail="Needs recovery" tone="urgent" />
        <WorkMetric label="Today" value={dueToday.length} detail="Protect these commitments" tone="today" />
        <WorkMetric label="Open work" value={openTasks.length} detail="All active follow-ups" />
      </section>

      <section className="mt-5 overflow-hidden rounded-[26px] border border-[#ddd7cf] bg-[rgba(251,250,248,.86)] shadow-[0_32px_80px_-64px_rgba(30,24,18,.8)] backdrop-blur-xl">
        <div className="flex flex-col gap-3 border-b border-[#e3ded7] p-4 xl:flex-row xl:items-center">
          <div className="relative flex-1"><Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#948c83]" /><Input value={search} onChange={(e) => setSearch(e.target.value)} className="h-11 rounded-xl border-[#ddd7cf] bg-white pl-10" placeholder="Search work, relationships, or opportunities…" /></div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4"><FilterSelect value={status} onChange={setStatus} items={[['all','All status'],['open','Open'],['completed','Completed'],['cancelled','Cancelled']]} /><FilterSelect value={priority} onChange={setPriority} items={[['all','All priorities'],['high','High'],['medium','Medium'],['low','Low']]} /><FilterSelect value={due} onChange={setDue} items={[['all','Any date'],['overdue','Overdue'],['today','Today'],['upcoming','Upcoming'],['none','No date']]} /><Select value={account} onValueChange={setAccount}><SelectTrigger className="h-11 rounded-xl bg-white"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All accounts</SelectItem><SelectItem value={NONE}>Unlinked</SelectItem>{accounts.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></div>
        </div>
        <div className="max-h-[68vh] overflow-auto">
          <table className="w-full min-w-[1120px] border-separate border-spacing-0 text-left">
            <thead className="sticky top-0 z-20 bg-[#f6f3ef]/95 text-[10px] font-semibold uppercase tracking-[0.13em] text-[#887f76] backdrop-blur-xl">
              <tr>
                <th className="sticky left-0 z-30 w-[58px] border-b border-[#ddd7cf] bg-[#f6f3ef]/95 px-4 py-3"><span className="sr-only">Complete</span></th>
                <th className="sticky left-[58px] z-30 w-[350px] border-b border-[#ddd7cf] bg-[#f6f3ef]/95 px-4 py-3">Commitment</th>
                <th className="w-[220px] border-b border-[#ddd7cf] px-4 py-3">Account</th>
                <th className="w-[220px] border-b border-[#ddd7cf] px-4 py-3">Opportunity</th>
                <th className="w-[140px] border-b border-[#ddd7cf] px-4 py-3">Deadline</th>
                <th className="w-[100px] border-b border-[#ddd7cf] px-4 py-3">Priority</th>
                <th className="w-[110px] border-b border-[#ddd7cf] px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((task) => <TaskRow key={task.id} task={task} onToggle={toggle} />)}
              {!filtered.length && <tr><td colSpan={7}><div className="flex h-48 flex-col items-center justify-center"><ListFilter className="h-6 w-6 text-[#b3aba2]" /><p className="mt-3 text-sm font-semibold text-[#6e675f]">Nothing matches this view</p></div></td></tr>}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-[#e5e0da] px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#948c83]"><span>{filtered.length} shown</span><span>{openTasks.length} open commitments</span></div>
      </section>
    </div>
  </div>
}

function TaskRow({ task, onToggle }: { task: TaskWithRelations; onToggle: (task: TaskWithRelations) => void }) {
  const account = task.crm_accounts
  const overdue = Boolean(task.due_date && task.due_date < localToday() && task.status === 'open')
  const dueToday = task.due_date === localToday() && task.status === 'open'
  return <tr className={cn('group bg-[rgba(251,250,248,.75)] transition-colors hover:bg-white', task.status !== 'open' && 'opacity-55')}>
    <td className="sticky left-0 z-10 border-b border-[#e7e2dc] bg-[#fbfaf8] px-4 py-3.5 group-hover:bg-white">
      <button onClick={() => onToggle(task)} className={cn('crm-press flex h-8 w-8 items-center justify-center rounded-full border', task.status === 'completed' ? 'border-[#b8cbbd] bg-[#e6eee8] text-[#53705a]' : 'border-[#d9d2ca] bg-white text-[#9c938a] hover:border-[#a0302a] hover:text-[#a0302a]')} aria-label={task.status === 'completed' ? 'Reopen task' : 'Complete task'}>{task.status === 'completed' ? <Check className="h-4 w-4" /> : <Circle className="h-3 w-3" />}</button>
    </td>
    <td className="sticky left-[58px] z-10 border-b border-[#e7e2dc] bg-[#fbfaf8] px-4 py-3.5 group-hover:bg-white"><p className={cn('max-w-[320px] truncate text-sm font-semibold leading-5 text-[#302c28]', task.status === 'completed' && 'line-through')}>{task.title}</p>{task.description && <p className="mt-1 max-w-[320px] truncate text-[11px] text-[#847c73]">{task.description}</p>}</td>
    <td className="border-b border-[#e7e2dc] px-4 py-3.5">{account ? <Link to={`/crm/accounts/${account.id}`} className="text-xs font-semibold text-[#645d56] hover:text-[#a0302a]">{account.name}</Link> : <span className="text-xs text-[#a39a91]">Unlinked</span>}</td>
    <td className="border-b border-[#e7e2dc] px-4 py-3.5"><p className="max-w-[200px] truncate text-xs text-[#746d65]">{task.deals?.name || 'No opportunity linked'}</p></td>
    <td className="border-b border-[#e7e2dc] px-4 py-3.5"><span className={cn('inline-flex items-center gap-1.5 text-xs', overdue ? 'font-semibold text-[#a0302a]' : dueToday ? 'font-semibold text-[#8a6523]' : 'text-[#756e66]')}><CalendarClock className="h-3.5 w-3.5" />{task.due_date ? formatDateShort(task.due_date) : 'No date'}</span><p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.1em] text-[#9a9289]">{overdue ? 'Recovery' : dueToday ? 'Protect today' : task.due_date ? 'Scheduled' : 'Unscheduled'}</p></td>
    <td className="border-b border-[#e7e2dc] px-4 py-3.5"><span className={cn('w-fit rounded-full px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.08em]', task.priority === 'high' ? 'bg-[#f8e2dd] text-[#96352e]' : task.priority === 'medium' ? 'bg-[#f5ead3] text-[#866124]' : 'bg-[#e7ece6] text-[#576457]')}>{task.priority}</span></td>
    <td className="border-b border-[#e7e2dc] px-4 py-3.5"><span className={cn('inline-flex rounded-full px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.08em]', task.status === 'open' ? 'bg-[#ebe8e4] text-[#6e675f]' : task.status === 'completed' ? 'bg-[#e5eee7] text-[#4c6751]' : 'bg-[#f6e2de] text-[#96352e]')}>{task.status}</span></td>
  </tr>
}

function FilterSelect({ value, onChange, items }: { value: string; onChange: (value: string) => void; items: string[][] }) { return <Select value={value} onValueChange={onChange}><SelectTrigger className="h-11 rounded-xl bg-white"><SelectValue /></SelectTrigger><SelectContent>{items.map(([id,label]) => <SelectItem key={id} value={id}>{label}</SelectItem>)}</SelectContent></Select> }
function WorkMetric({ label, value, detail, tone = 'plain' }: { label: string; value: number; detail: string; tone?: 'plain' | 'urgent' | 'today' }) { return <div className={cn('rounded-[20px] border p-5', tone === 'urgent' ? 'border-[#e4c5be] bg-[#fff7f4]' : tone === 'today' ? 'border-[#ead8b6] bg-[#fffaf0]' : 'border-[#ddd7cf] bg-white/75')}><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8e867d]">{label}</p><p className={cn('mt-3 font-crm-display text-3xl font-semibold', tone === 'urgent' ? 'text-[#a0302a]' : tone === 'today' ? 'text-[#8a6523]' : 'text-[#26221f]')}>{value}</p><p className="mt-1 text-xs text-[#837b72]">{detail}</p></div> }

function TaskDialog({ open, onOpenChange, accounts, deals, onSubmit }: { open: boolean; onOpenChange: (open: boolean) => void; accounts: CrmAccount[]; deals: { id: string; name: string; account_id: string | null }[]; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void }) { return <Dialog open={open} onOpenChange={onOpenChange}><DialogTrigger asChild><Button className="crm-press h-11 rounded-xl bg-[#a0302a] hover:bg-[#8e2924]"><Plus className="mr-2 h-4 w-4" /> New follow-up</Button></DialogTrigger><DialogContent className="border-[#d9d2ca] bg-[#fbfaf8] sm:max-w-[560px] sm:rounded-[24px]"><form onSubmit={onSubmit}><DialogHeader><DialogTitle className="font-crm-display text-2xl">Schedule the next move</DialogTitle><DialogDescription>A useful CRM is a list of kept promises. Make this one concrete.</DialogDescription></DialogHeader><div className="grid gap-4 py-5"><div className="grid gap-2"><Label htmlFor="task-title">Commitment</Label><Input id="task-title" name="title" placeholder="Send revised scope and request decision" required /></div><div className="grid gap-4 sm:grid-cols-2"><div className="grid gap-2"><Label>Account</Label><Select name="accountId" defaultValue={NONE}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value={NONE}>Unlinked</SelectItem>{accounts.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></div><div className="grid gap-2"><Label>Opportunity</Label><Select name="dealId" defaultValue={NONE}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value={NONE}>Unlinked</SelectItem>{deals.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></div></div><div className="grid gap-4 sm:grid-cols-2"><div className="grid gap-2"><Label htmlFor="due-date">Due date</Label><Input id="due-date" name="dueDate" type="date" /></div><div className="grid gap-2"><Label>Priority</Label><Select name="priority" defaultValue="medium"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="high">High</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="low">Low</SelectItem></SelectContent></Select></div></div><div className="grid gap-2"><Label htmlFor="task-context">Context</Label><Textarea id="task-context" name="description" rows={4} /></div></div><DialogFooter><Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button><Button className="bg-[#a0302a] hover:bg-[#8e2924]">Schedule follow-up</Button></DialogFooter></form></DialogContent></Dialog> }
