# Resume Website Deployment Workflow

## Overview

This document describes how code changes flow from your local development machine to the production VPS.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  LOCAL DEVELOPMENT                                                │
│  1. Edit code on your machine                                    │
│  2. git add . && git commit -m "changes"                         │
│  3. git push origin main                                         │
└──────────────────┬──────────────────────────────────────────────┘
                   │
                   │ Git Push
                   ▼
┌─────────────────────────────────────────────────────────────────┐
│  GITHUB ACTIONS (Automatic CI/CD)                                │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ 1. Triggered on push to main branch                          ││
│  │ 2. SSH into VPS using secrets (VPS_IP, VPS_USER, SSH_KEY)    ││
│  │ 3. Pull latest code to /root/Resume-OpenCode                 ││
│  │ 4. Build new Docker image with --no-cache                    ││
│  │ 5. Stop old container and start new one                      ││
│  │ 6. Run health checks (verify container running)              ││
│  │ 7. Clean up old Docker images                                ││
│  └─────────────────────────────────────────────────────────────┘│
└──────────────────┬──────────────────────────────────────────────┘
                   │
                   │ Docker Container
                   ▼
┌─────────────────────────────────────────────────────────────────┐
│  VPS (Hostinger) - Production Environment                        │
│                                                                  │
│  ┌─────────────┐     ┌──────────────┐     ┌─────────────────┐   │
│  │  Traefik    │────▶│  Resume App  │────▶│  Website Live   │   │
│  │  (Reverse   │     │  (Docker     │     │  at arunjitk.org│   │
│  │   Proxy)    │     │   Container) │     │                 │   │
│  │             │     │              │     │                 │   │
│  │ Container:  │     │ Container:   │     │ Serves:         │   │
│  │ n8n-traefik-1    │ resume-app   │     │ - index.html    │   │
│  │             │     │              │     │ - attack-sim    │   │
│  │ Routes:     │     │ Port: 3000   │     │ - simulations   │   │
│  │ arunjitk.org│◄────│ Network:     │     │ - API routes    │   │
│  │ → port 3000 │     │ traefik      │     │                 │   │
│  └─────────────┘     └──────────────┘     └─────────────────┘   │
│         │                                                        │
│         │ SSL/TLS Termination                                    │
│         ▼                                                        │
│  https://arunjitk.org (Let's Encrypt Auto SSL)                   │
└─────────────────────────────────────────────────────────────────┘
```

## Deployment Methods

### Method 1: Automatic Deployment via GitHub (Recommended)

When you push code to GitHub, it automatically deploys to production.

```bash
# Step 1: Make changes on your local machine
# Edit files...

# Step 2: Stage changes
git add .

# Step 3: Commit with a descriptive message
git commit -m "feat: add new feature or fix bug"

# Step 4: Push to main branch
git push origin main

# Step 5: Watch deployment at:
# https://github.com/arunjitk/Resume-OpenCode/actions
```

### Method 2: Manual Deployment on VPS

If GitHub Actions fails or you need to deploy directly:

```bash
# SSH into your VPS
ssh root@your-vps-ip

# Option A: Use the deployment script (recommended)
/docker/resume/deploy.sh

# Option B: Manual commands
cd /root/Resume-OpenCode
git pull origin main
cd /docker/resume
docker compose down
docker compose build --no-cache
docker compose up -d
```

## File Locations

| Purpose | Path on VPS |
|---------|-------------|
| Website source code | `/root/Resume-OpenCode/` |
| Docker Compose config | `/docker/resume/docker-compose.yml` |
| Deployment script | `/docker/resume/deploy.sh` |
| Environment variables | `/root/Resume-OpenCode/.env` |
| Traefik reverse proxy | `/docker/n8n/docker-compose.yml` |
| Container data | Docker volumes (persistent) |

## What Happens During Deployment

### 1. GitHub Actions Workflow (`.github/workflows/deploy.yml`)

```yaml
Trigger: Push to main branch
↓
Checkout code
↓
SSH to VPS (using secrets: VPS_IP, VPS_USER, SSH_PRIVATE_KEY)
↓
Execute deployment script on VPS:
  - git fetch origin main
  - git reset --hard origin/main
  - docker compose down
  - docker compose build --no-cache
  - docker compose up -d
  - Verify container is running
  - Cleanup old images
↓
Notify success/failure
```

### 2. Docker Build Process (`Dockerfile`)

```dockerfile
Stage 1: Builder
  - Uses node:20-alpine
  - Installs npm dependencies
  - Builds frontend with Vite (creates dist/ folder)
  - Copies malware-simulation.html and ransomware-simulation.html to dist/

Stage 2: Runtime
  - Uses clean node:20-alpine
  - Copies production dependencies only
  - Copies built dist/ folder
  - Copies js/, css/, ResumePDF/ directories
  - Copies server.js
  - Exposes port 3000
  - Runs: node server.js
