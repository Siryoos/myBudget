# MyBudget Deployment Guide

## Overview

This guide covers the complete deployment process for the MyBudget application, from local development to production deployment. The application uses Docker containers with PostgreSQL and Redis for production-ready deployment.

## Prerequisites

### System Requirements

- **Operating System**: Linux (Ubuntu 20.04+), macOS, or Windows with WSL2
- **Docker**: Version 20.10+ with Docker Compose
- **Node.js**: Version 18+ (for local development)
- **Memory**: Minimum 4GB RAM, 8GB recommended
- **Storage**: 20GB+ available disk space

### Required Software

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version
```

## Local Development Setup

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/mybudget.git
cd mybudget
```

### 2. Environment Configuration

Create environment files for local development:

```bash
# Copy environment template
cp .env.example .env.local

# Edit environment variables
nano .env.local
```

**Required Environment Variables:**

```bash
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mybudget_dev
DB_USER=mybudget_user
DB_PASSWORD=your_secure_password_here

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password_here

# JWT Configuration
JWT_SECRET=your_super_secure_jwt_secret_key_here_change_this_in_production
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# Application Configuration
NODE_ENV=development
PORT=3001
CORS_ORIGIN=http://localhost:3000

# Security Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
EXTERNAL_DOMAINS=https://cdn.sentry.io
```

### 3. Start Development Services

```bash
# Start PostgreSQL and Redis
docker-compose -f docker-compose.dev.yml up -d

# Install dependencies
npm install

# Run database migrations
npm run db:migrate

# Start development server
npm run dev
```

### 4. Verify Setup

- **Frontend**: http://localhost:3000
- **API**: http://localhost:3001/api/health
- **Database**: PostgreSQL on localhost:5432
- **Redis**: Redis on localhost:6379

## Docker Production Deployment

### 1. Production Environment Setup

Create production environment file:

```bash
# Create production environment
cp .env.example .env.production

# Edit production variables
nano .env.production
```

**Production Environment Variables:**

```bash
# Database Configuration
DB_HOST=postgres
DB_PORT=5432
DB_NAME=mybudget_prod
DB_USER=mybudget_user
DB_PASSWORD=your_production_password_here

# Redis Configuration
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=your_production_redis_password_here

# JWT Configuration
JWT_SECRET=your_production_jwt_secret_here
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# Application Configuration
NODE_ENV=production
PORT=3000
CORS_ORIGIN=https://yourdomain.com

# Security Configuration
ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
EXTERNAL_DOMAINS=https://cdn.sentry.io,https://api.smartsave.com

# Monitoring
SENTRY_DSN=your_sentry_dsn_here
LOG_LEVEL=info
```

### 2. Production Docker Compose

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.prod
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    env_file:
      - .env.production
    depends_on:
      - postgres
      - redis
    restart: unless-stopped
    networks:
      - mybudget-network
    volumes:
      - ./logs:/app/logs
      - ./uploads:/app/uploads

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: mybudget_prod
      POSTGRES_USER: mybudget_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init-db.sql:/docker-entrypoint-initdb.d/init-db.sql
    ports:
      - "5432:5432"
    restart: unless-stopped
    networks:
      - mybudget-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U mybudget_user -d mybudget_prod"]
      interval: 30s
      timeout: 10s
      retries: 3

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped
    networks:
      - mybudget-network
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
      - ./logs/nginx:/var/log/nginx
    depends_on:
      - app
    restart: unless-stopped
    networks:
      - mybudget-network

volumes:
  postgres_data:
  redis_data:

networks:
  mybudget-network:
    driver: bridge
```

### 3. Production Dockerfile

```dockerfile
# Dockerfile.prod
FROM node:18-alpine AS base

# Install dependencies
RUN apk add --no-cache libc6-compat

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Set working directory
WORKDIR /app

# Copy built application
COPY --from=base --chown=nextjs:nodejs /app/.next ./.next
COPY --from=base --chown=nextjs:nodejs /app/public ./public
COPY --from=base --chown=nextjs:nodejs /app/package*.json ./
COPY --from=base --chown=nextjs:nodejs /app/node_modules ./node_modules

# Create necessary directories
RUN mkdir -p logs uploads
RUN chown -R nextjs:nodejs logs uploads

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Start application
CMD ["npm", "start"]
```

### 4. Nginx Configuration

```nginx
# nginx/nginx.conf
events {
    worker_connections 1024;
}

