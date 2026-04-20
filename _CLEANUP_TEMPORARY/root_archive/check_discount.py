import paramiko
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('147.93.108.205', username='root', password='Abbassi786..')

cmd = 'mysql -u dist_user -pDist2025Secure distribution_db -e "SELECT od.id, od.order_id, od.quantity, od.unit_price, od.total_price, od.discount, od.discount_percentage, od.net_price FROM order_details od ORDER BY od.order_id DESC LIMIT 20;"'
_, o, e = ssh.exec_command(cmd)
print("ORDER DETAILS:")
print(o.read().decode())

cmd2 = 'mysql -u dist_user -pDist2025Secure distribution_db -e "SELECT id, order_number, total_amount, discount, net_amount FROM orders ORDER BY id DESC LIMIT 10;"'
_, o2, e2 = ssh.exec_command(cmd2)
print("\nORDERS:")
print(o2.read().decode())

cmd3 = 'mysql -u dist_user -pDist2025Secure distribution_db -e "SELECT di.delivery_id, di.product_id, di.quantity_ordered, di.unit_price, di.total_price, di.discount_percentage, di.discount_amount, di.net_amount FROM delivery_items di ORDER BY di.delivery_id DESC LIMIT 20;"'
_, o3, e3 = ssh.exec_command(cmd3)
print("\nDELIVERY ITEMS:")
print(o3.read().decode())

cmd4 = 'mysql -u dist_user -pDist2025Secure distribution_db -e "SELECT id, challan_number, order_id, subtotal, discount_percentage, discount_amount, grand_total FROM deliveries ORDER BY id DESC LIMIT 10;"'
_, o4, e4 = ssh.exec_command(cmd4)
print("\nDELIVERIES:")
print(o4.read().decode())

ssh.close()
