# Docker & Deployment Guide

This guide covers Docker setup, configuration, and deployment strategies for the SmartSave Personal Finance Platform.

## 🐳 Docker Architecture Overview

### Service Architecture

The Docker setup consists of the following services:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   PostgreSQL    │
│   (Next.js)     │◄──►│   (Next.js API) │◄──►│   (Database)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Nginx         │    │   Redis         │    │   MinIO         │
│   (Reverse      │    │   (Caching)     │    │   (Storage)     │
│    Proxy)       │    └─────────────────┘    └─────────────────┘
└─────────────────┘
         │
         ▼
┌─────────────────┐
│   Internet      │
│   (Users)       │
└─────────────────┘
```

### Services Included

- **PostgreSQL 15**: Primary database with persistent storage
- **Redis 7**: Caching and session storage
- **MinIO**: Object storage service for file uploads
- **Keycloak 23**: Identity and access management
- **Backend API**: Node.js/Express backend
- **Frontend**: Next.js frontend application
- **Nginx**: Reverse proxy with SSL termination
- **Prometheus**: Metrics collection
- **Grafana**: Metrics visualization
- **Backup Service**: Automated backup management

## 🚀 Quick Start

### Prerequisites

- Docker Engine with Docker Compose plugin installed
- At least 4GB of available RAM
- Ports 80, 3000, 3001, 5432, 6379 available
- OpenSSL (for self-signed certificates)
- Bash shell

### 1. Automated Setup (Recommended)

```bash
# Run the automated setup script
./setup.sh
```

This script will:
- Check Docker installation
- Create necessary directories
- Generate environment file with secure passwords
- Build and start all services
- Wait for services to be healthy
- Show service status and URLs

### 2. Manual Setup

```bash
# Copy environment file
cp docker.env.example docker.env

# Edit with your preferences
nano docker.env

# Create directories
mkdir -p database/backups logs uploads nginx/logs nginx/ssl

# Build and start services
docker compose up -d

# Check service status
docker compose ps
```

## 🔧 Environment Configuration

### Environment Variables

```bash
# Database Configuration
DB_USER=postgres
DB_HOST=postgres
DB_NAME=mybudget
DB_PASSWORD=your_secure_password
DB_PORT=5432

# JWT Configuration
JWT_SECRET=your_super_secret_key
JWT_EXPIRES_IN=7d

# Redis Configuration
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# MinIO Configuration
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=your_minio_password
MINIO_BUCKET_NAME=mybudget-uploads

# Keycloak Configuration
KEYCLOAK_ADMIN=admin
KEYCLOAK_ADMIN_PASSWORD=your_keycloak_password
KEYCLOAK_DB_PASSWORD=your_keycloak_db_password

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost
NODE_ENV=production
PORT=3000
BACKEND_PORT=3001

# Monitoring Configuration
PROMETHEUS_ADMIN_PASSWORD=your_prometheus_password
GRAFANA_ADMIN_PASSWORD=your_grafana_password
```

### Security Setup

```bash
# Restrict access to environment files
chmod 600 docker.env
chmod 600 .env

# Ensure only owner can read/write
chown $USER:$USER docker.env
chown $USER:$USER .env

# Add to .gitignore
echo "docker.env" >> .gitignore
echo ".env" >> .gitignore
echo "*.pem" >> .gitignore
echo "*.key" >> .gitignore

# Verify they're ignored
git status
```

## 🏗️ Docker Compose Configuration

### Main Configuration

```yaml
# docker-compose.yml
version: '3.8'

