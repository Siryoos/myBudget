# MyBudget - Personal Finance Management Application

[![Security](https://img.shields.io/badge/Security-A%2B-brightgreen)](https://securityheaders.com)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0%2B-blue.svg)](https://www.typescriptlang.org)

> **Enterprise-grade personal finance management with advanced security, comprehensive validation, and production-ready architecture.**

## 🚀 Features

### 💰 Financial Management
- **Transaction Tracking**: Income and expense management with categorization
- **Budget Planning**: Multiple budgeting methods (50-30-20, envelope, zero-based)
- **Savings Goals**: Goal tracking with milestones and automation
- **Financial Analytics**: Comprehensive reporting and insights
- **Multi-Currency**: Support for various currencies and exchange rates

### 🔒 Security Features
- **JWT Authentication**: Secure token-based authentication with refresh
- **Rate Limiting**: Comprehensive API protection against abuse
- **Input Validation**: XSS prevention and data sanitization
- **Security Headers**: Complete OWASP security header implementation
- **Role-Based Access**: Granular permission system
- **Audit Logging**: Complete user action tracking

### 🏗️ Architecture
- **Next.js 14**: Modern React framework with App Router
- **TypeScript**: Full type safety and compile-time validation
- **PostgreSQL**: Robust relational database with encryption
- **Redis**: High-performance caching and rate limiting
- **Docker**: Containerized deployment with production configs
- **ESLint**: Comprehensive code quality and security rules

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Installation](#installation)
- [Configuration](#configuration)
- [Development](#development)
- [Security](#security)
- [Deployment](#deployment)
- [API Documentation](#api-documentation)
- [Contributing](#contributing)
- [Support](#support)

## 🚀 Quick Start

### Prerequisites

- **Node.js**: 18.0.0 or higher
- **Docker**: 20.10.0 or higher
- **Git**: Latest version

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/mybudget.git
cd mybudget
```

### 2. Environment Setup

```bash
# Copy environment template
cp .env.example .env.local

# Edit environment variables
nano .env.local
```

### 3. Start Services

```bash
# Start database and Redis
docker-compose -f docker-compose.dev.yml up -d

# Install dependencies
npm install

# Run database setup
npm run db:setup

# Start development server
npm run dev
```

### 4. Access Application

- **Frontend**: http://localhost:3000
- **API**: http://localhost:3001/api/health
- **Database**: PostgreSQL on localhost:5432
- **Redis**: Redis on localhost:6379

## 📦 Installation

### Option 1: Docker (Recommended)

```bash
# Clone repository
git clone https://github.com/yourusername/mybudget.git
cd mybudget

# Start all services
docker-compose up -d

# Check status
docker-compose ps
```

### Option 2: Manual Installation

```bash
# Install Node.js dependencies
npm install

# Install PostgreSQL
sudo apt-get install postgresql postgresql-contrib

# Install Redis
sudo apt-get install redis-server

# Setup database
npm run db:setup

# Start application
npm run dev
```

### Option 3: Development with Docker Services

```bash
# Start only database and Redis
docker-compose -f docker-compose.dev.yml up -d

# Run application locally
npm install
npm run dev
```

## ⚙️ Configuration

### Environment Variables

Create a `.env.local` file with the following variables:

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

### Security Configuration

The application includes comprehensive security features:

- **Content Security Policy**: XSS protection with nonce-based script execution
- **Rate Limiting**: Configurable limits per endpoint type
- **Input Validation**: Zod schema validation with sanitization
- **Authentication**: JWT with refresh token rotation
- **Authorization**: Role-based access control (RBAC)

## 🛠️ Development

### Project Structure

```
mybudget/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── (auth)/            # Authentication pages
│   ├── dashboard/         # Dashboard pages
│   └── globals.css        # Global styles
├── components/            # Reusable React components
├── lib/                   # Utility libraries
│   ├── api-validation.ts  # Input validation
│   ├── auth.ts           # Authentication utilities
│   ├── database.ts       # Database connection
│   └── redis.ts          # Redis connection
├── middleware/            # Next.js middleware
│   ├── security.ts       # Security headers
│   └── locale.ts         # Internationalization
├── types/                 # TypeScript type definitions
├── docs/                  # Documentation
└── docker-compose.yml     # Docker configuration
```

### Available Scripts

```bash
# Development
npm run dev              # Start development server
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint issues

# Database
npm run db:setup         # Setup database and tables
npm run db:migrate       # Run database migrations
npm run db:seed          # Seed initial data
npm run db:reset         # Reset database

# Testing
npm run test             # Run unit tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Generate coverage report

# Security
npm run security:check   # Run security validation
npm run audit            # Audit dependencies
```

### Code Quality

The project uses comprehensive code quality tools:

- **ESLint**: TypeScript-aware linting with security rules
- **Prettier**: Code formatting
- **TypeScript**: Strict type checking
- **Security Scanning**: Automated vulnerability detection

## 🔒 Security

### Security Features

- ✅ **OWASP Top 10 Protection**: All critical vulnerabilities addressed
- ✅ **Input Validation**: Comprehensive XSS and injection prevention
- ✅ **Rate Limiting**: DoS attack protection
- ✅ **Security Headers**: Complete security header implementation
- ✅ **Authentication**: Secure JWT with refresh token rotation
- ✅ **Authorization**: Role-based access control
- ✅ **Audit Logging**: Complete user action tracking
- ✅ **Data Encryption**: At-rest and in-transit encryption

### Security Testing

```bash
# Run security checks
npm run security:check

# Run vulnerability scan
npm audit

# Test security headers
curl -I http://localhost:3001/api/health
```

### Security Documentation

- [Security Documentation](docs/SECURITY.md) - Comprehensive security guide
- [Threat Model](docs/SECURITY.md#threat-model) - Security threat analysis
- [Incident Response](docs/SECURITY.md#incident-response) - Security incident procedures

## 🚀 Deployment

### Production Deployment

The application includes production-ready Docker configurations:

```bash
# Production deployment
docker-compose -f docker-compose.prod.yml up -d --build

# Check status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f app
```

### Deployment Features

- **Multi-stage Docker builds** for optimized images
- **Health checks** for all services
- **Nginx reverse proxy** with SSL termination
- **Automatic restarts** and failover
- **Resource limits** and monitoring
- **Backup and recovery** procedures

### Deployment Documentation

- [Deployment Guide](docs/DEPLOYMENT.md) - Complete deployment instructions
- [Docker Configuration](docs/DEPLOYMENT.md#docker-production-deployment) - Production Docker setup
- [Monitoring & Logging](docs/DEPLOYMENT.md#monitoring--logging) - Production monitoring

## 📚 API Documentation

### API Overview

The MyBudget API provides comprehensive endpoints for:

- **Authentication**: Login, logout, token refresh
- **Transactions**: CRUD operations with filtering
- **Budgets**: Budget management and tracking
- **Goals**: Savings goal management
- **Analytics**: Financial reporting and insights

### API Features

- **RESTful Design**: Standard HTTP methods and status codes
- **JWT Authentication**: Secure token-based authentication
- **Rate Limiting**: Configurable limits per endpoint
- **Input Validation**: Comprehensive request validation
- **Error Handling**: Consistent error response format
- **Pagination**: Standard pagination for list endpoints

### API Documentation

- [Complete API Reference](docs/API.md) - Full API documentation
- [Authentication Guide](docs/API.md#authentication) - JWT authentication details
- [Error Handling](docs/API.md#error-handling) - Error response format

## 🧪 Testing

### Test Coverage

The project includes comprehensive testing:

- **Unit Tests**: Component and utility testing
- **Integration Tests**: API endpoint testing
- **Security Tests**: Authentication and authorization testing
- **Performance Tests**: Load and stress testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run specific test suites
npm test -- --testPathPattern=auth
```

## 📊 Monitoring & Performance

### Application Monitoring

- **Health Checks**: Comprehensive service health monitoring
- **Performance Metrics**: Response time and throughput tracking
- **Error Tracking**: Centralized error logging and alerting
- **Security Monitoring**: Threat detection and incident response

### Performance Features

- **Redis Caching**: High-performance data caching
- **Database Optimization**: Query optimization and indexing
- **CDN Integration**: Static asset delivery optimization
- **Load Balancing**: Horizontal scaling support

## 🤝 Contributing

### Contributing Guidelines

We welcome contributions! Please read our contributing guidelines:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes** with proper testing
4. **Run quality checks**: `npm run lint && npm test`
5. **Submit a pull request**

### Development Standards

- **Code Style**: Follow ESLint and Prettier configuration
- **Testing**: Include tests for new features
- **Documentation**: Update relevant documentation
- **Security**: Follow security best practices
- **Performance**: Consider performance implications

### Code of Conduct

This project adheres to a code of conduct. Please be respectful and inclusive in all interactions.

## 📞 Support

### Getting Help

- **Documentation**: [docs/](docs/) - Comprehensive guides
- **Issues**: [GitHub Issues](https://github.com/yourusername/mybudget/issues) - Bug reports and feature requests
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/mybudget/discussions) - Community support
- **Email**: support@mybudget.com - Direct support

### Community

- **Discord**: [Join our community](https://discord.gg/mybudget)
- **Twitter**: [@MyBudgetApp](https://twitter.com/MyBudgetApp)
- **Blog**: [Latest updates and tips](https://blog.mybudget.com)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Next.js Team** for the amazing framework
- **Vercel** for hosting and deployment tools
- **PostgreSQL** for the robust database
- **Redis** for high-performance caching
- **Open Source Community** for inspiration and tools

## 📈 Roadmap

### Upcoming Features

- [ ] **Multi-Factor Authentication** (MFA)
- [ ] **Advanced Analytics** with ML insights
- [ ] **Mobile App** (React Native)
- [ ] **API Webhooks** for integrations
- [ ] **Advanced Reporting** with custom dashboards
- [ ] **Team Budgets** for shared finances

### Performance Improvements

- [ ] **GraphQL API** for efficient data fetching
- [ ] **Service Worker** for offline support
- [ ] **Advanced Caching** strategies
- [ ] **Database Sharding** for scale

---

**Made with ❤️ by the MyBudget Team**

For questions, suggestions, or contributions, please reach out to us!
