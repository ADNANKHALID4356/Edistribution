import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('147.93.108.205', username='root', password='Abbassi786..')

def run(cmd):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=15)
    return stdout.read().decode().strip()

# Check delivery 18 order_id
print("=== DELIVERY 18 FULL ROW ===")
print(run("mysql -u dist_user -p'Dist2025Secure' distribution_db -e 'SELECT id, challan_number, order_id, subtotal, discount_percentage, discount_amount, grand_total, total_amount FROM deliveries WHERE id=18;'"))

# Check orders table columns
print("\n=== ORDERS TABLE STRUCTURE ===")
print(run("mysql -u dist_user -p'Dist2025Secure' distribution_db -e 'DESCRIBE orders;'"))

# Check order 14 full row including discount column
print("\n=== ORDER 14 FULL DISCOUNT FIELDS ===")
print(run("mysql -u dist_user -p'Dist2025Secure' distribution_db -e \"SELECT id, order_number, total_amount, discount, discount_amount, net_amount FROM orders WHERE id=14;\""))

# Get ALL orders
print("\n=== ALL ORDERS ===")
print(run("mysql -u dist_user -p'Dist2025Secure' distribution_db -e \"SELECT id, order_number, total_amount, discount, discount_amount, net_amount FROM orders ORDER BY id;\""))

# Get order_details for the delivery's order
print("\n=== ORDER DETAILS FOR ORDER LINKED TO DELIVERY 18 ===")
d18_order = run("mysql -N -u dist_user -p'Dist2025Secure' distribution_db -e 'SELECT order_id FROM deliveries WHERE id=18;'")
print(f"Delivery 18 is from order_id: {d18_order}")
print(run(f"mysql -u dist_user -p'Dist2025Secure' distribution_db -e 'SELECT od.*, p.product_name FROM order_details od LEFT JOIN products p ON od.product_id = p.id WHERE od.order_id={d18_order};'"))

ssh.close()
