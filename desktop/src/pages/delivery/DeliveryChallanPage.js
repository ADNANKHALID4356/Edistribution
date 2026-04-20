// Delivery Challan Generation Page
// Purpose: Generate delivery challans directly from orders (simplified workflow)
// Date: Feb 7, 2026 - Refactored from invoice-based to order-based flow

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Truck, Package, FileText, 
  ArrowLeft, AlertCircle, CheckCircle,
  MapPin, X, ShoppingCart
} from 'lucide-react';
import deliveryService from '../../services/deliveryService';
import warehouseService from '../../services/warehouseService';
import orderService from '../../services/orderService';

const DeliveryChallanPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get source data from navigation state (if coming from order page)
  const sourceData = location.state;
  
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Order selection states
  const [availableOrders, setAvailableOrders] = useState([]);
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [orderDetails, setOrderDetails] = useState(null);
  
  // Form data
  const [formData, setFormData] = useState({
    warehouse_id: '',
    delivery_date: new Date().toISOString().split('T')[0],
    status: 'pending'
  });
  
  // Items from order
  const [items, setItems] = useState([]);

  useEffect(() => {
    fetchWarehouses();
    fetchAvailableOrders();
    
    // If coming from another page with source data
    if (sourceData && sourceData.orderId) {
      setSelectedOrderId(sourceData.orderId);
      loadOrderDetails(sourceData.orderId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch available orders for dropdown
  const fetchAvailableOrders = async () => {
    try {
      setLoadingOrders(true);
      const response = await deliveryService.getAvailableOrdersForDelivery();
      setAvailableOrders(response.data || []);
      console.log('📋 Available orders loaded:', response.data?.length || 0);
    } catch (error) {
      console.error('Error fetching available orders:', error);
      setMessage({ 
        type: 'error', 
        text: 'Failed to load available orders' 
      });
    } finally {
      setLoadingOrders(false);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const response = await warehouseService.getAllWarehouses({ status: 'active' });
      setWarehouses(response.data || []);
      
      // Auto-select warehouse: priority order - default, first warehouse if only one exists
      const defaultWarehouse = response.data?.find(w => w.is_default);
      const firstWarehouse = response.data?.[0];
      
      if (!formData.warehouse_id) {
        if (defaultWarehouse) {
          console.log('✅ Auto-selecting default warehouse:', defaultWarehouse.name);
          setFormData(prev => ({ ...prev, warehouse_id: defaultWarehouse.id }));
        } else if (response.data?.length === 1) {
          console.log('✅ Auto-selecting only warehouse:', firstWarehouse.name);
          setFormData(prev => ({ ...prev, warehouse_id: firstWarehouse.id }));
        }
      }
    } catch (error) {
      console.error('Error fetching warehouses:', error);
      setMessage({ 
        type: 'error', 
        text: 'Failed to load warehouses' 
      });
    }
  };

  const loadOrderDetails = async (orderId) => {
    try {
      setLoading(true);
      setMessage({ type: '', text: '' });
      
      console.log('📦 Loading order details for ID:', orderId);
      const response = await orderService.getOrderById(orderId);
      const order = response.data;
      
      console.log('✅ Order loaded:', {
        id: order.id,
        order_number: order.order_number,
        shop_name: order.shop_name,
        items_count: order.items?.length || 0,
        total_amount: order.total_amount,
        discount: order.discount,
        net_amount: order.net_amount
      });
      
      setOrderDetails(order);
      
      // Map order items to delivery format
      const deliveryItems = (order.items || []).map(item => ({
        product_id: item.product_id,
        product_name: item.product_name,
        product_code: item.product_code,
        quantity: parseFloat(item.quantity) || 0,
        unit: item.unit || 'pcs',
        unit_price: parseFloat(item.unit_price) || 0,
        discount_percentage: parseFloat(item.discount_percentage) || 0,
        discount_amount: parseFloat(item.discount_amount) || 0,
        tax_percentage: parseFloat(item.tax_percentage) || 0,
        tax_amount: parseFloat(item.tax_amount) || 0,
        total_price: parseFloat(item.total_price) || 0
      }));
      
      setItems(deliveryItems);
      
    } catch (error) {
      console.error('❌ Error loading order:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Failed to load order details' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOrderSelection = (e) => {
    const orderId = e.target.value;
    setSelectedOrderId(orderId);
    
    if (orderId) {
      loadOrderDetails(orderId);
    } else {
      setOrderDetails(null);
      setItems([]);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const calculateTotals = () => {
    // Items total_price is already NET after individual item discounts
    // Only need to subtract order-level discount
    const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.total_price) || 0), 0);
    const orderDiscount = parseFloat(orderDetails?.discount) || 0;
    const totalTax = items.reduce((sum, item) => sum + (parseFloat(item.tax_amount) || 0), 0);
    const grandTotal = subtotal - orderDiscount + totalTax;
    
    console.log('💰 Delivery Challan Totals:', {
      subtotal,
      orderDiscount,
      totalTax,
      grandTotal,
      note: 'subtotal is already net after item discounts'
    });
    
    return {
      subtotal: parseFloat(subtotal),
      totalDiscount: parseFloat(orderDiscount),
      totalTax: parseFloat(totalTax),
      grandTotal: parseFloat(grandTotal)
    };
  };

  const handleGenerateChallan = async () => {
    try {
      setLoading(true);
      setMessage({ type: '', text: '' });
      
      // Validation
      if (!selectedOrderId) {
        setMessage({ type: 'error', text: 'Please select an order' });
        return;
      }
      
      if (!formData.warehouse_id) {
        setMessage({ type: 'error', text: 'Please select a warehouse' });
        return;
      }
      
      console.log('🚀 Creating delivery challan from order:', selectedOrderId);
      console.log('📦 Delivery data:', formData);
      
      // Create delivery from order using new backend endpoint
      const response = await deliveryService.createDeliveryFromOrder(
        selectedOrderId,
        {
          warehouse_id: formData.warehouse_id,
          delivery_date: formData.delivery_date,
          status: formData.status
        }
      );
      
      console.log('✅ Delivery challan created:', response.data);
      
      setMessage({ 
        type: 'success', 
        text: `Delivery challan ${response.data.challan_number} generated successfully!` 
      });
      
      // Redirect to delivery tracking page after 2 seconds
      setTimeout(() => {
        navigate('/deliveries', { 
          state: { newChallanId: response.data.id } 
        });
      }, 2000);
      
    } catch (error) {
      console.error('❌ Error generating challan:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Failed to generate challan' 
      });
    } finally {
      setLoading(false);
    }
  };

  const clearForm = () => {
    setSelectedOrderId('');
    setOrderDetails(null);
    setItems([]);
    setMessage({ type: '', text: '' });
  };

  const totals = orderDetails ? calculateTotals() : null;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <button
              onClick={() => navigate('/deliveries')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-2"
            >
              <ArrowLeft className="h-5 w-5" />
              Back to Deliveries
            </button>
            <h1 className="text-3xl font-bold text-gray-900">Generate Delivery Challan</h1>
            <p className="text-gray-600 mt-1">Create delivery challan directly from approved orders</p>
          </div>
          <Truck className="h-12 w-12 text-blue-600" />
        </div>
      </div>

      {/* Message Display */}
      {message.text && (
        <div className={`mb-6 p-4 rounded-lg flex items-start gap-3 ${
          message.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-800' 
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          )}
          <div className="flex-1">{message.text}</div>
          <button onClick={() => setMessage({ type: '', text: '' })}>
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Order Selection */}
        <div className="lg:col-span-1 space-y-6">
          {/* Order Selection */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Select Order
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Available Orders
                </label>
                <select
                  value={selectedOrderId}
                  onChange={handleOrderSelection}
                  disabled={loadingOrders}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                >
                  <option value="">-- Select Order --</option>
                  {availableOrders.map((order) => (
                    <option key={order.id} value={order.id}>
                      {order.order_number} - {order.shop_name} (Rs. {parseFloat(order.net_amount || order.total_amount || 0).toFixed(2)})
                    </option>
                  ))}
                </select>
                {loadingOrders && (
                  <p className="text-sm text-gray-500 mt-1">Loading orders...</p>
                )}
                {!loadingOrders && availableOrders.length === 0 && (
                  <p className="text-sm text-amber-600 mt-1">No approved orders available for delivery</p>
                )}
              </div>

              {orderDetails && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-900">Order Selected</span>
                    <button
                      onClick={clearForm}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="text-sm text-blue-800 space-y-1">
                    <div><strong>Order:</strong> {orderDetails.order_number}</div>
                    <div><strong>Shop:</strong> {orderDetails.shop_name}</div>
                    <div><strong>Status:</strong> {orderDetails.status}</div>
                    <div><strong>Items:</strong> {items.length}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Shop Details */}
          {orderDetails && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Shop Details
              </h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Name:</span>
                  <p className="text-gray-900">{orderDetails.shop_name}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Address:</span>
                  <p className="text-gray-900">{orderDetails.shop_address || 'N/A'}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">City:</span>
                  <p className="text-gray-900">{orderDetails.shop_city || 'N/A'}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Contact:</span>
                  <p className="text-gray-900">{orderDetails.shop_phone || 'N/A'}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Route:</span>
                  <p className="text-gray-900">{orderDetails.route_name || 'N/A'}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Salesman:</span>
                  <p className="text-gray-900">{orderDetails.salesman_name || 'N/A'}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Delivery Details & Items */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Delivery Settings */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Delivery Settings
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Warehouse Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Warehouse <span className="text-red-500">*</span>
                </label>
                <select
                  name="warehouse_id"
                  value={formData.warehouse_id}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Select Warehouse --</option>
                  {warehouses.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.name} {warehouse.is_default && '(Default)'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Delivery Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Delivery Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="delivery_date"
                  value={formData.delivery_date}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Order Items */}
          {items.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Package className="h-5 w-5" />
                Order Items ({items.length})
              </h2>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Product
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quantity
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Unit Price
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Discount %
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {items.map((item, index) => (
                      <tr key={index}>
                        <td className="px-4 py-3 text-sm">
                          <div className="font-medium text-gray-900">{item.product_name}</div>
                          <div className="text-gray-500">{item.product_code}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-center text-gray-900">
                          {item.quantity} {item.unit}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-900">
                          Rs. {item.unit_price.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-red-600">
                          {(() => {
                            const discAmt = item.discount_amount || 0;
                            const grossTotal = item.quantity * item.unit_price;
                            const discPct = item.discount_percentage || 
                              (discAmt > 0 && grossTotal > 0 ? (discAmt / grossTotal) * 100 : 0);
                            return discPct > 0 ? (
                              <div>
                                <div className="font-medium">{discPct.toFixed(1)}%</div>
                                <div className="text-xs text-red-400">(-Rs. {discAmt.toFixed(2)})</div>
                              </div>
                            ) : '-';
                          })()}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                          Rs. {item.total_price.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Order Summary */}
              {totals && (
                <div className="mt-6 border-t pt-4">
                  <div className="flex justify-end">
                    <div className="w-64 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Subtotal:</span>
                        <span className="font-medium">Rs. {(totals?.subtotal || 0).toFixed(2)}</span>
                      </div>
                      {totals.totalDiscount > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Discount ({(totals.subtotal > 0 ? (totals.totalDiscount / totals.subtotal * 100) : 0).toFixed(1)}%):</span>
                          <span className="font-medium text-red-600">- Rs. {(totals?.totalDiscount || 0).toFixed(2)}</span>
                        </div>
                      )}
                      {totals.totalTax > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Tax:</span>
                          <span className="font-medium text-green-600">+ Rs. {(totals?.totalTax || 0).toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-lg font-bold border-t pt-2">
                        <span>Grand Total:</span>
                        <span className="text-blue-600">Rs. {(totals?.grandTotal || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-4">
            <button
              onClick={() => navigate('/deliveries')}
              className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            
            <button
              onClick={handleGenerateChallan}
              disabled={loading || !selectedOrderId || items.length === 0}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Generating...
                </>
              ) : (
                <>
                  <FileText className="h-5 w-5" />
                  Generate Challan
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeliveryChallanPage;
