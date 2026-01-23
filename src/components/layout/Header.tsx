import { useStore } from '@/store/useStore'
import { User } from 'lucide-react'

export function Header() {
  const settings = useStore((state) => state.settings)

  return (
    <header className="sticky top-0 z-30 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4 lg:px-8">
        <div className="flex items-center gap-2">
          {settings.company.logo && (
            <img
              src={settings.company.logo}
              alt={settings.company.name}
              className="h-8 w-8 rounded"
            />
          )}
          <div>
            <h2 className="text-sm font-semibold">{settings.company.name}</h2>
            <p className="text-xs text-muted-foreground">Invoice Management</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="hidden sm:inline">Admin User</span>
          </div>
        </div>
      </div>
    </header>
  )
}