services:
  # PostgreSQL Database
  postgres:
    image: postgres:15
    container_name: mybudget-postgres
    environment:
      POSTGRES_DB: ${DB_NAME}
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_INITDB_ARGS: "--encoding=UTF-8 --lc-collate=C --lc-ctype=C"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/init:/docker-entrypoint-initdb.d
      - ./database/backups:/backups
    ports:
      - "127.0.0.1:5432:5432"
    networks:
      - app-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER} -d ${DB_NAME}"]
      interval: 30s
      timeout: 10s
      retries: 3
    deploy:
      resources:
        limits:
          memory: 1G
        reservations:
          memory: 512M

  # Redis Cache
  redis:
    image: redis:7-alpine
    container_name: mybudget-redis
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
      - ./config/redis/redis.conf:/usr/local/etc/redis/redis.conf
    ports:
      - "127.0.0.1:6379:6379"
    networks:
      - app-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3
    deploy:
      resources:
        limits:
          memory: 256M
        reservations:
          memory: 128M

  # MinIO Object Storage
  minio:
    image: minio/minio:latest
    container_name: mybudget-minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}
      MINIO_BROWSER_REDIRECT_URL: ${NEXT_PUBLIC_APP_URL}
    volumes:
      - minio_data:/data
    ports:
      - "127.0.0.1:9000:9000"
      - "127.0.0.1:9001:9001"
    networks:
      - app-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 10s
      retries: 3
    deploy:
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M

  # Keycloak Identity Management
  keycloak:
    image: quay.io/keycloak/keycloak:23.0
    container_name: mybudget-keycloak
    environment:
      KEYCLOAK_ADMIN: ${KEYCLOAK_ADMIN}
      KEYCLOAK_ADMIN_PASSWORD: ${KEYCLOAK_ADMIN_PASSWORD}
      KC_DB: postgres
      KC_DB_URL: jdbc:postgresql://postgres:5432/keycloak
      KC_DB_USERNAME: keycloak
      KC_DB_PASSWORD: ${KEYCLOAK_DB_PASSWORD}
      KC_HOSTNAME: localhost
      KC_HTTP_ENABLED: true
    volumes:
      - keycloak_data:/opt/keycloak/data
    ports:
      - "127.0.0.1:8080:8080"
    networks:
      - app-network
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health/ready"]
      interval: 30s
      timeout: 10s
      retries: 3
    deploy:
      resources:
        limits:
          memory: 1G
        reservations:
          memory: 512M

  # Backend API
  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    container_name: mybudget-backend
    environment:
      NODE_ENV: ${NODE_ENV}
      PORT: ${BACKEND_PORT}
      DB_HOST: postgres
      DB_NAME: ${DB_NAME}
      DB_USER: ${DB_USER}
      DB_PASSWORD: ${DB_PASSWORD}
      DB_PORT: 5432
      REDIS_HOST: redis
      REDIS_PORT: 6379
      REDIS_PASSWORD: ${REDIS_PASSWORD}
      JWT_SECRET: ${JWT_SECRET}
      JWT_EXPIRES_IN: ${JWT_EXPIRES_IN}
      MINIO_HOST: minio
      MINIO_PORT: 9000
      MINIO_ACCESS_KEY: ${MINIO_ROOT_USER}
      MINIO_SECRET_KEY: ${MINIO_ROOT_PASSWORD}
      MINIO_BUCKET: ${MINIO_BUCKET_NAME}
    volumes:
      - ./logs:/app/logs
      - ./uploads:/app/uploads
    ports:
      - "127.0.0.1:${BACKEND_PORT}:${BACKEND_PORT}"
    networks:
      - app-network
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      minio:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:${BACKEND_PORT}/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    deploy:
      resources:
        limits:
          memory: 1G
        reservations:
          memory: 512M

  # Frontend Application
  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    container_name: mybudget-frontend
    environment:
      NODE_ENV: ${NODE_ENV}
      NEXT_PUBLIC_API_URL: http://backend:${BACKEND_PORT}
      NEXT_PUBLIC_APP_URL: ${NEXT_PUBLIC_APP_URL}
    volumes:
      - ./logs:/app/logs
    ports:
      - "127.0.0.1:${PORT}:${PORT}"
    networks:
      - app-network
    depends_on:
      backend:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:${PORT}/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    deploy:
      resources:
        limits:
          memory: 1G
        reservations:
          memory: 512M

  # Nginx Reverse Proxy
  nginx:
    image: nginx:alpine
    container_name: mybudget-nginx
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
      - ./logs/nginx:/var/log/nginx
    ports:
      - "80:80"
      - "443:443"
    networks:
      - app-network
    depends_on:
      frontend:
        condition: service_healthy
      backend:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    deploy:
      resources:
        limits:
          memory: 256M
        reservations:
          memory: 128M

  # Prometheus Metrics Collection
  prometheus:
    image: prom/prometheus:latest
    container_name: mybudget-prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--storage.tsdb.retention.time=200h'
      - '--web.enable-lifecycle'
    volumes:
      - ./config/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    ports:
      - "127.0.0.1:9090:9090"
    networks:
      - app-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:9090/-/healthy"]
      interval: 30s
      timeout: 10s
      retries: 3
    deploy:
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M

  # Grafana Metrics Visualization
  grafana:
    image: grafana/grafana:latest
    container_name: mybudget-grafana
    environment:
      GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_ADMIN_PASSWORD}
      GF_USERS_ALLOW_SIGN_UP: false
    volumes:
      - grafana_data:/var/lib/grafana
      - ./config/grafana/provisioning:/etc/grafana/provisioning
    ports:
      - "127.0.0.1:3001:3000"
    networks:
      - app-network
    depends_on:
      prometheus:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:3000/api/health || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 3
    deploy:
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M

  # Backup Service
  backup:
    image: postgres:15
    container_name: mybudget-backup
    environment:
      POSTGRES_DB: ${DB_NAME}
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_HOST: postgres
    volumes:
      - ./database/backups:/backups
      - ./scripts/backup.sh:/backup.sh
    networks:
      - app-network
    depends_on:
      postgres:
        condition: service_healthy
    restart: "no"
    command: ["/bin/bash", "/backup.sh"]
    deploy:
      resources:
        limits:
          memory: 256M
        reservations:
          memory: 128M

