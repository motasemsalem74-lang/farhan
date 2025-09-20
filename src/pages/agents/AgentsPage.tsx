import { Routes, Route } from 'react-router-dom'

// Import sub-pages
import { AgentsList } from './AgentsList'
import { AgentDetailsPage } from './AgentDetailsPage'
import { EditAgentPage } from './EditAgentPage'
import { CreateAgentPage } from './CreateAgentPage'
import { AgentPaymentsPage } from './AgentPaymentsPage'
import { AgentStatementPage } from './AgentStatementPage'
import { AgentSalesPage } from './AgentSalesPage'
import { ManagerAgentSalesPage } from './ManagerAgentSalesPage'

// Import offline agents pages
import { OfflineAgentsPage } from './OfflineAgentsPage'
import { CreateOfflineAgentPage } from './CreateOfflineAgentPage'
import { OfflineAgentInventoryPage } from './OfflineAgentInventoryPage'
import { OfflineAgentSalesPage } from './OfflineAgentSalesPage'

// Import debt management pages
import { DebtReportPage } from './DebtReportPage'
import { AccountSettlementPage } from './AccountSettlementPage'
import { AdvancedBalanceReportPage } from './AdvancedBalanceReportPage'

export function AgentsPage() {
  return (
    <Routes>
      <Route path="/" element={<AgentsList />} />
      <Route path="/create" element={<CreateAgentPage />} />
      <Route path="/details/:id" element={<AgentDetailsPage />} />
      <Route path="/edit/:id" element={<EditAgentPage />} />
      <Route path="/payments/:id" element={<AgentPaymentsPage />} />
      <Route path="/statement/:id" element={<AgentStatementPage />} />
      <Route path="/sales/:id" element={<AgentSalesPage />} />
      <Route path="/manager-sales/:id" element={<ManagerAgentSalesPage />} />
      
      {/* Offline Agents Routes */}
      <Route path="/offline" element={<OfflineAgentsPage />} />
      <Route path="/create-offline" element={<CreateOfflineAgentPage />} />
      <Route path="/offline-inventory/:id" element={<OfflineAgentInventoryPage />} />
      <Route path="/offline-sales/:id" element={<OfflineAgentSalesPage />} />
      
      {/* Debt Management Routes */}
      <Route path="/debt-report" element={<DebtReportPage />} />
      <Route path="/settlement/:id" element={<AccountSettlementPage />} />
      <Route path="/advanced-balance-report" element={<AdvancedBalanceReportPage />} />
    </Routes>
  )
}