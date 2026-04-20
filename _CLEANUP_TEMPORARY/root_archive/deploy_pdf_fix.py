import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('147.93.108.205', username='root', password='Abbassi786..')

cmd = 'cd /var/www/distribution-system/backend && npm i pdf-parse@1.1.1 && pm2 restart distribution-api'
_, o, e = ssh.exec_command(cmd)

print(o.read().decode())
print(e.read().decode())

ssh.close()
