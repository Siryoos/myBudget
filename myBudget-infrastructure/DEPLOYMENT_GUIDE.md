# MyBudget Infrastructure Deployment Guide

## Current Status

The containerized infrastructure has been created with all necessary configuration files and scripts. The project structure is ready for deployment.

## Project Structure Created

```
/workspace/myBudget-infrastructure/
├── docker-compose.yml          # Main orchestration file
├── .env.example               # Environment variables template
├── README.md                  # Documentation
├── DEPLOYMENT_GUIDE.md        # This guide
├── config/                    # Service configurations
│   ├── nginx/                 # Reverse proxy configs
│   ├── redis/                 # Cache configuration
│   ├── prometheus/            # Monitoring configuration
│   ├── keycloak/             # Auth service configs
│   ├── minio/                # Storage configs
│   └── postfix/              # Email server configs
├── scripts/                   # Automation scripts
│   ├── setup.sh              # Initial setup
│   ├── install-docker.sh     # Docker installation
│   ├── backup.sh             # Backup automation
│   └── health-check.sh       # Service health monitoring
├── ssl/                      # SSL certificates
├── data/                     # Persistent data volumes
└── logs/                     # Service logs
```

## Services Included

1. **PostgreSQL** - Primary database
2. **Redis** - Cache and session storage
3. **MinIO** - S3-compatible object storage
4. **Keycloak** - Authentication service
5. **Postal** - SMTP email server
6. **Nginx** - Reverse proxy
7. **Prometheus** - Metrics collection
8. **Grafana** - Monitoring dashboards
9. **Automated Backup** - Daily backup service

## Deployment Steps

### Step 1: Install Docker

Since Docker is not installed in this environment, you'll need to install it on your target system:

```bash
# For Ubuntu/Debian:
cd /workspace/myBudget-infrastructure
./scripts/install-docker.sh

# Or manually:
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

### Step 2: Configure Environment

1. Copy the environment template:
```bash
cd /workspace/myBudget-infrastructure
cp .env.example .env
```

2. Edit `.env` and set secure passwords for all services:
```bash
nano .env
```

Important variables to configure:
- `POSTGRES_PASSWORD`
- `KEYCLOAK_ADMIN_PASSWORD`
- `MINIO_ROOT_PASSWORD`
- `POSTAL_PASSWORD`
- `GF_ADMIN_PASSWORD`

### Step 3: Run Setup Script

```bash
./scripts/setup.sh
```

This will:
- Verify Docker installation
- Create SSL certificates
- Set proper permissions
- Initialize directories
- Pull Docker images

### Step 4: Start Services

Start all services:
```bash
docker-compose up -d
```

Or start services individually:
```bash
# Start database first
docker-compose up -d postgres redis

# Then core services
docker-compose up -d minio keycloak

# Then other services
docker-compose up -d postal nginx prometheus grafana
```

### Step 5: Configure DNS

Add these entries to `/etc/hosts`:
```
127.0.0.1 auth.mybudget.local
127.0.0.1 storage.mybudget.local
127.0.0.1 mail.mybudget.local
```

### Step 6: Initial Service Configuration

#### Keycloak Setup
1. Access: http://localhost:8080
2. Login with admin credentials from `.env`
3. Create a new realm called "mybudget"
4. Create clients for your applications

#### MinIO Setup
1. Access Console: http://localhost:9001
2. Login with root credentials from `.env`
3. Create buckets:
   - `mybudget-uploads`
   - `mybudget-backups`
   - `mybudget-static`

#### Grafana Setup
1. Access: http://localhost:3000
2. Login with admin credentials from `.env`
3. Add Prometheus data source
4. Import dashboards

## Verification

Run the health check:
```bash
./scripts/health-check.sh
```

Check service logs:
```bash
docker-compose logs -f
```

## Production Considerations

### Hardware Requirements
- **Minimum**: 4 CPU cores, 8GB RAM, 500GB SSD
- **Recommended**: 8+ CPU cores, 16GB+ RAM, 2TB+ NVMe SSD

### Security Hardening
1. Replace self-signed certificates with Let's Encrypt
2. Configure firewall rules
3. Enable 2FA in Keycloak
4. Set up fail2ban for SSH
5. Regular security updates

### Backup Strategy
- Automated daily backups at 2 AM
- 7-day retention policy
- Test restore procedures regularly

### Monitoring
- CPU/Memory alerts in Grafana
- Disk space monitoring
- Service uptime checks
- Email delivery monitoring

## Troubleshooting

### Docker Not Found
```bash
# Install Docker
./scripts/install-docker.sh
# Logout and login again
```

### Permission Denied
```bash
# Add user to docker group
sudo usermod -aG docker $USER
# Logout and login again
```

### Port Already in Use
```bash
# Find process using port
sudo lsof -i :PORT_NUMBER
# Kill process or change port in docker-compose.yml
```

### Service Won't Start
```bash
# Check logs
docker-compose logs service-name
# Restart service
docker-compose restart service-name
```

## Next Steps

1. **Install Docker** on your target system
2. **Configure environment** variables
3. **Deploy services** using docker-compose
4. **Configure each service** according to your needs
5. **Set up monitoring** and alerts
6. **Implement backup** strategy
7. **Test everything** thoroughly

The infrastructure is ready for deployment. All configuration files and scripts have been created and are ready to use.