import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('147.93.108.205', username='root', password='Abbassi786..')

def run(cmd):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=15)
    return stdout.read().decode().strip()

# Check delivery header data
print("=== DELIVERY HEADERS ===")
print(run("mysql -u dist_user -p'Dist2025Secure' distribution_db -e 'SELECT id, challan_number, subtotal, discount_percentage, discount_amount, grand_total, total_amount FROM deliveries ORDER BY id DESC LIMIT 5;'"))

# Check delivery items with discount info
print("\n=== DELIVERY ITEMS (latest delivery) ===")
print(run("mysql -u dist_user -p'Dist2025Secure' distribution_db -e 'SELECT di.id, di.delivery_id, di.product_name, di.quantity_delivered, di.unit_price, di.total_price, di.discount_percentage, di.discount_amount, di.net_amount FROM delivery_items di ORDER BY di.delivery_id DESC, di.id LIMIT 10;'"))

# Check orders to compare
print("\n=== ORDERS WITH DISCOUNTS ===")
print(run("mysql -u dist_user -p'Dist2025Secure' distribution_db -e 'SELECT id, order_number, total_amount, discount_amount, net_amount FROM orders ORDER BY id DESC LIMIT 5;'"))

# Check order_details discount info
print("\n=== ORDER DETAILS (latest) ===")
print(run("mysql -u dist_user -p'Dist2025Secure' distribution_db -e 'SELECT od.id, od.order_id, od.product_id, od.quantity, od.unit_price, od.total_price, od.discount_percentage FROM order_details od ORDER BY od.order_id DESC, od.id LIMIT 10;'"))

# Check delivery_items columns
print("\n=== DELIVERY_ITEMS TABLE STRUCTURE ===")
print(run("mysql -u dist_user -p'Dist2025Secure' distribution_db -e 'DESCRIBE delivery_items;'"))

ssh.close()
