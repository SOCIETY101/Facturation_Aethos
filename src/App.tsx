import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Layout } from '@/components/layout/Layout'
import Dashboard from '@/pages/Dashboard'
import Clients from '@/pages/Clients'
import Quotes from '@/pages/Quotes'
import Invoices from '@/pages/Invoices'
import Settings from '@/pages/Settings'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="clients" element={<Clients />} />
          <Route path="quotes" element={<Quotes />} />
          <Route path="invoices" element={<Invoices />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
      <Toaster />
    </BrowserRouter>
  )
}

export default App
