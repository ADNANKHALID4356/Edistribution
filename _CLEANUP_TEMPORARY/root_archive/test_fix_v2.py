import paramiko
import json
import time

HOST = '147.93.108.205'
USER = 'root'
PASS = 'Abbassi786..'
API = 'http://147.93.108.205:5001'

def run_ssh(client, cmd, timeout=30):
    print(f"\nCMD: {cmd[:150]}")
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

# Login
out, _ = run_ssh(client, f'''curl -s -X POST {API}/api/auth/login -H "Content-Type: application/json" -d '{{"username":"admin","password":"admin123"}}' ''')
resp = json.loads(out)
token = resp.get('data', {}).get('token', resp.get('token', ''))
print(f"\nGot token: {token[:40]}...")

# Reset delivery 16 to pending
run_ssh(client, '''mysql -u dist_user -pDist2025Secure distribution_db -e "UPDATE deliveries SET status='pending', receiver_name=NULL WHERE id=16;"''')

# Test update to delivered
print("\n======= TESTING: Update delivery 16 to 'delivered' =======")
out, _ = run_ssh(client, f'''curl -s -X PUT {API}/api/desktop/deliveries/16/status -H "Content-Type: application/json" -H "Authorization: Bearer {token}" -d '{{"status":"delivered","received_by":"Test User","notes":"Test delivery complete"}}' ''')
print(f"\nAPI Response: {out[:500]}")

time.sleep(2)

# Check DB
print("\n======= DB CHECK =======")
run_ssh(client, '''mysql -u dist_user -pDist2025Secure distribution_db -e "SELECT id, challan_number, status, receiver_name, notes FROM deliveries WHERE id IN (16,19,20,21);"''')

# Check error logs
print("\n======= PM2 ERRORS (last 5) =======")
run_ssh(client, 'pm2 logs distribution-api --err --lines 5 --nostream')

# Check success logs
print("\n======= PM2 OUTPUT (last 10) =======")
run_ssh(client, 'pm2 logs distribution-api --out --lines 10 --nostream')

client.close()
print("\n\nDone!")
