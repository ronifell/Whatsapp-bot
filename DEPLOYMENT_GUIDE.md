# VPS Deployment Guide via SSH and GitHub

This guide provides detailed instructions for deploying the CotaFácil Automação backend to a VPS using SSH and GitHub.

## 📋 Prerequisites

### On your local computer:
- Git installed
- SSH configured
- Access to the project's GitHub repository

### On the VPS:
- Ubuntu/Debian (recommended) or another Linux distribution
- Root access or user with sudo
- VPS public IP
- Port 22 (SSH) open in the firewall

## 🔐 Step 1: Configure SSH

### 1.1 Generate SSH key (if you don't have one)

On your local computer (Windows PowerShell):

```powershell
# Generate SSH key
ssh-keygen -t ed25519 -C "your-email@example.com"

# Press Enter to accept the default location
# Set a password (optional, but recommended)
```

### 1.2 Copy public key to VPS

```powershell
# Copy public key to VPS
# Replace 'root' with your user and 'YOUR_VPS_IP' with the server IP
type $env:USERPROFILE\.ssh\id_ed25519.pub | ssh root@YOUR_VPS_IP "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"
```

Or manually:
1. Copy the contents of `C:\Users\YourUser\.ssh\id_ed25519.pub`
2. Connect to VPS: `ssh root@YOUR_VPS_IP`
3. Execute:
   ```bash
   mkdir -p ~/.ssh
   nano ~/.ssh/authorized_keys
   # Paste the public key and save (Ctrl+X, Y, Enter)
   chmod 600 ~/.ssh/authorized_keys
   chmod 700 ~/.ssh
   ```

### 1.3 Test SSH connection

```powershell
ssh root@YOUR_VPS_IP
```

## 🖥️ Step 2: Prepare the VPS

### 2.1 Update the system

```bash
# Connect to VPS
ssh root@YOUR_VPS_IP

# Update packages
apt update && apt upgrade -y
```

### 2.2 Install Node.js (version 18 or higher)

```bash
# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Verify installation
node --version  # Should show v18.x or higher
npm --version
```

### 2.3 Install Git

```bash
apt install -y git
```

### 2.4 Install PM2 (process manager)

```bash
npm install -g pm2
```

### 2.5 Install system dependencies for Playwright

```bash
# Install dependencies required for Playwright/Chromium
apt install -y \
    wget \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    lsb-release \
    xdg-utils
```

### 2.6 Configure Firewall (UFW)

```bash
# Install UFW if not installed
apt install -y ufw

# Allow SSH
ufw allow 22/tcp

# Allow application port (3000)
ufw allow 3000/tcp

# If using HTTPS, allow port 443
ufw allow 443/tcp

# Enable firewall
ufw enable

# Check status
ufw status
```

## 📦 Step 3: Configure GitHub Repository

### 3.1 Create repository on GitHub (if you don't have one)

1. Go to https://github.com
2. Create a new repository
3. **DO NOT** initialize with README (if the project already exists locally)

### 3.2 Push local code to GitHub

On your local computer:

```powershell
# Navigate to project directory
cd "E:\E disk\Ronifell Data\My projects\Amanda\cotafacil-automacao"

# Check Git status
git status

# If not a Git repository yet, initialize:
git init
git add .
git commit -m "Initial commit"

# Add remote repository (replace with your repository URL)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git

# Push
git branch -M main
git push -u origin main
```

**⚠️ IMPORTANT:** Make sure the `.env` file is in `.gitignore` to avoid exposing credentials!

## 🚀 Step 4: Deploy to VPS

### 4.1 Create application directory

```bash
# On VPS
mkdir -p /var/www/cotafacil-automacao
cd /var/www/cotafacil-automacao
```

### 4.2 Clone repository

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git .

