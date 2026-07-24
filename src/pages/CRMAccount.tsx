import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarClock, Mail, MapPin, MessageSquare, Phone, Plus, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useCompany } from '@/hooks/useCompany'
import { useAuth } from '@/contexts/AuthContext'
import { getClient } from '@/lib/api/clients'
import { Contact, createActivity, createContact, CrmActivity, DealWithRelations, getActivities, getContacts, getDealsForClient, getTasks, TaskWithRelations } from '@/lib/api/crm'
import { formatCurrency, formatDateShort } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'

export default function CRMAccount() {
  const { clientId } = useParams<{ clientId: string }>()
  const { company, loading: companyLoading } = useCompany()
  const { user } = useAuth()
  const { toast } = useToast()
  const [client, setClient] = useState<Awaited<ReturnType<typeof getClient>> | null>(null)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [deals, setDeals] = useState<DealWithRelations[]>([])
  const [activities, setActivities] = useState<CrmActivity[]>([])
  const [tasks, setTasks] = useState<TaskWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [contactDialogOpen, setContactDialogOpen] = useState(false)
  const [noteDialogOpen, setNoteDialogOpen] = useState(false)

  useEffect(() => {
    if (!company || !clientId) return
    setLoading(true)
    Promise.all([getClient(clientId), getContacts(clientId), getDealsForClient(clientId), getActivities(clientId), getTasks(company.id, clientId)])
      .then(([clientData, contactsData, dealsData, activityData, taskData]) => {
        setClient(clientData)
        setContacts(contactsData)
        setDeals(dealsData)
        setActivities(activityData)
        setTasks(taskData)
      })
      .catch((error) => { console.error('Error loading account workspace:', error); toast({ title: 'Could not load account', description: 'Please return to the pipeline and try again.', variant: 'destructive' }) })
      .finally(() => setLoading(false))
  }, [clientId, company, toast])

  const revenue = deals.filter((deal) => deal.status === 'won').reduce((sum, deal) => sum + Number(deal.amount), 0)
  const pipeline = deals.filter((deal) => deal.status === 'open').reduce((sum, deal) => sum + Number(deal.amount), 0)
  const openTasks = tasks.filter((task) => task.status === 'open')
  const primaryContact = contacts.find((contact) => contact.is_primary) || contacts[0]

  const recentActivity = useMemo(() => activities.slice(0, 8), [activities])

  const handleCreateContact = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!company || !clientId) return
    const form = new FormData(event.currentTarget)
    try {
      const contact = await createContact({
        company_id: company.id,
        client_id: clientId,
        first_name: String(form.get('firstName') || ''),
        last_name: String(form.get('lastName') || '') || null,
        email: String(form.get('email') || '') || null,
        phone: String(form.get('phone') || '') || null,
        title: String(form.get('title') || '') || null,
        is_primary: contacts.length === 0,
        notes: null,
        created_by: user?.id || null,
      })
      setContacts((current) => [...current, contact])
      setContactDialogOpen(false)
      toast({ title: 'Contact added', description: 'The relationship map is up to date.' })
    } catch (error) { console.error('Error creating contact:', error); toast({ title: 'Could not add contact', variant: 'destructive' }) }
  }

  const handleCreateNote = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!company || !clientId) return
    const form = new FormData(event.currentTarget)
    try {
      const activity = await createActivity({
        company_id: company.id,
        client_id: clientId,
        deal_id: null,
        contact_id: null,
        type: 'note',
        subject: String(form.get('subject') || ''),
        body: String(form.get('body') || '') || null,
        occurred_at: new Date().toISOString(),
        created_by: user?.id || null,
      })
      setActivities((current) => [activity, ...current])
      setNoteDialogOpen(false)
      toast({ title: 'Note saved', description: 'It is now part of this account’s timeline.' })
    } catch (error) { console.error('Error saving activity:', error); toast({ title: 'Could not save note', variant: 'destructive' }) }
  }

  if (companyLoading || loading) return <div className="flex min-h-[60vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" /></div>
  if (!client) return <div className="rounded-xl border p-8"><h1 className="font-serif text-2xl font-semibold">Account not found</h1><Button asChild variant="outline" className="mt-4"><Link to="/crm">Return to pipeline</Link></Button></div>

  return <div className="space-y-7">
    <Link to="/crm" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary"><ArrowLeft className="h-4 w-4" /> Pipeline</Link>
      <section className="rounded-2xl border bg-card p-6 shadow-[0_12px_35px_-28px_rgba(23,23,23,0.8)] md:p-7"><div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between"><div><div className="flex flex-wrap items-center gap-2"><Badge variant="outline">Account workspace</Badge>{openTasks.length > 0 && <Badge variant="warning">{openTasks.length} open follow-up{openTasks.length > 1 ? 's' : ''}</Badge>}</div><h1 className="mt-3 font-serif text-3xl font-semibold tracking-tight">{client.name}</h1><div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">{client.email && <a className="inline-flex items-center gap-1.5 hover:text-primary" href={`mailto:${client.email}`}><Mail className="h-4 w-4" />{client.email}</a>}{client.phone && <a className="inline-flex items-center gap-1.5 hover:text-primary" href={`tel:${client.phone}`}><Phone className="h-4 w-4" />{client.phone}</a>}{client.address && <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" />{client.address}</span>}</div></div><div className="flex flex-wrap gap-2"><Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}><DialogTrigger asChild><Button variant="outline"><MessageSquare className="mr-2 h-4 w-4" /> Add note</Button></DialogTrigger><DialogContent><form onSubmit={handleCreateNote}><DialogHeader><DialogTitle>Capture relationship context</DialogTitle><DialogDescription>Notes become part of this account’s shared commercial memory.</DialogDescription></DialogHeader><div className="grid gap-4 py-5"><div className="grid gap-2"><Label htmlFor="note-subject">Headline</Label><Input id="note-subject" name="subject" placeholder="Client requested a revised timeline" required /></div><div className="grid gap-2"><Label htmlFor="note-body">Details</Label><Textarea id="note-body" name="body" placeholder="Key decisions, objections, commitments…" className="min-h-28" /></div></div><DialogFooter><Button type="button" variant="outline" onClick={() => setNoteDialogOpen(false)}>Cancel</Button><Button type="submit">Save note</Button></DialogFooter></form></DialogContent></Dialog><Button asChild><Link to={`/crm/work?client=${client.id}`}><CalendarClock className="mr-2 h-4 w-4" /> Schedule follow-up</Link></Button></div></div></section>
    <section className="grid gap-4 sm:grid-cols-3"><AccountMetric label="Open pipeline" value={formatCurrency(pipeline)} /><AccountMetric label="Won opportunities" value={formatCurrency(revenue)} /><AccountMetric label="Primary contact" value={primaryContact ? `${primaryContact.first_name}${primaryContact.last_name ? ` ${primaryContact.last_name}` : ''}` : 'Not set'} /></section>
    <div className="grid gap-7 xl:grid-cols-[0.95fr_1.45fr]">
      <aside className="space-y-7"><section className="rounded-xl border bg-card"><div className="flex items-center justify-between border-b px-5 py-4"><div><h2 className="font-serif text-lg font-semibold">People</h2><p className="text-xs text-muted-foreground">The relationships behind the account</p></div><Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}><DialogTrigger asChild><Button size="sm" variant="outline"><Plus className="mr-1.5 h-4 w-4" /> Contact</Button></DialogTrigger><DialogContent><form onSubmit={handleCreateContact}><DialogHeader><DialogTitle>Add a contact</DialogTitle><DialogDescription>Start with the person who influences the commercial decision.</DialogDescription></DialogHeader><div className="grid gap-4 py-5"><div className="grid grid-cols-2 gap-3"><div className="grid gap-2"><Label htmlFor="first-name">First name</Label><Input id="first-name" name="firstName" required /></div><div className="grid gap-2"><Label htmlFor="last-name">Last name</Label><Input id="last-name" name="lastName" /></div></div><div className="grid gap-2"><Label htmlFor="contact-title">Role / title</Label><Input id="contact-title" name="title" placeholder="Founder, finance lead…" /></div><div className="grid gap-2"><Label htmlFor="contact-email">Email</Label><Input id="contact-email" name="email" type="email" /></div><div className="grid gap-2"><Label htmlFor="contact-phone">Phone</Label><Input id="contact-phone" name="phone" /></div></div><DialogFooter><Button type="button" variant="outline" onClick={() => setContactDialogOpen(false)}>Cancel</Button><Button type="submit">Add contact</Button></DialogFooter></form></DialogContent></Dialog></div><div className="divide-y">{contacts.length ? contacts.map((contact) => <div key={contact.id} className="px-5 py-4"><div className="flex items-center justify-between gap-2"><div className="flex min-w-0 items-center gap-2"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><UserRound className="h-4 w-4" /></div><div className="min-w-0"><p className="truncate text-sm font-medium">{contact.first_name} {contact.last_name}</p><p className="truncate text-xs text-muted-foreground">{contact.title || 'Contact'}</p></div></div>{contact.is_primary && <Badge variant="secondary">Primary</Badge>}</div><div className="mt-2 space-y-1 text-xs text-muted-foreground">{contact.email && <a href={`mailto:${contact.email}`} className="block hover:text-primary">{contact.email}</a>}{contact.phone && <a href={`tel:${contact.phone}`} className="block hover:text-primary">{contact.phone}</a>}</div></div>) : <div className="px-5 py-8 text-sm text-muted-foreground">Add the decision-makers and billing contacts for a complete account picture.</div>}</div></section>
      <section className="rounded-xl border bg-card"><div className="border-b px-5 py-4"><h2 className="font-serif text-lg font-semibold">Open follow-ups</h2><p className="text-xs text-muted-foreground">Keep account momentum visible</p></div><div className="divide-y">{openTasks.length ? openTasks.slice(0, 4).map((task) => <div key={task.id} className="px-5 py-3.5"><p className="text-sm font-medium">{task.title}</p><p className="mt-1 text-xs text-muted-foreground">{task.due_date ? `Due ${formatDateShort(task.due_date)}` : 'No due date'}{task.deals ? ` · ${task.deals.name}` : ''}</p></div>) : <div className="px-5 py-7 text-sm text-muted-foreground">No open tasks. Schedule the next meaningful action.</div>}</div></section></aside>
      <main className="space-y-7"><section className="rounded-xl border bg-card"><div className="border-b px-5 py-4"><h2 className="font-serif text-lg font-semibold">Opportunities</h2><p className="text-xs text-muted-foreground">Commercial context from the active pipeline</p></div><div className="divide-y">{deals.length ? deals.map((deal) => <div key={deal.id} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">{deal.name}</p><p className="mt-1 text-xs text-muted-foreground">{deal.deal_stages?.name || 'Unstaged'} · {deal.expected_close_date ? `Closes ${formatDateShort(deal.expected_close_date)}` : 'No close date'}</p></div><div className="flex items-center gap-3"><Badge variant={deal.status === 'won' ? 'success' : deal.status === 'lost' ? 'destructive' : 'secondary'}>{deal.status}</Badge><span className="font-serif font-semibold">{formatCurrency(Number(deal.amount))}</span></div></div>) : <div className="px-5 py-8 text-sm text-muted-foreground">No opportunities yet. Open one from the pipeline when this account has commercial potential.</div>}</div></section>
      <section className="rounded-xl border bg-card"><div className="border-b px-5 py-4"><h2 className="font-serif text-lg font-semibold">Relationship timeline</h2><p className="text-xs text-muted-foreground">Shared context for every client conversation</p></div><div className="px-5">{recentActivity.length ? recentActivity.map((activity, index) => <div key={activity.id} className="relative flex gap-4 py-5"><div className="relative z-10 mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><MessageSquare className="h-4 w-4" /></div>{index !== recentActivity.length - 1 && <div className="absolute left-9 top-12 h-[calc(100%-22px)] border-l border-dashed" />}<div><div className="flex flex-wrap items-center gap-2"><p className="font-medium">{activity.subject}</p><Badge variant="outline">{activity.type}</Badge></div>{activity.body && <p className="mt-1.5 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{activity.body}</p>}<p className="mt-2 text-xs text-muted-foreground">{formatDateShort(activity.occurred_at)}</p></div></div>) : <div className="py-10 text-center text-sm text-muted-foreground">No relationship history yet. Add a note after the next conversation.</div>}</div></section></main>
    </div>
  </div>
}

function AccountMetric({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border bg-card p-5"><p className="text-xs font-semibold uppercase tracking-[0.13em] text-muted-foreground">{label}</p><p className="mt-2 truncate font-serif text-xl font-semibold">{value}</p></div> }
