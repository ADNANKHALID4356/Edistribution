import paramiko
import sys

def check_remote_app():
    hostname = '147.93.108.205'
    port = 22
    username = 'root'
    password = 'Abbassi786..'

    print(f"Connecting to {hostname} via SSH...")
    try:
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        client.connect(hostname, port, username, password, timeout=10)
        
        print("Connected successfully! Checking UFW firewall status...")
        stdin, stdout, stderr = client.exec_command("ufw status")
        print("\n".join(stdout.readlines()))
        
        print("Opening port 5001 to allow external frontend connection...")
        stdin, stdout, stderr = client.exec_command("ufw allow 5001/tcp")
        print("\n".join(stdout.readlines()))
        
        print("Checking if PM2 API service is running...")
        stdin, stdout, stderr = client.exec_command("pm2 list")
        print("\n".join(stdout.readlines()))
        
        print("Checking Nginx status...")
        stdin, stdout, stderr = client.exec_command("systemctl status nginx --no-pager | head -n 10")
        print("\n".join(stdout.readlines()))
        
        print("Fetching a sample of real-time server logs...")
        stdin, stdout, stderr = client.exec_command("pm2 logs --lines 15 distribution-api --nostream")
        print("\n".join(stdout.readlines()))

        client.close()
    except Exception as e:
        print(f"Failed to connect or execute commands: {e}")

if __name__ == "__main__":
    check_remote_app()
