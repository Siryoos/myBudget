#!/bin/bash

# SmartSave Production Setup Script
# This script sets up the complete production environment with monitoring and security

set -e

# Configuration
DOMAIN=${DOMAIN:-"yourdomain.com"}
EMAIL=${EMAIL:-"admin@yourdomain.com"}
PROJECT_NAME="smartsave"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Generate secure secrets
generate_secrets() {
    log_info "Generating secure secrets..."

    # JWT Secrets
    JWT_SECRET=$(openssl rand -base64 64 | tr -d "=+/" | cut -c1-64)
    JWT_REFRESH_SECRET=$(openssl rand -base64 64 | tr -d "=+/" | cut -c1-64)

    # Database password
    DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)

    # Redis password
    REDIS_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)

    # Grafana password
    GRAFANA_PASSWORD=$(openssl rand -base64 16 | tr -d "=+/" | cut -c1-16)

    log_success "Secrets generated successfully"
}

# Create environment file
create_env_file() {
    log_info "Creating production environment file..."

    cat > .env.production << EOF
# Production Environment Variables - Generated on $(date)
NODE_ENV=production
NEXT_PUBLIC_NODE_ENV=production

# Database Configuration
DATABASE_URL=postgresql://postgres:${DB_PASSWORD}@smartsave-db:5432/smartsave_prod

# Redis Cache Configuration
REDIS_URL=redis://:${REDIS_PASSWORD}@smartsave-redis:6379
REDIS_CACHE_TTL=1800

# JWT Configuration
JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# Application URLs
NEXT_PUBLIC_API_URL=https://api.${DOMAIN}
NEXT_PUBLIC_APP_URL=https://www.${DOMAIN}

# Monitoring Configuration
MONITORING_ENABLED=true
LOG_LEVEL=info
METRICS_ENABLED=true

# Security Configuration
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=1000
CORS_ORIGIN=https://www.${DOMAIN}

# File Upload Configuration
MAX_FILE_SIZE=10485760
UPLOAD_PATH=/app/uploads

# Admin Configuration
ADMIN_EMAIL=${EMAIL}
MAINTENANCE_MODE=false

# Third-party API Keys (Configure as needed)
STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=

# SSL Configuration
SSL_CERT_PATH=/etc/nginx/ssl/fullchain.pem
SSL_KEY_PATH=/etc/nginx/ssl/privkey.pem
EOF

    log_success "Environment file created: .env.production"
    log_warning "IMPORTANT: Review and update API keys in .env.production before deployment!"
}

# Setup SSL certificates with Let's Encrypt
setup_ssl() {
    log_info "Setting up SSL certificates..."

    # Install certbot if not present
    if ! command -v certbot &> /dev/null; then
        log_info "Installing certbot..."
        sudo apt-get update
        sudo apt-get install -y certbot
    fi

    # Create SSL directory
    mkdir -p nginx/ssl

    # Obtain SSL certificates
    log_info "Obtaining SSL certificates for ${DOMAIN}..."
    sudo certbot certonly --standalone -d ${DOMAIN} -d www.${DOMAIN} --email ${EMAIL} --agree-tos --non-interactive

    # Copy certificates to nginx directory
    sudo cp /etc/letsencrypt/live/${DOMAIN}/fullchain.pem nginx/ssl/
    sudo cp /etc/letsencrypt/live/${DOMAIN}/privkey.pem nginx/ssl/

    # Set proper permissions
    sudo chown -R $USER:$USER nginx/ssl
    sudo chmod 600 nginx/ssl/privkey.pem
    sudo chmod 644 nginx/ssl/fullchain.pem

    log_success "SSL certificates configured successfully"
}

# Setup firewall
setup_firewall() {
    log_info "Configuring firewall..."

    # Install ufw if not present
    if ! command -v ufw &> /dev/null; then
        log_info "Installing ufw..."
        sudo apt-get install -y ufw
    fi

    # Reset firewall
    sudo ufw --force reset

    # Allow SSH
    sudo ufw allow ssh

    # Allow HTTP and HTTPS
    sudo ufw allow 80
    sudo ufw allow 443

    # Allow monitoring ports (internal)
    sudo ufw allow from 127.0.0.1 to any port 9090  # Prometheus
    sudo ufw allow from 127.0.0.1 to any port 3001  # Grafana
    sudo ufw allow from 127.0.0.1 to any port 3100  # Loki

    # Enable firewall
    sudo ufw --force enable

    log_success "Firewall configured successfully"
}

# Setup monitoring
setup_monitoring() {
    log_info "Setting up monitoring infrastructure..."

    # Create monitoring directories
    mkdir -p monitoring/grafana/dashboards
    mkdir -p monitoring/grafana/provisioning/datasources
    mkdir -p monitoring/grafana/provisioning/dashboards
    mkdir -p monitoring/promtail
    mkdir -p monitoring/loki

    # Create log directories
    mkdir -p logs/nginx
    mkdir -p logs/app

    # Set proper permissions
    sudo chown -R $USER:$USER monitoring/
    sudo chown -R $USER:$USER logs/

    log_success "Monitoring infrastructure setup complete"
}