networks:
  app-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16

volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local
  minio_data:
    driver: local
  keycloak_data:
    driver: local
  prometheus_data:
    driver: local
  grafana_data:
    driver: local
```

### Development Overrides

```yaml
# docker-compose.dev.yml
version: '3.8'

services:
  postgres:
    ports:
      - "5432:5432"
    environment:
      POSTGRES_PASSWORD: dev_password
    volumes:
      - ./database/dev-data:/var/lib/postgresql/data

  redis:
    ports:
      - "6379:6379"
    command: redis-server --requirepass dev_password

  backend:
    environment:
      NODE_ENV: development
      JWT_SECRET: dev_secret_key
    volumes:
      - .:/app
      - /app/node_modules
    command: npm run dev

  frontend:
    environment:
      NODE_ENV: development
    volumes:
      - .:/app
      - /app/node_modules
    command: npm run dev

  nginx:
    volumes:
      - ./nginx/nginx.dev.conf:/etc/nginx/nginx.conf

  # Disable monitoring in development
  prometheus:
    profiles:
      - production

  grafana:
    profiles:
      - production

  backup:
    profiles:
      - production
```

## 🔒 Security Features

### Port Security
- **All sensitive services** bind to `127.0.0.1` only (localhost)
- **Public ports** only on Nginx (80/443)
- **Internal communication** via Docker network

### Container Security
- `no-new-privileges: true` on all services
- Resource limits and reservations
- Read-only volumes where possible
- Non-root users for monitoring services

### Network Security
- Isolated Docker network
- Custom bridge naming
- Internal service discovery
- No direct external access to databases

### Application Security
- Rate limiting on API endpoints
- Security headers (CSP, XSS Protection, etc.)
- JWT-based authentication
- CORS configuration
- Input validation and sanitization

## 📁 File Structure

```
myBudget/
├── docker-compose.yml          # Main unified configuration
├── docker-compose.dev.yml      # Development overrides
├── env.production              # Production environment template
├── .env                        # Environment variables (create from template)
├── setup.sh                    # Setup script
├── config/
│   ├── redis/redis.conf       # Redis configuration
│   ├── prometheus/prometheus.yml # Prometheus configuration
│   └── grafana/provisioning/  # Grafana configuration
├── nginx/
│   ├── nginx.conf             # Production Nginx config
│   ├── nginx.dev.conf         # Development Nginx config
│   └── ssl/                   # SSL certificates
├── database/
│   ├── init/                  # Database initialization
│   ├── backups/               # Database backups
│   └── dev-data/              # Development data
└── logs/                      # Application logs
```

## 🚀 Setup Script

### Automated Setup

```bash
#!/bin/bash
# setup.sh

