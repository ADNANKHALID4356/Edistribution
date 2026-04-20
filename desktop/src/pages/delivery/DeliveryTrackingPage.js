// Delivery Tracking Page
// Purpose: Track and manage all delivery challans

import React, { useState, useEffect } from 'react';
import { useToast } from '../../context/ToastContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Truck, Package, Eye, Filter, 
  Clock, CheckCircle, 
  XCircle, RotateCcw, ArrowLeft, Plus, Search,
  AlertCircle, FileText, Edit, Printer, Download
} from 'lucide-react';
import deliveryService from '../../services/deliveryService';
import warehouseService from '../../services/warehouseService';
import settingsService from '../../services/settingsService';

const DeliveryTrackingPage = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [deliveries, setDeliveries] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [companySettings, setCompanySettings] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
      
  // Bulk delete states
  const [selectedDeliveries, setSelectedDeliveries] = useState(new Set());
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  
  // Filters
  const [filters, setFilters] = useState({
    status: 'all',
    warehouse_id: '',
    route_id: '',
    driver_name: '',
    from_date: '',
    to_date: '',
    search: ''
  });
  
  // Status update data
  const [statusUpdate, setStatusUpdate] = useState({
    status: '',
    delivered_date: '',
    received_by: '',
    notes: ''
  });

  const loadCompanySettings = async () => {
    try {
      console.log('🔄 Loading company settings...');
      const response = await settingsService.getCompanySettings();
      console.log('📦 Company settings API response:', response);
      if (response.success && response.data) {
        console.log('✅ Setting company data:', response.data);
        setCompanySettings(response.data);
      } else {
        console.warn('⚠️ No company data in response');
      }
    } catch (error) {
      console.error('❌ Error loading company settings:', error);
    }
  };

  useEffect(() => {
    fetchDeliveries();
    fetchStatistics();
    fetchWarehouses();
    loadCompanySettings();

    // Show success message if coming from challan creation
    if (location.state?.newChallanId) {
      setMessage({ type: 'success', text: 'Delivery challan created successfully!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, filters]);  const fetchDeliveries = async () => {
    try {
      setLoading(true);
      const queryFilters = {
        page: currentPage,
        limit: 20,
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, v]) => v !== '' && v !== 'all')
        )
      };
      
      const response = await deliveryService.getAllDeliveries(queryFilters);
      setDeliveries(response.data || []);
      setTotalPages(response.pagination?.totalPages || 1);
      setTotalRecords(response.pagination?.totalRecords || 0);
      setCurrentPage(response.pagination?.currentPage || 1);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to load deliveries' });
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await deliveryService.getDeliveryStatistics();
      setStatistics(response.data || {});
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const response = await warehouseService.getAllWarehouses();
      setWarehouses(response.data || []);
    } catch (error) {
      console.error('Error fetching warehouses:', error);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setCurrentPage(1); // Reset to first page on filter change
  };

  const clearFilters = () => {
    setFilters({
      status: 'all',
      warehouse_id: '',
      route_id: '',
      driver_name: '',
      from_date: '',
      to_date: '',
      search: ''
    });
    setCurrentPage(1);
  };

  const handleViewDetails = async (delivery) => {
    try {
      const response = await deliveryService.getDeliveryById(delivery.id);
      
      let deliveryData = response.data;
      
      // FALLBACK: If the backend hasn't been restarted/deployed to include the shop balance 
      // dynamically in getById, fetch it directly here to ensure it's always printed on the PDF
      if (deliveryData && deliveryData.shop_id && deliveryData.shop_current_balance === undefined) {
        try {
          const shopService = require('../../services/shopService').default;
          const shopResponse = await shopService.getShopById(deliveryData.shop_id);
          if (shopResponse && shopResponse.data && shopResponse.data.current_balance !== undefined) {
            deliveryData.shop_current_balance = shopResponse.data.current_balance;
          }
        } catch (shopErr) {
          console.error('Failed to fetch shop details for ledger fallback:', shopErr);
        }
      }

      setSelectedDelivery(deliveryData);
      setShowDetailsModal(true);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to load delivery details' });
    }
  };

  const handlePrintChallan = () => {
    console.log('🖨️ Print button clicked');
    
    if (!selectedDelivery) {
      showToast('No delivery selected', 'error');
      setTimeout(() => {}, 5000);
      return;
    }
    
    try {
      const printWindow = window.open('', '_blank');
      
      if (!printWindow) {
        showToast('Pop-up blocked! Please allow pop-ups.', 'error');
        setTimeout(() => {}, 5000);
        return;
      }

      // Calculate effective discount
      const sub = parseFloat(selectedDelivery.subtotal || 0);
      const gt = parseFloat(selectedDelivery.grand_total || selectedDelivery.total_amount || 0);
      const storedDiscount = parseFloat(selectedDelivery.discount_amount || 0);
      const effectiveDiscount = storedDiscount > 0 ? storedDiscount : (sub > gt ? sub - gt : 0);
      const effectiveDiscountPct = sub > 0 && effectiveDiscount > 0 ? (effectiveDiscount / sub * 100) : 0;
      
      printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Delivery Challan - ${selectedDelivery.challan_number}</title>
          <meta charset="utf-8">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            
            @page {
              size: A4;
              margin: 15mm 15mm 15mm 15mm;
            }
            
            body {
              font-family: 'Segoe UI', Arial, sans-serif;
              width: 210mm;
              min-height: 297mm;
              margin: 0 auto;
              padding: 15mm;
              background: white;
              color: #1a1a1a;
              font-size: 11pt;
              line-height: 1.5;
            }
            
            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              border-bottom: 3px solid #1e40af;
              padding-bottom: 15px;
              margin-bottom: 20px;
            }
            .header-left { flex: 1; }
            .company-name {
              font-size: 22pt;
              font-weight: 700;
              color: #1e40af;
              margin-bottom: 4px;
            }
            .company-details {
              font-size: 9pt;
              color: #555;
              line-height: 1.5;
            }
            .header-right {
              text-align: right;
            }
            .doc-title {
              font-size: 18pt;
              font-weight: 700;
              color: #1e40af;
              margin-bottom: 5px;
            }
            .challan-number {
              font-size: 12pt;
              font-weight: 600;
              color: #333;
            }
            .challan-date {
              font-size: 10pt;
              color: #666;
              margin-top: 3px;
            }
            .status-badge {
              display: inline-block;
              padding: 3px 12px;
              border-radius: 12px;
              font-size: 9pt;
              font-weight: 600;
              text-transform: uppercase;
              margin-top: 5px;
              background: #dcfce7;
              color: #166534;
            }
            
            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 15px;
              margin-bottom: 20px;
            }
            .info-box {
              border: 1px solid #e5e7eb;
              border-radius: 6px;
              padding: 12px 15px;
            }
            .info-box-title {
              font-size: 9pt;
              font-weight: 700;
              text-transform: uppercase;
              color: #1e40af;
              margin-bottom: 8px;
              padding-bottom: 5px;
              border-bottom: 1px solid #e5e7eb;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              padding: 2px 0;
              font-size: 10pt;
            }
            .info-label {
              font-weight: 600;
              color: #555;
              min-width: 40%;
            }
            .info-value {
              text-align: right;
              color: #1a1a1a;
            }
            
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
              font-size: 10pt;
            }
            .items-table thead th {
              background: #1e40af;
              color: white;
              padding: 8px 10px;
              text-align: left;
              font-weight: 600;
              font-size: 9pt;
              text-transform: uppercase;
            }
            .items-table thead th.right { text-align: right; }
            .items-table tbody td {
              padding: 7px 10px;
              border-bottom: 1px solid #e5e7eb;
            }
            .items-table tbody td.right { text-align: right; }
            .items-table tbody td.discount { text-align: right; color: #dc2626; }
            .items-table tbody tr:nth-child(even) { background: #f8fafc; }
            .items-table tfoot td {
              padding: 8px 10px;
              font-weight: 700;
              border-top: 2px solid #1e40af;
            }
            
            .financial-section {
              width: 55%;
              margin-left: auto;
              margin-bottom: 25px;
            }
            .fin-row {
              display: flex;
              justify-content: space-between;
              padding: 5px 10px;
              font-size: 10pt;
            }
            .fin-row.border { border-bottom: 1px solid #e5e7eb; }
            .fin-row.discount { color: #dc2626; }
            .fin-row.total {
              background: #1e40af;
              color: white;
              font-weight: 700;
              font-size: 13pt;
              padding: 10px 15px;
              border-radius: 5px;
              margin-top: 8px;
            }
            
            .signatures {
              display: grid;
              grid-template-columns: 1fr 1fr 1fr 1fr;
              gap: 20px;
              margin-top: 40px;
              padding-top: 15px;
              border-top: 1px solid #e5e7eb;
            }
            .sig-box { text-align: center; }
            .sig-line {
              border-bottom: 1px solid #333;
              height: 50px;
              margin-bottom: 5px;
            }
            .sig-label { font-size: 9pt; font-weight: 600; color: #333; }
            .sig-role { font-size: 8pt; color: #888; }
            
            .footer {
              text-align: center;
              margin-top: 30px;
              padding-top: 10px;
              border-top: 2px solid #1e40af;
              font-size: 9pt;
              color: #888;
            }
            
            @media print {
              body { width: auto; padding: 0; min-height: auto; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          
          <!-- Header -->
          <div class="header">
            <div class="header-left">
              <div class="company-name">${companySettings?.company_name || 'COMPANY NAME'}</div>
              <div class="company-details">
                ${companySettings?.company_address || 'Address'}<br>
                Tel: ${companySettings?.company_phone || 'N/A'} | Email: ${companySettings?.company_email || 'N/A'}
              </div>
            </div>
            <div class="header-right">
              <div class="doc-title">DELIVERY CHALLAN</div>
              <div class="challan-number">${selectedDelivery.challan_number}</div>
              <div class="challan-date">Date: ${new Date(selectedDelivery.delivery_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
              <div class="status-badge">${selectedDelivery.status.replace('_', ' ')}</div>
            </div>
          </div>
          
          <!-- Info Grid -->
          <div class="info-grid">
            <div class="info-box">
              <div class="info-box-title">Customer Details</div>
              <div class="info-row"><span class="info-label">Shop:</span><span class="info-value">${selectedDelivery.shop_name}</span></div>
              <div class="info-row"><span class="info-label">Address:</span><span class="info-value">${selectedDelivery.shop_address || 'N/A'}</span></div>
              <div class="info-row"><span class="info-label">Contact:</span><span class="info-value">${selectedDelivery.shop_contact || 'N/A'}</span></div>
              ${selectedDelivery.salesman_name ? `<div class="info-row"><span class="info-label">Salesman:</span><span class="info-value">${selectedDelivery.salesman_name}</span></div>` : ''}
              ${selectedDelivery.route_name ? `<div class="info-row"><span class="info-label">Route:</span><span class="info-value">${selectedDelivery.route_name}</span></div>` : ''}
            </div>
            <div class="info-box">
              <div class="info-box-title">Delivery Details</div>
              <div class="info-row"><span class="info-label">Driver:</span><span class="info-value">${selectedDelivery.driver_name || 'N/A'}</span></div>
              <div class="info-row"><span class="info-label">Phone:</span><span class="info-value">${selectedDelivery.driver_phone || 'N/A'}</span></div>
              <div class="info-row"><span class="info-label">Vehicle:</span><span class="info-value">${selectedDelivery.vehicle_number || 'N/A'} ${selectedDelivery.vehicle_type ? '(' + selectedDelivery.vehicle_type + ')' : ''}</span></div>
              ${selectedDelivery.driver_cnic ? `<div class="info-row"><span class="info-label">CNIC:</span><span class="info-value">${selectedDelivery.driver_cnic}</span></div>` : ''}
              <div class="info-row"><span class="info-label">Warehouse:</span><span class="info-value">${selectedDelivery.warehouse_name || 'N/A'}</span></div>
            </div>
          </div>
          
          <!-- Items Table -->
          <table class="items-table">
            <thead>
              <tr>
                <th style="width:30px">#</th>
                <th>Product</th>
                <th style="width:60px">Code</th>
                <th class="right" style="width:60px">Qty</th>
                <th class="right" style="width:80px">Unit Price</th>
                <th class="right" style="width:80px">Discount %</th>
                <th class="right" style="width:90px">Total</th>
              </tr>
            </thead>
            <tbody>
              ${(selectedDelivery.items || []).map((item, index) => {
                const qty = parseFloat(item.quantity_delivered || item.quantity_ordered || 0);
                const price = parseFloat(item.unit_price || 0);
                const grossTotal = qty * price;
                const itemTotal = parseFloat(item.total_price || 0);
                const itemDiscountAmt = parseFloat(item.discount_amount || 0);
                const itemDiscountPct = parseFloat(item.discount_percentage || 0);
                const effectiveItemDiscount = itemDiscountAmt > 0 ? itemDiscountAmt : (grossTotal > itemTotal ? grossTotal - itemTotal : 0);
                const effectiveItemDiscountPct = itemDiscountPct > 0 ? itemDiscountPct : (grossTotal > 0 && effectiveItemDiscount > 0 ? (effectiveItemDiscount / grossTotal * 100) : 0);
                return `
              <tr>
                <td>${index + 1}</td>
                <td>${item.product_name}</td>
                <td>${item.product_code || '-'}</td>
                <td class="right">${qty}</td>
                <td class="right">Rs. ${price.toFixed(2)}</td>
                <td class="discount">${effectiveItemDiscount > 0 ? effectiveItemDiscountPct.toFixed(1) + '% (-Rs. ' + effectiveItemDiscount.toFixed(2) + ')' : '-'}</td>
                <td class="right"><strong>Rs. ${itemTotal.toFixed(2)}</strong></td>
              </tr>`;
              }).join('')}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3" style="text-align:right">Total Items: ${(selectedDelivery.items || []).length}</td>
                <td class="right">${parseFloat(selectedDelivery.total_quantity || 0)}</td>
                <td colspan="2"></td>
                <td class="right">Rs. ${sub.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
          
          <!-- Financial Summary -->
          <div class="financial-section">
            <div class="fin-row border">
              <span>Items Subtotal:</span>
              <span>Rs. ${sub.toFixed(2)}</span>
            </div>
            ${effectiveDiscount > 0 ? `
            <div class="fin-row border discount">
              <span>Discount (${effectiveDiscountPct.toFixed(2)}%):</span>
              <span>- Rs. ${effectiveDiscount.toFixed(2)}</span>
            </div>
            ` : ''}
            ${parseFloat(selectedDelivery.tax_amount || 0) > 0 ? `
            <div class="fin-row border">
              <span>Tax (${parseFloat(selectedDelivery.tax_percentage || 0).toFixed(1)}%):</span>
              <span>+ Rs. ${parseFloat(selectedDelivery.tax_amount || 0).toFixed(2)}</span>
            </div>
            ` : ''}
            ${parseFloat(selectedDelivery.shipping_charges || 0) > 0 ? `
            <div class="fin-row border">
              <span>Shipping Charges:</span>
              <span>+ Rs. ${parseFloat(selectedDelivery.shipping_charges || 0).toFixed(2)}</span>
            </div>
            ` : ''}
            ${parseFloat(selectedDelivery.other_charges || 0) > 0 ? `
            <div class="fin-row border">
              <span>Other Charges:</span>
              <span>+ Rs. ${parseFloat(selectedDelivery.other_charges || 0).toFixed(2)}</span>
            </div>
            ` : ''}
            ${parseFloat(selectedDelivery.round_off || 0) !== 0 ? `
            <div class="fin-row border">
              <span>Round Off:</span>
              <span>Rs. ${parseFloat(selectedDelivery.round_off || 0).toFixed(2)}</span>
            </div>
            ` : ''}
            <div class="fin-row total">
              <span>GRAND TOTAL:</span>
              <span>Rs. ${gt.toFixed(2)}</span>
            </div>
            
            ${selectedDelivery.shop_current_balance !== undefined && selectedDelivery.shop_current_balance !== null ? `
            <div style="margin-top: 15px; padding-top: 10px; border-top: 2px dashed #1e40af;">
              <div style="text-align: left; font-size: 9pt; font-weight: bold; color: #1e40af; margin-bottom: 5px; text-transform: uppercase; padding: 0 10px;">Shop Account Status</div>
              <div class="fin-row" style="font-size: 10pt; color: #555; padding: 3px 10px;">
                <span>Previous Balance:</span>
                <span>Rs. ${(parseFloat(selectedDelivery.shop_current_balance) - gt).toFixed(2)}</span>
              </div>
              <div class="fin-row" style="font-size: 10pt; color: #555; padding: 3px 10px;">
                <span>Current Bill:</span>
                <span>Rs. ${gt.toFixed(2)}</span>
              </div>
              <div class="fin-row total" style="background: #0f172a; margin-top: 5px; padding: 8px 15px; font-size: 12pt;">
                <span>TOTAL OUTSTANDING:</span>
                <span>Rs. ${parseFloat(selectedDelivery.shop_current_balance).toFixed(2)}</span>
              </div>
            </div>
            ` : ''}

          </div>
          
          ${selectedDelivery.notes ? `
          <div style="margin-bottom: 15px; padding: 8px 12px; background: #f8fafc; border-left: 3px solid #1e40af; font-size: 10pt;">
            <strong>Notes:</strong> ${selectedDelivery.notes}
          </div>
          ` : ''}
          
          <!-- Signatures -->
          <div class="signatures">
            <div class="sig-box">
              <div class="sig-line"></div>
              <div class="sig-label">Prepared By</div>
              <div class="sig-role">Warehouse Staff</div>
            </div>
            <div class="sig-box">
              <div class="sig-line"></div>
              <div class="sig-label">Dispatched By</div>
              <div class="sig-role">Manager</div>
            </div>
            <div class="sig-box">
              <div class="sig-line"></div>
              <div class="sig-label">Received By</div>
              <div class="sig-role">Driver</div>
            </div>
            <div class="sig-box">
              <div class="sig-line"></div>
              <div class="sig-label">Customer</div>
              <div class="sig-role">Sign & Stamp</div>
            </div>
          </div>
          
          <!-- Footer -->
          <div class="footer">
            <div>Thank you for your business!</div>
            <div style="margin-top: 3px;">
              Generated: ${new Date().toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() { window.print(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
      printWindow.document.close();
      console.log('✅ Print window created successfully');
    } catch (error) {
      console.error('❌ Print error:', error);
      showToast('Error: ' + error.message, 'error');
      setTimeout(() => {}, 5000);
    }
  };

  const handleDownloadChallan = () => {
    // For download, we can still use the print dialog with "Save as PDF" option
    handlePrintChallan();
  };

  const handleUpdateStatus = (delivery) => {
    setSelectedDelivery(delivery);
    setStatusUpdate({
      status: delivery.status,
      delivered_date: delivery.delivered_date || '',
      received_by: delivery.received_by || '',
      notes: ''
    });
    setShowStatusModal(true);
  };

  const handleStatusSubmit = async () => {
    try {
      await deliveryService.updateDeliveryStatus(
        selectedDelivery.id,
        statusUpdate.status,
        statusUpdate
      );
      
      setMessage({ type: 'success', text: 'Delivery status updated successfully!' });
      setShowStatusModal(false);
      fetchDeliveries();
      fetchStatistics();
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Failed to update status' 
      });
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock },
      in_transit: { bg: 'bg-blue-100', text: 'text-blue-800', icon: Truck },
      delivered: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle },
      returned: { bg: 'bg-orange-100', text: 'text-orange-800', icon: RotateCcw },
      cancelled: { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle }
    };
    
    const badge = badges[status] || badges.pending;
    const Icon = badge.icon;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        <Icon className="h-3 w-3 mr-1" />
        {status.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  // 🆕 Bulk Selection Functions (ENHANCED: Allow selection of ANY status)
  const toggleDeliverySelection = (deliveryId, status) => {
    setSelectedDeliveries(prev => {
      const newSet = new Set(prev);
      if (newSet.has(deliveryId)) {
        newSet.delete(deliveryId);
      } else {
        newSet.add(deliveryId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedDeliveries.size === deliveries.length && deliveries.length > 0) {
      // Deselect all
      setSelectedDeliveries(new Set());
    } else {
      // Select all
      setSelectedDeliveries(new Set(deliveries.map(d => d.id)));
    }
  };

  const handleBulkDelete = () => {
    if (selectedDeliveries.size === 0) {
      setMessage({ type: 'error', text: 'Please select deliveries to delete' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return;
    }
    setShowDeleteConfirmModal(true);
  };

  const confirmBulkDelete = async () => {
    try {
      setDeleting(true);
      const selectedDeliveryObjects = deliveries.filter(d => selectedDeliveries.has(d.id));
      
      // Check if any selected deliveries are completed (delivered/in_transit)
      const completedDeliveries = selectedDeliveryObjects.filter(
        d => d.status === 'delivered' || d.status === 'in_transit'
      );
      
      let forceDelete = false;
      
      if (completedDeliveries.length > 0) {
        // Show a modal-based confirmation dialog instead of window.confirm
        // For now, we'll proceed without the confirm since the user selected to delete
        forceDelete = true;
      }
      
      console.log('🗑️ Deleting deliveries:', Array.from(selectedDeliveries));
      console.log('⚠️ Force mode:', forceDelete);

      const response = await deliveryService.bulkDeleteDeliveries(
        Array.from(selectedDeliveries),
        forceDelete
      );

      let message = `Successfully deleted ${response.data.deletedCount} delivery/deliveries`;
      
      if (response.data.warnings && response.data.warnings.length > 0) {
        message += `. ${response.data.warnings.length} warning(s) issued.`;
        console.warn('⚠️ Warnings:', response.data.warnings);
      }
      
      if (response.data.errors && response.data.errors.length > 0) {
        message += `. ${response.data.errors.length} delivery/deliveries could not be deleted.`;
        console.error('❌ Errors:', response.data.errors);
      }

      showToast(message, response.data.errors.length > 0 ? 'warning' : 'success');
      
      setShowDeleteConfirmModal(false);
      setSelectedDeliveries(new Set());
      fetchDeliveries();
      fetchStatistics();
    } catch (error) {
      console.error('Error deleting deliveries:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Failed to delete deliveries' 
      });
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    } finally {
      setDeleting(false);
    }
  };

  if (loading && deliveries.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading deliveries...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to Dashboard
        </button>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Truck className="h-8 w-8 text-blue-600" />
              Delivery Tracking
            </h1>
            <p className="text-gray-600 mt-2">
              Track and manage all delivery challans
            </p>
          </div>
          
          <button
            onClick={() => navigate('/deliveries/new')}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
            New Challan
          </button>
        </div>
      </div>

      {/* Alert Messages */}
      {message.text && (
        <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
          message.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-800' 
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="h-5 w-5" />
          ) : (
            <AlertCircle className="h-5 w-5" />
          )}
          {message.text}
        </div>
      )}

      

      

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <StatCard
            title="Pending"
            value={statistics.pending_count || 0}
            icon={Clock}
            color="yellow"
          />
          <StatCard
            title="In Transit"
            value={statistics.in_transit_count || 0}
            icon={Truck}
            color="blue"
          />
          <StatCard
            title="Delivered"
            value={statistics.delivered_count || 0}
            icon={CheckCircle}
            color="green"
          />
          <StatCard
            title="Returned"
            value={statistics.returned_count || 0}
            icon={RotateCcw}
            color="orange"
          />
          <StatCard
            title="Total"
            value={statistics.total_count || 0}
            icon={Package}
            color="gray"
          />
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </h2>
          <button
            onClick={clearFilters}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            Clear All
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              name="search"
              placeholder="Search challan number..."
              value={filters.search}
              onChange={handleFilterChange}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            name="status"
            value={filters.status}
            onChange={handleFilterChange}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="in_transit">In Transit</option>
            <option value="delivered">Delivered</option>
            <option value="returned">Returned</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select
            name="warehouse_id"
            value={filters.warehouse_id}
            onChange={handleFilterChange}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Warehouses</option>
            {warehouses.map(warehouse => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.name}
              </option>
            ))}
          </select>

          <input
            type="date"
            name="from_date"
            value={filters.from_date}
            onChange={handleFilterChange}
            placeholder="From Date"
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />

          <input
            type="date"
            name="to_date"
            value={filters.to_date}
            onChange={handleFilterChange}
            placeholder="To Date"
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Deliveries Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {/* Bulk Actions Bar */}
        <div className="bg-gradient-to-r from-orange-50 to-red-50 border-b-2 border-orange-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={deliveries.length > 0 && selectedDeliveries.size === deliveries.length}
                  onChange={toggleSelectAll}
                  className="h-5 w-5 text-red-600 focus:ring-red-500 border-gray-300 rounded cursor-pointer"
                />
                <label className="text-sm font-medium text-gray-700">
                  Select All ({deliveries.length})
                </label>
              </div>
              
              {selectedDeliveries.size > 0 && (
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
                    {selectedDeliveries.size} Selected
                  </span>
                </div>
              )}
            </div>
            
            <button
              onClick={handleBulkDelete}
              disabled={selectedDeliveries.size === 0}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                selectedDeliveries.size > 0
                  ? 'bg-red-600 hover:bg-red-700 text-white shadow-md hover:shadow-lg'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <XCircle className="h-5 w-5" />
              Delete Selected ({selectedDeliveries.size})
            </button>
          </div>
          
          <div className="mt-3 flex items-start gap-2 text-sm text-gray-600 bg-blue-50 p-3 rounded-lg border border-blue-200">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-blue-900">Bulk Delete Information:</p>
              <p className="mt-1">
                Select deliveries to delete. <strong>Completed deliveries</strong> (Delivered/In Transit) require <strong>admin override confirmation</strong>.
                Cancelled and Returned deliveries can be deleted without additional confirmation.
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase w-12">
                  Select
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Challan No</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Shop</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Driver</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vehicle</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Items</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {deliveries.map((delivery) => {
                const isSelected = selectedDeliveries.has(delivery.id);
                
                return (
                <tr 
                  key={delivery.id} 
                  className={`hover:bg-gray-50 transition-colors ${
                    isSelected ? 'bg-red-50 border-l-4 border-red-500' : ''
                  }`}
                >
                  <td className="px-6 py-4 text-center">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleDeliverySelection(delivery.id, delivery.status)}
                      className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded cursor-pointer"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <FileText className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-sm font-medium text-blue-600">{delivery.challan_number}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(delivery.delivery_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{delivery.shop_name}</div>
                    <div className="text-sm text-gray-500">{delivery.shop_city}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{delivery.driver_name}</div>
                    <div className="text-sm text-gray-500">{delivery.driver_phone}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {delivery.vehicle_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                    {delivery.total_items || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {getStatusBadge(delivery.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleViewDetails(delivery)}
                        className="text-blue-600 hover:text-blue-900"
                        title="View Details"
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(delivery)}
                        className="text-green-600 hover:text-green-900"
                        title="Update Status"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>

        {deliveries.length === 0 && (
          <div className="text-center py-12">
            <Truck className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No deliveries found</p>
            <button
              onClick={() => navigate('/deliveries/new')}
              className="mt-4 text-blue-600 hover:text-blue-700"
            >
              Create your first delivery challan
            </button>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing page {currentPage} of {totalPages} ({totalRecords} total records)
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedDelivery && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Delivery Details</h2>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              {/* Company Information Header */}
              {companySettings && (
                <div className="mb-6 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-6 text-white">
                  <div className="text-center">
                    <h2 className="text-2xl font-bold mb-2">{companySettings.company_name || 'Company Name'}</h2>
                    <p className="text-sm opacity-90 mb-1">{companySettings.company_address || 'Company Address'}</p>
                    <div className="flex justify-center items-center gap-4 text-sm opacity-90">
                      <span>📞 {companySettings.company_phone || 'N/A'}</span>
                      <span>✉️ {companySettings.company_email || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Challan Information</h3>
                  <div className="space-y-2">
                    <p><strong>Challan No:</strong> {selectedDelivery.challan_number}</p>
                    <p><strong>Date:</strong> {new Date(selectedDelivery.delivery_date).toLocaleDateString()}</p>
                    <p><strong>Status:</strong> {getStatusBadge(selectedDelivery.status)}</p>
                    <p><strong>Warehouse:</strong> {selectedDelivery.warehouse_name}</p>
                    {selectedDelivery.invoice_id && (
                      <p><strong>Invoice ID:</strong> #{selectedDelivery.invoice_id}</p>
                    )}
                    {selectedDelivery.order_id && (
                      <p><strong>Order ID:</strong> #{selectedDelivery.order_id}</p>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Delivery To</h3>
                  <div className="space-y-2">
                    <p><strong>Shop:</strong> {selectedDelivery.shop_name}</p>
                    <p><strong>Address:</strong> {selectedDelivery.shop_address || 'N/A'}</p>
                    <p><strong>City:</strong> {selectedDelivery.shop_city || 'N/A'}</p>
                    <p><strong>Contact:</strong> {selectedDelivery.shop_contact}</p>
                    {selectedDelivery.route_name && (
                      <p><strong>Route:</strong> {selectedDelivery.route_name}</p>
                    )}
                    {selectedDelivery.salesman_name && (
                      <p><strong>Salesman:</strong> {selectedDelivery.salesman_name}</p>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Driver Details</h3>
                  <div className="space-y-2">
                    <p><strong>Name:</strong> {selectedDelivery.driver_name}</p>
                    <p><strong>Phone:</strong> {selectedDelivery.driver_phone}</p>
                    {selectedDelivery.driver_cnic && (
                      <p><strong>CNIC:</strong> {selectedDelivery.driver_cnic}</p>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Vehicle Details</h3>
                  <div className="space-y-2">
                    <p><strong>Number:</strong> {selectedDelivery.vehicle_number}</p>
                    <p><strong>Type:</strong> {selectedDelivery.vehicle_type}</p>
                  </div>
                </div>
              </div>

              {/* Summary Statistics */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <p className="text-xs text-gray-600 mb-1">Total Items</p>
                  <p className="text-2xl font-bold text-blue-600">{selectedDelivery.total_items || 0}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <p className="text-xs text-gray-600 mb-1">Total Quantity</p>
                  <p className="text-2xl font-bold text-green-600">{parseFloat(selectedDelivery.total_quantity || 0).toFixed(2)}</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                  <p className="text-xs text-gray-600 mb-1">Grand Total</p>
                  <p className="text-2xl font-bold text-purple-600">Rs. {parseFloat(selectedDelivery.grand_total || selectedDelivery.total_amount || 0).toFixed(2)}</p>
                </div>
              </div>

              {/* Items */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-500 mb-3">Items</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">#</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Product</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Quantity</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Price</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Discount %</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {(selectedDelivery.items || []).map((item, index) => (
                        <tr key={index}>
                          <td className="px-4 py-2 text-sm">{index + 1}</td>
                          <td className="px-4 py-2 text-sm">{item.product_name}</td>
                          <td className="px-4 py-2 text-sm text-right">{parseFloat(item.quantity_delivered || item.quantity_ordered || 0).toFixed(2)}</td>
                          <td className="px-4 py-2 text-sm text-right">Rs. {parseFloat(item.unit_price || 0).toFixed(2)}</td>
                          <td className="px-4 py-2 text-sm text-right text-red-600">
                            {(() => {
                              const discAmt = parseFloat(item.discount_amount || 0);
                              const grossTotal = parseFloat(item.quantity_delivered || item.quantity_ordered || 0) * parseFloat(item.unit_price || 0);
                              const discPct = parseFloat(item.discount_percentage || 0) || 
                                (discAmt > 0 && grossTotal > 0 ? (discAmt / grossTotal) * 100 : 0);
                              return discPct > 0 ? (
                                <div>
                                  <div className="font-medium">{discPct.toFixed(1)}%</div>
                                  <div className="text-xs text-red-400">(-Rs. {discAmt.toFixed(2)})</div>
                                </div>
                              ) : '-';
                            })()}
                          </td>
                          <td className="px-4 py-2 text-sm text-right">Rs. {parseFloat(item.total_price || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Financial Summary - Comprehensive Breakdown */}
              {(() => {
                const sub = parseFloat(selectedDelivery.subtotal || 0);
                const gt = parseFloat(selectedDelivery.grand_total || selectedDelivery.total_amount || 0);
                const storedDiscount = parseFloat(selectedDelivery.discount_amount || 0);
                const effectiveDiscount = storedDiscount > 0 ? storedDiscount : (sub > gt ? sub - gt : 0);
                const effectiveDiscountPct = sub > 0 && effectiveDiscount > 0 ? (effectiveDiscount / sub * 100) : 0;
                return (
              <div className="mb-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 border-2 border-blue-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  Financial Breakdown
                </h3>
                
                <div className="space-y-3">
                  {/* Items Subtotal */}
                  <div className="flex justify-between items-center py-2 border-b border-blue-200">
                    <span className="text-sm font-medium text-gray-700">Items Subtotal:</span>
                    <span className="text-sm font-semibold text-gray-900">
                      Rs. {sub.toFixed(2)}
                    </span>
                  </div>

                  {/* Discount */}
                  <div className="flex justify-between items-center py-2 border-b border-blue-200">
                    <span className="text-sm font-medium text-gray-700">
                      Discount ({effectiveDiscountPct.toFixed(2)}%):
                    </span>
                    <span className={`text-sm font-semibold ${effectiveDiscount > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                      - Rs. {effectiveDiscount.toFixed(2)}
                    </span>
                  </div>

                  {/* Tax */}
                  <div className="flex justify-between items-center py-2 border-b border-blue-200">
                    <span className="text-sm font-medium text-gray-700">
                      Tax ({parseFloat(selectedDelivery.tax_percentage || 0).toFixed(2)}%):
                    </span>
                    <span className={`text-sm font-semibold ${parseFloat(selectedDelivery.tax_amount || 0) > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                      + Rs. {parseFloat(selectedDelivery.tax_amount || 0).toFixed(2)}
                    </span>
                  </div>

                  {/* Shipping Charges */}
                  <div className="flex justify-between items-center py-2 border-b border-blue-200">
                    <span className="text-sm font-medium text-gray-700">Shipping Charges:</span>
                    <span className={`text-sm font-semibold ${parseFloat(selectedDelivery.shipping_charges || 0) > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                      + Rs. {parseFloat(selectedDelivery.shipping_charges || 0).toFixed(2)}
                    </span>
                  </div>

                  {/* Other Charges */}
                  <div className="flex justify-between items-center py-2 border-b border-blue-200">
                    <span className="text-sm font-medium text-gray-700">Other Charges:</span>
                    <span className={`text-sm font-semibold ${parseFloat(selectedDelivery.other_charges || 0) > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                      + Rs. {parseFloat(selectedDelivery.other_charges || 0).toFixed(2)}
                    </span>
                  </div>

                  {/* Round Off */}
                  <div className="flex justify-between items-center py-2 border-b border-blue-200">
                    <span className="text-sm font-medium text-gray-700">Round Off:</span>
                    <span className={`text-sm font-semibold ${parseFloat(selectedDelivery.round_off || 0) > 0 ? 'text-green-600' : parseFloat(selectedDelivery.round_off || 0) < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                      {parseFloat(selectedDelivery.round_off || 0) > 0 ? '+' : ''} Rs. {parseFloat(selectedDelivery.round_off || 0).toFixed(2)}
                    </span>
                  </div>

                  {/* Grand Total */}
                  <div className="flex justify-between items-center py-3 bg-blue-600 rounded-lg px-4 mt-4">
                    <span className="text-base font-bold text-white">GRAND TOTAL:</span>
                    <span className="text-xl font-bold text-white">
                      Rs. {parseFloat(selectedDelivery.grand_total || selectedDelivery.total_amount || 0).toFixed(2)}
                    </span>
                  </div>

                  <p className="text-xs text-gray-600 text-center mt-3 italic">
                    💰 Complete financial breakdown including all charges and discounts
                  </p>
                </div>
              </div>
                );
              })()}

              {selectedDelivery.notes && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Notes</h3>
                  <p className="text-sm text-gray-700">{selectedDelivery.notes}</p>
                </div>
              )}

              {/* Delivery Status & Timestamps */}
              <div className="border-t pt-6">
                <h3 className="text-sm font-medium text-gray-500 mb-3">Delivery Tracking</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-600 mb-1">Created On</p>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedDelivery.created_at ? new Date(selectedDelivery.created_at).toLocaleString() : 'N/A'}
                    </p>
                  </div>
                  
                  {selectedDelivery.delivered_date && (
                    <div className="bg-green-50 rounded-lg p-3">
                      <p className="text-xs text-gray-600 mb-1">Delivered On</p>
                      <p className="text-sm font-medium text-green-900">
                        {new Date(selectedDelivery.delivered_date).toLocaleString()}
                      </p>
                      {selectedDelivery.received_by && (
                        <p className="text-xs text-gray-600 mt-1">Received by: {selectedDelivery.received_by}</p>
                      )}
                    </div>
                  )}
                  
                  {selectedDelivery.updated_at && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-600 mb-1">Last Updated</p>
                      <p className="text-sm font-medium text-gray-900">
                        {new Date(selectedDelivery.updated_at).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Signature Placeholders */}
              <div className="border-t mt-6 pt-6">
                <h3 className="text-sm font-medium text-gray-500 mb-4">Authorized Signatures</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="text-center">
                    <div className="h-20 border-b-2 border-gray-300 mb-2"></div>
                    <p className="text-xs font-medium text-gray-700">Prepared By</p>
                    <p className="text-xs text-gray-500">Warehouse Staff</p>
                  </div>
                  <div className="text-center">
                    <div className="h-20 border-b-2 border-gray-300 mb-2"></div>
                    <p className="text-xs font-medium text-gray-700">Dispatched By</p>
                    <p className="text-xs text-gray-500">Warehouse Manager</p>
                  </div>
                  <div className="text-center">
                    <div className="h-20 border-b-2 border-gray-300 mb-2"></div>
                    <p className="text-xs font-medium text-gray-700">Received By</p>
                    <p className="text-xs text-gray-500">Driver</p>
                  </div>
                  <div className="text-center">
                    <div className="h-20 border-b-2 border-gray-300 mb-2"></div>
                    <p className="text-xs font-medium text-gray-700">Customer/Shop Owner</p>
                    <p className="text-xs text-gray-500">Signature & Stamp</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="border-t mt-6 pt-6 flex justify-end gap-3">
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={handleDownloadChallan}
                  className="flex items-center gap-2 px-6 py-2 border border-green-600 text-green-600 rounded-lg hover:bg-green-50 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Download PDF
                </button>
                <button
                  onClick={handlePrintChallan}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Printer className="h-4 w-4" />
                  Print PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Update Modal */}
      {showStatusModal && selectedDelivery && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Update Delivery Status</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Challan Number
                  </label>
                  <p className="text-sm font-medium text-gray-900">{selectedDelivery.challan_number}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Status *
                  </label>
                  <select
                    value={statusUpdate.status}
                    onChange={(e) => setStatusUpdate(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="in_transit">In Transit</option>
                    <option value="delivered">Delivered</option>
                    <option value="returned">Returned</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                {statusUpdate.status === 'delivered' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Delivered Date
                      </label>
                      <input
                        type="date"
                        value={statusUpdate.delivered_date}
                        onChange={(e) => setStatusUpdate(prev => ({ ...prev, delivered_date: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Received By
                      </label>
                      <input
                        type="text"
                        value={statusUpdate.received_by}
                        onChange={(e) => setStatusUpdate(prev => ({ ...prev, received_by: e.target.value }))}
                        placeholder="Name of receiver"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={statusUpdate.notes}
                    onChange={(e) => setStatusUpdate(prev => ({ ...prev, notes: e.target.value }))}
                    rows="3"
                    placeholder="Additional notes..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowStatusModal(false)}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStatusSubmit}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Update Status
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🆕 Bulk Delete Confirmation Modal */}
      {showDeleteConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full">
            <div className="p-8">
              {/* Header */}
              <div className="flex items-start gap-4 mb-6">
                <div className="flex-shrink-0 w-14 h-14 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="h-8 w-8 text-red-600" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Confirm Bulk Delete
                  </h2>
                  <p className="text-gray-600">
                    You are about to permanently delete <span className="font-bold text-red-600">{selectedDeliveries.size}</span> delivery challan(s)
                  </p>
                </div>
              </div>

              {/* Warning Message */}
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg mb-6">
                <div className="flex items-start gap-3">
                  <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-red-800 mb-1">⚠️ This action cannot be undone!</h4>
                    <ul className="text-sm text-red-700 space-y-1">
                      <li>• Delivery records will be permanently deleted</li>
                      <li>• Delivery items will be removed</li>
                      <li>• Reserved stock will be released back to warehouse</li>
                      <li>• This operation affects <strong>{selectedDeliveries.size} challan(s)</strong></li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Selected Deliveries List */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Selected Deliveries:</h3>
                <div className="max-h-64 overflow-y-auto bg-gray-50 rounded-lg p-4 space-y-2">
                  {deliveries
                    .filter(d => selectedDeliveries.has(d.id))
                    .map(delivery => (
                      <div 
                        key={delivery.id} 
                        className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="h-4 w-4 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">{delivery.challan_number}</p>
                            <p className="text-xs text-gray-500">{delivery.shop_name}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(delivery.status)}
                          <span className="text-xs text-gray-500">
                            {delivery.total_items || 0} items
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Confirmation Question */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-yellow-800 font-medium text-center">
                  Are you absolutely sure you want to delete these {selectedDeliveries.size} delivery challan(s)?
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteConfirmModal(false)}
                  disabled={deleting}
                  className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmBulkDelete}
                  disabled={deleting}
                  className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {deleting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <XCircle className="h-5 w-5" />
                      Yes, Delete {selectedDeliveries.size} Challan(s)
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Statistics Card Component
const StatCard = ({ title, value, icon: Icon, color }) => {
  const colors = {
    yellow: 'bg-yellow-50 text-yellow-600 border-yellow-200',
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    orange: 'bg-orange-50 text-orange-600 border-orange-200',
    gray: 'bg-gray-50 text-gray-600 border-gray-200'
  };

  return (
    <div className={`border rounded-lg p-4 ${colors[color]}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium opacity-80">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <Icon className="h-8 w-8 opacity-60" />
      </div>
    </div>
  );
};

export default DeliveryTrackingPage;
