import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ProductListPage from './pages/products/ProductListPage';
import AddProductPage from './pages/products/AddProductPage';
import EditProductPage from './pages/products/EditProductPage';
import BulkImportPage from './pages/products/BulkImportPage';
import AddStockPage from './pages/products/AddStockPage';
import RouteManagementPage from './pages/routes/RouteManagementPage';
import ShopListingPage from './pages/shops/ShopListingPage';
import AddEditShopPage from './pages/shops/AddEditShopPage';
import SalesmanListingPage from './pages/salesmen/SalesmanListingPage';
import AddEditSalesmanPage from './pages/salesmen/AddEditSalesmanPage';
import OrderManagementPage from './pages/orders/OrderManagementPage';
// Invoice pages removed - direct order-to-delivery flow (Feb 7, 2026)
// import InvoiceListingPage from './pages/invoices/InvoiceListingPage';
// import InvoiceGenerationPage from './pages/invoices/InvoiceGenerationPage';
import CompanySettingsPage from './pages/settings/CompanySettingsPage';
import WarehouseManagementPage from './pages/warehouse/WarehouseManagementPage';
import DeliveryChallanPage from './pages/delivery/DeliveryChallanPage';
import DeliveryTrackingPage from './pages/delivery/DeliveryTrackingPage';
import ShopLedgerPage from './pages/ledger/ShopLedgerPage';
import PaymentRecordPage from './pages/ledger/PaymentRecordPage';
import AgingReportPage from './pages/ledger/AgingReportPage';
import LedgerDashboardPage from './pages/ledger/LedgerDashboardPage';
import StockReturnsPage from './pages/returns/StockReturnsPage';
import DailyCollectionsPage from './pages/collections/DailyCollectionsPage';
import RouteConsolidatedBillPage from './pages/routes/RouteConsolidatedBillPage';
import UserManagementPage from './pages/users/UserManagementPage';