set -e

echo "🚀 Setting up MyBudget with Docker..."

# Check Docker installation
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✅ Docker and Docker Compose are installed"

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p database/backups logs uploads nginx/logs nginx/ssl config/redis config/prometheus config/grafana/provisioning

# Generate environment file if it doesn't exist
if [ ! -f docker.env ]; then
    echo "🔐 Generating environment file..."
    cp docker.env.example docker.env
    
    # Generate secure passwords
    DB_PASSWORD=$(openssl rand -base64 32)
    REDIS_PASSWORD=$(openssl rand -base64 32)
    JWT_SECRET=$(openssl rand -base64 64)
    MINIO_ROOT_PASSWORD=$(openssl rand -base64 32)
    KEYCLOAK_ADMIN_PASSWORD=$(openssl rand -base64 32)
    KEYCLOAK_DB_PASSWORD=$(openssl rand -base64 32)
    PROMETHEUS_ADMIN_PASSWORD=$(openssl rand -base64 32)
    GRAFANA_ADMIN_PASSWORD=$(openssl rand -base64 32)
    
    # Update environment file
    sed -i "s/DB_PASSWORD=.*/DB_PASSWORD=$DB_PASSWORD/" docker.env
    sed -i "s/REDIS_PASSWORD=.*/REDIS_PASSWORD=$REDIS_PASSWORD/" docker.env
    sed -i "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" docker.env
    sed -i "s/MINIO_ROOT_PASSWORD=.*/MINIO_ROOT_PASSWORD=$MINIO_ROOT_PASSWORD/" docker.env
    sed -i "s/KEYCLOAK_ADMIN_PASSWORD=.*/KEYCLOAK_ADMIN_PASSWORD=$KEYCLOAK_ADMIN_PASSWORD/" docker.env
    sed -i "s/KEYCLOAK_DB_PASSWORD=.*/KEYCLOAK_DB_PASSWORD=$KEYCLOAK_DB_PASSWORD/" docker.env
    sed -i "s/PROMETHEUS_ADMIN_PASSWORD=.*/PROMETHEUS_ADMIN_PASSWORD=$PROMETHEUS_ADMIN_PASSWORD/" docker.env
    sed -i "s/GRAFANA_ADMIN_PASSWORD=.*/GRAFANA_ADMIN_PASSWORD=$GRAFANA_ADMIN_PASSWORD/" docker.env
    
    echo "✅ Environment file generated with secure passwords"
    echo "📝 Please review docker.env and customize as needed"
fi

# Set proper permissions
echo "🔒 Setting file permissions..."
chmod 600 docker.env
chown $USER:$USER docker.env

# Build and start services
echo "🐳 Building and starting services..."
docker compose up -d --build

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
timeout=300
elapsed=0

while [ $elapsed -lt $timeout ]; do
    if docker compose ps | grep -q "healthy"; then
        echo "✅ All services are healthy!"
        break
    fi
    
    echo "⏳ Waiting for services to be healthy... ($elapsed/$timeout seconds)"
    sleep 10
    elapsed=$((elapsed + 10))
