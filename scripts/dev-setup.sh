#!/bin/bash

# SmartSave Development Environment Setup Script
# This script sets up the complete development environment

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

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

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed. Please install Node.js 18+ first."
        exit 1
    fi

    # Check npm
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed. Please install npm first."
        exit 1
    fi

    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi

    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi

    # Check Node.js version
    NODE_VERSION=$(node -v | cut -d'.' -f1 | cut -d'v' -f2)
    if [ "$NODE_VERSION" -lt 18 ]; then
        log_error "Node.js version 18+ is required. Current version: $(node -v)"
        exit 1
    fi

    log_success "Prerequisites check passed"
}

# Setup environment variables
setup_environment() {
    log_info "Setting up environment variables..."

    # Copy development environment template
    if [ ! -f ".env.local" ]; then
        if [ -f "config/dev.env" ]; then
            cp config/dev.env .env.local
            log_success "Created .env.local from template"
        else
            log_warning "config/dev.env not found. Please create .env.local manually"
        fi
    else
        log_info ".env.local already exists"
    fi

    # Generate development secrets
    log_info "Generating development secrets..."

    # Generate JWT secrets for development
    JWT_SECRET=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
    JWT_REFRESH_SECRET=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)

    # Generate database passwords
    DB_PASSWORD=$(openssl rand -base64 16 | tr -d "=+/" | cut -c1-16)
    REDIS_PASSWORD=$(openssl rand -base64 16 | tr -d "=+/" | cut -c1-16)

    # Update .env.local with generated secrets
    if [ -f ".env.local" ]; then
        # Update JWT secrets
        sed -i.bak "s/dev-jwt-secret-key-change-this-in-production-but-keep-for-dev/${JWT_SECRET}/g" .env.local
        sed -i.bak "s/dev-jwt-refresh-secret-key-change-this-in-production-but-keep-for-dev/${JWT_REFRESH_SECRET}/g" .env.local

        # Update database password
        sed -i.bak "s/mybudget_dev_password/${DB_PASSWORD}/g" .env.local

        # Update Redis password
        sed -i.bak "s/redis_dev_password/${REDIS_PASSWORD}/g" .env.local

        rm .env.local.bak
        log_success "Updated .env.local with generated secrets"
    fi
}

# Install dependencies
install_dependencies() {
    log_info "Installing dependencies..."

    # Install npm dependencies
    npm ci

    # Install additional development tools
    if ! command -v artillery &> /dev/null; then
        log_info "Installing Artillery for load testing..."
        npm install -g artillery
    fi

    log_success "Dependencies installed"
}

# Setup database
setup_database() {
    log_info "Setting up development database..."

    # Start database services
    docker compose -f docker-compose.yml up -d postgres redis minio

    # Wait for services to be ready
    log_info "Waiting for database services to start..."
    sleep 10

    # Run database setup
    if [ -f "scripts/setup-database.ts" ]; then
        npm run db:setup
        npm run db:migrate
        npm run db:seed
        log_success "Database setup completed"
    else
        log_warning "Database setup script not found. Please run manually."
    fi
}

# Generate SSL certificates for development
generate_ssl_certs() {
    log_info "Generating SSL certificates for development..."

    # Create certs directory
    mkdir -p certs

    # Generate self-signed certificate
    openssl req -x509 -newkey rsa:4096 -keyout certs/localhost.key -out certs/localhost.crt -days 365 -nodes \
        -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"

    # Set proper permissions
    chmod 600 certs/localhost.key
    chmod 644 certs/localhost.crt

    log_success "SSL certificates generated"
}

# Setup development tools
setup_dev_tools() {
    log_info "Setting up development tools..."

    # Create necessary directories
    mkdir -p logs uploads backups

    # Setup git hooks
    if [ -f "package.json" ]; then
        npm run git:setup
    fi

    # Setup pre-commit hooks
    if [ -f ".husky/pre-commit" ]; then
        echo "npm run code:quality" > .husky/pre-commit
        chmod +x .husky/pre-commit
    fi

    log_success "Development tools configured"
}

# Setup monitoring (optional for development)
setup_monitoring() {
    log_info "Setting up development monitoring..."

    # Start monitoring services
    docker compose -f docker-compose.yml up -d prometheus grafana

    log_info "Monitoring services started:"
    log_info "  - Prometheus: http://localhost:9090"
    log_info "  - Grafana: http://localhost:3002 (admin/admin123)"
    log_success "Development monitoring configured"
}

