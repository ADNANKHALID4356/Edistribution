import paramiko
import json
import time

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
    if err.strip():
        print(f"STDERR: {err.strip()}")
    return out.strip(), err.strip()

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=15)
print("Connected to VPS")

# Login
out, _ = run_ssh(client, '''curl -s -X POST http://127.0.0.1:5001/api/auth/login -H "Content-Type: application/json" -d '{"username":"admin","password":"admin123"}' ''')
resp = json.loads(out)
token = resp.get('data', {}).get('token', resp.get('token', ''))
print(f"Token: {token[:40]}...")

# First reset delivery 16 to 'pending' so we can test the update
run_ssh(client, f'''mysql -u dist_user -pDist2025Secure distribution_db -e "UPDATE deliveries SET status='pending', receiver_name=NULL WHERE id=16;"''')
print("\nReset delivery 16 to pending")

# Now test updating to delivered
print("\n=== TESTING: Update delivery 16 to 'delivered' ===")
out, _ = run_ssh(client, f'''curl -s -X PUT http://127.0.0.1:5001/api/desktop/deliveries/16/status -H "Content-Type: application/json" -H "Authorization: Bearer {token}" -d '{{"status":"delivered","received_by":"Test User","notes":"Test delivery complete"}}' ''')
print(f"Response: {out}")

time.sleep(1)

# Check DB
print("\n=== DB CHECK ===")
run_ssh(client, '''mysql -u dist_user -pDist2025Secure distribution_db -e "SELECT id, challan_number, status, receiver_name, notes FROM deliveries WHERE id=16;"''')

# Check recent PM2 error logs
print("\n=== RECENT PM2 ERRORS ===")
run_ssh(client, 'pm2 logs distribution-api --err --lines 5 --nostream')

# Also check PM2 output logs for success
print("\n=== RECENT PM2 OUTPUT ===")
run_ssh(client, 'pm2 logs distribution-api --out --lines 10 --nostream')

client.close()
print("\n\nDone!")
