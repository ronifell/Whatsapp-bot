# Deploy Quick Reference - CotaFácil Automação

## 🚀 Quick Deploy (First Time)

### 1. On VPS - Initial Setup

```bash
# Update system
apt update && apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs git

# Install PM2
npm install -g pm2

# Install Playwright dependencies
apt install -y wget ca-certificates fonts-liberation libappindicator3-1 \
    libasound2 libatk-bridge2.0-0 libatk1.0-0 libc6 libcairo2 libcups2 \
    libdbus-1-3 libexpat1 libfontconfig1 libgbm1 libgcc1 libglib2.0-0 \
    libgtk-3-0 libnspr4 libnss3 libpango-1.0-0 libpangocairo-1.0-0 \
    libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 \
    libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 \
    libxtst6 lsb-release xdg-utils

# Configure firewall
ufw allow 22/tcp
ufw allow 3000/tcp
ufw enable
```

### 2. Clone and Configure

```bash
# Create directory and clone
mkdir -p /var/www/cotafacil-automacao
cd /var/www/cotafacil-automacao
git clone https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git .

# Install dependencies
npm install --production
npx playwright install chromium

# Create .env
nano .env
# (Paste your environment variables)
```

### 3. Start with PM2

```bash
# Make script executable
chmod +x deploy.sh

# Run deploy
./deploy.sh

# Or manually:
pm2 start src/index.js --name cotafacil-automacao
pm2 save
pm2 startup  # Follow the displayed instructions
```

## 🔄 Deploy Updates

### Option 1: Using Script

```bash
ssh root@YOUR_VPS_IP
cd /var/www/cotafacil-automacao
./deploy.sh
```

### Option 2: Manual

```bash
ssh root@YOUR_VPS_IP
cd /var/www/cotafacil-automacao
git pull origin main
npm install --production
pm2 restart cotafacil-automacao
```

## 📋 Useful PM2 Commands

```bash
# Status
pm2 status

# Logs
pm2 logs cotafacil-automacao
pm2 logs cotafacil-automacao --lines 50

# Restart
pm2 restart cotafacil-automacao

# Stop
pm2 stop cotafacil-automacao

# Monitor
pm2 monit

# Delete
pm2 delete cotafacil-automacao
```

## 🔍 Quick Troubleshooting

```bash
# Application won't start?
pm2 logs cotafacil-automacao

# Port in use?
lsof -i :3000
netstat -tulpn | grep 3000

# Playwright not working?
npx playwright install chromium
npx playwright install-deps chromium

# Check environment variables
cat .env
```

## ✅ Deployment Checklist

- [ ] Node.js 18+ installed
- [ ] Git installed
- [ ] PM2 installed
- [ ] Repository cloned
- [ ] Dependencies installed (`npm install`)
- [ ] Chromium installed (`npx playwright install chromium`)
- [ ] `.env` file configured
- [ ] Application running on PM2
- [ ] PM2 configured to start on boot
- [ ] Firewall configured
- [ ] Health check working (`curl http://localhost:3000/`)

## 📝 Required Environment Variables

```env
# Z-API
ZAPI_INSTANCE_ID=
ZAPI_TOKEN=
ZAPI_BASE_URL=https://api.z-api.io

# WhatsApp
WHATSAPP_NUMBER=
ADMIN_WHATSAPP=

# Canopus
CANOPUS_URL=
CANOPUS_USERNAME=
CANOPUS_PASSWORD=

# OpenAI
OPENAI_API_KEY=

# Server
PORT=3000
NODE_ENV=production
WEBHOOK_URL=http://YOUR_VPS_IP:3000/webhook

# Quotation
QUOTATION_MODE=pre-scraped
```

## 🌐 Nginx (Optional)

```bash
# Install
apt install -y nginx

# Configure
nano /etc/nginx/sites-available/cotafacil-automacao
# (See DEPLOYMENT_GUIDE.md for complete configuration)

# Enable
ln -s /etc/nginx/sites-available/cotafacil-automacao /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

## 🔒 SSL with Let's Encrypt (Optional)

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d YOUR_DOMAIN.com
```

---

**For detailed instructions, see:** `DEPLOYMENT_GUIDE.md`
