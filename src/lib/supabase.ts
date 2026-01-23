import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables:')
  console.error('VITE_SUPABASE_URL:', supabaseUrl)
  console.error('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? '***' + supabaseAnonKey.slice(-10) : 'missing')
  throw new Error('Missing Supabase environment variables. Please check your .env file.')
}

// Log connection info in development
if (import.meta.env.DEV) {
  console.log('Supabase initialized:', {
    url: supabaseUrl,
    keyLength: supabaseAnonKey.length,
    keyPrefix: supabaseAnonKey.substring(0, 20) + '...',
  })
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})

// Database types (will be generated from Supabase)
export type Database = {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string
          name: string
          email: string | null
          phone: string | null
          address: string | null
          city: string | null
          postal_code: string | null
          country: string | null
          tax_id: string | null
          logo_url: string | null
          bank_name: string | null
          bank_account: string | null
          bank_iban: string | null
          bank_bic: string | null
          invoice_prefix: string
          invoice_start_number: number
          quote_prefix: string
          quote_start_number: number
          currency: string
          default_payment_terms: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['companies']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['companies']['Insert']>
      }
      profiles: {
        Row: {
          id: string
          company_id: string | null
          email: string
          full_name: string | null
          role: string
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
      clients: {
        Row: {
          id: string
          company_id: string
          name: string
          email: string | null
          phone: string | null
          contact_person: string | null
          address: string | null
          city: string | null
          postal_code: string | null
          country: string | null
          tax_id: string | null
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['clients']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['clients']['Insert']>
      }
      products: {
        Row: {
          id: string
          company_id: string
          name: string
          description: string | null
          unit_price: number
          tax_rate: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['products']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['products']['Insert']>
      }
      tax_rates: {
        Row: {
          id: string
          company_id: string
          name: string
          rate: number
          is_default: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['tax_rates']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['tax_rates']['Insert']>
      }
      quotes: {
        Row: {
          id: string
          company_id: string
          client_id: string
          quote_number: string
          status: string
          date: string
          valid_until: string
          subtotal: number
          tax_amount: number
          total: number
          notes: string | null
          terms: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['quotes']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['quotes']['Insert']>
      }
      quote_items: {
        Row: {
          id: string
          quote_id: string
          product_id: string | null
          description: string
          quantity: number
          unit_price: number
          tax_rate: number
          total: number
          sort_order: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['quote_items']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['quote_items']['Insert']>
      }
      invoices: {
        Row: {
          id: string
          company_id: string
          client_id: string
          quote_id: string | null
          invoice_number: string
          status: string
          date: string
          due_date: string
          subtotal: number
          tax_amount: number
          total: number
          paid_amount: number
          balance: number
          notes: string | null
          terms: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['invoices']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['invoices']['Insert']>
      }
      invoice_items: {
        Row: {
          id: string
          invoice_id: string
          product_id: string | null
          description: string
          quantity: number
          unit_price: number
          tax_rate: number
          total: number
          sort_order: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['invoice_items']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['invoice_items']['Insert']>
      }
      payments: {
        Row: {
          id: string
          invoice_id: string
          amount: number
          payment_date: string
          payment_method: string
          reference: string | null
          notes: string | null
          created_by: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['payments']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['payments']['Insert']>
      }
    }
  }
}
