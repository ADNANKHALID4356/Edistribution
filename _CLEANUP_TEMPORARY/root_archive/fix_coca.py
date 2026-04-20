import paramiko
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('147.93.108.205', username='root', password='Abbassi786..')

cmd = 'mysql -u dist_user -pDist2025Secure distribution_db -e "UPDATE products SET is_active=1 WHERE product_name=\'Coca Cola\';"'
_, _, _ = ssh.exec_command(cmd)
print("Updated Coca Cola")

cmd2 = 'mysql -u dist_user -pDist2025Secure distribution_db -e "SELECT id, product_code, product_name, stock_quantity, is_active FROM products WHERE product_name = \'Coca Cola\';"'
_, o, _ = ssh.exec_command(cmd2)
print(o.read().decode())
ssh.close()
