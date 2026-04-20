/**
 * Payment Recording Page
 * Shop Ledger Management System
 * Record payments with automatic FIFO allocation
 * Company: Ummahtechinnovations.com
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import ledgerService from '../../services/ledgerService';
import shopService from '../../services/shopService';

const PaymentRecordPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // State management
  const [shops, setShops] = useState([]);
  const [selectedShop, setSelectedShop] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Payment form data
  const [paymentData, setPaymentData] = useState({
    shop_id: '',
    amount: '',
    payment_method: 'cash',
    payment_date: new Date().toISOString().split('T')[0],
    reference_number: '',
    notes: ''
  });

  // Payment result
  const [paymentResult, setPaymentResult] = useState(null);

  // Load data on mount
  useEffect(() => {
    loadShops();
    
    // If shop was passed from balance summary, pre-select it
    if (location.state?.shop) {
      const shop = location.state.shop;
      setSelectedShop(shop);
      setPaymentData(prev => ({ ...prev, shop_id: shop.id }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadShops = async () => {
    try {
      setLoading(true);
      const response = await shopService.getAllShops({ limit: 1000, is_active: 1 });
      if (response.success) {
        setShops(response.data || []);
      }
    } catch (err) {
      console.error('Error loading shops:', err);
      setError('Failed to load shops. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleShopChange = async (e) => {
    const shopId = e.target.value;
    setPaymentData({ ...paymentData, shop_id: shopId });
    
    if (shopId) {
      // Load shop details
      try {
        const response = await shopService.getShopById(shopId);
        if (response.success) {
          setSelectedShop(response.data);
        }
      } catch (err) {
        console.error('Error loading shop details:', err);
      }
    } else {
      setSelectedShop(null);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setPaymentData({
      ...paymentData,
      [name]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!paymentData.shop_id) {
      setError('Please select a shop');
      return;
    }
    
    if (!paymentData.amount || parseFloat(paymentData.amount) <= 0) {
      setError('Please enter a valid payment amount');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      
      const payload = {
        shop_id: parseInt(paymentData.shop_id),
        amount: parseFloat(paymentData.amount),
        payment_method: paymentData.payment_method,
        payment_date: paymentData.payment_date,
        reference_number: paymentData.reference_number,
        notes: paymentData.notes
      };

      const response = await ledgerService.recordPayment(payload);
      
      if (response.success) {
        setSuccess('Payment recorded successfully!');
        setPaymentResult(response.data);
        
        // Reset form
        setPaymentData({
          shop_id: '',
          amount: '',
          payment_method: 'cash',
          payment_date: new Date().toISOString().split('T')[0],
          reference_number: '',
          notes: ''
        });
        setSelectedShop(null);
      }
    } catch (err) {
      console.error('Error recording payment:', err);
      setError(err.response?.data?.message || 'Failed to record payment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleNewPayment = () => {
    setPaymentResult(null);
    setSuccess('');
  };

  const handleViewLedger = () => {
    if (paymentResult?.payment?.shop_id) {
      navigate(`/ledger/shop/${paymentResult.payment.shop_id}`);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <button
            onClick={() => navigate('/ledger')}
            className="text-blue-600 hover:text-blue-800 mb-2 flex items-center"
          >
            ← Back to Ledger
          </button>
          <h1 className="text-3xl font-bold text-gray-800">Record Payment</h1>
          <p className="text-gray-600 mt-1">Record shop payment with automatic invoice allocation</p>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
          <button onClick={() => setError('')} className="float-right">×</button>
        </div>
      )}
      {success && !paymentResult && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {success}
          <button onClick={() => setSuccess('')} className="float-right">×</button>
        </div>
      )}

      {/* Payment Result */}
      {paymentResult ? (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="text-center mb-6">
            <div className="text-green-600 text-6xl mb-4">✓</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Payment Recorded Successfully!</h2>
            <p className="text-gray-600">Receipt Number: <span className="font-semibold">{paymentResult.payment.receipt_number}</span></p>
          </div>

          {/* Payment Details */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold mb-3">Payment Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-600">Amount Paid</div>
                <div className="text-xl font-bold text-green-600">
                  {ledgerService.formatCurrency(paymentResult.payment.amount)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Payment Method</div>
                <div className="text-xl font-bold text-gray-800">
                  {ledgerService.getPaymentMethodLabel(paymentResult.payment.payment_method)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Payment Date</div>
                <div className="text-lg font-semibold text-gray-800">
                  {ledgerService.formatDate(paymentResult.payment.payment_date)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">New Shop Balance</div>
                <div className="text-xl font-bold text-red-600">
                  {ledgerService.formatCurrency(paymentResult.shop_balance)}
                </div>
              </div>
            </div>
          </div>

          {/* Payment Allocations */}
          {paymentResult.allocations && paymentResult.allocations.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3">Payment Allocation (FIFO)</h3>
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Allocated</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {paymentResult.allocations.map((alloc, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {alloc.invoice_number}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-semibold text-green-600">
                          {ledgerService.formatCurrency(alloc.allocated_amount)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 text-xs font-semibold rounded ${
                            alloc.status === 'paid' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {alloc.status === 'paid' ? '✓ Paid' : '⏳ Partial'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Advance Payment */}
          {paymentResult.advance_amount > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <div className="text-blue-600 text-2xl mr-3">ℹ️</div>
                <div>
                  <div className="font-semibold text-blue-900">Advance Payment</div>
                  <div className="text-sm text-blue-700">
                    {ledgerService.formatCurrency(paymentResult.advance_amount)} recorded as advance (no pending invoices)
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-center gap-4">
            <button
              onClick={handleNewPayment}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              Record Another Payment
            </button>
            <button
              onClick={handleViewLedger}
              className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition"
            >
              View Shop Ledger
            </button>
            <button
              onClick={() => navigate('/ledger')}
              className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition"
            >
              Back to Ledger
            </button>
          </div>
        </div>
      ) : (
        /* Payment Form */
        <div className="bg-white rounded-lg shadow-lg p-6">
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Shop Selection */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Shop <span className="text-red-500">*</span>
                </label>
                <select
                  name="shop_id"
                  value={paymentData.shop_id}
                  onChange={handleShopChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  disabled={loading}
                >
                  <option value="">-- Select Shop --</option>
                  {shops.map(shop => (
                    <option key={shop.id} value={shop.id}>
                      {shop.shop_code} - {shop.shop_name} ({shop.owner_name})
                    </option>
                  ))}
                </select>
              </div>

              {/* Shop Balance Info */}
              {selectedShop && (
                <div className="md:col-span-2 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <div className="text-sm text-blue-600 mb-1">Current Balance</div>
                      <div className="text-lg font-bold text-red-600">
                        {ledgerService.formatCurrency(selectedShop.current_balance)}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-blue-600 mb-1">Credit Limit</div>
                      <div className="text-lg font-bold text-gray-800">
                        {ledgerService.formatCurrency(selectedShop.credit_limit)}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-blue-600 mb-1">Available Credit</div>
                      <div className="text-lg font-bold text-green-600">
                        {ledgerService.formatCurrency(selectedShop.credit_limit - selectedShop.current_balance)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Payment Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Amount <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="amount"
                  step="0.01"
                  min="0.01"
                  value={paymentData.amount}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.00"
                  required
                />
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Method <span className="text-red-500">*</span>
                </label>
                <select
                  name="payment_method"
                  value={paymentData.payment_method}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="cash">Cash</option>
                  <option value="bank">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                  <option value="online">Online Payment</option>
                </select>
              </div>

              {/* Payment Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="payment_date"
                  value={paymentData.payment_date}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Reference Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reference Number
                </label>
                <input
                  type="text"
                  name="reference_number"
                  value={paymentData.reference_number}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Cheque #123, Transaction ID"
                />
              </div>

              {/* Notes */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  name="notes"
                  value={paymentData.notes}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="3"
                  placeholder="Additional notes about this payment..."
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="mt-6 flex justify-end gap-4">
              <button
                type="button"
                onClick={() => navigate('/ledger')}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                disabled={submitting}
              >
                {submitting ? (
                  <span className="flex items-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Recording...
                  </span>
                ) : (
                  '💰 Record Payment'
                )}
              </button>
            </div>
          </form>

          {/* Info Box */}
          <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start">
              <div className="text-yellow-600 text-xl mr-3">ℹ️</div>
              <div className="text-sm text-yellow-800">
                <strong>FIFO Allocation:</strong> Payments will be automatically allocated to the oldest unpaid invoices first. 
                If the payment amount exceeds all outstanding invoices, the remaining amount will be recorded as an advance payment.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentRecordPage;
