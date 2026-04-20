// SIMPLIFIED Load Sheet Generator Page
// Clean, clear, systematic implementation

import React, { useState, useEffect } from 'react';
import { useToast } from '../../context/ToastContext';
import { useNavigate } from 'react-router-dom';
import { 
  FileSpreadsheet, Truck, Calendar, Package, Download, 
  Printer, ArrowLeft, AlertCircle, CheckCircle, PlayCircle,
  Save, Eye, Plus, Trash2
} from 'lucide-react';
import deliveryService from '../../services/deliveryService';
import warehouseService from '../../services/warehouseService';
import loadSheetService from '../../services/loadSheetService';

const LoadSheetPage = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();
  
  // State
  const [warehouses, setWarehouses] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [consolidatedProducts, setConsolidatedProducts] = useState([]);
  const [savedLoadSheets, setSavedLoadSheets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Filters
  const [filters, setFilters] = useState({
    warehouse_id: '',
    from_date: new Date().toISOString().split('T')[0],
    to_date: new Date().toISOString().split('T')[0],
    status: 'pending'
  });

  // Vehicle details
  const [vehicleDetails, setVehicleDetails] = useState({
    vehicle_number: '',
    driver_name: '',
    driver_phone: '',
    notes: ''
  });

  // Format selection (Sprint 8 requirement)
  const [showAmounts, setShowAmounts] = useState(true); // true = with amounts, false = without amounts

  // Load on mount
  useEffect(() => {
    fetchWarehouses();
  }, []);

  // Load saved sheets when warehouse changes
  useEffect(() => {
    if (filters.warehouse_id) {
      fetchSavedLoadSheets();
    }
  }, [filters.warehouse_id]);

  // Fetch warehouses
  const fetchWarehouses = async () => {
    try {
      const response = await warehouseService.getAllWarehouses({ status: 'active' });
      const warehouseList = response.data || [];
      setWarehouses(warehouseList);
      
      // Auto-select first warehouse if none selected
      if (warehouseList.length > 0 && !filters.warehouse_id) {
        setFilters(prev => ({ ...prev, warehouse_id: warehouseList[0].id }));
      }
    } catch (error) {
      console.error('Error fetching warehouses:', error);
      setMessage({ type: 'error', text: 'Failed to load warehouses' });
    }
  };

  // Delete load sheet (draft only)
  const handleDeleteLoadSheet = async (sheetId, sheetNumber, status) => {
    // Only allow deleting draft load sheets
    if (status !== 'draft' && status !== 'pending') {
      showToast('Only draft load sheets can be deleted', 'error');
      return;
    }

    try {
      setLoading(true);
      const response = await loadSheetService.deleteLoadSheet(sheetId);
      
      if (response.success) {
        showToast(`Load Sheet #${sheetNumber} deleted successfully`, 'success');
        fetchSavedLoadSheets(); // Refresh list
      }
    } catch (error) {
      console.error('Delete load sheet error:', error);
      showToast(error.response?.data?.message || 'Failed to delete load sheet', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch saved load sheets
  const fetchSavedLoadSheets = async () => {
    if (!filters.warehouse_id) return;
    
    try {
      const response = await loadSheetService.getLoadSheetsByWarehouse(filters.warehouse_id);
      const sheets = response?.data?.data || response?.data || [];
      setSavedLoadSheets(Array.isArray(sheets) ? sheets : []);
    } catch (error) {
      console.error('Error fetching saved load sheets:', error);
      setSavedLoadSheets([]);
    }
  };

  // Handle filter changes
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  // Handle vehicle details changes
  const handleVehicleChange = (e) => {
    const { name, value } = e.target;
    setVehicleDetails(prev => ({ ...prev, [name]: value }));
  };

  // GENERATE LOAD SHEET
  const handleGenerate = async () => {
    // Validation
    if (!filters.warehouse_id) {
      showToast('⚠️ Please select a warehouse', 'error');
      return;
    }

    if (!filters.from_date || !filters.to_date) {
      showToast('⚠️ Please select date range', 'error');
      return;
    }

    try {
      setLoading(true);
      setShowPreview(false);

      console.log('🔄 Fetching deliveries with items...');
      console.log('Filters:', filters);

      // Fetch deliveries WITH items
      const response = await deliveryService.getAllDeliveriesWithItems({
        warehouse_id: filters.warehouse_id,
        from_date: filters.from_date,
        to_date: filters.to_date,
        status: filters.status,
        limit: 1000
      });

      const fetchedDeliveries = response.data || [];
      console.log(`✅ Fetched ${fetchedDeliveries.length} deliveries:`, fetchedDeliveries);

      if (fetchedDeliveries.length === 0) {
        showToast(`ℹ️ No ${filters.status || ''} deliveries found for selected date range`, 'info');
        setDeliveries([]);
        setConsolidatedProducts([]);
        setShowPreview(false);
        return;
      }

      // Consolidate products
      const productMap = new Map();
      let totalItems = 0;

      fetchedDeliveries.forEach(delivery => {
        if (delivery.items && Array.isArray(delivery.items)) {
          delivery.items.forEach(item => {
            totalItems++;
            const key = item.product_id;
            const quantity = parseFloat(item.quantity || 0);
            const price = parseFloat(item.price || 0);
            const amount = parseFloat(item.total || 0);

            if (productMap.has(key)) {
              const existing = productMap.get(key);
              existing.total_quantity += quantity;
              existing.total_amount += amount;
              existing.delivery_count += 1;
            } else {
              productMap.set(key, {
                product_id: item.product_id,
                product_name: item.product_name,
                product_code: item.product_code,
                unit: item.unit || 'pcs',
                total_quantity: quantity,
                total_amount: amount,
                price: price,
                delivery_count: 1
              });
            }
          });
        }
      });

      const consolidated = Array.from(productMap.values()).sort((a, b) => 
        a.product_name.localeCompare(b.product_name)
      );

      console.log(`✅ Consolidated ${consolidated.length} products from ${totalItems} items`);

      setDeliveries(fetchedDeliveries);
      setConsolidatedProducts(consolidated);
      setShowPreview(true);

      showToast(`✅ Preview generated! ${fetchedDeliveries.length} deliveries, ${consolidated.length} products, ${totalItems} total items`, 'success');

    } catch (error) {
      console.error('❌ Error generating load sheet:', error);
      showToast(`❌ Failed to generate: ${error.response?.data?.message || error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // SAVE LOAD SHEET
  const handleSave = async () => {
    if (consolidatedProducts.length === 0) {
      showToast('⚠️ No data to save. Generate preview first.', 'error');
      return;
    }

    try {
      setLoading(true);

      const totalQuantity = consolidatedProducts.reduce((sum, p) => sum + p.total_quantity, 0);
      const totalValue = consolidatedProducts.reduce((sum, p) => sum + p.total_amount, 0);

      const loadSheetData = {
        warehouse_id: filters.warehouse_id,
        loading_date: filters.from_date,
        vehicle_number: vehicleDetails.vehicle_number || null,
        driver_name: vehicleDetails.driver_name || null,
        driver_phone: vehicleDetails.driver_phone || null,
        total_deliveries: deliveries.length,
        total_products: consolidatedProducts.length,
        total_quantity: totalQuantity,
        total_value: totalValue,
        notes: vehicleDetails.notes || `Load sheet for ${filters.from_date} to ${filters.to_date}`
      };

      const deliveryIds = deliveries.map(d => d.id);

      console.log('💾 Saving load sheet:', loadSheetData);
      const response = await loadSheetService.createLoadSheet(loadSheetData, deliveryIds);

      showToast('✅ Load sheet saved successfully!', 'success');
      
      // Reset preview
      setShowPreview(false);
      setConsolidatedProducts([]);
      setDeliveries([]);
      setVehicleDetails({ vehicle_number: '', driver_name: '', driver_phone: '', notes: '' });

      // Refresh saved sheets list
      fetchSavedLoadSheets();

    } catch (error) {
      console.error('❌ Error saving load sheet:', error);
      showToast(`❌ Failed to save: ${error.response?.data?.message || error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // EXPORT TO EXCEL (Sprint 8 requirement)
  const handleExportExcel = () => {
    if (consolidatedProducts.length === 0) {
      showToast('⚠️ No data to export. Generate preview first.', 'error');
      return;
    }

    try {
      // Prepare data for Excel
      const warehouseName = warehouses.find(w => w.id === parseInt(filters.warehouse_id))?.name || 'Unknown';
      const dateRange = `${filters.from_date} to ${filters.to_date}`;
      
      // Create CSV content
      let csvContent = "data:text/csv;charset=utf-8,";
      
      // Header information
      csvContent += `Load Sheet - ${warehouseName}\n`;
      csvContent += `Date Range: ${dateRange}\n`;
      csvContent += `Generated: ${new Date().toLocaleString()}\n`;
      if (vehicleDetails.vehicle_number) csvContent += `Vehicle: ${vehicleDetails.vehicle_number}\n`;
      if (vehicleDetails.driver_name) csvContent += `Driver: ${vehicleDetails.driver_name}\n`;
      csvContent += "\n";
      
      // Column headers based on format
      if (showAmounts) {
        csvContent += "Sr#,Product Code,Product Name,Unit,Total Quantity,Price,Total Amount,Deliveries\n";
        
        // Data rows with amounts
        consolidatedProducts.forEach((product, index) => {
          csvContent += `${index + 1},"${product.product_code || ''}","${product.product_name}","${product.unit}",${product.total_quantity},${product.price.toFixed(2)},${product.total_amount.toFixed(2)},${product.delivery_count}\n`;
        });
        
        // Totals
        const totalQty = consolidatedProducts.reduce((sum, p) => sum + p.total_quantity, 0);
        const totalValue = consolidatedProducts.reduce((sum, p) => sum + p.total_amount, 0);
        const totalDeliveries = deliveries.length;
        csvContent += `\n,,,TOTAL,${totalQty.toFixed(2)},,${totalValue.toFixed(2)},${totalDeliveries}\n`;
      } else {
        csvContent += "Sr#,Product Code,Product Name,Unit,Total Quantity,Deliveries\n";
        
        // Data rows without amounts
        consolidatedProducts.forEach((product, index) => {
          csvContent += `${index + 1},"${product.product_code || ''}","${product.product_name}","${product.unit}",${product.total_quantity},${product.delivery_count}\n`;
        });
        
        // Totals
        const totalQty = consolidatedProducts.reduce((sum, p) => sum + p.total_quantity, 0);
        const totalDeliveries = deliveries.length;
        csvContent += `\n,,,TOTAL,${totalQty.toFixed(2)},${totalDeliveries}\n`;
      }
      
      // Create download link
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      const filename = `LoadSheet_${warehouseName.replace(/\s+/g, '_')}_${filters.from_date}_${new Date().getTime()}.csv`;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setMessage({ type: 'success', text: `✅ Exported to ${filename}` });
    } catch (error) {
      console.error('❌ Error exporting to Excel:', error);
      setMessage({ type: 'error', text: '❌ Failed to export to Excel' });
    }
  };

  // Calculate totals
  const calculateTotals = () => {
    const totalQuantity = consolidatedProducts.reduce((sum, p) => sum + p.total_quantity, 0);
    const totalValue = consolidatedProducts.reduce((sum, p) => sum + p.total_amount, 0);
    return { totalQuantity, totalValue };
  };

  const totals = calculateTotals();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Dashboard
          </button>
          
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <FileSpreadsheet className="h-8 w-8 text-blue-600" />
            Load Sheet Generator
          </h1>
          <p className="text-gray-600 mt-2">Create consolidated loading plans for deliveries</p>
        </div>

        {/* Alert Messages */}
        {message.text && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 shadow-md ${
            message.type === 'success' 
              ? 'bg-green-50 border-2 border-green-300 text-green-800'
              : message.type === 'info'
              ? 'bg-blue-50 border-2 border-blue-300 text-blue-800'
              : 'bg-red-50 border-2 border-red-300 text-red-800'
          }`}>
            {message.type === 'success' ? <CheckCircle className="h-6 w-6" /> : <AlertCircle className="h-6 w-6" />}
            <span className="font-medium">{message.text}</span>
          </div>
        )}

        {/* ===== SECTION 1: GENERATOR FORM ===== */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Plus className="h-6 w-6 text-blue-600" />
            Generate New Load Sheet
          </h2>

          {/* Filters Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Warehouse <span className="text-red-500">*</span>
              </label>
              <select
                name="warehouse_id"
                value={filters.warehouse_id}
                onChange={handleFilterChange}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
              >
                <option value="">Select Warehouse</option>
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                From Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="from_date"
                value={filters.from_date}
                onChange={handleFilterChange}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                To Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="to_date"
                value={filters.to_date}
                onChange={handleFilterChange}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Delivery Status
              </label>
              <select
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="in_transit">In Transit</option>
                <option value="delivered">Delivered</option>
              </select>
            </div>
          </div>

          {/* Vehicle Details (Optional) */}
          <div className="border-t-2 border-gray-200 pt-6 mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <Truck className="h-5 w-5 text-gray-600" />
              Vehicle & Driver Details (Optional)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                type="text"
                name="vehicle_number"
                value={vehicleDetails.vehicle_number}
                onChange={handleVehicleChange}
                placeholder="Vehicle Number (e.g., ABC-123)"
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                name="driver_name"
                value={vehicleDetails.driver_name}
                onChange={handleVehicleChange}
                placeholder="Driver Name"
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="tel"
                name="driver_phone"
                value={vehicleDetails.driver_phone}
                onChange={handleVehicleChange}
                placeholder="Driver Phone"
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Format Selection Toggle (Sprint 8 Requirement) */}
          <div className="border-t-2 border-gray-200 pt-6 mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-gray-600" />
              Load Sheet Format
            </h3>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="format"
                  checked={showAmounts === true}
                  onChange={() => setShowAmounts(true)}
                  className="w-5 h-5 text-blue-600 focus:ring-2 focus:ring-blue-500"
                />
                <div>
                  <span className="text-base font-medium text-gray-900">With Amounts</span>
                  <p className="text-xs text-gray-500">Show prices and total values (for management/accounting)</p>
                </div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="format"
                  checked={showAmounts === false}
                  onChange={() => setShowAmounts(false)}
                  className="w-5 h-5 text-blue-600 focus:ring-2 focus:ring-blue-500"
                />
                <div>
                  <span className="text-base font-medium text-gray-900">Without Amounts</span>
                  <p className="text-xs text-gray-500">Show quantities only (for warehouse workers)</p>
                </div>
              </label>
            </div>
          </div>

          {/* Generate Button - LARGE AND PROMINENT */}
          <div className="flex justify-center">
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="flex items-center gap-3 px-12 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-lg font-bold rounded-xl hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-200"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                  Generating Preview...
                </>
              ) : (
                <>
                  <PlayCircle className="h-6 w-6" />
                  Generate Load Sheet Preview
                </>
              )}
            </button>
          </div>
        </div>

        {/* ===== PREVIEW SECTION ===== */}
        {showPreview && consolidatedProducts.length > 0 && (
          <div className="bg-yellow-50 border-4 border-yellow-400 rounded-xl p-8 mb-8 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-8 w-8 text-yellow-600" />
                <div>
                  <h3 className="text-xl font-bold text-yellow-900">PREVIEW MODE</h3>
                  <p className="text-sm text-yellow-700">Review details and click Save or Export</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleExportExcel}
                  className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white text-base font-bold rounded-lg hover:bg-emerald-700 shadow-lg"
                >
                  <Download className="h-5 w-5" />
                  Export to Excel
                </button>
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="flex items-center gap-2 px-8 py-3 bg-green-600 text-white text-lg font-bold rounded-lg hover:bg-green-700 disabled:bg-gray-400 shadow-lg"
                >
                  <Save className="h-5 w-5" />
                  💾 Save Load Sheet
                </button>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-lg p-4 shadow">
                <p className="text-sm text-gray-600 font-medium">Total Deliveries</p>
                <p className="text-3xl font-bold text-blue-600">{deliveries.length}</p>
              </div>
              <div className="bg-white rounded-lg p-4 shadow">
                <p className="text-sm text-gray-600 font-medium">Total Products</p>
                <p className="text-3xl font-bold text-green-600">{consolidatedProducts.length}</p>
              </div>
              <div className="bg-white rounded-lg p-4 shadow">
                <p className="text-sm text-gray-600 font-medium">Total Quantity</p>
                <p className="text-3xl font-bold text-purple-600">{totals.totalQuantity.toFixed(0)}</p>
              </div>
            </div>

            {/* Products Table */}
            <div className="bg-white rounded-lg overflow-hidden shadow">
              <table className="min-w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">#</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Product</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase">Quantity</th>
                    {showAmounts && (
                      <>
                        <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase">Price</th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase">Total</th>
                      </>
                    )}
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase">Deliveries</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {consolidatedProducts.map((product, index) => (
                    <tr key={product.product_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">{index + 1}</td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900">{product.product_name}</div>
                        <div className="text-xs text-gray-500">{product.product_code}</div>
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                        {product.total_quantity.toFixed(2)} {product.unit}
                      </td>
                      {showAmounts && (
                        <>
                          <td className="px-4 py-3 text-right text-sm text-gray-900">
                            Rs. {product.price.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                            Rs. {product.total_amount.toFixed(2)}
                          </td>
                        </>
                      )}
                      <td className="px-4 py-3 text-center text-sm text-gray-900">
                        {product.delivery_count}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-100">
                  <tr>
                    <td colSpan="2" className="px-4 py-3 text-sm font-bold text-gray-900">TOTAL</td>
                    <td className="px-4 py-3 text-right text-sm font-bold text-gray-900">
                      {totals.totalQuantity.toFixed(2)}
                    </td>
                    {showAmounts && (
                      <>
                        <td className="px-4 py-3"></td>
                        <td className="px-4 py-3 text-right text-sm font-bold text-blue-600">
                          Rs. {totals.totalValue.toLocaleString()}
                        </td>
                      </>
                    )}
                    <td className="px-4 py-3 text-center text-sm font-bold text-gray-900">
                      {deliveries.length}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* ===== SECTION 2: SAVED LOAD SHEETS ===== */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6 text-green-600" />
            Saved Load Sheets ({savedLoadSheets.length})
          </h2>

          {savedLoadSheets.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Load Sheet #</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Vehicle</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase">Deliveries</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase">Products</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase">Status</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {savedLoadSheets.map((sheet) => (
                    <tr key={sheet.id} className="hover:bg-gray-50 cursor-pointer">
                      <td 
                        onClick={() => navigate(`/load-sheets/${sheet.id}`)}
                        className="px-4 py-3 text-sm font-bold text-blue-600 hover:underline"
                      >
                        {sheet.load_sheet_number}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {new Date(sheet.loading_date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {sheet.vehicle_number || '-'}
                        {sheet.driver_name && <div className="text-xs text-gray-500">{sheet.driver_name}</div>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          {sheet.total_deliveries}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          {sheet.total_products}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          sheet.status === 'completed' ? 'bg-green-100 text-green-800' :
                          sheet.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {sheet.status || 'draft'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => navigate(`/load-sheets/${sheet.id}`)}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded hover:bg-blue-700"
                          >
                            <Eye className="h-3 w-3" />
                            View
                          </button>
                          {(sheet.status === 'draft' || sheet.status === 'pending') && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteLoadSheet(sheet.id, sheet.load_sheet_number, sheet.status);
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1 bg-red-600 text-white text-xs font-semibold rounded hover:bg-red-700"
                              title="Delete Load Sheet"
                            >
                              <Trash2 className="h-3 w-3" />
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <FileSpreadsheet className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p>No saved load sheets yet. Generate your first one above!</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default LoadSheetPage;
