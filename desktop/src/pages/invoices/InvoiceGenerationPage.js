/**
 * Invoice Generation Page
 * Sprint 7: Invoice & Bill Management
 * Generate invoices from finalized orders
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import invoiceService from '../../services/invoiceService';
import orderService from '../../services/orderService';

const InvoiceGenerationPage = () => {
  const navigate = useNavigate();
  
  // State management
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Sorting state
  const [sortBy, setSortBy] = useState('date_desc'); // Default: Date descending (newest first)
  const [sortedOrders, setSortedOrders] = useState([]);

  // Invoice form state
  const [invoiceData, setInvoiceData] = useState({
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: '',
    delivery_date: '',
    payment_type: 'cash',
    discount_percentage: 0,
    tax_percentage: 0,
    shipping_charges: 0,
    other_charges: 0,
    round_off: 0,
    previous_balance: 0,
    credit_days: 30,
    reference_number: '',
    notes: '',
    terms_conditions: 'Payment due within 30 days. Late payments may incur additional charges.'
  });

  // Load finalized orders on component mount
  useEffect(() => {
    loadFinalizedOrders();
  }, []);
  
  // Sort orders whenever sorting option or orders change
  useEffect(() => {
    sortOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy, orders]);

  const loadFinalizedOrders = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Load both approved and finalized orders for invoicing
      const [approvedResponse, finalizedResponse] = await Promise.all([
        orderService.getAllOrders({ status: 'approved', limit: 100 }),
        orderService.getAllOrders({ status: 'finalized', limit: 100 })
      ]);
      
      let allOrders = [];
      
      if (approvedResponse.success && approvedResponse.data) {
        allOrders = [...allOrders, ...approvedResponse.data];
      }
      
      if (finalizedResponse.success && finalizedResponse.data) {
        allOrders = [...allOrders, ...finalizedResponse.data];
      }
      
      // Filter out orders that already have invoices
      const ordersWithoutInvoice = allOrders.filter(order => !order.invoice_generated);
      
      setOrders(ordersWithoutInvoice);
      
      if (ordersWithoutInvoice.length === 0) {
        setError('No approved or finalized orders available for invoicing. Please approve some orders first.');
      }
    } catch (err) {
      console.error('Error loading orders:', err);
      setError('Failed to load orders. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Comprehensive sorting function
  const sortOrders = () => {
    if (!orders || orders.length === 0) {
      setSortedOrders([]);
      return;
    }

    const ordersCopy = [...orders];

    switch (sortBy) {
      case 'date_desc':
        // Newest first (Default)
        ordersCopy.sort((a, b) => {
          const dateA = new Date(a.created_at || a.order_date);
          const dateB = new Date(b.created_at || b.order_date);
          return dateB - dateA; // Descending
        });
        break;

      case 'date_asc':
        // Oldest first
        ordersCopy.sort((a, b) => {
          const dateA = new Date(a.created_at || a.order_date);
          const dateB = new Date(b.created_at || b.order_date);
          return dateA - dateB; // Ascending
        });
        break;

      case 'size_desc':
        // Largest order first (by total amount)
        ordersCopy.sort((a, b) => {
          const amountA = parseFloat(a.net_amount || a.total_amount || 0);
          const amountB = parseFloat(b.net_amount || b.total_amount || 0);
          return amountB - amountA; // Descending
        });
        break;

      case 'size_asc':
        // Smallest order first (by total amount)
        ordersCopy.sort((a, b) => {
          const amountA = parseFloat(a.net_amount || a.total_amount || 0);
          const amountB = parseFloat(b.net_amount || b.total_amount || 0);
          return amountA - amountB; // Ascending
        });
        break;

      case 'items_desc':
        // Most items first
        ordersCopy.sort((a, b) => {
          const itemsA = parseInt(a.items_count || 0);
          const itemsB = parseInt(b.items_count || 0);
          return itemsB - itemsA; // Descending
        });
        break;

      case 'items_asc':
        // Least items first
        ordersCopy.sort((a, b) => {
          const itemsA = parseInt(a.items_count || 0);
          const itemsB = parseInt(b.items_count || 0);
          return itemsA - itemsB; // Ascending
        });
        break;

      case 'salesman':
        // Group by salesman, then by date
        ordersCopy.sort((a, b) => {
          const salesmanCompare = (a.salesman_name || '').localeCompare(b.salesman_name || '');
          if (salesmanCompare !== 0) return salesmanCompare;
          // Within same salesman, sort by date (newest first)
          return new Date(b.created_at) - new Date(a.created_at);
        });
        break;

      case 'shop':
        // Group by shop, then by date
        ordersCopy.sort((a, b) => {
          const shopCompare = (a.shop_name || '').localeCompare(b.shop_name || '');
          if (shopCompare !== 0) return shopCompare;
          // Within same shop, sort by date (newest first)
          return new Date(b.created_at) - new Date(a.created_at);
        });
        break;

      default:
        // Default: Date descending
        ordersCopy.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    setSortedOrders(ordersCopy);
  };

  const handleOrderSelect = async (e) => {
    const orderId = e.target.value;
    if (!orderId) {
      setSelectedOrder(null);
      return;
    }

    try {
      // Fetch FULL order details with items when order is selected
      console.log('🔍 Fetching full order details for order:', orderId);
      const response = await orderService.getOrderById(orderId);
      
      if (response.success && response.data) {
        const fullOrder = response.data;
        console.log('✅ Full order loaded:');
        console.log('   Order Number:', fullOrder.order_number);
        console.log('   Items Count:', fullOrder.items?.length || 0);
        console.log('   Total Amount:', fullOrder.total_amount);
        console.log('   Discount:', fullOrder.discount);
        console.log('   Net Amount:', fullOrder.net_amount);
        
        setSelectedOrder(fullOrder);
        
        // Calculate discount percentage from order's actual discount
        const calculatedDiscountPercentage = fullOrder.total_amount > 0 
          ? ((parseFloat(fullOrder.discount) || 0) / parseFloat(fullOrder.total_amount) * 100).toFixed(2)
          : 0;
        
        console.log('   Calculated Discount %:', calculatedDiscountPercentage);
        
        // Auto-populate invoice data from order
        const dueDate = new Date();
        const deliveryDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30); // 30 days from today
        deliveryDate.setDate(deliveryDate.getDate() + 2); // 2 days from today
        
        setInvoiceData({
          ...invoiceData,
          due_date: dueDate.toISOString().split('T')[0],
          delivery_date: deliveryDate.toISOString().split('T')[0],
          discount_percentage: calculatedDiscountPercentage,
          credit_days: 30,
          notes: `Invoice for Order #${fullOrder.order_number || fullOrder.id}`
        });
      }
    } catch (error) {
      console.error('❌ Error fetching order details:', error);
      setError('Failed to load order details. Please try again.');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setInvoiceData({
      ...invoiceData,
      [name]: value
    });
  };

  // Calculate totals based on order data
  const calculateTotals = () => {
    if (!selectedOrder) {
      return {
        subtotal: 0,
        discount_amount: 0,
        tax_amount: 0,
        shipping_charges: 0,
        other_charges: 0,
        round_off: 0,
        previous_balance: 0,
        net_amount: 0,
        total_payable: 0
      };
    }

    // If we have items loaded, calculate from actual items
    if (selectedOrder.items && selectedOrder.items.length > 0) {
      const items = selectedOrder.items;
      const subtotal = items.reduce((sum, item) => {
        return sum + (parseFloat(item.quantity) * parseFloat(item.unit_price));
      }, 0);

      const discount_percentage = parseFloat(invoiceData.discount_percentage) || 0;
      const tax_percentage = parseFloat(invoiceData.tax_percentage) || 0;
      const shipping_charges = parseFloat(invoiceData.shipping_charges) || 0;
      const other_charges = parseFloat(invoiceData.other_charges) || 0;
      const round_off = parseFloat(invoiceData.round_off) || 0;
      const previous_balance = parseFloat(invoiceData.previous_balance) || 0;

      const discount_amount = (subtotal * discount_percentage) / 100;
      const after_discount = subtotal - discount_amount;
      const tax_amount = (after_discount * tax_percentage) / 100;
      const net_amount = after_discount + tax_amount + shipping_charges + other_charges + round_off;
      const total_payable = net_amount + previous_balance;

      return {
        subtotal,
        discount_amount,
        tax_amount,
        shipping_charges,
        other_charges,
        round_off,
        previous_balance,
        net_amount,
        total_payable
      };
    }
    
    // Fallback: use order's total_amount if items not loaded yet
    const subtotal = parseFloat(selectedOrder.total_amount) || 0;
    const orderDiscount = parseFloat(selectedOrder.discount) || 0;
    
    const additional_discount_percentage = parseFloat(invoiceData.discount_percentage) || 0;
    const additional_discount_amount = (subtotal * additional_discount_percentage) / 100;
    
    const total_discount = orderDiscount + additional_discount_amount;
    const after_discount = subtotal - total_discount;

    const tax_percentage = parseFloat(invoiceData.tax_percentage) || 0;
    const tax_amount = (after_discount * tax_percentage) / 100;
    
    const shipping_charges = parseFloat(invoiceData.shipping_charges) || 0;
    const other_charges = parseFloat(invoiceData.other_charges) || 0;
    const round_off = parseFloat(invoiceData.round_off) || 0;
    const previous_balance = parseFloat(invoiceData.previous_balance) || 0;
    
    const net_amount = after_discount + tax_amount + shipping_charges + other_charges + round_off;
    const total_payable = net_amount + previous_balance;

    return {
      subtotal,
      discount_amount: total_discount,
      tax_amount,
      shipping_charges,
      other_charges,
      round_off,
      previous_balance,
      net_amount,
      total_payable
    };
  };

  const totals = calculateTotals();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedOrder) {
      setError('Please select an order first.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      setSuccess('');

      // Prepare invoice data
      // NOTE: We only send order_id - backend will fetch complete order_details with real prices
      const invoicePayload = {
        order_id: selectedOrder.id,
        shop_id: selectedOrder.shop_id,
        shop_name: selectedOrder.shop_name,
        salesman_id: selectedOrder.salesman_id,
        salesman_name: selectedOrder.salesman_name,
        invoice_date: invoiceData.invoice_date,
        due_date: invoiceData.due_date,
        delivery_date: invoiceData.delivery_date,
        payment_type: invoiceData.payment_type,
        discount_percentage: parseFloat(invoiceData.discount_percentage) || 0,
        tax_percentage: parseFloat(invoiceData.tax_percentage) || 0,
        shipping_charges: parseFloat(invoiceData.shipping_charges) || 0,
        other_charges: parseFloat(invoiceData.other_charges) || 0,
        round_off: parseFloat(invoiceData.round_off) || 0,
        previous_balance: parseFloat(invoiceData.previous_balance) || 0,
        credit_days: parseInt(invoiceData.credit_days) || 30,
        reference_number: invoiceData.reference_number,
        notes: invoiceData.notes,
        terms_conditions: invoiceData.terms_conditions
        // NO ITEMS - backend fetches real order_details from database
      };

      console.log('Submitting invoice with order_id:', invoicePayload.order_id);
      console.log('Backend will fetch real order items from database');

      const response = await invoiceService.createInvoice(invoicePayload);

      if (response.success) {
        setSuccess(`Invoice ${response.data.invoice_number} generated successfully!`);
        
        // Reset form
        setSelectedOrder(null);
        setInvoiceData({
          invoice_date: new Date().toISOString().split('T')[0],
          due_date: '',
          payment_type: 'cash',
          discount_percentage: 0,
          tax_percentage: 0,
          notes: '',
          terms_conditions: 'Payment due within 30 days. Late payments may incur additional charges.'
        });

        // Reload orders (remove the invoiced order)
        loadFinalizedOrders();

        // Navigate to invoice listing after 2 seconds
        setTimeout(() => {
          navigate('/invoices');
        }, 2000);
      }
    } catch (err) {
      console.error('Error generating invoice:', err);
      setError(err.response?.data?.message || 'Failed to generate invoice. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Generate Invoice</h1>
          <p className="text-gray-600 mt-1">Create invoices from approved or finalized orders</p>
        </div>
        <button
          onClick={() => navigate('/dashboard')}
          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors flex items-center"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Dashboard
        </button>
      </div>

      {/* Alert Messages */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 text-red-700">
          <p className="font-medium">Error</p>
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border-l-4 border-green-500 text-green-700">
          <p className="font-medium">Success</p>
          <p>{success}</p>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Order Selection */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-800">📋 Select Order for Invoice</h2>
              
              {/* Sorting Controls */}
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-700">Sort by:</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                >
                  <optgroup label="📅 Date & Time">
                    <option value="date_desc">📅 Newest First (Default)</option>
                    <option value="date_asc">📅 Oldest First</option>
                  </optgroup>
                  
                  <optgroup label="💰 Order Size">
                    <option value="size_desc">💰 Largest Amount First</option>
                    <option value="size_asc">💰 Smallest Amount First</option>
                  </optgroup>
                  
                  <optgroup label="📦 Items Count">
                    <option value="items_desc">📦 Most Items First</option>
                    <option value="items_asc">📦 Least Items First</option>
                  </optgroup>
                  
                  <optgroup label="👥 Grouping">
                    <option value="salesman">👤 Group by Salesman</option>
                    <option value="shop">🏪 Group by Shop</option>
                  </optgroup>
                </select>
                
                <div className="text-xs text-gray-500 bg-blue-50 px-3 py-1 rounded-full">
                  {sortedOrders.length} order{sortedOrders.length !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Choose an Approved/Finalized Order *
              </label>
              
              {/* User-Friendly Order Cards */}
              <div className="space-y-3 max-h-96 overflow-y-auto border border-gray-200 rounded-lg p-3 bg-gray-50">
                {sortedOrders.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No orders available for invoicing.
                  </p>
                ) : (
                  sortedOrders.map((order) => {
                    const discountPercent = order.total_amount > 0 
                      ? ((parseFloat(order.discount) || 0) / parseFloat(order.total_amount) * 100).toFixed(1)
                      : 0;
                    
                    return (
                      <div
                        key={order.id}
                        onClick={() => handleOrderSelect({ target: { value: order.id } })}
                        className={`cursor-pointer p-4 rounded-lg border-2 transition-all hover:shadow-md ${
                          selectedOrder?.id === order.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 bg-white hover:border-blue-300'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-gray-900">
                                {order.order_number || `#${order.id}`}
                              </span>
                              <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                                order.status === 'approved' 
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {order.status.toUpperCase()}
                              </span>
                            </div>
                            
                            <div className="text-sm text-gray-600 space-y-1">
                              <div className="flex items-center gap-1">
                                <span className="font-medium">👤 Salesman:</span>
                                <span>{order.salesman_name || 'N/A'}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="font-medium">🏪 Shop:</span>
                                <span>{order.shop_name || 'N/A'}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="font-medium">📅 Date:</span>
                                <span>{new Date(order.created_at).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <div className="text-lg font-bold text-gray-900">
                              Rs. {parseFloat(order.net_amount || order.total_amount).toFixed(2)}
                            </div>
                            {discountPercent > 0 && (
                              <div className="text-xs text-green-600 font-medium mt-1">
                                💰 {discountPercent}% Discount Applied
                              </div>
                            )}
                            {order.items_count && (
                              <div className="text-xs text-gray-500 mt-1">
                                {order.items_count} items
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {selectedOrder?.id === order.id && (
                          <div className="mt-2 pt-2 border-t border-blue-200">
                            <span className="text-xs font-semibold text-blue-600">✓ Selected for Invoice</span>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
              
              {/* Sorting Info */}
              <div className="mt-3 flex items-start gap-2 text-xs text-gray-600 bg-gradient-to-r from-blue-50 to-purple-50 p-3 rounded-lg border border-blue-100">
                <svg className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="font-medium text-gray-700 mb-1">💡 Sorting Tips:</p>
                  <ul className="space-y-1 text-gray-600">
                    <li>• <strong>Default:</strong> Orders sorted by date (newest first) for quick access to recent orders</li>
                    <li>• <strong>By Size:</strong> Prioritize large or small orders based on amount</li>
                    <li>• <strong>By Items:</strong> Focus on orders with many or few items</li>
                    <li>• <strong>Grouping:</strong> See all orders from same salesman or shop together</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Invoice Details */}
          {selectedOrder && (
            <>
              {/* Order Information */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">📋 Selected Order Information</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">Order Number</p>
                    <p className="font-bold text-gray-800 text-lg">{selectedOrder.order_number || `#${selectedOrder.id}`}</p>
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">Order Date</p>
                    <p className="font-medium text-gray-800">{invoiceService.formatDate(selectedOrder.created_at)}</p>
                  </div>
                  
                  <div className="bg-purple-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">🏪 Shop</p>
                    <p className="font-medium text-gray-800">{selectedOrder.shop_name}</p>
                    {selectedOrder.shop_address && (
                      <p className="text-xs text-gray-500 mt-1">{selectedOrder.shop_address}</p>
                    )}
                  </div>
                  
                  <div className="bg-green-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">👤 Salesman</p>
                    <p className="font-medium text-gray-800">{selectedOrder.salesman_name}</p>
                    {selectedOrder.salesman_code && (
                      <p className="text-xs text-gray-500 mt-1">Code: {selectedOrder.salesman_code}</p>
                    )}
                  </div>
                  
                  <div className="bg-yellow-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">💰 Order Total</p>
                    <p className="font-bold text-gray-800 text-lg">Rs. {parseFloat(selectedOrder.total_amount).toFixed(2)}</p>
                  </div>
                  
                  {selectedOrder.discount > 0 && (
                    <div className="bg-green-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-600 mb-1">🎯 Discount Applied</p>
                      <p className="font-bold text-green-600 text-lg">
                        Rs. {parseFloat(selectedOrder.discount).toFixed(2)}\n                        ({((parseFloat(selectedOrder.discount) / parseFloat(selectedOrder.total_amount)) * 100).toFixed(1)}%)
                      </p>
                    </div>
                  )}
                  
                  <div className="bg-indigo-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">💵 Net Amount</p>
                    <p className="font-bold text-indigo-600 text-lg">Rs. {parseFloat(selectedOrder.net_amount || selectedOrder.total_amount).toFixed(2)}</p>
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">📦 Items</p>
                    <p className="font-medium text-gray-800">{selectedOrder.items?.length || 0} products</p>
                  </div>
                </div>
              </div>

              {/* Invoice Settings */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Invoice Details</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Invoice Date *
                    </label>
                    <input
                      type="date"
                      name="invoice_date"
                      value={invoiceData.invoice_date}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Due Date *
                    </label>
                    <input
                      type="date"
                      name="due_date"
                      value={invoiceData.due_date}
                      onChange={handleInputChange}
                      min={invoiceData.invoice_date}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Type *
                    </label>
                    <select
                      name="payment_type"
                      value={invoiceData.payment_type}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="cash">Cash</option>
                      <option value="credit">Credit</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="cheque">Cheque</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Discount (%)
                    </label>
                    <input
                      type="number"
                      name="discount_percentage"
                      value={invoiceData.discount_percentage}
                      onChange={handleInputChange}
                      min="0"
                      max="100"
                      step="0.01"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tax (%)
                    </label>
                    <input
                      type="number"
                      name="tax_percentage"
                      value={invoiceData.tax_percentage}
                      onChange={handleInputChange}
                      min="0"
                      max="100"
                      step="0.01"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Delivery Date
                    </label>
                    <input
                      type="date"
                      name="delivery_date"
                      value={invoiceData.delivery_date}
                      onChange={handleInputChange}
                      min={invoiceData.invoice_date}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Credit Days
                    </label>
                    <input
                      type="number"
                      name="credit_days"
                      value={invoiceData.credit_days}
                      onChange={handleInputChange}
                      min="1"
                      step="1"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reference Number
                    </label>
                    <input
                      type="text"
                      name="reference_number"
                      value={invoiceData.reference_number}
                      onChange={handleInputChange}
                      placeholder="PO-12345, REF-001, etc."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Shipping Charges (Rs.)
                    </label>
                    <input
                      type="number"
                      name="shipping_charges"
                      value={invoiceData.shipping_charges}
                      onChange={handleInputChange}
                      min="0"
                      step="0.01"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Other Charges (Rs.)
                    </label>
                    <input
                      type="number"
                      name="other_charges"
                      value={invoiceData.other_charges}
                      onChange={handleInputChange}
                      min="0"
                      step="0.01"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Round Off (Rs.)
                    </label>
                    <input
                      type="number"
                      name="round_off"
                      value={invoiceData.round_off}
                      onChange={handleInputChange}
                      step="0.01"
                      placeholder="Can be positive or negative"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Previous Balance (Rs.)
                    </label>
                    <input
                      type="number"
                      name="previous_balance"
                      value={invoiceData.previous_balance}
                      onChange={handleInputChange}
                      min="0"
                      step="0.01"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notes
                    </label>
                    <textarea
                      name="notes"
                      value={invoiceData.notes}
                      onChange={handleInputChange}
                      rows="2"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Add any notes for this invoice..."
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Terms & Conditions
                    </label>
                    <textarea
                      name="terms_conditions"
                      value={invoiceData.terms_conditions}
                      onChange={handleInputChange}
                      rows="2"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Payment terms and conditions..."
                    />
                  </div>
                </div>
              </div>

              {/* Product Items */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Order Items</h2>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Product
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Code
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Quantity
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Unit Price
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedOrder.items && selectedOrder.items.map((item, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {item.product_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.product_code}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                            {item.quantity}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                            {invoiceService.formatCurrency(item.unit_price)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                            {invoiceService.formatCurrency(item.quantity * item.unit_price)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Invoice Summary */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Invoice Summary</h2>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-gray-700">
                    <span>Subtotal:</span>
                    <span className="font-medium">{invoiceService.formatCurrency(totals.subtotal)}</span>
                  </div>
                  
                  {totals.discount_amount > 0 && (
                    <div className="flex justify-between items-center text-gray-700">
                      <span>Discount ({invoiceData.discount_percentage}%):</span>
                      <span className="font-medium text-red-600">
                        -{invoiceService.formatCurrency(totals.discount_amount)}
                      </span>
                    </div>
                  )}
                  
                  {totals.tax_amount > 0 && (
                    <div className="flex justify-between items-center text-gray-700">
                      <span>Tax ({invoiceData.tax_percentage}%):</span>
                      <span className="font-medium">
                        +{invoiceService.formatCurrency(totals.tax_amount)}
                      </span>
                    </div>
                  )}
                  
                  {totals.shipping_charges > 0 && (
                    <div className="flex justify-between items-center text-gray-700">
                      <span>Shipping Charges:</span>
                      <span className="font-medium">
                        +{invoiceService.formatCurrency(totals.shipping_charges)}
                      </span>
                    </div>
                  )}
                  
                  {totals.other_charges > 0 && (
                    <div className="flex justify-between items-center text-gray-700">
                      <span>Other Charges:</span>
                      <span className="font-medium">
                        +{invoiceService.formatCurrency(totals.other_charges)}
                      </span>
                    </div>
                  )}
                  
                  {totals.round_off !== 0 && (
                    <div className="flex justify-between items-center text-gray-700">
                      <span>Round Off:</span>
                      <span className="font-medium" style={{ color: totals.round_off >= 0 ? 'inherit' : '#dc2626' }}>
                        {totals.round_off >= 0 ? '+' : ''}{invoiceService.formatCurrency(totals.round_off)}
                      </span>
                    </div>
                  )}
                  
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between items-center text-gray-900">
                      <span className="font-semibold">Net Amount:</span>
                      <span className="font-semibold">{invoiceService.formatCurrency(totals.net_amount)}</span>
                    </div>
                  </div>
                  
                  {totals.previous_balance > 0 && (
                    <div className="flex justify-between items-center text-gray-700">
                      <span>Previous Balance:</span>
                      <span className="font-medium text-orange-600">
                        +{invoiceService.formatCurrency(totals.previous_balance)}
                      </span>
                    </div>
                  )}
                  
                  <div className="border-t-2 border-blue-500 pt-2 mt-2 bg-blue-50 px-4 py-3 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-xl font-bold text-blue-900">Total Payable:</span>
                      <span className="text-2xl font-bold text-blue-900">{invoiceService.formatCurrency(totals.total_payable)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => navigate('/invoices')}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  disabled={submitting}
                >
                  Cancel
                </button>
                
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                  disabled={submitting}
                >
                  {submitting ? 'Generating...' : 'Generate Invoice'}
                </button>
              </div>
            </>
          )}
        </form>
      )}
    </div>
  );
};

export default InvoiceGenerationPage;
