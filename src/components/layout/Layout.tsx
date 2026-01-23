import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

export function Layout() {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="lg:pl-64">
        <Header />
        <main className="container mx-auto px-4 py-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
