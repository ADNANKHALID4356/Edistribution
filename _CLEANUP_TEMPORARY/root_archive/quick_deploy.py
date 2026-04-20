import paramiko
import sys

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('147.93.108.205', username='root', password='Abbassi786..')

commands = [
    ('Git Pull', 'cd /var/www/distribution-system && git pull origin main 2>&1'),
    ('NPM Install', 'cd /var/www/distribution-system/backend && npm install --production 2>&1 | tail -3'),
    ('PM2 Restart', 'pm2 restart distribution-api 2>&1 | tail -5'),
    ('Wait & Health', 'sleep 3 && curl -s http://147.93.108.205:5001/api/health'),
]

for label, cmd in commands:
    print(f'\n--- {label} ---')
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=120)
    out = stdout.read().decode('utf-8', errors='replace').strip()
    err = stderr.read().decode('utf-8', errors='replace').strip()
    if out:
        print(out[:600])
    if err and 'warn' not in err.lower() and 'npm' not in err.lower():
        print(f'ERR: {err[:300]}')

ssh.close()
print('\nDeployment complete!')
