# Getting Started Guide

Welcome to SmartSave! This guide will help you get up and running with the personal finance management platform.

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: Version 18.0 or higher
- **npm** or **yarn**: Package manager
- **Git**: Version control system
- **Docker** (optional): For containerized deployment
- **PostgreSQL** (optional): For local development without Docker

## 🚀 Quick Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd smartsave-finance-platform
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Copy the example environment file and configure it:

```bash
# For development
cp env.example .env.local

# For production
cp env.production .env
```

Configure the following key variables:

```bash
# Database Configuration
DB_USER=postgres
DB_HOST=localhost
DB_NAME=mybudget
DB_PASSWORD=your_secure_password
DB_PORT=5432

# JWT Configuration
JWT_SECRET=your_super_secret_key_here
JWT_EXPIRES_IN=7d

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

### 4. Start Development Server

```bash
npm run dev
```

Your application will be available at [http://localhost:3000](http://localhost:3000)

## 🐳 Docker Setup (Recommended)

For a complete development environment with all services:

### 1. Automated Setup

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

### 2. Manual Docker Setup

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

### 3. Docker Services

The Docker setup includes:
- **PostgreSQL 15**: Primary database
- **Redis 7**: Caching and session storage
- **MinIO**: Object storage service
- **Keycloak 23**: Identity and access management
- **Backend API**: Node.js/Express backend
- **Frontend**: Next.js frontend application
- **Nginx**: Reverse proxy with SSL termination
- **Prometheus**: Metrics collection
- **Grafana**: Metrics visualization
- **Backup Service**: Automated backup management

## 🗄️ Database Setup

### With Docker (Recommended)

The database is automatically initialized when using Docker. If you need to reset:

```bash
# Reset database
docker compose down -v
docker compose up -d
```

### Manual PostgreSQL Setup

```bash
# Create database
createdb mybudget

# Run database setup script
npm run db:setup
```

## 🔧 Development Scripts

### Available Commands

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm start           # Start production server

# Code Quality
npm run lint        # Run ESLint
npm run type-check  # Run TypeScript type checking
npm run test        # Run tests
npm run test:watch  # Run tests in watch mode

# Database
npm run db:setup    # Setup database schema
npm run db:seed     # Seed with sample data
npm run db:reset    # Reset database

# Docker
npm run docker:up   # Start Docker services
npm run docker:down # Stop Docker services
npm run docker:logs # View service logs
```

## 🌐 Environment Configuration

### Development Environment

```bash
# .env.local
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mybudget_dev
DB_USER=postgres
DB_PASSWORD=dev_password
JWT_SECRET=dev_secret_key
```

### Production Environment

```bash
# .env
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://yourdomain.com
DB_HOST=your_db_host
DB_PORT=5432
DB_NAME=mybudget_prod
DB_USER=your_db_user
DB_PASSWORD=your_secure_password
JWT_SECRET=your_production_secret_key
```

## 🔐 Security Setup

### Environment File Security

```bash
# Restrict access to environment files
chmod 600 .env
chmod 600 docker.env

# Ensure only owner can read/write
chown $USER:$USER .env
chown $USER:$USER docker.env
```

### Git Security

```bash
# Add sensitive files to .gitignore
echo ".env" >> .gitignore
echo "docker.env" >> .gitignore
echo "*.pem" >> .gitignore
echo "*.key" >> .gitignore

# Verify they're ignored
git status
```

## 🧪 Testing Your Setup

### 1. Health Check

Visit the health check endpoint:
- **Frontend**: [http://localhost:3000/api/health](http://localhost:3000/api/health)
- **Backend**: [http://localhost:3001/api/health](http://localhost:3001/api/health)

### 2. Database Connection

Check database connectivity:
```bash
npm run db:test
```

### 3. API Endpoints

Test basic API functionality:
```bash
# Test authentication
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123"}'
```

## 🚨 Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>
```

#### Database Connection Issues
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Restart PostgreSQL
sudo systemctl restart postgresql
```

#### Docker Issues
```bash
# Check Docker status
docker info

# Restart Docker
sudo systemctl restart docker

# Clean up containers
docker system prune -a
```

#### Permission Issues
```bash
# Fix file permissions
chmod +x setup.sh
chmod +x scripts/*.sh

# Fix directory permissions
chmod 755 database/ logs/ uploads/
```

### Getting Help

If you encounter issues:

1. Check the [troubleshooting section](troubleshooting.md)
2. Review the [logs](logs/) directory
3. Check service status: `docker compose ps`
4. View service logs: `docker compose logs <service-name>`
5. Open an issue on GitHub with detailed error information

## 📚 Next Steps

Now that you have SmartSave running, explore:

- [Architecture Overview](architecture.md) - Understand the system design
- [Backend Development](backend-development.md) - Learn about API development
- [Frontend Development](frontend-development.md) - Understand the UI components
- [API Reference](api-reference.md) - Explore available endpoints
- [Implementation Guides](implementation-guides.md) - Learn about specific features

## 🔄 Updates and Maintenance

### Keeping Dependencies Updated

```bash
# Check for outdated packages
npm outdated

# Update packages
npm update

# Update to latest versions (use with caution)
npm install -g npm-check-updates
ncu -u
npm install
```

### Database Migrations

```bash
# Run migrations
npm run db:migrate

# Rollback migrations
npm run db:rollback
```

---

**Need help?** Check our [documentation index](../README.md#-documentation) or open an issue on GitHub.
