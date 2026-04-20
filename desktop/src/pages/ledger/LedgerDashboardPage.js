/**
 * PROFESSIONAL LEDGER DASHBOARD - REBUILT
 * Distribution Industry Standard Financial Dashboard
 * Company: Ummahtechinnovations.com
 * Date: January 22, 2026
 * 
 * Comprehensive financial overview with:
 * - Real-time metrics
 * - Aging analysis visualization
 * - Risk alerts
 * - Collection priorities
 * - Top debtors list
 * - Trend analysis
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChartBarIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import ledgerService from '../../services/ledgerService';

const LedgerDashboardPage = () => {
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  // Load dashboard data
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await ledgerService.getDashboard();
      
      if (response.success) {
        setData(response.data);
      }
    } catch (err) {
      console.error('Error loading dashboard:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { summary, aging, top_debtors, recent_transactions } = data;

  // Calculate risk metrics
  const criticalShops = aging.shops?.filter(s => s.risk_level === 'critical').length || 0;
  const highRiskShops = aging.shops?.filter(s => s.risk_level === 'high').length || 0;
  const overLimitShops = summary.shops_over_limit || 0;

  // Format currency
  const formatCurrency = (amount) => {
    return `Rs. ${parseFloat(amount || 0).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Financial Dashboard</h1>
        <p className="text-gray-600 mt-2">Comprehensive overview of receivables and credit management</p>
      </div>

      {/* KEY METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Outstanding */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Total Outstanding</p>
              <h3 className="text-3xl font-bold mt-2">{formatCurrency(summary.total_outstanding)}</h3>
              <p className="text-blue-100 text-sm mt-2">{summary.total_shops} shops</p>
            </div>
            <CurrencyDollarIcon className="h-12 w-12 text-blue-200" />
          </div>
        </div>

        {/* Average Balance */}
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">Average Balance</p>
              <h3 className="text-3xl font-bold mt-2">{formatCurrency(summary.average_balance)}</h3>
              <p className="text-purple-100 text-sm mt-2">per shop</p>
            </div>
            <ChartBarIcon className="h-12 w-12 text-purple-200" />
          </div>
        </div>

        {/* Critical Accounts */}
        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100 text-sm font-medium">Critical Accounts</p>
              <h3 className="text-3xl font-bold mt-2">{criticalShops + highRiskShops}</h3>
              <p className="text-red-100 text-sm mt-2">{criticalShops} critical, {highRiskShops} high risk</p>
            </div>
            <ExclamationTriangleIcon className="h-12 w-12 text-red-200" />
          </div>
        </div>

        {/* Over Limit */}
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm font-medium">Over Credit Limit</p>
              <h3 className="text-3xl font-bold mt-2">{overLimitShops}</h3>
              <p className="text-orange-100 text-sm mt-2">shops exceeded limit</p>
            </div>
            <ClockIcon className="h-12 w-12 text-orange-200" />
          </div>
        </div>
      </div>

      {/* AGING ANALYSIS */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Aging Analysis</h2>
          <button
            onClick={() => navigate('/ledger/aging')}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            View Detailed Report →
          </button>
        </div>

        {/* Aging Buckets Visual */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-green-600 font-semibold">Current</span>
              <CheckCircleIcon className="h-5 w-5 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-green-700">
              {formatCurrency(aging.totals?.current_0_30)}
            </p>
            <p className="text-sm text-green-600 mt-1">0-30 days</p>
          </div>

          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-yellow-600 font-semibold">Early</span>
              <ClockIcon className="h-5 w-5 text-yellow-600" />
            </div>
            <p className="text-2xl font-bold text-yellow-700">
              {formatCurrency(aging.totals?.aging_31_60)}
            </p>
            <p className="text-sm text-yellow-600 mt-1">31-60 days</p>
          </div>

          <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-orange-600 font-semibold">Overdue</span>
              <ExclamationTriangleIcon className="h-5 w-5 text-orange-600" />
            </div>
            <p className="text-2xl font-bold text-orange-700">
              {formatCurrency(aging.totals?.aging_61_90)}
            </p>
            <p className="text-sm text-orange-600 mt-1">61-90 days</p>
          </div>

          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-red-600 font-semibold">Critical</span>
              <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
            </div>
            <p className="text-2xl font-bold text-red-700">
              {formatCurrency(aging.totals?.aging_over_90)}
            </p>
            <p className="text-sm text-red-600 mt-1">90+ days</p>
          </div>

          <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 font-semibold">Total</span>
              <ChartBarIcon className="h-5 w-5 text-gray-600" />
            </div>
            <p className="text-2xl font-bold text-gray-700">
              {formatCurrency(aging.totals?.total_outstanding)}
            </p>
            <p className="text-sm text-gray-600 mt-1">All ages</p>
          </div>
        </div>

        {/* Aging Percentage Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Aging Distribution</span>
            <span>Total: {formatCurrency(aging.totals?.total_outstanding)}</span>
          </div>
          <div className="h-8 bg-gray-100 rounded-lg overflow-hidden flex">
            {aging.totals?.total_outstanding > 0 && (
              <>
                <div
                  className="bg-green-500 flex items-center justify-center text-white text-xs font-semibold"
                  style={{ width: `${(aging.totals.current_0_30 / aging.totals.total_outstanding) * 100}%` }}
                  title={`Current: ${formatCurrency(aging.totals.current_0_30)}`}
                >
                  {((aging.totals.current_0_30 / aging.totals.total_outstanding) * 100).toFixed(0)}%
                </div>
                <div
                  className="bg-yellow-500 flex items-center justify-center text-white text-xs font-semibold"
                  style={{ width: `${(aging.totals.aging_31_60 / aging.totals.total_outstanding) * 100}%` }}
                  title={`31-60: ${formatCurrency(aging.totals.aging_31_60)}`}
                >
                  {((aging.totals.aging_31_60 / aging.totals.total_outstanding) * 100).toFixed(0)}%
                </div>
                <div
                  className="bg-orange-500 flex items-center justify-center text-white text-xs font-semibold"
                  style={{ width: `${(aging.totals.aging_61_90 / aging.totals.total_outstanding) * 100}%` }}
                  title={`61-90: ${formatCurrency(aging.totals.aging_61_90)}`}
                >
                  {((aging.totals.aging_61_90 / aging.totals.total_outstanding) * 100).toFixed(0)}%
                </div>
                <div
                  className="bg-red-500 flex items-center justify-center text-white text-xs font-semibold"
                  style={{ width: `${(aging.totals.aging_over_90 / aging.totals.total_outstanding) * 100}%` }}
                  title={`90+: ${formatCurrency(aging.totals.aging_over_90)}`}
                >
                  {((aging.totals.aging_over_90 / aging.totals.total_outstanding) * 100).toFixed(0)}%
                </div>
              </>
            )}
          </div>
        </div>

        {/* Collection Recommendations */}
        {aging.recommendations && aging.recommendations.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900">⚡ Action Required</h3>
            {aging.recommendations.map((rec, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border-2 ${
                  rec.type === 'critical' ? 'bg-red-50 border-red-200' :
                  rec.type === 'warning' ? 'bg-orange-50 border-orange-200' :
                  'bg-yellow-50 border-yellow-200'
                }`}
              >
                <div className="flex items-start">
                  <ExclamationTriangleIcon className={`h-5 w-5 mt-0.5 mr-3 ${
                    rec.type === 'critical' ? 'text-red-600' :
                    rec.type === 'warning' ? 'text-orange-600' :
                    'text-yellow-600'
                  }`} />
                  <div className="flex-1">
                    <h4 className={`font-semibold ${
                      rec.type === 'critical' ? 'text-red-900' :
                      rec.type === 'warning' ? 'text-orange-900' :
                      'text-yellow-900'
                    }`}>
                      {rec.title}
                    </h4>
                    <p className={`text-sm mt-1 ${
                      rec.type === 'critical' ? 'text-red-700' :
                      rec.type === 'warning' ? 'text-orange-700' :
                      'text-yellow-700'
                    }`}>
                      {rec.message}
                    </p>
                    <p className={`text-sm font-medium mt-2 ${
                      rec.type === 'critical' ? 'text-red-800' :
                      rec.type === 'warning' ? 'text-orange-800' :
                      'text-yellow-800'
                    }`}>
                      📋 Action: {rec.action}
                    </p>
                    {rec.shops && rec.shops.length > 0 && (
                      <p className="text-xs mt-2 text-gray-600">
                        Affected: {rec.shops.join(', ')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* TOP DEBTORS */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Top 10 Debtors</h2>
            <ArrowTrendingUpIcon className="h-6 w-6 text-red-600" />
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Shop</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Balance</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Limit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {top_debtors && top_debtors.length > 0 ? (
                  top_debtors.map((shop, index) => (
                    <tr
                      key={shop.id}
                      onClick={() => navigate(`/ledger/shop/${shop.id}`)}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 text-sm text-gray-500">{index + 1}</td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900">{shop.shop_name}</div>
                        <div className="text-xs text-gray-500">{shop.shop_code}</div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`text-sm font-semibold ${
                          parseFloat(shop.current_balance) > parseFloat(shop.credit_limit)
                            ? 'text-red-600'
                            : 'text-gray-900'
                        }`}>
                          {formatCurrency(shop.current_balance)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-500">
                        {formatCurrency(shop.credit_limit)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="px-4 py-8 text-center text-gray-500">
                      No debtors found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* RECENT TRANSACTIONS */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Recent Transactions</h2>
            <DocumentTextIcon className="h-6 w-6 text-blue-600" />
          </div>

          <div className="space-y-3">
            {recent_transactions && recent_transactions.length > 0 ? (
              recent_transactions.map((txn) => (
                <div
                  key={txn.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                  onClick={() => navigate(`/ledger/shop/${txn.shop_id}`)}
                >
                  <div className="flex-1">
                    <div className="flex items-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        txn.transaction_type === 'invoice' ? 'bg-red-100 text-red-800' :
                        txn.transaction_type === 'payment' ? 'bg-green-100 text-green-800' :
                        txn.transaction_type === 'adjustment' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {txn.transaction_type}
                      </span>
                      <span className="ml-2 text-xs text-gray-500">{txn.reference_no}</span>
                    </div>
                    <p className="text-sm font-medium text-gray-900 mt-1">{txn.shop_name}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(txn.transaction_date).toLocaleDateString('en-PK')}
                    </p>
                  </div>
                  <div className="text-right">
                    {txn.debit_amount > 0 && (
                      <p className="text-sm font-semibold text-red-600">
                        +{formatCurrency(txn.debit_amount)}
                      </p>
                    )}
                    {txn.credit_amount > 0 && (
                      <p className="text-sm font-semibold text-green-600">
                        -{formatCurrency(txn.credit_amount)}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      Bal: {formatCurrency(txn.balance)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                No recent transactions
              </div>
            )}
          </div>
        </div>
      </div>

      {/* QUICK ACTIONS */}
      <div className="mt-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg shadow-lg p-8 text-white">
        <h2 className="text-2xl font-bold mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <button
            onClick={() => navigate('/ledger')}
            className="bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg p-4 transition-all text-left"
          >
            <ChartBarIcon className="h-8 w-8 mb-2" />
            <p className="font-semibold">Balance Summary</p>
            <p className="text-sm text-white/80">View all shop balances</p>
          </button>

          <button
            onClick={() => navigate('/ledger/aging')}
            className="bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg p-4 transition-all text-left"
          >
            <ClockIcon className="h-8 w-8 mb-2" />
            <p className="font-semibold">Aging Report</p>
            <p className="text-sm text-white/80">Check overdue accounts</p>
          </button>

          <button
            onClick={() => navigate('/ledger/payment/record')}
            className="bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg p-4 transition-all text-left"
          >
            <CurrencyDollarIcon className="h-8 w-8 mb-2" />
            <p className="font-semibold">Record Payment</p>
            <p className="text-sm text-white/80">Collect payment from shop</p>
          </button>

          <button
            onClick={() => navigate('/shops')}
            className="bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg p-4 transition-all text-left"
          >
            <DocumentTextIcon className="h-8 w-8 mb-2" />
            <p className="font-semibold">Shop Management</p>
            <p className="text-sm text-white/80">View all shops</p>
          </button>
        </div>
      </div>
    </div>
  );
};

export default LedgerDashboardPage;
