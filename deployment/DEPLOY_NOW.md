# 🚀 WeTalkTo Production Deployment Guide

## Quick Start (Copy & Paste)

Open your terminal and SSH into the production server:

```bash
ssh root@159.198.37.59
```

Then run these commands in order:

---

## Step 1: Upload Updated Files

From your **local machine**, upload the new files:

```bash
# Create temp directory on server
ssh root@159.198.37.59 "mkdir -p /tmp/wetalkto-updates"

# Upload server setup script
scp deployment/server-setup.sh root@159.198.37.59:/tmp/wetalkto-updates/

# Upload HTTPS nginx config
scp deployment/nginx-https.conf root@159.198.37.59:/tmp/wetalkto-updates/

# Upload updated quotes routes
scp server/routes/quotes.js root@159.198.37.59:/tmp/wetalkto-updates/
```

---

## Step 2: Apply Code Updates

SSH into server and apply updates:

```bash
ssh root@159.198.37.59

# Copy updated quotes routes
cp /tmp/wetalkto-updates/quotes.js /var/www/quoteflow/server/routes/

# Make setup script executable
chmod +x /tmp/wetalkto-updates/server-setup.sh
```

---

## Step 3: Run Database Migration

Execute the automated setup script:

```bash
cd /tmp/wetalkto-updates
./server-setup.sh
```

**This script will:**

- ✅ Create PostgreSQL database
- ✅ Generate secure passwords
- ✅ Apply database schema
- ✅ Seed with categories and quotes
- ✅ Create admin user (you'll be prompted)
- ✅ Install Certbot for SSL
- ✅ Generate SSL certificate

**Important**: Save the credentials it generates!

---

## Step 4: Deploy HTTPS Configuration

After the setup script completes:

```bash
# Copy HTTPS nginx config
cp /tmp/wetalkto-updates/nginx-https.conf /etc/nginx/sites-available/quoteflow

# Test nginx configuration
nginx -t

# If test passes, reload nginx
systemctl reload nginx
```

---

## Step 5: Verify Deployment

Test that everything works:

```bash
# Test health endpoint
curl https://wetalk.to/health
# Expected: {"status":"ok","timestamp":"..."}

# Test categories API
curl https://wetalk.to/api/categories | jq '.[0]'
# Expected: First category object

# Test new quote endpoint
curl https://wetalk.to/api/quotes/1 | jq .
# Expected: Single quote object

# Test HTTPS redirect
curl -I http://wetalk.to
# Expected: 301 redirect to https://
```

---

## Step 6: Test Data Persistence

Critical test - verify database persists after restart:

```bash
# Restart the backend
systemctl restart quoteflow

# Wait 5 seconds
sleep 5

# Check if data still exists
curl https://wetalk.to/api/categories
# Expected: Same data as before
```

**✅ Success!** If categories still load, database persistence is working!

---

## Step 7: Test Admin Login

Visit https://wetalk.to and:

1. Click "Log in"
2. Use the admin credentials from Step 3
3. Verify you can access the site

---

## Troubleshooting

### If Certbot Fails

Run manually:

```bash
certbot --nginx -d wetalk.to -d www.wetalk.to
```

### If Database Connection Fails

Check the environment file:

```bash
cat /etc/quoteflow/quoteflow.env
```

Verify `DATABASE_URL` is correct.

### Check Backend Logs

```bash
journalctl -u quoteflow -n 50 --no-pager
```

### Check Nginx Logs

```bash
tail -f /var/log/nginx/error.log
```

### Rollback to In-Memory DB

If you need to revert:

```bash
nano /etc/quoteflow/quoteflow.env
# Comment out DATABASE_URL or set USE_REAL_DB=false
systemctl restart quoteflow
```

---

## Alternative: Manual Database Setup

If the automated script fails, run these commands manually:

```bash
# 1. Create database
sudo -u postgres psql <<EOF
CREATE DATABASE quoteflow;
CREATE USER quoteflow_user WITH ENCRYPTED PASSWORD 'YOUR_SECURE_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE quoteflow TO quoteflow_user;
GRANT ALL ON SCHEMA public TO quoteflow_user;
\q
EOF

# 2. Create env file
mkdir -p /etc/quoteflow
cat > /etc/quoteflow/quoteflow.env <<EOF
NODE_ENV=production
PORT=3000
USE_REAL_DB=true
DATABASE_URL=postgresql://quoteflow_user:YOUR_SECURE_PASSWORD@localhost:5432/quoteflow
JWT_SECRET=$(openssl rand -base64 32)
EOF

# 3. Apply schema
cd /var/www/quoteflow/server
DATABASE_URL='postgresql://quoteflow_user:YOUR_PASSWORD@localhost:5432/quoteflow' \
  node apply-schema-real-db.js

# 4. Seed database
DATABASE_URL='postgresql://quoteflow_user:YOUR_PASSWORD@localhost:5432/quoteflow' \
  node seed-real-db.js

# 5. Create admin
ADMIN_EMAIL="admin@wetalk.to" \
  ADMIN_PASSWORD="your_admin_password" \
  DATABASE_URL='postgresql://quoteflow_user:YOUR_PASSWORD@localhost:5432/quoteflow' \
  node create-admin.js

# 6. Restart
systemctl restart quoteflow
```

---

## Post-Deployment Checklist

- [ ] HTTPS working (green padlock in browser)
- [ ] API endpoints responding
- [ ] Admin login successful
- [ ] Data persists after server restart
- [ ] HTTP redirects to HTTPS
- [ ] Credentials saved securely
- [ ] Certbot auto-renewal working: `certbot renew --dry-run`

---

## Next Steps

Once deployment is complete:

1. **Commit changes locally**:

   ```bash
   git add .
   git commit -m "feat: migrate to PostgreSQL and add HTTPS"
   git push
   ```

2. **Test user registration** on the live site

3. **Monitor logs** for the first 24 hours:

   ```bash
   journalctl -u quoteflow -f
   ```

4. **Set up automated backups** for PostgreSQL:
   ```bash
   # Create backup script
   sudo crontab -e
   # Add: 0 2 * * * pg_dump quoteflow > /backup/quoteflow_$(date +\%Y\%m\%d).sql
   ```

---

## Support

If you encounter issues:

1. Check logs (commands in Troubleshooting section)
2. Verify all services are running: `systemctl status quoteflow nginx postgresql`
3. Test database connection from node
4. Review the implementation plan for detailed steps

**Deployment should take 10-15 minutes total.**
