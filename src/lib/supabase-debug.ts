// Debug utility to check Supabase connection
import { supabase } from './supabase'

export async function testSupabaseConnection() {
  console.log('Testing Supabase connection...')
  console.log('URL:', import.meta.env.VITE_SUPABASE_URL)
  console.log('Key length:', import.meta.env.VITE_SUPABASE_ANON_KEY?.length)
  console.log('Key starts with:', import.meta.env.VITE_SUPABASE_ANON_KEY?.substring(0, 20))

  try {
    // Test basic connection
    const { data, error } = await supabase.from('companies').select('count').limit(1)
    
    if (error) {
      console.error('Supabase connection error:', error)
      return { success: false, error }
    }
    
    console.log('Supabase connection successful!')
    return { success: true, data }
  } catch (err) {
    console.error('Unexpected error:', err)
    return { success: false, error: err }
  }
}

// Call this in development to test connection
if (import.meta.env.DEV) {
  // Uncomment to test on app load
  // testSupabaseConnection()
}
