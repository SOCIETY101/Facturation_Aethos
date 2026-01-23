import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { getCompanyByUserId } from '@/lib/api/company'
import { Database } from '@/lib/supabase'

type Company = Database['public']['Tables']['companies']['Row']

export function useCompany() {
  const { user } = useAuth()
  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const refresh = useCallback(() => {
    if (!user) {
      setCompany(null)
      setLoading(false)
      return
    }

    setLoading(true)
    getCompanyByUserId(user.id)
      .then((data) => {
        setCompany(data)
        setError(null)
      })
      .catch((err) => {
        setError(err)
        setCompany(null)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [user])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { company, loading, error, refresh }
}
