const db = require('better-sqlite3')('C:\\Users\\Laptop House\\Desktop\\distribution_system-main\\backend\\data\\distribution_system.db');

console.log('\n🏪 TEST SHOPS STATUS:\n');
console.log('='.repeat(70));

const shops = db.prepare('SELECT * FROM shops WHERE id >= 9').all();
shops.forEach(shop => {
  console.log(`\n${shop.shop_name} (ID: ${shop.id})`);
  console.log(`  Owner: ${shop.owner_name}`);
  console.log(`  Phone: ${shop.phone}`);
  console.log(`  Location: ${shop.address}, ${shop.city}`);
  console.log(`  Current Balance: Rs ${shop.current_balance.toLocaleString()}`);
  console.log(`  Credit Limit: Rs ${shop.credit_limit.toLocaleString()}`);
  console.log(`  Available Credit: Rs ${(shop.credit_limit - shop.current_balance).toLocaleString()}`);
});

console.log('\n\n📒 LEDGER TRANSACTIONS:\n');
console.log('='.repeat(70));

const ledger = db.prepare(`
  SELECT shop_id, transaction_date, transaction_type, reference_number,
         debit_amount, credit_amount, balance, description
  FROM shop_ledger
  WHERE shop_id >= 9
  ORDER BY shop_id, id
`).all();

console.table(ledger.map(l => ({
  'Shop ID': l.shop_id,
  'Date': new Date(l.transaction_date).toLocaleString(),
  'Type': l.transaction_type,
  'Reference': l.reference_number,
  'Debit': l.debit_amount > 0 ? `Rs ${l.debit_amount.toLocaleString()}` : '-',
  'Credit': l.credit_amount > 0 ? `Rs ${l.credit_amount.toLocaleString()}` : '-',
  'Balance': `Rs ${l.balance.toLocaleString()}`,
  'Description': l.description
})));

console.log('\n📊 ORDERS SUMMARY:\n');
const orders = db.prepare('SELECT * FROM orders WHERE shop_id >= 9').all();
console.table(orders.map(o => ({
  'Order #': o.order_number,
  'Shop ID': o.shop_id,
  'Total': `Rs ${o.total_amount.toLocaleString()}`,
  'Discount': `Rs ${o.discount_amount.toLocaleString()}`,
  'Net': `Rs ${o.net_amount.toLocaleString()}`,
  'Status': o.status
})));

console.log('\n🧾 INVOICES SUMMARY:\n');
const invoices = db.prepare('SELECT * FROM invoices WHERE shop_id >= 9').all();
console.table(invoices.map(i => ({
  'Invoice #': i.invoice_number,
  'Shop ID': i.shop_id,
  'Amount': `Rs ${i.net_amount.toLocaleString()}`,
  'Paid': `Rs ${i.paid_amount.toLocaleString()}`,
  'Balance': `Rs ${i.balance_amount.toLocaleString()}`,
  'Status': i.status
})));

console.log('\n💳 PAYMENTS SUMMARY:\n');
const payments = db.prepare('SELECT * FROM payments WHERE shop_id >= 9').all();
console.table(payments.map(p => ({
  'Receipt #': p.receipt_number,
  'Shop ID': p.shop_id,
  'Amount': `Rs ${p.amount.toLocaleString()}`,
  'Method': p.payment_method,
  'Reference': p.reference_number
})));

console.log('\n✅ VERIFICATION COMPLETE!\n');

db.close();
