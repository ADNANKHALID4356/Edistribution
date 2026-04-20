"""Verify VPS deployment is working"""
import paramiko
import os

os.environ['PYTHONIOENCODING'] = 'utf-8'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('147.93.108.205', username='root', password='Abbassi786..', timeout=15)

cmds = [
    # Check the external IP health (not localhost which goes to gandhara)
    'curl -s http://147.93.108.205:5001/api/health',
    # Check distribution-api process details
    'pm2 jlist 2>/dev/null | python3 -c "import sys,json;[print(f\\"name:{p[\'name\']} pid:{p[\'pid\']} status:{p[\'pm2_env\'][\'status\']} cwd:{p[\'pm2_env\'][\'pm_cwd\']} script:{p[\'pm2_env\'][\'pm_exec_path\']}\\" ) for p in json.loads(sys.stdin.read()) if p[\'name\']==\'distribution-api\']"',
    # Run DB migration check
    'cd /var/www/distribution-system/backend && node -e "const m=require(\'./src/config/migrations\');m.runMigrations().then(()=>{console.log(\'MIGRATIONS OK\');process.exit(0)}).catch(e=>{console.error(e);process.exit(1)})" 2>&1 | tail -20',
    # Test login endpoint
    'curl -s -X POST http://147.93.108.205:5001/api/auth/login -H "Content-Type: application/json" -d \'{"username":"admin","password":"admin123"}\' | python3 -c "import sys,json;r=json.load(sys.stdin);print(f\\"Login: {r.get(\'success\',False)} Token: {r.get(\'data\',{}).get(\'token\',\'\')[:30]}...\\")" 2>/dev/null || echo "Login test failed"',
]

for cmd in cmds:
    print(f"\n> {cmd[:80]}...")
    i, o, e = ssh.exec_command(cmd, timeout=30)
    out = o.read().decode('utf-8', errors='replace').strip()
    err = e.read().decode('utf-8', errors='replace').strip()
    if out: print(out)
    if err: print(f"ERR: {err}")

ssh.close()
print("\nDONE")
