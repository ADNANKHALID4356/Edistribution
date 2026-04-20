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
              <ProtectedRoute allowedRoles={['Admin', 'Manager']}>
                <ProductListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/products/add"
            element={
              <ProtectedRoute allowedRoles={['Admin', 'Manager']}>
                <AddProductPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/products/edit/:id"
            element={
              <ProtectedRoute allowedRoles={['Admin', 'Manager']}>
                <EditProductPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/products/bulk-import"
            element={
              <ProtectedRoute allowedRoles={['Admin', 'Manager']}>
                <BulkImportPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/products/add-stock"
            element={
              <ProtectedRoute allowedRoles={['Admin', 'Manager']}>
                <AddStockPage />
              </ProtectedRoute>
            }
          />
          {/* Route Management Routes - Sprint 3 */}
          <Route
            path="/routes"
            element={
              <ProtectedRoute allowedRoles={['Admin', 'Manager']}>
                <RouteManagementPage />
              </ProtectedRoute>
            }
          />
          {/* Shop Management Routes - Sprint 3 */}
          <Route
            path="/shops"
            element={
              <ProtectedRoute allowedRoles={['Admin', 'Manager']}>
                <ShopListingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/shops/add"
            element={
              <ProtectedRoute allowedRoles={['Admin', 'Manager']}>
                <AddEditShopPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/shops/edit/:id"
            element={
              <ProtectedRoute allowedRoles={['Admin', 'Manager']}>
                <AddEditShopPage />
              </ProtectedRoute>
            }
          />
          {/* Salesman Management Routes - Sprint 4 */}
          <Route
            path="/salesmen"
            element={
              <ProtectedRoute allowedRoles={['Admin', 'Manager']}>
                <SalesmanListingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/salesmen/add"
            element={
              <ProtectedRoute allowedRoles={['Admin', 'Manager']}>
                <AddEditSalesmanPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/salesmen/edit/:id"
            element={
              <ProtectedRoute allowedRoles={['Admin', 'Manager']}>
                <AddEditSalesmanPage />
              </ProtectedRoute>
            }
          />
          {/* Order Management Routes - Sprint 5 & 6 - Consolidated */}
          <Route
            path="/orders"
            element={
              <ProtectedRoute allowedRoles={['Admin', 'Manager']}>
                <OrderManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders/history"
            element={
              <ProtectedRoute allowedRoles={['Admin', 'Manager']}>
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
              <ProtectedRoute allowedRoles={['Admin']}>
                <CompanySettingsPage />
              </ProtectedRoute>
            }
          />
          {/* Warehouse Management Routes - Sprint 8 */}
          <Route
            path="/warehouses"
            element={
              <ProtectedRoute allowedRoles={['Admin', 'Manager']}>
                <WarehouseManagementPage />
              </ProtectedRoute>
            }
          />
          {/* Delivery Management Routes - Sprint 8 */}
          <Route
            path="/deliveries"
            element={
              <ProtectedRoute allowedRoles={['Admin', 'Manager']}>
                <DeliveryTrackingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/deliveries/new"
            element={
              <ProtectedRoute allowedRoles={['Admin', 'Manager']}>
                <DeliveryChallanPage />
              </ProtectedRoute>
            }
          />
          {/* Ledger Management Routes - Shop Ledger System */}
          <Route
            path="/ledger/dashboard"
            element={
              <ProtectedRoute allowedRoles={['Admin', 'Manager']}>
                <LedgerDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ledger/shop/:shopId"
            element={
              <ProtectedRoute allowedRoles={['Admin', 'Manager']}>
                <ShopLedgerPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ledger/payment/new"
            element={
              <ProtectedRoute allowedRoles={['Admin', 'Manager']}>
                <PaymentRecordPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ledger/aging"
            element={
              <ProtectedRoute allowedRoles={['Admin', 'Manager']}>
                <AgingReportPage />
              </ProtectedRoute>
            }
          />
          {/* Stock Returns Routes */}
          <Route
            path="/stock-returns"
            element={
              <ProtectedRoute allowedRoles={['Admin', 'Manager']}>
                <StockReturnsPage />
              </ProtectedRoute>
            }
          />
          {/* Daily Collections Routes */}
          <Route
            path="/daily-collections"
            element={
              <ProtectedRoute allowedRoles={['Admin', 'Manager']}>
                <DailyCollectionsPage />
              </ProtectedRoute>
            }
          />
          {/* Route Consolidated Bill */}
          <Route
            path="/routes/consolidated-bill"
            element={
              <ProtectedRoute allowedRoles={['Admin', 'Manager']}>
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
