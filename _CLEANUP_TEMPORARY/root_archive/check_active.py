import paramiko
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('147.93.108.205', username='root', password='Abbassi786..')

cmd = 'mysql -u dist_user -pDist2025Secure distribution_db -e "SELECT id, product_code, product_name, stock_quantity, is_active FROM products WHERE product_name = \'Coca Cola\';"'
_, o, e = ssh.exec_command(cmd)
print("Products:")
print(o.read().decode())
ssh.close()
