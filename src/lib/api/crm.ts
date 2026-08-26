import { supabase, Database } from '@/lib/supabase'
import { CRM_SHEET_SOURCE_URL, crmSheetRecords, CrmSheetRecord } from '@/data/crmSheetRecords'
import { crmLeadRecords, CrmLeadRecord } from '@/data/crmLeadRecords'

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
export type CrmAccount = Database['public']['Tables']['crm_accounts']['Row']
export type CrmAccountInsert = Database['public']['Tables']['crm_accounts']['Insert']
export type CrmImportRun = Database['public']['Tables']['crm_import_runs']['Row']

type ClientSummary = Pick<Database['public']['Tables']['clients']['Row'], 'id' | 'name' | 'email' | 'phone'>
type AccountSummary = Pick<CrmAccount, 'id' | 'name' | 'relationship_type' | 'lifecycle_status' | 'priority' | 'industry' | 'country' | 'city' | 'website'>

export interface DealWithRelations extends Deal {
  clients: ClientSummary | null
  crm_accounts: AccountSummary | null
  deal_stages: DealStage
}

export interface TaskWithRelations extends CrmTask {
  clients: ClientSummary | null
  crm_accounts: Pick<CrmAccount, 'id' | 'name' | 'priority'> | null
  deals: Pick<Deal, 'id' | 'name'> | null
}

const SHEET_IMPORT_SOURCE = 'aethos-clients-proposals-v1'
const PROSPECT_IMPORT_SOURCE = 'aethos-prospects-v1'
const VERIFIED_LEAD_IMPORT_SOURCE = 'aethos-verified-direct-leads-v1'
const WORKBOOK_IMPORT_SOURCE = 'aethos-workbook-v2'

export async function getDealStages(companyId: string) {
  const { data, error } = await supabase.from('deal_stages').select('*').eq('company_id', companyId).order('position')
  if (error) throw error
  return data as DealStage[]
}

export async function getAccounts(companyId: string) {
  const { data, error } = await supabase.from('crm_accounts').select('*').eq('company_id', companyId).order('updated_at', { ascending: false })
  if (error) throw error
  const priorityRank = { high: 0, medium: 1, low: 2 }
  return (data as CrmAccount[]).sort((a, b) =>
    priorityRank[a.priority] - priorityRank[b.priority]
      || (a.next_follow_up_at || '9999-12-31').localeCompare(b.next_follow_up_at || '9999-12-31')
      || a.name.localeCompare(b.name)
  )
}

export async function getAccount(accountId: string) {
  const { data, error } = await supabase.from('crm_accounts').select('*').eq('id', accountId).single()
  if (error) throw error
  return data as CrmAccount
}

export async function updateAccount(accountId: string, updates: Database['public']['Tables']['crm_accounts']['Update']) {
  const { data, error } = await supabase.from('crm_accounts').update(updates).eq('id', accountId).select().single()
  if (error) throw error
  return data as CrmAccount
}

const dealRelations = '*, clients(id, name, email, phone), crm_accounts(id, name, relationship_type, lifecycle_status, priority, industry, country, city, website), deal_stages(*)'

export async function getDeals(companyId: string) {
  const { data, error } = await supabase.from('deals').select(dealRelations).eq('company_id', companyId).order('next_follow_up_at', { ascending: true, nullsFirst: false }).order('updated_at', { ascending: false })
  if (error) throw error
  return data as unknown as DealWithRelations[]
}

export async function getDealsForAccount(accountId: string) {
  const { data, error } = await supabase.from('deals').select(dealRelations).eq('account_id', accountId).order('updated_at', { ascending: false })
  if (error) throw error
  return data as unknown as DealWithRelations[]
}

export async function getDealsForClient(clientId: string) {
  const { data, error } = await supabase.from('deals').select(dealRelations).eq('client_id', clientId).order('updated_at', { ascending: false })
  if (error) throw error
  return data as unknown as DealWithRelations[]
}

export async function createDeal(deal: DealInsert) {
  const { data, error } = await supabase.from('deals').insert(deal).select(dealRelations).single()
  if (error) throw error
  return data as unknown as DealWithRelations
}

export async function updateDeal(id: string, updates: DealUpdate) {
  const { data, error } = await supabase.from('deals').update(updates).eq('id', id).select(dealRelations).single()
  if (error) throw error
  return data as unknown as DealWithRelations
}

export async function getContacts(accountId: string) {
  const { data, error } = await supabase.from('contacts').select('*').eq('account_id', accountId).order('is_primary', { ascending: false }).order('created_at')
  if (error) throw error
  return data as Contact[]
}

