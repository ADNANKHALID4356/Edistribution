const db = require('./src/config/database');

(async () => {
  try {
    const [tables] = await db.query("SELECT name FROM sqlite_master WHERE type='table' AND name='shop_ledger'");
    console.log('\n🔍 Checking shop_ledger table...');
    
    if (tables.length === 0) {
      console.log('❌ shop_ledger table is MISSING!');
      console.log('This is why payment recording fails.\n');
    } else {
      console.log('✅ shop_ledger table exists');
      const [columns] = await db.query("PRAGMA table_info(shop_ledger)");
      console.log(`Table has ${columns.length} columns\n`);
    }
  } catch (e) {
    console.error('Error:', e.message);
  }
  process.exit(0);
})();
