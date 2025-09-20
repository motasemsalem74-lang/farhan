import { Routes, Route } from 'react-router-dom'

// Import agent-specific pages
import { AgentDashboardPage } from './AgentDashboardPage'
import { AgentInventoryPage } from './AgentInventoryPage'
import { AgentSalesManagementPage } from './AgentSalesManagementPage'
import { AgentDocumentsPage } from './AgentDocumentsPage'

export function AgentMainPage() {
  return (
    <Routes>
      <Route path="/dashboard" element={<AgentDashboardPage />} />
      <Route path="/inventory" element={<AgentInventoryPage />} />
      <Route path="/sales" element={<AgentSalesManagementPage />} />
      <Route path="/documents" element={<AgentDocumentsPage />} />
      {/* Default route */}
      <Route path="/" element={<AgentDashboardPage />} />
    </Routes>
  )
}