export async function createContact(contact: ContactInsert) {
  const { data, error } = await supabase.from('contacts').insert(contact).select().single()
  if (error) throw error
  return data as Contact
}

export async function getActivities(accountId: string) {
  const { data, error } = await supabase.from('crm_activities').select('*').eq('account_id', accountId).order('occurred_at', { ascending: false })
  if (error) throw error
  return data as CrmActivity[]
}

export async function createActivity(activity: CrmActivityInsert) {
  const { data, error } = await supabase.from('crm_activities').insert(activity).select().single()
  if (error) throw error
  return data as CrmActivity
}

const taskRelations = '*, clients(id, name, email, phone), crm_accounts(id, name, priority), deals(id, name)'

export async function getTasks(companyId: string, accountId?: string) {
  let query = supabase.from('crm_tasks').select(taskRelations).eq('company_id', companyId).order('due_date', { ascending: true, nullsFirst: false }).order('created_at', { ascending: false })
  if (accountId) query = query.eq('account_id', accountId)
  const { data, error } = await query
  if (error) throw error
  return data as unknown as TaskWithRelations[]
}

export async function createTask(task: CrmTaskInsert) {
  const { data, error } = await supabase.from('crm_tasks').insert(task).select(taskRelations).single()
  if (error) throw error
  return data as unknown as TaskWithRelations
}

export async function completeTask(id: string, completed: boolean) {
  const { data, error } = await supabase.from('crm_tasks').update({ status: completed ? 'completed' : 'open', completed_at: completed ? new Date().toISOString() : null }).eq('id', id).select(taskRelations).single()
  if (error) throw error
  return data as unknown as TaskWithRelations
}

export async function getCrmImport(companyId: string) {
  const { data, error } = await supabase.from('crm_import_runs').select('*').eq('company_id', companyId).eq('source', WORKBOOK_IMPORT_SOURCE).maybeSingle()
  if (error) throw error
  return data as CrmImportRun | null
}

