#!/bin/bash

# MyBudget Unified Configuration Setup Script
# This script sets up the unified Docker Compose configuration

set -e

echo "🚀 Setting up MyBudget Unified Configuration..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose and try again."
    exit 1
fi

print_status "Creating necessary directories..."

# Create directory structure
mkdir -p config/redis
mkdir -p config/prometheus
mkdir -p config/grafana/provisioning/datasources
mkdir -p config/keycloak/themes
mkdir -p database/init
mkdir -p database/backups
mkdir -p database/dev-data
mkdir -p logs/nginx
mkdir -p nginx/conf.d
mkdir -p nginx/ssl
mkdir -p uploads
mkdir -p data

print_success "Directory structure created"

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    print_status "Creating .env file from template..."
    if [ -f env.production ]; then
        cp env.production .env
        print_success ".env file created from production template"
        print_warning "Please review and update the .env file with your specific values"
    else
        print_error "env.production template not found. Please create .env file manually."
        exit 1
    fi
else
    print_status ".env file already exists"
fi

# Generate self-signed SSL certificate for development
if [ ! -f nginx/ssl/cert.pem ] || [ ! -f nginx/ssl/key.pem ]; then
    print_status "Generating self-signed SSL certificate for development..."
    mkdir -p nginx/ssl
    
    # Generate self-signed certificate
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout nginx/ssl/key.pem \
        -out nginx/ssl/cert.pem \
        -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost" \
        -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"
    
    print_success "Self-signed SSL certificate generated"
    print_warning "This certificate is for development only. Use proper certificates in production."
fi

# Set proper permissions
print_status "Setting proper permissions..."
chmod 600 nginx/ssl/key.pem
chmod 644 nginx/ssl/cert.pem
chmod 755 config/redis
chmod 755 config/prometheus
chmod 755 config/grafana

print_success "Permissions set"

# Create Redis configuration if it doesn't exist
if [ ! -f config/redis/redis.conf ]; then
    print_error "Redis configuration file not found. Please ensure config/redis/redis.conf exists."
    exit 1
fi

# Create Prometheus configuration if it doesn't exist
if [ ! -f config/prometheus/prometheus.yml ]; then
    print_error "Prometheus configuration file not found. Please ensure config/prometheus/prometheus.yml exists."
    exit 1
fi

# Create Grafana datasource configuration if it doesn't exist
if [ ! -f config/grafana/provisioning/datasources/datasource.yml ]; then
    print_error "Grafana datasource configuration not found. Please ensure config/grafana/provisioning/datasources/datasource.yml exists."
    exit 1
fi

# Validate Docker Compose configuration
print_status "Validating Docker Compose configuration..."
docker-compose config > /dev/null
print_success "Docker Compose configuration is valid"

# Show available commands
echo ""
print_success "Setup completed successfully!"
echo ""
echo "📋 Available commands:"
echo "  Production: docker-compose up -d"
echo "  Development: docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d"
echo "  View logs: docker-compose logs -f [service-name]"
echo "  Stop services: docker-compose down"
echo "  Rebuild: docker-compose build --no-cache"
echo ""
echo "🔐 Default credentials:"
echo "  PostgreSQL: mybudget_user / [check .env file]"
echo "  Redis: [check .env file]"
echo "  MinIO: minioadmin / [check .env file]"
echo "  Keycloak: admin / [check .env file]"
echo "  Grafana: admin / [check .env file]"
echo ""
echo "⚠️  IMPORTANT: Update the .env file with your specific values before starting services!"
echo "⚠️  Change all default passwords in production!"
echo ""
print_warning "For production deployment, ensure proper SSL certificates and security measures are in place."