```

### 3. Container Startup (`docker-compose.yml`)

```yaml
Services:
  resume:
    - Build from /root/Resume-OpenCode/Dockerfile
    - Port mapping: 127.0.0.1:3000 -> container:3000
    - Environment: NODE_ENV=production
    - Labels for Traefik routing:
        * Route: Host(`arunjitk.org`)
        * Enable TLS/HTTPS
        * Redirect HTTP to HTTPS
    - Network: traefik (shared with Traefik)
    - Health check: wget http://localhost:3000/
```

## Network Architecture

```
Internet
    │
    ▼
┌──────────────┐
│   Port 80    │ ◀── HTTP requests
│   Port 443   │ ◀── HTTPS requests
└──────┬───────┘
       │
       ▼
┌─────────────────────────┐
│   n8n-traefik-1         │ ◀── Traefik reverse proxy
│   (Docker Container)    │     - SSL termination
│   Networks:             │     - Route matching
│     - n8n_default       │     - Load balancing
│     - traefik           │
└──────┬──────────────────┘
       │
       │ Routes to: arunjitk.org
       ▼
┌─────────────────────────┐
│   resume-app            │ ◀── Your website
│   (Docker Container)    │     - Node.js + Express
│   Port: 3000            │     - Serves static files
│   Network: traefik      │     - API endpoints
└─────────────────────────┘
```

## Environment Variables

The `.env` file at `/root/Resume-OpenCode/.env` contains:

```bash
PORT=3000
RESEND_API_KEY=           # For email notifications
RESEND_FROM_EMAIL=        # Sender email address
TELEGRAM_BOT_TOKEN=       # For Telegram notifications
TELEGRAM_CHAT_ID=         # Your Telegram chat ID
```

## Useful Commands

### Check Status
```bash
# Check if container is running
docker ps | grep resume

# View container logs
docker logs resume-app --tail 50

# Follow logs in real-time
docker logs resume-app -f

# Check website health
curl -I https://arunjitk.org
```

### Restart/Redeploy
```bash
# Quick restart (no rebuild)
cd /docker/resume && docker compose restart

# Full rebuild and deploy
/docker/resume/deploy.sh

# Or manually:
cd /docker/resume
docker compose down
docker compose up -d --build
```

### Troubleshooting
```bash
# Check if Traefik can reach resume
docker exec n8n-traefik-1 wget -qO- http://resume-app:3000

# Check container network
docker network inspect traefik

# Test locally on VPS
curl http://127.0.0.1:3000

# View Traefik logs
docker logs n8n-traefik-1 --tail 50

# Reconnect Traefik to network (if needed)
docker network connect traefik n8n-traefik-1
```

## SSL/HTTPS

Traefik automatically handles SSL certificates via Let's Encrypt:
- No manual certificate management needed
- Auto-renews before expiration
- Forces HTTPS redirect

## Health Checks

The container includes health checks that:
- Test if the website responds on port 3000
- Mark container as unhealthy if checks fail
- Docker can auto-restart unhealthy containers

## Zero Downtime Deployment

The deployment process ensures:
1. New container starts before old one stops
2. Traefik routes traffic only to healthy containers
3. No dropped connections during deployment

## GitHub Actions Required Secrets

Set these in your GitHub repository (Settings → Secrets):

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `VPS_IP` | Your VPS IP address | `203.0.113.1` |
| `VPS_USER` | SSH username | `root` |
| `SSH_PRIVATE_KEY` | Your SSH private key | `-----BEGIN OPENSSH PRIVATE KEY-----...` |

## Testing Deployment

After pushing changes:

1. Check GitHub Actions: https://github.com/arunjitk/Resume-OpenCode/actions
2. Verify on VPS: `docker ps | grep resume`
3. Test website: `curl https://arunjitk.org`
4. Test all pages:
   - https://arunjitk.org/
   - https://arunjitk.org/attack-sim.html
   - https://arunjitk.org/malware-simulation.html
   - https://arunjitk.org/ransomware-simulation.html

## Rollback

If a deployment fails:

```bash
# SSH into VPS
cd /root/Resume-OpenCode

# Rollback to previous commit
git log --oneline -5          # Find good commit
git reset --hard <commit-id>  # Rollback

# Redeploy
cd /docker/resume
docker compose down
docker compose up -d --build
```

## Summary

| Action | Command |
|--------|---------|
| Deploy changes | `git push origin main` |
| Manual deploy | `/docker/resume/deploy.sh` |
| Check status | `docker ps \| grep resume` |
| View logs | `docker logs resume-app` |
| Restart | `docker compose restart` |
| Full rebuild | `docker compose up -d --build` |
