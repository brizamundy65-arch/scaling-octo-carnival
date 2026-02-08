#!/usr/bin/env bash
# WeTalkTo Production Server Setup Script
# Run this on the server: 159.198.37.59 as root user

set -euo pipefail

echo "🚀 WeTalkTo Production Server Setup"
echo "===================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Database Setup
echo -e "${YELLOW}Step 1: Database Setup${NC}"
echo "Creating PostgreSQL database and user..."

# Generate secure password
DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
JWT_SECRET=$(openssl rand -base64 32)

echo "Generated credentials (SAVE THESE SECURELY):"
echo "  DB_PASSWORD: $DB_PASSWORD"
echo "  JWT_SECRET: $JWT_SECRET"
echo ""

# Create database
sudo -u postgres psql <<EOF
CREATE DATABASE quoteflow;
CREATE USER quoteflow_user WITH ENCRYPTED PASSWORD '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE quoteflow TO quoteflow_user;
GRANT ALL ON SCHEMA public TO quoteflow_user;
\q
EOF

echo -e "${GREEN}✓ Database created${NC}"
echo ""

# Step 2: Create environment file
echo -e "${YELLOW}Step 2: Creating Environment File${NC}"

sudo mkdir -p /etc/quoteflow

sudo tee /etc/quoteflow/quoteflow.env > /dev/null <<EOF
NODE_ENV=production
PORT=3000
USE_REAL_DB=true
DATABASE_URL=postgresql://quoteflow_user:$DB_PASSWORD@localhost:5432/quoteflow
JWT_SECRET=$JWT_SECRET
EMAIL_FROM="WeTalkTo <noreply@wetalk.to>"
EOF

sudo chmod 600 /etc/quoteflow/quoteflow.env
echo -e "${GREEN}✓ Environment file created at /etc/quoteflow/quoteflow.env${NC}"
echo ""

# Step 3: Apply database schema
echo -e "${YELLOW}Step 3: Applying Database Schema${NC}"

cd /var/www/quoteflow/server || exit 1

DATABASE_URL="postgresql://quoteflow_user:$DB_PASSWORD@localhost:5432/quoteflow" \
  node apply-schema-real-db.js

echo -e "${GREEN}✓ Schema applied${NC}"
echo ""

# Step 4: Seed database
echo -e "${YELLOW}Step 4: Seeding Database${NC}"

DATABASE_URL="postgresql://quoteflow_user:$DB_PASSWORD@localhost:5432/quoteflow" \
  node seed-real-db.js

echo -e "${GREEN}✓ Database seeded${NC}"
echo ""

# Step 5: Create admin user
echo -e "${YELLOW}Step 5: Creating Admin User${NC}"

read -p "Enter admin email (default: admin@wetalk.to): " ADMIN_EMAIL
ADMIN_EMAIL=${ADMIN_EMAIL:-admin@wetalk.to}

read -sp "Enter admin password: " ADMIN_PASSWORD
echo ""

ADMIN_EMAIL="$ADMIN_EMAIL" \
  ADMIN_PASSWORD="$ADMIN_PASSWORD" \
  DATABASE_URL="postgresql://quoteflow_user:$DB_PASSWORD@localhost:5432/quoteflow" \
  node create-admin.js

echo -e "${GREEN}✓ Admin user created${NC}"
echo ""

# Step 6: Restart backend service
echo -e "${YELLOW}Step 6: Restarting Backend Service${NC}"

sudo systemctl daemon-reload
sudo systemctl restart quoteflow
sudo systemctl status quoteflow --no-pager

echo -e "${GREEN}✓ Backend restarted${NC}"
echo ""

# Step 7: Install Certbot for HTTPS
echo -e "${YELLOW}Step 7: Installing Certbot${NC}"

sudo apt update
sudo apt install -y certbot python3-certbot-nginx

echo -e "${GREEN}✓ Certbot installed${NC}"
echo ""

# Step 8: Generate SSL Certificate
echo -e "${YELLOW}Step 8: Generating SSL Certificate${NC}"
echo "Running certbot for wetalk.to..."
echo ""

sudo certbot --nginx -d wetalk.to -d www.wetalk.to --non-interactive --agree-tos --email admin@wetalk.to || {
  echo -e "${RED}⚠️  Certbot failed. You may need to run it manually:${NC}"
  echo "  sudo certbot --nginx -d wetalk.to -d www.wetalk.to"
}

echo ""

# Step 9: Update Nginx configuration
echo -e "${YELLOW}Step 9: Updating Nginx Configuration${NC}"

# Backup current config
sudo cp /etc/nginx/sites-available/quoteflow /etc/nginx/sites-available/quoteflow.backup

# The HTTPS config should be deployed via deploy.sh
echo "Deploy the updated nginx-https.conf from your local machine using deploy.sh"
echo ""

# Step 10: Test and reload nginx
echo -e "${YELLOW}Step 10: Testing Nginx${NC}"

sudo nginx -t && sudo systemctl reload nginx

echo -e "${GREEN}✓ Nginx reloaded${NC}"
echo ""

# Step 11: Set proper permissions
echo -e "${YELLOW}Step 11: Setting File Permissions${NC}"

sudo chown -R www-data:www-data /var/www/quoteflow
sudo chmod -R 755 /var/www/quoteflow

echo -e "${GREEN}✓ Permissions set${NC}"
echo ""

echo ""
echo "================================================================"
echo -e "${GREEN}✓ Setup Complete!${NC}"
echo "================================================================"
echo ""
echo "IMPORTANT - Save these credentials:"
echo "  Database Password: $DB_PASSWORD"
echo "  JWT Secret: $JWT_SECRET"
echo "  Admin Email: $ADMIN_EMAIL"
echo ""
echo "Test your deployment:"
echo "  curl https://wetalk.to/health"
echo "  curl https://wetalk.to/api/categories"
echo ""
echo "Next steps:"
echo "  1. Test website at https://wetalk.to"
echo "  2. Log in with admin credentials"
echo "  3. Restart server to verify data persists"
echo ""
