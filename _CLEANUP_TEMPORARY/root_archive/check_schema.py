import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('147.93.108.205', username='root', password='Abbassi786..')

cmd = 'mysql -u dist_user -pDist2025Secure distribution_db -e "DESCRIBE products;"'
_, o, e = ssh.exec_command(cmd)
print("Products Schema:")
print(o.read().decode())
ssh.close()
