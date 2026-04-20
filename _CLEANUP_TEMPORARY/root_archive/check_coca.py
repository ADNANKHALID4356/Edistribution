import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('147.93.108.205', username='root', password='Abbassi786..')

cmd = 'mysql -u dist_user -pDist2025Secure distribution_db -e "SELECT id, product_code, product_name, is_active FROM products WHERE product_name LIKE \'%Coca%\';"'
_, o, e = ssh.exec_command(cmd)
print("Products:")
print(o.read().decode())
print("Errors:", e.read().decode())
ssh.close()
