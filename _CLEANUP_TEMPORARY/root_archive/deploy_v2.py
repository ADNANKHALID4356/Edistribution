import paramiko
import time

HOST = '147.93.108.205'
USER = 'root'
PASS = 'Abbassi786..'

def run_ssh(client, cmd, timeout=30):
    print(f"\nCMD: {cmd}")
    print('-'*60)
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    if out.strip():
        print(out.strip())
    if err.strip():
        print(f"STDERR: {err.strip()}")
    return out, err

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=15)
print("Connected to VPS")

# Step 1: Find the correct directory
run_ssh(client, 'ls -la /var/www/ | grep dist')

# Step 2: Pull latest code (correct path with hyphen)
run_ssh(client, 'cd /var/www/distribution-system && git pull origin main')

# Step 3: Verify the fix is in the file
print("\n=== VERIFYING FIX IN DELIVERY.JS ===")
run_ssh(client, 'grep -n "receiver_name\\|received_at\\|received_by" /var/www/distribution-system/backend/src/models/Delivery.js | head -20')

# Step 4: Verify controller fix
print("\n=== VERIFYING FIX IN CONTROLLER ===")
run_ssh(client, 'grep -n "receiver_name\\|received_by\\|delivered_date\\|actual_delivery_time" /var/www/distribution-system/backend/src/controllers/deliveryController.js | head -20')

# Step 5: Restart PM2
run_ssh(client, 'cd /var/www/distribution-system/backend && pm2 restart distribution-api')
time.sleep(6)

# Step 6: Check startup logs
run_ssh(client, 'pm2 logs distribution-api --lines 10 --nostream')

# Step 7: Login first to get auth token
print("\n=== LOGGING IN ===")
out, err = run_ssh(client, '''curl -s -X POST http://147.93.108.205:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' ''')

# Extract token
import json
try:
    resp = json.loads(out.strip())
    token = resp.get('token', '')
    print(f"Token obtained: {token[:30]}...")
except:
    token = ''
    print(f"Could not parse login response: {out[:200]}")

if token:
    # Step 8: Test delivery status update WITH auth
    print("\n=== TESTING DELIVERY STATUS UPDATE ===")
    out, err = run_ssh(client, f'''curl -s -X PUT http://147.93.108.205:5001/api/desktop/deliveries/16/status \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer {token}" \
      -d '{{"status":"delivered","received_by":"Test User","notes":"Test delivery"}}' ''')
    
    time.sleep(2)
    
    # Step 9: Check error logs
    print("\n=== PM2 ERROR LOGS ===")
    run_ssh(client, 'pm2 logs distribution-api --err --lines 10 --nostream')
    
    # Step 10: Check delivery status in DB
    print("\n=== DB STATUS CHECK ===")
    run_ssh(client, '''mysql -u dist_user -pDist2025Secure distribution_db -e "SELECT id, challan_number, status, receiver_name, notes FROM deliveries WHERE id=16;"''')

client.close()
print("\n\nDone!")
