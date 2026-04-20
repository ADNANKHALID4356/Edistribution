// Warehouse Management Page
// Purpose: Manage warehouses and their stock levels

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Warehouse, Package, 
  Plus, Edit, Trash2, Eye, Search, ArrowLeft, MapPin,
  Phone, Box, PackagePlus, X, RefreshCw
} from 'lucide-react';
import warehouseService from '../../services/warehouseService';

const WarehouseManagementPage = () => {
  const navigate = useNavigate();
  
  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);
  const [stock, setStock] = useState([]);
  const [stockTotals, setStockTotals] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stockLoading, setStockLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [showManageProductsModal, setShowManageProductsModal] = useState(false);
  const [showDeleteProductModal, setShowDeleteProductModal] = useState(false);
  const [showStockUpdateModal, setShowStockUpdateModal] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [productToUpdate, setProductToUpdate] = useState(null);
  const [newStockQuantity, setNewStockQuantity] = useState('');
  const [deletingProduct, setDeletingProduct] = useState(false);
  const [updatingStock, setUpdatingStock] = useState(false);
  const [availableProducts, setAvailableProducts] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [productQuantities, setProductQuantities] = useState({}); // Track quantities for each selected product
  const [productSearch, setProductSearch] = useState('');
  const [addingProducts, setAddingProducts] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');

  // Form state for add/edit
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    address: '',
    city: '',
    area: '',
    postal_code: '',
    manager_name: '',
    manager_phone: '',
    contact_number: '',
    email: '',
    capacity: '',
    storage_type: 'general',
    status: 'active',
    is_default: false,
    notes: ''
  });

  useEffect(() => {
    fetchWarehouses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const fetchWarehouses = async () => {
    try {
      setLoading(true);
      const filters = {};
      if (statusFilter !== 'all') filters.status = statusFilter;
      
      const response = await warehouseService.getAllWarehouses(filters);
      setWarehouses(response.data || []);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to load warehouses' });
    } finally {
      setLoading(false);
    }
  };

  const fetchWarehouseStock = async (warehouseId) => {
    try {
      setStockLoading(true);
      const filters = {};
      if (stockFilter === 'low') filters.low_stock = true;
      
      const response = await warehouseService.getWarehouseStock(warehouseId, filters);
      // API now returns { products: [], totals: {} }
      if (response.data && response.data.products) {
        setStock(response.data.products || []);
        setStockTotals(response.data.totals || null);
      } else {
        // Fallback for old API structure
        setStock(response.data || []);
        setStockTotals(null);
      }
    } catch (error) {
      console.error('Error fetching warehouse stock:', error);
      setMessage({ type: 'error', text: 'Failed to load stock data' });
    } finally {
      setStockLoading(false);
    }
  };

  const handleWarehouseSelect = async (warehouse) => {
    setSelectedWarehouse(warehouse);
    await fetchWarehouseStock(warehouse.id);
    setShowStockModal(true);
  };

  const handleDeleteProduct = (product) => {
    setProductToDelete(product);
    setShowDeleteProductModal(true);
  };

  const confirmDeleteProduct = async () => {
    if (!productToDelete || !selectedWarehouse) return;

    try {
      setDeletingProduct(true);
      await warehouseService.removeProductFromWarehouse(
        selectedWarehouse.id,
        productToDelete.product_id
      );
      
      setMessage({ 
        type: 'success', 
        text: `${productToDelete.product_name} removed from warehouse successfully!` 
      });
      
      // Refresh stock data
      await fetchWarehouseStock(selectedWarehouse.id);
      
      setShowDeleteProductModal(false);
      setProductToDelete(null);
      
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('Error deleting product:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Failed to remove product from warehouse' 
      });
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    } finally {
      setDeletingProduct(false);
    }
  };

  const handleUpdateStock = (product) => {
    setProductToUpdate(product);
    setNewStockQuantity(product.quantity || '0');
    setShowStockUpdateModal(true);
  };

  const confirmUpdateStock = async () => {
    if (!productToUpdate || !selectedWarehouse) return;
    
    const quantity = parseFloat(newStockQuantity);
    if (isNaN(quantity) || quantity < 0) {
      setMessage({ type: 'error', text: 'Please enter a valid quantity (0 or greater)' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return;
    }

    try {
      setUpdatingStock(true);
      await warehouseService.updateStockLevel(
        selectedWarehouse.id,
        productToUpdate.product_id,
        quantity
      );
      
      setMessage({ 
        type: 'success', 
        text: `Stock updated for ${productToUpdate.product_name}: ${productToUpdate.quantity} → ${quantity}` 
      });
      
      // Refresh stock data
      await fetchWarehouseStock(selectedWarehouse.id);
      // Also refresh warehouses to update stock totals
      await fetchWarehouses();
      
      setShowStockUpdateModal(false);
      setProductToUpdate(null);
      setNewStockQuantity('');
      
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('Error updating stock:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Failed to update stock' 
      });
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    } finally {
      setUpdatingStock(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleAddWarehouse = () => {
    setFormData({
      name: '',
      code: '',
      address: '',
      city: '',
      area: '',
      postal_code: '',
      manager_name: '',
      manager_phone: '',
      contact_number: '',
      email: '',
      capacity: '',
      storage_type: 'general',
      status: 'active',
      is_default: false,
      notes: ''
    });
    setShowAddModal(true);
  };

  const handleEditWarehouse = (warehouse) => {
    setFormData(warehouse);
    setSelectedWarehouse(warehouse);
    setShowEditModal(true);
  };

  const handleSubmitAdd = async (e) => {
    e.preventDefault();
    try {
      console.log('🔄 Submitting warehouse data:', formData);
      const response = await warehouseService.createWarehouse(formData);
      console.log('✅ Warehouse created successfully:', response);
      
      if (response.success) {
        setMessage({ type: 'success', text: response.message || 'Warehouse created successfully!' });
        setShowAddModal(false);
        fetchWarehouses();
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      } else {
        setMessage({ type: 'error', text: response.message || 'Failed to create warehouse' });
      }
    } catch (error) {
      console.error('❌ Error creating warehouse:', error);
      console.error('❌ Error response:', error.response);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || error.message || 'Failed to create warehouse' 
      });
    }
  };

  const handleSubmitEdit = async (e) => {
    e.preventDefault();
    try {
      await warehouseService.updateWarehouse(selectedWarehouse.id, formData);
      setMessage({ type: 'success', text: 'Warehouse updated successfully!' });
      setShowEditModal(false);
      fetchWarehouses();
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to update warehouse' });
    }
  };

  const handleDeleteWarehouse = async (id, name) => {
    try {
      // First, verify warehouse still exists and get dependencies
      let deps;
      try {
        const depsResponse = await warehouseService.getWarehouseDependencies(id);
        deps = depsResponse.data;
        console.log('🔍 Warehouse Dependencies:', deps);
      } catch (depsError) {
        // Warehouse might already be deleted or doesn't exist
        if (depsError.response?.status === 404) {
          setMessage({ 
            type: 'info', 
            text: `Warehouse "${name}" no longer exists. Refreshing list...` 
          });
          await fetchWarehouses();
          setTimeout(() => setMessage({ type: '', text: '' }), 2000);
          return;
        }
        throw depsError;
      }

      // Check if there are blocking dependencies (deliveries only)
      if (deps.deliveries.total > 0) {
        let message = `Cannot delete warehouse "${name}" - it has dependencies:\n\n`;
        
        if (deps.deliveries.total > 0) {
          message += `🚚 Deliveries: ${deps.deliveries.total} record(s)\n`;
          message += `   • Completed: ${deps.deliveries.completed}\n`;
          if (deps.deliveries.pending > 0) {
            message += `   • Pending: ${deps.deliveries.pending}\n`;
          }
        }

        message += `\n⚠️ Action Required:\n`;
        message += `Please delete all deliveries first.\n`;
        message += `You can manage them from the Delivery Tracking section.`;

        setMessage({ 
          type: 'error', 
          text: message
        });
        return;
      }

      // Check if there's stock (can be force deleted)
      if (deps.stock.products > 0 && deps.stock.totalQuantity > 0) {
        const stockInfo = `This warehouse contains ${deps.stock.products} product(s) with ${deps.stock.totalQuantity} units. Deleting will remove all stock records.`;
        
        setMessage({ type: 'error', text: stockInfo });
        setTimeout(() => setMessage({ type: '', text: '' }), 8000);
        return;
      }

      // No dependencies, safe to delete
    await warehouseService.deleteWarehouse(id, false);
      setMessage({ type: 'success', text: 'Warehouse deleted successfully!' });
      fetchWarehouses();
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('❌ Delete Error:', error);
      const errorData = error.response?.data;
      
      // Handle dependency errors
      if (errorData?.code === 'WAREHOUSE_HAS_DEPENDENCIES' && errorData?.details) {
        const deps = errorData.details.dependencies;
        let message = `Cannot delete warehouse "${name}":\n\n`;
        
        if (deps.deliveries?.total > 0) {
          message += `🚚 ${deps.deliveries.total} delivery record(s)\n`;
        }
        
        message += `\nPlease delete these records first.`;
        
        setMessage({ type: 'error', text: message });
      } else {
        setMessage({ 
          type: 'error', 
          text: errorData?.details?.message || errorData?.message || 'Failed to delete warehouse' 
        });
      }
    }
  };

  const handleManageProducts = async (warehouse) => {
    setSelectedWarehouse(warehouse);
    setSelectedProducts([]);
    setProductSearch('');
    await fetchAvailableProducts(warehouse.id);
    setShowManageProductsModal(true);
  };

  const fetchAvailableProducts = async (warehouseId) => {
    try {
      setLoading(true);
      const response = await warehouseService.getAvailableProducts(warehouseId, {
        search: productSearch
      });
      setAvailableProducts(response.data || []);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to load available products' });
    } finally {
      setLoading(false);
    }
  };

  const handleProductQuantityChange = (productId, quantity) => {
    setProductQuantities(prev => ({
      ...prev,
      [productId]: quantity
    }));
  };

  const handleAddSelectedProducts = async () => {
    if (selectedProducts.length === 0) {
      setMessage({ type: 'error', text: 'Please select at least one product' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return;
    }

    try {
      setAddingProducts(true);
      const products = selectedProducts.map(productId => ({
        product_id: productId,
        quantity: parseInt(productQuantities[productId]) || 0,
        min_stock_level: 0
      }));

      const response = await warehouseService.addProductsBulk(selectedWarehouse.id, products);
      
      // Calculate total quantity added
      const totalQty = products.reduce((sum, p) => sum + p.quantity, 0);
      
      setMessage({ 
        type: 'success', 
        text: `Successfully added ${response.data.success.length} products with ${totalQty} total units to warehouse!` 
      });
      
      setShowManageProductsModal(false);
      setSelectedProducts([]);
      setProductQuantities({});
      fetchWarehouses();
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to add products' });
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    } finally {
      setAddingProducts(false);
    }
  };

  const filteredWarehouses = warehouses.filter(wh => {
    const matchesSearch = searchTerm === '' || 
      wh.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      wh.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      wh.city?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const getStockStatusColor = (available, minimum) => {
    if (available <= 0) return 'text-red-600';
    if (available <= minimum) return 'text-orange-600';
    return 'text-green-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading warehouses...</p>
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
              <Warehouse className="h-8 w-8 text-blue-600" />
              Warehouse Management
            </h1>
            <p className="text-gray-600 mt-2">
              Manage warehouses and track stock levels
            </p>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setStockFilter('all');
                fetchWarehouses();
              }}
              className="flex items-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <RefreshCw className="h-5 w-5" />
              Refresh
            </button>
            <button
              onClick={handleAddWarehouse}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-5 w-5" />
              Add Warehouse
            </button>
          </div>
        </div>
      </div>

      {/* Alert Messages */}
      {message.text && (
        <div className={`mb-6 p-4 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-800' 
            : message.type === 'info'
            ? 'bg-blue-50 border border-blue-200 text-blue-800'
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          <div className="whitespace-pre-line">{message.text}</div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search warehouses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="maintenance">Maintenance</option>
          </select>

          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Package className="h-5 w-5" />
            <span>Total: {filteredWarehouses.length} warehouses</span>
          </div>
        </div>
      </div>

      {/* Warehouses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredWarehouses.map((warehouse) => (
          <div key={warehouse.id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-xl font-semibold text-gray-900">{warehouse.name}</h3>
                    {warehouse.is_default && (
                      <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">Default</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">{warehouse.code || 'No code'}</p>
                </div>
                
                <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                  warehouse.status === 'active' 
                    ? 'bg-green-100 text-green-800'
                    : warehouse.status === 'inactive'
                    ? 'bg-gray-100 text-gray-800'
                    : 'bg-orange-100 text-orange-800'
                }`}>
                  {warehouse.status}
                </span>
              </div>

              {/* Location */}
              <div className="mb-4 space-y-2">
                {warehouse.city && (
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="h-4 w-4 mr-2" />
                    {warehouse.city}{warehouse.area && `, ${warehouse.area}`}
                  </div>
                )}
                {warehouse.manager_name && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Phone className="h-4 w-4 mr-2" />
                    {warehouse.manager_name}
                  </div>
                )}
              </div>

              {/* Stock Summary */}
              <div className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Products</p>
                  <p className="text-2xl font-bold text-gray-900">{warehouse.total_products || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Stock Qty</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {parseFloat(warehouse.total_available_quantity || 0).toFixed(0)}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <button
                    onClick={() => handleWarehouseSelect(warehouse)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <Eye className="h-4 w-4" />
                    View Stock
                  </button>
                  <button
                    onClick={() => handleManageProducts(warehouse)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                  >
                    <PackagePlus className="h-4 w-4" />
                    Add Products
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditWarehouse(warehouse)}
                    className="flex-1 p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors text-center"
                  >
                    <Edit className="h-5 w-5 inline" />
                  </button>
                  <button
                    onClick={() => handleDeleteWarehouse(warehouse.id, warehouse.name)}
                    className="flex-1 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-center"
                  >
                    <Trash2 className="h-5 w-5 inline" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredWarehouses.length === 0 && (
        <div className="text-center py-12">
          <Warehouse className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">No warehouses found</p>
          <button
            onClick={handleAddWarehouse}
            className="mt-4 text-blue-600 hover:text-blue-700"
          >
            Add your first warehouse
          </button>
        </div>
      )}

      {/* Add Warehouse Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Add New Warehouse</h2>
              
              <form onSubmit={handleSubmitAdd} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Warehouse Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Warehouse Code
                    </label>
                    <input
                      type="text"
                      name="code"
                      value={formData.code}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="WH-001"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Address
                    </label>
                    <textarea
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      rows="2"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      City
                    </label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Area
                    </label>
                    <input
                      type="text"
                      name="area"
                      value={formData.area}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Manager Name
                    </label>
                    <input
                      type="text"
                      name="manager_name"
                      value={formData.manager_name}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Manager Phone
                    </label>
                    <input
                      type="text"
                      name="manager_phone"
                      value={formData.manager_phone}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contact Number
                    </label>
                    <input
                      type="text"
                      name="contact_number"
                      value={formData.contact_number}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Storage Type
                    </label>
                    <select
                      name="storage_type"
                      value={formData.storage_type}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="general">General</option>
                      <option value="cold_storage">Cold Storage</option>
                      <option value="hazardous">Hazardous</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="maintenance">Maintenance</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="is_default"
                        checked={formData.is_default}
                        onChange={handleInputChange}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        Set as default warehouse
                      </span>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Create Warehouse
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal - Similar to Add Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Edit Warehouse</h2>
              
              <form onSubmit={handleSubmitEdit} className="space-y-4">
                {/* Same form fields as Add Modal */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Warehouse Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Warehouse Code
                    </label>
                    <input
                      type="text"
                      name="code"
                      value={formData.code}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Address
                    </label>
                    <textarea
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      rows="2"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      City
                    </label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Manager Name
                    </label>
                    <input
                      type="text"
                      name="manager_name"
                      value={formData.manager_name}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="maintenance">Maintenance</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="is_default"
                        checked={formData.is_default}
                        onChange={handleInputChange}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        Set as default warehouse
                      </span>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Update Warehouse
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Stock Modal */}
      {showStockModal && selectedWarehouse && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedWarehouse.name} - Product Stock</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {stockTotals ? `${stockTotals.totalProducts} products | ${stockTotals.totalQuantity.toFixed(2)} total units (real-time product stock)` : `${stock.length} products in stock`}
                  </p>
                </div>
                <button
                  onClick={() => setShowStockModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Stock Filter */}
              <div className="mt-4">
                <select
                  value={stockFilter}
                  onChange={(e) => {
                    setStockFilter(e.target.value);
                    fetchWarehouseStock(selectedWarehouse.id);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Stock</option>
                  <option value="low">Low Stock Only</option>
                </select>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {stockLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                </div>
              ) : stock.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase" title="Real-time product stock quantity">
                          Product Stock
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Reserved</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Available</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Min Stock</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {stock.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-medium text-gray-900">{item.product_name}</div>
                            <div className="text-sm text-gray-500">{item.category}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.product_code}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                            {parseFloat(item.quantity).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-orange-600">
                            {parseFloat(item.reserved_quantity || 0).toFixed(2)}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-right text-sm font-semibold ${
                            getStockStatusColor(item.available_quantity, item.min_stock_level)
                          }`}>
                            {parseFloat(item.available_quantity || 0).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                            {parseFloat(item.min_stock_level || 0).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            {item.available_quantity <= 0 ? (
                              <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded">
                                Out of Stock
                              </span>
                            ) : item.available_quantity <= item.min_stock_level ? (
                              <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded">
                                Low Stock
                              </span>
                            ) : (
                              <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
                                In Stock
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div className="flex justify-center gap-1">
                              <button
                                onClick={() => handleUpdateStock(item)}
                                className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-2 rounded-lg transition-colors"
                                title="Update stock quantity"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(item)}
                                className="text-red-600 hover:text-red-800 hover:bg-red-50 p-2 rounded-lg transition-colors"
                                title="Remove product from warehouse"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {/* Total Row */}
                      {stockTotals && (
                        <tr className="bg-blue-50 font-bold border-t-2 border-blue-300">
                          <td className="px-6 py-4 whitespace-nowrap" colSpan="2">
                            <div className="font-bold text-gray-900 text-lg">TOTAL ({stockTotals.totalProducts} Products)</div>
                            <div className="text-xs text-gray-600 font-normal">Real-time product stock totals</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-blue-900" title="Total product stock across all items">
                            {stockTotals.totalQuantity.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-orange-700">
                            {stockTotals.totalReserved.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-green-700">
                            {stockTotals.totalAvailable.toFixed(2)}
                          </td>
                          <td className="px-6 py-4" colSpan="3"></td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Box className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">No stock data available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Manage Products Modal */}
      {showManageProductsModal && selectedWarehouse && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <PackagePlus className="h-6 w-6 text-green-600" />
                    Add Products to {selectedWarehouse.name}
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Select products to add to this warehouse
                  </p>
                </div>
                <button
                  onClick={() => setShowManageProductsModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Search Box */}
              <div className="mt-4 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={productSearch}
                  onChange={(e) => {
                    setProductSearch(e.target.value);
                    fetchAvailableProducts(selectedWarehouse.id);
                  }}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading products...</p>
                </div>
              ) : availableProducts.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-4 p-3 bg-blue-50 rounded-lg">
                    <input
                      type="checkbox"
                      checked={selectedProducts.length === availableProducts.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedProducts(availableProducts.map(p => p.id));
                        } else {
                          setSelectedProducts([]);
                          setProductQuantities({});
                        }
                      }}
                      className="h-4 w-4 text-green-600 border-gray-300 rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Select All ({availableProducts.length} products)
                    </span>
                  </div>

                  {availableProducts.map(product => (
                    <div
                      key={product.id}
                      className={`p-4 border rounded-lg transition-colors ${
                        selectedProducts.includes(product.id) ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-3 cursor-pointer flex-1">
                          <input
                            type="checkbox"
                            checked={selectedProducts.includes(product.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedProducts([...selectedProducts, product.id]);
                                setProductQuantities(prev => ({ ...prev, [product.id]: product.stock_quantity || 0 }));
                              } else {
                                setSelectedProducts(selectedProducts.filter(id => id !== product.id));
                                setProductQuantities(prev => {
                                  const newQty = { ...prev };
                                  delete newQty[product.id];
                                  return newQty;
                                });
                              }
                            }}
                            className="h-4 w-4 text-green-600 border-gray-300 rounded"
                          />
                          <div>
                            <div className="font-medium text-gray-900">{product.name}</div>
                            <div className="text-sm text-gray-500">
                              {product.code} • {product.category || 'No category'}
                            </div>
                          </div>
                        </label>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="text-sm font-medium text-gray-900">
                              ₨ {parseFloat(product.unit_price || 0).toFixed(2)}
                            </div>
                            <div className="text-xs text-gray-500">
                              Global: {product.stock_quantity || 0} units
                            </div>
                          </div>
                          {selectedProducts.includes(product.id) && (
                            <div className="flex items-center gap-2">
                              <label className="text-xs text-gray-500">Qty:</label>
                              <input
                                type="number"
                                min="0"
                                value={productQuantities[product.id] || ''}
                                onChange={(e) => handleProductQuantityChange(product.id, e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                placeholder="0"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">
                    {productSearch ? 'No products found matching your search' : 'All products are already in this warehouse'}
                  </p>
                </div>
              )}
            </div>

            {/* Footer with Actions */}
            <div className="p-6 border-t bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  {selectedProducts.length > 0 ? (
                    <div>
                      <span className="font-medium text-green-600">
                        {selectedProducts.length} product(s) selected
                      </span>
                      <span className="text-gray-500 ml-2">
                        | Total Qty: {Object.values(productQuantities).reduce((sum, q) => sum + (parseInt(q) || 0), 0)}
                      </span>
                    </div>
                  ) : (
                    <span>No products selected</span>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowManageProductsModal(false);
                      setProductQuantities({});
                    }}
                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddSelectedProducts}
                    disabled={selectedProducts.length === 0 || addingProducts}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {addingProducts ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Adding...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        Add to Warehouse
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Product Confirmation Modal */}
      {showDeleteProductModal && productToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full shadow-xl">
            <div className="p-6 border-b">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-100 rounded-full">
                  <Trash2 className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Remove Product from Warehouse</h2>
                  <p className="text-sm text-gray-600 mt-1">This action cannot be undone</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <div className="flex gap-3">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-600" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-yellow-800">Important Notice</h3>
                    <p className="text-sm text-yellow-700 mt-1">
                      This will remove the product from this warehouse only. The product will still exist in the system.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Product to Remove:</label>
                  <div className="mt-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">{productToDelete.product_name}</p>
                        <p className="text-sm text-gray-500 mt-1">Code: {productToDelete.product_code}</p>
                        <p className="text-sm text-gray-500">Category: {productToDelete.category}</p>
                      </div>
                      <Package className="h-8 w-8 text-gray-400" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                    <p className="text-xs text-gray-600">Quantity</p>
                    <p className="text-lg font-bold text-blue-900">{parseFloat(productToDelete.quantity || 0).toFixed(2)}</p>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
                    <p className="text-xs text-gray-600">Reserved</p>
                    <p className="text-lg font-bold text-orange-900">{parseFloat(productToDelete.reserved_quantity || 0).toFixed(2)}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                    <p className="text-xs text-gray-600">Available</p>
                    <p className="text-lg font-bold text-green-900">{parseFloat(productToDelete.available_quantity || 0).toFixed(2)}</p>
                  </div>
                </div>

                {(parseFloat(productToDelete.quantity) > 0 || parseFloat(productToDelete.reserved_quantity) > 0) && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex gap-2">
                      <svg className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-red-800">Cannot Delete</p>
                        <p className="text-sm text-red-700 mt-1">
                          {parseFloat(productToDelete.reserved_quantity) > 0 
                            ? 'This product has reserved stock. Complete or cancel pending orders first.'
                            : 'This product has stock quantity. Set quantity to 0 before removing.'
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t bg-gray-50 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteProductModal(false);
                  setProductToDelete(null);
                }}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-white transition-colors"
                disabled={deletingProduct}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteProduct}
                disabled={
                  deletingProduct || 
                  parseFloat(productToDelete.quantity) > 0 || 
                  parseFloat(productToDelete.reserved_quantity) > 0
                }
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {deletingProduct ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Removing...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Remove Product
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stock Update Modal */}
      {showStockUpdateModal && productToUpdate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full shadow-xl">
            <div className="p-6 border-b bg-gradient-to-r from-blue-600 to-blue-700">
              <div className="flex items-center gap-3 text-white">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Edit className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Update Stock Quantity</h2>
                  <p className="text-sm text-blue-100 mt-1">Adjust warehouse inventory level</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              {/* Product Info */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{productToUpdate.product_name}</p>
                    <p className="text-sm text-gray-500 mt-1">Code: {productToUpdate.product_code}</p>
                    <p className="text-sm text-gray-500">Category: {productToUpdate.category || 'N/A'}</p>
                  </div>
                  <Package className="h-8 w-8 text-gray-400" />
                </div>
              </div>

              {/* Current Stock Info */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                  <p className="text-xs text-gray-600">Current</p>
                  <p className="text-lg font-bold text-blue-900">{parseFloat(productToUpdate.quantity || 0).toFixed(0)}</p>
                </div>
                <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
                  <p className="text-xs text-gray-600">Reserved</p>
                  <p className="text-lg font-bold text-orange-900">{parseFloat(productToUpdate.reserved_quantity || 0).toFixed(0)}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                  <p className="text-xs text-gray-600">Available</p>
                  <p className="text-lg font-bold text-green-900">{parseFloat(productToUpdate.available_quantity || 0).toFixed(0)}</p>
                </div>
              </div>

              {/* New Quantity Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Stock Quantity
                </label>
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={newStockQuantity}
                      onChange={(e) => setNewStockQuantity(e.target.value)}
                      className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter new quantity"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">units</span>
                  </div>
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setNewStockQuantity(String(Math.max(0, parseInt(newStockQuantity || 0) - 10)))}
                    className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                  >
                    -10
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewStockQuantity(String(Math.max(0, parseInt(newStockQuantity || 0) - 1)))}
                    className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                  >
                    -1
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewStockQuantity(String(parseInt(newStockQuantity || 0) + 1))}
                    className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
                  >
                    +1
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewStockQuantity(String(parseInt(newStockQuantity || 0) + 10))}
                    className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
                  >
                    +10
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewStockQuantity(String(parseInt(newStockQuantity || 0) + 100))}
                    className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
                  >
                    +100
                  </button>
                </div>
              </div>

              {/* Change Preview */}
              {newStockQuantity !== '' && parseFloat(newStockQuantity) !== parseFloat(productToUpdate.quantity || 0) && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-700">
                    Stock will change from <strong>{parseFloat(productToUpdate.quantity || 0).toFixed(0)}</strong> to{' '}
                    <strong>{parseFloat(newStockQuantity).toFixed(0)}</strong> 
                    <span className={parseFloat(newStockQuantity) > parseFloat(productToUpdate.quantity || 0) ? 'text-green-600' : 'text-red-600'}>
                      {' '}({parseFloat(newStockQuantity) > parseFloat(productToUpdate.quantity || 0) ? '+' : ''}
                      {(parseFloat(newStockQuantity) - parseFloat(productToUpdate.quantity || 0)).toFixed(0)})
                    </span>
                  </p>
                </div>
              )}
            </div>

            <div className="p-6 border-t bg-gray-50 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowStockUpdateModal(false);
                  setProductToUpdate(null);
                  setNewStockQuantity('');
                }}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-white transition-colors"
                disabled={updatingStock}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmUpdateStock}
                disabled={updatingStock || newStockQuantity === '' || parseFloat(newStockQuantity) < 0}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {updatingStock ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Updating...
                  </>
                ) : (
                  <>
                    <Edit className="h-4 w-4" />
                    Update Stock
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WarehouseManagementPage;
