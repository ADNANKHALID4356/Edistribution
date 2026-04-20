/**
 * Payment Record Modal
 * Sprint 7: Invoice & Bill Management - Professional Edition
 * Record payment for an invoice with automatic ledger update
 * Company: Ummahtechinnovations.com
 */

import React, { useState } from 'react';
import invoiceService from '../../services/invoiceService';

const PaymentRecordModal = ({ invoice, onClose, onSuccess }) => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successData, setSuccessData] = useState(null); // Store success response for receipt display

  const [paymentData, setPaymentData] = useState({
    payment_amount: invoice.balance_amount || 0,
    payment_method: 'cash',
    payment_date: new Date().toISOString().split('T')[0],
    reference_number: '',
    bank_name: '',
    cheque_number: '',
    cheque_date: '',
    notes: '',
    received_by: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setPaymentData({
      ...paymentData,
      [name]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    const amount = parseFloat(paymentData.payment_amount);
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid payment amount.');
      return;
    }

    if (amount > invoice.balance_amount) {
      setError(`Payment amount cannot exceed balance amount of ${invoiceService.formatCurrency(invoice.balance_amount)}`);
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const payload = {
        payment_amount: amount,
        payment_method: paymentData.payment_method,
        payment_date: paymentData.payment_date,
        reference_number: paymentData.reference_number || null,
        bank_name: paymentData.bank_name || null,
        cheque_number: paymentData.cheque_number || null,
        cheque_date: paymentData.cheque_date || null,
        notes: paymentData.notes || null,
        received_by: paymentData.received_by || null
      };

      console.log('📝 Recording payment:', payload);

      const response = await invoiceService.recordPayment(invoice.id, payload);

      if (response.success) {
        console.log('✅ Payment recorded successfully:', response.data);
        // Store the response data for success display
        setSuccessData({
          invoice: response.data,
          receipt: response.data.payment_receipt,
          payment_amount: amount,
          payment_method: paymentData.payment_method
        });
      }
    } catch (err) {
      console.error('❌ Error recording payment:', err);
      setError(err.response?.data?.message || 'Failed to record payment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (successData && onSuccess) {
      onSuccess();
    } else {
      onClose();
    }
  };

  const showBankFields = paymentData.payment_method === 'bank_transfer';
  const showChequeFields = paymentData.payment_method === 'cheque';

  // Payment Method Labels
  const methodLabels = {
    'cash': 'Cash Payment',
    'credit': 'Credit',
    'bank_transfer': 'Bank Transfer',
    'cheque': 'Cheque'
  };

  // SUCCESS VIEW - Shows receipt after payment is recorded
  if (successData) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
        <div className="bg-white rounded-lg shadow-xl max-w-lg w-full my-8 max-h-[90vh] overflow-y-auto">
          {/* Success Header */}
          <div className="bg-green-500 text-white p-6 rounded-t-lg text-center">
            <div className="flex justify-center mb-3">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
                <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold">Payment Recorded!</h2>
            <p className="text-green-100 mt-1">The payment has been successfully recorded</p>
          </div>

          {/* Receipt Details */}
          <div className="p-6">
            {/* Receipt Number */}
            <div className="text-center mb-6 pb-6 border-b border-dashed border-gray-300">
              <p className="text-sm text-gray-500 uppercase tracking-wide">Receipt Number</p>
              <p className="text-2xl font-mono font-bold text-gray-800 mt-1">
                {successData.receipt?.receipt_number || 'RCP-XXXXXXXX-XXXX'}
              </p>
            </div>

            {/* Payment Details */}
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">Invoice Number</span>
                <span className="font-semibold text-gray-800">{invoice.invoice_number}</span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">Shop Name</span>
                <span className="font-semibold text-gray-800">{invoice.shop_name}</span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">Payment Amount</span>
                <span className="font-bold text-green-600 text-lg">
                  {invoiceService.formatCurrency(successData.payment_amount)}
                </span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">Payment Method</span>
                <span className="font-semibold text-gray-800">
                  {methodLabels[successData.payment_method] || successData.payment_method}
                </span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">Payment Date</span>
                <span className="font-semibold text-gray-800">{paymentData.payment_date}</span>
              </div>

              {/* Status Badge */}
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">Invoice Status</span>
                <span className={`px-3 py-1 text-sm font-semibold rounded-full ${
                  successData.receipt?.payment_status === 'paid' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {successData.receipt?.payment_status === 'paid' ? '✓ PAID IN FULL' : '⚡ PARTIAL PAYMENT'}
                </span>
              </div>

              {/* Balance Information */}
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Previous Balance</span>
                  <span className="font-semibold text-red-600">
                    {invoiceService.formatCurrency(successData.receipt?.previous_balance || invoice.balance_amount)}
                  </span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Payment Made</span>
                  <span className="font-semibold text-green-600">
                    - {invoiceService.formatCurrency(successData.payment_amount)}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                  <span className="text-gray-800 font-medium">New Balance</span>
                  <span className={`text-xl font-bold ${
                    (successData.receipt?.new_balance || 0) <= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {invoiceService.formatCurrency(successData.receipt?.new_balance || 0)}
                  </span>
                </div>
              </div>

              {/* Ledger Update Notice */}
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-blue-500 mt-0.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-sm text-blue-700">
                    <p className="font-medium">Ledger Updated</p>
                    <p className="text-blue-600">Shop ledger has been automatically updated with this payment.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Close Button */}
            <div className="mt-6 flex justify-center">
              <button
                onClick={handleClose}
                className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // PAYMENT FORM VIEW
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gradient-to-r from-green-500 to-green-600">
          <div>
            <h2 className="text-2xl font-bold text-white">Record Payment</h2>
            <p className="text-green-100 text-sm mt-1">Payment will be recorded in shop ledger automatically</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-green-200"
            disabled={submitting}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Invoice Information */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Invoice Number</p>
                <p className="font-semibold text-gray-800">{invoice.invoice_number}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Shop Name</p>
                <p className="font-semibold text-gray-800">{invoice.shop_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Invoice Amount</p>
                <p className="font-semibold text-gray-800">{invoiceService.formatCurrency(invoice.net_amount)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Paid Amount</p>
                <p className="font-semibold text-green-600">{invoiceService.formatCurrency(invoice.paid_amount)}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-gray-600">Current Balance</p>
                <p className="text-xl font-bold text-red-600">{invoiceService.formatCurrency(invoice.balance_amount)}</p>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 text-red-700">
              {error}
            </div>
          )}

          {/* Payment Form */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Amount * <span className="text-xs text-gray-500">(Max: {invoiceService.formatCurrency(invoice.balance_amount)})</span>
                </label>
                <input
                  type="number"
                  name="payment_amount"
                  value={paymentData.payment_amount}
                  onChange={handleInputChange}
                  min="0.01"
                  max={invoice.balance_amount}
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Method *
                </label>
                <select
                  name="payment_method"
                  value={paymentData.payment_method}
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
                  Payment Date *
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reference Number
                </label>
                <input
                  type="text"
                  name="reference_number"
                  value={paymentData.reference_number}
                  onChange={handleInputChange}
                  placeholder="Transaction reference"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Bank Transfer Fields */}
              {showBankFields && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    name="bank_name"
                    value={paymentData.bank_name}
                    onChange={handleInputChange}
                    placeholder="Enter bank name"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}

              {/* Cheque Fields */}
              {showChequeFields && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bank Name
                    </label>
                    <input
                      type="text"
                      name="bank_name"
                      value={paymentData.bank_name}
                      onChange={handleInputChange}
                      placeholder="Enter bank name"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cheque Number
                    </label>
                    <input
                      type="text"
                      name="cheque_number"
                      value={paymentData.cheque_number}
                      onChange={handleInputChange}
                      placeholder="Enter cheque number"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cheque Date
                    </label>
                    <input
                      type="date"
                      name="cheque_date"
                      value={paymentData.cheque_date}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Received By
                </label>
                <input
                  type="text"
                  name="received_by"
                  value={paymentData.received_by}
                  onChange={handleInputChange}
                  placeholder="Name of person receiving payment"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  name="notes"
                  value={paymentData.notes}
                  onChange={handleInputChange}
                  rows="3"
                  placeholder="Any additional notes about this payment..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* New Balance Preview */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex justify-between items-center">
                <span className="text-gray-700 font-medium">New Balance After Payment:</span>
                <span className="text-xl font-bold text-blue-600">
                  {invoiceService.formatCurrency(invoice.balance_amount - parseFloat(paymentData.payment_amount || 0))}
                </span>
              </div>
              {(invoice.balance_amount - parseFloat(paymentData.payment_amount || 0)) <= 0 && (
                <p className="text-sm text-green-600 mt-2">✓ Invoice will be marked as PAID</p>
              )}
              {(invoice.balance_amount - parseFloat(paymentData.payment_amount || 0)) > 0 && parseFloat(paymentData.payment_amount || 0) > 0 && (
                <p className="text-sm text-yellow-600 mt-2">⚠ Invoice will be marked as PARTIAL payment</p>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={submitting}
            >
              Cancel
            </button>
            
            <button
              type="submit"
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              disabled={submitting}
            >
              {submitting ? 'Recording...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PaymentRecordModal;