const ADMIN_EQUIVALENT_ROLES = ['Admin', 'Senior Manager'];
const NON_FINANCIAL_MANAGER_ROLES = [...ADMIN_EQUIVALENT_ROLES, 'Manager'];
const FINANCE_ROLES = ['Admin', 'Senior Manager', 'Accountant'];
const SALESMAN_LEDGER_ACCESS_ROLES = [...NON_FINANCIAL_MANAGER_ROLES, 'Accountant'];
const CONSOLIDATED_BILL_ROLES = [...NON_FINANCIAL_MANAGER_ROLES, 'Accountant'];
const PRODUCT_STOCK_ROLES = [...NON_FINANCIAL_MANAGER_ROLES, 'Stock Manager'];
const STOCK_RETURN_ROLES = [...NON_FINANCIAL_MANAGER_ROLES, 'Stock Manager'];
const FINANCE_ANALYTICS_ROLES = ['Admin', 'Senior Manager'];

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          {/* Product Management Routes */}
          <Route
            path="/products"
            element={
              <ProtectedRoute allowedRoles={PRODUCT_STOCK_ROLES}>
                <ProductListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/products/add"
            element={
              <ProtectedRoute allowedRoles={PRODUCT_STOCK_ROLES}>
                <AddProductPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/products/edit/:id"
            element={
              <ProtectedRoute allowedRoles={PRODUCT_STOCK_ROLES}>
                <EditProductPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/products/bulk-import"
            element={
              <ProtectedRoute allowedRoles={PRODUCT_STOCK_ROLES}>
                <BulkImportPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/products/add-stock"
            element={
              <ProtectedRoute allowedRoles={PRODUCT_STOCK_ROLES}>
                <AddStockPage />
              </ProtectedRoute>
            }
          />
          {/* Route Management Routes - Sprint 3 */}
          <Route
            path="/routes"
            element={
              <ProtectedRoute allowedRoles={NON_FINANCIAL_MANAGER_ROLES}>
                <RouteManagementPage />
              </ProtectedRoute>
            }
          />
          {/* Shop Management Routes - Sprint 3 */}
          <Route
            path="/shops"
            element={
              <ProtectedRoute allowedRoles={NON_FINANCIAL_MANAGER_ROLES}>
                <ShopListingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/shops/add"
            element={
              <ProtectedRoute allowedRoles={NON_FINANCIAL_MANAGER_ROLES}>
                <AddEditShopPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/shops/edit/:id"
            element={
              <ProtectedRoute allowedRoles={NON_FINANCIAL_MANAGER_ROLES}>
                <AddEditShopPage />
              </ProtectedRoute>
            }
          />
          {/* Salesman Management Routes - Sprint 4 */}
          <Route
            path="/salesmen"
            element={
              <ProtectedRoute allowedRoles={SALESMAN_LEDGER_ACCESS_ROLES}>
                <SalesmanListingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/salesmen/add"
            element={
              <ProtectedRoute allowedRoles={NON_FINANCIAL_MANAGER_ROLES}>
                <AddEditSalesmanPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/salesmen/edit/:id"
            element={
              <ProtectedRoute allowedRoles={NON_FINANCIAL_MANAGER_ROLES}>
                <AddEditSalesmanPage />
              </ProtectedRoute>
            }
          />
          {/* Order Management Routes - Sprint 5 & 6 - Consolidated */}
          <Route
            path="/orders"
            element={
              <ProtectedRoute allowedRoles={NON_FINANCIAL_MANAGER_ROLES}>
                <OrderManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders/history"
            element={
              <ProtectedRoute allowedRoles={NON_FINANCIAL_MANAGER_ROLES}>
                <OrderManagementPage />
              </ProtectedRoute>
            }
          />
          {/* Invoice Management Routes - DEPRECATED (Feb 7, 2026)
              NEW FLOW: Orders → Delivery Challans (no invoices)
          <Route
            path="/invoices"
            element={
              <ProtectedRoute allowedRoles={['Admin', 'Manager', 'Accountant']}>
                <InvoiceListingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/invoices/new"
            element={
              <ProtectedRoute allowedRoles={['Admin', 'Manager', 'Accountant']}>
                <InvoiceGenerationPage />
              </ProtectedRoute>
            }
          />
          */}
          {/* Settings Routes */}
          <Route
            path="/settings/company"
            element={
              <ProtectedRoute allowedRoles={NON_FINANCIAL_MANAGER_ROLES}>
                <CompanySettingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users"
            element={
              <ProtectedRoute allowedRoles={ADMIN_EQUIVALENT_ROLES}>
                <UserManagementPage />
              </ProtectedRoute>
            }
          />
          {/* Warehouse Management Routes - Sprint 8 */}
          <Route
            path="/warehouses"
            element={
              <ProtectedRoute allowedRoles={NON_FINANCIAL_MANAGER_ROLES}>
                <WarehouseManagementPage />
              </ProtectedRoute>
            }
          />
          {/* Delivery Management Routes - Sprint 8 */}
          <Route
            path="/deliveries"
            element={
              <ProtectedRoute allowedRoles={NON_FINANCIAL_MANAGER_ROLES}>
                <DeliveryTrackingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/deliveries/new"
            element={
              <ProtectedRoute allowedRoles={NON_FINANCIAL_MANAGER_ROLES}>
                <DeliveryChallanPage />
              </ProtectedRoute>
            }
          />
          {/* Ledger Management Routes - Shop Ledger System */}
          <Route
            path="/ledger/dashboard"
            element={
              <ProtectedRoute allowedRoles={FINANCE_ROLES}>
                <LedgerDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ledger/shop/:shopId"
            element={
              <ProtectedRoute allowedRoles={FINANCE_ROLES}>
                <ShopLedgerPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ledger/payment/new"
            element={
              <ProtectedRoute allowedRoles={FINANCE_ROLES}>
                <PaymentRecordPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ledger/aging"
            element={
              <ProtectedRoute allowedRoles={FINANCE_ANALYTICS_ROLES}>
                <AgingReportPage />
              </ProtectedRoute>
            }
          />
          {/* Stock Returns Routes */}
          <Route
            path="/stock-returns"
            element={
              <ProtectedRoute allowedRoles={STOCK_RETURN_ROLES}>
                <StockReturnsPage />
              </ProtectedRoute>
            }
          />
          {/* Daily Collections Routes */}
          <Route
            path="/daily-collections"
            element={
              <ProtectedRoute allowedRoles={FINANCE_ROLES}>
                <DailyCollectionsPage />
              </ProtectedRoute>
            }
          />
          {/* Route Consolidated Bill */}
          <Route
            path="/routes/consolidated-bill"
            element={
              <ProtectedRoute allowedRoles={CONSOLIDATED_BILL_ROLES}>
                <RouteConsolidatedBillPage />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
