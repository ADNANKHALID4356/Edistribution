"""Deploy backend to VPS via SSH"""
import paramiko
import sys
import time
import os

os.environ['PYTHONIOENCODING'] = 'utf-8'

HOST = '147.93.108.205'
USER = 'root'
PASSWORD = 'Abbassi786..'
APP_DIR = '/var/www/distribution-system'

def run_cmd(ssh, cmd, timeout=60):
    """Execute command and return output"""
    print(f"\n> {cmd}")
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    exit_code = stdout.channel.recv_exit_status()
    out = stdout.read().decode('utf-8', errors='replace').strip()
    err = stderr.read().decode('utf-8', errors='replace').strip()
    if out:
        print(out)
    if err and exit_code != 0:
        print(f"STDERR: {err}")
    return exit_code, out, err

def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    print(f"Connecting to {HOST}...")
    try:
        ssh.connect(HOST, username=USER, password=PASSWORD, timeout=15)
        print("Connected!\n")
    except Exception as e:
        print(f"Connection failed: {e}")
        sys.exit(1)

    # Step 1: Check current state
    print("=" * 50)
    print("STEP 1: Check current deployment")
    print("=" * 50)
    run_cmd(ssh, f"ls -la {APP_DIR}/server.js 2>/dev/null && echo 'App dir exists' || echo 'App dir NOT FOUND'")
    run_cmd(ssh, "pm2 list 2>/dev/null || echo 'PM2 not found'")
    
    # Step 2: Check if git repo exists
    print("\n" + "=" * 50)
    print("STEP 2: Check git setup")
    print("=" * 50)
    exit_code, out, _ = run_cmd(ssh, f"cd {APP_DIR} && git remote -v 2>/dev/null || echo 'NOT_A_GIT_REPO'")
    
    is_git_repo = 'NOT_A_GIT_REPO' not in out
    
    if is_git_repo:
        # Git repo exists - just pull latest
        print("\n" + "=" * 50)
        print("STEP 3: Pull latest changes from GitHub")
        print("=" * 50)
        
        # Stash any local changes first
        run_cmd(ssh, f"cd {APP_DIR} && git stash 2>/dev/null")
        
        # Pull latest
        exit_code, out, err = run_cmd(ssh, f"cd {APP_DIR} && git pull origin main 2>&1", timeout=120)
        
        if exit_code != 0:
            print(f"\nGit pull failed. Trying force reset...")
            run_cmd(ssh, f"cd {APP_DIR} && git fetch origin && git reset --hard origin/main", timeout=120)
    else:
        # Need to clone the repo
        print("\n" + "=" * 50)
        print("STEP 3: Clone repository from GitHub")
        print("=" * 50)
        
        # Backup existing files
        run_cmd(ssh, f"cp -r {APP_DIR} {APP_DIR}.backup.$(date +%Y%m%d%H%M) 2>/dev/null")
        
        # Check if directory has files
        _, out, _ = run_cmd(ssh, f"ls {APP_DIR}/ 2>/dev/null | head -5")
        
        if out:
            # Directory has files but no git - init and add remote
            print("Directory has files but no git repo. Initializing git...")
            run_cmd(ssh, f"cd {APP_DIR} && git init && git remote add origin https://github.com/ADNANKHALID4356/distribution_system.git")
            run_cmd(ssh, f"cd {APP_DIR} && git fetch origin", timeout=120)
            run_cmd(ssh, f"cd {APP_DIR} && git checkout -f main 2>/dev/null || git checkout -b main origin/main", timeout=60)
        else:
            # Empty or non-existent - clone fresh
            print("Cloning fresh repository...")
            run_cmd(ssh, f"rm -rf {APP_DIR} && git clone https://github.com/ADNANKHALID4356/distribution_system.git {APP_DIR}", timeout=120)
    
    # Step 4: Install dependencies
    print("\n" + "=" * 50)
    print("STEP 4: Install backend dependencies")
    print("=" * 50)
    # The repo root has backend/ and desktop/ folders - install in backend/
    _, out, _ = run_cmd(ssh, f"ls {APP_DIR}/backend/server.js 2>/dev/null && echo 'MONOREPO' || echo 'FLAT'")
    
    if 'MONOREPO' in out:
        backend_dir = f"{APP_DIR}/backend"
    else:
        backend_dir = APP_DIR
    
    print(f"Backend directory: {backend_dir}")
    run_cmd(ssh, f"cd {backend_dir} && npm install --production 2>&1 | tail -5", timeout=120)
    
    # Step 5: Run migrations
    print("\n" + "=" * 50)
    print("STEP 5: Run database migrations")
    print("=" * 50)
    run_cmd(ssh, f"cd {backend_dir} && node src/config/migrations.js 2>&1 | tail -20", timeout=30)
    
    # Step 6: Restart PM2
    print("\n" + "=" * 50)
    print("STEP 6: Restart PM2 process")
    print("=" * 50)
    
    # Check PM2 process name
    _, pm2_out, _ = run_cmd(ssh, "pm2 jlist 2>/dev/null | python3 -c \"import sys,json; procs=json.load(sys.stdin); [print(p['name']) for p in procs]\" 2>/dev/null || pm2 list 2>/dev/null")
    
    # Try common process names
    process_name = 'distribution-api'
    run_cmd(ssh, f"cd {backend_dir} && pm2 restart {process_name} 2>/dev/null || pm2 start server.js --name {process_name} 2>&1", timeout=30)
    
    # Step 7: Verify
    print("\n" + "=" * 50)
    print("STEP 7: Verify deployment")
    print("=" * 50)
    time.sleep(3)
    run_cmd(ssh, "pm2 list")
    run_cmd(ssh, f"curl -s http://localhost:5001/api/health 2>/dev/null || curl -s http://127.0.0.1:5001/api/health 2>/dev/null")
    run_cmd(ssh, f"pm2 logs {process_name} --lines 10 --nostream 2>/dev/null")
    
    print("\n" + "=" * 50)
    print("DEPLOYMENT COMPLETE!")
    print("=" * 50)
    
    ssh.close()

if __name__ == '__main__':
    main()
