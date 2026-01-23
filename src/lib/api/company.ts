import { supabase } from '../supabase'
import { Database } from '../supabase'

type Company = Database['public']['Tables']['companies']['Row']
type CompanyUpdate = Database['public']['Tables']['companies']['Update']
type Profile = Database['public']['Tables']['profiles']['Row']
type TaxRate = Database['public']['Tables']['tax_rates']['Row']
type TaxRateInsert = Database['public']['Tables']['tax_rates']['Insert']
type TaxRateUpdate = Database['public']['Tables']['tax_rates']['Update']

export interface CompanyWithProfile extends Company {
  profiles?: Profile[]
}

export async function getCompany(id: string) {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as Company
}

export async function getCompanyByUserId(userId: string) {
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', userId)
    .single()

  if (profileError) throw profileError
  if (!profile?.company_id) return null

  return getCompany(profile.company_id)
}

export async function updateCompany(id: string, updates: CompanyUpdate) {
  const { data, error } = await supabase
    .from('companies')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Company
}

export async function getTaxRates(companyId: string) {
  const { data, error } = await supabase
    .from('tax_rates')
    .select('*')
    .eq('company_id', companyId)
    .order('is_default', { ascending: false })

  if (error) throw error
  return data as TaxRate[]
}

export async function createTaxRate(taxRate: TaxRateInsert) {
  const { data, error } = await supabase
    .from('tax_rates')
    .insert(taxRate)
    .select()
    .single()

  if (error) throw error
  return data as TaxRate
}

export async function updateTaxRate(id: string, updates: TaxRateUpdate) {
  const { data, error } = await supabase
    .from('tax_rates')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as TaxRate
}

export async function deleteTaxRate(id: string) {
  const { error } = await supabase.from('tax_rates').delete().eq('id', id)
  if (error) throw error
}

export async function uploadLogo(companyId: string, file: File) {
  const fileExt = file.name.split('.').pop()
  const fileName = `${companyId}-${Math.random()}.${fileExt}`
  const filePath = `logos/${fileName}`

  const { error: uploadError } = await supabase.storage
    .from('company-logos')
    .upload(filePath, file)

  if (uploadError) throw uploadError

  const {
    data: { publicUrl },
  } = supabase.storage.from('company-logos').getPublicUrl(filePath)

  await updateCompany(companyId, { logo_url: publicUrl })

  return publicUrl
}

export async function deleteLogo(companyId: string, logoUrl: string) {
  const fileName = logoUrl.split('/').pop()
  if (fileName) {
    const { error } = await supabase.storage
      .from('company-logos')
      .remove([`logos/${fileName}`])

    if (error) throw error
  }

  await updateCompany(companyId, { logo_url: null })
}

export async function createCompanyForUser(
  userId: string,
  companyName: string,
  userEmail: string
) {
  const { data, error } = await supabase.rpc('create_company_for_user', {
    user_id: userId,
    company_name: companyName,
    user_email: userEmail,
  })

  if (error) {
    console.error('RPC Error details:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    })
    throw new Error(`Failed to create company: ${error.message}`)
  }
  
  if (!data) {
    throw new Error('Company creation returned no data')
  }
  
  return data as string // Returns company ID
}
