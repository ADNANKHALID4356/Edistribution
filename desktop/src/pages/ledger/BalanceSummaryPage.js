/**
 * Balance Summary Dashboard Page
 * Shop Ledger Management System
 * Display all shops balance summary with filters and quick actions
 * Company: Ummahtechinnovations.com
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ledgerService from '../../services/ledgerService';
import shopService from '../../services/shopService';

const BalanceSummaryPage = () => {
  const navigate = useNavigate();
  
  // State management
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const limit = 20;

  // Filters and sorting
  const [sortBy, setSortBy] = useState('current_balance');
  const [sortOrder, setSortOrder] = useState('DESC');
  const [searchTerm, setSearchTerm] = useState('');

  // Summary statistics
  const [summary, setSummary] = useState({
    total_shops: 0,
    total_outstanding: 0,
    total_overdue: 0,
    total_available_credit: 0
  });

  // Load data on mount and when filters change
  useEffect(() => {
    loadShopsBalance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, sortBy, sortOrder]);

  const loadShopsBalance = async () => {
    try {
      setLoading(true);
      setError('');
      
      const params = {
        page: currentPage,
        limit: limit,
        sort_by: sortBy,
        order: sortOrder,
        search: searchTerm
      };

      const response = await ledgerService.getAllShopsBalance(params);
      
      if (response.success) {
        setShops(response.data || []);
        setTotalPages(response.pagination?.totalPages || 1);
        setTotalRecords(response.pagination?.totalRecords || 0);
        
        // Calculate summary
        calculateSummary(response.data || []);
      }
    } catch (err) {
      console.error('Error loading shops balance:', err);
      setError('Failed to load shops balance. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const calculateSummary = (shopsList) => {
    const totals = shopsList.reduce((acc, shop) => ({
      total_shops: acc.total_shops + 1,
      total_outstanding: acc.total_outstanding + (shop.current_balance || 0),
      total_overdue: acc.total_overdue + (shop.overdue_amount || 0),
      total_available_credit: acc.total_available_credit + (shop.available_credit || 0)
    }), {
      total_shops: 0,
      total_outstanding: 0,
      total_overdue: 0,
      total_available_credit: 0
    });
    
    setSummary(totals);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    loadShopsBalance();
  };

  const handleSort = (column) => {
    if (sortBy === column) {
      // Toggle sort order
      setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortBy(column);
      setSortOrder('DESC');
    }
    setCurrentPage(1);
  };

  const viewShopLedger = (shopId) => {
    navigate(`/ledger/shop/${shopId}`);
  };

  const recordPayment = (shop) => {
    navigate(`/ledger/payment/new`, { state: { shop } });
  };

  const getBalanceClass = (balance) => {
    if (balance > 0) return 'text-red-600 font-semibold';
    if (balance < 0) return 'text-green-600 font-semibold';
    return 'text-gray-600';
  };

  const getCreditLimitClass = (shop) => {
    const utilization = (shop.current_balance / shop.credit_limit) * 100;
    if (utilization >= 90) return 'bg-red-100 text-red-800';
    if (utilization >= 75) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Balance Summary</h1>
          <p className="text-gray-600 mt-1">All shops balance and credit status</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/ledger/aging')}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition"
          >
            📊 Aging Report
          </button>
          <button
            onClick={() => navigate('/ledger/payment/new')}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
          >
            💰 Record Payment
          </button>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
          <div className="text-sm text-gray-600 mb-1">Total Shops</div>
          <div className="text-2xl font-bold text-gray-800">{summary.total_shops}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
          <div className="text-sm text-gray-600 mb-1">Total Outstanding</div>
          <div className="text-2xl font-bold text-red-600">
            {ledgerService.formatCurrency(summary.total_outstanding)}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-orange-500">
          <div className="text-sm text-gray-600 mb-1">Total Overdue</div>
          <div className="text-2xl font-bold text-orange-600">
            {ledgerService.formatCurrency(summary.total_overdue)}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
          <div className="text-sm text-gray-600 mb-1">Available Credit</div>
          <div className="text-2xl font-bold text-green-600">
            {ledgerService.formatCurrency(summary.total_available_credit)}
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <form onSubmit={handleSearch} className="flex gap-3">
          <input
            type="text"
            placeholder="Search by shop name or code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="submit"
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            🔍 Search
          </button>
          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setCurrentPage(1);
              loadShopsBalance();
            }}
            className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition"
          >
            Clear
          </button>
        </form>
      </div>

      {/* Shops Balance Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('shop_code')}
                >
                  Shop Code {sortBy === 'shop_code' && (sortOrder === 'ASC' ? '↑' : '↓')}
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('shop_name')}
                >
                  Shop Name {sortBy === 'shop_name' && (sortOrder === 'ASC' ? '↑' : '↓')}
                </th>
                <th 
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('current_balance')}
                >
                  Current Balance {sortBy === 'current_balance' && (sortOrder === 'ASC' ? '↑' : '↓')}
                </th>
                <th 
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('credit_limit')}
                >
                  Credit Limit {sortBy === 'credit_limit' && (sortOrder === 'ASC' ? '↑' : '↓')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Available Credit
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Utilization
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Transaction
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-6 py-4 text-center">
                    <div className="flex justify-center items-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <span className="ml-2">Loading shops...</span>
                    </div>
                  </td>
                </tr>
              ) : shops.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-4 text-center text-gray-500">
                    No shops found
                  </td>
                </tr>
              ) : (
                shops.map((shop) => {
                  const utilization = ((shop.current_balance / shop.credit_limit) * 100).toFixed(1);
                  return (
                    <tr key={shop.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {shop.shop_code}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{shop.shop_name}</div>
                        <div className="text-sm text-gray-500">{shop.owner_name}</div>
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm text-right ${getBalanceClass(shop.current_balance)}`}>
                        {ledgerService.formatCurrency(shop.current_balance)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {ledgerService.formatCurrency(shop.credit_limit)}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm text-right ${shop.available_credit < 0 ? 'text-red-600 font-semibold' : 'text-green-600'}`}>
                        {ledgerService.formatCurrency(shop.available_credit)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`px-2 py-1 text-xs font-semibold rounded ${getCreditLimitClass(shop)}`}>
                          {utilization}%
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                        {shop.last_transaction_date 
                          ? ledgerService.formatDate(shop.last_transaction_date)
                          : '-'
                        }
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                        <button
                          onClick={() => viewShopLedger(shop.id)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                          title="View Ledger"
                        >
                          📖
                        </button>
                        <button
                          onClick={() => recordPayment(shop)}
                          className="text-green-600 hover:text-green-900"
                          title="Record Payment"
                        >
                          💰
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{(currentPage - 1) * limit + 1}</span> to{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * limit, totalRecords)}
                  </span>{' '}
                  of <span className="font-medium">{totalRecords}</span> shops
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  
                  {/* Page numbers */}
                  {[...Array(Math.min(5, totalPages))].map((_, idx) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = idx + 1;
                    } else if (currentPage <= 3) {
                      pageNum = idx + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + idx;
                    } else {
                      pageNum = currentPage - 2 + idx;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          currentPage === pageNum
                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BalanceSummaryPage;
