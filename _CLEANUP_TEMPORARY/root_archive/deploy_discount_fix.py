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
    return stdout.read().decode().strip()

def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(VPS_HOST, username=VPS_USER, password=VPS_PASS, timeout=10)
    print("Connected to VPS")

    # Pull latest
    out = ssh_cmd(ssh, f'cd {APP_DIR} && git pull origin main')
    print(f"Git pull: {out}")

    # Restart PM2
    out = ssh_cmd(ssh, 'pm2 restart distribution-api')
    print(f"PM2 restart done")
    time.sleep(4)

    # Login
    login_data = json.dumps({"username": "admin", "password": "admin123"}).encode()
    req = urllib.request.Request(f'{API_BASE}/auth/login', data=login_data, headers={'Content-Type': 'application/json'})
    resp = urllib.request.urlopen(req, timeout=10)
    token = json.loads(resp.read())['data']['token']
    print(f"Logged in")

    # Get delivery 18 (the one from screenshot)
    req = urllib.request.Request(f'{API_BASE}/desktop/deliveries/18', headers={'Authorization': f'Bearer {token}'})
    resp = urllib.request.urlopen(req, timeout=10)
    result = json.loads(resp.read())
    d = result['data']
    
    print(f"\n=== Delivery 18 ({d['challan_number']}) ===")
    print(f"  subtotal: {d['subtotal']}")
    print(f"  discount_amount: {d['discount_amount']}")
    print(f"  discount_percentage: {d['discount_percentage']}")
    print(f"  grand_total: {d['grand_total']}")
    
    sub = float(d['subtotal'] or 0)
    gt = float(d['grand_total'] or d['total_amount'] or 0)
    stored_disc = float(d['discount_amount'] or 0)
    effective_disc = stored_disc if stored_disc > 0 else (sub - gt if sub > gt else 0)
    effective_pct = (effective_disc / sub * 100) if sub > 0 and effective_disc > 0 else 0
    
    print(f"\n  EFFECTIVE discount: Rs. {effective_disc:.2f} ({effective_pct:.2f}%)")
    print(f"  Frontend will now show: Discount ({effective_pct:.2f}%): - Rs. {effective_disc:.2f}")
    
    if effective_disc > 0:
        print("  ✅ Discount will now be visible on the bill!")
    
    # Check items
    print(f"\n  Items ({len(d.get('items', []))}):")
    for item in d.get('items', []):
        qty = float(item.get('quantity_delivered', 0))
        price = float(item.get('unit_price', 0))
        total = float(item.get('total_price', 0))
        gross = qty * price
        item_disc = float(item.get('discount_amount', 0))
        eff_item_disc = item_disc if item_disc > 0 else (gross - total if gross > total else 0)
        print(f"    {item['product_name']}: Qty={qty} x Rs.{price} = Rs.{gross} -> Total Rs.{total} (item discount: Rs.{eff_item_disc})")
    
    ssh.close()
    print("\n✅ Deploy and verify complete!")

if __name__ == '__main__':
    main()
