"""Check and fix VPS deployment configuration"""
import paramiko
import sys
import os

os.environ['PYTHONIOENCODING'] = 'utf-8'

HOST = '147.93.108.205'
USER = 'root'
PASSWORD = 'Abbassi786..'

def run(ssh, cmd, timeout=60):
    print(f"\n> {cmd}")
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    exit_code = stdout.channel.recv_exit_status()
    out = stdout.read().decode('utf-8', errors='replace').strip()
    err = stderr.read().decode('utf-8', errors='replace').strip()
    if out:
        print(out)
    if err and exit_code != 0:
        print(f"ERR: {err}")
    return exit_code, out

def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, username=USER, password=PASSWORD, timeout=15)
    print("Connected!\n")

    # Check current PM2 config
    print("=" * 50)
    print("1. CURRENT PM2 CONFIG")
    print("=" * 50)
    run(ssh, "pm2 jlist 2>/dev/null | python3 -c \"import sys,json; [print(f\\\"ID:{p['pm_id']} name:{p['name']} cwd:{p.get('pm2_env',{}).get('pm_cwd','')} script:{p.get('pm2_env',{}).get('pm_exec_path','')}\\\") for p in json.loads(sys.stdin.read())]\"")
    
    # Check what files exist
    print("\n" + "=" * 50)
    print("2. FILE STRUCTURE")
    print("=" * 50)
    run(ssh, "ls -la /var/www/distribution-system/server.js 2>/dev/null")
    run(ssh, "ls -la /var/www/distribution-system/backend/server.js 2>/dev/null")
    run(ssh, "ls /var/www/distribution-system/ | head -20")
    
    # Check .env files
    print("\n" + "=" * 50)
    print("3. ENV FILES")
    print("=" * 50)
    run(ssh, "cat /var/www/distribution-system/.env 2>/dev/null || echo 'NO ROOT .env'")
    run(ssh, "cat /var/www/distribution-system/backend/.env 2>/dev/null || echo 'NO BACKEND .env'")
    
    # Check what port distribution-api actually listens on
    print("\n" + "=" * 50)
    print("4. PORT CHECK")
    print("=" * 50)
    run(ssh, "netstat -tlnp 2>/dev/null | grep -E '5001|5000' || ss -tlnp | grep -E '5001|5000'")
    
    # Fix: Update PM2 to point to backend/ subdirectory
    print("\n" + "=" * 50)
    print("5. FIX PM2 - Point to backend/server.js")
    print("=" * 50)
    
    # Stop old process
    run(ssh, "pm2 stop distribution-api 2>/dev/null")
    run(ssh, "pm2 delete distribution-api 2>/dev/null")
    
    # Check/create .env in backend
    _, env_check = run(ssh, "cat /var/www/distribution-system/backend/.env 2>/dev/null | grep DB_HOST || echo 'NO_DB_CONFIG'")
    
    if 'NO_DB_CONFIG' in env_check:
        # Copy .env from root level if exists, or check old .env
        _, root_env = run(ssh, "cat /var/www/distribution-system/.env 2>/dev/null || echo 'NO_ROOT_ENV'")
        
        if 'NO_ROOT_ENV' not in root_env:
            print("Copying root .env to backend/.env")
            run(ssh, "cp /var/www/distribution-system/.env /var/www/distribution-system/backend/.env")
        else:
            # Find .env from backup
            print("Looking for .env in backup...")
            run(ssh, "find /var/www/ -name '.env' -path '*/distribution*' 2>/dev/null | head -5")
            # Check if default .env had DB credentials before git checkout
            _, backup_env = run(ssh, "ls /var/www/distribution-system.backup.*/  2>/dev/null | head -5")
            if backup_env:
                run(ssh, "cat /var/www/distribution-system.backup.*/.env 2>/dev/null | head -20")
                run(ssh, "cp /var/www/distribution-system.backup.*/.env /var/www/distribution-system/backend/.env 2>/dev/null")
    
    # Start PM2 with correct cwd
    run(ssh, "cd /var/www/distribution-system/backend && pm2 start server.js --name distribution-api --cwd /var/www/distribution-system/backend 2>&1")
    run(ssh, "pm2 save")
    
    # Wait and verify
    import time
    time.sleep(4)
    
    print("\n" + "=" * 50)
    print("6. VERIFY")
    print("=" * 50)
    run(ssh, "pm2 list")
    run(ssh, "curl -s http://localhost:5001/api/health 2>/dev/null")
    run(ssh, "pm2 logs distribution-api --lines 15 --nostream 2>/dev/null")
    
    print("\n" + "=" * 50)
    print("DONE!")
    print("=" * 50)
    
    ssh.close()

if __name__ == '__main__':
    main()