# Setup backup system
setup_backups() {
    log_info "Setting up automated backups..."

    # Create backup directory
    mkdir -p backups

    # Create backup script
    cat > backup.sh << 'EOF'
#!/bin/bash

# SmartSave Database Backup Script

BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/smartsave_prod_$TIMESTAMP.sql.gz"

# Create backup
docker-compose -f docker-compose.prod.yml exec -T smartsave-db \
    pg_dump -U postgres smartsave_prod | gzip > $BACKUP_FILE

# Upload to cloud storage (configure as needed)
# aws s3 cp $BACKUP_FILE s3://your-backup-bucket/
# gsutil cp $BACKUP_FILE gs://your-backup-bucket/

# Clean old backups (keep last 7 days)
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_FILE"
EOF

    # Make backup script executable
    chmod +x backup.sh

    # Setup cron job for daily backups
    (crontab -l ; echo "0 2 * * * cd $(pwd) && ./backup.sh") | crontab -

    log_success "Automated backup system configured"
}

# Setup log rotation
setup_log_rotation() {
    log_info "Setting up log rotation..."

    # Create logrotate configuration
    sudo tee /etc/logrotate.d/smartsave > /dev/null << EOF
/var/log/smartsave/*.log {
    daily
    missingok
    rotate 7
    compress
    notifempty
    create 0644 www-data www-data
    postrotate
        docker-compose -f $(pwd)/docker-compose.prod.yml restart smartsave-nginx
    endscript
}
EOF

    log_success "Log rotation configured"
}

# Validate production readiness
validate_production() {
    log_info "Validating production readiness..."

    # Check if all required files exist
    required_files=(
        ".env.production"
        "docker-compose.prod.yml"
        "Dockerfile.prod"
        "nginx/nginx.conf"
        "monitoring/prometheus.yml"
        "monitoring/grafana/provisioning/datasources/prometheus.yml"
    )

    for file in "${required_files[@]}"; do
        if [ ! -f "$file" ]; then
            log_error "Missing required file: $file"
            exit 1
        fi
    done

    # Check if SSL certificates exist
    if [ ! -f "nginx/ssl/fullchain.pem" ] || [ ! -f "nginx/ssl/privkey.pem" ]; then
        log_warning "SSL certificates not found. Run setup_ssl or configure manually."
    fi

    # Validate environment variables
    source .env.production
    if [ -z "$JWT_SECRET" ] || [ -z "$DATABASE_URL" ]; then
        log_error "Critical environment variables are missing or empty"
        exit 1
    fi

    log_success "Production validation passed"
}

# Deploy application
deploy_application() {
    log_info "Deploying SmartSave application..."

    # Stop existing containers
    docker-compose -f docker-compose.prod.yml down || true

    # Build and start services
    docker-compose -f docker-compose.prod.yml up -d --build

    # Wait for services to be healthy
    log_info "Waiting for services to start..."
    sleep 60

    # Run database migrations
    log_info "Running database migrations..."
    docker-compose -f docker-compose.prod.yml exec -T smartsave-app npm run db:migrate

    # Health check
    if curl -f -s http://localhost/api/health > /dev/null; then
        log_success "Application deployed successfully!"
        log_info "Application is running at: https://www.${DOMAIN}"
        log_info "Monitoring dashboard: https://monitoring.${DOMAIN}"
    else
        log_error "Application health check failed"
        exit 1
    fi
}

# Main setup process
main() {
    log_info "🚀 Starting SmartSave Production Setup"
    log_info "Domain: ${DOMAIN}"
    log_info "Email: ${EMAIL}"

    case "${1:-all}" in
        "secrets")
            generate_secrets
            ;;
        "env")
            create_env_file
            ;;
        "ssl")
            setup_ssl
            ;;
        "firewall")
            setup_firewall
            ;;
        "monitoring")
            setup_monitoring
            ;;
        "backups")
            setup_backups
            ;;
        "logs")
            setup_log_rotation
            ;;
        "validate")
            validate_production
            ;;
        "deploy")
            deploy_application
            ;;
        "all")
            generate_secrets
            create_env_file
            setup_ssl
            setup_firewall
            setup_monitoring
            setup_backups
            setup_log_rotation
            validate_production
            deploy_application
            ;;
        *)
            echo "Usage: $0 {secrets|env|ssl|firewall|monitoring|backups|logs|validate|deploy|all}"
            exit 1
            ;;
    esac

    log_success "🎉 Setup completed successfully!"
    log_info ""
    log_info "Next steps:"
    log_info "1. Review and update API keys in .env.production"
    log_info "2. Configure DNS records for your domain"
    log_info "3. Test the application thoroughly"
    log_info "4. Set up monitoring alerts and notifications"
    log_info "5. Schedule regular security audits"
}

# Run main function
main "$@"
