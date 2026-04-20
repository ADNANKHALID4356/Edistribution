import paramiko, json
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('147.93.108.205', username='root', password='Abbassi786..', timeout=15)

print("=" * 60)
print("VERIFYING ALL SERVICES ARE HEALTHY")
print("=" * 60)

checks = [
    ("Distribution API (ext)", "curl -s -o /dev/null -w '%{http_code}' http://147.93.108.205:5001/api/health"),
    ("Distribution API (full)", "curl -s http://147.93.108.205:5001/api/health"),
    ("Gandhara (localhost)", "curl -s -o /dev/null -w '%{http_code}' http://localhost:5001/api/health"),
    ("Ummah (localhost:5000)", "curl -s -o /dev/null -w '%{http_code}' http://localhost:5000"),
    ("IT API (localhost:5003)", "curl -s -o /dev/null -w '%{http_code}' http://localhost:5003"),
    ("Gandhara website", "curl -s -o /dev/null -w '%{http_code}' -H 'Host: gandhara-arts-and-taxila-stone-crafts.com' http://localhost"),
    ("Ummah website", "curl -s -o /dev/null -w '%{http_code}' -H 'Host: ummahtechinnovations.com' http://localhost"),
    ("IT website", "curl -s -o /dev/null -w '%{http_code}' -H 'Host: internationaltijarat.com' http://localhost"),
    ("Nginx status", "systemctl is-active nginx"),
    ("MySQL status", "systemctl is-active mysql"),
    ("PM2 process count", "pm2 jlist | python3 -c 'import sys,json; procs=json.loads(sys.stdin.read()); online=[p for p in procs if p[\"pm2_env\"][\"status\"]==\"online\"]; print(f\"{len(online)}/{len(procs)} online\")'"),
]

all_ok = True
for name, cmd in checks:
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=15)
    stdout.channel.recv_exit_status()
    out = stdout.read().decode('utf-8', errors='replace').strip()
    status = "OK" if (out in ['200', 'active'] or 'OK' in out or '4/4' in out) else "CHECK"
    icon = "PASS" if status == "OK" else "WARN"
    print(f"  [{icon}] {name}: {out[:120]}")
    if status != "OK":
        all_ok = False

print()
if all_ok:
    print("ALL SERVICES HEALTHY - NO DISRUPTION")
else:
    print("Some services need attention (see WARN above)")

ssh.close()