export async function importCrmSheet(companyId: string, userId: string | null) {
  const existing = await getCrmImport(companyId)
  if (existing) return existing

  const currentAccounts = await getAccounts(companyId)
  const linkedBillingAccounts = currentAccounts.filter((account) => account.client_id)
  const linkedRows = new Map<number, CrmAccount>()
  for (const record of crmSheetRecords) {
    const linked = linkedBillingAccounts.find((account) => normalizeAccountName(account.name) === normalizeAccountName(record.name))
    if (linked) linkedRows.set(record.sourceRow, linked)
  }

  await Promise.all([...linkedRows.entries()].map(([sourceRow, linked]) => {
    const record = crmSheetRecords.find((item) => item.sourceRow === sourceRow)!
    return updateAccount(linked.id, { ...accountFromRecord(companyId, userId, record), client_id: linked.client_id })
  }))

  const accounts = crmSheetRecords
    .filter((record) => !linkedRows.has(record.sourceRow))
    .map((record) => accountFromRecord(companyId, userId, record))
  if (accounts.length) {
    const { error: accountError } = await supabase.from('crm_accounts').upsert(accounts, { onConflict: 'company_id,import_source,source_row' })
    if (accountError) throw accountError
  }

  const leadAccounts = crmLeadRecords.map((record) => accountFromLeadRecord(companyId, userId, record))
  if (leadAccounts.length) {
    const { error: leadAccountError } = await supabase.from('crm_accounts').upsert(leadAccounts, { onConflict: 'company_id,import_source,source_row' })
    if (leadAccountError) throw leadAccountError
  }

  const { data: importedAccounts, error: readError } = await supabase.from('crm_accounts').select('id, source_row').eq('company_id', companyId).eq('import_source', SHEET_IMPORT_SOURCE)
  if (readError) throw readError
  const accountByRow = new Map((importedAccounts || []).map((account) => [account.source_row, account.id]))
  const { data: importedLeadAccounts, error: leadReadError } = await supabase
    .from('crm_accounts')
    .select('id, source_row, import_source')
    .eq('company_id', companyId)
    .in('import_source', [PROSPECT_IMPORT_SOURCE, VERIFIED_LEAD_IMPORT_SOURCE])
  if (leadReadError) throw leadReadError
  const leadAccountByKey = new Map((importedLeadAccounts || []).map((account) => [`${account.import_source}:${account.source_row}`, account.id]))
  const stages = await getDealStages(companyId)
  const stageByName = new Map(stages.map((stage) => [stage.name, stage]))

  const contacts = crmSheetRecords.filter((record) => record.contactPerson).map((record) => ({
    company_id: companyId, client_id: null, account_id: accountByRow.get(record.sourceRow) || null,
    first_name: record.contactPerson || 'Unknown contact', last_name: null, email: record.email, phone: record.phone,
    title: record.contactTitle, is_primary: true, notes: record.dataGaps,
    import_key: `${SHEET_IMPORT_SOURCE}:contact:${record.sourceRow}`, created_by: userId,
  })).concat(crmLeadRecords.filter((record) => record.contactFullName).map((record) => {
    const importSource = leadImportSource(record)
    return {
      company_id: companyId, client_id: null,
      account_id: leadAccountByKey.get(`${importSource}:${record.sourceRow}`) || null,
      first_name: record.contactFullName || 'Unknown contact', last_name: null,
      email: record.email, phone: record.phone, title: record.contactRole,
      is_primary: true, notes: record.preferredChannel ? `Preferred channel: ${record.preferredChannel}` : null,
      import_key: `${importSource}:contact:${record.sourceRow}`, created_by: userId,
    }
  }))
  if (contacts.length) {
    const { error } = await supabase.from('contacts').upsert(contacts, { onConflict: 'company_id,import_key' })
    if (error) throw error
  }

  const proposalRecords = crmSheetRecords.filter((record) => record.relationshipType === 'Proposal Lead')
  const deals = proposalRecords.map((record) => {
    const stageName = dealStageFor(record.pipelineStage)
    const stage = stageByName.get(stageName) || stageByName.get('Discovery') || stages[0]
    if (!stage) throw new Error('No CRM stages are configured for this workspace.')
    const status: 'open' | 'won' | 'lost' = stage.is_closed ? (stage.is_won ? 'won' : 'lost') : 'open'
    return {
      company_id: companyId, client_id: null, account_id: accountByRow.get(record.sourceRow) || null,
      stage_id: stage.id, owner_id: userId, name: record.proposalReference || `${record.name} opportunity`,
      description: record.servicesNeed, amount: record.potentialBudgetMad || 0, expected_close_date: null,
      probability: stage.probability, source: 'Google Sheets · Clients & Proposals', status,
      lost_reason: stageName === 'Lost' ? record.outcomeBlocker : null, priority: priorityFor(record.priority),
      last_contact_at: record.lastContact, next_follow_up_at: record.nextFollowUp, next_action: record.nextAction,
      proposal_sent_at: record.proposalDate, proposal_reference: record.proposalReference,
      original_budget_text: record.originalBudget, outcome_blocker: record.outcomeBlocker,
      source_evidence: record.sourceEvidence, data_gaps: record.dataGaps,
      import_key: `${SHEET_IMPORT_SOURCE}:deal:${record.sourceRow}`, created_by: userId,
    }
  })
  if (deals.length) {
    const { error } = await supabase.from('deals').upsert(deals, { onConflict: 'company_id,import_key', ignoreDuplicates: true })
    if (error) throw error
  }

  const { data: importedDeals, error: dealsReadError } = await supabase.from('deals').select('id, import_key').eq('company_id', companyId).like('import_key', `${SHEET_IMPORT_SOURCE}:deal:%`)
  if (dealsReadError) throw dealsReadError
  const dealByRow = new Map((importedDeals || []).map((deal) => [Number(deal.import_key?.split(':').at(-1)), deal.id]))

  const tasks = crmSheetRecords.filter((record) => record.nextAction && record.nextFollowUp && record.pipelineStage !== 'Completed / Reference' && record.pipelineStage !== 'Rejected / Lost').map((record) => ({
    company_id: companyId, client_id: null, account_id: accountByRow.get(record.sourceRow) || null,
    deal_id: dealByRow.get(record.sourceRow) || null, contact_id: null, assignee_id: userId,
    title: record.nextAction || `Follow up with ${record.name}`, description: record.outcomeBlocker || record.servicesNeed,
    due_date: record.nextFollowUp, priority: priorityFor(record.priority), status: 'open' as const,
    completed_at: null, import_key: `${SHEET_IMPORT_SOURCE}:task:${record.sourceRow}`, created_by: userId,
  }))
  if (tasks.length) {
    const { error } = await supabase.from('crm_tasks').upsert(tasks, { onConflict: 'company_id,import_key', ignoreDuplicates: true })
    if (error) throw error
  }

  const { data: run, error: runError } = await supabase.from('crm_import_runs').upsert({
    company_id: companyId, source: WORKBOOK_IMPORT_SOURCE, source_url: CRM_SHEET_SOURCE_URL,
    imported_records: crmSheetRecords.length + crmLeadRecords.length, imported_by: userId,
  }, { onConflict: 'company_id,source' }).select().single()
  if (runError) throw runError
  return run as CrmImportRun
}

function leadImportSource(record: CrmLeadRecord) {
  return record.source === 'verified_direct_leads' ? VERIFIED_LEAD_IMPORT_SOURCE : PROSPECT_IMPORT_SOURCE
}

