import paramiko

HOST = '147.93.108.205'
USER = 'root'
PASSWORD = 'LaptopAdmin098&'

def deploy():
    try:
        print(f"Connecting to VPS at {HOST}...")
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh.connect(HOST, username=USER, password=PASSWORD)
        print("Connected.")

        commands = [
            "cd /var/www/distribution-backend && git status",
            "cd /var/www/distribution-backend && git fetch origin master",
            "cd /var/www/distribution-backend && git reset --hard origin/master",
            "cd /var/www/distribution-backend && npm ci",
            "pm2 restart distribution-api || pm2 restart backend"
        ]

        for cmd in commands:
            print(f"Executing: {cmd}")
            stdin, stdout, stderr = ssh.exec_command(cmd)
            out = stdout.read().decode('utf-8')
            err = stderr.read().decode('utf-8')
            if out: print(out)
            if err: print("Error:", err)
        print("Deployment sequence executed successfully on VPS.")
    except Exception as e:
        print(f"Deployment script failed: {e}")
    finally:
        ssh.close()

if __name__ == '__main__':
    deploy()
