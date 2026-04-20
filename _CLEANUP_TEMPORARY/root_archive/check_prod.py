import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('147.93.108.205', username='root', password='Abbassi786..')

cmd = 'cat /var/www/distribution-system/backend/src/models/Product.js | grep -A 5 -B 5 "INSERT INTO products"'
_, o, e = ssh.exec_command(cmd)
print("Product.js INSERT:")
print(o.read().decode())

cmd = 'cat /var/www/distribution-system/backend/src/models/Product.js | grep -A 5 -B 5 "is_active !== false"'
_, o, e = ssh.exec_command(cmd)
print("Product.js is_active:")
print(o.read().decode())

ssh.close()
