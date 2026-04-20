import React, { useState } from 'react';
import { useToast } from '../../context/ToastContext';
import { useNavigate } from 'react-router-dom';
import productService from '../../services/productService';
import {
  ArrowLeftIcon,
  ArrowUpTrayIcon,
  DocumentArrowDownIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

const BulkImportPage = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [preview, setPreview] = useState([]);
  
  // New States for mapping pipeline
  const [parsing, setParsing] = useState(false);
  const [fileHeaders, setFileHeaders] = useState([]);
  const [parsedData, setParsedData] = useState([]);
  const [hasHeaders, setHasHeaders] = useState(true); // Toggle to skip row 1
  
  // Mandatory vs Optional Field Map
  const [columnMapping, setColumnMapping] = useState({
    product_name: '', // Required
    company_name: '', // Company / Brand
    stock_quantity: '', // Required
    unit_price: '', // Required
    category: '',
    barcode: ''
  });

  const availableDBFields = [
    { key: 'product_name', label: 'Product Name (Required)' },
    { key: 'company_name', label: 'Company / Brand' },
    { key: 'stock_quantity', label: 'Stock Quantity (Required)' },
    { key: 'unit_price', label: 'Unit Price (Required)' },
    { key: 'category', label: 'Category' },
    { key: 'barcode', label: 'Barcode' },
    { key: 'is_active', label: 'Active Status' }
  ];

  // Handle file selection & parsing via Backend
  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Allow csv, xlsx, xls, pdf
      if (!selectedFile.name.match(/\.(csv|xlsx|xls|pdf)$/i)) {
        showToast('Please select a valid CSV, Excel, or PDF file', 'error');
        return;
      }
      setFile(selectedFile);
      setResults(null);
      setParsing(true);

      try {
        const response = await productService.uploadAndParseFile(selectedFile);
        setParsing(false);
        if (response.success && response.data) {
          setFileHeaders(response.data.headers);
          setParsedData(response.data.rows);
          setPreview(response.data.rows.slice(0, 3)); // show first 3 rows
          
          // Auto-guess map
          const autoMap = { ...columnMapping };
          response.data.headers.forEach(header => {
            const h = header.toLowerCase();
            if (h.includes('name') || h.includes('product')) autoMap.product_name = header;
            if (h.includes('stock') || h.includes('qty') || h.includes('quantity')) autoMap.stock_quantity = header;
            if (h.includes('price')) autoMap.unit_price = header;
            if (h.includes('company') || h.includes('brand')) autoMap.company_name = header;
          });
          setColumnMapping(autoMap);

          showToast(`Extracted ${response.data.rowCount} rows. Please map columns.`, 'success');
        }
      } catch (err) {
        setParsing(false);
        showToast('Error parsing file: ' + (err.message || 'Server error'), 'error');
      }
    }
  };

  const handleMappingChange = (dbFieldKey, fileHeader) => {
    setColumnMapping({
      ...columnMapping,
      [dbFieldKey]: fileHeader
    });
  };

  // Process data with mappings and submit
  const handleImport = async () => {
    if (!file || parsedData.length === 0) {
      showToast('Please select and parse a file first', 'error');
      return;
    }

    if (!columnMapping.product_name) {
      showToast('Product Name column must be mapped', 'error');
      return;
    }

    setLoading(true);
    
    try {
      // If hasHeaders is true, drop the first element since it's just the header row
      const dataToProcess = hasHeaders ? parsedData.slice(1) : parsedData;
      
      // Map data according to user choices
      const mappedProducts = dataToProcess.map(row => {
        const product = {};
        Object.keys(columnMapping).forEach(dbKey => {
          const fileHeader = columnMapping[dbKey];
          if (fileHeader && row[fileHeader] !== undefined) {
             const val = row[fileHeader];
             // Parse numerics/booleans
             if (dbKey === 'stock_quantity') {
               product[dbKey] = val ? parseInt(val.toString().trim(), 10) || 0 : 0;
             } else if (dbKey === 'unit_price') {
               product[dbKey] = val ? parseFloat(val.toString().trim()) || 0 : 0;
             } else if (dbKey === 'is_active') {
               const strVal = val.toString().trim().toLowerCase();
               product[dbKey] = (strVal === 'true' || strVal === '1' || strVal === 'yes');
             } else {
               product[dbKey] = val.toString().trim();
             }
          }
        });
        // Default brand if company mapped
        if (product.company_name && !product.brand) {
          product.brand = product.company_name;
        }
        return product;
      }).filter(p => p.product_name); // Only valid rows

      if (mappedProducts.length === 0) {
        showToast('No valid products to import after mapping', 'error');
        setLoading(false);
        return;
      }

      // Send to API Upsert
      const response = await productService.bulkImportProducts(mappedProducts);
      
      if (response.success) {
        setResults(response.data);
        showToast(response.message || 'Import successful', 'success');
      } else {
        showToast(response.message || 'Import failed', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Import failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Download sample CSV
  const downloadSample = () => {
    const sample = `product_name,category,brand,pack_size,unit_price,carton_price,stock_quantity,reorder_level,supplier_id,barcode,description,is_active\nCoca Cola,Beverages,Coca Cola,330ml,50,480,100,20,1,8000123456,Refreshing cola drink,true`;
    
    const blob = new Blob([sample], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'products_sample.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
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
                <h1 className="text-3xl font-bold text-gray-900">Bulk Import Products</h1>
                <p className="text-sm text-gray-600 mt-1">
                  Import multiple products from a CSV file
                </p>
              </div>
            </div>
            <button
              onClick={downloadSample}
              className="inline-flex items-center px-4 py-2 border border-primary-600 text-sm font-medium rounded-md text-primary-600 bg-white hover:bg-primary-50"
            >
              <DocumentArrowDownIcon className="w-5 h-5 mr-2" />
              Download Sample CSV
            </button>
          </div>

          
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Step 1: Upload File</h2>
          
          <div className={`border-2 border-dashed ${file && !parsing ? 'border-primary-500 bg-primary-50' : 'border-gray-300'} rounded-lg p-8 text-center`}>
            <ArrowUpTrayIcon className={`mx-auto h-12 w-12 ${file ? 'text-primary-500' : 'text-gray-400'}`} />
            <div className="mt-4">
              <label className="cursor-pointer">
                <span className="mt-2 block text-sm font-medium text-primary-600 hover:text-primary-500">
                  {file ? file.name : 'Choose a CSV, Excel or PDF file'}
                </span>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls,.pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>
            {parsing && (
              <p className="mt-2 text-sm text-primary-600 font-medium animate-pulse">
                Parsing file intelligently... Please wait.
              </p>
            )}
            <p className="mt-2 text-xs text-gray-500">
              CSV, Excel (.xlsx), or text-heavy PDF. Max file size: 10MB
            </p>
          </div>
        </div>

        {/* Step 2: Mapping Section */}
        {fileHeaders.length > 0 && !results && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Step 2: Map Your Columns</h2>
                <p className="text-sm text-gray-600">
                  Match the columns from your uploaded file to the required system fields. The system attempts to auto-map based on column names.
                </p>
              </div>
              <div className="flex items-center">
                <input
                  id="hasHeaders"
                  type="checkbox"
                  checked={hasHeaders}
                  onChange={(e) => setHasHeaders(e.target.checked)}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="hasHeaders" className="ml-2 block text-sm font-medium text-gray-700">
                  File has headers (Skip row 1)
                </label>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 mb-6">
              {availableDBFields.map(field => (
                <div key={field.key} className="flex flex-col">
                  <label className="text-sm font-medium text-gray-700 mb-1">{field.label}</label>
                  <select
                    value={columnMapping[field.key]}
                    onChange={(e) => handleMappingChange(field.key, e.target.value)}
                    className="border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-sm"
                  >
                    <option value="">-- Ignore / Not present --</option>
                    {fileHeaders.map((header, i) => (
                      <option key={i} value={header}>{header}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            
            <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                <h3 className="text-sm font-semibold text-gray-800 mb-3">Live Preview (First 3 Extracted Data Rows)</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-xs">
                    <thead className="bg-gray-100">
                      <tr>
                        {availableDBFields.map(field => (
                          <th key={field.key} className="px-4 py-2 text-left font-medium text-gray-500 uppercase">
                            {field.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {(hasHeaders ? parsedData.slice(1, 4) : parsedData.slice(0, 3)).map((row, index) => (
                        <tr key={index}>
                          {availableDBFields.map(field => {
                          const fileHeader = columnMapping[field.key];
                          const val = fileHeader ? row[fileHeader] : '-';
                          return (
                            <td key={field.key} className="px-4 py-2 whitespace-nowrap text-gray-900 border-r border-gray-100 last:border-r-0">
                              {val}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={handleImport}
                disabled={loading || !columnMapping.product_name}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors"
              >
                {loading ? 'Upserting Products...' : 'Confirm & Import (Upsert)'}
              </button>
            </div>
          </div>
        )}

        {/* Results Section */}
        {results && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Import Results</h2>
            
            <div className="mb-4 grid grid-cols-3 gap-4">
              <div className="flex flex-col items-center justify-center p-4 bg-green-50 rounded-lg">
                <div className="flex items-center text-green-600 mb-1">
                  <CheckCircleIcon className="w-6 h-6 mr-2" />
                  <span className="font-bold text-lg">{results.success?.length || 0}</span>
                </div>
                <span className="text-sm font-medium text-green-800">New Products Created</span>
              </div>
              <div className="flex flex-col items-center justify-center p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center text-blue-600 mb-1">
                  <ArrowUpTrayIcon className="w-6 h-6 mr-2" />
                  <span className="font-bold text-lg">{results.updated?.length || 0}</span>
                </div>
                <span className="text-sm font-medium text-blue-800">Products Updated (Stock Added)</span>
              </div>
              <div className="flex flex-col items-center justify-center p-4 bg-red-50 rounded-lg">
                <div className="flex items-center text-red-600 mb-1">
                  <XCircleIcon className="w-6 h-6 mr-2" />
                  <span className="font-bold text-lg">{results.errors?.length || 0}</span>
                </div>
                <span className="text-sm font-medium text-red-800">Failed Records</span>
              </div>
            </div>

            {results.errors && results.errors.length > 0 && (
              <div>
                <h3 className="text-md font-medium text-gray-900 mb-2">Errors:</h3>
                <div className="space-y-2">
                  {results.errors.map((error, index) => (
                    <div key={index} className="bg-red-50 rounded p-3">
                      <p className="text-sm text-red-800">
                        <span className="font-medium">Row {error.row}:</span> {error.message}
                      </p>
                      {error.productName && (
                        <p className="text-xs text-red-600 mt-1">
                          Product: {error.productName}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setFile(null);
                  setResults(null);
                  setPreview([]);
                  setParsedData([]);
                  setFileHeaders([]);
                }}
                className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Import Another File
              </button>
              <button
                onClick={() => navigate('/products')}
                className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
              >
                View Products
              </button>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-white rounded-lg shadow-md p-6 mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Instructions</h2>
          <div className="prose text-sm text-gray-600">
            <ul className="list-disc pl-5 space-y-2 text-sm text-gray-600">
              <li><strong>Formats:</strong> File format must be CSV, Excel (.xlsx/.xls), or a well-structured PDF.</li>
              <li><strong>Extraction:</strong> The system will automatically extract all column headers from the top row of your file.</li>
              <li><strong>Mapping:</strong> You must manually map your file's columns to the system's database fields using the dropdowns above.</li>
              <li><strong>Required:</strong> <span className="font-medium text-gray-900">Product Name</span> must be mapped. Unit Price and Stock Quantity are highly recommended.</li>
              <li><strong>Intelligent Upsert:</strong> If a product with the same name already exists in the system, its <span className="font-medium text-blue-600">Stock Quantity</span> will be incrementally added to the existing stock. No duplicates will be created.</li>
              <li><strong>New Products:</strong> If a product name is new, a completely new product code and record will be generated automatically.</li>
              <li><strong>Numeric fields:</strong> The parser will automatically attempt to extract numbers, but ensure your files don't use currency symbols (e.g., 50, not Rs. 50) for best results.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkImportPage;
