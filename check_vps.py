import paramiko
import sys

HOST = '147.93.108.205'
USER = 'root'
PASSWORD = 'LaptopAdmin098&'

try:
    print("Connecting to VPS...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, port=22, username=USER, password=PASSWORD, timeout=10)
    print("Connected.")

    print("Running pm2 show distribution-api")
    stdin, stdout, stderr = ssh.exec_command("pm2 desc distribution-api | grep 'script path'")
    print(stdout.read().decode('utf-8'))

    print("\nRunning pm2 show backend")
    stdin, stdout, stderr = ssh.exec_command("pm2 desc backend | grep 'script path'")
    print(stdout.read().decode('utf-8'))

except Exception as e:
    print(f"Error: {e}")
finally:
    ssh.close()
