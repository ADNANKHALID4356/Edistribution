import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import routeService from '../../services/routeService';
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  PrinterIcon,
  MapPinIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';

const RouteConsolidatedBillPage = () => {
  const navigate = useNavigate();
  const printRef = useRef();

  const [routes, setRoutes] = useState([]);
  const [selectedRouteId, setSelectedRouteId] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [billData, setBillData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [expandedShops, setExpandedShops] = useState({});
  const [activeSection, setActiveSection] = useState('shops'); // 'shops' or 'products'

  const fetchRoutes = useCallback(async () => {
    setLoadingRoutes(true);
    try {
      const response = await routeService.getAllRoutes({ limit: 100, is_active: 'true' });
      setRoutes(response.data || []);
    } catch (err) {
      console.error('Failed to fetch routes:', err);
    } finally {
      setLoadingRoutes(false);
    }
  }, []);

  useEffect(() => {
    fetchRoutes();
  }, [fetchRoutes]);

  const fetchBill = async () => {
    if (!selectedRouteId) return;
    setLoading(true);
    try {
      const params = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const response = await routeService.getConsolidatedBill(selectedRouteId, params);
      setBillData(response.data || null);
    } catch (err) {
      console.error('Failed to fetch consolidated bill:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleShop = (shopId) => {
    setExpandedShops(prev => ({ ...prev, [shopId]: !prev[shopId] }));
  };

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (num) => '₨ ' + parseFloat(num || 0).toLocaleString('en-PK', { minimumFractionDigits: 0 });
  const formatDate = (date) => date ? new Date(date).toLocaleDateString('en-PK') : '-';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header - hidden in print */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50 border-b border-gray-100 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate('/routes')} className="p-2 hover:bg-gray-100 rounded-lg">
                <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-800">Route-wise Consolidated Bill</h1>
                <p className="text-sm text-gray-500">View and print consolidated delivery bills by route</p>
              </div>
            </div>
            {billData && (
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 shadow-md"
              >
                <PrinterIcon className="h-4 w-4" />
                Print Bill
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Filters - hidden in print */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-6 print:hidden">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <MapPinIcon className="h-5 w-5 text-primary-600" />
            Generate Consolidated Bill
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Route *</label>
              <select
                value={selectedRouteId}
                onChange={(e) => setSelectedRouteId(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                disabled={loadingRoutes}
              >
                <option value="">-- Select Route --</option>
                {routes.map(r => (
                  <option key={r.id} value={r.id}>{r.route_name} ({r.route_code})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={fetchBill}
                disabled={!selectedRouteId || loading}
                className="w-full px-6 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg hover:from-primary-600 hover:to-primary-700 disabled:opacity-50 shadow-md flex items-center justify-center gap-2"
              >
                {loading ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <DocumentTextIcon className="h-4 w-4" />}
                Generate
              </button>
            </div>
          </div>
        </div>

        {/* Bill Content (printable) */}
        {billData && (
          <div ref={printRef} className="print:p-0">
            {/* Print Header */}
            <div className="hidden print:block text-center mb-6">
              <h1 className="text-2xl font-bold">Route-wise Consolidated Bill</h1>
              <p className="text-gray-600 mt-1">
                Route: {billData.route?.route_name} ({billData.route?.route_code}) |
                Period: {billData.date_range?.start_date} to {billData.date_range?.end_date}
              </p>
            </div>

            {/* Route Summary */}
            <div className="bg-gradient-to-r from-indigo-600 to-blue-700 rounded-2xl p-6 mb-6 text-white shadow-xl print:bg-white print:text-black print:border print:border-gray-300 print:shadow-none">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-indigo-200 text-sm print:text-gray-500">Route</p>
                  <h2 className="text-2xl font-bold mt-1 print:text-black">{billData.route?.route_name}</h2>
                  <p className="text-indigo-200 text-sm mt-1 print:text-gray-500">Code: {billData.route?.route_code}</p>
                </div>
                <div className="text-right">
                  <p className="text-indigo-200 text-sm print:text-gray-500">Period</p>
                  <p className="font-medium print:text-black">{billData.date_range?.start_date} to {billData.date_range?.end_date}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4">
                <div className="bg-white/10 rounded-lg px-3 py-2 print:bg-gray-50 print:border">
                  <p className="text-xs text-indigo-200 print:text-gray-500">Shops</p>
                  <p className="text-xl font-bold print:text-black">{billData.totals?.total_shops}</p>
                </div>
                <div className="bg-white/10 rounded-lg px-3 py-2 print:bg-gray-50 print:border">
                  <p className="text-xs text-indigo-200 print:text-gray-500">Deliveries</p>
                  <p className="text-xl font-bold print:text-black">{billData.totals?.total_deliveries}</p>
                </div>
                <div className="bg-white/10 rounded-lg px-3 py-2 print:bg-gray-50 print:border">
                  <p className="text-xs text-indigo-200 print:text-gray-500">Subtotal</p>
                  <p className="text-xl font-bold print:text-black">{formatCurrency(billData.totals?.total_amount)}</p>
                </div>
                <div className="bg-white/10 rounded-lg px-3 py-2 print:bg-gray-50 print:border">
                  <p className="text-xs text-indigo-200 print:text-gray-500">Discount</p>
                  <p className="text-xl font-bold text-red-300 print:text-red-600">{formatCurrency(billData.totals?.total_discount)}</p>
                </div>
                <div className="bg-white/10 rounded-lg px-3 py-2 print:bg-gray-50 print:border">
                  <p className="text-xs text-indigo-200 print:text-gray-500">Grand Total</p>
                  <p className="text-xl font-bold print:text-black">{formatCurrency(billData.totals?.grand_total)}</p>
                </div>
              </div>
            </div>

            {/* View Tabs - hidden in print */}
            <div className="flex gap-2 mb-4 print:hidden">
              <button
                onClick={() => setActiveSection('shops')}
                className={`px-4 py-2 rounded-lg font-medium text-sm ${activeSection === 'shops' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}
              >
                Shop-wise View
              </button>
              <button
                onClick={() => setActiveSection('products')}
                className={`px-4 py-2 rounded-lg font-medium text-sm ${activeSection === 'products' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}
              >
                Product Summary
              </button>
            </div>

            {/* Shop-wise View */}
            {(activeSection === 'shops' || true) && (
              <div className={`space-y-4 ${activeSection !== 'shops' ? 'hidden print:block' : ''}`}>
                <h3 className="text-lg font-bold text-gray-800 hidden print:block mt-6 mb-4">Shop-wise Breakdown</h3>
                {(billData.shops || []).map((shop) => (
                  <div key={shop.shop_id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden print:break-inside-avoid">
                    <div
                      className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50 print:cursor-default"
                      onClick={() => toggleShop(shop.shop_id)}
                    >
                      <div>
                        <h4 className="font-bold text-gray-800">{shop.shop_name}</h4>
                        <p className="text-sm text-gray-500">{shop.shop_address} | {shop.shop_contact || '-'}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm text-gray-500">{shop.total_deliveries} deliveries</p>
                          <p className="font-bold text-gray-800">{formatCurrency(shop.grand_total)}</p>
                        </div>
                        <span className="print:hidden">
                          {expandedShops[shop.shop_id] ? (
                            <ChevronUpIcon className="h-5 w-5 text-gray-400" />
                          ) : (
                            <ChevronDownIcon className="h-5 w-5 text-gray-400" />
                          )}
                        </span>
                      </div>
                    </div>
                    {(expandedShops[shop.shop_id] || false) && (
                      <div className="border-t border-gray-100 print:block">
                        {shop.deliveries.map((d) => (
                          <div key={d.delivery_id} className="px-4 py-3 border-b border-gray-50 last:border-0">
                            <div className="flex justify-between items-center mb-2">
                              <span className="font-medium text-primary-600">{d.challan_number}</span>
                              <div className="flex items-center gap-3 text-sm">
                                <span className="text-gray-500">{formatDate(d.delivery_date)}</span>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                  d.status === 'delivered' ? 'bg-green-100 text-green-700' :
                                  d.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>{d.status}</span>
                              </div>
                            </div>
                            {d.items && d.items.length > 0 && (
                              <div className="ml-4 space-y-1">
                                {d.items.map((item, idx) => (
                                  <div key={idx} className="flex justify-between text-sm text-gray-600">
                                    <span>{item.product_name}</span>
                                    <div className="flex gap-4">
                                      <span>Qty: {item.quantity_delivered}</span>
                                      {parseFloat(item.discount_amount) > 0 && (
                                        <span className="text-red-500">-{formatCurrency(item.discount_amount)}</span>
                                      )}
                                      <span className="font-medium text-gray-800">{formatCurrency(item.net_amount || item.total_price)}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                            <div className="flex justify-between mt-2 text-sm font-medium border-t border-gray-100 pt-1">
                              <span className="text-gray-500">Subtotal: {formatCurrency(d.subtotal || d.total_amount)}</span>
                              {parseFloat(d.discount_amount) > 0 && (
                                <span className="text-red-500">Discount: -{formatCurrency(d.discount_amount)}</span>
                              )}
                              <span className="text-gray-800">Total: {formatCurrency(d.grand_total || d.total_amount)}</span>
                            </div>
                          </div>
                        ))}
                        <div className="px-4 py-3 bg-gray-50 flex justify-between font-bold text-gray-800">
                          <span>Shop Total</span>
                          <div className="flex gap-6">
                            {parseFloat(shop.total_discount) > 0 && (
                              <span className="text-red-600">Discount: -{formatCurrency(shop.total_discount)}</span>
                            )}
                            <span>{formatCurrency(shop.grand_total)}</span>
                          </div>
                        </div>
                      </div>
                    )}
                    {/* Print: always show expanded */}
                    <div className="hidden print:block border-t border-gray-100">
                      {shop.deliveries.map((d) => (
                        <div key={d.delivery_id} className="px-4 py-2 border-b border-gray-50 text-sm">
                          <div className="flex justify-between">
                            <span className="font-medium">{d.challan_number} - {formatDate(d.delivery_date)}</span>
                            <span className="font-medium">{formatCurrency(d.grand_total || d.total_amount)}</span>
                          </div>
                        </div>
                      ))}
                      <div className="px-4 py-2 bg-gray-50 flex justify-between font-bold">
                        <span>Shop Total</span>
                        <span>{formatCurrency(shop.grand_total)}</span>
                      </div>
                    </div>
                  </div>
                ))}

                {(billData.shops || []).length === 0 && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-16 text-center text-gray-500">
                    <MapPinIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p>No deliveries found for this route in the selected period</p>
                  </div>
                )}
              </div>
            )}

            {/* Product Summary */}
            {activeSection === 'products' && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100">
                  <h3 className="font-bold text-gray-800">Product-wise Summary</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Product</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Code</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Qty Ordered</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Qty Delivered</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Qty Returned</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Amount</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Discount</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Net Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(billData.product_summary || []).map((p, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-800">{p.product_name}</td>
                          <td className="px-4 py-3 text-gray-500 text-sm">{p.product_code}</td>
                          <td className="px-4 py-3 text-right text-gray-600">{p.total_quantity_ordered}</td>
                          <td className="px-4 py-3 text-right text-gray-600">{p.total_quantity_delivered}</td>
                          <td className="px-4 py-3 text-right text-orange-600">{p.total_quantity_returned || 0}</td>
                          <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(p.total_amount)}</td>
                          <td className="px-4 py-3 text-right text-red-600">{formatCurrency(p.total_discount)}</td>
                          <td className="px-4 py-3 text-right font-medium text-gray-800">{formatCurrency(p.net_amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                    {(billData.product_summary || []).length > 0 && (
                      <tfoot className="bg-gray-50 font-bold">
                        <tr>
                          <td colSpan="2" className="px-4 py-3 text-gray-800">Grand Total</td>
                          <td className="px-4 py-3 text-right">{(billData.product_summary || []).reduce((s, p) => s + p.total_quantity_ordered, 0)}</td>
                          <td className="px-4 py-3 text-right">{(billData.product_summary || []).reduce((s, p) => s + p.total_quantity_delivered, 0)}</td>
                          <td className="px-4 py-3 text-right text-orange-600">{(billData.product_summary || []).reduce((s, p) => s + (p.total_quantity_returned || 0), 0)}</td>
                          <td className="px-4 py-3 text-right">{formatCurrency((billData.product_summary || []).reduce((s, p) => s + p.total_amount, 0))}</td>
                          <td className="px-4 py-3 text-right text-red-600">{formatCurrency((billData.product_summary || []).reduce((s, p) => s + p.total_discount, 0))}</td>
                          <td className="px-4 py-3 text-right">{formatCurrency((billData.product_summary || []).reduce((s, p) => s + p.net_amount, 0))}</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            )}

            {/* Print: Product Summary always shown */}
            <div className="hidden print:block mt-6">
              <h3 className="text-lg font-bold mb-3">Product-wise Summary</h3>
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-3 py-2 text-left text-sm">Product</th>
                    <th className="border border-gray-300 px-3 py-2 text-right text-sm">Qty</th>
                    <th className="border border-gray-300 px-3 py-2 text-right text-sm">Amount</th>
                    <th className="border border-gray-300 px-3 py-2 text-right text-sm">Discount</th>
                    <th className="border border-gray-300 px-3 py-2 text-right text-sm">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {(billData.product_summary || []).map((p, idx) => (
                    <tr key={idx}>
                      <td className="border border-gray-300 px-3 py-1 text-sm">{p.product_name}</td>
                      <td className="border border-gray-300 px-3 py-1 text-right text-sm">{p.total_quantity_delivered}</td>
                      <td className="border border-gray-300 px-3 py-1 text-right text-sm">{formatCurrency(p.total_amount)}</td>
                      <td className="border border-gray-300 px-3 py-1 text-right text-sm">{formatCurrency(p.total_discount)}</td>
                      <td className="border border-gray-300 px-3 py-1 text-right text-sm font-medium">{formatCurrency(p.net_amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-bold bg-gray-100">
                    <td className="border border-gray-300 px-3 py-2">Total</td>
                    <td className="border border-gray-300 px-3 py-2 text-right">{(billData.product_summary || []).reduce((s, p) => s + p.total_quantity_delivered, 0)}</td>
                    <td className="border border-gray-300 px-3 py-2 text-right">{formatCurrency(billData.totals?.total_amount)}</td>
                    <td className="border border-gray-300 px-3 py-2 text-right">{formatCurrency(billData.totals?.total_discount)}</td>
                    <td className="border border-gray-300 px-3 py-2 text-right">{formatCurrency(billData.totals?.grand_total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default RouteConsolidatedBillPage;
