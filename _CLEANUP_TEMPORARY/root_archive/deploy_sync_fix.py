import paramiko
import time

VPS_HOST = '147.93.108.205'
VPS_USER = 'root'
VPS_PASS = 'Abbassi786..'
APP_DIR = '/var/www/distribution-system'

def run(ssh, cmd):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=30)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    return out, err

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(VPS_HOST, username=VPS_USER, password=VPS_PASS, timeout=10)
print("Connected to VPS")

# 1. Check current commit
out, _ = run(ssh, f'cd {APP_DIR} && git log --oneline -1')
print(f"Current commit: {out}")

# 2. Pull latest
out, err = run(ssh, f'cd {APP_DIR} && git pull origin main')
print(f"Git pull: {out}")
if err and 'Already up to date' not in out:
    print(f"Git errors: {err}")

# 3. Verify fix is in place
out, _ = run(ssh, f'grep -n "order will still be accepted" {APP_DIR}/backend/src/controllers/syncController.js')
if out:
    print(f"Fix verified: {out}")
else:
    print("ERROR: Fix NOT found in syncController.js!")

# 4. Restart PM2
out, _ = run(ssh, 'pm2 restart distribution-api')
print("PM2 restarted")
time.sleep(4)

# 5. Verify running
out, _ = run(ssh, 'pm2 status distribution-api --no-color')
print(f"PM2 status:\n{out}")

# 6. Check PM2 logs for startup errors
out, _ = run(ssh, 'pm2 logs distribution-api --lines 10 --nostream')
print(f"\nRecent logs:\n{out}")

# 7. Check current orders in DB
out, _ = run(ssh, f"mysql -u dist_user -p'Dist2025Secure' distribution_db -e 'SELECT id, order_number, shop_id, salesman_id, status, total_amount, is_synced, sync_status FROM orders ORDER BY id DESC LIMIT 10;'")
print(f"\nCurrent orders:\n{out}")

# 8. Check sync logs
out, _ = run(ssh, f"mysql -u dist_user -p'Dist2025Secure' distribution_db -e \"SELECT id, salesman_id, sync_type, status, records_count, error_message, created_at FROM sync_logs ORDER BY id DESC LIMIT 10;\"")
print(f"\nSync logs:\n{out}")

ssh.close()
print("\nDeploy complete!")
