/**
 * Order Management Page
 * Sprint 5 & 6: Comprehensive Order Management System
 * Combines order history, processing, and approval in one page
 */

import React, { useState, useEffect } from 'react';
import { useToast } from '../../context/ToastContext';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Filter, Download, Eye, RefreshCw, Calendar,
  Package, TrendingUp, AlertCircle, CheckCircle, ArrowLeft, Trash2
} from 'lucide-react';
import orderService from '../../services/orderService';
import salesmanService from '../../services/salesmanService';
import shopService from '../../services/shopService';
import routeService from '../../services/routeService';

// Helper function to render product list
const renderProductsList = (productsString, forPrint = false) => {
  if (!productsString) {
    return <span className="text-gray-400 italic text-xs">No items</span>;
  }

  const products = productsString.split(',').map(p => p.trim());
  const displayProducts = forPrint ? products : (products.length <= 5 ? products : products.slice(0, 3));
  const remainingCount = products.length - displayProducts.length;

  return (
    <div className="space-y-1">
      {displayProducts.map((product, idx) => {
        const match = product.match(/^(.+?)\s*\((\d+)\)$/);
        if (match) {
          const [, name, qty] = match;
          return (
            <div key={idx} className="flex items-center gap-2 text-xs py-0.5">
              <span className={`inline-flex items-center ${forPrint ? 'px-1.5' : 'px-2'} py-0.5 rounded ${forPrint ? 'bg-blue-50 border border-blue-200' : 'bg-blue-100'} text-blue-800 font-medium whitespace-nowrap`} style={forPrint ? {WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact'} : {}}>
                {qty}x
              </span>
              <span className={forPrint ? "text-gray-900 font-medium" : "text-gray-700 truncate"} title={name}>
                {forPrint ? name : (name.length > 25 ? name.substring(0, 25) + '...' : name)}
              </span>
            </div>
          );
        }
        return <div key={idx} className="text-xs text-gray-600">{product}</div>;
      })}
      {!forPrint && remainingCount > 0 && (
        <div className="text-xs text-blue-600 font-medium pt-1">
          + {remainingCount} more product{remainingCount > 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
};

const OrderManagementPage = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();
  
  // State
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });
  
  // Filters
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    salesman_id: '',
    shop_id: '',
    route_id: '',
    start_date: '',
    end_date: '',
    sortBy: 'order_date',
    sortOrder: 'DESC'
  });

  // Options for dropdowns
  const [salesmen, setSalesmen] = useState([]);
  const [shops, setShops] = useState([]);
  const [routes, setRoutes] = useState([]);

  // Statistics
  const [stats, setStats] = useState(null);

  // Selected order for detail view
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  
  // Edit order state
  const [editingOrder, setEditingOrder] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState(null);

  // Notification states
    
  // Fetch data on mount and filter changes
  useEffect(() => {
    fetchOrders();
    fetchFilterOptions();
    fetchStatistics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, pagination.limit, filters]);

  /**
   * Fetch orders based on active tab
   */
  const fetchOrders = async () => {
    try {
      setLoading(true);
      
      console.log('\n🔍 [FRONTEND] Fetching orders with filters:', filters);
      console.log('🔍 [FRONTEND] Pagination:', pagination);
      
      // Fetch all orders with full filters
      const response = await orderService.getAllOrders({
        page: pagination.page,
        limit: pagination.limit,
        ...filters
      });

      console.log('🔍 [FRONTEND] API Response:', response);

      if (response.success) {
        console.log('✅ [FRONTEND] Orders fetched successfully');
        console.log(`   📦 Received ${response.data.length} orders`);
        console.log(`   📊 Total: ${response.pagination?.total || 0}`);
        
        setOrders(response.data);
        setPagination(response.pagination);
      } else {
        console.error('❌ [FRONTEND] API returned success: false');
        const errorMsg = response.message || 'Unknown error';
        showToast(`Failed to fetch orders: ${errorMsg}`, 'error');
        setTimeout(() => {}, 5000);
      }
    } catch (error) {
      console.error('❌ [FRONTEND] Error fetching orders:', error);
      console.error('❌ [FRONTEND] Error response:', error.response?.data);
      console.error('❌ [FRONTEND] Error status:', error.response?.status);
      
      // Determine specific error message
      let errorMsg = 'Unknown error occurred';
      
      if (!error.response) {
        errorMsg = 'Cannot connect to server. Please check your server configuration in Settings';
      } else if (error.response.status === 401) {
        errorMsg = 'Authentication failed. Please login again.';
        // Optionally redirect to login
        setTimeout(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.hash = '#/login';
        }, 2000);
      } else if (error.response.status === 403) {
        errorMsg = 'You do not have permission to view orders.';
      } else if (error.response.status === 500) {
        errorMsg = 'Server error. Please check backend logs for details.';
      } else {
        errorMsg = error.response?.data?.message || error.message || 'Failed to fetch orders';
      }
      
      showToast(`Failed to fetch orders: ${errorMsg}. Check browser console for details.`, 'error');
      setTimeout(() => {}, 8000);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetch filter options
   */
  const fetchFilterOptions = async () => {
    try {
      const [salesmenRes, shopsRes, routesRes] = await Promise.all([
        salesmanService.getAllSalesmen({ limit: 1000 }),
        shopService.getAllShops({ limit: 1000 }),
        routeService.getAllRoutes({ limit: 1000 })
      ]);

      if (salesmenRes.success) setSalesmen(salesmenRes.data);
      if (shopsRes.success) setShops(shopsRes.data);
      if (routesRes.success) setRoutes(routesRes.data);
    } catch (error) {
      console.error('Error fetching filter options:', error);
    }
  };

  /**
   * Fetch statistics
   */
  const fetchStatistics = async () => {
    try {
      const response = await orderService.getStatistics({
        start_date: filters.start_date,
        end_date: filters.end_date,
        salesman_id: filters.salesman_id
      });

      if (response.success) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  };

  /**
   * Handle filter change
   */
  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  };

  /**
   * Handle page change
   */
  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  /**
   * Handle export
   */
  const handleExport = async () => {
    try {
      await orderService.exportToExcel(orders);
      showToast('Orders exported successfully!', 'success');
      setTimeout(() => {}, 5000);
    } catch (error) {
      console.error('Error exporting orders:', error);
      showToast('Failed to export orders', 'error');
      setTimeout(() => {}, 5000);
    }
  };

  /**
   * Handle view order details
   */
  const handleViewDetails = async (orderId) => {
    try {
      const response = await orderService.getOrderById(orderId);
      if (response.success) {
        setSelectedOrder(response.data);
        setShowDetailModal(true);
      }
    } catch (error) {
      console.error('Error fetching order details:', error);
      showToast('Failed to fetch order details', 'error');
      setTimeout(() => {}, 5000);
    }
  };

  /**
   * Handle status update
   */
  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      // Update order status
      const response = await orderService.updateOrderStatus(orderId, newStatus, `Status changed to ${newStatus}`);
      
      if (response.success) {
        showToast('Order status updated successfully!', 'success');
        setTimeout(() => {}, 5000);
        fetchOrders();
        fetchStatistics();
      }
    } catch (error) {
      console.error('Error updating status:', error);
      
      // Check if error is about insufficient stock
      const errorMsg = error.response?.data?.message || error.message || 'Failed to update order status';
      
      if (errorMsg.toLowerCase().includes('insufficient stock')) {
        showToast(
          'Cannot Finalize Order - Insufficient Stock: ' +
          errorMsg + ' ' +
          'Please check stock levels or adjust order quantities before finalizing.'
        , 'error');
        setTimeout(() => {}, 8000);
      } else {
        showToast('Error: ' + errorMsg, 'error');
        setTimeout(() => {}, 5000);
      }
    }
  };

  /**
   * Reset filters
   */
  const resetFilters = () => {
    setFilters({
      search: '',
      status: '',
      salesman_id: '',
      shop_id: '',
      route_id: '',
      start_date: '',
      end_date: '',
      sortBy: 'order_date',
      sortOrder: 'DESC'
    });
  };

  /**
   * Handle edit order
   */
  const handleEditOrder = async (orderId) => {
    try {
      const response = await orderService.getOrderById(orderId);
      if (response.success) {
        const order = response.data;
        
        console.log('📦 Loading order for edit:', {
          order_number: order.order_number,
          total_amount: order.total_amount,
          discount: order.discount,
          net_amount: order.net_amount,
          items_count: order.items?.length
        });
        
        // Check if order can be edited
        if (['finalized', 'delivered'].includes(order.status)) {
          showToast('Cannot edit finalized or delivered orders', 'error');
          setTimeout(() => {}, 5000);
          return;
        }
        
        setEditingOrder(order);
        setEditFormData({
          shop_id: order.shop_id,
          route_id: order.route_id,
          notes: order.notes || '',
          total_amount: order.total_amount || 0,
          discount: order.discount || 0,
          net_amount: order.net_amount || 0,
          items: order.items.map(item => ({
            id: item.id,
            product_id: item.product_id,
            product_name: item.product_name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            discount: item.discount || 0,
            total_price: item.total_price || (item.quantity * item.unit_price),
            net_price: item.net_price
          }))
        });
        setShowEditModal(true);
      }
    } catch (error) {
      console.error('Error loading order for edit:', error);
      showToast('Failed to load order details', 'error');
      setTimeout(() => {}, 5000);
    }
  };

  /**
   * Handle edit form change
   */
  const handleEditFormChange = (field, value) => {
    setEditFormData(prev => ({ ...prev, [field]: value }));
  };

  /**
   * Handle item quantity change
   */
  const handleItemQuantityChange = (index, quantity) => {
    const newItems = [...editFormData.items];
    const item = newItems[index];
    item.quantity = quantity;
    item.total_price = item.quantity * item.unit_price;
    const pct = parseFloat(item.discount_percentage) || 0;
    item.discount = item.total_price * pct / 100;
    item.net_price = item.total_price - item.discount;
    setEditFormData(prev => ({ ...prev, items: newItems }));
  };

  /**
   * Handle item discount change (percentage-based)
   */
  const handleItemDiscountChange = (index, discountPercentage) => {
    const newItems = [...editFormData.items];
    const item = newItems[index];
    item.discount_percentage = discountPercentage;
    item.discount = item.total_price * discountPercentage / 100;
    item.net_price = item.total_price - item.discount;
    setEditFormData(prev => ({ ...prev, items: newItems }));
  };

  /**
   * Remove item from order
   */
  const handleRemoveItem = (index) => {
    const newItems = editFormData.items.filter((_, i) => i !== index);
    if (newItems.length === 0) {
      showToast('Order must have at least one item', 'error');
      setTimeout(() => {}, 5000);
      return;
    }
    setEditFormData(prev => ({ ...prev, items: newItems }));
  };

  /**
   * Delete order
   */
  const handleDeleteOrder = async (orderId, orderNumber, status) => {
    // Frontend validation (backend also checks)
    if (['finalized', 'delivered'].includes(status)) {
      showToast('Cannot delete finalized or delivered orders', 'error');
      setTimeout(() => {}, 5000);
      return;
    }

    try {
      setLoading(true);
      
      const response = await orderService.deleteOrder(orderId);
      
      if (response.success) {
        showToast(`Order #${orderNumber} deleted successfully${status === 'placed' ? ' (stock restored)' : ''}`, 'success');
        setTimeout(() => {}, 5000);
        
        // Close detail modal if it was open for this order
        if (selectedOrder?.id === orderId) {
          setShowDetailModal(false);
          setSelectedOrder(null);
        }
        
        // Close edit modal if it was open for this order
        if (editingOrder?.id === orderId) {
          setShowEditModal(false);
          setEditingOrder(null);
          setEditFormData(null);
        }
        
        // Refresh data
        await fetchOrders();
        await fetchStatistics();
      }
    } catch (error) {
      console.error('Delete order error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to delete order';
      showToast(errorMessage, 'error');
      setTimeout(() => {}, 5000);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Calculate order totals - use order-level values from loaded order
   */
  const calculateTotals = () => {
    const totals = {
      total_amount: parseFloat(editFormData.total_amount) || 0,
      discount: parseFloat(editFormData.discount) || 0,
      net_amount: parseFloat(editFormData.net_amount) || 0
    };
    console.log('💰 Edit Order Totals:', totals);
    return totals;
  };

  /**
   * Save edited order
   */
  const handleSaveEdit = async () => {
    try {
      if (!editFormData.items || editFormData.items.length === 0) {
        showToast('Order must have at least one item', 'error');
        setTimeout(() => {}, 5000);
        return;
      }

      const totals = calculateTotals();
      
      const updateData = {
        shop_id: editFormData.shop_id,
        route_id: editFormData.route_id,
        notes: editFormData.notes,
        total_amount: totals.total_amount,
        discount: totals.discount,
        net_amount: totals.net_amount,
        items: editFormData.items
      };

      const response = await orderService.updateOrder(editingOrder.id, updateData);
      
      if (response.success) {
        showToast('Order updated successfully!', 'success');
        setTimeout(() => {}, 5000);
        setShowEditModal(false);
        setEditingOrder(null);
        setEditFormData(null);
        fetchOrders();
        fetchStatistics();
      }
    } catch (error) {
      console.error('Error updating order:', error);
      showToast('Failed to update order: ' + (error.response?.data?.message || error.message), 'error');
      setTimeout(() => {}, 5000);
    }
  };

  return (
    <>
      {/* Print Styles */}
      <style>{`
        @media print {
          /* Hide non-printable elements */
          .no-print {
            display: none !important;
          }
          
          /* Reset page margins and setup */
          @page {
            size: A4;
            margin: 15mm;
          }
          
          body {
            margin: 0;
            padding: 0;
          }
          
          /* Main container adjustments */
          .min-h-screen {
            min-height: auto !important;
            padding: 0 !important;
            background: white !important;
          }
          
          /* Table styling */
          table {
            width: 100% !important;
            border-collapse: collapse !important;
            page-break-inside: auto;
            font-size: 11pt !important;
          }
          
          thead {
            display: table-header-group;
          }
          
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          
          th, td {
            padding: 8px 6px !important;
            border: 1px solid #ddd !important;
            text-align: left !important;
          }
          
          th {
            background-color: #f3f4f6 !important;
            font-weight: 600 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          /* Products cell - show all products clearly */
          .products-cell {
            max-width: none !important;
            white-space: normal !important;
            min-width: 200px !important;
          }
          
          .products-cell .space-y-1 > div {
            margin-bottom: 4px !important;
          }
          
          /* Status badges in print */
          .print\\:inline-block {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          /* Print header styling */
          .print-header {
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 2px solid #333;
          }
          
          .print-header h1 {
            font-size: 24pt;
            margin-bottom: 10px;
            text-align: center;
          }
          
          .print-header .metadata {
            font-size: 10pt;
            color: #666;
            text-align: center;
            margin-bottom: 5px;
          }
          
          .print-header .filters-applied {
            font-size: 10pt;
            background-color: #f0f9ff;
            padding: 10px;
            border-radius: 4px;
            margin-top: 10px;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          .print-header .filters-applied strong {
            color: #1e40af;
          }
        }
      `}</style>

      <div className="min-h-screen bg-gray-50 p-6 print-show-all">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-2">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft size={20} />
            Back to Dashboard
          </button>
        </div>
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
          <Package className="text-blue-600" />
          Order Management
        </h1>
        <p className="text-gray-600 mt-1">Manage, process, and track all orders</p>
      </div>

      

      

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Total Orders</p>
                <p className="text-2xl font-bold text-gray-800">{stats.total_orders || 0}</p>
              </div>
              <Package className="text-blue-500" size={32} />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.placed_orders || 0}</p>
              </div>
              <AlertCircle className="text-yellow-500" size={32} />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Delivered</p>
                <p className="text-2xl font-bold text-green-600">{stats.delivered_orders || 0}</p>
              </div>
              <CheckCircle className="text-green-500" size={32} />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Total Revenue</p>
                <p className="text-2xl font-bold text-purple-600">
                  {orderService.formatCurrency(stats.total_revenue || 0)}
                </p>
              </div>
              <TrendingUp className="text-purple-500" size={32} />
            </div>
          </div>
        </div>
      )}

      {/* Filters Section */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
            <Filter size={20} />
            Filters
          </h2>
          <button
            onClick={resetFilters}
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <RefreshCw size={16} />
            Reset
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="Order number, shop..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Statuses</option>
              <option value="placed">📦 Placed</option>
              <option value="approved">✅ Approved</option>
              <option value="delivered">🚚 Delivered</option>
              <option value="rejected">❌ Rejected</option>
            </select>
          </div>

          {/* Salesman */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Salesman</label>
            <select
              value={filters.salesman_id}
              onChange={(e) => handleFilterChange('salesman_id', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Salesmen</option>
              {salesmen.map(salesman => (
                <option key={salesman.id} value={salesman.id}>
                  {salesman.full_name}
                </option>
              ))}
            </select>
          </div>

          {/* Route */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Route</label>
            <select
              value={filters.route_id}
              onChange={(e) => handleFilterChange('route_id', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Routes</option>
              {routes.map(route => (
                <option key={route.id} value={route.id}>
                  {route.route_name}
                </option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="date"
                value={filters.start_date}
                onChange={(e) => handleFilterChange('start_date', e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* End Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="date"
                value={filters.end_date}
                onChange={(e) => handleFilterChange('end_date', e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between no-print">
          <h2 className="text-lg font-semibold text-gray-700">
            Orders ({pagination.total})
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              title="Print all orders shown on this page with applied filters"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 6 2 18 2 18 9"></polyline>
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                <rect x="6" y="14" width="12" height="8"></rect>
              </svg>
              Print Orders
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download size={18} />
              Export to Excel
            </button>
          </div>
        </div>

        {/* Print Header - Only visible when printing */}
        <div className="hidden print:block print-header">
          <h1>Order Management Report</h1>
          <div className="metadata">
            <div>Generated on: {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at {new Date().toLocaleTimeString()}</div>
            <div style={{fontWeight: 'bold', marginTop: '5px'}}>Total Orders in Report: {orders.length} (of {pagination.total} total)</div>
          </div>
          
          {/* Display Active Filters */}
          {(filters.search || filters.status || filters.salesman_id || filters.shop_id || filters.start_date || filters.end_date) && (
            <div className="filters-applied">
              <strong>Active Filters:</strong>
              {filters.search && <div>• Search: "{filters.search}"</div>}
              {filters.status && <div>• Status: {filters.status.toUpperCase()}</div>}
              {filters.salesman_id && <div>• Salesman: {salesmen.find(s => s.id === parseInt(filters.salesman_id))?.name || filters.salesman_id}</div>}
              {filters.shop_id && <div>• Shop: {shops.find(s => s.id === parseInt(filters.shop_id))?.name || filters.shop_id}</div>}
              {filters.start_date && <div>• Start Date: {new Date(filters.start_date).toLocaleDateString()}</div>}
              {filters.end_date && <div>• End Date: {new Date(filters.end_date).toLocaleDateString()}</div>}
            </div>
          )}
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center">
            <Package size={64} className="mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No Orders Found</h3>
            <p className="text-gray-500 mb-4">
              {filters.search || filters.status || filters.salesman_id || filters.shop_id || filters.route_id || filters.start_date || filters.end_date
                ? 'No orders match your current filters. Try adjusting the filters above.'
                : 'No orders have been created yet. Orders will appear here once salesmen start placing orders through the mobile app.'}
            </p>
            {(filters.search || filters.status || filters.salesman_id || filters.shop_id || filters.route_id || filters.start_date || filters.end_date) && (
              <button
                onClick={resetFilters}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <RefreshCw size={18} />
                Clear All Filters
              </button>
            )}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg inline-block">
              <p className="text-sm text-blue-800">
                <strong>💡 Tip:</strong> Orders can be created through:
              </p>
              <ul className="mt-2 text-sm text-blue-700 text-left">
                <li>• Mobile app by salesmen</li>
                <li>• API integration from other systems</li>
                <li>• Admin panel (if feature is enabled)</li>
              </ul>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Order Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Salesman
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Shop
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Products
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Items
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Net Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider no-print">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {order.order_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="print:hidden text-gray-500">
                          {new Date(order.order_date).toLocaleDateString()}
                        </div>
                        <div className="hidden print:block font-semibold text-gray-900">
                          {new Date(order.order_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {order.salesman_name}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="print:hidden text-gray-900">
                          {order.shop_name}
                        </div>
                        <div className="hidden print:block font-semibold text-gray-900">
                          {order.shop_name}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 products-cell" style={{maxWidth: '350px', minWidth: '250px'}}>
                        <div className="print:hidden">
                          {renderProductsList(order.products_summary, false)}
                        </div>
                        <div className="hidden print:block">
                          {renderProductsList(order.products_summary, true)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <select
                            value={order.status}
                            onChange={(e) => handleStatusUpdate(order.id, e.target.value)}
                            className={`no-print px-3 py-1 text-xs font-semibold rounded-full border-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 ${order.status === 'delivered' ? 'bg-green-100 text-green-800 border-green-300' : ''} ${order.status === 'approved' ? 'bg-blue-100 text-blue-800 border-blue-300' : ''} ${order.status === 'placed' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' : ''} ${order.status === 'rejected' ? 'bg-red-100 text-red-800 border-red-300' : ''}`}
                          >
                            <option value="placed">📦 Placed</option>
                            <option value="approved">✅ Approved</option>
                            <option value="delivered">🚚 Delivered</option>
                            <option value="rejected">❌ Rejected</option>
                          </select>
                          <span className={`hidden print:inline-block px-3 py-1 text-xs font-semibold rounded-full ${order.status === 'delivered' ? 'bg-green-100 text-green-800' : ''} ${order.status === 'approved' ? 'bg-blue-100 text-blue-800' : ''} ${order.status === 'placed' ? 'bg-yellow-100 text-yellow-800' : ''} ${order.status === 'rejected' ? 'bg-red-100 text-red-800' : ''}`}>
                            {order.status.toUpperCase()}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {order.items_count || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {orderService.formatCurrency(order.net_amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 no-print">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleViewDetails(order.id)}
                            className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                            title="View Details"
                          >
                            <Eye size={16} />
                            View
                          </button>
                          {!['finalized', 'delivered'].includes(order.status) && (
                            <button
                              onClick={() => handleEditOrder(order.id)}
                              className="text-green-600 hover:text-green-800 flex items-center gap-1"
                              title="Edit Order"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                              </svg>
                              Edit
                            </button>
                          )}
                          {!['finalized', 'delivered'].includes(order.status) && (
                            <button
                              onClick={() => handleDeleteOrder(order.id, order.order_number, order.status)}
                              className="text-red-600 hover:text-red-800 flex items-center gap-1"
                              title="Delete Order"
                            >
                              <Trash2 size={16} />
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Print Summary - Only visible when printing */}
            <div className="hidden print:block" style={{marginTop: '20px', padding: '15px', borderTop: '2px solid #333'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '11pt'}}>
                <div>
                  <strong>Total Orders in Report:</strong> {orders.length}
                </div>
                <div>
                  <strong>Total Amount:</strong> {orderService.formatCurrency(orders.reduce((sum, order) => sum + (parseFloat(order.net_amount) || 0), 0))}
                </div>
                <div>
                  <strong>Total Items:</strong> {orders.reduce((sum, order) => sum + (parseInt(order.items_count) || 0), 0)}
                </div>
              </div>
              <div style={{marginTop: '10px', fontSize: '9pt', color: '#666', textAlign: 'center'}}>
                This report was generated from the Distribution Management System
              </div>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between no-print">
              <div className="text-sm text-gray-700">
                Showing <span className="font-medium">{((pagination.page - 1) * pagination.limit) + 1}</span> to{' '}
                <span className="font-medium">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of{' '}
                <span className="font-medium">{pagination.total}</span> results
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-blue-50">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Order Detail Modal - Placeholder for now */}
      {showDetailModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-800">
                Order Details: {selectedOrder.order_number}
              </h2>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Salesman</h3>
                  <p className="text-lg text-gray-900">{selectedOrder.salesman_name}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Shop</h3>
                  <p className="text-lg text-gray-900">{selectedOrder.shop_name}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Order Date</h3>
                  <p className="text-lg text-gray-900">{new Date(selectedOrder.order_date).toLocaleString()}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Status</h3>
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                    ${selectedOrder.status === 'delivered' ? 'bg-green-100 text-green-800' : ''}
                    ${selectedOrder.status === 'finalized' ? 'bg-purple-100 text-purple-800' : ''}
                    ${selectedOrder.status === 'approved' ? 'bg-blue-100 text-blue-800' : ''}
                    ${selectedOrder.status === 'placed' ? 'bg-yellow-100 text-yellow-800' : ''}
                    ${selectedOrder.status === 'rejected' ? 'bg-red-100 text-red-800' : ''}
                  `}>
                    {orderService.getStatusLabel(selectedOrder.status)}
                  </span>
                </div>
              </div>

              {/* Order Items */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Order Items</h3>
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Discount %</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Net Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {selectedOrder.items && selectedOrder.items.map((item, index) => {
                      const discountAmt = parseFloat(item.discount || 0);
                      const discountPct = parseFloat(item.discount_percentage) || 
                        (discountAmt > 0 && item.total_price > 0 ? (discountAmt / item.total_price) * 100 : 0);
                      const netPrice = item.net_price || (item.total_price - discountAmt);
                      return (
                        <tr key={index}>
                          <td className="px-4 py-2 text-sm text-gray-900">{item.product_name}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{item.quantity}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{orderService.formatCurrency(item.unit_price)}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {discountPct > 0 ? (
                              <span className="text-red-600 font-medium">
                                {discountPct.toFixed(1)}%
                                <span className="text-xs text-red-400 ml-1">({orderService.formatCurrency(discountAmt)})</span>
                              </span>
                            ) : '-'}
                          </td>
                          <td className="px-4 py-2 text-sm font-medium text-gray-900">{orderService.formatCurrency(netPrice)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="border-t border-gray-200 pt-4">
                <div className="flex justify-end">
                  <div className="w-64">
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-600">Total Amount:</span>
                      <span className="font-medium">{orderService.formatCurrency(selectedOrder.total_amount)}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-600">Discount:</span>
                      <span className="font-medium text-red-600">
                        {(() => {
                          const discAmt = parseFloat(selectedOrder.discount) || 0;
                          const totalAmt = parseFloat(selectedOrder.total_amount) || 0;
                          const discPct = totalAmt > 0 && discAmt > 0 ? (discAmt / totalAmt * 100) : 0;
                          return discPct > 0 
                            ? `${discPct.toFixed(1)}% (-${orderService.formatCurrency(discAmt)})`
                            : `-${orderService.formatCurrency(discAmt)}`;
                        })()}
                      </span>
                    </div>
                    <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2">
                      <span>Net Amount:</span>
                      <span className="text-blue-600">{orderService.formatCurrency(selectedOrder.net_amount)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {selectedOrder.notes && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Notes</h3>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{selectedOrder.notes}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-6 flex justify-between gap-3">
                <div>
                  {/* Delete Button */}
                  {!['finalized', 'delivered'].includes(selectedOrder.status) && (
                    <button
                      onClick={() => handleDeleteOrder(selectedOrder.id, selectedOrder.order_number, selectedOrder.status)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
                      title="Delete Order"
                    >
                      <Trash2 size={16} />
                      Delete Order
                    </button>
                  )}
                </div>
                <div className="flex gap-3">
                  {/* Edit Button */}
                  {!['finalized', 'delivered'].includes(selectedOrder.status) && (
                    <button
                      onClick={() => handleEditOrder(selectedOrder.id)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                      </svg>
                      Edit Order
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setShowDetailModal(false);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Order Modal */}
      {showEditModal && editingOrder && editFormData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-xl font-semibold text-gray-800">
                Edit Order: {editingOrder.order_number}
              </h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6">
              {/* Order Info */}
              <div className="grid grid-cols-2 gap-6 mb-6 p-4 bg-gray-50 rounded-lg">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Salesman</h3>
                  <p className="text-lg text-gray-900">{editingOrder.salesman_name}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Order Date</h3>
                  <p className="text-lg text-gray-900">{new Date(editingOrder.order_date).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Editable Fields */}
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Shop
                  </label>
                  <select
                    value={editFormData.shop_id}
                    onChange={(e) => handleEditFormChange('shop_id', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {shops.map(shop => (
                      <option key={shop.id} value={shop.id}>{shop.shop_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Route
                  </label>
                  <select
                    value={editFormData.route_id}
                    onChange={(e) => handleEditFormChange('route_id', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {routes.map(route => (
                      <option key={route.id} value={route.id}>{route.route_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Order Items */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Order Items</h3>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Discount %</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Net Price</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {editFormData.items.map((item, index) => {
                        // Calculate net_price if not provided
                        const netPrice = item.net_price || (item.total_price - (item.discount || 0));
                        return (
                          <tr key={index}>
                            <td className="px-4 py-3 text-sm text-gray-900">{item.product_name}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {orderService.formatCurrency(item.unit_price)}
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => handleItemQuantityChange(index, parseInt(e.target.value) || 1)}
                                className="w-20 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {orderService.formatCurrency(item.total_price)}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.1"
                                  value={parseFloat(item.discount_percentage) || 0}
                                  onChange={(e) => handleItemDiscountChange(index, parseFloat(e.target.value) || 0)}
                                  className="w-20 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <span className="ml-1 text-gray-500 text-sm">%</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">
                              {orderService.formatCurrency(netPrice)}
                            </td>
                            <td className="px-4 py-3">
                              {editFormData.items.length > 1 && (
                                <button
                                  onClick={() => handleRemoveItem(index)}
                                  className="text-red-600 hover:text-red-800"
                                  title="Remove Item"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                  </svg>
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals */}
              <div className="border-t border-gray-200 pt-4 mb-6">
                <div className="flex justify-end">
                  <div className="w-64">
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-600">Total Amount:</span>
                      <span className="font-medium">{orderService.formatCurrency(calculateTotals().total_amount)}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-600">Total Discount:</span>
                      <span className="font-medium text-red-600">
                        {(() => {
                          const t = calculateTotals();
                          const pct = t.total_amount > 0 && t.discount > 0 ? (t.discount / t.total_amount * 100) : 0;
                          return pct > 0 
                            ? `${pct.toFixed(1)}% (-${orderService.formatCurrency(t.discount)})`
                            : `-${orderService.formatCurrency(t.discount)}`;
                        })()}
                      </span>
                    </div>
                    <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2">
                      <span>Net Amount:</span>
                      <span className="text-blue-600">{orderService.formatCurrency(calculateTotals().net_amount)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={editFormData.notes}
                  onChange={(e) => handleEditFormChange('notes', e.target.value)}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Add notes..."
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
};

export default OrderManagementPage;
