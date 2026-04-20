import paramiko
import time

HOST = '147.93.108.205'
USER = 'root'
PASS = 'Abbassi786..'

def run_ssh(client, cmd, timeout=30):
    print(f"\n{'='*60}")
    print(f"CMD: {cmd}")
    print('='*60)
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

# Step 1: Pull latest code
run_ssh(client, 'cd /var/www/distribution_system && git pull origin main')

# Step 2: Restart PM2
run_ssh(client, 'cd /var/www/distribution_system/backend && pm2 restart distribution-api')

# Wait for app to start
time.sleep(5)

# Step 3: Check PM2 logs for errors
out, err = run_ssh(client, 'pm2 logs distribution-api --lines 30 --nostream')

# Step 4: Test delivery status update directly via curl
print("\n" + "="*60)
print("TESTING: Update delivery 16 status to 'delivered'")
print("="*60)
out, err = run_ssh(client, '''curl -s -X PUT http://147.93.108.205:5001/api/desktop/deliveries/16/status \
  -H "Content-Type: application/json" \
  -d '{"status":"delivered","received_by":"Test User","notes":"Test delivery"}' ''')

# Step 5: Check recent PM2 error logs
print("\n" + "="*60)
print("PM2 ERROR LOGS (last 15 lines):")
print("="*60)
run_ssh(client, 'pm2 logs distribution-api --err --lines 15 --nostream')

# Step 6: Check delivery status in DB
print("\n" + "="*60)
print("DB CHECK: Delivery statuses")
print("="*60)
run_ssh(client, '''mysql -u dist_user -pDist2025Secure distribution_db -e "SELECT id, challan_number, status, receiver_name, notes FROM deliveries ORDER BY id DESC LIMIT 10;"''')

client.close()
print("\n\nDone!")
