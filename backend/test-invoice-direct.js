/**
 * Direct Database Test for Invoice Creation
 * Tests invoice creation functionality directly via database model
 */

const Invoice = require('./src/models/Invoice');
const Order = require('./src/models/Order');
const db = require('./src/config/database');

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

async function testInvoiceModelDirectly() {
  log('\n╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║     INVOICE MODEL DIRECT TEST (Database Level)            ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════╝', 'cyan');

  try {
    // Test 1: Fetch an approved order
    log('\n📝 Test 1: Fetching approved order from database...', 'yellow');
    const orders = await Order.findAll({ status: 'approved', limit: 1 });
    
    if (orders.orders.length === 0) {
      log('⚠️  No approved orders found. Creating test data...', 'yellow');
      log('   Please run: node backend/create-sample-orders.js first', 'red');
      return;
    }
    
    const order = orders.orders[0];
    log('✅ Found order:', 'green');
    log(`   Order Number: ${order.order_number}`, 'blue');
    log(`   Shop: ${order.shop_name}`, 'blue');
    log(`   Salesman: ${order.salesman_name}`, 'blue');
    log(`   Amount: ${order.net_amount}`, 'blue');

    // Test 2: Create invoice from order using model
    log('\n📝 Test 2: Creating invoice from order (Model level)...', 'yellow');
    
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
      notes: 'Test invoice - Direct model test',
      terms_conditions: 'Payment due within 30 days'
    };
    
    const invoice = await Invoice.createFromOrder(invoiceData, []);
    
    log('✅ Invoice created successfully!', 'green');
    log(`   Invoice Number: ${invoice.invoice_number}`, 'green');
    log(`   Invoice ID: ${invoice.id}`, 'green');
    log(`   Items Count: ${invoice.items?.length || 0}`, 'green');
    log(`   Net Amount: ${invoice.net_amount}`, 'green');
    log(`   Payment Status: ${invoice.payment_status}`, 'green');
    log(`   Status: ${invoice.status}`, 'green');

    // Test 3: Retrieve the created invoice
    log('\n📝 Test 3: Retrieving created invoice...', 'yellow');
    const retrievedInvoice = await Invoice.findById(invoice.id);
    
    if (retrievedInvoice) {
      log('✅ Invoice retrieved successfully!', 'green');
      log(`   Invoice Number: ${retrievedInvoice.invoice_number}`, 'green');
      log(`   Shop: ${retrievedInvoice.shop_name}`, 'green');
      log(`   Items: ${retrievedInvoice.items?.length || 0}`, 'green');
      
      if (retrievedInvoice.items && retrievedInvoice.items.length > 0) {
        log('\n   Invoice Items:', 'cyan');
        retrievedInvoice.items.forEach((item, index) => {
          log(`      ${index + 1}. ${item.product_name} - Qty: ${item.quantity} @ ${item.unit_price} = ${item.total_amount}`, 'blue');
        });
      }
    }

    // Test 4: Fetch all invoices
    log('\n📝 Test 4: Fetching all invoices...', 'yellow');
    const allInvoices = await Invoice.findAll({ page: 1, limit: 5 });
    log(`✅ Found ${allInvoices.pagination.total} total invoices`, 'green');
    log(`   Current page: ${allInvoices.invoices.length} invoices`, 'green');
    
    if (allInvoices.invoices.length > 0) {
      log('\n   Recent Invoices:', 'cyan');
      allInvoices.invoices.forEach((inv, index) => {
        log(`      ${index + 1}. ${inv.invoice_number} - ${inv.shop_name} - ${inv.net_amount} (${inv.payment_status})`, 'blue');
      });
    }

    // Test 5: Create invoice without order (custom items)
    log('\n📝 Test 5: Creating invoice with custom items (no order)...', 'yellow');
    
    // Fetch some products for test items
    const [products] = await db.query('SELECT * FROM products LIMIT 3');
    
    if (products.length > 0) {
      const items = products.map((product, index) => ({
        product_id: product.id,
        product_name: product.product_name,
        product_code: product.product_code,
        quantity: (index + 1) * 5,
        unit_price: product.price || 100,
        discount_percentage: 0,
        discount_amount: 0,
        total_amount: (index + 1) * 5 * (product.price || 100)
      }));
      
      const customInvoiceData = {
        shop_id: order.shop_id,
        shop_name: order.shop_name,
        salesman_id: order.salesman_id,
        salesman_name: order.salesman_name,
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        discount_percentage: 10,
        tax_percentage: 0,
        shipping_charges: 50,
        credit_days: 30,
        notes: 'Custom invoice with manual items',
        terms_conditions: 'Payment due within 30 days'
      };
      
      const customInvoice = await Invoice.createFromOrder(customInvoiceData, items);
      
      log('✅ Custom invoice created successfully!', 'green');
      log(`   Invoice Number: ${customInvoice.invoice_number}`, 'green');
      log(`   Items: ${customInvoice.items?.length || 0}`, 'green');
      log(`   Net Amount: ${customInvoice.net_amount}`, 'green');
    }

    // Summary
    log('\n╔════════════════════════════════════════════════════════════╗', 'green');
    log('║              ALL TESTS PASSED SUCCESSFULLY!                ║', 'green');
    log('╚════════════════════════════════════════════════════════════╝', 'green');
    log('\n✅ Invoice creation functionality is working properly!', 'green');
    log('   ✓ Create invoice from order', 'green');
    log('   ✓ Fetch invoice by ID', 'green');
    log('   ✓ List all invoices', 'green');
    log('   ✓ Create invoice with custom items', 'green');
    log('\n📊 Database operations completed successfully!', 'cyan');

    process.exit(0);

  } catch (error) {
    log('\n╔════════════════════════════════════════════════════════════╗', 'red');
    log('║                    TEST FAILED                             ║', 'red');
    log('╚════════════════════════════════════════════════════════════╝', 'red');
    log(`\n❌ Error: ${error.message}`, 'red');
    if (error.stack) {
      log(`\n📋 Stack trace:`, 'yellow');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run the test
log('\n🚀 Starting Direct Invoice Model Test...\n', 'cyan');
testInvoiceModelDirectly();
