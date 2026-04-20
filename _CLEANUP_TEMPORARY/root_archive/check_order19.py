import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('147.93.108.205', username='root', password='Abbassi786..')

def run(cmd):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=15)
    return stdout.read().decode().strip()

# Check ALL orders including order 19
print("=== ALL ORDERS IN DB ===")
print(run("mysql -u dist_user -p'Dist2025Secure' distribution_db -e 'SELECT id, order_number, shop_id, salesman_id, status, total_amount, net_amount FROM orders ORDER BY id;'"))

# Check order 19 details
print("\n=== ORDER 19 FULL DETAILS ===")
print(run("mysql -u dist_user -p'Dist2025Secure' distribution_db -e 'SELECT * FROM orders WHERE id=19;'"))

# Check order_details for all orders
print("\n=== ORDER DETAILS / ITEMS ===")
print(run("mysql -u dist_user -p'Dist2025Secure' distribution_db -e 'SELECT od.order_id, COUNT(*) as items_count, SUM(od.quantity) as total_qty FROM order_details od GROUP BY od.order_id ORDER BY od.order_id;'"))

# Check if order 19 has items
print("\n=== ORDER 19 ITEMS ===")
print(run("mysql -u dist_user -p'Dist2025Secure' distribution_db -e 'SELECT * FROM order_details WHERE order_id=19;'"))

# Check order 20 items
print("\n=== ORDER 20 ITEMS ===")
print(run("mysql -u dist_user -p'Dist2025Secure' distribution_db -e 'SELECT * FROM order_details WHERE order_id=20;'"))

# Check recent PM2 logs for any errors related to order 19
print("\n=== RECENT PM2 LOGS ===")
print(run("pm2 logs distribution-api --lines 30 --nostream 2>&1 | tail -40"))

ssh.close()
