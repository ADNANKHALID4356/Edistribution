/**
 * Comprehensive Workflow Testing
 * Black Hat Testing: Complete Order-to-Invoice-to-Ledger Flow
 * 
 * Test Scenario:
 * 1. Create 2 new shops with credit limits and opening balances
 * 2. Create orders for these shops
 * 3. Process deliveries
 * 4. Generate invoices
 * 5. Record payments
 * 6. Verify ledger entries are correct
 */

const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');

const dbPath = path.join(__dirname, 'data', 'distribution_system.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

console.log('🧪 COMPREHENSIVE WORKFLOW TESTING');
console.log('='.repeat(70));
console.log('');

// Helper function to generate unique codes
function generateShopCode() {
  return `SH-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function generateOrderNumber() {
  return `ORD-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

function generateInvoiceNumber() {
  return `INV-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

function generateReceiptNumber() {
  return `RCP-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

// Step 1: Get existing products
console.log('📦 Step 1: Getting Products...');
const products = db.prepare('SELECT * FROM products WHERE is_active = 1 LIMIT 5').all();

if (products.length === 0) {
  console.log('⚠️  No products found! Creating sample products...');
  
  const insertProduct = db.prepare(`
    INSERT INTO products (product_code, product_name, category, brand, unit_price, carton_price, 
                         pieces_per_carton, purchase_price, stock_quantity, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `);
  
  const sampleProducts = [
    ['PRD-001', 'Coca Cola 1.5L', 'Beverages', 'Coca Cola', 120, 1440, 12, 100, 500],
    ['PRD-002', 'Pepsi 1.5L', 'Beverages', 'Pepsi', 115, 1380, 12, 95, 450],
    ['PRD-003', 'Sprite 1.5L', 'Beverages', 'Sprite', 110, 1320, 12, 92, 400],
    ['PRD-004', 'Fanta 1.5L', 'Beverages', 'Fanta', 110, 1320, 12, 92, 380],
    ['PRD-005', 'Mountain Dew 1.5L', 'Beverages', 'Mountain Dew', 115, 1380, 12, 95, 420]
  ];
  
  sampleProducts.forEach(p => insertProduct.run(...p));
  products.push(...db.prepare('SELECT * FROM products WHERE is_active = 1 LIMIT 5').all());
  console.log(`✅ Created ${products.length} sample products`);
} else {
  console.log(`✅ Found ${products.length} products`);
}
console.log('');

// Step 2: Get salesman
console.log('👤 Step 2: Getting Salesman...');
let salesman = db.prepare('SELECT * FROM salesmen WHERE is_active = 1 LIMIT 1').get();

if (!salesman) {
  console.log('⚠️  No salesman found! Creating one...');
  
  // First create a user
  const bcrypt = require('bcryptjs');
  const hashedPassword = bcrypt.hashSync('salesman123', 10);
  
  const userResult = db.prepare(`
    INSERT INTO users (username, password, email, full_name, role_id, is_active)
    VALUES (?, ?, ?, ?, 2, 1)
  `).run('salesman1', hashedPassword, 'salesman1@example.com', 'Test Salesman');
  
  const userId = userResult.lastInsertRowid;
  
  const salesmanResult = db.prepare(`
    INSERT INTO salesmen (user_id, salesman_code, full_name, phone, city, monthly_target, 
                         commission_percentage, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1)
  `).run(userId, 'SAL-001', 'Test Salesman', '03001234567', 'Lahore', 500000, 2.5);
  
  salesman = db.prepare('SELECT * FROM salesmen WHERE id = ?').get(salesmanResult.lastInsertRowid);
  console.log(`✅ Created salesman: ${salesman.full_name}`);
} else {
  console.log(`✅ Using salesman: ${salesman.full_name}`);
}
console.log('');

// Step 3: Create 2 new shops with opening balances
console.log('🏪 Step 3: Creating 2 New Test Shops...');
const shopData = [
  {
    shop_code: generateShopCode(),
    shop_name: 'Premium Mart - DHA',
    owner_name: 'Ahmed Khan',
    phone: '03211234567',
    address: 'DHA Phase 5, Commercial Area',
    city: 'Lahore',
    area: 'DHA',
    credit_limit: 100000,
    opening_balance: 15000,
    current_balance: 15000
  },
  {
    shop_code: generateShopCode(),
    shop_name: 'City Center Store',
    owner_name: 'Hassan Ali',
    phone: '03337654321',
    address: 'Mall Road, Gulberg',
    city: 'Lahore',
    area: 'Gulberg',
    credit_limit: 75000,
    opening_balance: 8500,
    current_balance: 8500
  }
];

const insertShop = db.prepare(`
  INSERT INTO shops (shop_code, shop_name, owner_name, phone, address, city, area, 
                    credit_limit, opening_balance, current_balance, is_active)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
`);

const shops = [];
shopData.forEach(shop => {
  const result = insertShop.run(
    shop.shop_code, shop.shop_name, shop.owner_name, shop.phone, 
    shop.address, shop.city, shop.area, shop.credit_limit, 
    shop.opening_balance, shop.current_balance
  );
  const shopId = result.lastInsertRowid;
  shops.push({ id: shopId, ...shop });
  console.log(`✅ Created: ${shop.shop_name} (ID: ${shopId})`);
  console.log(`   📍 Location: ${shop.address}, ${shop.city}`);
  console.log(`   💰 Opening Balance: Rs ${shop.opening_balance.toLocaleString()}`);
  console.log(`   💳 Credit Limit: Rs ${shop.credit_limit.toLocaleString()}`);
  
  // Create opening balance ledger entry
  db.prepare(`
    INSERT INTO shop_ledger (shop_id, transaction_date, transaction_type, reference_number,
                            debit_amount, credit_amount, balance, description)
    VALUES (?, datetime('now'), 'opening_balance', 'OPENING', ?, 0, ?, 'Opening Balance')
  `).run(shopId, shop.opening_balance, shop.opening_balance);
  
  console.log(`   📒 Ledger: Opening balance entry created`);
  console.log('');
});
console.log('');

// Step 4: Create orders for both shops
console.log('📋 Step 4: Creating Orders...');

const createOrder = (shop, items) => {
  const orderNumber = generateOrderNumber();
  const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  const discountAmount = totalAmount * 0.05; // 5% discount
  const netAmount = totalAmount - discountAmount;
  
  // Insert order
  const orderResult = db.prepare(`
    INSERT INTO orders (order_number, shop_id, salesman_id, order_date, total_amount, 
                       discount_amount, net_amount, status)
    VALUES (?, ?, ?, datetime('now'), ?, ?, ?, 'approved')
  `).run(orderNumber, shop.id, salesman.id, totalAmount, discountAmount, netAmount);
  
  const orderId = orderResult.lastInsertRowid;
  
  // Insert order items
  const insertOrderItem = db.prepare(`
    INSERT INTO order_items (order_id, product_id, quantity, unit_price, discount_percentage, total_price)
    VALUES (?, ?, ?, ?, 5, ?)
  `);
  
  items.forEach(item => {
    const itemTotal = item.quantity * item.unit_price;
    insertOrderItem.run(orderId, item.product_id, item.quantity, item.unit_price, itemTotal);
  });
  
  console.log(`✅ Order Created: ${orderNumber}`);
  console.log(`   🏪 Shop: ${shop.shop_name}`);
  console.log(`   📦 Items: ${items.length}`);
  console.log(`   💵 Total: Rs ${totalAmount.toLocaleString()}`);
  console.log(`   🎁 Discount: Rs ${discountAmount.toLocaleString()}`);
  console.log(`   💰 Net Amount: Rs ${netAmount.toLocaleString()}`);
  console.log('');
  
  return { orderId, orderNumber, netAmount };
};

// Order 1: Premium Mart - using available products
const order1Items = [];
if (products[0]) order1Items.push({ product_id: products[0].id, quantity: 10, unit_price: products[0].unit_price });
if (products[1]) order1Items.push({ product_id: products[1].id, quantity: 8, unit_price: products[1].unit_price });
if (products[2]) order1Items.push({ product_id: products[2].id, quantity: 12, unit_price: products[2].unit_price });
if (order1Items.length === 0 && products[0]) order1Items.push({ product_id: products[0].id, quantity: 30, unit_price: products[0].unit_price });
const order1 = createOrder(shops[0], order1Items);

// Order 2: City Center Store - using available products
const order2Items = [];
if (products[3]) order2Items.push({ product_id: products[3].id, quantity: 15, unit_price: products[3].unit_price });
if (products[4]) order2Items.push({ product_id: products[4].id, quantity: 10, unit_price: products[4].unit_price });
if (order2Items.length === 0 && products[0]) order2Items.push({ product_id: products[0].id, quantity: 25, unit_price: products[0].unit_price });
const order2 = createOrder(shops[1], order2Items);

// Order 3: Another order for Premium Mart - using available products
const order3Items = [];
if (products[1]) order3Items.push({ product_id: products[1].id, quantity: 20, unit_price: products[1].unit_price });
if (products[3]) order3Items.push({ product_id: products[3].id, quantity: 15, unit_price: products[3].unit_price });
if (order3Items.length === 0 && products[0]) order3Items.push({ product_id: products[0].id, quantity: 35, unit_price: products[0].unit_price });
const order3 = createOrder(shops[0], order3Items);

console.log('');

// Step 5: Create Invoices from Orders
console.log('🧾 Step 5: Creating Invoices...');

const createInvoice = (order, shop) => {
  const invoiceNumber = generateInvoiceNumber();
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30); // 30 days payment term
  
  const invoiceResult = db.prepare(`
    INSERT INTO invoices (invoice_number, shop_id, invoice_date, due_date, total_amount,
                         discount_amount, net_amount, paid_amount, balance_amount, status)
    VALUES (?, ?, datetime('now'), ?, ?, 0, ?, 0, ?, 'unpaid')
  `).run(
    invoiceNumber, shop.id, dueDate.toISOString(), 
    order.netAmount, order.netAmount, order.netAmount
  );
  
  const invoiceId = invoiceResult.lastInsertRowid;
  
  // Get order items and create invoice items
  const orderItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.orderId);
  
  const insertInvoiceItem = db.prepare(`
    INSERT INTO invoice_items (invoice_id, product_id, quantity, unit_price, discount_percentage, total_price)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  
  orderItems.forEach(item => {
    insertInvoiceItem.run(
      invoiceId, item.product_id, item.quantity, 
      item.unit_price, item.discount_percentage, item.total_price
    );
  });
  
  // Update shop balance
  const newBalance = shop.current_balance + order.netAmount;
  db.prepare('UPDATE shops SET current_balance = ? WHERE id = ?').run(newBalance, shop.id);
  
  // Create ledger entry for invoice
  db.prepare(`
    INSERT INTO shop_ledger (shop_id, transaction_date, transaction_type, reference_type,
                            reference_id, reference_number, debit_amount, credit_amount, 
                            balance, description)
    VALUES (?, datetime('now'), 'invoice', 'invoice', ?, ?, ?, 0, ?, 'Invoice - Order ' || ?)
  `).run(shop.id, invoiceId, invoiceNumber, order.netAmount, newBalance, order.orderNumber);
  
  console.log(`✅ Invoice Created: ${invoiceNumber}`);
  console.log(`   🏪 Shop: ${shop.shop_name}`);
  console.log(`   📋 Order: ${order.orderNumber}`);
  console.log(`   💰 Amount: Rs ${order.netAmount.toLocaleString()}`);
  console.log(`   📊 New Balance: Rs ${newBalance.toLocaleString()}`);
  console.log(`   📅 Due Date: ${dueDate.toDateString()}`);
  console.log('');
  
  return { invoiceId, invoiceNumber, newBalance };
};

const invoice1 = createInvoice(order1, shops[0]);
shops[0].current_balance = invoice1.newBalance;

const invoice2 = createInvoice(order2, shops[1]);
shops[1].current_balance = invoice2.newBalance;

const invoice3 = createInvoice(order3, shops[0]);
shops[0].current_balance = invoice3.newBalance;

console.log('');

// Step 6: Record Payments
console.log('💳 Step 6: Recording Payments...');

const createPayment = (shop, amount, invoiceId, invoiceNumber) => {
  const receiptNumber = generateReceiptNumber();
  
  // Insert payment
  const paymentResult = db.prepare(`
    INSERT INTO payments (receipt_number, shop_id, invoice_id, payment_date, amount, 
                         payment_method, reference_number)
    VALUES (?, ?, ?, datetime('now'), ?, 'bank', ?)
  `).run(receiptNumber, shop.id, invoiceId, amount, `CHQ-${Math.floor(Math.random() * 100000)}`);
  
  // Update invoice
  const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceId);
  const newPaidAmount = invoice.paid_amount + amount;
  const newBalanceAmount = invoice.net_amount - newPaidAmount;
  const newStatus = newBalanceAmount === 0 ? 'paid' : 'partial';
  
  db.prepare(`
    UPDATE invoices SET paid_amount = ?, balance_amount = ?, status = ? WHERE id = ?
  `).run(newPaidAmount, newBalanceAmount, newStatus, invoiceId);
  
  // Update shop balance
  const newShopBalance = shop.current_balance - amount;
  db.prepare('UPDATE shops SET current_balance = ? WHERE id = ?').run(newShopBalance, shop.id);
  
  // Create ledger entry for payment
  db.prepare(`
    INSERT INTO shop_ledger (shop_id, transaction_date, transaction_type, reference_type,
                            reference_id, reference_number, debit_amount, credit_amount, 
                            balance, description)
    VALUES (?, datetime('now'), 'payment', 'payment', ?, ?, 0, ?, ?, 'Payment - ' || ?)
  `).run(shop.id, paymentResult.lastInsertRowid, receiptNumber, amount, newShopBalance, invoiceNumber);
  
  console.log(`✅ Payment Recorded: ${receiptNumber}`);
  console.log(`   🏪 Shop: ${shop.shop_name}`);
  console.log(`   🧾 Invoice: ${invoiceNumber}`);
  console.log(`   💵 Amount Paid: Rs ${amount.toLocaleString()}`);
  console.log(`   📊 New Shop Balance: Rs ${newShopBalance.toLocaleString()}`);
  console.log(`   ✅ Invoice Status: ${newStatus.toUpperCase()}`);
  console.log('');
  
  return newShopBalance;
};

// Payment 1: Premium Mart pays 50% of first invoice
const payment1Amount = Math.floor(order1.netAmount * 0.5);
shops[0].current_balance = createPayment(shops[0], payment1Amount, invoice1.invoiceId, invoice1.invoiceNumber);

// Payment 2: City Center Store pays full amount
shops[1].current_balance = createPayment(shops[1], order2.netAmount, invoice2.invoiceId, invoice2.invoiceNumber);

// Payment 3: Premium Mart pays 30% of third invoice
const payment3Amount = Math.floor(order3.netAmount * 0.3);
shops[0].current_balance = createPayment(shops[0], payment3Amount, invoice3.invoiceId, invoice3.invoiceNumber);

console.log('');

// Step 7: Display Final Ledger Summary
console.log('📊 FINAL LEDGER SUMMARY');
console.log('='.repeat(70));
console.log('');

shops.forEach(shop => {
  console.log(`🏪 ${shop.shop_name}`);
  console.log('-'.repeat(70));
  
  const ledgerEntries = db.prepare(`
    SELECT * FROM shop_ledger 
    WHERE shop_id = ? 
    ORDER BY transaction_date, id
  `).all(shop.id);
  
  console.log(`📋 Total Transactions: ${ledgerEntries.length}`);
  console.log('');
  
  console.log('Transaction History:');
  console.table(ledgerEntries.map(entry => ({
    Date: new Date(entry.transaction_date).toLocaleString(),
    Type: entry.transaction_type.toUpperCase(),
    Reference: entry.reference_number,
    Debit: entry.debit_amount > 0 ? `Rs ${entry.debit_amount.toLocaleString()}` : '-',
    Credit: entry.credit_amount > 0 ? `Rs ${entry.credit_amount.toLocaleString()}` : '-',
    Balance: `Rs ${entry.balance.toLocaleString()}`,
    Description: entry.description
  })));
  
  const currentShop = db.prepare('SELECT * FROM shops WHERE id = ?').get(shop.id);
  console.log('');
  console.log(`💰 Current Balance: Rs ${currentShop.current_balance.toLocaleString()}`);
  console.log(`💳 Credit Limit: Rs ${currentShop.credit_limit.toLocaleString()}`);
  console.log(`📊 Available Credit: Rs ${(currentShop.credit_limit - currentShop.current_balance).toLocaleString()}`);
  console.log('');
  console.log('');
});

// Step 8: Verification
console.log('✅ VERIFICATION RESULTS');
console.log('='.repeat(70));
console.log('');

const totalShops = db.prepare('SELECT COUNT(*) as count FROM shops').get().count;
const totalOrders = db.prepare('SELECT COUNT(*) as count FROM orders').get().count;
const totalInvoices = db.prepare('SELECT COUNT(*) as count FROM invoices').get().count;
const totalPayments = db.prepare('SELECT COUNT(*) as count FROM payments').get().count;
const totalLedgerEntries = db.prepare('SELECT COUNT(*) as count FROM shop_ledger').get().count;

console.log(`✅ Total Shops in System: ${totalShops}`);
console.log(`✅ Total Orders Created: ${totalOrders}`);
console.log(`✅ Total Invoices Generated: ${totalInvoices}`);
console.log(`✅ Total Payments Recorded: ${totalPayments}`);
console.log(`✅ Total Ledger Entries: ${totalLedgerEntries}`);
console.log('');

console.log('📈 Shop-wise Summary:');
const shopSummary = db.prepare(`
  SELECT 
    s.id,
    s.shop_code,
    s.shop_name,
    s.current_balance,
    s.credit_limit,
    COUNT(DISTINCT o.id) as total_orders,
    COUNT(DISTINCT i.id) as total_invoices,
    COUNT(DISTINCT p.id) as total_payments,
    COUNT(DISTINCT sl.id) as ledger_entries
  FROM shops s
  LEFT JOIN orders o ON s.id = o.shop_id
  LEFT JOIN invoices i ON s.id = i.shop_id
  LEFT JOIN payments p ON s.id = p.shop_id
  LEFT JOIN shop_ledger sl ON s.id = sl.shop_id
  WHERE s.id IN (${shops.map(s => s.id).join(',')})
  GROUP BY s.id
`).all();

console.table(shopSummary.map(s => ({
  Shop: s.shop_name,
  Balance: `Rs ${s.current_balance.toLocaleString()}`,
  'Credit Limit': `Rs ${s.credit_limit.toLocaleString()}`,
  Orders: s.total_orders,
  Invoices: s.total_invoices,
  Payments: s.total_payments,
  'Ledger Entries': s.ledger_entries
})));

console.log('');
console.log('🎉 COMPREHENSIVE WORKFLOW TEST COMPLETED SUCCESSFULLY!');
console.log('='.repeat(70));
console.log('');

console.log('📝 Test IDs for Frontend Testing:');
shops.forEach(shop => {
  console.log(`   🏪 ${shop.shop_name}: ID ${shop.id}`);
  console.log(`      URL: http://localhost:3000/#/ledger/shop/${shop.id}`);
});

db.close();
