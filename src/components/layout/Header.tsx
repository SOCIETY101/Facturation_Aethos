import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { getCompanyByUserId } from '@/lib/api/company'
import { User, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Database } from '@/lib/supabase'

type Company = Database['public']['Tables']['companies']['Row']

export function Header() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      getCompanyByUserId(user.id)
        .then((data) => {
          setCompany(data)
          setLoading(false)
        })
        .catch(() => setLoading(false))
    }
  }, [user])

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <header className="sticky top-0 z-30 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4 lg:px-8">
        <div className="flex items-center gap-2">
          {company?.logo_url && (
            <img
              src={company.logo_url}
              alt={company.name}
              className="h-8 w-8 rounded"
            />
          )}
          <div>
            <h2 className="text-sm font-semibold">
              {loading ? 'Loading...' : company?.name || 'Facturation'}
            </h2>
            <p className="text-xs text-muted-foreground">Invoice Management</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">
                  {user?.email || 'User'}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
