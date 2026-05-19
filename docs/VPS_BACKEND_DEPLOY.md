# VPS Backend Deployment Guide

Deploy **backend only** from this repository to your VPS (Hostinger or any Linux server).

Repository: https://github.com/ADNANKHALID4356/Edistribution

## 1) VPS prerequisites

- Ubuntu 20.04+ (or similar Linux)
- Node.js 18+
- MySQL 8+
- PM2 (`npm install -g pm2`)
- Git

Optional: Nginx reverse proxy (recommended for production)

## 2) First-time setup on VPS

```bash
# Clone repository
sudo mkdir -p /var/www
sudo git clone https://github.com/ADNANKHALID4356/Edistribution.git /var/www/distribution-system
sudo chown -R $USER:$USER /var/www/distribution-system

cd /var/www/distribution-system/backend

# Create production env file (never commit this)
cp .env.production.example .env.production
nano .env.production
```

Required `.env.production` values:

- `PORT=5000`
- `NODE_ENV=production`
- `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT`
- `JWT_SECRET` (strong random value)
- Do **not** set `USE_SQLITE=true` on VPS

Install and start:

```bash
cd /var/www/distribution-system/backend
npm ci --omit=dev
mkdir -p logs
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

Health check:

```bash
curl http://127.0.0.1:5000/api/health
```

## 3) Database setup (MySQL)

If database is empty, import schema from:

- `backend/database/full_mysql_schema.sql`
- then run migrations in `backend/database/migrations/` as needed

Ensure MySQL user can connect locally:

```sql
CREATE DATABASE IF NOT EXISTS distribution_system_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'distribution_user'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON distribution_system_db.* TO 'distribution_user'@'localhost';
FLUSH PRIVILEGES;
```

## 4) Firewall

Open API port (if accessed directly):

```bash
sudo ufw allow 5000/tcp
sudo ufw reload
```

If using Nginx on port 80/443, expose only web ports and keep Node on localhost.

## 5) Update deployment (after GitHub push)

On VPS:

```bash
cd /var/www/distribution-system
git fetch origin main
git reset --hard origin/main
cd backend
npm ci --omit=dev
pm2 restart distribution-api
pm2 logs distribution-api --lines 50
```

Or from your local machine (Windows PowerShell):

```powershell
$env:VPS_SSH_PASSWORD = 'your-vps-password'
python scripts/vps_pull_restart.py
```

Optional env overrides:

- `VPS_HOST` (default `147.93.108.205`)
- `VPS_SSH_USER` (default `adminops`)
- `VPS_REPO_DIR` (default `/var/www/distribution-system`)
- `VPS_PM2_NAME` (default `distribution-api`)

## 6) Client configuration

Point desktop/mobile server settings to VPS:

- Host: your VPS IP or domain
- Port: `5000` (or Nginx proxy port)
- Protocol: `http` or `https` (if SSL enabled)

## 7) Security checklist

- Change default admin password immediately
- Keep `.env.production` private
- Use strong `JWT_SECRET` and DB password
- Prefer HTTPS via Nginx + SSL certificate
- Restrict MySQL to localhost unless remote DB is required

## 8) Useful PM2 commands

```bash
pm2 status
pm2 logs distribution-api
pm2 restart distribution-api
pm2 stop distribution-api
```
