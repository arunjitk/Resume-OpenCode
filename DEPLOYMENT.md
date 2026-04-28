# Resume Website Deployment Guide

## Architecture Overview

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Your Computer  │────▶│  GitHub Actions  │────▶│  Hostinger VPS  │
│  (Development)  │     │  (CI/CD Pipeline)│     │  (Production)   │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                                          │
                    ┌─────────────────────────────────────┘
                    ▼
            ┌──────────────┐
            │   Traefik    │ ◀── Reverse Proxy (n8n-traefik-1)
            │   (Docker)   │     Routes: arunjitk.org → resume-app
            └──────────────┘
                    │
                    ▼
            ┌──────────────┐
            │  Resume App  │ ◀── Node.js + Express + Static Files
            │   (Docker)   │     Container: resume-app
            └──────────────┘
```

## How Code Changes Flow to Production

### Method 1: Automatic GitHub Actions Deployment (Recommended)

1. **Make changes locally** on your development machine
2. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Your changes"
   git push origin main
   ```
3. **GitHub Actions automatically:**
   - SSH into your VPS
   - Pulls latest code to `/root/Resume-OpenCode`
   - Rebuilds Docker container
   - Restarts the application
   - Runs health checks

### Method 2: Manual Deployment on VPS

If GitHub Actions fails or you need to deploy manually:

```bash
# Option A: Use the deployment script
/docker/resume/deploy.sh

# Option B: Manual steps
cd /root/Resume-OpenCode
git pull origin main
cd /docker/resume
docker compose down
docker compose build --no-cache
docker compose up -d
```

## File Locations

| Purpose | Path |
|---------|------|
| Website code | `/root/Resume-OpenCode/` |
| Docker Compose | `/docker/resume/docker-compose.yml` |
| Deployment script | `/docker/resume/deploy.sh` |
| Environment variables | `/root/Resume-OpenCode/.env` |
| Traefik config | `/docker/n8n/docker-compose.yml` |

## Useful Commands

### Check Status
```bash
# Check if container is running
docker ps | grep resume

# View logs
docker logs resume-app --tail 50

# Check website health
curl -I https://arunjitk.org
```

### Restart/Update
```bash
# Quick restart (no rebuild)
cd /docker/resume && docker compose restart

# Full rebuild and deploy
/docker/resume/deploy.sh
```

### Troubleshooting
```bash
# Check Traefik can reach resume container
docker exec n8n-traefik-1 wget -qO- http://resume-app:3000

# Check networks
docker network inspect traefik

# View all logs
docker logs resume-app -f
```

## GitHub Actions Configuration

Required Secrets (set in GitHub repo Settings → Secrets):
- `VPS_IP` - Your VPS IP address
- `VPS_USER` - SSH username (usually 'root')
- `SSH_PRIVATE_KEY` - Your SSH private key

## Important Notes

1. **Traefik Network**: The resume container and Traefik must be on the same Docker network (`traefik`). This was already configured.

2. **Environment Variables**: Make sure `/root/Resume-OpenCode/.env` exists with your secrets:
   ```
   PORT=3000
   RESEND_API_KEY=your_key
   TELEGRAM_BOT_TOKEN=your_token
   TELEGRAM_CHAT_ID=your_chat_id
   ```

3. **SSL Certificates**: Traefik automatically handles SSL certificates via Let's Encrypt.

4. **Zero Downtime**: Docker Compose stops the old container only after the new one is ready.

## Testing After Deployment

```bash
# Test locally on VPS
curl http://127.0.0.1:3000

# Test via HTTPS
curl https://arunjitk.org

# Check all pages
curl https://arunjitk.org/attack-sim.html
curl https://arunjitk.org/malware-simulation.html
curl https://arunjitk.org/ransomware-simulation.html
```
