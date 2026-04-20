import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('147.93.108.205', username='root', password='Abbassi786..')

cmd = 'mysql distribution_system_db -e "ALTER TABLE shops ADD salesman_id INT; ALTER TABLE shops ADD FOREIGN KEY (salesman_id) REFERENCES salesmen(id) ON DELETE SET NULL;"'
print('Executing: mysql distribution_system_db -e "ALTER TABLE..."')
_, o, e = ssh.exec_command(cmd)

out = o.read().decode().strip()
err = e.read().decode().strip()
if out: print('OUT:', out)
if err: print('ERR:', err)

print('Verifying column exists:')
_, o, e = ssh.exec_command('mysql distribution_system_db -e "DESCRIBE shops;"')
out = o.read().decode().strip()

if 'salesman_id' in out:
    print('SUCCESS! salesman_id was added to the remote shops table.')
else:
    print('FAILED to find salesman_id in remote shops table.')
    print('Check the columns below:')
    print(out)

ssh.close()

import paramiko
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('147.93.108.205', username='root', password='Abbassi786..')

cmd = 'mysql distribution_system_db -e \\'ALTER TABLE shops ADD salesman_id INT; ALTER TABLE shops ADD FOREIGN KEY (salesman_id) REFERENCES salesmen(id) ON DELETE SET NULL;\\''
print('Executing:', cmd)
_, o, e = ssh.exec_command(cmd)

out = o.read().decode().strip()
err = e.read().decode().strip()
if out: print('OUT:', out)
if err: print('ERR:', err)

print('Verifying column exists:')
_, o, e = ssh.exec_command('mysql distribution_system_db -e \\'DESCRIBE shops;\\'')
out = o.read().decode().strip()
if 'salesman_id' in out:
    print('SUCCESS! salesman_id was added to the remote shops table.')
else:
    print('FAILED to find salesman_id in remote shops table.')
    print('Output was:', out)

ssh.close()
