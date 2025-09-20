import { Timestamp } from 'firebase/firestore';

// ================================
// User Management Types
// ================================

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  displayName: string;
  phoneNumber?: string;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  // For agents with user accounts
  warehouseId?: string;
  // For offline agents managed by admins
  managedByUserId?: string;
}

export type UserRole = 'super_admin' | 'admin' | 'agent' | 'showroom_user';

export interface UserPermissions {
  canViewAllWarehouses: boolean;
  canManageUsers: boolean;
  canManageInventory: boolean;
  canCreateSales: boolean;
  canManageAgentPayments: boolean;
  canViewReports: boolean;
  canUpdateDocumentTracking: boolean;
  canViewCustomerInquiry: boolean;
}

// ================================
// Warehouse Management Types
// ================================

export interface Warehouse {
  id: string;
  name: string;
  type: WarehouseType;
  description?: string;
  location?: string;
  isActive: boolean;
  // For agent warehouses
  agentId?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type WarehouseType = 'main' | 'showroom' | 'agent' | 'branch';

// ================================
// Inventory Management Types
// ================================

export interface InventoryItem {
  id: string;
  // OCR extracted data (primary keys)
  motorFingerprint: string; // Digital text from motor fingerprint image
  chassisNumber: string; // Digital text from chassis number image
  
  // Images (stored as URLs)
  motorFingerprintImageUrl: string;
  chassisNumberImageUrl: string;
  
  // Item details
  type: VehicleType;
  model: string;
  color: string;
  brand: string;
  countryOfOrigin: string;
  manufacturingYear: number;
  purchasePrice: number; // Original cost price
  salePrice: number; // Suggested sale price
  
  // Warehouse tracking
  currentWarehouseId: string;
  status: ItemStatus;
  
  // Transaction history
  entryTransactionId: string; // Reference to warehouse entry transaction
  
  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string; // User ID
}

export type VehicleType = 'motorcycle' | 'tricycle' | 'electric_scooter' | 'tuktuk';
export type ItemStatus = 'available' | 'sold' | 'transferred' | 'reserved';

// ================================
// Transaction Management Types
// ================================

export interface Transaction {
  id: string;
  type: TransactionType;
  date: Timestamp;
  userId: string; // User who performed the transaction
  
  // Reference numbers (auto-generated)
  referenceNumber: string; // Format: TYPE-YYMMDD-XXX
  
  // Items involved
  items: TransactionItem[];
  
  // Financial details
  totalAmount: number;
  
  // Warehouse details
  fromWarehouseId?: string;
  toWarehouseId?: string;
  
  // Additional details based on transaction type
  details: TransactionDetails;
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type TransactionType = 
  | 'warehouse_entry'      // إدخال مخزني
  | 'warehouse_transfer'   // تحويل بين المخازن
  | 'sale_to_customer'     // بيع للعميل النهائي
  | 'agent_invoice'        // فاتورة بضاعة للوكيل
  | 'payment_receipt'      // سند قبض من وكيل
  | 'return';              // مرتجع

export interface TransactionItem {
  inventoryItemId: string;
  motorFingerprint: string;
  chassisNumber: string;
  
  // For sales transactions
  salePrice?: number;
  agentCommissionPercentage?: number; // Variable commission per item
  
  // For transfers to agents
  transferPrice?: number; // Usually equals purchase price
}

export interface TransactionDetails {
  // For sales
  customer?: CustomerDetails;
  
  // For agent transactions
  agentId?: string;
  
  // For payments
  paymentMethod?: PaymentMethod;
  
  // Additional notes
  notes?: string;
}

// ================================
// Customer Management Types
// ================================

export interface CustomerDetails {
  // Basic info
  name: string;
  phone: string;
  address: string;
  
  // ID Card OCR data
  nationalId: string;
  idIssuanceDate?: string;
  idExpiryDate?: string;
  idAddress?: string;
  