function accountFromLeadRecord(companyId: string, userId: string | null, record: CrmLeadRecord): CrmAccountInsert {
  const isVerified = record.source === 'verified_direct_leads'
  const missing = [
    !record.email && 'email',
    !record.phone && 'phone',
    !record.website && 'website',
  ].filter(Boolean)

  return {
    company_id: companyId,
    client_id: null,
    name: record.company,
    relationship_type: 'prospect',
    lifecycle_status: 'nurture',
    source_stage: `${isVerified ? 'Verified direct lead' : 'Prospect research'} · ${record.status || 'Pending'}`,
    industry: record.sector,
    country: record.country,
    city: null,
    website: record.website,
    services_need: record.suggestedAngle,
    original_budget_text: null,
    outcome_blocker: null,
    source_evidence: record.publicSource,
    data_gaps: missing.length ? `Missing: ${missing.join(', ')}` : null,
    notes: [
      record.leadId && `Lead ID: ${record.leadId}`,
      record.preferredChannel && `Preferred channel: ${record.preferredChannel}`,
      record.businessAddress && `Public address: ${record.businessAddress}`,
      record.verifiedOn && `Verified on: ${record.verifiedOn}`,
    ].filter(Boolean).join('\n') || null,
    last_contact_at: record.lastContact,
    next_follow_up_at: record.nextFollowUp,
    next_action: record.suggestedAngle ? `Qualify fit: ${record.suggestedAngle}` : 'Qualify fit and identify a concrete business trigger.',
    meeting_date: null,
    proposal_sent: false,
    proposal_date: null,
    proposal_reference: null,
    priority: isVerified && record.potentialLead === 'Yes' ? 'high' : record.potentialLead === 'Yes' ? 'medium' : 'low',
    import_source: leadImportSource(record),
    source_row: record.sourceRow,
    created_by: userId,
  }
}

function accountFromRecord(companyId: string, userId: string | null, record: CrmSheetRecord): CrmAccountInsert {
  return {
    company_id: companyId, client_id: null, name: record.name,
    relationship_type: relationshipFor(record.relationshipType), lifecycle_status: lifecycleFor(record),
    source_stage: record.pipelineStage, industry: record.industry, country: record.country, city: record.city,
    website: record.website, services_need: record.servicesNeed, original_budget_text: record.originalBudget,
    outcome_blocker: record.outcomeBlocker, source_evidence: record.sourceEvidence, data_gaps: record.dataGaps,
    notes: record.notes, last_contact_at: record.lastContact, next_follow_up_at: record.nextFollowUp,
    next_action: record.nextAction, meeting_date: record.meetingDate, proposal_sent: record.proposalSent,
    proposal_date: record.proposalDate, proposal_reference: record.proposalReference,
    priority: priorityFor(record.priority), import_source: SHEET_IMPORT_SOURCE, source_row: record.sourceRow,
    created_by: userId,
  }
}

function relationshipFor(value: string): CrmAccount['relationship_type'] {
  if (value === 'Active Client') return 'active_client'
  if (value === 'Client Project') return 'client_project'
  if (value === 'Former Client') return 'former_client'
  if (value === 'Reference') return 'reference'
  return 'prospect'
}

function lifecycleFor(record: CrmSheetRecord): CrmAccount['lifecycle_status'] {
  if (record.pipelineStage === 'Rejected / Lost') return 'lost'
  if (record.pipelineStage === 'Completed / Reference') return record.relationshipType === 'Former Client' ? 'past_customer' : 'reference'
  if (record.pipelineStage === 'On Hold' || record.pipelineStage === 'Dispute') return 'on_hold'
  if (record.pipelineStage === 'No Response' || record.pipelineStage === 'Standby' || record.pipelineStage === 'Postponed') return 'nurture'
  if (record.relationshipType === 'Active Client') return 'customer'
  return 'active'
}

function dealStageFor(stage: string) {
  if (stage === 'Rejected / Lost') return 'Lost'
  if (stage === 'No Response' || stage === 'Standby' || stage === 'Postponed') return 'Nurture'
  if (stage === 'Under Review' || stage === 'Follow-up Due') return 'Proposal'
  return 'Discovery'
}

function priorityFor(priority: CrmSheetRecord['priority']): 'low' | 'medium' | 'high' {
  return priority.toLowerCase() as 'low' | 'medium' | 'high'
}

function normalizeAccountName(name: string) {
  return name
    .toLowerCase()
    .replace(/\bgroupe\b/g, 'group')
    .replace(/\b(llc|srl|sarl|sa|sas|ltd)\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}
