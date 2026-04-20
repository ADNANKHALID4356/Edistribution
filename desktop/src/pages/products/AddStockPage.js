// Add Stock Page
// Purpose: Add stock to existing products
// Date: March 23, 2026

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import productService from '../../services/productService';
import { ArrowLeftIcon, MagnifyingGlassIcon, PlusIcon, CubeIcon } from '@heroicons/react/24/outline';

const AddStockPage = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [addStockData, setAddStockData] = useState({}); // { productId: quantity }

  const searchProducts = useCallback(async () => {
    try {
      setSearching(true);
      const response = await productService.getProducts({
        search: searchTerm,
        is_active: true,
        limit: 50
      });

      if (response.success) {
        setProducts(response.data || []);
      }
    } catch (error) {
      console.error('Error searching products:', error);
      showToast('Failed to search products', 'error');
    } finally {
      setSearching(false);
    }
  }, [searchTerm, showToast]);

  // Search products when search term changes
  useEffect(() => {
    if (searchTerm.trim().length >= 2) {
      searchProducts();
    } else {
      setProducts([]);
    }
  }, [searchTerm, searchProducts]);

  const handleAddStockChange = (productId, quantity) => {
    setAddStockData(prev => ({
      ...prev,
      [productId]: parseInt(quantity) || 0
    }));
  };

  const handleAddStock = async (product) => {
    const addQuantity = addStockData[product.id] || 0;

    if (addQuantity <= 0) {
      showToast('Please enter a valid quantity to add', 'error');
      return;
    }

    try {
      setLoading(true);

      const response = await productService.addStock(product.id, addQuantity);

      if (response.success) {
        const newStockQuantity = response.data.stock_quantity;

        showToast(`Successfully added ${addQuantity} units to ${product.product_name}. New stock: ${newStockQuantity}`, 'success');

        // Update local state
        setProducts(prev => prev.map(p =>
          p.id === product.id
            ? { ...p, stock_quantity: newStockQuantity }
            : p
        ));

        // Clear the input
        setAddStockData(prev => ({
          ...prev,
          [product.id]: 0
        }));
      } else {
        showToast(response.message || 'Failed to add stock', 'error');
      }
    } catch (error) {
      console.error('Error adding stock:', error);
      showToast(error.message || error?.data?.message || 'Failed to add stock', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 p-6">
      <div className="max-w-6xl mx-auto">
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
                <h1 className="text-3xl font-bold text-gray-900">Add Stock</h1>
                <p className="text-sm text-gray-600 mt-1">
                  Search and add stock to existing products
                </p>
              </div>
            </div>
            <CubeIcon className="w-12 h-12 text-primary-600" />
          </div>
        </div>

        {/* Search Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="max-w-md">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Product
            </label>
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Enter product name or code..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            {searching && (
              <p className="text-sm text-gray-500 mt-2">Searching...</p>
            )}
            {!searching && searchTerm.trim().length >= 2 && products.length === 0 && (
              <p className="text-sm text-gray-500 mt-2">No products found</p>
            )}
          </div>
        </div>

        {/* Products List */}
        {products.length > 0 && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Products ({products.length})
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Current Stock
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Add Stock
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {products.map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {product.product_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {product.product_code}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {product.stock_quantity || 0} units
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <input
                          type="number"
                          min="1"
                          value={addStockData[product.id] || ''}
                          onChange={(e) => handleAddStockChange(product.id, e.target.value)}
                          placeholder="Enter quantity"
                          className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 text-center"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={() => handleAddStock(product)}
                          disabled={loading || !(addStockData[product.id] > 0)}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                          <PlusIcon className="w-4 h-4 mr-2" />
                          Add Stock
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AddStockPage;