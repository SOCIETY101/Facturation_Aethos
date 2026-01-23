// Test utility to verify Supabase auth is working
import { supabase } from './supabase'

export async function testAuth() {
  console.log('=== Testing Supabase Auth ===')
  
  // Test 1: Check connection
  console.log('1. Testing connection...')
  const { data: healthCheck, error: healthError } = await supabase
    .from('companies')
    .select('count')
    .limit(1)
  
  if (healthError) {
    console.error('❌ Connection failed:', healthError.message)
    if (healthError.message.includes('table') || healthError.message.includes('schema')) {
      console.error('⚠️  Database tables not found! Run SQL migrations first.')
    }
  } else {
    console.log('✅ Connection successful')
  }

  // Test 2: Check current session
  console.log('\n2. Checking current session...')
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  if (sessionError) {
    console.error('❌ Session error:', sessionError.message)
  } else if (session) {
    console.log('✅ User is logged in:', session.user.email)
  } else {
    console.log('ℹ️  No active session')
  }

  // Test 3: Check if tables exist
  console.log('\n3. Checking if tables exist...')
  const tables = ['companies', 'profiles', 'clients', 'quotes', 'invoices']
  for (const table of tables) {
    try {
      const { error } = await supabase.from(table).select('count').limit(0)
      if (error) {
        console.error(`❌ Table '${table}' not found`)
      } else {
        console.log(`✅ Table '${table}' exists`)
      }
    } catch (err) {
      console.error(`❌ Error checking '${table}':`, err)
    }
  }

  return {
    connected: !healthError,
    hasSession: !!session,
    tablesExist: !healthError,
  }
}

// Call this from browser console: window.testAuth()
if (typeof window !== 'undefined') {
  (window as any).testAuth = testAuth
}
