import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle2, Circle, ListTodo, Plus, Search, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { useCompany } from '@/hooks/useCompany'
import { useAuth } from '@/contexts/AuthContext'
import { getClients } from '@/lib/api/clients'
import { completeTask, createTask, getDeals, getTasks, TaskWithRelations } from '@/lib/api/crm'
import { formatDateShort } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'

type ClientOption = { id: string; name: string }
type DealOption = { id: string; name: string }
const NO_ACCOUNT = '__none__'

export default function CRMWork() {
  const { company, loading: companyLoading } = useCompany()
  const { user } = useAuth()
  const { toast } = useToast()
  const [searchParams] = useSearchParams()
  const accountId = searchParams.get('client') || undefined
  const [tasks, setTasks] = useState<TaskWithRelations[]>([])
  const [clients, setClients] = useState<ClientOption[]>([])
  const [deals, setDeals] = useState<DealOption[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('open')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [accountFilter, setAccountFilter] = useState(accountId || 'all')
  const [dueFilter, setDueFilter] = useState('all')

  useEffect(() => {
    if (!company) return
    setLoading(true)
    getTasks(company.id)
      .then(setTasks)
      .catch((error) => { console.error('Error loading CRM tasks:', error); toast({ title: 'Could not load work queue', variant: 'destructive' }) })
      .finally(() => setLoading(false))
  }, [company, toast])

  useEffect(() => {
    if (!company) return
    Promise.all([getClients(company.id), getDeals(company.id)])
      .then(([clientData, dealData]) => {
        setClients(clientData.map((client) => ({ id: client.id, name: client.name })))
        setDeals(dealData.map((deal) => ({ id: deal.id, name: deal.name })))
      })
      .catch((error) => console.error('Error loading task options:', error))
  }, [company])

  const today = new Date().toISOString().slice(0, 10)
  const openTasks = tasks.filter((task) => task.status === 'open')
  const overdue = openTasks.filter((task) => task.due_date && task.due_date < today)
  const dueToday = openTasks.filter((task) => task.due_date === today)
  const filteredTasks = useMemo(() => {
    const term = search.trim().toLowerCase()
    return tasks.filter((task) => {
      const matchesSearch = !term || task.title.toLowerCase().includes(term) || task.description?.toLowerCase().includes(term) || task.clients?.name.toLowerCase().includes(term) || task.deals?.name.toLowerCase().includes(term)
      const matchesStatus = statusFilter === 'all' || task.status === statusFilter
      const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter
      const matchesAccount = accountFilter === 'all' || (accountFilter === NO_ACCOUNT ? !task.client_id : task.client_id === accountFilter)
      const matchesDue = dueFilter === 'all' || (dueFilter === 'overdue' ? Boolean(task.due_date && task.due_date < today && task.status === 'open') : dueFilter === 'today' ? task.due_date === today : dueFilter === 'upcoming' ? Boolean(task.due_date && task.due_date > today) : !task.due_date)
      return matchesSearch && matchesStatus && matchesPriority && matchesAccount && matchesDue
    })
  }, [accountFilter, dueFilter, priorityFilter, search, statusFilter, tasks, today])

  const handleCreateTask = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!company) return
    const form = new FormData(event.currentTarget)
    const clientId = String(form.get('clientId') || NO_ACCOUNT)
    const dealId = String(form.get('dealId') || NO_ACCOUNT)
    try {
      const task = await createTask({ company_id: company.id, client_id: clientId === NO_ACCOUNT ? null : clientId, deal_id: dealId === NO_ACCOUNT ? null : dealId, contact_id: null, assignee_id: user?.id || null, title: String(form.get('title') || ''), description: String(form.get('description') || '') || null, due_date: String(form.get('dueDate') || '') || null, priority: String(form.get('priority') || 'medium') as 'low' | 'medium' | 'high', status: 'open', completed_at: null, created_by: user?.id || null })
      setTasks((current) => [task, ...current])
      setIsDialogOpen(false)
      toast({ title: 'Follow-up scheduled', description: 'It is now in your work list.' })
    } catch (error) { console.error('Error creating task:', error); toast({ title: 'Could not save task', variant: 'destructive' }) }
  }

  const toggleTask = async (task: TaskWithRelations) => {
    try { const updated = await completeTask(task.id, task.status !== 'completed'); setTasks((current) => current.map((item) => item.id === updated.id ? updated : item)) }
    catch (error) { console.error('Error updating task:', error); toast({ title: 'Task was not updated', variant: 'destructive' }) }
  }

  const clearFilters = () => { setSearch(''); setStatusFilter('open'); setPriorityFilter('all'); setAccountFilter('all'); setDueFilter('all') }
  if (companyLoading || loading) return <div className="flex min-h-[60vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" /></div>

  return <div className="space-y-6">
    <section className="flex flex-col gap-4 border-b pb-6 md:flex-row md:items-end md:justify-between"><div><div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary"><ListTodo className="h-4 w-4" /> My work</div><h1 className="font-serif text-3xl font-semibold tracking-tight">A focused work list</h1><p className="mt-2 text-sm text-muted-foreground">Tasks can begin before you know the account or the opportunity.</p></div><Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}><DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> New task</Button></DialogTrigger><DialogContent className="sm:max-w-[540px]"><form onSubmit={handleCreateTask}><DialogHeader><DialogTitle>Schedule a follow-up</DialogTitle><DialogDescription>Capture the next action first; attach the commercial context whenever you have it.</DialogDescription></DialogHeader><div className="grid gap-4 py-5"><div className="grid gap-2"><Label htmlFor="task-title">Task</Label><Input id="task-title" name="title" placeholder="Call to qualify the enquiry" required /></div><div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><div className="grid gap-2"><Label>Account <span className="font-normal text-muted-foreground">(optional)</span></Label><Select name="clientId" defaultValue={accountId || NO_ACCOUNT}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value={NO_ACCOUNT}>No account yet</SelectItem>{clients.map((client) => <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>)}</SelectContent></Select></div><div className="grid gap-2"><Label>Opportunity <span className="font-normal text-muted-foreground">(optional)</span></Label><Select name="dealId" defaultValue={NO_ACCOUNT}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value={NO_ACCOUNT}>No opportunity yet</SelectItem>{deals.map((deal) => <SelectItem key={deal.id} value={deal.id}>{deal.name}</SelectItem>)}</SelectContent></Select></div></div><div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><div className="grid gap-2"><Label htmlFor="due-date">Due date</Label><Input id="due-date" name="dueDate" type="date" /></div><div className="grid gap-2"><Label>Priority</Label><Select name="priority" defaultValue="medium"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="high">High</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="low">Low</SelectItem></SelectContent></Select></div></div><div className="grid gap-2"><Label htmlFor="task-description">Context</Label><Textarea id="task-description" name="description" placeholder="What should happen in this conversation?" /></div></div><DialogFooter><Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button><Button type="submit">Schedule task</Button></DialogFooter></form></DialogContent></Dialog></section>
    <section className="grid gap-4 sm:grid-cols-3"><Metric label="Overdue" value={overdue.length} detail="Open actions past their date" tone="text-red-700" /><Metric label="Due today" value={dueToday.length} detail="Protect today’s priorities" tone="text-amber-700" /><Metric label="Open work" value={openTasks.length} detail="All active follow-ups" tone="text-primary" /></section>
    <section className="overflow-hidden rounded-xl border bg-card shadow-[0_12px_35px_-30px_rgba(23,23,23,0.8)]"><div className="flex flex-col gap-3 border-b bg-muted/20 p-4 xl:flex-row xl:items-center"><div className="relative min-w-0 flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9" placeholder="Search tasks, accounts, or opportunities…" /></div><div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:flex"><Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-full xl:w-[125px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All status</SelectItem><SelectItem value="open">Open</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem></SelectContent></Select><Select value={priorityFilter} onValueChange={setPriorityFilter}><SelectTrigger className="w-full xl:w-[125px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All priority</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="low">Low</SelectItem></SelectContent></Select><Select value={dueFilter} onValueChange={setDueFilter}><SelectTrigger className="w-full xl:w-[125px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Any due date</SelectItem><SelectItem value="overdue">Overdue</SelectItem><SelectItem value="today">Today</SelectItem><SelectItem value="upcoming">Upcoming</SelectItem><SelectItem value="none">No date</SelectItem></SelectContent></Select><Select value={accountFilter} onValueChange={setAccountFilter}><SelectTrigger className="w-full xl:w-[150px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All accounts</SelectItem><SelectItem value={NO_ACCOUNT}>Unlinked</SelectItem>{clients.map((client) => <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>)}</SelectContent></Select></div><Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground"><SlidersHorizontal className="mr-2 h-4 w-4" /> Reset</Button></div>
      <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead className="w-[44px]" /><TableHead className="min-w-[280px]">Task</TableHead><TableHead>Account</TableHead><TableHead>Opportunity</TableHead><TableHead>Due date</TableHead><TableHead>Priority</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{filteredTasks.length ? filteredTasks.map((task) => <TableRow key={task.id} className={task.status === 'completed' ? 'opacity-55' : ''}><TableCell><button onClick={() => toggleTask(task)} className="text-primary" aria-label={task.status === 'completed' ? 'Reopen task' : 'Complete task'}>{task.status === 'completed' ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}</button></TableCell><TableCell><p className={`font-medium ${task.status === 'completed' ? 'line-through' : ''}`}>{task.title}</p>{task.description && <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{task.description}</p>}</TableCell><TableCell>{task.clients ? <Link className="font-medium text-primary hover:underline" to={`/crm/accounts/${task.clients.id}`}>{task.clients.name}</Link> : <span className="text-sm text-muted-foreground">No account</span>}</TableCell><TableCell className="text-sm text-muted-foreground">{task.deals?.name || '—'}</TableCell><TableCell className={task.due_date && task.due_date < today && task.status === 'open' ? 'font-medium text-red-700' : 'text-sm text-muted-foreground'}>{task.due_date ? formatDateShort(task.due_date) : '—'}</TableCell><TableCell><Badge variant={task.priority === 'high' ? 'destructive' : task.priority === 'low' ? 'secondary' : 'warning'}>{task.priority}</Badge></TableCell><TableCell><Badge variant={task.status === 'completed' ? 'success' : task.status === 'cancelled' ? 'outline' : 'secondary'}>{task.status}</Badge></TableCell></TableRow>) : <TableRow><TableCell colSpan={7} className="h-36 text-center text-muted-foreground">No tasks match this view.</TableCell></TableRow>}</TableBody></Table></div><div className="flex items-center justify-between border-t bg-muted/10 px-4 py-3 text-xs text-muted-foreground"><span>{filteredTasks.length} of {tasks.length} tasks</span><span>List view · filters apply instantly</span></div></section>
  </div>
}

function Metric({ label, value, detail, tone }: { label: string; value: number; detail: string; tone: string }) { return <div className="rounded-xl border bg-card p-5 shadow-[0_8px_25px_-20px_rgba(23,23,23,0.5)]"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p><p className={`mt-3 font-serif text-3xl font-semibold ${tone}`}>{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div> }