http {
    upstream app {
        server app:3000;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=2r/s;

    server {
        listen 80;
        server_name yourdomain.com;
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name yourdomain.com;

        # SSL Configuration
        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;

        # Security Headers
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
        add_header X-Frame-Options DENY always;
        add_header X-Content-Type-Options nosniff always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;

        # API Rate Limiting
        location /api/auth/login {
            limit_req zone=login burst=5 nodelay;
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Static Files
        location / {
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

### 5. Database Initialization

```sql
-- init-db.sql
CREATE DATABASE mybudget_prod;
CREATE USER mybudget_user WITH PASSWORD 'your_production_password_here';
GRANT ALL PRIVILEGES ON DATABASE mybudget_prod TO mybudget_user;

-- Create extensions
\c mybudget_prod;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Set timezone
SET timezone = 'UTC';
```

## Deployment Process

### 1. Pre-deployment Checklist

- [ ] Environment variables configured
- [ ] SSL certificates obtained
- [ ] Database backup strategy planned
- [ ] Monitoring and logging configured
- [ ] Security audit completed
- [ ] Load testing performed

### 2. Deployment Commands

```bash
# Build and start production services
docker-compose -f docker-compose.prod.yml up -d --build

# Check service status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f app

# Run database migrations
docker-compose -f docker-compose.prod.yml exec app npm run db:migrate

# Seed initial data (if needed)
docker-compose -f docker-compose.prod.yml exec app npm run db:seed
```

### 3. Health Checks

```bash
# Application health
curl -f https://yourdomain.com/api/health

# Database health
docker-compose -f docker-compose.prod.yml exec postgres pg_isready -U mybudget_user

# Redis health
docker-compose -f docker-compose.prod.yml exec redis redis-cli ping
```

## Monitoring & Logging

### 1. Application Monitoring

```typescript
// lib/monitoring.ts
import { createLogger, format, transports } from 'winston';

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.json()
  ),
  transports: [
    new transports.File({ filename: 'logs/error.log', level: 'error' }),
    new transports.File({ filename: 'logs/combined.log' }),
    new transports.Console({
      format: format.simple()
    })
  ]
});

export default logger;
```

### 2. Health Check Endpoint

```typescript
// app/api/health/route.ts
export async function GET() {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      database: await checkDatabaseHealth(),
      redis: await checkRedisHealth(),
      application: checkApplicationHealth()
    }
  };

  const overallStatus = Object.values(health.services)
    .every(service => service.status === 'healthy') ? 'healthy' : 'unhealthy';

  return NextResponse.json({
    ...health,
    status: overallStatus
  }, {
    status: overallStatus === 'healthy' ? 200 : 503
  });
}
```

## Backup & Recovery

### 1. Database Backup

```bash
#!/bin/bash
# backup-db.sh

BACKUP_DIR="/backups/postgres"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="mybudget_prod"

# Create backup directory
mkdir -p $BACKUP_DIR

# Create database backup
docker-compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U mybudget_user $DB_NAME > $BACKUP_DIR/backup_$DATE.sql

# Compress backup
gzip $BACKUP_DIR/backup_$DATE.sql

# Keep only last 7 days of backups
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +7 -delete

echo "Database backup completed: backup_$DATE.sql.gz"
```

### 2. Recovery Process

```bash
# Restore database from backup
docker-compose -f docker-compose.prod.yml exec -T postgres \
  psql -U mybudget_user -d mybudget_prod < backup_20240822_143000.sql
```

## Scaling & Performance

### 1. Horizontal Scaling

```yaml
# docker-compose.scale.yml
services:
  app:
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M
```

### 2. Load Balancer Configuration

```nginx
# nginx/load-balancer.conf
upstream app_backend {
    least_conn;
    server app1:3000;
    server app2:3000;
    server app3:3000;
}
```

## Security Hardening

### 1. Container Security

```dockerfile
# Security hardening
RUN apk add --no-cache dumb-init
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Use non-root user
USER nextjs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1
```

### 2. Network Security

```yaml
# docker-compose.prod.yml
networks:
  mybudget-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
    driver_opts:
      com.docker.network.bridge.name: mybudget-br0
```

## Troubleshooting

### Common Issues

#### 1. Database Connection Issues

```bash
# Check database status
docker-compose -f docker-compose.prod.yml exec postgres pg_isready

# Check database logs
docker-compose -f docker-compose.prod.yml logs postgres

# Reset database (development only)
docker-compose -f docker-compose.prod.yml down -v
docker-compose -f docker-compose.prod.yml up -d
```

#### 2. Redis Connection Issues

```bash
# Check Redis status
docker-compose -f docker-compose.prod.yml exec redis redis-cli ping

# Check Redis logs
docker-compose -f docker-compose.prod.yml logs redis
```

#### 3. Application Issues

```bash
# Check application logs
docker-compose -f docker-compose.prod.yml logs -f app

# Restart application
docker-compose -f docker-compose.prod.yml restart app

# Check application health
curl -f https://yourdomain.com/api/health
```

## Maintenance

### 1. Regular Updates

```bash
# Update dependencies
npm update

# Update Docker images
docker-compose -f docker-compose.prod.yml pull

# Rebuild and restart
docker-compose -f docker-compose.prod.yml up -d --build
```

### 2. Log Rotation

```bash
# Configure logrotate
sudo nano /etc/logrotate.d/mybudget

# Log rotation configuration
/var/log/mybudget/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
}
```

## Support

For deployment support:
- **Email**: devops@mybudget.com
- **Documentation**: https://docs.mybudget.com
- **Issues**: GitHub Issues repository

---

**Document Version**: 1.0.0  
**Last Updated**: August 2024  
**Next Review**: November 2024  
**Owner**: DevOps Team
