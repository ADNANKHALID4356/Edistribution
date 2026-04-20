import sys
import re

with open('src/models/Delivery.js', 'r', encoding='utf-8') as f:
    text = f.read()

old_query = '''const [delivery] = await db.query(
          'SELECT warehouse_id, order_id FROM deliveries WHERE id = ?',
          [id]
        );'''
new_query = '''const [delivery] = await db.query(
          'SELECT warehouse_id, order_id, shop_id, challan_number FROM deliveries WHERE id = ?',
          [id]
        );'''

text = text.replace(old_query, new_query)

if 'const shopLedger' not in text:
    text = text.replace("const db = require('../config/database');", "const db = require('../config/database');\nconst shopLedger = require('./ShopLedger');")

search_str = '''                WHERE warehouse_id = ? AND product_id = ?
              `, [
                item.quantity_delivered,
                item.quantity_delivered,
                item.quantity_delivered,
                item.quantity_delivered,
                delivery[0].warehouse_id,
                item.product_id
              ]);
            }
          }'''

idx = text.find(search_str)
if idx != -1:
    end_idx = idx + len(search_str)
    ledger_code = '''

          // -- FINANCIAL LEDGER INTEGRATION (INVOICE BYPASS) --
          if (delivery[0].shop_id) {
            let totalAmount = 0;
            
            if (delivery[0].order_id) {
               const [delTotals] = await db.query(`
                 SELECT SUM(di.quantity_delivered * (od.net_price / NULLIF(od.quantity, 0))) as total
                 FROM delivery_items di
                 JOIN order_details od ON di.product_id = od.product_id AND od.order_id = ?
                 WHERE di.delivery_id = ?
               `, [delivery[0].order_id, id]);
               
               totalAmount = delTotals[0]?.total || 0;
            } else {
               const [delTotals] = await db.query(`
                 SELECT SUM(COALESCE(net_amount, total_price, quantity_delivered * unit_price, 0)) as total
                 FROM delivery_items 
                 WHERE delivery_id = ?
               `, [id]);
               
               totalAmount = delTotals[0]?.total || 0;
            }
            
            if (totalAmount > 0) {
              const [shopInfo] = await db.query('SELECT shop_name FROM shops WHERE id = ?', [delivery[0].shop_id]);
              
              await shopLedger.createEntry({
                shop_id: delivery[0].shop_id,
                shop_name: shopInfo.length > 0 ? shopInfo[0].shop_name : 'Unknown Shop',
                transaction_date: new Date(),
                transaction_type: 'Invoice',
                reference_type: 'Delivery',
                reference_id: id,
                reference_number: delivery[0].challan_number,
                debit_amount: 0,
                credit_amount: totalAmount,
                description: `Delivery Challan ${delivery[0].challan_number}`,
                created_by_name: updateData.updated_by_name || updateData.received_by || 'System',
                is_manual: 0
              });
              console.log(`[DELIVERY LEDGER] Added debt ${totalAmount} for Delivery ${delivery[0].challan_number} to Shop ${delivery[0].shop_id}`);
            }
          }'''
    if 'FINANCIAL LEDGER INTEGRATION' not in text:
        text = text[:end_idx] + ledger_code + text[end_idx:]
        print('Injected ledger integration')
    else:
        print('Already injected')
else:
    print('Failed to find insertion point')

with open('src/models/Delivery.js', 'w', encoding='utf-8') as f:
    f.write(text)

print("Script execution finished.")