# Or if using SSH (recommended):
# git clone git@github.com:YOUR_USERNAME/YOUR_REPOSITORY.git .
```

### 4.3 Install dependencies

```bash
cd /var/www/cotafacil-automacao
npm install --production
```

### 4.4 Install Playwright browsers

```bash
npx playwright install chromium
npx playwright install-deps chromium
```

### 4.5 Configure environment variables

```bash
# Create .env file
nano .env
```

Paste the following content and adjust with your credentials:

```env
# Z-API Configuration
ZAPI_INSTANCE_ID=your_instance_id
ZAPI_TOKEN=your_token
ZAPI_CLIENT_TOKEN=your_client_token
ZAPI_BASE_URL=https://api.z-api.io

# WhatsApp
WHATSAPP_NUMBER=5511999999999
ADMIN_WHATSAPP=5511999999999

# Canopus
CANOPUS_URL=https://your-canopus-url.com
CANOPUS_USERNAME=your_username
CANOPUS_PASSWORD=your_password

# OpenAI
OPENAI_API_KEY=sk-your-openai-key

# Server
PORT=3000
NODE_ENV=production

# Webhook URL (replace with your VPS IP/domain)
WEBHOOK_URL=http://YOUR_VPS_IP:3000/webhook

# Quotation Mode
QUOTATION_MODE=pre-scraped
```

Save the file (Ctrl+X, Y, Enter).

### 4.6 Test the application manually

```bash
# Test if it starts correctly
npm start

# If it works, press Ctrl+C to stop
```

## 🔄 Step 5: Configure PM2 for Process Management

### 5.1 Start application with PM2

```bash
cd /var/www/cotafacil-automacao

# Start application
pm2 start src/index.js --name cotafacil-automacao

# Save PM2 configuration
pm2 save

# Configure PM2 to start automatically on boot
pm2 startup
# Execute the command that appears (something like: sudo env PATH=...)
```

### 5.2 Useful PM2 commands

```bash
# View status
pm2 status

# View logs
pm2 logs cotafacil-automacao

# View logs in real-time
pm2 logs cotafacil-automacao --lines 50

# Restart application
pm2 restart cotafacil-automacao

# Stop application
pm2 stop cotafacil-automacao

# Delete application from PM2
pm2 delete cotafacil-automacao

# Monitor resources
pm2 monit
```

## 🔄 Step 6: Automated Deploy Script

Create a script to facilitate future deploys:

```bash
# Create deploy script
nano /var/www/cotafacil-automacao/deploy.sh
```

Paste the following content:

```bash
#!/bin/bash

# Deploy Script for CotaFácil Automação
# Usage: ./deploy.sh

set -e  # Stop on error

echo "🚀 Starting deploy..."

# Go to application directory
cd /var/www/cotafacil-automacao

# Backup .env
if [ -f .env ]; then
    cp .env .env.backup
    echo "✅ .env backup created"
fi

# Update code from GitHub
echo "📥 Updating code from GitHub..."
git fetch origin
git reset --hard origin/main

# Restore .env
if [ -f .env.backup ]; then
    mv .env.backup .env
    echo "✅ .env restored"
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install --production

# Install Playwright browsers (if needed)
echo "🌐 Checking Playwright browsers..."
npx playwright install chromium || true

# Restart application with PM2
echo "🔄 Restarting application..."
pm2 restart cotafacil-automacao

echo "✅ Deploy completed!"
echo "📊 Status:"
pm2 status

echo "📋 Recent logs:"
pm2 logs cotafacil-automacao --lines 20 --nostream
```

Make the script executable:

```bash
chmod +x /var/www/cotafacil-automacao/deploy.sh
```

### Use the deploy script:

```bash
cd /var/www/cotafacil-automacao
./deploy.sh
```

## 🌐 Step 7: Configure Nginx as Reverse Proxy (Optional but Recommended)

### 7.1 Install Nginx

```bash
apt install -y nginx
```

### 7.2 Configure Nginx

```bash
# Create configuration
nano /etc/nginx/sites-available/cotafacil-automacao
```

Paste the following content (adjust the `server_name`):

```nginx
server {
    listen 80;
    server_name YOUR_DOMAIN.com or YOUR_VPS_IP;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeout for SSE
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }
}
```

Enable the site:

```bash
# Create symbolic link
ln -s /etc/nginx/sites-available/cotafacil-automacao /etc/nginx/sites-enabled/

# Test configuration
nginx -t

