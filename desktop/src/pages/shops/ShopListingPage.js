import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '../../context/ToastContext';
import { useNavigate } from 'react-router-dom';
import shopService from '../../services/shopService';
import routeService from '../../services/routeService';

const ShopListingPage = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [shops, setShops] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
      
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRoute, setFilterRoute] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const fetchInitialData = useCallback(async () => {
    try {
      setLoading(true);
      const [shopsResponse, routesResponse] = await Promise.all([
        shopService.getAllShops({ limit: 100 }),
        routeService.getActiveRoutes()
      ]);
      setShops(shopsResponse.data);
      setRoutes(routesResponse.data);
    } catch (err) {
      showToast(err.message || 'Failed to fetch data', 'error');
      setTimeout(() => {}, 5000);
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const handleSearch = async () => {
    try {
      setLoading(true);
      const params = {
        limit: 100
      };
      
      // Only add non-empty parameters
      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (filterRoute) params.route_id = filterRoute;
      if (filterCity.trim()) params.city = filterCity.trim();
      if (filterStatus) params.is_active = filterStatus;
      
      const response = await shopService.getAllShops(params);
      setShops(response.data);
    } catch (err) {
      showToast(err.message || 'Failed to search shops', 'error');
      setTimeout(() => {}, 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setFilterRoute('');
    setFilterCity('');
    setFilterStatus('');
    fetchInitialData();
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleDelete = async (id, shopName) => {
    try {
      // First attempt: Try normal delete
      setLoading(true);
      await shopService.deleteShop(id, false);
      
      // Success - shop deleted
      showToast(`Shop "${shopName}" deleted successfully`, 'success');
      setTimeout(() => {}, 5000);
      fetchInitialData();
      
    } catch (err) {
      // Check if error is due to dependencies
      if (err.dependencies) {
        const { orders, invoices, deliveries } = err.dependencies;
        const dependencyMsg = [];
        if (orders > 0) dependencyMsg.push(`${orders} order(s)`);
        if (invoices > 0) dependencyMsg.push(`${invoices} invoice(s)`);
        if (deliveries > 0) dependencyMsg.push(`${deliveries} delivery(ies)`);
        
        // Shop has dependencies - inform user
        showToast(`Cannot delete shop "${shopName}": has ${dependencyMsg.join(', ')}`, 'error');
        setTimeout(() => {}, 8000);
      } else {
        // Other error
        showToast(err.message || 'Failed to delete shop', 'error');
        setTimeout(() => {}, 5000);
        console.error('Delete error:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  const getRouteName = (routeId) => {
    const route = routes.find(r => r.id === routeId);
    return route ? route.route_name : '-';
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getCreditStatusColor = (currentBalance, creditLimit) => {
    const usagePercent = (currentBalance / creditLimit) * 100;
    if (usagePercent >= 90) return 'text-red-600';
    if (usagePercent >= 70) return 'text-yellow-600';
    return 'text-green-600';
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <style>{`
        @page {
          size: A4 landscape;
          margin: 10mm 15mm;
        }
        @media print {
          * {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          body * {
            visibility: hidden;
          }
          #print-area, #print-area * {
            visibility: visible;
          }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            max-width: 100%;
            padding: 0;
            margin: 0;
          }
          .no-print {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            table-layout: auto;
            font-size: 9px;
          }
          th, td {
            border: 1px solid #333;
            padding: 3px 4px;
            font-size: 9px;
            text-align: left;
          }
          th {
            background-color: #e0e0e0 !important;
            font-weight: bold;
            font-size: 9px;
          }
          td {
            overflow: hidden;
            text-overflow: ellipsis;
          }
          /* Column widths for landscape */
          th:nth-child(1) { width: 20%; } /* Shop Name */
          th:nth-child(2) { width: 15%; } /* Owner */
          th:nth-child(3) { width: 18%; } /* Phone */
          th:nth-child(4) { width: 15%; } /* City */
          th:nth-child(5) { width: 16%; } /* Credit Limit */
          th:nth-child(6) { width: 16%; } /* Balance */
          td:nth-child(3),
          th:nth-child(3) {
            white-space: nowrap;
          }
          .print-header {
            text-align: center;
            margin-bottom: 10px;
            page-break-after: avoid;
          }
          .print-header h1 {
            font-size: 18px;
            margin: 0 0 5px 0;
            font-weight: bold;
          }
          .print-header p {
            margin: 2px 0;
            font-size: 10px;
          }
          tbody {
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
        }
      `}</style>
      <div className="container mx-auto px-4 py-6" id="print-area">
      {/* Print Header - Only visible when printing */}
      <div className="print-only" style={{ display: 'none' }}>
        <div className="print-header">
          <h1>Shop Management Report</h1>
          <p>Generated on: {new Date().toLocaleDateString('en-PK', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          <p>Total Shops: {shops.length}</p>
        </div>
      </div>

      {/* Header */}
      <div className="mb-6 no-print">
        <div className="flex items-center mb-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="mr-4 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md transition-colors flex items-center gap-2"
          >
            <span>←</span>
            <span>Back to Dashboard</span>
          </button>
        </div>
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-800">Shop Management</h1>
          <div className="flex gap-3">
            <button
              onClick={handlePrint}
              className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 no-print"
            >
              <span>🖨️</span>
              <span>Print List</span>
            </button>
            <button
              onClick={() => navigate('/shops/add')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center gap-2"
            >
              <span>+</span>
              <span>Add Shop</span>
            </button>
          </div>
        </div>
      </div>

      

      

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6 no-print">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div>
            <input
              type="text"
              placeholder="Search shop name, owner, phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <select
              value={filterRoute}
              onChange={(e) => setFilterRoute(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Routes</option>
              {routes.map(route => (
                <option key={route.id} value={route.id}>{route.route_name}</option>
              ))}
            </select>
          </div>
          <div>
            <input
              type="text"
              placeholder="Filter by city..."
              value={filterCity}
              onChange={(e) => setFilterCity(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
          <div>
            <button
              onClick={handleSearch}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
            >
              Search
            </button>
          </div>
          <div>
            <button
              onClick={handleClearFilters}
              className="w-full bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Shops Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase no-print">
                  Shop Code
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Shop Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Owner
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Phone
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  City
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase no-print">
                  Route
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase no-print">
                  Salesman
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Credit Limit
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Balance
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase no-print">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase no-print">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="10" className="px-4 py-4 text-center text-gray-500">
                    Loading shops...
                  </td>
                </tr>
              ) : shops.length === 0 ? (
                <tr>
                  <td colSpan="10" className="px-4 py-4 text-center text-gray-500">
                    No shops found. Click "Add Shop" to create one.
                  </td>
                </tr>
              ) : (
                shops.map((shop) => (
                  <tr key={shop.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 no-print">
                      {shop.shop_code}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {shop.shop_name}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                      {shop.owner_name}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                      {shop.phone}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                      {shop.city}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 no-print">
                      {getRouteName(shop.route_id)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 no-print">
                      {shop.salesman_name || 'Unassigned'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                      {formatCurrency(shop.credit_limit)}
                    </td>
                    <td className={`px-4 py-3 whitespace-nowrap text-sm font-semibold ${getCreditStatusColor(shop.current_balance, shop.credit_limit)}`}>
                      {formatCurrency(shop.current_balance)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap no-print">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        shop.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {shop.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium space-x-2 no-print">
                      <button
                        onClick={() => navigate(`/ledger/shop/${shop.id}`)}
                        className="text-purple-600 hover:text-purple-900 font-semibold"
                        title="View complete transaction history"
                      >
                        📖 Ledger
                      </button>
                      <button
                        onClick={() => navigate(`/shops/edit/${shop.id}`)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(shop.id, shop.shop_name)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      </div>
    </>
  );
};

export default ShopListingPage;
