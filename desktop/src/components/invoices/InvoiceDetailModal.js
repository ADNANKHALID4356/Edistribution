/**
 * Invoice Detail Modal
 * Sprint 7: Invoice & Bill Management
 * Display detailed invoice information
 */

import React, { useState, useEffect } from 'react';
import invoiceService from '../../services/invoiceService';

const InvoiceDetailModal = ({ invoiceId, onClose, onPaymentRecorded }) => {
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadInvoiceDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceId]);

  const loadInvoiceDetails = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await invoiceService.getInvoiceById(invoiceId);
      
      if (response.success) {
        setInvoice(response.data);
      }
    } catch (err) {
      console.error('Error loading invoice details:', err);
      setError('Failed to load invoice details.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md">
          <p className="text-red-600 mb-4">{error || 'Invoice not found'}</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full my-8">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800">Invoice Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[calc(100vh-200px)] overflow-y-auto">
          {/* Invoice Header */}
          <div className="mb-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Invoice Information</h3>
                <div className="space-y-2">
                  <div>
                    <p className="text-sm text-gray-600">Invoice Number</p>
                    <p className="font-medium text-gray-800">{invoice.invoice_number}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Invoice Date</p>
                    <p className="font-medium text-gray-800">{invoiceService.formatDate(invoice.invoice_date)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Due Date</p>
                    <p className="font-medium text-gray-800">{invoiceService.formatDate(invoice.due_date)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${invoiceService.getStatusColor(invoice.status)}`}>
                      {invoice.status}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Payment Status</p>
                    <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${invoiceService.getPaymentStatusColor(invoice.payment_status)}`}>
                      {invoice.payment_status}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Customer Information</h3>
                <div className="space-y-2">
                  <div>
                    <p className="text-sm text-gray-600">Shop Name</p>
                    <p className="font-medium text-gray-800">{invoice.shop_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Salesman</p>
                    <p className="font-medium text-gray-800">{invoice.salesman_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Payment Type</p>
                    <p className="font-medium text-gray-800 capitalize">{invoice.payment_type?.replace('_', ' ')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Invoice Items</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 border border-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Discount</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invoice.items && invoice.items.map((item, index) => (
                    <tr key={index}>
                      <td className="px-4 py-3 text-sm text-gray-900">{item.product_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{item.product_code}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">{item.quantity}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">
                        {invoiceService.formatCurrency(item.unit_price)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">
                        {item.discount_percentage > 0 ? `${item.discount_percentage}%` : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                        {invoiceService.formatCurrency(item.total_amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pricing Breakdown */}
          <div className="mb-6">
            <div className="max-w-md ml-auto bg-gray-50 rounded-lg p-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Subtotal:</span>
                  <span className="font-medium text-gray-900">
                    {invoiceService.formatCurrency(invoice.subtotal)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Discount ({invoice.discount_percentage || 0}%):</span>
                  <span className={`font-medium ${(invoice.discount_amount || 0) > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                    -{invoiceService.formatCurrency(invoice.discount_amount || 0)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Tax ({invoice.tax_percentage || 0}%):</span>
                  <span className={`font-medium ${(invoice.tax_amount || 0) > 0 ? 'text-gray-900' : 'text-gray-400'}`}>
                    +{invoiceService.formatCurrency(invoice.tax_amount || 0)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Shipping Charges:</span>
                  <span className={`font-medium ${(invoice.shipping_charges || 0) > 0 ? 'text-gray-900' : 'text-gray-400'}`}>
                    +{invoiceService.formatCurrency(invoice.shipping_charges || 0)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Other Charges:</span>
                  <span className={`font-medium ${(invoice.other_charges || 0) > 0 ? 'text-gray-900' : 'text-gray-400'}`}>
                    +{invoiceService.formatCurrency(invoice.other_charges || 0)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Round Off:</span>
                  <span className={`font-medium ${(invoice.round_off || 0) > 0 ? 'text-green-600' : (invoice.round_off || 0) < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                    {(invoice.round_off || 0) > 0 ? '+' : ''}{invoiceService.formatCurrency(invoice.round_off || 0)}
                  </span>
                </div>
                
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-gray-900">Net Amount:</span>
                    <span className="text-lg font-bold text-gray-900">
                      {invoiceService.formatCurrency(invoice.net_amount)}
                    </span>
                  </div>
                </div>
                
                {(invoice.previous_balance || 0) > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Previous Balance:</span>
                    <span className="font-medium text-orange-600">
                      +{invoiceService.formatCurrency(invoice.previous_balance || 0)}
                    </span>
                  </div>
                )}
                
                {(invoice.previous_balance || 0) > 0 && (
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="text-gray-700 font-semibold">Total Payable:</span>
                    <span className="font-bold text-gray-900">
                      {invoiceService.formatCurrency((invoice.net_amount || 0) + (invoice.previous_balance || 0))}
                    </span>
                  </div>
                )}
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Paid Amount:</span>
                  <span className="font-medium text-green-600">
                    {invoiceService.formatCurrency(invoice.paid_amount)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center border-t pt-2">
                  <span className="text-lg font-semibold text-gray-900">Balance:</span>
                  <span className="text-lg font-bold text-red-600">
                    {invoiceService.formatCurrency(invoice.balance_amount)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment History */}
          {invoice.payments && invoice.payments.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                <span className="mr-2">💳</span>Payment History
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 border border-gray-200">
                  <thead className="bg-green-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Receipt #</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {invoice.payments.map((payment, index) => (
                      <tr key={index} className="hover:bg-green-50">
                        <td className="px-4 py-3 text-sm font-mono text-blue-600">
                          {payment.receipt_number || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {invoiceService.formatDate(payment.payment_date)}
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-green-600 text-right">
                          {invoiceService.formatCurrency(payment.payment_amount || payment.amount)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            payment.payment_method === 'cash' ? 'bg-green-100 text-green-800' :
                            payment.payment_method === 'bank_transfer' || payment.payment_method === 'bank' ? 'bg-blue-100 text-blue-800' :
                            payment.payment_method === 'cheque' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {payment.payment_method?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {payment.reference_number || payment.cheque_number || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate" title={payment.notes || ''}>
                          {payment.notes || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-green-100">
                    <tr>
                      <td colSpan="2" className="px-4 py-3 text-sm font-semibold text-gray-700 text-right">
                        Total Paid:
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-green-700 text-right">
                        {invoiceService.formatCurrency(
                          invoice.payments.reduce((sum, p) => sum + parseFloat(p.payment_amount || p.amount || 0), 0)
                        )}
                      </td>
                      <td colSpan="3"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Notes and Terms */}
          {(invoice.notes || invoice.terms_conditions) && (
            <div className="mb-6">
              {invoice.notes && (
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-gray-800 mb-2">Notes</h3>
                  <p className="text-sm text-gray-600">{invoice.notes}</p>
                </div>
              )}
              
              {invoice.terms_conditions && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-800 mb-2">Terms & Conditions</h3>
                  <p className="text-sm text-gray-600">{invoice.terms_conditions}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Print Invoice
          </button>
          
          {(invoice.payment_status === 'unpaid' || invoice.payment_status === 'partial') && invoice.status !== 'cancelled' && (
            <button
              onClick={() => {
                onClose();
                if (onPaymentRecorded) {
                  // Trigger payment modal from parent
                  setTimeout(() => {
                    const recordPaymentBtn = document.querySelector(`[data-invoice-id="${invoiceId}"] .record-payment-btn`);
                    if (recordPaymentBtn) recordPaymentBtn.click();
                  }, 100);
                }
              }}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Record Payment
            </button>
          )}
          
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default InvoiceDetailModal;
