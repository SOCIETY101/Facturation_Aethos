import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Users, FileText, Receipt, Settings, Menu, X, FileCheck, Briefcase, ListTodo } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import logoImage from '@/assets/faviconaethos.png'

const navigation = [
  { name: 'Overview', href: '/', icon: LayoutDashboard },
  { name: 'Billing clients', href: '/clients', icon: Users },
  { name: 'Revenue room', href: '/crm', icon: Briefcase },
  { name: 'Commitments', href: '/crm/work', icon: ListTodo },
  { name: 'Quotes', href: '/quotes', icon: FileText },
  { name: 'Invoices', href: '/invoices', icon: Receipt },
  { name: 'Templates', href: '/templates', icon: FileCheck },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export function Sidebar() {
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const isActive = (href: string) => href === '/'
    ? location.pathname === '/'
    : href === '/crm'
      ? location.pathname === '/crm' || location.pathname.startsWith('/crm/accounts/')
      : location.pathname.startsWith(href)

  return <>
    <div className="fixed left-4 top-4 z-50 lg:hidden">
      <Button variant="outline" size="icon" className="rounded-xl border-white/60 bg-white/80 shadow-lg backdrop-blur-xl" onClick={() => setMobileMenuOpen((open) => !open)} aria-label={mobileMenuOpen ? 'Close navigation' : 'Open navigation'}>{mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</Button>
    </div>

    <aside className={cn('fixed inset-y-0 left-0 z-40 w-[240px] transform border-r border-white/[0.06] bg-[#1e1c1a] text-white transition-transform duration-200 ease-drawer lg:translate-x-0', mobileMenuOpen ? 'translate-x-0' : '-translate-x-full')}>
      <div className="flex h-full flex-col">
        <div className="flex h-[72px] items-center border-b border-white/[0.07] px-5">
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-white p-1"><img src={logoImage} alt="Aethos" className="h-full w-full object-contain" /></div>
          <div className="ml-3"><p className="text-[13px] font-semibold tracking-[-0.01em]">Aethos</p><p className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-white/35">Business OS</p></div>
        </div>

        <nav className="flex-1 px-3 py-5">
          <p className="px-3 pb-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/25">Workspace</p>
          <div className="space-y-1">{navigation.map((item) => {
            const active = isActive(item.href), Icon = item.icon
            return <Link key={item.name} to={item.href} onClick={() => setMobileMenuOpen(false)} className={cn('group flex h-10 items-center gap-3 rounded-xl px-3 text-[13px] font-medium text-white/55 transition-[background-color,color,transform] duration-150 ease-swift active:scale-[.98] hover:bg-white/[0.055] hover:text-white', active && 'bg-white/[0.09] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,.035)]')}>
              <Icon className={cn('h-4 w-4 text-white/35 transition-colors duration-150 group-hover:text-white/70', active && 'text-[#d58f84]')} />
              <span>{item.name}</span>
              {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#c4564d] shadow-[0_0_0_4px_rgba(196,86,77,.12)]" />}
            </Link>
          })}</div>
        </nav>

        <div className="m-3 rounded-2xl border border-white/[0.07] bg-white/[0.035] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#d58f84]">Revenue intelligence</p>
          <p className="mt-2 text-xs leading-5 text-white/42">Accounts, follow-ups, proposals, and billing in one operating rhythm.</p>
        </div>
      </div>
    </aside>

    {mobileMenuOpen && <button className="fixed inset-0 z-30 bg-[#161412]/55 backdrop-blur-sm lg:hidden" onClick={() => setMobileMenuOpen(false)} aria-label="Close navigation overlay" />}
  </>
}
