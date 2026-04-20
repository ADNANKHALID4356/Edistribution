/**
 * Aging Report Page
 * Shop Ledger Management System
 * Display aging analysis for all shops
 * Company: Ummahtechinnovations.com
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ledgerService from '../../services/ledgerService';

const AgingReportPage = () => {
  const navigate = useNavigate();
  
  // State management
  const [agingData, setAgingData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Summary statistics
  const [summary, setSummary] = useState({
    total_outstanding: 0,
    current: 0,
    days_1_30: 0,
    days_31_60: 0,
    days_61_90: 0,
    days_over_90: 0
  });

  const loadAgingAnalysis = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await ledgerService.getAllAgingAnalysis();
      
      if (response.success) {
        setAgingData(response.data || []);
        calculateSummary(response.data || []);
      }
    } catch (err) {
      console.error('Error loading aging analysis:', err);
      setError('Failed to load aging analysis. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load data on mount
  useEffect(() => {
    loadAgingAnalysis();
  }, [loadAgingAnalysis]);

  const calculateSummary = (data) => {
    const totals = data.reduce((acc, shop) => ({
      total_outstanding: acc.total_outstanding + (shop.total_outstanding || 0),
      current: acc.current + (shop.current || 0),
      days_1_30: acc.days_1_30 + (shop.days_1_30 || 0),
      days_31_60: acc.days_31_60 + (shop.days_31_60 || 0),
      days_61_90: acc.days_61_90 + (shop.days_61_90 || 0),
      days_over_90: acc.days_over_90 + (shop.days_over_90 || 0)
    }), {
      total_outstanding: 0,
      current: 0,
      days_1_30: 0,
      days_31_60: 0,
      days_61_90: 0,
      days_over_90: 0
    });
    
    setSummary(totals);
  };

  const getAgingColor = (days) => {
    if (days === 'current') return 'bg-green-100 text-green-800';
    if (days === '1-30') return 'bg-blue-100 text-blue-800';
    if (days === '31-60') return 'bg-yellow-100 text-yellow-800';
    if (days === '61-90') return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  };

  const getSeverityClass = (amount, total) => {
    if (total === 0) return '';
    const percentage = (amount / total) * 100;
    if (percentage >= 50) return 'font-bold text-red-600';
    if (percentage >= 25) return 'font-semibold text-orange-600';
    return '';
  };

  const handleExport = () => {
    // TODO: Implement Excel export
    setSuccess('Excel export will be implemented soon');
    setTimeout(() => setSuccess(''), 5000);
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
          .container {
            visibility: visible !important;
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0 !important;
            margin: 0 !important;
          }
          .container * {
            visibility: visible;
          }
          /* Hide buttons */
          button {
            display: none !important;
          }
          /* Header */
          h1 {
            font-size: 18px;
            margin-bottom: 5px;
          }
          p {
            font-size: 10px;
          }
          /* Summary cards - show inline */
          .grid {
            display: flex !important;
            flex-wrap: wrap;
            gap: 10px;
            margin-bottom: 15px;
            page-break-inside: avoid;
          }
          .grid > div {
            flex: 1;
            min-width: 120px;
            font-size: 9px;
          }
          /* Table */
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 8px;
            page-break-inside: auto;
          }
          thead {
            display: table-header-group;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          th, td {
            border: 1px solid #333 !important;
            padding: 3px 4px !important;
            font-size: 8px !important;
          }
          th {
            background-color: #e0e0e0 !important;
            font-weight: bold;
          }
        }
      `}</style>
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
          <h1 className="text-3xl font-bold text-gray-800">Aging Report</h1>
          <p className="text-gray-600 mt-1">Receivables aging analysis for all shops</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleExport}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
          >
            📊 Export to Excel
          </button>
          <button
            onClick={() => window.print()}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition"
          >
            🖨️ Print Report
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-700 hover:text-red-900 font-bold">&times;</button>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4 flex justify-between items-center">
          <span>{success}</span>
          <button onClick={() => setSuccess('')} className="text-green-700 hover:text-green-900 font-bold">&times;</button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
          <div className="text-xs text-gray-600 mb-1">Total Outstanding</div>
          <div className="text-xl font-bold text-red-600">
            {ledgerService.formatCurrency(summary.total_outstanding)}
          </div>
        </div>
        <div className={`rounded-lg shadow p-4 border-l-4 border-green-500 ${getAgingColor('current')}`}>
          <div className="text-xs mb-1">Current</div>
          <div className="text-lg font-bold">
            {ledgerService.formatCurrency(summary.current)}
          </div>
          <div className="text-xs mt-1">
            {summary.total_outstanding > 0 
              ? ((summary.current / summary.total_outstanding) * 100).toFixed(1) 
              : 0}%
          </div>
        </div>
        <div className={`rounded-lg shadow p-4 border-l-4 border-blue-500 ${getAgingColor('1-30')}`}>
          <div className="text-xs mb-1">1-30 Days</div>
          <div className="text-lg font-bold">
            {ledgerService.formatCurrency(summary.days_1_30)}
          </div>
          <div className="text-xs mt-1">
            {summary.total_outstanding > 0 
              ? ((summary.days_1_30 / summary.total_outstanding) * 100).toFixed(1) 
              : 0}%
          </div>
        </div>
        <div className={`rounded-lg shadow p-4 border-l-4 border-yellow-500 ${getAgingColor('31-60')}`}>
          <div className="text-xs mb-1">31-60 Days</div>
          <div className="text-lg font-bold">
            {ledgerService.formatCurrency(summary.days_31_60)}
          </div>
          <div className="text-xs mt-1">
            {summary.total_outstanding > 0 
              ? ((summary.days_31_60 / summary.total_outstanding) * 100).toFixed(1) 
              : 0}%
          </div>
        </div>
        <div className={`rounded-lg shadow p-4 border-l-4 border-orange-500 ${getAgingColor('61-90')}`}>
          <div className="text-xs mb-1">61-90 Days</div>
          <div className="text-lg font-bold">
            {ledgerService.formatCurrency(summary.days_61_90)}
          </div>
          <div className="text-xs mt-1">
            {summary.total_outstanding > 0 
              ? ((summary.days_61_90 / summary.total_outstanding) * 100).toFixed(1) 
              : 0}%
          </div>
        </div>
        <div className={`rounded-lg shadow p-4 border-l-4 border-red-500 ${getAgingColor('90+')}`}>
          <div className="text-xs mb-1">Over 90 Days</div>
          <div className="text-lg font-bold">
            {ledgerService.formatCurrency(summary.days_over_90)}
          </div>
          <div className="text-xs mt-1">
            {summary.total_outstanding > 0 
              ? ((summary.days_over_90 / summary.total_outstanding) * 100).toFixed(1) 
              : 0}%
          </div>
        </div>
      </div>

      {/* Aging Chart Visualization */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">Aging Distribution</h3>
        <div className="w-full bg-gray-200 rounded-full h-8 overflow-hidden flex">
          {summary.total_outstanding > 0 && (
            <>
              {summary.current > 0 && (
                <div 
                  className="bg-green-500 h-full flex items-center justify-center text-white text-xs font-semibold"
                  style={{ width: `${(summary.current / summary.total_outstanding) * 100}%` }}
                  title={`Current: ${ledgerService.formatCurrency(summary.current)}`}
                >
                  {((summary.current / summary.total_outstanding) * 100).toFixed(0)}%
                </div>
              )}
              {summary.days_1_30 > 0 && (
                <div 
                  className="bg-blue-500 h-full flex items-center justify-center text-white text-xs font-semibold"
                  style={{ width: `${(summary.days_1_30 / summary.total_outstanding) * 100}%` }}
                  title={`1-30 Days: ${ledgerService.formatCurrency(summary.days_1_30)}`}
                >
                  {((summary.days_1_30 / summary.total_outstanding) * 100).toFixed(0)}%
                </div>
              )}
              {summary.days_31_60 > 0 && (
                <div 
                  className="bg-yellow-500 h-full flex items-center justify-center text-white text-xs font-semibold"
                  style={{ width: `${(summary.days_31_60 / summary.total_outstanding) * 100}%` }}
                  title={`31-60 Days: ${ledgerService.formatCurrency(summary.days_31_60)}`}
                >
                  {((summary.days_31_60 / summary.total_outstanding) * 100).toFixed(0)}%
                </div>
              )}
              {summary.days_61_90 > 0 && (
                <div 
                  className="bg-orange-500 h-full flex items-center justify-center text-white text-xs font-semibold"
                  style={{ width: `${(summary.days_61_90 / summary.total_outstanding) * 100}%` }}
                  title={`61-90 Days: ${ledgerService.formatCurrency(summary.days_61_90)}`}
                >
                  {((summary.days_61_90 / summary.total_outstanding) * 100).toFixed(0)}%
                </div>
              )}
              {summary.days_over_90 > 0 && (
                <div 
                  className="bg-red-500 h-full flex items-center justify-center text-white text-xs font-semibold"
                  style={{ width: `${(summary.days_over_90 / summary.total_outstanding) * 100}%` }}
                  title={`Over 90 Days: ${ledgerService.formatCurrency(summary.days_over_90)}`}
                >
                  {((summary.days_over_90 / summary.total_outstanding) * 100).toFixed(0)}%
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Aging Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Shop
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Outstanding
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Current
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  1-30 Days
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  31-60 Days
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  61-90 Days
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Over 90 Days
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
                      <span className="ml-2">Loading aging analysis...</span>
                    </div>
                  </td>
                </tr>
              ) : agingData.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-4 text-center text-gray-500">
                    No aging data found
                  </td>
                </tr>
              ) : (
                agingData
                  .filter(shop => shop.total_outstanding > 0)
                  .sort((a, b) => b.total_outstanding - a.total_outstanding)
                  .map((shop) => (
                    <tr key={shop.shop_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{shop.shop_name}</div>
                        <div className="text-sm text-gray-500">{shop.shop_code}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-red-600">
                        {ledgerService.formatCurrency(shop.total_outstanding)}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm text-right ${getSeverityClass(shop.current, shop.total_outstanding)}`}>
                        {ledgerService.formatCurrency(shop.current || 0)}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm text-right ${getSeverityClass(shop.days_1_30, shop.total_outstanding)}`}>
                        {ledgerService.formatCurrency(shop.days_1_30 || 0)}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm text-right ${getSeverityClass(shop.days_31_60, shop.total_outstanding)}`}>
                        {ledgerService.formatCurrency(shop.days_31_60 || 0)}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm text-right ${getSeverityClass(shop.days_61_90, shop.total_outstanding)}`}>
                        {ledgerService.formatCurrency(shop.days_61_90 || 0)}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm text-right ${getSeverityClass(shop.days_over_90, shop.total_outstanding)}`}>
                        {ledgerService.formatCurrency(shop.days_over_90 || 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                        <button
                          onClick={() => navigate(`/ledger/shop/${shop.shop_id}`)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                          title="View Ledger"
                        >
                          📖
                        </button>
                        <button
                          onClick={() => navigate(`/ledger/payment/new`, { state: { shop: { id: shop.shop_id, shop_name: shop.shop_name } } })}
                          className="text-green-600 hover:text-green-900"
                          title="Record Payment"
                        >
                          💰
                        </button>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
            {!loading && agingData.length > 0 && (
              <tfoot className="bg-gray-100">
                <tr className="font-bold">
                  <td className="px-6 py-4 text-sm text-gray-900">TOTAL</td>
                  <td className="px-6 py-4 text-sm text-right text-red-600">
                    {ledgerService.formatCurrency(summary.total_outstanding)}
                  </td>
                  <td className="px-6 py-4 text-sm text-right">
                    {ledgerService.formatCurrency(summary.current)}
                  </td>
                  <td className="px-6 py-4 text-sm text-right">
                    {ledgerService.formatCurrency(summary.days_1_30)}
                  </td>
                  <td className="px-6 py-4 text-sm text-right">
                    {ledgerService.formatCurrency(summary.days_31_60)}
                  </td>
                  <td className="px-6 py-4 text-sm text-right">
                    {ledgerService.formatCurrency(summary.days_61_90)}
                  </td>
                  <td className="px-6 py-4 text-sm text-right">
                    {ledgerService.formatCurrency(summary.days_over_90)}
                  </td>
                  <td className="px-6 py-4"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Collection Priority Recommendations */}
      {agingData.length > 0 && (
        <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-red-900 mb-3">🚨 Collection Priority</h3>
          <div className="text-sm text-red-800">
            <strong>High Priority Accounts (Over 90 Days):</strong>
            <ul className="list-disc ml-5 mt-2">
              {agingData
                .filter(shop => shop.days_over_90 > 0)
                .sort((a, b) => b.days_over_90 - a.days_over_90)
                .slice(0, 5)
                .map(shop => (
                  <li key={shop.shop_id}>
                    {shop.shop_name}: <strong>{ledgerService.formatCurrency(shop.days_over_90)}</strong>
                  </li>
                ))}
            </ul>
          </div>
        </div>
      )}
    </div>
    </>
  );
};

export default AgingReportPage;
