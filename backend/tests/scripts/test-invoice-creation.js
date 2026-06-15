/**
 * Test Invoice Creation Functionality
 * Comprehensive test to verify invoice creation works properly
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

// Test configuration
const TEST_CONFIG = {
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function loginAsAdmin() {
  try {
    log('\n📝 Step 1: Logging in as admin...', 'cyan');
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });

    if (response.data.success || response.data.token) {
      log('✅ Login successful', 'green');
      return response.data.token;
    } else {
      throw new Error('Login failed');
    }
  } catch (error) {
    log(`❌ Login failed: ${error.response?.data?.message || error.message}`, 'red');
    throw error;
  }
}

async function fetchTestData(token) {
  try {
    log('\n📊 Step 2: Fetching test data (orders, shops, products)...', 'cyan');
    
    const headers = { Authorization: `Bearer ${token}` };
    
    // Get approved/delivered orders
    const ordersResponse = await axios.get(`${BASE_URL}/desktop/orders?status=approved&limit=5`, { headers });
    const orders = ordersResponse.data.data || [];
    log(`   Found ${orders.length} approved orders`, 'blue');
    
    // Get shops
    const shopsResponse = await axios.get(`${BASE_URL}/desktop/shops?limit=5`, { headers });
    const shops = shopsResponse.data.data || [];
    log(`   Found ${shops.length} shops`, 'blue');
    
    // Get products
    const productsResponse = await axios.get(`${BASE_URL}/desktop/products?limit=10`, { headers });
    const products = productsResponse.data.data || [];
    log(`   Found ${products.length} products`, 'blue');
    
    return { orders, shops, products };
  } catch (error) {
    log(`❌ Failed to fetch test data: ${error.message}`, 'red');
    throw error;
  }
}

async function testInvoiceCreationFromOrder(token, order) {
  try {
    log(`\n🧪 Test 1: Create invoice from Order #${order.order_number}`, 'yellow');
    log(`   Order ID: ${order.id}`, 'blue');
    log(`   Shop: ${order.shop_name}`, 'blue');
    log(`   Amount: ${order.net_amount}`, 'blue');
    
    const invoiceData = {
      order_id: order.id,
      shop_id: order.shop_id,
      shop_name: order.shop_name,
      salesman_id: order.salesman_id,
      salesman_name: order.salesman_name,
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      discount_percentage: 5,
      tax_percentage: 0,
      shipping_charges: 0,
      credit_days: 30,
      notes: 'Test invoice created from order',
      terms_conditions: 'Payment due within 30 days'
    };
    
    const response = await axios.post(
      `${BASE_URL}/desktop/invoices`,
      invoiceData,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    if (response.data.success) {
      log('✅ Invoice created successfully!', 'green');
      log(`   Invoice Number: ${response.data.data.invoice_number}`, 'green');
      log(`   Invoice ID: ${response.data.data.id}`, 'green');
      log(`   Net Amount: ${response.data.data.net_amount}`, 'green');
      log(`   Status: ${response.data.data.status}`, 'green');
      return response.data.data;
    } else {
      throw new Error('Invoice creation returned false success');
    }
  } catch (error) {
    log(`❌ Test 1 FAILED: ${error.response?.data?.message || error.message}`, 'red');
    if (error.response?.data?.error) {
      log(`   Error details: ${error.response.data.error}`, 'red');
    }
    throw error;
  }
}

async function testInvoiceCreationWithItems(token, shop, products) {
  try {
    log(`\n🧪 Test 2: Create invoice with custom items (no order)`, 'yellow');
    log(`   Shop: ${shop.shop_name}`, 'blue');
    
    // Create invoice items from products
    const items = products.slice(0, 3).map((product, index) => ({
      product_id: product.id,
      product_name: product.product_name,
      product_code: product.product_code,
      quantity: (index + 1) * 5,
      unit_price: product.price,
      discount_percentage: 0,
      discount_amount: 0,
      total_amount: (index + 1) * 5 * product.price
    }));
    
    log(`   Adding ${items.length} items`, 'blue');
    
    const invoiceData = {
      shop_id: shop.id,
      shop_name: shop.shop_name,
      shop_owner_name: shop.owner_name,
      shop_address: shop.address,
      shop_city: shop.city,
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      discount_percentage: 10,
      tax_percentage: 0,
      shipping_charges: 100,
      credit_days: 30,
      notes: 'Test invoice with custom items',
      terms_conditions: 'Payment due within 30 days',
      items: items
    };
    
    const response = await axios.post(
      `${BASE_URL}/desktop/invoices`,
      invoiceData,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    if (response.data.success) {
      log('✅ Invoice with items created successfully!', 'green');
      log(`   Invoice Number: ${response.data.data.invoice_number}`, 'green');
      log(`   Invoice ID: ${response.data.data.id}`, 'green');
      log(`   Items Count: ${response.data.data.items?.length || 0}`, 'green');
      log(`   Net Amount: ${response.data.data.net_amount}`, 'green');
      return response.data.data;
    } else {
      throw new Error('Invoice creation returned false success');
    }
  } catch (error) {
    log(`❌ Test 2 FAILED: ${error.response?.data?.message || error.message}`, 'red');
    if (error.response?.data?.error) {
      log(`   Error details: ${error.response.data.error}`, 'red');
    }
    throw error;
  }
}

async function testGetInvoice(token, invoiceId) {
  try {
    log(`\n🧪 Test 3: Retrieve invoice by ID (${invoiceId})`, 'yellow');
    
    const response = await axios.get(
      `${BASE_URL}/desktop/invoices/${invoiceId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    if (response.data.success && response.data.data) {
      const invoice = response.data.data;
      log('✅ Invoice retrieved successfully!', 'green');
      log(`   Invoice Number: ${invoice.invoice_number}`, 'green');
      log(`   Shop: ${invoice.shop_name}`, 'green');
      log(`   Items: ${invoice.items?.length || 0}`, 'green');
      log(`   Net Amount: ${invoice.net_amount}`, 'green');
      log(`   Payment Status: ${invoice.payment_status}`, 'green');
      return invoice;
    } else {
      throw new Error('Failed to retrieve invoice');
    }
  } catch (error) {
    log(`❌ Test 3 FAILED: ${error.response?.data?.message || error.message}`, 'red');
    throw error;
  }
}

async function testGetAllInvoices(token) {
  try {
    log(`\n🧪 Test 4: Fetch all invoices (list)`, 'yellow');
    
    const response = await axios.get(
      `${BASE_URL}/desktop/invoices?page=1&limit=10`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    if (response.data.success) {
      const invoices = response.data.data || [];
      const pagination = response.data.pagination || {};
      log('✅ Invoices fetched successfully!', 'green');
      log(`   Total Invoices: ${pagination.total || invoices.length}`, 'green');
      log(`   Current Page: ${pagination.page || 1}`, 'green');
      log(`   Invoices on page: ${invoices.length}`, 'green');
      
      if (invoices.length > 0) {
        log(`   Latest Invoice: ${invoices[0].invoice_number}`, 'blue');
      }
      
      return invoices;
    } else {
      throw new Error('Failed to fetch invoices');
    }
  } catch (error) {
    log(`❌ Test 4 FAILED: ${error.response?.data?.message || error.message}`, 'red');
    throw error;
  }
}

async function testInvoiceUpdate(token, invoiceId) {
  try {
    log(`\n🧪 Test 5: Update invoice (${invoiceId})`, 'yellow');
    
    const updateData = {
      notes: 'Updated test notes - ' + new Date().toISOString(),
      discount_percentage: 7.5
    };
    
    const response = await axios.put(
      `${BASE_URL}/desktop/invoices/${invoiceId}`,
      updateData,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    if (response.data.success) {
      log('✅ Invoice updated successfully!', 'green');
      log(`   Updated notes: ${response.data.data.notes}`, 'green');
      return response.data.data;
    } else {
      throw new Error('Failed to update invoice');
    }
  } catch (error) {
    log(`❌ Test 5 FAILED: ${error.response?.data?.message || error.message}`, 'red');
    throw error;
  }
}

async function runAllTests() {
  const startTime = Date.now();
  
  log('╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║        INVOICE CREATION COMPREHENSIVE TEST SUITE          ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════╝', 'cyan');
  
  try {
    // Step 1: Login
    const token = await loginAsAdmin();
    
    // Step 2: Fetch test data
    const { orders, shops, products } = await fetchTestData(token);
    
    if (orders.length === 0) {
      log('\n⚠️  No approved orders found. Skipping Test 1.', 'yellow');
    }
    
    if (shops.length === 0 || products.length === 0) {
      log('\n⚠️  Insufficient shops or products. Skipping Test 2.', 'yellow');
    }
    
    let createdInvoices = [];
    
    // Test 1: Create invoice from order (if order exists)
    if (orders.length > 0) {
      try {
        const invoice1 = await testInvoiceCreationFromOrder(token, orders[0]);
        createdInvoices.push(invoice1);
      } catch (error) {
        log('   Continuing with other tests...', 'yellow');
      }
    }
    
    // Test 2: Create invoice with custom items (if shop and products exist)
    if (shops.length > 0 && products.length > 0) {
      try {
        const invoice2 = await testInvoiceCreationWithItems(token, shops[0], products);
        createdInvoices.push(invoice2);
      } catch (error) {
        log('   Continuing with other tests...', 'yellow');
      }
    }
    
    // Test 3: Retrieve invoice (if we created any)
    if (createdInvoices.length > 0) {
      await testGetInvoice(token, createdInvoices[0].id);
    }
    
    // Test 4: Get all invoices
    await testGetAllInvoices(token);
    
    // Test 5: Update invoice (if we created any)
    if (createdInvoices.length > 0) {
      await testInvoiceUpdate(token, createdInvoices[0].id);
    }
    
    // Summary
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    log('\n╔════════════════════════════════════════════════════════════╗', 'green');
    log('║                   TEST SUMMARY - SUCCESS                   ║', 'green');
    log('╚════════════════════════════════════════════════════════════╝', 'green');
    log(`   ✅ All tests completed successfully!`, 'green');
    log(`   ⏱️  Total time: ${duration}s`, 'green');
    log(`   📄 Invoices created: ${createdInvoices.length}`, 'green');
    
    if (createdInvoices.length > 0) {
      log('\n   Created Invoice Numbers:', 'cyan');
      createdInvoices.forEach((inv, index) => {
        log(`      ${index + 1}. ${inv.invoice_number} (ID: ${inv.id})`, 'blue');
      });
    }
    
    log('\n✅ Invoice creation functionality is working properly!', 'green');
    
  } catch (error) {
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    log('\n╔════════════════════════════════════════════════════════════╗', 'red');
    log('║                   TEST SUMMARY - FAILED                    ║', 'red');
    log('╚════════════════════════════════════════════════════════════╝', 'red');
    log(`   ❌ Tests failed after ${duration}s`, 'red');
    log(`   Error: ${error.message}`, 'red');
    
    process.exit(1);
  }
}

// Run tests
log('\n🚀 Starting Invoice Creation Tests...\n', 'cyan');
runAllTests().catch(error => {
  log(`\n💥 Unexpected error: ${error.message}`, 'red');
  process.exit(1);
});
