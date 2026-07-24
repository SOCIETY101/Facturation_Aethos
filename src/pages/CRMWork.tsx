import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle2, Circle, ListTodo, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useCompany } from '@/hooks/useCompany'
import { useAuth } from '@/contexts/AuthContext'
import { getClients } from '@/lib/api/clients'
import { completeTask, createTask, getDeals, getTasks, TaskWithRelations } from '@/lib/api/crm'
import { formatDateShort } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'

type ClientOption = { id: string; name: string }
type DealOption = { id: string; name: string; clientId: string }

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

  useEffect(() => {
    if (!company) return
    setLoading(true)
    Promise.all([getTasks(company.id, accountId), getClients(company.id), getDeals(company.id)])
      .then(([taskData, clientData, dealData]) => {
        setTasks(taskData)
        setClients(clientData.map((client) => ({ id: client.id, name: client.name })))
        setDeals(dealData.map((deal) => ({ id: deal.id, name: deal.name, clientId: deal.client_id })))
      })
      .catch((error) => { console.error('Error loading CRM tasks:', error); toast({ title: 'Could not load work queue', variant: 'destructive' }) })
      .finally(() => setLoading(false))
  }, [accountId, company, toast])

  const openTasks = tasks.filter((task) => task.status === 'open')
  const today = new Date().toISOString().slice(0, 10)
  const overdue = openTasks.filter((task) => task.due_date && task.due_date < today)
  const todayTasks = openTasks.filter((task) => task.due_date === today)
  const later = openTasks.filter((task) => !task.due_date || task.due_date > today)

  const clientLabel = useMemo(() => accountId ? clients.find((client) => client.id === accountId)?.name : null, [accountId, clients])

  const handleCreateTask = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!company) return
    const form = new FormData(event.currentTarget)
    const selectedClient = String(form.get('clientId') || '') || null
    const selectedDeal = String(form.get('dealId') || '') || null
    try {
      const task = await createTask({
        company_id: company.id,
        client_id: selectedClient,
        deal_id: selectedDeal,
        contact_id: null,
        assignee_id: user?.id || null,
        title: String(form.get('title') || ''),
        description: String(form.get('description') || '') || null,
        due_date: String(form.get('dueDate') || '') || null,
        priority: (String(form.get('priority') || 'medium') as 'low' | 'medium' | 'high'),
        status: 'open',
        completed_at: null,
        created_by: user?.id || null,
      })
      setTasks((current) => [...current, task])
      setIsDialogOpen(false)
      toast({ title: 'Follow-up scheduled', description: 'It is now in your work queue.' })
    } catch (error) { console.error('Error creating task:', error); toast({ title: 'Could not save task', variant: 'destructive' }) }
  }

  const toggleTask = async (task: TaskWithRelations) => {
    try {
      const updated = await completeTask(task.id, task.status !== 'completed')
      setTasks((current) => current.map((item) => item.id === updated.id ? updated : item))
    } catch (error) { console.error('Error updating task:', error); toast({ title: 'Task was not updated', variant: 'destructive' }) }
  }

  if (companyLoading || loading) return <div className="flex min-h-[60vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" /></div>

  return <div className="space-y-7">
    <section className="flex flex-col gap-4 border-b pb-6 md:flex-row md:items-end md:justify-between"><div><div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary"><ListTodo className="h-4 w-4" /> My work</div><h1 className="font-serif text-3xl font-semibold tracking-tight">A clear next move, every day.</h1><p className="mt-2 text-sm text-muted-foreground">{clientLabel ? `Follow-up queue for ${clientLabel}.` : 'Follow-ups across clients, opportunities, and payment conversations.'}</p></div><Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}><DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Schedule follow-up</Button></DialogTrigger><DialogContent className="sm:max-w-[540px]"><form onSubmit={handleCreateTask}><DialogHeader><DialogTitle>Schedule a follow-up</DialogTitle><DialogDescription>Keep the next action specific, owned, and time-bound.</DialogDescription></DialogHeader><div className="grid gap-4 py-5"><div className="grid gap-2"><Label htmlFor="task-title">Task</Label><Input id="task-title" name="title" placeholder="Call to review proposal feedback" required /></div><div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><div className="grid gap-2"><Label>Account</Label><Select name="clientId" defaultValue={accountId}><SelectTrigger><SelectValue placeholder="Optional account" /></SelectTrigger><SelectContent>{clients.map((client) => <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>)}</SelectContent></Select></div><div className="grid gap-2"><Label>Opportunity</Label><Select name="dealId"><SelectTrigger><SelectValue placeholder="Optional deal" /></SelectTrigger><SelectContent>{deals.map((deal) => <SelectItem key={deal.id} value={deal.id}>{deal.name}</SelectItem>)}</SelectContent></Select></div></div><div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><div className="grid gap-2"><Label htmlFor="due-date">Due date</Label><Input id="due-date" name="dueDate" type="date" /></div><div className="grid gap-2"><Label>Priority</Label><Select name="priority" defaultValue="medium"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="high">High</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="low">Low</SelectItem></SelectContent></Select></div></div><div className="grid gap-2"><Label htmlFor="task-description">Context</Label><Textarea id="task-description" name="description" placeholder="What should happen in this conversation?" /></div></div><DialogFooter><Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button><Button type="submit">Schedule task</Button></DialogFooter></form></DialogContent></Dialog></section>
    <section className="grid gap-4 sm:grid-cols-3"><QueueMetric label="Overdue" value={overdue.length} tone="text-red-700" detail="Needs attention now" /><QueueMetric label="Due today" value={todayTasks.length} tone="text-amber-700" detail="Protect today’s momentum" /><QueueMetric label="Open follow-ups" value={openTasks.length} tone="text-primary" detail="Across your revenue desk" /></section>
    <TaskSection title="Overdue" description="Resolve the most time-sensitive relationship work first." tasks={overdue} onToggle={toggleTask} empty="Nothing overdue — nice work." urgent />
    <TaskSection title="Today" description="The conversations that matter before the day ends." tasks={todayTasks} onToggle={toggleTask} empty="No tasks due today." />
    <TaskSection title="Coming up" description="Stay ahead of proposals, payments, and renewals." tasks={later} onToggle={toggleTask} empty="Your follow-up queue is clear." />
    {tasks.filter((task) => task.status === 'completed').length > 0 && <details className="rounded-xl border bg-muted/20 px-5 py-4"><summary className="cursor-pointer text-sm font-medium">Completed tasks ({tasks.filter((task) => task.status === 'completed').length})</summary><div className="mt-3 space-y-2">{tasks.filter((task) => task.status === 'completed').map((task) => <TaskRow key={task.id} task={task} onToggle={toggleTask} />)}</div></details>}
  </div>
}

