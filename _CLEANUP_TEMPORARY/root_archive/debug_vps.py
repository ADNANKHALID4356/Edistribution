import paramiko
import sys

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('147.93.108.205', username='root', password='Abbassi786..')

commands = [
    ('Check DB deliveries table schema', "mysql -u dist_user -pDist2025Secure distribution_db -e \"DESCRIBE deliveries;\" 2>&1"),
    ('Check delivery statuses', "mysql -u dist_user -pDist2025Secure distribution_db -e \"SELECT id, challan_number, status, order_id, received_at FROM deliveries ORDER BY id DESC LIMIT 10;\" 2>&1"),
    ('Check delivery_items schema', "mysql -u dist_user -pDist2025Secure distribution_db -e \"DESCRIBE delivery_items;\" 2>&1"),
    ('Check warehouse_stock', "mysql -u dist_user -pDist2025Secure distribution_db -e \"SELECT * FROM warehouse_stock LIMIT 5;\" 2>&1"),
    ('Check stock_returns table', "mysql -u dist_user -pDist2025Secure distribution_db -e \"DESCRIBE stock_returns;\" 2>&1"),
    ('Check stock_return_items table', "mysql -u dist_user -pDist2025Secure distribution_db -e \"DESCRIBE stock_return_items;\" 2>&1"),
    ('Check orders statuses', "mysql -u dist_user -pDist2025Secure distribution_db -e \"SELECT id, order_number, status FROM orders ORDER BY id DESC LIMIT 10;\" 2>&1"),
    ('Check PM2 logs for errors', "pm2 logs distribution-api --lines 50 --nostream 2>&1 | grep -i 'error\\|❌\\|fail\\|status.*delivered' | tail -20"),
    ('Check current server.js code version', "head -5 /var/www/distribution-system/backend/src/models/Delivery.js 2>&1"),
    ('Check updateStatus in deployed code', "grep -n 'updateStatus\\|delivered_date\\|actual_delivery_time\\|order_id' /var/www/distribution-system/backend/src/models/Delivery.js 2>&1"),
]

for label, cmd in commands:
    print(f'\n=== {label} ===')
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=30)
    out = stdout.read().decode('utf-8', errors='replace').strip()
    err = stderr.read().decode('utf-8', errors='replace').strip()
    if out:
        print(out[:800])
    if err and 'warn' not in err.lower():
        print(f'STDERR: {err[:300]}')

ssh.close()
print('\nDone!')