# Create development documentation
create_dev_docs() {
    log_info "Creating development documentation..."

    cat > DEVELOPMENT.md << 'EOF'
# SmartSave Development Guide

## Quick Start

1. **Setup Development Environment:**
   ```bash
   npm run dev:setup
   npm run dev:full
   ```

2. **Start Development Server:**
   ```bash
   npm run dev
   ```

3. **Access Application:**
   - Application: http://localhost:3000
   - API Documentation: http://localhost:3000/api/docs
   - Monitoring: http://localhost:3002

## Development Scripts

### Core Development
- `npm run dev` - Start development server with Turbo
- `npm run dev:debug` - Start with Node.js inspector
- `npm run dev:ssl` - Start with HTTPS
- `npm run build` - Build for production
- `npm run build:analyze` - Build with bundle analysis

### Database Management
- `npm run db:setup` - Setup development database
- `npm run db:migrate` - Run database migrations
- `npm run db:seed` - Seed database with test data
- `npm run db:reset` - Reset database completely

### Testing
- `npm test` - Run all tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Generate coverage report
- `npm run test:api` - Test API endpoints
- `npm run test:load` - Run load tests

### Code Quality
- `npm run lint` - Check code style
- `npm run lint:fix` - Fix code style issues
- `npm run type-check` - TypeScript type checking
- `npm run format` - Format code
- `npm run code:quality` - Run all quality checks

### Docker Management
- `npm run docker:dev` - Start development environment
- `npm run docker:build` - Build development images
- `npm run docker:logs` - View container logs
- `npm run docker:status` - Check container status

## Environment Configuration

### Required Environment Variables
Copy `config/dev.env` to `.env.local` and update:

```bash
# Database
DATABASE_URL=postgresql://mybudget:your_password@localhost:5432/mybudget_dev
REDIS_URL=redis://:your_password@localhost:6379

# Authentication
JWT_SECRET=your-development-jwt-secret
JWT_REFRESH_SECRET=your-development-jwt-refresh-secret

# External APIs (optional)
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
```

## Development Features

### Hot Reload
- Automatic reload on file changes
- Fast refresh for React components
- Turbo mode for faster builds

### Debugging
- Node.js inspector support
- Source maps for debugging
- Error overlay in development

### Testing
- Unit tests with Jest
- Component tests with React Testing Library
- API integration tests
- Load testing with Artillery

### Monitoring
- Real-time performance metrics
- Error tracking and logging
- Database query monitoring
- API response time tracking

## API Development

### Available Endpoints
- `GET /api/health` - Health check
- `POST /api/auth/login` - User authentication
- `GET /api/goals` - List user goals
- `POST /api/goals` - Create new goal
- `GET /api/transactions` - List transactions
- `POST /api/transactions` - Create transaction

### API Documentation
Access Swagger documentation at: http://localhost:3000/api/docs

## Database Development

### Local Database
- PostgreSQL running on port 5432
- Database name: `mybudget_dev`
- Username: `mybudget`

### Database Tools
```bash
# Connect to database
psql postgresql://mybudget:password@localhost:5432/mybudget_dev

# View database schema
npm run db:migrate -- --dry-run

# Reset database
npm run db:reset
```

## Deployment

### Development Deployment
```bash
npm run docker:dev
```

### Production Build
```bash
npm run build
npm run docker:build:prod
```

## Troubleshooting

### Common Issues

1. **Port conflicts:**
   - Check if ports 3000, 5432, 6379 are available
   - Stop conflicting services: `sudo lsof -ti:3000 | xargs kill`

2. **Database connection:**
   - Ensure PostgreSQL is running: `docker ps`
   - Check database credentials in `.env.local`

3. **Redis connection:**
   - Ensure Redis is running: `docker ps`
   - Check Redis password in `.env.local`

4. **SSL certificate issues:**
   - Regenerate certificates: `npm run cert:generate`
   - Check certificate permissions

### Getting Help

- Check application logs: `npm run docker:logs`
- View monitoring: http://localhost:3002
- Check API health: http://localhost:3000/api/health
- Review documentation: `cat DEVELOPMENT.md`

## Performance Tips

1. **Enable Turbo mode** for faster builds
2. **Use hot reload** for faster development
3. **Monitor bundle size** with `npm run build:analyze`
4. **Optimize images** and static assets
5. **Use development caching** for better performance

## Security in Development

1. **Use strong passwords** even in development
2. **Enable HTTPS** for local development
3. **Validate all inputs** and sanitize data
4. **Test authentication** thoroughly
5. **Monitor for security issues** regularly

Happy coding! 🚀
EOF

    log_success "Development documentation created"
}

# Validate setup
validate_setup() {
    log_info "Validating development setup..."

    # Check if services are running
    if docker compose -f docker-compose.yml ps | grep -q "Up"; then
        log_success "Docker services are running"
    else
        log_warning "Docker services may not be running. Run: npm run docker:dev"
    fi

    # Check if environment file exists
    if [ -f ".env.local" ]; then
        log_success "Environment file exists"
    else
        log_warning "Environment file not found. Run: npm run env:setup"
    fi

    # Check if SSL certificates exist
    if [ -f "certs/localhost.crt" ] && [ -f "certs/localhost.key" ]; then
        log_success "SSL certificates exist"
    else
        log_warning "SSL certificates not found. Run: npm run cert:generate"
    fi

    log_success "Development setup validation completed"
}

# Main setup process
main() {
    log_info "🚀 Starting SmartSave Development Environment Setup"
    log_info "This will configure your complete development environment"

    case "${1:-all}" in
        "prerequisites")
            check_prerequisites
            ;;
        "environment")
            setup_environment
            ;;
        "dependencies")
            install_dependencies
            ;;
        "database")
            setup_database
            ;;
        "ssl")
            generate_ssl_certs
            ;;
        "tools")
            setup_dev_tools
            ;;
        "monitoring")
            setup_monitoring
            ;;
        "docs")
            create_dev_docs
            ;;
        "validate")
            validate_setup
            ;;
        "all")
            check_prerequisites
            setup_environment
            install_dependencies
            setup_database
            generate_ssl_certs
            setup_dev_tools
            setup_monitoring
            create_dev_docs
            validate_setup
            ;;
        *)
            echo "Usage: $0 {prerequisites|environment|dependencies|database|ssl|tools|monitoring|docs|validate|all}"
            exit 1
            ;;
    esac

    log_success "🎉 Development environment setup completed!"
    log_info ""
    log_info "Next steps:"
    log_info "1. Start development server: npm run dev"
    log_info "2. Access application: http://localhost:3000"
    log_info "3. View monitoring: http://localhost:3002"
    log_info "4. Check API health: http://localhost:3000/api/health"
    log_info "5. Read documentation: cat DEVELOPMENT.md"
}

# Run main function
main "$@"