function QueueMetric({ label, value, detail, tone }: { label: string; value: number; detail: string; tone: string }) { return <div className="rounded-xl border bg-card p-5"><p className="text-xs font-semibold uppercase tracking-[0.13em] text-muted-foreground">{label}</p><p className={`mt-2 font-serif text-3xl font-semibold ${tone}`}>{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div> }
function TaskSection({ title, description, tasks, onToggle, empty, urgent = false }: { title: string; description: string; tasks: TaskWithRelations[]; onToggle: (task: TaskWithRelations) => void; empty: string; urgent?: boolean }) { return <section className="rounded-xl border bg-card"><div className="flex items-center justify-between border-b px-5 py-4"><div><h2 className="font-serif text-lg font-semibold">{title}</h2><p className="mt-0.5 text-xs text-muted-foreground">{description}</p></div>{urgent && tasks.length > 0 && <Badge variant="destructive">{tasks.length} urgent</Badge>}</div><div className="divide-y">{tasks.length ? tasks.map((task) => <TaskRow key={task.id} task={task} onToggle={onToggle} />) : <div className="px-5 py-7 text-sm text-muted-foreground">{empty}</div>}</div></section> }
function TaskRow({ task, onToggle }: { task: TaskWithRelations; onToggle: (task: TaskWithRelations) => void }) { const isComplete = task.status === 'completed'; return <div className="flex items-start gap-3 px-5 py-4"><button onClick={() => onToggle(task)} className="mt-0.5 shrink-0 text-primary" aria-label={isComplete ? 'Reopen task' : 'Complete task'}>{isComplete ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}</button><div className="min-w-0 flex-1"><div className={`font-medium ${isComplete ? 'text-muted-foreground line-through' : ''}`}>{task.title}</div>{task.description && <p className="mt-1 text-sm text-muted-foreground">{task.description}</p>}<div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">{task.clients && <Link to={`/crm/accounts/${task.clients.id}`} className="font-medium text-primary hover:underline">{task.clients.name}</Link>}{task.deals && <span>· {task.deals.name}</span>}{task.due_date && <span>· {formatDateShort(task.due_date)}</span>}</div></div><Badge variant={task.priority === 'high' ? 'destructive' : task.priority === 'low' ? 'secondary' : 'warning'} className="shrink-0">{task.priority}</Badge></div> }
