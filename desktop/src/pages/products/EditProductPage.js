import React, { useState, useEffect } from 'react';
import { useToast } from '../../context/ToastContext';
import { useNavigate, useParams } from 'react-router-dom';
import productService from '../../services/productService';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

const EditProductPage = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
    const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [companies, setCompanies] = useState([]);

  const [formData, setFormData] = useState({
    product_code: '',
    product_name: '',
    category: '',
    brand: '',
    company_name: '',
    pack_size: '',
    unit_price: '',
    carton_price: '',
    pieces_per_carton: '',
    purchase_price: '',
    stock_quantity: 0,
    reorder_level: 0,
    barcode: '',
    description: '',
    is_active: true,
  });

  // Fetch product data and options on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productRes, categoriesRes, brandsRes, companiesRes] = await Promise.all([
          productService.getProductById(id),
          productService.getCategories(),
          productService.getBrands(),
          productService.getCompanies(),
        ]);
        
        if (productRes.success) {
          const product = productRes.data;
          setFormData({
            product_code: product.product_code || '',
            product_name: product.product_name || '',
            category: product.category || '',
            brand: product.brand || '',
            company_name: product.company_name || '',
            pack_size: product.pack_size || '',
            unit_price: product.unit_price || '',
            carton_price: product.carton_price || '',
            pieces_per_carton: product.pieces_per_carton || '',
            purchase_price: product.purchase_price || '',
            stock_quantity: product.stock_quantity || 0,
            reorder_level: product.reorder_level || 0,
            barcode: product.barcode || '',
            description: product.description || '',
            is_active: product.is_active !== undefined ? product.is_active : true,
          });
        }
        
        if (categoriesRes.success) setCategories(categoriesRes.data);
        if (brandsRes.success) setBrands(brandsRes.data);
        if (companiesRes.success) setCompanies(companiesRes.data);
      } catch (err) {
        showToast(err.message || 'Failed to load product data', 'error');
      } finally {
        setFetchLoading(false);
      }
    };
    fetchData();
  }, [id, showToast]);

  // Handle input change
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Validate required fields
    if (!formData.product_name) {
      showToast('Product name is required', 'error');
      setLoading(false);
      return;
    }
    if (!formData.unit_price || formData.unit_price <= 0) {
      showToast('Valid unit price is required', 'error');
      setLoading(false);
      return;
    }

    try {
      // Prepare data to send (exclude product_code as it's read-only)
      const productData = { ...formData };
      delete productData.product_code; // Cannot change product code

      // Convert numeric fields
      productData.unit_price = parseFloat(productData.unit_price);
      productData.carton_price = productData.carton_price ? parseFloat(productData.carton_price) : null;
      productData.purchase_price = productData.purchase_price ? parseFloat(productData.purchase_price) : null;
      productData.pieces_per_carton = productData.pieces_per_carton ? parseInt(productData.pieces_per_carton) : null;
      productData.stock_quantity = parseInt(productData.stock_quantity) || 0;
      productData.reorder_level = parseInt(productData.reorder_level) || 0;

      // Remove empty strings
      Object.keys(productData).forEach(key => {
        if (productData[key] === '') {
          productData[key] = null;
        }
      });

      const response = await productService.updateProduct(id, productData);
      
      if (response.success) {
        // Redirect to product list with success message
        navigate('/products', { state: { success: 'Product updated successfully' } });
      }
    } catch (err) {
      showToast(err.message || 'Failed to update product', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600">Loading product...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/products')}
                className="mr-4 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeftIcon className="w-6 h-6" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Edit Product</h1>
                <p className="text-sm text-gray-600 mt-1">
                  Update product information
                </p>
              </div>
            </div>
          </div>

          
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
          {/* Product Code Section */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Product Code (Read-only) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product Code
                </label>
                <input
                  type="text"
                  name="product_code"
                  value={formData.product_code}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600 cursor-not-allowed"
                  placeholder="Product code"
                />
                <p className="text-xs text-gray-500 mt-1">Product code cannot be changed</p>
              </div>

              {/* Product Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="product_name"
                  value={formData.product_name}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter product name"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <input
                  type="text"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  list="categories"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter or select category"
                />
                <datalist id="categories">
                  {categories.map((cat) => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </div>

              {/* Brand */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Brand
                </label>
                <input
                  type="text"
                  name="brand"
                  value={formData.brand}
                  onChange={handleChange}
                  list="brands"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter or select brand"
                />
                <datalist id="brands">
                  {brands.map((brand) => (
                    <option key={brand} value={brand} />
                  ))}
                </datalist>
              </div>

              {/* Company Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Name
                </label>
                <input
                  type="text"
                  name="company_name"
                  value={formData.company_name}
                  onChange={handleChange}
                  list="companies"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter or select company"
                />
                <datalist id="companies">
                  {companies.map((company) => (
                    <option key={company} value={company} />
                  ))}
                </datalist>
              </div>

              {/* Pack Size */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pack Size
                </label>
                <input
                  type="text"
                  name="pack_size"
                  value={formData.pack_size}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="e.g., 500ml, 1kg, 12 pieces"
                />
              </div>

              {/* Barcode */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Barcode
                </label>
                <input
                  type="text"
                  name="barcode"
                  value={formData.barcode}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter barcode"
                />
              </div>
            </div>
          </div>

          {/* Pricing Section */}
          <div className="mb-6 pt-6 border-t border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Pricing</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Unit Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unit Price (PKR) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="unit_price"
                  value={formData.unit_price}
                  onChange={handleChange}
                  required
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="0.00"
                />
              </div>

              {/* Carton Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Carton Price (PKR)
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="carton_price"
                  value={formData.carton_price}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="0.00"
                />
              </div>

              {/* Purchase Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Purchase Price (PKR)
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="purchase_price"
                  value={formData.purchase_price}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="0.00"
                />
              </div>

              {/* Pieces Per Carton */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pieces Per Carton
                </label>
                <input
                  type="number"
                  name="pieces_per_carton"
                  value={formData.pieces_per_carton}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {/* Inventory Section */}
          <div className="mb-6 pt-6 border-t border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Inventory</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Stock Quantity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stock Quantity
                </label>
                <input
                  type="number"
                  name="stock_quantity"
                  value={formData.stock_quantity}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="0"
                />
              </div>

              {/* Reorder Level */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reorder Level
                </label>
                <input
                  type="number"
                  name="reorder_level"
                  value={formData.reorder_level}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="0"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Alert when stock falls below this level
                </p>
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div className="mb-6 pt-6 border-t border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h2>
            <div className="space-y-4">
              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter product description"
                />
              </div>

              {/* Active Status */}
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleChange}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Active (Product is available for sale)
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => navigate('/products')}
              className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Updating...' : 'Update Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProductPage;