  // ID Card images
  idCardFrontImageUrl: string;
  idCardBackImageUrl: string;
}

// ================================
// Agent Management Types
// ================================

export interface Agent {
  id: string;
  name: string;
  phone: string;
  address: string;
  
  // Account type
  hasUserAccount: boolean; // true if agent uses the app, false if managed offline
  userId?: string | null; // Reference to User if hasUserAccount is true
  
  // Warehouse
  warehouseId: string;
  
  // Financial tracking
  currentBalance: number; // Current debt/credit balance (variable)
  commissionRate?: number; // Commission percentage for this agent
  notes?: string; // Additional notes about the agent
  
  // Status
  isActive: boolean;
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}

export interface AgentAccount {
  agentId: string;
  
  // Outstanding invoices (merchandise transferred to agent)
  invoices: AgentInvoice[];
  
  // Payments made by agent
  payments: AgentPayment[];
  
  // Sales made by agent
  sales: AgentSale[];
  
  // Current balance calculation
  calculateBalance(): number;
}

export interface AgentInvoice {
  id: string;
  transactionId: string; // Reference to warehouse transfer transaction
  referenceNumber: string;
  date: Timestamp;
  items: AgentInvoiceItem[];
  totalAmount: number; // Based on purchase prices
  isPaid: boolean;
  paidAmount: number;
  remainingAmount: number;
}

export interface AgentInvoiceItem {
  inventoryItemId: string;
  motorFingerprint: string;
  chassisNumber: string;
  purchasePrice: number;
}

export interface AgentPayment {
  id: string;
  transactionId: string; // Reference to payment receipt transaction
  referenceNumber: string;
  date: Timestamp;
  amount: number;
  paymentMethod: PaymentMethod;
  notes?: string;
}

export interface AgentSale {
  id: string;
  transactionId: string; // Reference to sale transaction
  referenceNumber: string;
  date: Timestamp;
  customer: CustomerDetails;
  items: AgentSaleItem[];
  totalSaleAmount: number;
  agentProfit: number;
  companyProfit: number;
}

export interface AgentSaleItem {
  inventoryItemId: string;
  motorFingerprint: string;
  chassisNumber: string;
  purchasePrice: number;
  salePrice: number;
  commissionPercentage: number;
  agentProfit: number;
  companyProfit: number;
}

export type PaymentMethod = 'cash' | 'bank_transfer' | 'check' | 'installments';

// Simple Sale interface for agent details
export interface Sale {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  agentId: string;
  agentName: string;
  items: SaleItem[];
  totalAmount: number;
  totalCommission: number;
  status: 'pending' | 'completed' | 'cancelled';
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}

export interface SaleItem {
  inventoryItemId: string;
  motorFingerprint: string;
  chassisNumber: string;
  salePrice: number;
  commission: number;
}

// Simple AgentTransaction interface
export interface AgentTransaction {
  id: string;
  agentId: string;
  type: 'commission' | 'payment' | 'debit' | 'credit' | 'sale' | 'debt_increase' | 'debt_decrease' | 'debt' | 'adjustment';
  amount: number;
  description: string;
  saleId?: string;
  relatedSaleId?: string;
  transactionId?: string;
  previousBalance?: number;
  newBalance?: number;
  // Additional fields for sale transactions
  saleAmount?: number;
  commission?: number;
  companyShare?: number;
  createdAt: Timestamp;
  createdBy: string;
}

// ================================
// Document Tracking Types (Jawab)
// ================================

export interface DocumentTracking {
  id: string;
  
  // Related sale transaction
  saleTransactionId: string;
  customerName: string;
  motorFingerprint: string;
  chassisNumber: string;
  
  // Document tracking stages
  status: DocumentStatus;
  stages: DocumentStage[];
  
  // Combined image for manufacturer (auto-generated)
  combinedImageUrl?: string; // Motor + Chassis + Customer ID images combined
  
