import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('147.93.108.205', username='root', password='Abbassi786..')

commands = [
    ('Full deliveries schema', "mysql -u dist_user -pDist2025Secure distribution_db -e \"SHOW CREATE TABLE deliveries\\G\" 2>&1"),
    ('Check columns like received', "mysql -u dist_user -pDist2025Secure distribution_db -e \"SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='deliveries' AND TABLE_SCHEMA='distribution_db' ORDER BY ORDINAL_POSITION;\" 2>&1"),
]

for label, cmd in commands:
    print(f'\n=== {label} ===')
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=30)
    out = stdout.read().decode('utf-8', errors='replace').strip()
    if out:
        print(out[:2000])

ssh.close()
print('\nDone!')
