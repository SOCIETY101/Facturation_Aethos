import { supabase, Database } from '@/lib/supabase'

export type Contact = Database['public']['Tables']['contacts']['Row']
export type ContactInsert = Database['public']['Tables']['contacts']['Insert']
export type DealStage = Database['public']['Tables']['deal_stages']['Row']
export type Deal = Database['public']['Tables']['deals']['Row']
export type DealInsert = Database['public']['Tables']['deals']['Insert']
export type DealUpdate = Database['public']['Tables']['deals']['Update']
export type CrmActivity = Database['public']['Tables']['crm_activities']['Row']
export type CrmActivityInsert = Database['public']['Tables']['crm_activities']['Insert']
export type CrmTask = Database['public']['Tables']['crm_tasks']['Row']
export type CrmTaskInsert = Database['public']['Tables']['crm_tasks']['Insert']

type ClientSummary = Pick<Database['public']['Tables']['clients']['Row'], 'id' | 'name' | 'email' | 'phone'>

export interface DealWithRelations extends Deal {
  clients: ClientSummary
  deal_stages: DealStage
}

export interface TaskWithRelations extends CrmTask {
  clients: ClientSummary | null
  deals: Pick<Deal, 'id' | 'name'> | null
}

export async function getDealStages(companyId: string) {
  const { data, error } = await supabase
    .from('deal_stages')
    .select('*')
    .eq('company_id', companyId)
    .order('position')

  if (error) throw error
  return data as DealStage[]
}

export async function getDeals(companyId: string) {
  const { data, error } = await supabase
    .from('deals')
    .select('*, clients(id, name, email, phone), deal_stages(*)')
    .eq('company_id', companyId)
    .order('updated_at', { ascending: false })

  if (error) throw error
  return data as DealWithRelations[]
}

export async function getDealsForClient(clientId: string) {
  const { data, error } = await supabase
    .from('deals')
    .select('*, clients(id, name, email, phone), deal_stages(*)')
    .eq('client_id', clientId)
    .order('updated_at', { ascending: false })

  if (error) throw error
  return data as DealWithRelations[]
}

export async function createDeal(deal: DealInsert) {
  const { data, error } = await supabase
    .from('deals')
    .insert(deal)
    .select('*, clients(id, name, email, phone), deal_stages(*)')
    .single()

  if (error) throw error
  return data as DealWithRelations
}

export async function updateDeal(id: string, updates: DealUpdate) {
  const { data, error } = await supabase
    .from('deals')
    .update(updates)
    .eq('id', id)
    .select('*, clients(id, name, email, phone), deal_stages(*)')
    .single()

  if (error) throw error
  return data as DealWithRelations
}

export async function getContacts(clientId: string) {
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('client_id', clientId)
    .order('is_primary', { ascending: false })
    .order('created_at')

  if (error) throw error
  return data as Contact[]
}

export async function createContact(contact: ContactInsert) {
  const { data, error } = await supabase
    .from('contacts')
    .insert(contact)
    .select()
    .single()

  if (error) throw error
  return data as Contact
}

export async function getActivities(clientId: string) {
  const { data, error } = await supabase
    .from('crm_activities')
    .select('*')
    .eq('client_id', clientId)
    .order('occurred_at', { ascending: false })

  if (error) throw error
  return data as CrmActivity[]
}

export async function createActivity(activity: CrmActivityInsert) {
  const { data, error } = await supabase
    .from('crm_activities')
    .insert(activity)
    .select()
    .single()

  if (error) throw error
  return data as CrmActivity
}

export async function getTasks(companyId: string, clientId?: string) {
  let query = supabase
    .from('crm_tasks')
    .select('*, clients(id, name, email, phone), deals(id, name)')
    .eq('company_id', companyId)
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (clientId) query = query.eq('client_id', clientId)

  const { data, error } = await query
  if (error) throw error
  return data as TaskWithRelations[]
}

export async function createTask(task: CrmTaskInsert) {
  const { data, error } = await supabase
    .from('crm_tasks')
    .insert(task)
    .select('*, clients(id, name, email, phone), deals(id, name)')
    .single()

  if (error) throw error
  return data as TaskWithRelations
}

export async function completeTask(id: string, completed: boolean) {
  const { data, error } = await supabase
    .from('crm_tasks')
    .update({
      status: completed ? 'completed' : 'open',
      completed_at: completed ? new Date().toISOString() : null,
    })
    .eq('id', id)
    .select('*, clients(id, name, email, phone), deals(id, name)')
    .single()

  if (error) throw error
  return data as TaskWithRelations
}
