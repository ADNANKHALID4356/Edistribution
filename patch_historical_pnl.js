const process = require('process');
const db = require('./backend/src/config/database');

async function run() {
  try {
    console.log("Starting Patch for Historical P&L Data...");
    
    // Ensure order_details has the net_price and unit_purchase_cost filled out
    console.log("Updating missing net_price in order_details...");
    await db.query(`UPDATE order_details SET net_price = total_price WHERE net_price IS NULL OR net_price = 0`);

    console.log("Updating missing unit_purchase_cost from products...");
    await db.query(`
      UPDATE order_details od
      JOIN products p ON od.product_id = p.id
      SET od.unit_purchase_cost = COALESCE(p.purchase_price, 0)
      WHERE od.unit_purchase_cost IS NULL OR od.unit_purchase_cost = 0
    `);

    // Fix the state mismatch. Convert legacy 'completed' orders to 'finalized'
    console.log("Updating legacy 'completed' orders to 'finalized'...");
    await db.query(`UPDATE orders SET status = 'finalized' WHERE status = 'completed'`);

    console.log("Historical data patch completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Error during patch:", error);
    process.exit(1);
  }
}

run();
