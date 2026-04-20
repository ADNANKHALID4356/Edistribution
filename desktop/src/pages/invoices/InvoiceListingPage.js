/**
 * Invoice Listing Page
 * Sprint 7: Invoice & Bill Management
 * Display all invoices with filters and actions
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import invoiceService from '../../services/invoiceService';
import shopService from '../../services/shopService';
import InvoiceDetailModal from '../../components/invoices/InvoiceDetailModal';
import PaymentRecordModal from '../../components/invoices/PaymentRecordModal';

const InvoiceListingPage = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  // State management
  const [invoices, setInvoices] = useState([]);
  const [shops, setShops] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const limit = 10;

  // Filters
  const [filters, setFilters] = useState({
    search: '',
    payment_status: '',
    status: '',
    shop_id: '',
    start_date: '',
    end_date: ''
  });

  // Modals
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Bulk selection for cancelled invoices
  const [selectedInvoices, setSelectedInvoices] = useState([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Load data on mount
  useEffect(() => {
    loadInvoices();
    loadShops();
    loadStatistics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, filters]);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      setError('');
      
      const params = {
        page: currentPage,
        limit: limit,
        ...filters
      };

      const response = await invoiceService.getAllInvoices(params);
      
      if (response.success) {
        setInvoices(response.data || []);
        setTotalPages(response.pagination?.totalPages || 1);
        setTotalRecords(response.pagination?.totalRecords || 0);
      }
    } catch (err) {
      console.error('Error loading invoices:', err);
      setError('Failed to load invoices. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadShops = async () => {
    try {
      const response = await shopService.getAllShops({ limit: 1000 });
      if (response.success) {
        setShops(response.data || []);
      }
    } catch (err) {
      console.error('Error loading shops:', err);
    }
  };

  const loadStatistics = async () => {
    try {
      const response = await invoiceService.getStatistics();
      if (response.success) {
        setStatistics(response.data);
      }
    } catch (err) {
      console.error('Error loading statistics:', err);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters({
      ...filters,
      [name]: value
    });
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    loadInvoices();
  };

  const handleClearFilters = () => {
    setFilters({
      search: '',
      payment_status: '',
      status: '',
      shop_id: '',
      start_date: '',
      end_date: ''
    });
    setCurrentPage(1);
  };

  const handleViewDetails = (invoice) => {
    setSelectedInvoice(invoice);
    setShowDetailModal(true);
  };

  const handleRecordPayment = (invoice) => {
    setSelectedInvoice(invoice);
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    setSelectedInvoice(null);
    setSuccess('Payment recorded successfully!');
    loadInvoices();
    loadStatistics();
    
    // Clear success message after 3 seconds
    setTimeout(() => setSuccess(''), 3000);
  };

  // Bulk selection handlers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      // Select only cancelled invoices
      const cancelledIds = invoices
        .filter(inv => inv.status === 'cancelled')
        .map(inv => inv.id);
      setSelectedInvoices(cancelledIds);
    } else {
      setSelectedInvoices([]);
    }
  };

  const handleSelectInvoice = (invoiceId, isChecked) => {
    if (isChecked) {
      setSelectedInvoices([...selectedInvoices, invoiceId]);
    } else {
      setSelectedInvoices(selectedInvoices.filter(id => id !== invoiceId));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedInvoices.length === 0) {
      setError('Please select at least one cancelled invoice to delete.');
      setTimeout(() => setError(''), 3000);
      return;
    }

    try {
      setBulkDeleting(true);
      setError('');
      
      const response = await invoiceService.bulkDeleteInvoices(selectedInvoices);
      
      if (response.success) {
        const { deleted, failed, total } = response.data;
        
        let message = `✅ Successfully deleted ${deleted.length} of ${total} invoice(s)`;
        
        if (failed.length > 0) {
          message += `\n\n⚠️ Failed to delete ${failed.length} invoice(s):`;
          failed.forEach(f => {
            message += `\n• ${f.invoice_number || 'ID: ' + f.id}: ${f.reason}`;
          });
        }
        
        setSuccess(message);
        setSelectedInvoices([]);
        loadInvoices();
        loadStatistics();
        
        setTimeout(() => setSuccess(''), 5000);
      }
    } catch (err) {
      console.error('Bulk delete error:', err);
      setError('Failed to bulk delete invoices. Please try again.');
      setTimeout(() => setError(''), 3000);
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleDeleteInvoice = async (invoiceId) => {
    try {
      // First attempt: Try normal delete
      setLoading(true);
      await invoiceService.deleteInvoice(invoiceId, false);
      
      // Success - invoice deleted
      setSuccess('Invoice cancelled successfully!');
      loadInvoices();
      loadStatistics();
      setTimeout(() => setSuccess(''), 3000);
      
    } catch (err) {
      // Check if error is due to dependencies (payments/deliveries)
      if (err.response?.data?.dependencies) {
        const { payments, deliveries, payment_status, paid_amount } = err.response.data.dependencies;
        const dependencyMsg = [];
        
        if (payment_status === 'paid' || payment_status === 'partial') {
          dependencyMsg.push(`Payment Status: ${payment_status}`);
          dependencyMsg.push(`Paid Amount: PKR ${parseFloat(paid_amount).toLocaleString()}`);
        }
        if (payments > 0) dependencyMsg.push(`${payments} payment record(s)`);
        if (deliveries > 0) dependencyMsg.push(`${deliveries} delivery(ies)`);
        
        // Show warning toast about admin override instead of alert
        const warning = `⚠️ WARNING: This invoice has existing data:\n${dependencyMsg.join('\n')}\n\nADMIN OVERRIDE REQUIRED:\n- The invoice\n- All payment records\nwill be permanently deleted!`;
        showToast(warning, 'warning');
        
        // Attempt force delete instead of prompting
        try {
          setLoading(true);
          const result = await invoiceService.deleteInvoice(invoiceId, true);
          
          showToast(`Invoice cancelled successfully (Admin Override)\n\nDeleted:\n- ${result.deleted?.payments || 0} payment(s)\n- ${result.deleted?.deliveries || 0} delivery association(s)`, 'success');
          
          loadInvoices();
          loadStatistics();
        } catch (forceErr) {
          showToast(forceErr.response?.data?.message || 'Failed to force delete invoice.', 'error');
        } finally {
          setLoading(false);
        }
      } else {
        // Other error
        showToast(err.response?.data?.message || 'Failed to cancel invoice.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Dashboard
          </button>
          <button
            onClick={() => navigate('/invoices/new')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Generate Invoice
          </button>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Invoices</h1>
          <p className="text-gray-600 mt-1">Manage invoices and payments</p>
        </div>
      </div>

      {/* Alert Messages */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border-l-4 border-green-500 text-green-700">
          {success}
        </div>
      )}

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Total Invoices</p>
            <p className="text-2xl font-bold text-gray-800">{statistics.total_invoices || 0}</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Total Amount</p>
            <p className="text-2xl font-bold text-blue-600">
              {invoiceService.formatCurrency(statistics.total_invoice_amount || 0)}
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Paid Amount</p>
            <p className="text-2xl font-bold text-green-600">
              {invoiceService.formatCurrency(statistics.total_paid_amount || 0)}
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Outstanding Balance</p>
            <p className="text-2xl font-bold text-red-600">
              {invoiceService.formatCurrency(statistics.total_outstanding || 0)}
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div>
            <input
              type="text"
              name="search"
              value={filters.search}
              onChange={handleFilterChange}
              placeholder="Search invoice #, shop..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <select
              name="payment_status"
              value={filters.payment_status}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Payment Status</option>
              <option value="unpaid">Unpaid</option>
              <option value="partial">Partial</option>
              <option value="paid">Paid</option>
            </select>
          </div>

          <div>
            <select
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Status</option>
              <option value="draft">Draft</option>
              <option value="issued">Issued</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <select
              name="shop_id"
              value={filters.shop_id}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Shops</option>
              {shops.map(shop => (
                <option key={shop.id} value={shop.id}>{shop.shop_name}</option>
              ))}
            </select>
          </div>

          <div>
            <input
              type="date"
              name="start_date"
              value={filters.start_date}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <input
              type="date"
              name="end_date"
              value={filters.end_date}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="md:col-span-3 lg:col-span-6 flex space-x-2">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Apply Filters
            </button>
            <button
              type="button"
              onClick={handleClearFilters}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Clear
            </button>
            
            {/* Bulk Delete Button - Only show if cancelled invoices exist */}
            {invoices.some(inv => inv.status === 'cancelled') && (
              <button
                type="button"
                onClick={handleBulkDelete}
                disabled={selectedInvoices.length === 0 || bulkDeleting}
                className={`ml-auto px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
                  selectedInvoices.length === 0 || bulkDeleting
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-red-600 text-white hover:bg-red-700'
                }`}
                title="Bulk delete selected cancelled invoices"
              >
                {bulkDeleting ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span>Delete Selected ({selectedInvoices.length})</span>
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No invoices found.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {/* Select All Checkbox - Only for cancelled invoices */}
                    {invoices.some(inv => inv.status === 'cancelled') && (
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <input
                          type="checkbox"
                          checked={
                            invoices.filter(inv => inv.status === 'cancelled').length > 0 &&
                            invoices.filter(inv => inv.status === 'cancelled').every(inv => selectedInvoices.includes(inv.id))
                          }
                          onChange={handleSelectAll}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          title="Select all cancelled invoices"
                        />
                      </th>
                    )}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Invoice #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Shop
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Salesman
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Paid
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Balance
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payment Status
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      {/* Checkbox - Only for cancelled invoices */}
                      {invoices.some(inv => inv.status === 'cancelled') && (
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {invoice.status === 'cancelled' ? (
                            <input
                              type="checkbox"
                              checked={selectedInvoices.includes(invoice.id)}
                              onChange={(e) => handleSelectInvoice(invoice.id, e.target.checked)}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                        {invoice.invoice_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {invoiceService.formatDate(invoice.invoice_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {invoice.shop_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {invoice.salesman_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                        {invoiceService.formatCurrency(invoice.net_amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 text-right">
                        {invoiceService.formatCurrency(invoice.paid_amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 text-right">
                        {invoiceService.formatCurrency(invoice.balance_amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${invoiceService.getPaymentStatusColor(invoice.payment_status || invoice.status)}`}>
                          {invoice.payment_status || invoice.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${invoiceService.getStatusColor(invoice.status)}`}>
                          {invoice.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                        <div className="flex justify-center space-x-2">
                          <button
                            onClick={() => handleViewDetails(invoice)}
                            className="text-blue-600 hover:text-blue-800"
                            title="View Details"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          
                          {(invoice.payment_status === 'unpaid' || invoice.payment_status === 'partial' || invoice.status === 'unpaid' || invoice.status === 'partial') && invoice.status !== 'cancelled' && (
                            <button
                              onClick={() => handleRecordPayment(invoice)}
                              className="text-green-600 hover:text-green-800 record-payment-btn"
                              data-invoice-id={invoice.id}
                              title="Record Payment"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </button>
                          )}

                          {/* View Shop Ledger Button */}
                          <button
                            onClick={() => navigate(`/ledger/shop/${invoice.shop_id}`)}
                            className="text-purple-600 hover:text-purple-800"
                            title="View Shop Ledger"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </button>
                          
                          {invoice.status !== 'cancelled' && (
                            <button
                              onClick={() => handleDeleteInvoice(invoice.id)}
                              className="text-red-600 hover:text-red-800"
                              title="Delete Invoice (Admin can delete any invoice)"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="bg-gray-50 px-6 py-3 flex items-center justify-between border-t border-gray-200">
              <div className="text-sm text-gray-700">
                Showing <span className="font-medium">{(currentPage - 1) * limit + 1}</span> to{' '}
                <span className="font-medium">{Math.min(currentPage * limit, totalRecords)}</span> of{' '}
                <span className="font-medium">{totalRecords}</span> results
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                
                <span className="px-3 py-1 text-gray-700">
                  Page {currentPage} of {totalPages}
                </span>
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      {showDetailModal && selectedInvoice && (
        <InvoiceDetailModal
          invoiceId={selectedInvoice.id}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedInvoice(null);
          }}
          onPaymentRecorded={() => {
            setShowDetailModal(false);
            loadInvoices();
            loadStatistics();
          }}
        />
      )}

      {showPaymentModal && selectedInvoice && (
        <PaymentRecordModal
          invoice={selectedInvoice}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedInvoice(null);
          }}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
};

export default InvoiceListingPage;