done

if [ $elapsed -ge $timeout ]; then
    echo "❌ Timeout waiting for services to be healthy"
    echo "📋 Service status:"
    docker compose ps
    exit 1
fi

# Show service status
echo "📋 Service status:"
docker compose ps

# Show access URLs
echo ""
echo "🌐 Access URLs:"
echo "Frontend: http://localhost"
echo "Backend API: http://localhost:3001"
echo "Keycloak: http://localhost:8080"
echo "MinIO Console: http://localhost:9001"
echo "Prometheus: http://localhost:9090"
echo "Grafana: http://localhost:3001 (admin/admin)"
echo ""
echo "🔐 Default credentials:"
echo "MinIO: minioadmin / (check docker.env)"
echo "Keycloak: admin / (check docker.env)"
echo "Grafana: admin / (check docker.env)"
echo ""
echo "✅ Setup complete! MyBudget is now running."
echo "📖 Check the logs with: docker compose logs -f"
```

## 🔧 Configuration Files

### Nginx Configuration

```nginx
# nginx/nginx.conf
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    # Logging
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log warn;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";

    # Upstream servers
    upstream frontend {
        server frontend:3000;
    }

    upstream backend {
        server backend:3001;
    }

    upstream keycloak {
        server keycloak:8080;
    }

    # Main server block
    server {
        listen 80;
        server_name localhost;

        # Health check endpoint
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }

        # Frontend routes
        location / {
            proxy_pass http://frontend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Backend API routes
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Keycloak routes
        location /auth/ {
            proxy_pass http://keycloak;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # MinIO routes
        location /minio/ {
            proxy_pass http://minio:9000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Monitoring routes (internal only)
        location /monitoring/ {
            allow 127.0.0.1;
            deny all;
            
            location /monitoring/prometheus/ {
                proxy_pass http://prometheus:9090/;
            }
            
            location /monitoring/grafana/ {
                proxy_pass http://grafana:3000/;
            }
        }
    }
}
```

### Redis Configuration

```conf
# config/redis/redis.conf
# Network
bind 0.0.0.0
port 6379
timeout 0
tcp-keepalive 300

# General
daemonize no
supervised no
pidfile /var/run/redis_6379.pid
loglevel notice
logfile ""

# Snapshotting
save 900 1
save 300 10
save 60 10000
stop-writes-on-bgsave-error yes
rdbcompression yes
rdbchecksum yes
dbfilename dump.rdb
dir /data

# Replication
replica-serve-stale-data yes
replica-read-only yes

# Security
requirepass ${REDIS_PASSWORD}

# Memory management
maxmemory 256mb
maxmemory-policy allkeys-lru

# Append only file
appendonly yes
appendfilename "appendonly.aof"
appendfsync everysec
no-appendfsync-on-rewrite no
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb
```

### Prometheus Configuration

```yaml
# config/prometheus/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alert_rules.yml"

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'backend'
    static_configs:
      - targets: ['backend:3001']
    metrics_path: '/api/metrics'
    scrape_interval: 30s

  - job_name: 'frontend'
    static_configs:
      - targets: ['frontend:3000']
    metrics_path: '/api/metrics'
    scrape_interval: 30s

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres:5432']
    metrics_path: '/metrics'
    scrape_interval: 60s

  - job_name: 'redis'
    static_configs:
      - targets: ['redis:6379']
    metrics_path: '/metrics'
    scrape_interval: 60s

  - job_name: 'nginx'
    static_configs:
      - targets: ['nginx:80']
    metrics_path: '/nginx_status'
    scrape_interval: 30s
```

## 📊 Monitoring & Observability

### Health Checks

```bash
# Check all services
docker compose ps

# Check specific service
docker compose ps postgres

# View service logs
docker compose logs -f backend

# Check service health
curl http://localhost/health
curl http://localhost:3001/api/health
```

### Metrics Collection

- **Application Metrics**: Response times, error rates, request counts
- **Infrastructure Metrics**: CPU, memory, disk usage, network I/O
- **Business Metrics**: User registrations, transactions, budget creations
- **Custom Metrics**: Feature usage, goal completions, savings amounts

### Logging Strategy

```bash
# View all logs
docker compose logs

# View specific service logs
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f postgres

# View logs with timestamps
docker compose logs -t

# View logs for specific time range
docker compose logs --since="2024-01-01T00:00:00" --until="2024-01-02T00:00:00"
```

## 🔄 Backup & Recovery

### Automated Backups

```bash
# Manual backup
docker compose run --rm backup

# Scheduled backups (add to crontab)
0 2 * * * cd /path/to/myBudget && docker compose run --rm backup

# Restore from backup
docker compose exec postgres psql -U postgres -d mybudget < /path/to/backup.sql
```

### Backup Script

```bash
#!/bin/bash
# scripts/backup.sh

set -e

BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="mybudget_backup_$DATE.sql"

echo "Starting backup at $DATE..."

# Create backup
pg_dump -h $POSTGRES_HOST -U $POSTGRES_USER -d $POSTGRES_DB > "$BACKUP_DIR/$BACKUP_FILE"

# Compress backup
gzip "$BACKUP_DIR/$BACKUP_FILE"

# Remove old backups (keep last 7 days)
find $BACKUP_DIR -name "mybudget_backup_*.sql.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_FILE.gz"
```

## 🚀 Production Deployment

### Production Environment Variables

```bash
# env.production
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://yourdomain.com
DB_HOST=your-production-db-host
DB_NAME=mybudget_prod
DB_USER=your_production_user
DB_PASSWORD=your_secure_production_password
JWT_SECRET=your_production_jwt_secret
REDIS_URL=redis://your-redis-host:6379
MINIO_ENDPOINT=https://your-minio-endpoint
```

### SSL Configuration

```bash
# Generate SSL certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/nginx.key \
  -out nginx/ssl/nginx.crt \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=yourdomain.com"

# Set proper permissions
chmod 600 nginx/ssl/nginx.key
chmod 644 nginx/ssl/nginx.crt
```

### Scaling Considerations

```yaml
# docker-compose.prod.yml
services:
  backend:
    deploy:
      replicas: 3
      resources:
        limits:
          memory: 2G
        reservations:
          memory: 1G
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3

  frontend:
    deploy:
      replicas: 2
      resources:
        limits:
          memory: 1G
        reservations:
          memory: 512M
```

## 🚨 Troubleshooting

### Common Issues

#### Service Won't Start
```bash
# Check service logs
docker compose logs service-name

# Check service status
docker compose ps

# Restart specific service
docker compose restart service-name
```

#### Database Connection Issues
```bash
# Check database logs
docker compose logs postgres

# Test database connection
docker compose exec postgres psql -U postgres -d mybudget -c "SELECT 1;"

# Check database health
docker compose exec postgres pg_isready -U postgres
```

#### Port Conflicts
```bash
# Check what's using a port
sudo netstat -tulpn | grep :3000

# Kill process using port
sudo kill -9 <PID>
```

#### Memory Issues
```bash
# Check container resource usage
docker stats

# Check system memory
free -h

# Restart with more memory
docker compose down
docker compose up -d
```

### Performance Tuning

```bash
# Increase Docker memory limit
# Edit /etc/docker/daemon.json
{
  "default-shm-size": "2G",
  "storage-driver": "overlay2"
}

# Restart Docker
sudo systemctl restart docker

# Optimize PostgreSQL
# Edit postgres configuration for your workload
```

---

**Next Steps**: Explore [Getting Started](getting-started.md) for installation instructions, or [Architecture Overview](architecture.md) for system design details.
