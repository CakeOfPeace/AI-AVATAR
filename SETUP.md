# AI Avatar Platform — Full Server Setup Guide

Complete guide to deploy this project on a fresh Ubuntu/Debian server from scratch.

---

## Prerequisites

- A fresh Ubuntu 22.04+ or Debian 12+ server (VPS or bare metal)
- Root or sudo access
- A domain name pointed to the server (optional but recommended for HTTPS)
- An EQUOS AI API key (get one from https://api.equos.ai)

---

## 1. System Updates

```bash
sudo apt update && sudo apt upgrade -y
```

---

## 2. Install Node.js (v20+)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

Verify:

```bash
node -v    # Should show v20.x.x
npm -v     # Should show 10.x.x
```

---

## 3. Install PostgreSQL

```bash
sudo apt install -y postgresql postgresql-contrib
```

Start and enable:

```bash
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

---

## 4. Create the Database

```bash
sudo -u postgres psql
```

Inside the PostgreSQL prompt, run:

```sql
CREATE USER avatar_admin WITH PASSWORD 'avatar_secure_2026';
CREATE DATABASE avatar_dashboard OWNER avatar_admin;
GRANT ALL PRIVILEGES ON DATABASE avatar_dashboard TO avatar_admin;
\q
```

Change the password `avatar_secure_2026` to something secure for production. If you change it, update it everywhere in step 7 below.

---

## 5. Upload the Project

Copy the project folder to the server. For example using `scp` or `rsync` from your local machine:

```bash
# From your local machine:
rsync -avz --exclude 'node_modules' --exclude 'dist' "/path/to/AI AVATAR/" root@your-server:/root/ai-avatar/
```

Or if the folder is already on the server, just `cd` into it:

```bash
cd /root/ai-avatar
```

---

## 6. Install Dependencies

```bash
cd /root/ai-avatar
npm install
```

---

## 7. Configure Environment

Edit the `.env` file in the project root:

```bash
nano .env
```

Set your values:

```env
# EQUOS AI API Key (required — get from https://api.equos.ai)
EQUOS_API_KEY=sk_your_equos_api_key_here

# Demo page password (for /demo/firuzeh)
DEMO_PASSWORD=Firuzeh@2026
```

Edit `ecosystem.config.cjs` to set your database credentials and a secure JWT secret:

```bash
nano ecosystem.config.cjs
```

Update these values:

```js
env: {
  NODE_ENV: 'production',
  PORT: 5173,
  DATABASE_URL: 'postgresql://avatar_admin:avatar_secure_2026@localhost:5432/avatar_dashboard',
  JWT_SECRET: 'change-this-to-a-long-random-string'
}
```

**Important:** Change `JWT_SECRET` to a long random string. You can generate one with:

```bash
openssl rand -hex 32
```

---

## 8. Run Database Migrations

This creates all the required tables:

```bash
cd /root/ai-avatar

for f in migrations/*.sql; do
  echo "Running $f..."
  psql postgresql://avatar_admin:avatar_secure_2026@localhost:5432/avatar_dashboard -f "$f"
done
```

Replace the connection string if you changed the password in step 4.

You should see `CREATE TABLE`, `ALTER TABLE`, etc. with no errors.

---

## 9. Build the Frontend

```bash
npm run build
```

This creates the `dist/` folder with the production frontend.

---

## 10. Install PM2 (Process Manager)

```bash
sudo npm install -g pm2
```

---

## 11. Start the Application

```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

The last command (`pm2 startup`) prints a command you need to copy and run — it ensures PM2 restarts your app after a server reboot.

Verify it's running:

```bash
pm2 status
```

You should see `avatar-dashboard` with status `online`.

Test it:

```bash
curl http://localhost:5173
```

---

## 12. Set Up Nginx (Reverse Proxy + HTTPS)

Install Nginx:

```bash
sudo apt install -y nginx
```

Create a config file:

```bash
sudo nano /etc/nginx/sites-available/avatar
```

Paste this (replace `yourdomain.com` with your actual domain):

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Required for large avatar image uploads
        client_max_body_size 50M;
    }
}
```

Enable the site and restart Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/avatar /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

---

## 13. Set Up SSL with Let's Encrypt (HTTPS)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

Follow the prompts. Certbot will automatically configure Nginx for HTTPS and set up auto-renewal.

---

## 14. Firewall (Optional but Recommended)

```bash
sudo ufw allow 22      # SSH
sudo ufw allow 80      # HTTP
sudo ufw allow 443     # HTTPS
sudo ufw enable
```

---

## 15. Verify Everything Works

Open your browser and go to:

| URL | What it does |
|-----|-------------|
| `https://yourdomain.com` | Dashboard (redirects to login) |
| `https://yourdomain.com/login` | Login / Register |
| `https://yourdomain.com/demo/firuzeh` | Firuzeh restaurant demo (password-protected) |
| `https://yourdomain.com/api-docs` | API documentation page |

The **first user to register** automatically becomes the **admin**. All subsequent users get the `free` tier.

---

## Quick Reference — Common Commands

```bash
# View app status
pm2 status

# View live logs
pm2 logs avatar-dashboard

# Restart after code changes
npm run build && pm2 restart avatar-dashboard

# Full redeploy (build + restart)
bash deploy.sh

# Stop the app
pm2 stop avatar-dashboard

# Run a migration
psql postgresql://avatar_admin:avatar_secure_2026@localhost:5432/avatar_dashboard -f migrations/015_external_user_tracking.sql
```

---

## Project Structure

```
ai-avatar/
├── server/                   # Express backend (Node.js)
│   ├── index.cjs             # Main server entry point
│   ├── db.cjs                # PostgreSQL connection
│   ├── lib/
│   │   ├── equosClient.cjs   # EQUOS AI API client
│   │   └── apiKeys.cjs       # API key generation
│   ├── middleware/
│   │   ├── auth.cjs          # JWT authentication
│   │   └── externalAuth.cjs  # API key authentication
│   └── routes/
│       ├── auth.cjs          # Login, register, profile
│       ├── equos.cjs         # Internal EQUOS API (dashboard)
│       ├── external.cjs      # External API (/api/v1 — for developers)
│       ├── avatars.cjs       # Avatar management
│       ├── admin.cjs         # Admin panel endpoints
│       ├── apikeys.cjs       # API key management
│       └── demo.cjs          # Demo session endpoints
├── src/                      # React frontend (Vite)
│   ├── main.jsx              # App entry + routing
│   ├── index.css             # Tailwind + global styles
│   ├── components/
│   │   ├── layout/           # DashboardLayout, Sidebar, Header
│   │   └── ui/               # Radix UI primitives
│   ├── hooks/
│   │   ├── useApi.js         # REST API hooks
│   │   ├── useAuth.js        # Auth state
│   │   └── useEquos.js       # EQUOS session hooks
│   ├── data/
│   │   └── equos.js          # Voices, providers config
│   └── pages/
│       ├── Dashboard.jsx
│       ├── CreateAvatar.jsx
│       ├── MyAvatars.jsx
│       ├── EquosCall.jsx     # Live avatar call (LiveKit)
│       ├── FiruzehDemo.jsx   # Restaurant demo page
│       ├── AuthPage.jsx
│       ├── ApiDocs.jsx
│       ├── ApiKeys.jsx
│       ├── SessionsHistory.jsx
│       ├── Settings.jsx
│       └── admin/            # Admin pages
├── migrations/               # PostgreSQL migration SQL files
├── dist/                     # Built frontend (after npm run build)
├── .env                      # Environment variables
├── ecosystem.config.cjs      # PM2 config
├── deploy.sh                 # Build + restart script
├── package.json
└── SETUP.md                  # This file
```

---

## Troubleshooting

**App won't start / crashes immediately:**
```bash
pm2 logs avatar-dashboard --lines 50
```
Usually a missing env var (`EQUOS_API_KEY`, `DATABASE_URL`) or DB connection issue.

**Database connection refused:**
```bash
sudo systemctl status postgresql
```
Make sure PostgreSQL is running and the user/password/database match.

**Port 5173 already in use:**
```bash
lsof -i :5173
```
Kill the existing process or change the port in `ecosystem.config.cjs`.

**Migrations fail with "role does not exist":**
Make sure you created the database user in step 4 before running migrations.

**"Cannot find module" errors:**
Run `npm install` again — `node_modules` may be missing or incomplete.
