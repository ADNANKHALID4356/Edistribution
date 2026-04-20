import paramiko
import time
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

    # 1. Pull latest code
    out, err = ssh_cmd(ssh, f'cd {APP_DIR} && git pull origin main')
    print(f"Git pull: {out}")

    # 2. Restart PM2
    out, err = ssh_cmd(ssh, 'pm2 restart distribution-api')
    print(f"PM2 restart: {out[:200]}")
    time.sleep(4)

    # 3. Check if received_from column exists now
    out, err = ssh_cmd(ssh, """mysql -u dist_user -p'Dist2025Secure' distribution_db -e "DESCRIBE daily_collections;" """)
    print(f"\nTable structure:\n{out}")

    if 'received_from' in out:
        print("\n✅ received_from column EXISTS in daily_collections table")
    else:
        print("\n❌ received_from column MISSING - migration may not have run yet, checking PM2 logs")
        out2, _ = ssh_cmd(ssh, 'pm2 logs distribution-api --lines 20 --nostream')
        print(out2)

    # 4. Login and test API
    login_data = json.dumps({"username": "admin", "password": "admin123"}).encode()
    req = urllib.request.Request(f'{API_BASE}/auth/login', data=login_data, headers={'Content-Type': 'application/json'})
    resp = urllib.request.urlopen(req, timeout=10)
    token = json.loads(resp.read())['token']
    print(f"\nLogged in, token: {token[:30]}...")

    # 5. Create a test collection WITH received_from
    collection_data = json.dumps({
        "collection_date": "2026-03-08",
        "amount": 5000,
        "payment_method": "cash",
        "received_from": "Test Shop ABC",
        "description": "Test collection with received_from"
    }).encode()
    req = urllib.request.Request(f'{API_BASE}/desktop/daily-collections', data=collection_data,
                                 headers={'Content-Type': 'application/json', 'Authorization': f'Bearer {token}'})
    resp = urllib.request.urlopen(req, timeout=10)
    result = json.loads(resp.read())
    print(f"\nCreate collection: {json.dumps(result, indent=2)}")

    if result.get('success') and result.get('data', {}).get('received_from') == 'Test Shop ABC':
        print("\n✅ received_from is saved and returned correctly!")
    else:
        print("\n❌ received_from NOT returned correctly")

    # 6. Verify via GET all collections
    req = urllib.request.Request(f'{API_BASE}/desktop/daily-collections',
                                 headers={'Authorization': f'Bearer {token}'})
    resp = urllib.request.urlopen(req, timeout=10)
    all_result = json.loads(resp.read())
    if all_result.get('success'):
        for c in all_result.get('data', [])[:3]:
            print(f"  Collection {c['id']}: received_from={c.get('received_from', 'NULL')}, amount={c['amount']}")

    # 7. Clean up test entry
    if result.get('success') and result.get('data', {}).get('id'):
        test_id = result['data']['id']
        req = urllib.request.Request(f'{API_BASE}/desktop/daily-collections/{test_id}',
                                     headers={'Authorization': f'Bearer {token}'}, method='DELETE')
        urllib.request.urlopen(req, timeout=10)
        print(f"\nCleaned up test collection {test_id}")

    ssh.close()
    print("\nDone!")

if __name__ == '__main__':
    main()
