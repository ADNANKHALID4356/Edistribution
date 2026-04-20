import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import productService from '../../services/productService';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  FunnelIcon,
  ArrowUpTrayIcon,
  ExclamationTriangleIcon,
  ArrowLeftIcon,
  BuildingStorefrontIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

const ProductListPage = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Warehouse stock modal state
  const [showWarehouseStockModal, setShowWarehouseStockModal] = useState(false);
  const [selectedProductStock, setSelectedProductStock] = useState(null);
  const [loadingWarehouseStock, setLoadingWarehouseStock] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [limit] = useState(20);

  // Filter state
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedStockLevel, setSelectedStockLevel] = useState(''); // Stock level filter
  const [selectedStatus, setSelectedStatus] = useState('true'); // Default to showing only active products
  const [showFilters, setShowFilters] = useState(false);

  // Fetch products
  const fetchProducts = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        page: currentPage,
        limit,
      };
      if (search) params.search = search;
      if (selectedCategory) params.category = selectedCategory;
      if (selectedBrand) params.brand = selectedBrand;
      if (selectedCompany) params.company_name = selectedCompany;
      if (selectedStockLevel) params.stock_level = selectedStockLevel;
      if (selectedStatus !== '') params.is_active = selectedStatus === 'true';

      const response = await productService.getProducts(params);
      if (response.success) {
        setProducts(response.data);
        setCurrentPage(response.pagination.page);
        setTotalPages(response.pagination.totalPages);
        setTotalProducts(response.pagination.total);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  // Fetch filter options
  const fetchFilterOptions = async () => {
    try {
      const [categoriesRes, brandsRes, companiesRes] = await Promise.all([
        productService.getCategories(),
        productService.getBrands(),
        productService.getCompanies(),
      ]);
      
      if (categoriesRes.success) setCategories(categoriesRes.data);
      if (brandsRes.success) setBrands(brandsRes.data);
      if (companiesRes.success) setCompanies(companiesRes.data);
    } catch (err) {
      console.error('Failed to fetch filter options:', err);
    }
  };

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, search, selectedCategory, selectedBrand, selectedCompany, selectedStockLevel, selectedStatus]);

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  // Handle delete product
  const handleDelete = async (id, productName) => {
    try {
      const response = await productService.deleteProduct(id);
      if (response.success) {
        setSuccess('Product deleted successfully');
        fetchProducts();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError(err.message || 'Failed to delete product');
      setTimeout(() => setError(''), 3000);
    }
  };

  // Handle search
  const handleSearch = (e) => {
    setSearch(e.target.value);
    setCurrentPage(1); // Reset to first page on search
  };

  // Handle filter change
  const handleFilterChange = (filterType, value) => {
    switch (filterType) {
      case 'category':
        setSelectedCategory(value);
        break;
      case 'brand':
        setSelectedBrand(value);
        break;
      case 'company':
        setSelectedCompany(value);
        break;
      case 'stock_level':
        setSelectedStockLevel(value);
        break;
      case 'status':
        setSelectedStatus(value);
        break;
      default:
        break;
    }
    setCurrentPage(1); // Reset to first page on filter change
  };

  // Clear all filters
  const clearFilters = () => {
    setSearch('');
    setSelectedCategory('');
    setSelectedBrand('');
    setSelectedCompany('');
    setSelectedStockLevel('');
    setSelectedStatus('true'); // Reset to show only active products (default)
    setCurrentPage(1);
  };

  // Fetch warehouse stock for a product
  const handleViewWarehouseStock = async (product) => {
    setLoadingWarehouseStock(true);
    setShowWarehouseStockModal(true);
    try {
      const response = await productService.getProductWarehouseStock(product.id);
      if (response.success) {
        setSelectedProductStock(response.data);
      } else {
        setSelectedProductStock({
          product: {
            id: product.id,
            product_code: product.product_code,
            product_name: product.product_name,
            global_stock: product.stock_quantity
          },
          warehouseStock: [],
          totals: { totalWarehouses: 0, totalQuantity: 0, totalReserved: 0, totalAvailable: 0 }
        });
      }
    } catch (err) {
      console.error('Failed to fetch warehouse stock:', err);
      setSelectedProductStock({
        product: {
          id: product.id,
          product_code: product.product_code,
          product_name: product.product_name,
          global_stock: product.stock_quantity
        },
        warehouseStock: [],
        totals: { totalWarehouses: 0, totalQuantity: 0, totalReserved: 0, totalAvailable: 0 },
        error: 'Failed to load warehouse stock data'
      });
    } finally {
      setLoadingWarehouseStock(false);
    }
  };

  // Get stock status badge
  const getStockStatusBadge = (stockQuantity, reorderLevel) => {
    if (stockQuantity === 0) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          Out of Stock
        </span>
      );
    } else if (stockQuantity <= reorderLevel) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          <ExclamationTriangleIcon className="w-3 h-3 mr-1" />
          Low Stock
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        In Stock
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <ArrowLeftIcon className="w-5 h-5 mr-2" />
              Back to Dashboard
            </button>
          </div>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Product Management</h1>
              <p className="text-sm text-gray-600 mt-1">
                Total Products: {totalProducts}
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => navigate('/products/bulk-import')}
                className="inline-flex items-center px-4 py-2 border border-primary-600 text-sm font-medium rounded-md text-primary-600 bg-white hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                <ArrowUpTrayIcon className="w-5 h-5 mr-2" />
                Bulk Import
              </button>
              <button
                onClick={() => navigate('/products/add-stock')}
                className="inline-flex items-center px-4 py-2 border border-green-600 text-sm font-medium rounded-md text-green-600 bg-white hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                <PlusIcon className="w-5 h-5 mr-2" />
                Add Stock
              </button>
              <button
                onClick={() => navigate('/products/add')}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                <PlusIcon className="w-5 h-5 mr-2" />
                Add Product
              </button>
            </div>
          </div>

          {/* Alerts */}
          {error && (
            <div className="mt-4 rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
          {success && (
            <div className="mt-4 rounded-md bg-green-50 p-4">
              <p className="text-sm text-green-800">{success}</p>
            </div>
          )}

          {/* Search and Filters */}
          <div className="mt-6 space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                placeholder="Search by name, code, or barcode..."
                value={search}
                onChange={handleSearch}
              />
            </div>

            {/* Filter Toggle */}
            <div className="flex justify-between items-center">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <FunnelIcon className="w-4 h-4 mr-2" />
                {showFilters ? 'Hide Filters' : 'Show Filters'}
              </button>
              {(selectedCategory || selectedBrand || selectedCompany || selectedStockLevel || selectedStatus) && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-primary-600 hover:text-primary-800"
                >
                  Clear All Filters
                </button>
              )}
            </div>

            {/* Filter Options */}
            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-md">
                {/* Category Filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => handleFilterChange('category', e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">All Categories</option>
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Brand Filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Brand
                  </label>
                  <select
                    value={selectedBrand}
                    onChange={(e) => handleFilterChange('brand', e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">All Brands</option>
                    {brands.map((brand) => (
                      <option key={brand} value={brand}>
                        {brand}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Company Filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Company
                  </label>
                  <select
                    value={selectedCompany}
                    onChange={(e) => handleFilterChange('company', e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">All Companies</option>
                    {companies.map((company) => (
                      <option key={company} value={company}>
                        {company}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Stock Level Filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Stock Level
                  </label>
                  <select
                    value={selectedStockLevel}
                    onChange={(e) => handleFilterChange('stock_level', e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">All Stock Levels</option>
                    <option value="in_stock">In Stock</option>
                    <option value="low_stock">Low Stock</option>
                    <option value="out_of_stock">Out of Stock</option>
                  </select>
                </div>

                {/* Status Filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">All Status</option>
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Products Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              <p className="mt-2 text-sm text-gray-600">Loading products...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No products found</p>
              <button
                onClick={() => navigate('/products/add')}
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
              >
                <PlusIcon className="w-5 h-5 mr-2" />
                Add Your First Product
              </button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Code
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Product Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Brand
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Company
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Price (PKR)
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Stock
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {products.map((product) => (
                      <tr
                        key={product.id}
                        className={`hover:bg-gray-50 ${
                          product.stock_quantity <= product.reorder_level
                            ? 'bg-yellow-50'
                            : ''
                        }`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {product.product_code}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {product.product_name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {product.pack_size}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {product.category || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {product.brand || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {product.company_name || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {product.unit_price ? product.unit_price.toFixed(2) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {product.stock_quantity}
                          </div>
                          <div className="text-xs text-gray-500">
                            Reorder: {product.reorder_level}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="space-y-1">
                            {getStockStatusBadge(
                              product.stock_quantity,
                              product.reorder_level
                            )}
                            {product.is_active ? (
                              <span className="block text-xs text-green-600">Active</span>
                            ) : (
                              <span className="block text-xs text-gray-400">Inactive</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleViewWarehouseStock(product)}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                            title="View Warehouse Stock"
                          >
                            <BuildingStorefrontIcon className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => navigate(`/products/edit/${product.id}`)}
                            className="text-primary-600 hover:text-primary-900 mr-3"
                            title="Edit"
                          >
                            <PencilIcon className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(product.id, product.product_name)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete"
                          >
                            <TrashIcon className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        Showing{' '}
                        <span className="font-medium">
                          {(currentPage - 1) * limit + 1}
                        </span>{' '}
                        to{' '}
                        <span className="font-medium">
                          {Math.min(currentPage * limit, totalProducts)}
                        </span>{' '}
                        of <span className="font-medium">{totalProducts}</span> results
                      </p>
                    </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                        <button
                          onClick={() => setCurrentPage(currentPage - 1)}
                          disabled={currentPage === 1}
                          className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Previous
                        </button>
                        {[...Array(totalPages)].map((_, index) => {
                          const page = index + 1;
                          // Show first page, last page, current page, and pages around current
                          if (
                            page === 1 ||
                            page === totalPages ||
                            (page >= currentPage - 1 && page <= currentPage + 1)
                          ) {
                            return (
                              <button
                                key={page}
                                onClick={() => setCurrentPage(page)}
                                className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                  page === currentPage
                                    ? 'z-10 bg-primary-50 border-primary-500 text-primary-600'
                                    : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                }`}
                              >
                                {page}
                              </button>
                            );
                          } else if (
                            page === currentPage - 2 ||
                            page === currentPage + 2
                          ) {
                            return (
                              <span
                                key={page}
                                className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700"
                              >
                                ...
                              </span>
                            );
                          }
                          return null;
                        })}
                        <button
                          onClick={() => setCurrentPage(currentPage + 1)}
                          disabled={currentPage === totalPages}
                          className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Next
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Warehouse Stock Modal */}
      {showWarehouseStockModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div 
              className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" 
              onClick={() => setShowWarehouseStockModal(false)}
            ></div>

            {/* Modal panel */}
            <div className="inline-block w-full max-w-2xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white rounded-lg shadow-xl">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700">
                <div className="flex items-center">
                  <BuildingStorefrontIcon className="w-6 h-6 text-white mr-2" />
                  <h3 className="text-lg font-semibold text-white">
                    Warehouse Stock Distribution
                  </h3>
                </div>
                <button
                  onClick={() => setShowWarehouseStockModal(false)}
                  className="text-white hover:text-gray-200"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              {/* Content */}
              <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
                {loadingWarehouseStock ? (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="mt-2 text-sm text-gray-600">Loading warehouse stock...</p>
                  </div>
                ) : selectedProductStock ? (
                  <>
                    {/* Product Info */}
                    <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm text-gray-500">Product Code: {selectedProductStock.product?.product_code}</p>
                          <h4 className="text-lg font-semibold text-gray-900">{selectedProductStock.product?.product_name}</h4>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500">Global Stock</p>
                          <p className="text-2xl font-bold text-gray-900">{selectedProductStock.product?.global_stock || 0}</p>
                        </div>
                      </div>
                    </div>

                    {/* Error message */}
                    {selectedProductStock.error && (
                      <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-600">{selectedProductStock.error}</p>
                      </div>
                    )}

                    {/* Stock Summary */}
                    {selectedProductStock.totals && selectedProductStock.totals.totalWarehouses > 0 && (
                      <div className="mb-4 grid grid-cols-4 gap-3">
                        <div className="p-3 bg-blue-50 rounded-lg text-center">
                          <p className="text-xs text-blue-600">Warehouses</p>
                          <p className="text-xl font-bold text-blue-700">{selectedProductStock.totals.totalWarehouses}</p>
                        </div>
                        <div className="p-3 bg-green-50 rounded-lg text-center">
                          <p className="text-xs text-green-600">Total Qty</p>
                          <p className="text-xl font-bold text-green-700">{selectedProductStock.totals.totalQuantity}</p>
                        </div>
                        <div className="p-3 bg-orange-50 rounded-lg text-center">
                          <p className="text-xs text-orange-600">Reserved</p>
                          <p className="text-xl font-bold text-orange-700">{selectedProductStock.totals.totalReserved}</p>
                        </div>
                        <div className="p-3 bg-purple-50 rounded-lg text-center">
                          <p className="text-xs text-purple-600">Available</p>
                          <p className="text-xl font-bold text-purple-700">{selectedProductStock.totals.totalAvailable}</p>
                        </div>
                      </div>
                    )}

                    {/* Warehouse Stock Table */}
                    {selectedProductStock.warehouseStock && selectedProductStock.warehouseStock.length > 0 ? (
                      <div className="overflow-hidden border border-gray-200 rounded-lg">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Warehouse</th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Quantity</th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Reserved</th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Available</th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {selectedProductStock.warehouseStock.map((ws, index) => {
                              const isLowStock = ws.quantity <= ws.min_stock_level;
                              const isOutOfStock = ws.available_quantity <= 0;
                              return (
                                <tr key={index} className={isOutOfStock ? 'bg-red-50' : isLowStock ? 'bg-yellow-50' : ''}>
                                  <td className="px-4 py-3 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900">{ws.warehouse_name}</div>
                                    {ws.warehouse_code && <div className="text-xs text-gray-500">{ws.warehouse_code}</div>}
                                    {ws.location_in_warehouse && <div className="text-xs text-gray-400">📍 {ws.location_in_warehouse}</div>}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-center">
                                    <span className="text-sm font-semibold text-gray-900">{ws.quantity}</span>
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-center">
                                    <span className="text-sm text-orange-600">{ws.reserved_quantity || 0}</span>
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-center">
                                    <span className={`text-sm font-semibold ${ws.available_quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                      {ws.available_quantity}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-center">
                                    {isOutOfStock ? (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                        Out of Stock
                                      </span>
                                    ) : isLowStock ? (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                        <ExclamationTriangleIcon className="w-3 h-3 mr-1" />
                                        Low Stock
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                        OK
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-8 bg-gray-50 rounded-lg">
                        <BuildingStorefrontIcon className="w-12 h-12 mx-auto text-gray-400" />
                        <p className="mt-2 text-sm text-gray-500">No warehouse stock records found</p>
                        <p className="text-xs text-gray-400 mt-1">Add this product to warehouses from Warehouse Management</p>
                      </div>
                    )}
                  </>
                ) : null}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-gray-50 flex justify-end">
                <button
                  onClick={() => setShowWarehouseStockModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductListPage;
