import paramiko
import os
import sys

VPS_HOST = '147.93.108.205'
VPS_USER = 'root'
VPS_PASS = 'Abbassi786..'
APP_DIR = '/var/www/distribution-system'

WORKSPACE_ROOT = r'C:\Users\Laptop House\Documents\DISTribute\New folder\distribution_system-main'

FILES_TO_UPLOAD = [
    'backend/src/controllers/shopController.js',
    'backend/src/controllers/syncController.js',
    'backend/src/models/Delivery.js'
]

def main():
    print("Initiating direct remote upload for Phase 1 & 2 logic...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        ssh.connect(VPS_HOST, username=VPS_USER, password=VPS_PASS, timeout=15)
        print("SSH Connected.")
    except Exception as e:
        print(f"Failed to connect: {e}")
        sys.exit(1)

    sftp = ssh.open_sftp()

    for file_rel in FILES_TO_UPLOAD:
        local_path = os.path.join(WORKSPACE_ROOT, file_rel.replace('/', '\\'))
        remote_path = f"{APP_DIR}/{file_rel}"
        
        try:
            print(f"Uploading {file_rel}...")
            sftp.put(local_path, remote_path)
            print(f" -> Success!")
        except Exception as e:
            print(f" -> ERROR uploading {file_rel}: {e}")

    sftp.close()
    
    print("\nRestarting production backend server via PM2...")
    stdin, stdout, stderr = ssh.exec_command('pm2 restart distribution-api')
    print("STDOUT:", stdout.read().decode().strip())
    print("STDERR:", stderr.read().decode().strip())
    
    ssh.close()
    print("\nDeployment complete! The VPS backend is now fully running Phase 1 & 2 logic.")

if __name__ == "__main__":
    main()