  // Notifications
  lastNotificationSent?: Timestamp;
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
  updatedBy?: string; // Last user who updated the status
}

export type DocumentStatus = 
  | 'pending_submission'     // في انتظار إرسال البيانات
  | 'submitted_to_manufacturer' // تم إرسال البيانات للشركة المصنعة
  | 'received_from_manufacturer' // تم استلام الجواب من الشركة
  | 'sent_to_point_of_sale'     // تم إرسال الجواب لنقطة البيع
  | 'completed';                // مكتمل

export interface DocumentStage {
  status: DocumentStatus;
  date: Timestamp;
  updatedBy: string; // User ID
  notes?: string;
}

// ================================
// Notification Types
// ================================

export interface NotificationConfig {
  userId: string;
  enableSalesNotifications: boolean;
  enableInventoryNotifications: boolean;
  enablePaymentNotifications: boolean;
  enableDocumentTrackingNotifications: boolean;
  enableGeneralNotifications: boolean;
}

export interface Notification {
  id: string;
  recipientId: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  relatedEntityId?: string; // ID of related transaction, agent, etc.
  relatedEntityType?: string;
  createdAt: Timestamp;
}

export type NotificationType = 
  | 'sale_created'
  | 'inventory_transferred'
  | 'payment_received'
  | 'document_status_updated'
  | 'low_inventory'
  | 'general';

// ================================
// Reporting Types
// ================================

export interface ReportFilter {
  startDate?: Date;
  endDate?: Date;
  warehouseIds?: string[];
  agentIds?: string[];
  transactionTypes?: TransactionType[];
  itemTypes?: VehicleType[];
}

export interface SalesReport {
  period: string;
  totalSales: number;
  totalProfit: number;
  companyProfit: number;
  agentProfit: number;
  salesByType: Record<VehicleType, number>;
  salesByWarehouse: Record<string, number>;
  topSellingItems: TopSellingItem[];
}

export interface TopSellingItem {
  type: VehicleType;
  brand: string;
  model: string;
  quantitySold: number;
  totalRevenue: number;
}

export interface InventoryReport {
  totalItems: number;
  itemsByWarehouse: Record<string, number>;
  itemsByType: Record<VehicleType, number>;
  itemsByStatus: Record<ItemStatus, number>;
  lowStockWarnings: LowStockWarning[];
}

export interface LowStockWarning {
  warehouseId: string;
  warehouseName: string;
  itemType: VehicleType;
  currentStock: number;
  recommendedMinimum: number;
}

// ================================
// System Configuration Types
// ================================

export interface SystemConfig {
  companyName: string;
  companyLogo?: string;
  splashScreenImage?: string;
  supportEmail?: string;
  supportPhone?: string;
  
  // Business settings
  defaultCommissionPercentage: number;
  lowStockThreshold: number;
  
  // Notification settings
  enablePushNotifications: boolean;
  
  updatedAt: Timestamp;
  updatedBy: string;
}

// ================================
// API Response Types
// ================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// ================================
// Form Types
// ================================

export interface CreateInventoryItemForm {
  type: VehicleType;
  model: string;
  color: string;
  brand: string;
  countryOfOrigin: string;
  manufacturingYear: number;
  purchasePrice: number;
  salePrice: number;
  warehouseId: string;
  
  // Will be populated via OCR
  motorFingerprint?: string;
  chassisNumber?: string;
}

export interface CreateSaleForm {
  customerId?: string; // If existing customer
  customer: {
    name: string;
    phone: string;
    address: string;
    nationalId: string;
  };
  items: {
    inventoryItemId: string;
    salePrice: number;
    commissionPercentage?: number; // For agent sales
  }[];
  warehouseId: string;
}

export interface CreateAgentPaymentForm {
  agentId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  notes?: string;
}

// ================================
// Utility Types
// ================================

export type DatabaseTimestamp = Timestamp | Date;

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface TableColumn<T> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  render?: (value: any, record: T) => React.ReactNode;
}