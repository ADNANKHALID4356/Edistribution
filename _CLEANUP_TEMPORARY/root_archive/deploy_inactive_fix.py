import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('147.93.108.205', username='root', password='Abbassi786..')

sftp = ssh.open_sftp()
sftp.put('backend/src/controllers/productController.js', '/var/www/distribution-system/backend/src/controllers/productController.js')
sftp.close()

_, o, _ = ssh.exec_command('pm2 restart distribution-api')
print(o.read().decode())
ssh.close()