# Restart Nginx
systemctl restart nginx

# Enable Nginx on boot
systemctl enable nginx
```

### 7.3 Update firewall

```bash
# Allow HTTP and HTTPS
ufw allow 80/tcp
ufw allow 443/tcp
```

### 7.4 Update WEBHOOK_URL in .env

```bash
nano /var/www/cotafacil-automacao/.env
```

Change `WEBHOOK_URL` to:
```env
WEBHOOK_URL=http://YOUR_DOMAIN.com/webhook
# or
WEBHOOK_URL=http://YOUR_VPS_IP/webhook
```

Restart the application:
```bash
pm2 restart cotafacil-automacao
```

## 🔒 Step 8: Configure SSL with Let's Encrypt (Optional but Recommended)

If you have a domain pointing to the VPS:

```bash
# Install Certbot
apt install -y certbot python3-certbot-nginx

# Get SSL certificate
certbot --nginx -d YOUR_DOMAIN.com

# Certbot will automatically configure Nginx for HTTPS
```

## 📝 Step 9: Verification and Testing

### 9.1 Verify application is running

```bash
# Check PM2 status
pm2 status

# Check logs
pm2 logs cotafacil-automacao --lines 50

# Test health check endpoint
curl http://localhost:3000/
# or if using Nginx:
curl http://YOUR_VPS_IP/
```

### 9.2 Test webhook

```bash
# Test webhook locally
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -d '{"phone":"5511999999999","message":"test"}'
```

## 🔄 Step 10: Future Deploys

To deploy future updates:

### Option 1: Using the deploy script

```bash
ssh root@YOUR_VPS_IP
cd /var/www/cotafacil-automacao
./deploy.sh
```

### Option 2: Manually

```bash
ssh root@YOUR_VPS_IP
cd /var/www/cotafacil-automacao
git pull origin main
npm install --production
pm2 restart cotafacil-automacao
```

## 🐳 Alternative: Deploy with Docker

If you prefer to use Docker:

### 10.1 Install Docker and Docker Compose

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
apt install -y docker-compose-plugin

# Add user to docker group (if not root)
usermod -aG docker $USER
```

### 10.2 Deploy with Docker

```bash
cd /var/www/cotafacil-automacao

# Create .env (if you don't have it yet)
nano .env

# Start with Docker Compose
docker compose up -d

# View logs
docker compose logs -f

# Stop
docker compose down
```

## 🔍 Troubleshooting

### Application won't start

```bash
# Check PM2 logs
pm2 logs cotafacil-automacao

# Check environment variables
cd /var/www/cotafacil-automacao
cat .env

# Test manually
npm start
```

### Port already in use

```bash
# Check which process is using port 3000
lsof -i :3000
# or
netstat -tulpn | grep 3000

# Kill process if necessary
kill -9 PROCESS_PID
```

### Playwright not working

```bash
# Reinstall browsers
cd /var/www/cotafacil-automacao
npx playwright install chromium
npx playwright install-deps chromium
```

### Permission issues

```bash
# Adjust directory permissions
chown -R $USER:$USER /var/www/cotafacil-automacao
chmod -R 755 /var/www/cotafacil-automacao
```

## 📚 Additional Resources

- [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Playwright Documentation](https://playwright.dev/docs/intro)

## ✅ Deployment Checklist

- [ ] SSH configured and tested
- [ ] Node.js 18+ installed
- [ ] Git installed
- [ ] PM2 installed
- [ ] Repository cloned on VPS
- [ ] Dependencies installed (`npm install`)
- [ ] Playwright browsers installed
- [ ] `.env` file configured with all credentials
- [ ] Application tested manually
- [ ] PM2 configured and application running
- [ ] PM2 configured to start on boot
- [ ] Firewall configured
- [ ] Nginx configured (optional)
- [ ] SSL configured (optional, if you have a domain)
- [ ] Webhook URL updated in Z-API
- [ ] Health check working
- [ ] Deploy script created and tested

---

**Done!** Your application should be running on the VPS. 🎉

For support, check the logs with `pm2 logs cotafacil-automacao`.
