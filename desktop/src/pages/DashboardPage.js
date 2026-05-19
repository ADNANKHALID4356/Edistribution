import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import dashboardService from '../services/dashboardService';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  HomeIcon,
  UserGroupIcon,
  ShoppingBagIcon,
  TruckIcon,
  ArrowRightOnRectangleIcon,
  MapPinIcon,
  CubeIcon,
  ClipboardDocumentListIcon,
  Cog6ToothIcon,
  ArrowPathIcon,
  ArrowUturnLeftIcon,
  BanknotesIcon,
  DocumentTextIcon,
  DocumentArrowDownIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';

const DashboardPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [stats, setStats] = useState({
    gross_profit: 0,
    net_revenue: 0,
    net_cogs: 0,
    total_return_revenue: 0,
    total_gross_revenue: 0,
    total_collections_received_raw: 0,
    total_shop_ledger_collections_received: 0,
    total_manual_daily_collections: 0,
    total_manual_daily_collections_raw: 0,
    total_manual_daily_collections_deduped: 0,
    duplicate_manual_daily_collections: 0,
    total_orders: 0,
    total_products: 0,
    active_products: 0,
    total_shops: 0,
    active_shops: 0,
    total_salesmen: 0,
    active_salesmen: 0,
    total_warehouses: 0,
    active_warehouses: 0,
    pending_deliveries: 0,
    total_deliveries: 0,
    low_stock_products: 0,
    out_of_stock_products: 0,
    total_stock_quantity: 0,
    total_inventory_value: 0,
    total_warehouse_stock: 0
  });
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [showCashDetails, setShowCashDetails] = useState(false);

  const [dateRange, setDateRange] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchDashboardStats = useCallback(async () => {
    try {
      setLoading(true);
      console.log('ðŸ“Š DashboardPage: Starting fetch...');
      
      const filters = {};
      if (dateRange === 'today') {
        const today = new Date().toISOString().split('T')[0];
        filters.start_date = today;
        filters.end_date = today;
      } else if (dateRange === 'custom') {
        if (startDate) filters.start_date = startDate;
        if (endDate) filters.end_date = endDate;
      }

      const response = await dashboardService.getDashboardStats(filters);
      console.log('ðŸ“Š DashboardPage: Got response:', JSON.stringify(response, null, 2));
      
      if (response && response.success && response.data) {
        const newStats = {
          gross_profit: Number(response.data.gross_profit) || 0,
          net_revenue: Number(response.data.net_revenue) || 0,
          net_cogs: Number(response.data.net_cogs) || 0,
          total_return_revenue: Number(response.data.total_return_revenue) || 0,
          total_gross_revenue: Number(response.data.total_gross_revenue) || 0,
          total_collections_received_raw: Number(response.data.total_collections_received_raw) || 0,
          total_shop_ledger_collections_received: Number(response.data.total_shop_ledger_collections_received) || 0,
          total_manual_daily_collections: Number(response.data.total_manual_daily_collections) || 0,
          total_manual_daily_collections_raw: Number(response.data.total_manual_daily_collections_raw) || 0,
          total_manual_daily_collections_deduped: Number(response.data.total_manual_daily_collections_deduped) || 0,
          duplicate_manual_daily_collections: Number(response.data.duplicate_manual_daily_collections) || 0,
          total_orders: Number(response.data.total_orders) || 0,
          total_products: Number(response.data.total_products) || 0,
          active_products: Number(response.data.active_products) || 0,
          total_shops: Number(response.data.total_shops) || 0,
          active_shops: Number(response.data.active_shops) || 0,
          total_salesmen: Number(response.data.total_salesmen) || 0,
          active_salesmen: Number(response.data.active_salesmen) || 0,
          total_warehouses: Number(response.data.total_warehouses) || 0,
          active_warehouses: Number(response.data.active_warehouses) || 0,
          pending_deliveries: Number(response.data.pending_deliveries) || 0,
          total_deliveries: Number(response.data.total_deliveries) || 0,
          low_stock_products: Number(response.data.low_stock_products) || 0,
          out_of_stock_products: Number(response.data.out_of_stock_products) || 0,
          total_stock_quantity: Number(response.data.total_stock_quantity) || 0,
          total_inventory_value: Number(response.data.total_inventory_value) || 0,
          total_warehouse_stock: Number(response.data.total_warehouse_stock) || 0
        };
        console.log('ðŸ“Š DashboardPage: Setting stats to:', newStats);
        setStats(newStats);
        setLastRefresh(new Date());
      } else {
        console.error('ðŸ“Š DashboardPage: Invalid response structure:', response);
      }
    } catch (error) {
      console.error('ðŸ“Š DashboardPage: Error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

useEffect(() => {
  fetchDashboardStats();
  }, [fetchDashboardStats, dateRange]);
  // Refresh data when navigating back to this page
  useEffect(() => {
    fetchDashboardStats();
  }, [location.key, fetchDashboardStats]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toLocaleString();
  };

  const formatCurrency = (num) => {
    return 'Rs ' + parseFloat(num || 0).toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  const getReportingPeriodLabel = () => {
    if (dateRange === 'today') return new Date().toLocaleDateString();
    if (dateRange === 'custom') return `${startDate || 'Start'} to ${endDate || 'End'}`;
    return 'All Time';
  };

  const getPnLIntegrityChecks = () => {
    const epsilon = 0.01;
    const expectedCollectionsIn = (Number(stats.total_shop_ledger_collections_received) || 0) + (Number(stats.total_manual_daily_collections_deduped) || 0);
    const expectedNetRevenue = expectedCollectionsIn - (Number(stats.total_return_revenue) || 0);
    const expectedGrossProfit = expectedNetRevenue - (Number(stats.net_cogs) || 0);
    const rawCollectionsIn = Number(stats.total_collections_received_raw) || 0;

    return [
      {
        check: 'Collections In = Shop Ledger + Manual Deduped',
        expected: expectedCollectionsIn,
        actual: Number(stats.total_gross_revenue) || 0,
      },
      {
        check: 'Net Cash Revenue = Collections In - Payouts/Refunds',
        expected: expectedNetRevenue,
        actual: Number(stats.net_revenue) || 0,
      },
      {
        check: 'Gross Profit = Net Cash Revenue - COGS',
        expected: expectedGrossProfit,
        actual: Number(stats.gross_profit) || 0,
      },
      {
        check: 'Collections In (Raw) >= Collections In (Deduped)',
        expected: rawCollectionsIn,
        actual: Number(stats.total_gross_revenue) || 0,
        comparator: 'gte',
      },
    ].map((item) => {
      const passed = item.comparator === 'gte'
        ? item.expected + epsilon >= item.actual
        : Math.abs(item.expected - item.actual) <= epsilon;
      return { ...item, passed };
    });
  };

  const currentRole = user?.role_name || user?.role || '';
  const hasRole = (...allowed) => allowed.includes(currentRole);
  const canViewFinancialDashboard = hasRole('Admin', 'Senior Manager', 'Accountant');

  const exportToPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(40, 40, 40);
    doc.text('Ummah Tech Innovations', pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(16);
    doc.setTextColor(60, 60, 60);
    doc.text('Executive Dashboard Report', pageWidth / 2, 30, { align: 'center' });
    
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    let dateStr = 'All Time';
    if (dateRange === 'today') dateStr = new Date().toLocaleDateString();
    else if (dateRange === 'custom') dateStr = `${startDate || 'Start'} to ${endDate || 'End'}`;
    
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 45);
    doc.text(`Reporting Period: ${dateStr}`, 14, 52);
    doc.text(`Prepared by: ${user?.full_name || 'Admin'}`, 14, 59);

    // Separator line
    doc.setDrawColor(200, 200, 200);
    doc.line(14, 65, pageWidth - 14, 65);
    
    // Financial Overview Table
    doc.setFontSize(14);
    doc.setTextColor(40, 40, 40);
    doc.text('Financial Overview', 14, 78);

    autoTable(doc, {
      startY: 85,
      head: [['Metric', 'Value']],
      body: [
        ['Gross Profit', formatCurrency(stats.gross_profit)],
        ['Net Cash Revenue', formatCurrency(stats.net_revenue)],
        ['Total Collections In (Deduped)', formatCurrency(stats.total_gross_revenue)],
        ['Total Collections In (Raw)', formatCurrency(stats.total_collections_received_raw)],
        ['Shop Ledger Collections', formatCurrency(stats.total_shop_ledger_collections_received)],
        ['Manual Collections (Raw)', formatCurrency(stats.total_manual_daily_collections_raw)],
        ['Manual Collections (Deduped)', formatCurrency(stats.total_manual_daily_collections_deduped)],
        ['Dedup Excluded', formatCurrency(stats.duplicate_manual_daily_collections)],
        ['Total Payouts/Refunds', formatCurrency(stats.total_return_revenue)],
        ['Total COGS', formatCurrency(stats.net_cogs)]
      ],
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] },
      styles: { fontSize: 11, cellPadding: 6 }
    });

    // Operational Metrics Table
    doc.setFontSize(14);
    doc.setTextColor(40, 40, 40);
    let finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY : 150;
    doc.text('Operational Metrics', 14, finalY + 15);

    autoTable(doc, {
      startY: finalY + 22,
      head: [['Metric', 'Value']],
      body: [
        ['Total Products (Active)', `${stats.active_products || stats.total_products} / ${stats.total_products}`],
        ['Total Orders', stats.total_orders],
        ['Total Deliveries', stats.total_deliveries || 0],
        ['Total Shops', stats.active_shops || stats.total_shops],
        ['Total Salesmen', stats.active_salesmen || stats.total_salesmen],
        ['Total Warehouses', stats.active_warehouses || stats.total_warehouses],
        ['Inventory Value', formatCurrency(stats.total_inventory_value)],
        ['Total Stock Quantity', formatNumber(stats.total_stock_quantity)]
      ],
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] },
      styles: { fontSize: 11, cellPadding: 6 }
    });
    
    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        doc.setTextColor(150, 150, 150);
        doc.text(`Page ${i} of ${pageCount}`, pageWidth - 20, doc.internal.pageSize.height - 10, { align: 'right' });
    }

    doc.save(`Dashboard_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const exportPnLPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const reportDate = new Date().toLocaleString();
    const reportingPeriod = getReportingPeriodLabel();
    const integrityChecks = getPnLIntegrityChecks();
    const failedChecks = integrityChecks.filter((row) => !row.passed).length;

    doc.setFontSize(20);
    doc.setTextColor(30, 41, 59);
    doc.text('Profit & Loss Report (Cash Basis)', pageWidth / 2, 18, { align: 'center' });
    doc.setFontSize(11);
    doc.setTextColor(100, 116, 139);
    doc.text('Enterprise Distribution Management System', pageWidth / 2, 25, { align: 'center' });
    doc.text(`Generated: ${reportDate}`, 14, 34);
    doc.text(`Reporting Period: ${reportingPeriod}`, 14, 40);
    doc.text(`Prepared By: ${user?.full_name || 'Admin'}`, 14, 46);
    doc.text('Recognition Basis: Cash (Payment Collections)', 14, 52);
    doc.text('Dedup Policy: Manual collections excluded only when reference matches a ledger payment.', 14, 58);

    autoTable(doc, {
      startY: 66,
      head: [['P&L Summary Metric', 'Amount']],
      body: [
        ['Collections In (Deduped)', formatCurrency(stats.total_gross_revenue)],
        ['Payouts / Refunds', formatCurrency(stats.total_return_revenue)],
        ['Net Cash Revenue', formatCurrency(stats.net_revenue)],
        ['COGS', formatCurrency(stats.net_cogs)],
        ['Gross Profit', formatCurrency(stats.gross_profit)],
      ],
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235] },
      styles: { fontSize: 11, cellPadding: 5 },
    });

    let finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY : 110;
    autoTable(doc, {
      startY: finalY + 10,
      head: [['Collection Source Breakdown', 'Amount']],
      body: [
        ['Shop Ledger Collections', formatCurrency(stats.total_shop_ledger_collections_received)],
        ['Manual Collections (Raw)', formatCurrency(stats.total_manual_daily_collections_raw)],
        ['Manual Collections (Deduped)', formatCurrency(stats.total_manual_daily_collections_deduped)],
        ['Duplicates Excluded', formatCurrency(stats.duplicate_manual_daily_collections)],
        ['Collections In (Raw)', formatCurrency(stats.total_collections_received_raw)],
      ],
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] },
      styles: { fontSize: 10, cellPadding: 4 },
    });

    finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY : finalY + 70;
    autoTable(doc, {
      startY: finalY + 10,
      head: [['Data Integrity Check', 'Expected', 'Actual', 'Status']],
      body: integrityChecks.map((row) => [
        row.check,
        formatCurrency(row.expected),
        formatCurrency(row.actual),
        row.passed ? 'PASS' : 'FAIL',
      ]),
      theme: 'grid',
      headStyles: { fillColor: [15, 118, 110] },
      styles: { fontSize: 9, cellPadding: 4 },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 3) {
          data.cell.styles.textColor = data.cell.raw === 'PASS' ? [22, 101, 52] : [153, 27, 27];
          data.cell.styles.fontStyle = 'bold';
        }
      },
    });

    finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY : finalY + 60;
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text(
      failedChecks === 0
        ? 'All integrity checks passed. Financial figures are internally consistent.'
        : `Warning: ${failedChecks} integrity check(s) failed. Please investigate before publishing.`,
      14,
      finalY + 10
    );

    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184);
      doc.text(`Page ${i} of ${pageCount}`, pageWidth - 20, doc.internal.pageSize.height - 10, { align: 'right' });
    }

    doc.save(`PnL_Cash_Basis_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // Use ACTIVE counts to match what users see on management pages (which filter by is_active=true by default)
  const statsCards = [
    { name: 'Total Products', value: stats.active_products || stats.total_products, icon: TruckIcon, gradient: 'from-emerald-400 to-emerald-600', bgLight: 'bg-emerald-50', borderColor: 'border-emerald-200', link: '/products', roles: ['Admin', 'Senior Manager', 'Stock Manager'] },
    { name: 'Total Orders', value: stats.total_orders, icon: ShoppingBagIcon, gradient: 'from-violet-400 to-violet-600', bgLight: 'bg-violet-50', borderColor: 'border-violet-200', link: '/orders', roles: ['Admin', 'Senior Manager', 'Manager'] },
    { name: 'Total Deliveries', value: stats.total_deliveries || 0, icon: ClipboardDocumentListIcon, gradient: 'from-orange-400 to-orange-600', bgLight: 'bg-orange-50', borderColor: 'border-orange-200', link: '/deliveries', roles: ['Admin', 'Senior Manager', 'Manager'] },
    { name: 'Total Shops', value: stats.active_shops || stats.total_shops, icon: HomeIcon, gradient: 'from-amber-400 to-amber-600', bgLight: 'bg-amber-50', borderColor: 'border-amber-200', link: '/shops', roles: ['Admin', 'Senior Manager', 'Manager'] },
    { name: 'Total Salesmen', value: stats.active_salesmen || stats.total_salesmen, icon: UserGroupIcon, gradient: 'from-indigo-400 to-indigo-600', bgLight: 'bg-indigo-50', borderColor: 'border-indigo-200', link: '/salesmen', roles: ['Admin', 'Senior Manager', 'Manager'] },
    { name: 'Total Warehouses', value: stats.active_warehouses || stats.total_warehouses, icon: CubeIcon, gradient: 'from-teal-400 to-teal-600', bgLight: 'bg-teal-50', borderColor: 'border-teal-200', link: '/warehouses', roles: ['Admin', 'Senior Manager', 'Manager'] },
  ].filter((card) => hasRole(...card.roles));

  const headerBtn =
    'inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 shadow-md shadow-primary-200">
                <TruckIcon className="h-6 w-6 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-base font-bold text-gray-800 sm:text-lg lg:max-w-md xl:max-w-xl">
                  Enterprise Distribution Management
                </h1>
                <a
                  href="https://ummahtechinnovations.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-primary-600 hover:text-primary-700 hover:underline"
                >
                  UmmahTechInnovations
                </a>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-2.5">
              {canViewFinancialDashboard && (
                <div
                  className="inline-flex h-10 items-stretch overflow-hidden rounded-lg border border-gray-200 bg-gray-50 shadow-sm"
                  role="group"
                  aria-label="Export reports"
                >
                  <button
                    type="button"
                    onClick={exportPnLPDF}
                    className="inline-flex items-center gap-1.5 border-r border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:z-10 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
                    title="Export P&L report as PDF"
                  >
                    <DocumentArrowDownIcon className="h-4 w-4 text-primary-600" />
                    <span className="hidden md:inline">P&amp;L PDF</span>
                    <span className="md:hidden">P&amp;L</span>
                  </button>
                  <button
                    type="button"
                    onClick={exportToPDF}
                    className="inline-flex items-center gap-1.5 bg-white px-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:z-10 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
                    title="Export full dashboard as PDF"
                  >
                    <DocumentArrowDownIcon className="h-4 w-4 text-gray-500" />
                    <span className="hidden md:inline">Dashboard PDF</span>
                    <span className="md:hidden">PDF</span>
                  </button>
                </div>
              )}
              <button
                type="button"
                onClick={fetchDashboardStats}
                className={headerBtn}
                title={`Last refresh: ${lastRefresh.toLocaleTimeString()}`}
              >
                <ArrowPathIcon className={`h-4 w-4 text-primary-600 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
              <div className="hidden h-8 w-px bg-gray-200 sm:block" aria-hidden="true" />
              <div className="flex h-10 items-center gap-2 rounded-lg border border-gray-200 bg-white pl-1.5 pr-1 shadow-sm">
                <div className="hidden items-center gap-2 sm:flex">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-xs font-bold text-white">
                    {user?.full_name?.charAt(0) || 'U'}
                  </div>
                  <div className="max-w-[140px] min-w-0 text-left lg:max-w-[180px]">
                    <p className="truncate text-sm font-semibold leading-tight text-gray-800">{user?.full_name}</p>
                    <p className="truncate text-xs font-medium text-primary-600">{user?.role}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-2.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 sm:px-3"
                  title="Sign out"
                >
                  <ArrowRightOnRectangleIcon className="h-4 w-4" />
                  <span className="sm:inline">Logout</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Card */}
        <div className="relative overflow-hidden bg-gradient-to-r from-primary-600 via-primary-700 to-indigo-700 rounded-2xl shadow-2xl shadow-primary-200 p-8 mb-10 flex flex-col md:flex-row justify-between items-start md:items-center">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
          <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-32 h-32 bg-white/10 rounded-full blur-xl"></div>
          
          <div className="relative z-10 w-full md:w-auto mb-6 md:mb-0">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-4xl">👋</span>
              <h2 className="text-3xl font-bold text-white">
                Welcome back, {user?.full_name}!
              </h2>
            </div>
            <p className="text-primary-100 text-lg">
              You're logged in as <span className="font-bold text-white bg-white/20 px-3 py-1 rounded-full text-sm">{user?.role}</span>
            </p>
          </div>

          <div className="relative z-10 flex flex-col sm:flex-row items-center gap-3 bg-white/10 p-4 rounded-xl backdrop-blur-sm w-full md:w-auto">
            <select 
              value={dateRange} 
              onChange={(e) => setDateRange(e.target.value)} 
              className="w-full sm:w-auto bg-white/20 border border-white/30 text-white text-sm rounded-lg focus:ring-2 focus:ring-white/50 focus:border-transparent block p-2.5 outline-none font-medium appearance-none cursor-pointer"
              style={{ colorScheme: 'dark' }}
            >
              <option value="today" className="text-gray-900 font-medium">Today</option>
              <option value="all" className="text-gray-900 font-medium">All Time</option>
              <option value="custom" className="text-gray-900 font-medium">Custom Date</option>
            </select>
            
            {dateRange === 'custom' && (
              <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)} 
                  className="bg-white/20 border border-white/30 text-white text-sm rounded-lg focus:ring-2 focus:ring-white/50 block p-2.5 outline-none font-medium"
                  style={{ colorScheme: 'dark' }}
                />
                <span className="text-white/80 font-medium">to</span>
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)} 
                  className="bg-white/20 border border-white/30 text-white text-sm rounded-lg focus:ring-2 focus:ring-white/50 block p-2.5 outline-none font-medium"
                  style={{ colorScheme: 'dark' }}
                />
              </div>
            )}
            
            <button 
              onClick={fetchDashboardStats} 
              className="w-full sm:w-auto bg-white text-primary-700 hover:bg-gray-50 focus:ring-4 focus:ring-primary-300 font-bold rounded-lg text-sm px-6 py-2.5 focus:outline-none transition-all shadow-sm active:scale-95"
            >
              Apply Filter
            </button>
          </div>
        </div>

        {/* Section Title */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-800">
              {canViewFinancialDashboard ? 'Financial & Dashboard Overview' : 'Dashboard Overview'}
            </h3>
            <p className="text-sm text-gray-500">Key metrics and system statistics</p>
          </div>
          <div className="text-xs text-gray-400 bg-white px-3 py-1.5 rounded-full shadow-sm border border-gray-100">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </div>
        </div>

        {/* Financial Grid */}
        {canViewFinancialDashboard && (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-3">
            {loading ? null : (
              <>
                <div className="bg-white rounded-2xl shadow-md p-5 border border-indigo-100 flex flex-col justify-center">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Collections In</p>
                  <p className="text-xl font-bold text-indigo-700">{formatCurrency(stats.total_gross_revenue)}</p>
                </div>
                <div className="bg-white rounded-2xl shadow-md p-5 border border-red-100 flex flex-col justify-center">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Payouts / Refunds</p>
                  <p className="text-xl font-bold text-red-600">{formatCurrency(stats.total_return_revenue)}</p>
                </div>
                <div className="bg-white rounded-2xl shadow-md p-5 border border-blue-100 flex flex-col justify-center">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Net Cash Revenue</p>
                  <p className="text-xl font-bold text-blue-700">{formatCurrency(stats.net_revenue)}</p>
                </div>
                <div className="bg-white rounded-2xl shadow-md p-5 border border-orange-100 flex flex-col justify-center">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">COGS</p>
                  <p className="text-xl font-bold text-orange-600">{formatCurrency(stats.net_cogs)}</p>
                </div>
                <div className="bg-white rounded-2xl shadow-md p-5 border border-emerald-100 flex flex-col justify-center">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Gross Profit</p>
                  <p className="text-xl font-bold text-emerald-600">{formatCurrency(stats.gross_profit)}</p>
                </div>
              </>
            )}
          </div>
        )}
        {canViewFinancialDashboard && !loading && (
          <div className="bg-white rounded-2xl shadow-sm p-3 border border-gray-100 mb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              <p className="text-sm text-gray-600">
                Cash-basis P&L uses anti-double-counting by matching manual collection references with shop-ledger payments.
                <span className="ml-2 font-semibold text-red-600">
                  Excluded: {formatCurrency(stats.duplicate_manual_daily_collections)}
                </span>
              </p>
              <button
                onClick={() => setShowCashDetails((prev) => !prev)}
                className="self-start md:self-auto text-sm font-medium text-primary-700 hover:text-primary-800"
              >
                {showCashDetails ? 'Hide Details' : 'View Details'}
              </button>
            </div>
            {showCashDetails && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-sm mt-3">
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-gray-500">Shop Ledger Collections</p>
                  <p className="font-bold text-gray-800">{formatCurrency(stats.total_shop_ledger_collections_received)}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-gray-500">Manual Collections (Raw)</p>
                  <p className="font-bold text-gray-800">{formatCurrency(stats.total_manual_daily_collections_raw)}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-gray-500">Manual Collections (Deduped)</p>
                  <p className="font-bold text-gray-800">{formatCurrency(stats.total_manual_daily_collections_deduped)}</p>
                </div>
                <div className="rounded-lg bg-indigo-50 p-3 border border-indigo-100">
                  <p className="text-indigo-500">Collections In (Raw)</p>
                  <p className="font-bold text-indigo-700">{formatCurrency(stats.total_collections_received_raw)}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
          {loading ? (
            <div className="col-span-4 text-center py-16">
              <div className="inline-flex items-center gap-3 text-gray-500">
                <ArrowPathIcon className="h-6 w-6 animate-spin text-primary-500" />
                <span className="text-lg">Loading statistics...</span>
              </div>
            </div>
          ) : (
            statsCards.map((stat, index) => (
              <div 
                key={stat.name} 
                className={`group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl p-6 cursor-pointer border ${stat.borderColor} overflow-hidden transition-all duration-300 hover:-translate-y-1`}
                onClick={() => navigate(stat.link)}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`bg-gradient-to-br ${stat.gradient} rounded-xl p-3 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                      <stat.icon className="h-6 w-6 text-white" />
                    </div>
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-primary-100 transition-colors">
                      <svg className="h-4 w-4 text-gray-400 group-hover:text-primary-600 group-hover:translate-x-0.5 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-sm font-medium text-gray-500 mb-1">{stat.name}</p>
                  <p className="text-3xl font-bold text-gray-800">{stat.value}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="px-6 py-5 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center shadow-md">
                <Cog6ToothIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800">Quick Actions</h3>
                <p className="text-xs text-gray-500">Shortcuts to frequently used features</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {hasRole('Admin', 'Senior Manager', 'Manager') && (
                <button 
                  onClick={() => navigate('/routes')}
                  className="group flex items-center justify-center px-6 py-5 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl hover:from-green-100 hover:to-emerald-100 hover:border-green-400 hover:shadow-lg hover:shadow-green-100 transition-all duration-300"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center mr-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <MapPinIcon className="h-6 w-6 text-white" />
                  </div>
                  <div className="text-left">
                    <span className="font-bold text-gray-800 text-lg">Manage Routes</span>
                    <p className="text-xs text-gray-500">Configure delivery routes</p>
                  </div>
                </button>
              )}
              {hasRole('Admin', 'Senior Manager', 'Manager', 'Stock Manager') && (
                <button 
                  onClick={() => navigate('/stock-returns')}
                  className="group flex items-center justify-center px-6 py-5 bg-gradient-to-br from-amber-50 to-yellow-50 border-2 border-amber-200 rounded-2xl hover:from-amber-100 hover:to-yellow-100 hover:border-amber-400 hover:shadow-lg hover:shadow-amber-100 transition-all duration-300"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-xl flex items-center justify-center mr-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <ArrowUturnLeftIcon className="h-6 w-6 text-white" />
                  </div>
                  <div className="text-left">
                    <span className="font-bold text-gray-800 text-lg">Stock Returns</span>
                    <p className="text-xs text-gray-500">Process delivery returns</p>
                  </div>
                </button>
              )}
              {hasRole('Admin', 'Senior Manager', 'Accountant') && (
                <button 
                  onClick={() => navigate('/daily-collections')}
                  className="group flex items-center justify-center px-6 py-5 bg-gradient-to-br from-teal-50 to-cyan-50 border-2 border-teal-200 rounded-2xl hover:from-teal-100 hover:to-cyan-100 hover:border-teal-400 hover:shadow-lg hover:shadow-teal-100 transition-all duration-300"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-xl flex items-center justify-center mr-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <BanknotesIcon className="h-6 w-6 text-white" />
                  </div>
                  <div className="text-left">
                    <span className="font-bold text-gray-800 text-lg">Daily Collections</span>
                    <p className="text-xs text-gray-500">Track daily received amounts</p>
                  </div>
                </button>
              )}
              {hasRole('Admin', 'Senior Manager', 'Manager', 'Accountant') && (
                <button 
                  onClick={() => navigate('/routes/consolidated-bill')}
                  className="group flex items-center justify-center px-6 py-5 bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-2xl hover:from-indigo-100 hover:to-purple-100 hover:border-indigo-400 hover:shadow-lg hover:shadow-indigo-100 transition-all duration-300"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-xl flex items-center justify-center mr-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <DocumentTextIcon className="h-6 w-6 text-white" />
                  </div>
                  <div className="text-left">
                    <span className="font-bold text-gray-800 text-lg">Consolidated Bill</span>
                    <p className="text-xs text-gray-500">Route-wise billing report</p>
                  </div>
                </button>
              )}
              {hasRole('Admin', 'Senior Manager', 'Manager') && (
                <button 
                  onClick={() => navigate('/settings/company')}
                  className="group flex items-center justify-center px-6 py-5 bg-gradient-to-br from-slate-50 to-gray-50 border-2 border-gray-200 rounded-2xl hover:from-slate-100 hover:to-gray-100 hover:border-gray-400 hover:shadow-lg hover:shadow-gray-100 transition-all duration-300"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-slate-400 to-gray-500 rounded-xl flex items-center justify-center mr-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <Cog6ToothIcon className="h-6 w-6 text-white" />
                  </div>
                  <div className="text-left">
                    <span className="font-bold text-gray-800 text-lg">Settings</span>
                    <p className="text-xs text-gray-500">System configuration</p>
                  </div>
                </button>
              )}
              {hasRole('Admin', 'Senior Manager') && (
                <button
                  onClick={() => navigate('/users')}
                  className="group flex items-center justify-center px-6 py-5 bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-2xl hover:from-blue-100 hover:to-cyan-100 hover:border-blue-400 hover:shadow-lg hover:shadow-blue-100 transition-all duration-300"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mr-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <UsersIcon className="h-6 w-6 text-white" />
                  </div>
                  <div className="text-left">
                    <span className="font-bold text-gray-800 text-lg">Manage Users</span>
                    <p className="text-xs text-gray-500">Users and credentials</p>
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>


      </main>
    </div>
  );
};

export default DashboardPage;


