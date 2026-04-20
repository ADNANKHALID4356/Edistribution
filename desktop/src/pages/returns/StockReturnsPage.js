import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import stockReturnService from '../../services/stockReturnService';
import deliveryService from '../../services/deliveryService';
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  ArrowUturnLeftIcon,
  EyeIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

const StockReturnsPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('process'); // 'list' or 'process'
  const [returns, setReturns] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Process return state - search by challan
  const [challanSearch, setChallanSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [returnItems, setReturnItems] = useState([]);
  const [returnReason, setReturnReason] = useState('');
  const [returnNotes, setReturnNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [checkedItems, setCheckedItems] = useState({}); // Track which items are checked

  // View details state
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [expandedReturn, setExpandedReturn] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const fetchReturns = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (dateFilter) params.date = dateFilter;

      const [returnsRes, statsRes] = await Promise.all([
        stockReturnService.getAllReturns(params),
        stockReturnService.getStatistics(params),
      ]);
      setReturns(returnsRes.data || []);
      setStatistics(statsRes.data || null);
    } catch (err) {
      setError(err.message || 'Failed to fetch returns');
    } finally {
      setLoading(false);
    }
  }, [dateFilter]);

  useEffect(() => {
    if (activeTab === 'list') {
      fetchReturns();
    }
  }, [activeTab, fetchReturns]);

  // Search deliveries by challan number
  const handleChallanSearch = async () => {
    if (!challanSearch.trim()) {
      setError('Please enter a Challan Number or Order ID to search');
      return;
    }

    setSearchLoading(true);
    setError('');
    setSearchResults([]);
    setSelectedDelivery(null);
    setReturnItems([]);

    try {
      const response = await deliveryService.getAllDeliveries({ search: challanSearch.trim() });
      const results = (response.data || []);
      setSearchResults(results);

      if (results.length === 0) {
        setError('No deliveries found matching that Challan Number / Order ID');
      } else if (results.length === 1) {
        // Auto-select if only one result
        await loadDeliveryDetails(results[0].id);
      }
    } catch (err) {
      setError(err.message || 'Failed to search deliveries');
    } finally {
      setSearchLoading(false);
    }
  };

  const loadDeliveryDetails = async (deliveryId) => {
    try {
      setLoading(true);
      const response = await deliveryService.getDeliveryById(deliveryId);
      const delivery = response.data;
      setSelectedDelivery(delivery);

      // Pre-populate return items
      const items = (delivery.items || []).map(item => {
        const qty = item.quantity_delivered || item.quantity_ordered;
        const netAmt = parseFloat(item.net_amount) || parseFloat(item.total_price) || (qty * parseFloat(item.unit_price));
        const discountedUnitPrice = qty > 0 ? (netAmt / qty) : item.unit_price;
        
        return {
          delivery_item_id: item.id,
          product_id: item.product_id,
          product_name: item.product_name,
          product_code: item.product_code,
          quantity_delivered: qty,
          quantity_already_returned: item.quantity_returned || 0,
          max_returnable: qty - (item.quantity_returned || 0),
          unit_price: item.unit_price,
          discount_percentage: item.discount_percentage || 0,
          discount_amount: item.discount_amount || 0,
          net_unit_price: discountedUnitPrice,
          return_quantity: 0,
          reason: '',
        };
      });
      setReturnItems(items);
      // Initialize all checkboxes as unchecked
      setCheckedItems({});
    } catch (err) {
      setError('Failed to load delivery details');
    } finally {
      setLoading(false);
    }
  };

  const toggleItemCheck = (index) => {
    setCheckedItems(prev => {
      const newChecked = { ...prev };
      const wasChecked = !!newChecked[index];
      newChecked[index] = !wasChecked;

      // When checking an item, default return_quantity to max_returnable
      // When unchecking, reset return_quantity to 0
      setReturnItems(prevItems => {
        const updated = [...prevItems];
        if (!wasChecked) {
          updated[index] = { ...updated[index], return_quantity: updated[index].max_returnable };
        } else {
          updated[index] = { ...updated[index], return_quantity: 0 };
        }
        return updated;
      });

      return newChecked;
    });
  };

  const toggleAllItems = () => {
    const returnableItems = returnItems.reduce((acc, item, idx) => {
      if (item.max_returnable > 0) acc[idx] = true;
      return acc;
    }, {});
    const allChecked = Object.keys(returnableItems).every(idx => checkedItems[idx]);

    if (allChecked) {
      // Uncheck all
      setCheckedItems({});
      setReturnItems(prev => prev.map(item => ({ ...item, return_quantity: 0 })));
    } else {
      // Check all returnable items with max quantity
      setCheckedItems(returnableItems);
      setReturnItems(prev => prev.map(item => ({
        ...item,
        return_quantity: item.max_returnable > 0 ? item.max_returnable : 0,
      })));
    }
  };

  const updateReturnQuantity = (index, value) => {
    const qty = parseInt(value) || 0;
    const clamped = Math.min(Math.max(0, qty), returnItems[index].max_returnable);
    setReturnItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], return_quantity: clamped };
      return updated;
    });
    // Auto-check/uncheck based on quantity
    setCheckedItems(prev => ({ ...prev, [index]: clamped > 0 }));
  };

  const handleProcessReturn = async () => {
    const itemsToReturn = returnItems.filter((item, index) => checkedItems[index] && item.return_quantity > 0);

    if (itemsToReturn.length === 0) {
      setError('Please tick at least one item and specify a return quantity');
      return;
    }

    if (!returnReason) {
      setError('Please select a return reason');
      return;
    }

    setProcessing(true);
    setError('');

    try {
      const returnData = {
        delivery_id: selectedDelivery.id,
        return_date: new Date().toISOString(),
        reason: returnReason,
        notes: returnNotes,
        items: itemsToReturn.map(item => ({
          delivery_item_id: item.delivery_item_id,
          product_id: item.product_id,
          quantity_returned: item.return_quantity,
          return_amount: item.return_quantity * parseFloat(item.net_unit_price || item.unit_price || 0),
          reason: item.reason || returnReason,
        })),
      };

      await stockReturnService.processReturn(returnData);
      setSuccess('Stock return processed successfully! Stock has been updated.');
      // Reset form
      setChallanSearch('');
      setSearchResults([]);
      setSelectedDelivery(null);
      setReturnItems([]);
      setCheckedItems({});
      setReturnReason('');
      setReturnNotes('');
    } catch (err) {
      setError(err.message || 'Failed to process return');
    } finally {
      setProcessing(false);
    }
  };

  const handleReset = () => {
    setChallanSearch('');
    setSearchResults([]);
    setSelectedDelivery(null);
    setReturnItems([]);
    setCheckedItems({});
    setReturnReason('');
    setReturnNotes('');
    setError('');
    setSuccess('');
  };

  const viewReturnDetails = async (returnId) => {
    try {
      const response = await stockReturnService.getReturnById(returnId);
      setSelectedReturn(response.data);
      setShowDetailModal(true);
    } catch (err) {
      setError('Failed to load return details');
    }
  };

  const formatCurrency = (num) => '₨ ' + parseFloat(num || 0).toLocaleString();
  const formatDate = (date) => date ? new Date(date).toLocaleDateString('en-PK') : '-';

  const filteredReturns = returns.filter(r => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (r.return_number || '').toLowerCase().includes(term) ||
      (r.shop_name || '').toLowerCase().includes(term) ||
      (r.challan_number || '').toLowerCase().includes(term)
    );
  });

  const totalReturnValue = returnItems.reduce(
    (sum, item) => sum + item.return_quantity * parseFloat(item.net_unit_price || item.unit_price || 0), 0
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-gray-100 rounded-lg">
                <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-800">Stock Returns</h1>
                <p className="text-sm text-gray-500">Process and track stock returns from deliveries</p>
              </div>
            </div>
            <button onClick={fetchReturns} className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">
              <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Messages */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
            <XCircleIcon className="h-5 w-5 text-red-500 flex-shrink-0" />
            <span className="text-red-700">{error}</span>
            <button onClick={() => setError('')} className="ml-auto text-red-500 hover:text-red-700">
              <XCircleIcon className="h-5 w-5" />
            </button>
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
            <CheckCircleIcon className="h-5 w-5 text-green-500 flex-shrink-0" />
            <span className="text-green-700">{success}</span>
            <button onClick={() => setSuccess('')} className="ml-auto text-green-500 hover:text-green-700">
              <XCircleIcon className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Statistics Cards */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <p className="text-sm text-gray-500">Total Returns</p>
              <p className="text-2xl font-bold text-gray-800">{statistics.total_returns || 0}</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <p className="text-sm text-gray-500">Total Qty Returned</p>
              <p className="text-2xl font-bold text-orange-600">{statistics.total_quantity || 0}</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <p className="text-sm text-gray-500">Total Return Value</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(statistics.total_amount)}</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('list')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              activeTab === 'list'
                ? 'bg-primary-600 text-white shadow-md'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            Return History
          </button>
          <button
            onClick={() => setActiveTab('process')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${
              activeTab === 'process'
                ? 'bg-primary-600 text-white shadow-md'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <ArrowUturnLeftIcon className="h-4 w-4" />
            Process Return
          </button>
        </div>

        {/* List Tab */}
        {activeTab === 'list' && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            {/* Search & Filters */}
            <div className="p-4 border-b border-gray-100 flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by return number, shop name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Returns Table */}
            <div className="overflow-x-auto">
              {loading ? (
                <div className="text-center py-16">
                  <ArrowPathIcon className="h-8 w-8 animate-spin text-primary-500 mx-auto mb-2" />
                  <p className="text-gray-500">Loading returns...</p>
                </div>
              ) : filteredReturns.length === 0 ? (
                <div className="text-center py-16">
                  <ArrowUturnLeftIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No stock returns found</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Return #</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Challan #</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Shop</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Items</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Value</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Reason</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredReturns.map((ret) => (
                      <React.Fragment key={ret.id}>
                        <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => setExpandedReturn(expandedReturn === ret.id ? null : ret.id)}>
                          <td className="px-4 py-3 font-medium text-primary-600">{ret.return_number}</td>
                          <td className="px-4 py-3 text-gray-600">{ret.challan_number || '-'}</td>
                          <td className="px-4 py-3 text-gray-800">{ret.shop_name || '-'}</td>
                          <td className="px-4 py-3 text-gray-600">{formatDate(ret.return_date)}</td>
                          <td className="px-4 py-3 text-right text-gray-600">{ret.total_items || 0}</td>
                          <td className="px-4 py-3 text-right font-medium text-red-600">{formatCurrency(ret.total_return_amount)}</td>
                          <td className="px-4 py-3 text-gray-600 truncate max-w-[150px]">{ret.reason || '-'}</td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={(e) => { e.stopPropagation(); viewReturnDetails(ret.id); }}
                                className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600"
                                title="View Details"
                              >
                                <EyeIcon className="h-4 w-4" />
                              </button>
                              {expandedReturn === ret.id ? (
                                <ChevronUpIcon className="h-4 w-4 text-gray-400" />
                              ) : (
                                <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                              )}
                            </div>
                          </td>
                        </tr>
                        {expandedReturn === ret.id && ret.items && (
                          <tr>
                            <td colSpan="8" className="px-4 py-3 bg-gray-50">
                              <div className="text-sm">
                                <p className="font-medium text-gray-700 mb-2">Returned Items:</p>
                                <div className="space-y-1">
                                  {ret.items.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center bg-white px-3 py-2 rounded-lg">
                                      <span className="text-gray-700">{item.product_name} ({item.product_code})</span>
                                      <div className="flex items-center gap-4">
                                        <span className="text-gray-500">Qty: {item.quantity_returned}</span>
                                        <span className="text-red-600 font-medium">{formatCurrency(item.return_amount)}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* Process Tab */}
        {activeTab === 'process' && (
          <div className="space-y-6">
            {/* Search by Challan Number */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Search Delivery by Challan No. / Order ID</h3>
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Enter Challan Number (e.g., DC-20260308-0001) or shop name..."
                    value={challanSearch}
                    onChange={(e) => setChallanSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleChallanSearch()}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-base"
                  />
                </div>
                <button
                  onClick={handleChallanSearch}
                  disabled={searchLoading}
                  className="px-6 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {searchLoading ? (
                    <ArrowPathIcon className="h-5 w-5 animate-spin" />
                  ) : (
                    <MagnifyingGlassIcon className="h-5 w-5" />
                  )}
                  Search
                </button>
                {(selectedDelivery || searchResults.length > 0) && (
                  <button
                    onClick={handleReset}
                    className="px-4 py-3 bg-gray-100 text-gray-600 font-medium rounded-lg hover:bg-gray-200"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Search Results (if multiple) */}
              {searchResults.length > 1 && !selectedDelivery && (
                <div className="mt-4">
                  <p className="text-sm text-gray-500 mb-2">Found {searchResults.length} deliveries — select one:</p>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {searchResults.map((d) => (
                      <button
                        key={d.id}
                        onClick={() => loadDeliveryDetails(d.id)}
                        className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:bg-primary-50 hover:border-primary-300 transition-all flex justify-between items-center"
                      >
                        <div>
                          <span className="font-semibold text-primary-700">{d.challan_number}</span>
                          <span className="text-gray-500 mx-2">|</span>
                          <span className="text-gray-700">{d.shop_name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-gray-500">{formatDate(d.delivery_date)}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            d.status === 'delivered' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {d.status}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Selected Delivery Info & Return Form */}
            {selectedDelivery && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">Delivery: {selectedDelivery.challan_number}</h3>
                    <p className="text-sm text-gray-500">
                      Shop: <span className="font-medium text-gray-700">{selectedDelivery.shop_name}</span>
                      {' | '}Date: {formatDate(selectedDelivery.delivery_date)}
                      {selectedDelivery.route_name && <>{' | '}Route: {selectedDelivery.route_name}</>}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    selectedDelivery.status === 'delivered' ? 'bg-green-100 text-green-700' :
                    selectedDelivery.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {selectedDelivery.status}
                  </span>
                </div>

                {/* Financial Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Subtotal</p>
                    <p className="font-bold text-gray-800">{formatCurrency(selectedDelivery.subtotal || selectedDelivery.total_amount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Discount</p>
                    <p className="font-bold text-green-600">{formatCurrency(selectedDelivery.discount_amount || 0)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Charges/Tax</p>
                    <p className="font-bold text-gray-600">{formatCurrency((parseFloat(selectedDelivery.tax_amount) || 0) + (parseFloat(selectedDelivery.shipping_charges) || 0))}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Grand Total</p>
                    <p className="font-bold text-blue-600">{formatCurrency(selectedDelivery.grand_total || selectedDelivery.total_amount)}</p>
                  </div>
                </div>

                {/* Delivery Items Table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 bg-orange-50">
                          <div className="flex flex-col items-center gap-1">
                            <span>Return?</span>
                            {selectedDelivery.status !== 'cancelled' && (
                              <input
                                type="checkbox"
                                checked={returnItems.filter(i => i.max_returnable > 0).length > 0 &&
                                  returnItems.every((item, idx) => item.max_returnable <= 0 || checkedItems[idx])}
                                onChange={toggleAllItems}
                                className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                                title="Select/Deselect All"
                              />
                            )}
                          </div>
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Product</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600">Delivered</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600">Already Returned</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600">Max Returnable</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600">Base Price</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-green-600">Discount</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-blue-600">Net Price</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 bg-orange-50">Return Qty</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600">Return Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {returnItems.map((item, index) => {
                        const isChecked = !!checkedItems[index];
                        const canReturn = item.max_returnable > 0 && selectedDelivery.status !== 'cancelled';
                        return (
                          <tr key={index} className={isChecked ? 'bg-orange-50' : ''}>
                            <td className="px-3 py-2 text-center bg-orange-50/50">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleItemCheck(index)}
                                disabled={!canReturn}
                                className="w-5 h-5 rounded border-gray-300 text-orange-600 focus:ring-orange-500 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <span className="font-medium text-gray-800">{item.product_name}</span>
                              {item.product_code && <span className="text-xs text-gray-500 ml-1">({item.product_code})</span>}
                            </td>
                            <td className="px-3 py-2 text-right text-gray-600 font-medium">{item.quantity_delivered}</td>
                            <td className="px-3 py-2 text-right text-orange-600">{item.quantity_already_returned}</td>
                            <td className="px-3 py-2 text-right text-blue-600 font-medium">{item.max_returnable}</td>
                            <td className="px-3 py-2 text-right text-gray-600">{formatCurrency(item.unit_price)}</td>
                            <td className="px-3 py-2 text-right text-green-600">
                              {item.discount_percentage ? `${parseFloat(item.discount_percentage).toFixed(1)}% ` : ''}
                              {item.discount_amount > 0 ? `(${formatCurrency(item.discount_amount)})` : '-'}
                            </td>
                            <td className="px-3 py-2 text-right font-medium text-blue-700">{formatCurrency(item.net_unit_price)}</td>
                            <td className="px-3 py-2 bg-orange-50/50">
                              <input
                                type="number"
                                min="0"
                                max={item.max_returnable}
                                value={item.return_quantity}
                                onChange={(e) => updateReturnQuantity(index, e.target.value)}
                                className={`w-20 px-2 py-1.5 border rounded-lg text-center focus:ring-2 focus:ring-orange-500 font-medium ${
                                  isChecked ? 'border-orange-400 bg-white' : 'border-gray-200 bg-gray-50'
                                }`}
                                disabled={!canReturn}
                              />
                            </td>
                            <td className={`px-3 py-2 text-right font-medium ${isChecked ? 'text-red-600' : 'text-gray-400'}`}>
                              {formatCurrency(item.return_quantity * parseFloat(item.net_unit_price || item.unit_price || 0))}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td colSpan="4" className="px-3 py-3 text-right text-sm text-gray-500">
                          Items selected: <span className="font-bold text-orange-600">{returnItems.filter((_, i) => checkedItems[i] && returnItems[i].return_quantity > 0).length}</span>
                          {' / '}{returnItems.length}
                        </td>
                        <td colSpan="2" className="px-3 py-3 text-right font-bold text-gray-700">Total Return Value:</td>
                        <td colSpan="2" className="px-3 py-3 text-right font-bold text-red-600 text-lg">{formatCurrency(totalReturnValue)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Return Reason & Notes */}
                {selectedDelivery.status !== 'cancelled' && (
                  <>
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Return Reason *</label>
                        <select
                          value={returnReason}
                          onChange={(e) => setReturnReason(e.target.value)}
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                        >
                          <option value="">Select reason</option>
                          <option value="damaged">Damaged Goods</option>
                          <option value="expired">Expired Products</option>
                          <option value="wrong_product">Wrong Product</option>
                          <option value="excess_quantity">Excess Quantity</option>
                          <option value="quality_issue">Quality Issue</option>
                          <option value="shop_closed">Shop Closed</option>
                          <option value="partial_acceptance">Partial Acceptance</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                        <input
                          type="text"
                          value={returnNotes}
                          onChange={(e) => setReturnNotes(e.target.value)}
                          placeholder="Additional notes..."
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                    </div>

                    {/* Submit Button */}
                    <div className="mt-6 flex justify-end">
                      <button
                        onClick={handleProcessReturn}
                        disabled={processing || Object.values(checkedItems).filter(Boolean).length === 0 || !returnReason}
                        className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-medium rounded-xl hover:from-orange-600 hover:to-red-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transition-all flex items-center gap-2"
                      >
                        {processing ? (
                          <ArrowPathIcon className="h-5 w-5 animate-spin" />
                        ) : (
                          <ArrowUturnLeftIcon className="h-5 w-5" />
                        )}
                        {processing ? 'Processing Return...' : `Process Return (${Object.values(checkedItems).filter(Boolean).length} items) & Update Stock`}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Detail Modal */}
        {showDetailModal && selectedReturn && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowDetailModal(false)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">Return Details: {selectedReturn.return_number}</h3>
                  <p className="text-sm text-gray-500">Challan: {selectedReturn.challan_number} | Shop: {selectedReturn.shop_name}</p>
                </div>
                <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <XCircleIcon className="h-5 w-5 text-gray-500" />
                </button>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <p className="text-sm text-gray-500">Return Date</p>
                    <p className="font-medium">{formatDate(selectedReturn.return_date)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Reason</p>
                    <p className="font-medium capitalize">{selectedReturn.reason?.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Items</p>
                    <p className="font-medium">{selectedReturn.total_items}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Value</p>
                    <p className="font-bold text-red-600">{formatCurrency(selectedReturn.total_return_amount)}</p>
                  </div>
                </div>

                <h4 className="font-semibold text-gray-700 mb-3">Returned Items</h4>
                <div className="space-y-2">
                  {(selectedReturn.items || []).map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-gray-50 px-4 py-3 rounded-lg">
                      <div>
                        <span className="font-medium text-gray-800">{item.product_name}</span>
                        <span className="text-sm text-gray-500 ml-2">({item.product_code})</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-gray-600">Qty: {item.quantity_returned}</span>
                        <span className="text-gray-600">@ {formatCurrency(item.unit_price)}</span>
                        <span className="font-medium text-red-600">{formatCurrency(item.return_amount)}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {selectedReturn.notes && (
                  <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                    <p className="text-sm text-gray-500">Notes</p>
                    <p className="text-gray-700">{selectedReturn.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default StockReturnsPage;
