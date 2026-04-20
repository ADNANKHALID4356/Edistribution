import paramiko
import os
print('Connecting to VPS via SFTP...')
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('147.93.108.205', username='root', password='Abbassi786..')
sftp = ssh.open_sftp()
for local, remote in [
    (r'backend/src/controllers/productController.js', '/var/www/distribution-system/backend/src/controllers/productController.js'),
    (r'backend/src/routes/desktop/productRoutes.js', '/var/www/distribution-system/backend/src/routes/desktop/productRoutes.js')
]:
    print(f'Uploading {local} to {remote}...')
    sftp.put(local, remote)
sftp.close()
print('Files uploaded! Installing dependencies...')
stdin, stdout, stderr = ssh.exec_command('cd /var/www/distribution-system/backend && npm install multer xlsx pdf-parse && pm2 restart distribution-api')
print(stdout.read().decode())
print(stderr.read().decode())
ssh.close()
print('Done!')
