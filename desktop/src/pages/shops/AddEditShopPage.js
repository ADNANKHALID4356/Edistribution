import React, { useState, useEffect } from 'react';
import { useToast } from '../../context/ToastContext';
import { useNavigate, useParams } from 'react-router-dom';
import shopService from '../../services/shopService';
import routeService from '../../services/routeService';
import salesmanService from '../../services/salesmanService';

const AddEditShopPage = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [salesmen, setSalesmen] = useState([]);
  
  const [formData, setFormData] = useState({
    shop_code: '',
    shop_name: '',
    owner_name: '',
    phone: '',
    alternate_phone: '',
    email: '',
    address: '',
    city: '',
    area: '',
    route_id: '',    salesman_id: '',    credit_limit: '0',
    opening_balance: '0',
    shop_type: 'RETAIL',
    business_license: '',
    tax_registration: '',
    notes: '',
    is_active: true
  });

  useEffect(() => {
    const initializeForm = async () => {
      await fetchRoutes();
      await fetchSalesmen();
      if (isEditMode && id) {
        await fetchShopData();
      }
    };
    
    initializeForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isEditMode]);

  const fetchRoutes = async () => {
    try {
      console.log('Fetching routes from API...');
      const response = await routeService.getActiveRoutes();
      console.log('Routes API Response:', response);
      
      if (response && response.data) {
        console.log('Routes data:', response.data);
        setRoutes(response.data);
        
        if (response.data.length === 0) {
          showToast('No routes found in database. Please add routes first from Route Management page.', 'error');
        }
      } else {
        console.error('Invalid response structure:', response);
        showToast('Failed to load routes. Invalid response from server.', 'error');
      }
    } catch (err) {
      console.error('Fetch routes error:', err);
      const errorMsg = err.message || err.error || 'Failed to fetch routes from server';
      showToast(`Route Loading Error: ${errorMsg}. Please check if backend is running and routes exist in database.`, 'error');
    }
  };

  const fetchSalesmen = async () => {
    try {
      console.log('Fetching salesmen from API...');
      const response = await salesmanService.getAllSalesmen();
      
      if (response && response.data) {
        // Handle both paginated response (.data.salesmen) and direct array structure
        const salesmenData = response.data.salesmen || response.data || [];
        setSalesmen(salesmenData);
        
        if (salesmenData.length === 0) {
          showToast('No active salesmen found. Please add a salesman first.', 'error');
        }
      }
    } catch (err) {
      console.error('Fetch salesmen error:', err);
      showToast('Failed to fetch salesmen lists.', 'error');
    }
  };

  const fetchShopData = async () => {
    try {
      setLoading(true);
      const response = await shopService.getShopById(id);
      const shop = response.data;
      setFormData({
        shop_code: shop.shop_code || '',
        shop_name: shop.shop_name || '',
        owner_name: shop.owner_name || '',
        phone: shop.phone || '',
        alternate_phone: shop.alternate_phone || '',
        email: shop.email || '',
        address: shop.address || '',
        city: shop.city || '',
        area: shop.area || '',
        route_id: shop.route_id ? shop.route_id.toString() : '',
        salesman_id: shop.salesman_id ? shop.salesman_id.toString() : '',
        credit_limit: shop.credit_limit ? shop.credit_limit.toString() : '0',
        opening_balance: shop.current_balance ? shop.current_balance.toString() : '0',
        shop_type: shop.shop_type || 'RETAIL',
        business_license: shop.business_license || '',
        tax_registration: shop.tax_registration || '',
        notes: shop.notes || '',
        is_active: shop.is_active !== undefined ? shop.is_active : true
      });
    } catch (err) {
      showToast(err.message || 'Failed to fetch shop data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);

      const submitData = {
        ...formData,
        credit_limit: parseFloat(formData.credit_limit),
        opening_balance: parseFloat(formData.opening_balance),
        route_id: formData.route_id ? parseInt(formData.route_id) : null
      };

      if (isEditMode) {
        await shopService.updateShop(id, submitData);
      } else {
        await shopService.createShop(submitData);
      }

      navigate('/shops');
    } catch (err) {
      showToast(err.message || 'Failed to save shop', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center mb-6">
        <button
          onClick={() => navigate('/shops')}
          className="mr-4 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md transition-colors"
        >
          ← Back to Shop List
        </button>
        <h1 className="text-3xl font-bold text-gray-800">
          {isEditMode ? 'Edit Shop' : 'Add New Shop'}
        </h1>
      </div>

      {/* Debug Info Panel */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
          <p className="text-sm text-blue-800">
            <strong>Debug Info:</strong> Routes loaded: {routes.length} | 
            Loading: {loading ? 'Yes' : 'No'} | 
            Mode: {isEditMode ? 'Edit' : 'Create'}
          </p>
        </div>
      )}

      

      {/* No Routes Warning */}
      {!loading && routes.length === 0 && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded mb-4">
          <div className="flex items-center justify-between">
            <div>
              <strong>⚠️ No Routes Available</strong>
              <p className="text-sm mt-1">You need to create at least one route before assigning shops to routes.</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/routes')}
              className="ml-4 px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
            >
              Go to Route Management
            </button>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Shop Code */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Shop Code *
            </label>
            <input
              type="text"
              name="shop_code"
              value={formData.shop_code}
              onChange={handleInputChange}
              required
              disabled={isEditMode}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              placeholder="e.g., SH001"
            />
          </div>

          {/* Shop Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Shop Name *
            </label>
            <input
              type="text"
              name="shop_name"
              value={formData.shop_name}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., City Mart"
            />
          </div>

          {/* Owner Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Owner Name *
            </label>
            <input
              type="text"
              name="owner_name"
              value={formData.owner_name}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Ahmed Khan"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone *
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., 03001234567"
            />
          </div>

          {/* Alternate Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Alternate Phone
            </label>
            <input
              type="tel"
              name="alternate_phone"
              value={formData.alternate_phone}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., 03007654321"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., shop@example.com"
            />
          </div>

          {/* City */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              City *
            </label>
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Lahore"
            />
          </div>

          {/* Area */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Area
            </label>
            <input
              type="text"
              name="area"
              value={formData.area}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Gulberg"
            />
          </div>

          {/* Route */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Route {routes.length > 0 && `(${routes.length} available)`}
            </label>
            <select
              name="route_id"
              value={formData.route_id}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">
                {routes.length === 0 ? 'No routes available - Add routes first' : 'Select Route (Optional)'}
              </option>
              {routes.map(route => (
                <option key={route.id} value={route.id}>
                  {route.route_code} - {route.route_name}
                </option>
              ))}
            </select>
            {routes.length === 0 && (
              <p className="mt-1 text-sm text-red-600">
                No routes found. Please add routes from the Route Management page first.
              </p>
            )}
          </div>

          {/* Salesman Assignment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Salesman Assignee
            </label>
            <select
              name="salesman_id"
              value={formData.salesman_id}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">
                {salesmen.length === 0 ? 'No salesmen available - Add salesmen first' : 'Select Salesman (Optional)'}
              </option>
              {salesmen.map(salesman => (
                <option key={salesman.id} value={salesman.id}>
                  {salesman.full_name || salesman.name || salesman.username}
                </option>
              ))}
            </select>
          </div>

          {/* Shop Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Shop Type
            </label>
            <select
              name="shop_type"
              value={formData.shop_type}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="RETAIL">Retail</option>
              <option value="WHOLESALE">Wholesale</option>
              <option value="DISTRIBUTOR">Distributor</option>
            </select>
          </div>

          {/* Credit Limit */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Credit Limit (PKR)
            </label>
            <input
              type="number"
              name="credit_limit"
              value={formData.credit_limit}
              onChange={handleInputChange}
              min="0"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
            />
          </div>

          {/* Opening Balance */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Opening Balance (PKR)
            </label>
            <input
              type="number"
              name="opening_balance"
              value={formData.opening_balance}
              onChange={handleInputChange}
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
            />
          </div>

          {/* Business License */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Business License
            </label>
            <input
              type="text"
              name="business_license"
              value={formData.business_license}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="License number"
            />
          </div>

          {/* Tax Registration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tax Registration
            </label>
            <input
              type="text"
              name="tax_registration"
              value={formData.tax_registration}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Tax registration number"
            />
          </div>

          {/* Address - Full Width */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address *
            </label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              required
              rows="2"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Full address..."
            />
          </div>

          {/* Notes - Full Width */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Additional notes..."
            />
          </div>

          {/* Active Status */}
          <div className="md:col-span-2">
            <div className="flex items-center">
              <input
                type="checkbox"
                name="is_active"
                checked={formData.is_active}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="ml-2 block text-sm text-gray-700">
                Active
              </label>
            </div>
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="mt-6 flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => navigate('/shops')}
            className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? 'Saving...' : isEditMode ? 'Update Shop' : 'Create Shop'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddEditShopPage;
