import { supabase } from '../supabase'
import { Database } from '../supabase'

type Quote = Database['public']['Tables']['quotes']['Row']
type QuoteInsert = Database['public']['Tables']['quotes']['Insert']
type QuoteUpdate = Database['public']['Tables']['quotes']['Update']
type QuoteItem = Database['public']['Tables']['quote_items']['Row']
type QuoteItemInsert = Database['public']['Tables']['quote_items']['Insert']

export interface QuoteWithItems extends Quote {
  quote_items: QuoteItem[]
  clients?: Database['public']['Tables']['clients']['Row']
}

export async function getQuotes(companyId: string) {
  const { data, error } = await supabase
    .from('quotes')
    .select(`
      *,
      quote_items (*),
      clients (*)
    `)
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as QuoteWithItems[]
}

export async function getQuote(id: string) {
  const { data, error } = await supabase
    .from('quotes')
    .select(`
      *,
      quote_items (*),
      clients (*)
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return data as QuoteWithItems
}

export async function createQuote(
  quote: Omit<QuoteInsert, 'quote_number'>,
  items: Omit<QuoteItemInsert, 'quote_id'>[],
  quoteNumber: string
) {
  const { data: quoteData, error: quoteError } = await supabase
    .from('quotes')
    .insert({ ...quote, quote_number: quoteNumber })
    .select()
    .single()

  if (quoteError) throw quoteError

  if (items.length > 0) {
    const quoteItems = items.map((item) => ({
      ...item,
      quote_id: quoteData.id,
    }))

    const { error: itemsError } = await supabase
      .from('quote_items')
      .insert(quoteItems)

    if (itemsError) throw itemsError
  }

  return getQuote(quoteData.id)
}

export async function updateQuote(
  id: string,
  updates: QuoteUpdate,
  items?: Omit<QuoteItemInsert, 'quote_id'>[]
) {
  const { error: quoteError } = await supabase
    .from('quotes')
    .update(updates)
    .eq('id', id)

  if (quoteError) throw quoteError

  if (items) {
    // Delete existing items
    await supabase.from('quote_items').delete().eq('quote_id', id)

    // Insert new items
    if (items.length > 0) {
      const quoteItems = items.map((item) => ({
        ...item,
        quote_id: id,
      }))

      const { error: itemsError } = await supabase
        .from('quote_items')
        .insert(quoteItems)

      if (itemsError) throw itemsError
    }
  }

  return getQuote(id)
}

export async function deleteQuote(id: string) {
  const { error } = await supabase.from('quotes').delete().eq('id', id)
  if (error) throw error
}

export async function getNextQuoteNumber(companyId: string, prefix: string) {
  const { data } = await supabase
    .from('quotes')
    .select('quote_number')
    .eq('company_id', companyId)
    .like('quote_number', `${prefix}%`)
    .order('quote_number', { ascending: false })
    .limit(1)

  if (!data || data.length === 0) {
    const { data: company } = await supabase
      .from('companies')
      .select('quote_start_number')
      .eq('id', companyId)
      .single()

    return company?.quote_start_number || 1
  }

  const lastNumber = parseInt(data[0].quote_number.replace(prefix, '').replace(/-/g, ''))
  return isNaN(lastNumber) ? 1 : lastNumber + 1
}
