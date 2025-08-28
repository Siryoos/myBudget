#!/bin/bash

# SmartSave Production Deployment Script
# This script handles the complete deployment process for the SmartSave application

set -e  # Exit on any error

# Configuration
PROJECT_NAME="smartsave"
DOMAIN="yourdomain.com"
ENVIRONMENT="production"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi

    # Check if Docker Compose is installed
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi

    # Check if .env.production exists
    if [ ! -f ".env.production" ]; then
        log_warning ".env.production file not found. Creating template..."
        cp .env.example .env.production 2>/dev/null || create_env_template
        log_error "Please configure your .env.production file with production values before continuing."
        exit 1
    fi

    log_success "Prerequisites check passed"
}

# Create environment template if it doesn't exist
create_env_template() {
    cat > .env.production << EOF
# Production Environment Variables
NODE_ENV=production
NEXT_PUBLIC_NODE_ENV=production

# Database Configuration
DATABASE_URL=postgresql://postgres:CHANGE_THIS_PASSWORD@smartsave-db:5432/smartsave_prod

# Redis Cache Configuration
REDIS_URL=redis://:CHANGE_THIS_PASSWORD@smartsave-redis:6379

# JWT Configuration
JWT_SECRET=CHANGE_THIS_TO_A_SECURE_RANDOM_STRING
JWT_REFRESH_SECRET=CHANGE_THIS_TO_A_DIFFERENT_SECURE_RANDOM_STRING
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# Application URLs
NEXT_PUBLIC_API_URL=https://api.${DOMAIN}
NEXT_PUBLIC_APP_URL=https://www.${DOMAIN}

# Monitoring Configuration
MONITORING_ENABLED=true
LOG_LEVEL=info

# Security Configuration
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=1000
CORS_ORIGIN=https://www.${DOMAIN}

# Admin Configuration
ADMIN_EMAIL=admin@${DOMAIN}
MAINTENANCE_MODE=false
EOF
}

# Setup SSL certificates
setup_ssl() {
    log_info "Setting up SSL certificates..."

    # Create SSL directory
    mkdir -p nginx/ssl

    # Check if certificates exist
    if [ ! -f "nginx/ssl/fullchain.pem" ] || [ ! -f "nginx/ssl/privkey.pem" ]; then
        log_warning "SSL certificates not found. Please obtain SSL certificates and place them in nginx/ssl/"
        log_info "You can use Let's Encrypt with certbot:"
        log_info "sudo certbot certonly --webroot -w /var/www/html -d ${DOMAIN} -d www.${DOMAIN}"

        # Create self-signed certificates as fallback for development
        log_info "Creating self-signed certificates for development..."
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout nginx/ssl/privkey.pem \
            -out nginx/ssl/fullchain.pem \
            -subj "/C=US/ST=State/L=City/O=Organization/CN=${DOMAIN}"
    fi

    log_success "SSL certificates configured"
}

# Build and deploy
deploy() {
    log_info "Starting deployment process..."

    # Stop existing containers
    log_info "Stopping existing containers..."
    docker-compose -f docker-compose.prod.yml down || true

    # Build images
    log_info "Building Docker images..."
    docker-compose -f docker-compose.prod.yml build --no-cache

    # Start services
    log_info "Starting services..."
    docker-compose -f docker-compose.prod.yml up -d

    # Wait for services to be healthy
    log_info "Waiting for services to be healthy..."
    sleep 30

    # Run database migrations
    log_info "Running database migrations..."
    docker-compose -f docker-compose.prod.yml exec -T smartsave-app npm run db:migrate

    # Seed initial data if needed
    log_info "Seeding initial data..."
    docker-compose -f docker-compose.prod.yml exec -T smartsave-app npm run db:seed || true

    log_success "Deployment completed successfully!"
}

# Health check
health_check() {
    log_info "Performing health checks..."

    # Check if services are running
    if ! docker-compose -f docker-compose.prod.yml ps | grep -q "Up"; then
        log_error "Some services are not running"
        docker-compose -f docker-compose.prod.yml ps
        exit 1
    fi

    # Check application health
    max_attempts=30
    attempt=1

    while [ $attempt -le $max_attempts ]; do
        if curl -f -s http://localhost/api/health > /dev/null 2>&1; then
            log_success "Application health check passed"
            break
        fi

        log_info "Waiting for application to be ready (attempt $attempt/$max_attempts)..."
        sleep 10
        ((attempt++))
    done

    if [ $attempt -gt $max_attempts ]; then
        log_error "Application health check failed"
        exit 1
    fi

    # Check database health
    if docker-compose -f docker-compose.prod.yml exec -T smartsave-db pg_isready -U postgres > /dev/null 2>&1; then
        log_success "Database health check passed"
    else
        log_error "Database health check failed"
        exit 1
    fi

    # Check Redis health
    if docker-compose -f docker-compose.prod.yml exec -T smartsave-redis redis-cli ping | grep -q "PONG"; then
        log_success "Redis health check passed"
    else
        log_error "Redis health check failed"
        exit 1
    fi

    log_success "All health checks passed!"
}

# Backup database
backup_database() {
    log_info "Creating database backup..."

    BACKUP_DIR="./backups"
    mkdir -p $BACKUP_DIR

    TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
    BACKUP_FILE="$BACKUP_DIR/smartsave_prod_$TIMESTAMP.sql"

    docker-compose -f docker-compose.prod.yml exec -T smartsave-db \
        pg_dump -U postgres smartsave_prod > $BACKUP_FILE

    # Compress backup
    gzip $BACKUP_FILE

    # Clean old backups (keep last 7 days)
    find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

    log_success "Database backup created: $BACKUP_FILE.gz"
}

# Show status
show_status() {
    log_info "Service Status:"
    docker-compose -f docker-compose.prod.yml ps

    log_info "\nApplication Logs:"
    docker-compose -f docker-compose.prod.yml logs --tail=20 smartsave-app

    log_info "\nHealth Check:"
    curl -s http://localhost/api/health | jq . 2>/dev/null || curl -s http://localhost/api/health
}

# Rollback deployment
rollback() {
    log_warning "Rolling back to previous deployment..."

    # Stop current deployment
    docker-compose -f docker-compose.prod.yml down

    # Start previous version (assuming you have a backup)
    log_info "Starting previous version..."
    # This would need to be implemented based on your backup strategy

    log_warning "Rollback completed. Please verify the application is working correctly."
}

# Main deployment process
main() {
    case "${1:-deploy}" in
        "deploy")
            check_prerequisites
            setup_ssl
            backup_database
            deploy
            health_check
            show_status
            ;;
        "status")
            show_status
            ;;
        "backup")
            backup_database
            ;;
        "rollback")
            rollback
            ;;
        "logs")
            docker-compose -f docker-compose.prod.yml logs -f
            ;;
        "restart")
            log_info "Restarting services..."
            docker-compose -f docker-compose.prod.yml restart
            health_check
            ;;
        "stop")
            log_info "Stopping services..."
            docker-compose -f docker-compose.prod.yml down
            ;;
        *)
            echo "Usage: $0 {deploy|status|backup|rollback|logs|restart|stop}"
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"
