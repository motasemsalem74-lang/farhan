import { Routes, Route } from 'react-router-dom'

// Import sub-pages
import SalesList from './SalesList'
import CreateSalePage from './CreateSalePage'
import SaleDetailsPage from './SaleDetailsPage'

export function SalesPage() {
  return (
    <Routes>
      <Route path="/" element={<SalesList />} />
      <Route path="/create" element={<CreateSalePage />} />
      <Route path="/details/:id" element={<SaleDetailsPage />} />
    </Routes>
  )
}