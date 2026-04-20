import paramiko
import sys
import time

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    ssh.connect('147.93.108.205', username='root', password='Abbassi786..')
    sftp = ssh.open_sftp()
except Exception as e:
    print('Failed to connect to VPS:', e)
    sys.exit(1)

with open('backend/src/models/Delivery.js', 'r', encoding='utf-8') as f:
    sftp.file('/var/www/distribution-system/backend/src/models/Delivery.js', 'w').write(f.read())
print('Deployed Delivery.js with Ledger bypass.')

ssh.exec_command('cd /var/www/distribution-system/backend && pm2 restart distribution-api')
print('Sent PM2 restart.')
