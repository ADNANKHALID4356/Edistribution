import paramiko
import json
import urllib.request

VPS_HOST = '147.93.108.205'
VPS_USER = 'root'
VPS_PASS = 'Abbassi786..'
APP_DIR = '/var/www/distribution-system'
API_BASE = f'http://{VPS_HOST}:5001/api'

def ssh_cmd(ssh, cmd):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=30)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    return out, err

def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(VPS_HOST, username=VPS_USER, password=VPS_PASS, timeout=10)
    print("Connected to VPS")

    # 1. Check ALL orders in the database
    print("\n=== ALL ORDERS IN DATABASE ===")
    out, _ = ssh_cmd(ssh, "mysql -u dist_user -p'Dist2025Secure' distribution_db -e 'SELECT id, order_number, salesman_id, shop_id, status, is_synced, sync_status, mobile_order_id, created_at FROM orders ORDER BY id DESC LIMIT 20;'")
    print(out)

    # 2. Check salesmen
    print("\n=== ALL SALESMEN ===")
    out, _ = ssh_cmd(ssh, "mysql -u dist_user -p'Dist2025Secure' distribution_db -e 'SELECT id, full_name, phone, salesman_code, status FROM salesmen;'")
    print(out)

    # 3. Check sync_logs for recent sync attempts
    print("\n=== SYNC LOGS (recent) ===")
    out, _ = ssh_cmd(ssh, "mysql -u dist_user -p'Dist2025Secure' distribution_db -e 'SELECT * FROM sync_logs ORDER BY id DESC LIMIT 10;'")
    print(out)

    # 4. Check PM2 logs for sync errors
    print("\n=== PM2 LOGS (last 50 lines, grep for sync/order) ===")
    out, _ = ssh_cmd(ssh, "pm2 logs distribution-api --lines 100 --nostream 2>&1 | grep -i 'sync\\|order\\|error\\|failed\\|❌' | tail -50")
    print(out)

    # 5. Check if sync_logs table exists
    print("\n=== SYNC_LOGS TABLE STRUCTURE ===")
    out, _ = ssh_cmd(ssh, "mysql -u dist_user -p'Dist2025Secure' distribution_db -e 'DESCRIBE sync_logs;' 2>&1")
    print(out)

    # 6. Check orders table structure to verify all required columns
    print("\n=== ORDERS TABLE COLUMNS ===")
    out, _ = ssh_cmd(ssh, "mysql -u dist_user -p'Dist2025Secure' distribution_db -e 'DESCRIBE orders;'")
    print(out)

    # 7. Check order_details table
    print("\n=== ORDER_DETAILS TABLE COLUMNS ===")
    out, _ = ssh_cmd(ssh, "mysql -u dist_user -p'Dist2025Secure' distribution_db -e 'DESCRIBE order_details;'")
    print(out)

    # 8. Check users table (to see what user the mobile app logs in as)
    print("\n=== USERS TABLE ===")
    out, _ = ssh_cmd(ssh, "mysql -u dist_user -p'Dist2025Secure' distribution_db -e 'SELECT id, username, role, full_name, salesman_id FROM users;'")
    print(out)

    # 9. Test the sync endpoint directly
    print("\n=== TESTING SYNC API DIRECTLY ===")
    try:
        login_data = json.dumps({"username": "admin", "password": "admin123"}).encode()
        req = urllib.request.Request(f'{API_BASE}/auth/login', data=login_data, headers={'Content-Type': 'application/json'})
        resp = urllib.request.urlopen(req, timeout=10)
        token = json.loads(resp.read())['data']['token']
        print(f"Logged in as admin")

        # Get all orders via desktop API
        req = urllib.request.Request(f'{API_BASE}/desktop/orders', headers={'Authorization': f'Bearer {token}'})
        resp = urllib.request.urlopen(req, timeout=10)
        result = json.loads(resp.read())
        print(f"Desktop orders API: success={result.get('success')}, count={len(result.get('data', []))}")
        for o in result.get('data', [])[:5]:
            print(f"  Order {o['id']}: {o.get('order_number')} status={o.get('status')} salesman={o.get('salesman_name','N/A')} shop={o.get('shop_name','N/A')}")
    except Exception as e:
        print(f"API test error: {e}")

    # 10. Check if there are recent errors in PM2
    print("\n=== PM2 ERROR LOG (last 30 lines) ===")
    out, _ = ssh_cmd(ssh, "pm2 logs distribution-api --err --lines 30 --nostream 2>&1")
    print(out)

    ssh.close()
    print("\n✅ Analysis complete!")

if __name__ == '__main__':
    main()
