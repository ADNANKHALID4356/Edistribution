import paramiko
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('147.93.108.205', username='root', password='Abbassi786..')

cmds = [
    'cd /var/www/distribution-system && git pull origin main',
    'pm2 restart distribution-api',
    'sleep 2 && pm2 show distribution-api 2>/dev/null | grep -E "status|uptime"',
    'cd /var/www/distribution-system && git log --oneline -1'
]

for cmd in cmds:
    _, o, e = ssh.exec_command(cmd)
    out = o.read().decode().strip()
    err = e.read().decode().strip()
    if out:
        print(out)
    if err and 'warning' not in err.lower():
        print('ERR:', err)

ssh.close()
print('\nDone!')
