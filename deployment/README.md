# Deployment Instructions

## 1. Prerequisites
- Ubuntu Server (or similar Linux distro)
- Node.js & npm
- Nginx
- PostgreSQL

## Optional: Deploy Script Config
If you use `deploy.sh`, create `deployment/deploy.env` from `deployment/deploy.env.example` (keep it out of git).

## 2. Database Setup
```bash
sudo -u postgres psql
CREATE DATABASE quoteflow;
CREATE USER quoteflow_user WITH ENCRYPTED PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE quoteflow TO quoteflow_user;
\q
```
*Note: Update the `DATABASE_URL` in `.env` or systemd service file.*

## 3. Application Setup
1. Clone the repository to `/var/www/quoteflow`.
2. Install server dependencies:
   ```bash
   cd /var/www/quoteflow/server
   npm install --production
   ```
3. Build frontend:
   ```bash
   cd /var/www/quoteflow
   npm install
   npm run build
   ```

## 4. Systemd Service
1. Copy `deployment/quoteflow.service` to `/etc/systemd/system/`.
2. Create `/etc/quoteflow/quoteflow.env` from `deployment/quoteflow.env.example` (store secrets there, not in git).
3. Enable and start the service:
   ```bash
   sudo systemctl enable quoteflow
   sudo systemctl start quoteflow
   ```

## 5. Nginx Setup
1. Copy `deployment/nginx.conf` to `/etc/nginx/sites-available/quoteflow`.
2. Enable the site:
   ```bash
   sudo ln -s /etc/nginx/sites-available/quoteflow /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

## 7. Seed the Real Database (recommended)
If you run with `USE_REAL_DB=true`, seed quotes/categories into Postgres:
```bash
cd /var/www/quoteflow/server
DATABASE_URL='postgresql://quoteflow_user:secure_password@localhost:5432/quoteflow' node apply-schema-real-db.js
DATABASE_URL='postgresql://quoteflow_user:secure_password@localhost:5432/quoteflow' node seed-real-db.js
```

## 6. Firewall (UFW)
```bash
sudo ufw allow 'Nginx Full'
sudo ufw allow ssh
sudo ufw enable
```
