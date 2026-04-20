import paramiko
import json
import time

HOST = '147.93.108.205'
USER = 'root'
PASS = 'Abbassi786..'

def run_ssh(client, cmd, timeout=30):
    print(f"\n{'='*60}")
    print(f"CMD: {cmd[:150]}")
    print('='*60)
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    if out.strip():
        print(out.strip())
    if err.strip() and 'Warning' not in err:
        print(f"STDERR: {err.strip()}")
    return out.strip(), err.strip()

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=15)
print("Connected to VPS")

# Step 1: Pull latest code
run_ssh(client, 'cd /var/www/distribution-system && git pull origin main')

# Step 2: Restart PM2
run_ssh(client, 'cd /var/www/distribution-system/backend && pm2 restart distribution-api')
time.sleep(5)

# Step 3: Check startup
run_ssh(client, 'pm2 logs distribution-api --out --lines 5 --nostream')

# Step 4: Login
out, _ = run_ssh(client, '''curl -s -X POST http://147.93.108.205:5001/api/auth/login -H "Content-Type: application/json" -d '{"username":"admin","password":"admin123"}' ''')
resp = json.loads(out)
token = resp.get('data', {}).get('token', '')
print(f"Token: {token[:40]}...")

# Step 5: Check stock levels BEFORE return
print("\n" + "="*60)
print("STOCK BEFORE RETURN:")
print("="*60)
run_ssh(client, '''mysql -u dist_user -pDist2025Secure distribution_db -e "SELECT id, product_name, stock_quantity FROM products WHERE id IN (391,392,393,394);"''')
run_ssh(client, '''mysql -u dist_user -pDist2025Secure distribution_db -e "SELECT warehouse_id, product_id, quantity FROM warehouse_stock WHERE product_id IN (391,392,393,394) AND warehouse_id=2;"''')

# Step 6: Reset delivery 16 quantity_returned to 0 for a clean test
run_ssh(client, '''mysql -u dist_user -pDist2025Secure distribution_db -e "UPDATE delivery_items SET quantity_returned=0 WHERE delivery_id=16;"''')
# Delete any existing stock returns for delivery 16
run_ssh(client, '''mysql -u dist_user -pDist2025Secure distribution_db -e "DELETE sri FROM stock_return_items sri JOIN stock_returns sr ON sri.return_id=sr.id WHERE sr.delivery_id=16; DELETE FROM stock_returns WHERE delivery_id=16;"''')

# Step 7: Test stock return - return 3 units of product 391 and 5 units of 392
return_data = {
    "delivery_id": 16,
    "return_date": "2026-03-08T12:00:00.000Z",
    "reason": "damaged",
    "notes": "Test stock return - checkbox approach",
    "items": [
        {
            "delivery_item_id": 45,
            "product_id": 391,
            "quantity_returned": 3,
            "return_amount": 2508.75,
            "reason": "damaged"
        },
        {
            "delivery_item_id": 46,
            "product_id": 392,
            "quantity_returned": 5,
            "return_amount": 4181.25,
            "reason": "damaged"
        }
    ]
}

print("\n" + "="*60)
print("TESTING: Process stock return (3x product 391, 5x product 392)")
print("="*60)
out, _ = run_ssh(client, f"""curl -s -X POST http://147.93.108.205:5001/api/desktop/stock-returns -H "Content-Type: application/json" -H "Authorization: Bearer {token}" -d '{json.dumps(return_data)}' """)
print(f"Response: {out[:500]}")

time.sleep(2)

# Step 8: Check PM2 error logs
print("\n" + "="*60)
print("PM2 ERROR LOGS:")
print("="*60)
run_ssh(client, 'pm2 logs distribution-api --err --lines 10 --nostream')

# Step 9: Check stock levels AFTER return
print("\n" + "="*60)
print("STOCK AFTER RETURN:")
print("="*60)
run_ssh(client, '''mysql -u dist_user -pDist2025Secure distribution_db -e "SELECT id, product_name, stock_quantity FROM products WHERE id IN (391,392,393,394);"''')
run_ssh(client, '''mysql -u dist_user -pDist2025Secure distribution_db -e "SELECT warehouse_id, product_id, quantity FROM warehouse_stock WHERE product_id IN (391,392,393,394) AND warehouse_id=2;"''')

# Step 10: Check delivery_items updated
print("\n" + "="*60)
print("DELIVERY ITEMS (quantity_returned updated?):")
print("="*60)
run_ssh(client, '''mysql -u dist_user -pDist2025Secure distribution_db -e "SELECT id, product_name, quantity_delivered, quantity_returned FROM delivery_items WHERE delivery_id=16;"''')

# Step 11: Check stock_returns table
print("\n" + "="*60)
print("STOCK RETURNS TABLE:")
print("="*60)
run_ssh(client, '''mysql -u dist_user -pDist2025Secure distribution_db -e "SELECT id, return_number, delivery_id, challan_number, shop_name, total_items, total_quantity_returned, total_return_amount, status FROM stock_returns;"''')

client.close()
print("\n\nDone!")
