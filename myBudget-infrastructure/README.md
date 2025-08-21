# MyBudget Infrastructure

A complete containerized infrastructure for self-hosted email, storage, and authentication services.

## Architecture

This infrastructure includes:

- **PostgreSQL**: Primary database for all services
- **Redis**: Cache and session storage
- **MinIO**: S3-compatible object storage
- **Keycloak**: Authentication and authorization service
- **Postal**: SMTP email server
- **Nginx**: Reverse proxy and load balancer
- **Prometheus**: Metrics collection
- **Grafana**: Monitoring dashboards
- **Automated Backup**: Daily backups of all data

## Quick Start

### Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- 8GB RAM minimum (16GB recommended)
- 100GB storage minimum

### Installation

1. Clone the repository:
```bash
cd /workspace/myBudget-infrastructure
```

2. Copy and configure environment variables:
```bash
cp .env.example .env
# Edit .env with your secure passwords
```

3. Run the setup script:
```bash
chmod +x scripts/setup.sh
./scripts/setup.sh
```

4. Start all services:
```bash
docker compose up -d
```

5. Add DNS entries to `/etc/hosts`:
```bash
127.0.0.1 auth.mybudget.local
127.0.0.1 storage.mybudget.local
127.0.0.1 mail.mybudget.local
```

## Service URLs

After deployment, services are available at:

- **Keycloak**: http://localhost:8080 or https://auth.mybudget.local
- **MinIO Console**: http://localhost:9001 or https://storage.mybudget.local:9001
- **MinIO API**: http://localhost:9000 or https://storage.mybudget.local
- **Grafana**: http://localhost:3000
- **Prometheus**: http://localhost:9090
- **SMTP**: smtp://localhost:587

## Configuration

### Keycloak Setup

1. Access Keycloak at http://localhost:8080
2. Login with admin credentials from `.env`
3. Create a new realm for your application
4. Configure clients and users

### MinIO Setup

1. Access MinIO Console at http://localhost:9001
2. Login with credentials from `.env`
3. Create buckets for your application
4. Set up access policies

### Email Configuration

1. Configure your domain's DNS records:
   - MX record pointing to your server
   - SPF record for authentication
   - DKIM keys (generated during setup)

## Monitoring

### Health Check

Run the health check script to verify all services:

```bash
./scripts/health-check.sh
```

### Grafana Dashboards

1. Access Grafana at http://localhost:3000
2. Login with credentials from `.env`
3. Import provided dashboards from `config/grafana/dashboards/`

## Backup and Recovery

### Automated Backups

Backups run daily at 2 AM and include:
- All PostgreSQL databases
- Redis data
- MinIO storage
- Configuration files

### Manual Backup

```bash
./scripts/backup.sh
```

### Restore from Backup

```bash
./scripts/restore.sh /path/to/backup.tar.gz
```

## Maintenance

### Update Services

```bash
docker-compose pull
docker-compose up -d
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f keycloak
```

### Scale Services

```bash
docker-compose up -d --scale postal=2
```

## Security

### SSL/TLS

- Self-signed certificates are generated during setup
- For production, use Let's Encrypt or your own certificates
- Place certificates in `ssl/` directory

### Firewall Rules

Required ports:
- 80/443: HTTP/HTTPS
- 25/587: SMTP
- 993: IMAPS (if enabled)

### Passwords

- Change all default passwords in `.env`
- Use strong, unique passwords for each service
- Enable 2FA in Keycloak for admin accounts

## Troubleshooting

### Service Won't Start

```bash
# Check logs
docker-compose logs service-name

# Restart service
docker-compose restart service-name
```

### Database Connection Issues

```bash
# Check PostgreSQL
docker exec -it mybudget-postgres psql -U mybudget -c "SELECT 1"
```

### Storage Issues

```bash
# Check MinIO
docker exec -it mybudget-storage mc admin info local
```

## Support

For issues and questions:
1. Check service logs
2. Run health check script
3. Review configuration files
4. Check Docker daemon status
