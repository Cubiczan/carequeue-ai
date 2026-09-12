# Deployment Guide

Complete guide for deploying Battery ERP to production.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Docker Deployment](#docker-deployment)
- [Kubernetes Deployment](#kubernetes-deployment)
- [Manual Deployment](#manual-deployment)
- [Post-Deployment](#post-deployment)
- [Monitoring](#monitoring)
- [Backup & Recovery](#backup--recovery)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Hardware Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| CPU | 4 cores | 8+ cores |
| RAM | 8 GB | 16+ GB |
| Storage | 50 GB SSD | 200+ GB SSD |
| Network | 100 Mbps | 1 Gbps |

### Software Requirements

- Docker 20.10+ and Docker Compose 2.0+
- OR Kubernetes cluster (v1.24+)
- Node.js 18+ (for local development)
- Git

### External Services

- **Astra DB**: Free tier available at [datastax.com/astra](https://datastax.com/astra)
- **ERPNext**: Self-hosted or Frappe Cloud
- **Carbon**: Self-hosted instance
- **Xero**: Developer account for API access
- **Precoro**: API access enabled

---

## Environment Setup

### 1. Clone Repository

```bash
git clone https://github.com/icohangar-ops/battery-erp.git
cd battery-erp
```

### 2. Configure Environment Variables

```bash
# Copy environment template
cp .env.example .env

# Edit with your credentials
nano .env
```

### Required Variables

```bash
# Application
NODE_ENV=production
JWT_SECRET=<generate-with-openssl-rand-hex-32>

# ERPNext
ERPNext_URL=https://your-erpnext.com
ERPNext_API_KEY=your-key
ERPNext_API_SECRET=your-secret

# Carbon
CARBON_URL=https://your-carbon.com
CARBON_API_KEY=your-key

# Astra DB
ASTRA_DB_ID=your-db-id
ASTRA_KEYSPACE=battery_erp_prod
ASTRA_CLIENT_ID=your-client-id
ASTRA_SECRET=your-secret
ASTRA_TOKEN=your-token
ASTRA_CONTACT_POINT=your-contact-point

# Xero
XERO_CLIENT_ID=your-client-id
XERO_CLIENT_SECRET=your-secret
XERO_TENANT_ID=your-tenant-id

# Precoro
PRECORO_API_KEY=your-key
PRECORO_COMPANY_ID=your-company-id
```

### 3. Generate Secure Secrets

```bash
# Generate JWT secret
openssl rand -hex 32

# Generate session secret
openssl rand -hex 24
```

---

## Docker Deployment

### 1. Start Services

```bash
cd deploy/docker

# Start all services
docker compose up -d

# Check status
docker compose ps
```

### 2. View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f erpnext-backend
```

### 3. Initialize Database

```bash
# Run migrations (ERPNext)
docker compose exec erpnext-backend bench --site all migrate

# Create admin user (if needed)
docker compose exec erpnext-backend bench --site admin set-admin-password admin123
```

### 4. Access Services

| Service | URL | Port |
|---------|-----|------|
| Shop Floor UI | http://localhost:3002 | 3002 |
| Integration API | http://localhost:3001 | 3001 |
| ERPNext | http://localhost:8080 | 8080 |
| Carbon | http://localhost:3000 | 3000 |

---

## Kubernetes Deployment

### 1. Create Namespace

```bash
kubectl create namespace battery-erp
```

### 2. Create Secrets

```bash
# Create secret from .env file
kubectl create secret generic battery-erp-secrets \
  --from-env-file=.env \
  --namespace=battery-erp
```

### 3. Deploy Resources

```bash
# Apply Kubernetes manifests
kubectl apply -f deploy/kubernetes/ -n battery-erp
```

### 4. Check Deployment

```bash
# Check pods
kubectl get pods -n battery-erp

# Check services
kubectl get svc -n battery-erp

# View logs
kubectl logs -f deployment/battery-erp-integrations -n battery-erp
```

---

## Manual Deployment

### 1. Install Dependencies

```bash
# Backend
cd integrations
npm install --production

# Frontend
cd shop-floor
npm install --production
npm run build
```

### 2. Configure Process Manager (PM2)

```bash
# Install PM2 globally
npm install -g pm2

# Create ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'battery-erp-integrations',
    cwd: './integrations',
    script: 'npm',
    args: 'start',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    }
  }, {
    name: 'battery-erp-shop-floor',
    cwd: './shop-floor',
    script: 'serve',
    args: 'dist -p 3002',
    env: {
      NODE_ENV: 'production'
    }
  }]
};
EOF

# Start services
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

### 3. Configure Nginx (Reverse Proxy)

```nginx
server {
    listen 80;
    server_name battery-erp.com;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name battery-erp.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    # Shop Floor UI
    location / {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Integration API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Host $http_host;
    }
}
```

---

## Post-Deployment

### 1. Change Default Passwords

```bash
# Access Shop Floor UI and change:
# admin / admin123
# supervisor / supervisor123
# operator / operator123
# quality / quality123
```

### 2. Configure CORS

Edit `.env`:
```bash
CORS_ORIGIN=https://your-domain.com
```

### 3. Enable HTTPS

- Obtain SSL certificate (Let's Encrypt recommended)
- Configure reverse proxy (Nginx/Apache)
- Redirect HTTP to HTTPS

### 4. Setup Monitoring

```bash
# Start monitoring stack
docker compose -f deploy/docker/monitoring.yml up -d

# Access Grafana
# http://localhost:3100
# admin / admin
```

### 5. Configure Backups

```bash
# Add backup cron job
crontab -e

# Daily backup at 2 AM
0 2 * * * /path/to/battery-erp/scripts/backup.sh
```

---

## Monitoring

### Health Checks

```bash
# Integration API health
curl http://localhost:3001/api/health

# Astra DB connection
curl http://localhost:3001/api/astra/health

# ERPNext health
curl http://localhost:8080/api/method/ping
```

### Key Metrics to Monitor

| Metric | Threshold | Alert |
|--------|-----------|-------|
| API Response Time | < 500ms | > 1000ms |
| Error Rate | < 1% | > 5% |
| Memory Usage | < 80% | > 90% |
| Disk Usage | < 80% | > 90% |
| Active Sessions | Monitor | Sudden drop |

### Log Locations

```bash
# Integration API
docker compose logs -f erpnext-integrations

# Shop Floor UI
docker compose logs -f shop-floor

# Application logs
/var/log/battery-erp/

# System logs
journalctl -u battery-erp
```

---

## Backup & Recovery

### Backup Script

```bash
#!/bin/bash
# scripts/backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/battery-erp/$DATE"

mkdir -p $BACKUP_DIR

# Backup Astra DB data
# (Use Astra's built-in backup or export data)

# Backup ERPNext
docker compose exec -T erpnext-mariadb mysqldump -u root -padmin --all-databases > $BACKUP_DIR/erpnext.sql

# Backup Carbon DB
docker compose exec -T carbon-db pg_dump -U carbon carbon > $BACKUP_DIR/carbon.sql

# Backup environment
cp .env $BACKUP_DIR/

# Compress backup
tar -czf $BACKUP_DIR.tar.gz $BACKUP_DIR

# Upload to S3 (optional)
# aws s3 cp $BACKUP_DIR.tar.gz s3://your-bucket/backups/

# Cleanup old backups (keep 30 days)
find /backups/battery-erp -type f -mtime +30 -delete

echo "Backup completed: $BACKUP_DIR.tar.gz"
```

### Recovery

```bash
# Download backup
aws s3 cp s3://your-bucket/backups/battery-erp_20240101_020000.tar.gz /tmp/

# Extract
tar -xzf /tmp/battery-erp_20240101_020000.tar.gz -C /tmp/

# Restore ERPNext
cat /tmp/battery-erp_*/erpnext.sql | docker compose exec -T erpnext-mariadb mysql -u root -padmin

# Restore Carbon
cat /tmp/battery-erp_*/carbon.sql | docker compose exec -T carbon-db psql -U carbon -d carbon

# Restart services
docker compose restart
```

---

## Troubleshooting

### Common Issues

#### 1. Services Won't Start

```bash
# Check logs
docker compose logs

# Check resource usage
docker stats

# Restart services
docker compose restart
```

#### 2. Database Connection Failed

```bash
# Check database is running
docker compose ps

# Test connection
docker compose exec erpnext-mariadb mysql -u root -padmin -e "SHOW DATABASES;"
```

#### 3. High Memory Usage

```bash
# Check memory
docker stats

# Restart services
docker compose restart

# Increase container memory limit in docker-compose.yml
```

#### 4. API Rate Limiting

```bash
# Check rate limit settings in .env
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Increase if needed
```

### Support

- **Documentation**: https://github.com/icohangar-ops/battery-erp/tree/main/docs
- **Issues**: https://github.com/icohangar-ops/battery-erp/issues
- **Email**: sam@cubiczan.com

---

## Security Checklist

Before going live:

- [ ] Change all default passwords
- [ ] Enable HTTPS/TLS
- [ ] Configure firewall rules
- [ ] Enable audit logging
- [ ] Setup monitoring alerts
- [ ] Test backup/restore
- [ ] Review CORS settings
- [ ] Rotate all API keys
- [ ] Enable fail2ban
- [ ] Setup intrusion detection

---

**Last Updated**: 2024-04-30
