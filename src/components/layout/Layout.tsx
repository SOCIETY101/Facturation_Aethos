import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

export function Layout() {
  return (
    <div className="min-h-screen bg-[#f8f6f3]">
      <Sidebar />
      <div className="lg:pl-[240px]">
        <Header />
        <main className="mx-auto w-full max-w-[1720px] px-4 py-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
