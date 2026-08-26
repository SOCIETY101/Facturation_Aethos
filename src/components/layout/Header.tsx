import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { getCompanyByUserId } from '@/lib/api/company'
import { LogOut, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Database } from '@/lib/supabase'

type Company = Database['public']['Tables']['companies']['Row']

const pageNames: Record<string, string> = {
  '/': 'Overview', '/clients': 'Billing clients', '/crm': 'Revenue room', '/crm/work': 'Commitments',
  '/quotes': 'Quotes', '/invoices': 'Invoices', '/templates': 'Templates', '/settings': 'Settings',
}

export function Header() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [company, setCompany] = useState<Company | null>(null)

  useEffect(() => {
    if (user) getCompanyByUserId(user.id).then(setCompany).catch(() => undefined)
  }, [user])

  const pageName = location.pathname.startsWith('/crm/accounts/') ? 'Relationship' : pageNames[location.pathname] || 'Aethos'
  const handleSignOut = async () => { await signOut(); navigate('/login') }

  return <header className="sticky top-0 z-30 h-16 border-b border-[#d8d2ca] bg-[rgba(255,254,252,.9)] shadow-[0_1px_0_rgba(255,255,255,.8)] backdrop-blur-2xl supports-[backdrop-filter]:bg-[rgba(255,254,252,.82)]">
    <div className="flex h-full items-center justify-between px-5 pl-20 lg:px-8">
      <div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9b938a]">{company?.name || 'Aethos'}</p><p className="mt-0.5 text-sm font-semibold tracking-[-0.01em] text-[#332f2b]">{pageName}</p></div>
      <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" aria-label="Open account menu" className="crm-press h-10 rounded-xl px-2.5 text-[#5f5851]"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#e8e2dc]"><UserRound className="h-3.5 w-3.5" /></span><span className="hidden max-w-[190px] truncate text-xs sm:inline">{user?.email || 'Account'}</span></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-56 origin-top-right"><DropdownMenuLabel className="text-xs">Workspace account</DropdownMenuLabel><DropdownMenuSeparator /><DropdownMenuItem onClick={handleSignOut}><LogOut className="mr-2 h-4 w-4" /> Log out</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
    </div>
  </header>
}
