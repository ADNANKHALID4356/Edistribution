import paramiko, json, sys
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('147.93.108.205', username='root', password='Abbassi786..', timeout=15)

cmds = [
    'pm2 jlist',
    'ls /var/www/',
    'cat /etc/nginx/sites-enabled/* 2>/dev/null | grep -E "server_name|proxy_pass|listen" | head -40',
    'netstat -tlnp 2>/dev/null | grep LISTEN | head -20',
    'curl -s http://147.93.108.205:5001/api/health',
    'curl -s http://localhost:5001/api/health',
]
for cmd in cmds:
    print('=' * 60)
    print(f'CMD: {cmd[:80]}')
    print('=' * 60)
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=30)
    stdout.channel.recv_exit_status()
    out = stdout.read().decode('utf-8', errors='replace').strip()
    if cmd == 'pm2 jlist':
        try:
            procs = json.loads(out)
            for p in procs:
                env = p.get('pm2_env', {})
                print(f"  ID:{p['pm_id']}  name:{p['name']}  status:{env.get('status')}  pid:{p.get('pid')}  cwd:{env.get('pm_cwd')}  script:{env.get('pm_exec_path')}")
        except:
            print(out[:2000])
    else:
        print(out[:2000])
    print()
ssh.close()
