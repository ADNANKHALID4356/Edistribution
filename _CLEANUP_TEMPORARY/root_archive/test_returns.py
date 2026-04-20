import paramiko
import json

HOST = '147.93.108.205'
USER = 'root'
PASS = 'Abbassi786..'

def run_ssh(client, cmd, timeout=30):
    print(f"\nCMD: {cmd[:120]}")
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

# Check if stock_movements table exists
print("\n=== CHECK stock_movements TABLE ===")
run_ssh(client, '''mysql -u dist_user -pDist2025Secure distribution_db -e "SHOW TABLES LIKE 'stock_movements';"''')

# Check if shop_ledger table exists
print("\n=== CHECK shop_ledger TABLE ===")
run_ssh(client, '''mysql -u dist_user -pDist2025Secure distribution_db -e "SHOW TABLES LIKE 'shop_ledger';"''')

# Check delivery 16 status (we set it to delivered earlier)
print("\n=== DELIVERY 16 STATUS ===")
run_ssh(client, '''mysql -u dist_user -pDist2025Secure distribution_db -e "SELECT id, challan_number, status, shop_name, warehouse_id FROM deliveries WHERE id=16;"''')

# Check delivery_items for delivery 16
print("\n=== DELIVERY 16 ITEMS ===")
run_ssh(client, '''mysql -u dist_user -pDist2025Secure distribution_db -e "SELECT id, product_id, product_name, quantity_delivered, quantity_returned, unit_price FROM delivery_items WHERE delivery_id=16;"''')

# Check any existing stock_returns
print("\n=== EXISTING STOCK RETURNS ===")
run_ssh(client, '''mysql -u dist_user -pDist2025Secure distribution_db -e "SELECT * FROM stock_returns LIMIT 5;" 2>&1''')

# Check all delivery statuses
print("\n=== ALL DELIVERY STATUSES ===")
run_ssh(client, '''mysql -u dist_user -pDist2025Secure distribution_db -e "SELECT id, challan_number, status, shop_name FROM deliveries ORDER BY id;"''')

# Test the processReturn API call
print("\n=== LOGIN ===")
out, _ = run_ssh(client, '''curl -s -X POST http://147.93.108.205:5001/api/auth/login -H "Content-Type: application/json" -d '{"username":"admin","password":"admin123"}' ''')
resp = json.loads(out)
token = resp.get('data', {}).get('token', '')

# Try to process a return for delivery 16
print("\n=== TEST: Process stock return ===")
return_data = json.dumps({
    "delivery_id": 16,
    "return_date": "2026-03-08T12:00:00.000Z",
    "reason": "damaged",
    "notes": "Test return",
    "items": [
        {
            "delivery_item_id": 45,
            "product_id": 391,
            "quantity_returned": 2,
            "return_amount": 1672.50,
            "reason": "damaged"
        }
    ]
})
out, _ = run_ssh(client, f"""curl -s -X POST http://147.93.108.205:5001/api/desktop/stock-returns -H "Content-Type: application/json" -H "Authorization: Bearer {token}" -d '{return_data}' """)
print(f"API Response: {out[:500]}")

# Check PM2 error logs
print("\n=== PM2 ERRORS ===")
run_ssh(client, 'pm2 logs distribution-api --err --lines 10 --nostream')

client.close()
print("\n\nDone!")
