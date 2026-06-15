const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const db = require('./src/config/database');

async function fixUnitPurchaseCost() {
  console.log('🔄 Starting backfill for unit_purchase_cost in order_details...');
  
  let connection;
  try {
    if (db.getConnection) {
      connection = await db.getConnection();
    } else {
      connection = db; // SQLite wrapper
    }

    // SQLite
    const useSQLite = process.env.USE_SQLITE === 'true' && process.env.NODE_ENV === 'development';
    
    if (useSQLite) {
      console.log('📦 Using SQLite database');
      const result = await connection.query(`
        UPDATE order_details
        SET unit_purchase_cost = (
          SELECT purchase_price 
          FROM products 
          WHERE products.id = order_details.product_id
        )
        WHERE unit_purchase_cost = 0 OR unit_purchase_cost IS NULL
      `);
      console.log('✅ SQLite backfill completed.');
      console.log(`📊 Rows updated (or affected): ${JSON.stringify(result[0] || result)}`);
      
    } else {
      console.log('📦 Using MySQL database');
      // MySQL UPDATE JOIN
      const [result] = await connection.query(`
        UPDATE order_details od
        JOIN products p ON od.product_id = p.id
        SET od.unit_purchase_cost = p.purchase_price
        WHERE od.unit_purchase_cost = 0 OR od.unit_purchase_cost IS NULL
      `);
      
      console.log('✅ MySQL backfill completed.');
      console.log(`📊 Rows affected: ${result.affectedRows}, Changed: ${result.changedRows}`);
    }

    // Also fix delivery_items if applicable
    console.log('🔄 Starting backfill for unit_purchase_cost in delivery_items (if applicable)...');
    
    try {
      if (useSQLite) {
        const resultDel = await connection.query(`
          UPDATE delivery_items
          SET unit_purchase_cost = (
            SELECT purchase_price 
            FROM products 
            WHERE products.id = delivery_items.product_id
          )
          WHERE unit_purchase_cost = 0 OR unit_purchase_cost IS NULL
        `);
        console.log('✅ SQLite delivery_items backfill completed.');
      } else {
        const [resultDel] = await connection.query(`
          UPDATE delivery_items di
          JOIN products p ON di.product_id = p.id
          SET di.unit_purchase_cost = p.purchase_price
          WHERE di.unit_purchase_cost = 0 OR di.unit_purchase_cost IS NULL
        `);
        console.log(`✅ MySQL delivery_items backfill completed.`);
        console.log(`📊 Rows affected: ${resultDel.affectedRows}, Changed: ${resultDel.changedRows}`);
      }
    } catch (deliveryErr) {
        console.log('⚠️ Could not update delivery_items (table might not have unit_purchase_cost):', deliveryErr.message);
    }

  } catch (error) {
    console.error('❌ Failed to backfill unit_purchase_cost:', error.message);
  } finally {
    if (connection && connection.release) {
      connection.release();
    }
    process.exit(0);
  }
}

fixUnitPurchaseCost();
