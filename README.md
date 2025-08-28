# 🚀 SmartSave Personal Finance Platform

A comprehensive personal finance website designed to encourage saving behavior through psychological nudges and intuitive UI/UX. Built with Next.js 14, TypeScript, PostgreSQL, and modern web technologies.

![SmartSave Logo](https://img.shields.io/badge/SmartSave-1.0.0-blue?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-14.0-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue?style=for-the-badge&logo=postgresql)
![Docker](https://img.shields.io/badge/Docker-Ready-blue?style=for-the-badge&logo=docker)

## ✨ Features

### 💰 Core Financial Features
- **Budget Management**: Create, track, and manage budgets with categories
- **Transaction Tracking**: Record and categorize income and expenses
- **Savings Goals**: Set and track progress toward financial goals
- **Financial Insights**: AI-powered spending analysis and recommendations
- **Achievement System**: Gamified saving milestones and rewards

### 🎯 Psychological Features
- **Behavioral Nudges**: Gentle reminders and incentives for better saving habits
- **Progress Visualization**: Beautiful charts and progress indicators
- **Social Proof**: Community-driven saving challenges
- **Personalization**: Tailored recommendations based on spending patterns

### 🛠️ Technical Features
- **Real-time Updates**: Live data synchronization across devices
- **Offline Support**: Core functionality works without internet
- **Security**: Bank-level encryption and authentication
- **Performance**: Optimized for speed and scalability
- **Accessibility**: WCAG 2.1 AA compliant

## 🚀 Quick Start (Development)

### Prerequisites
- **Node.js 18+** - [Download here](https://nodejs.org/)
- **Docker & Docker Compose** - [Installation guide](https://docs.docker.com/get-docker/)
- **Git** - [Download here](https://git-scm.com/)

### 1. Clone and Setup
```bash
# Clone the repository
git clone <your-repo-url> smartsave
cd smartsave

# Make scripts executable
chmod +x scripts/dev-setup.sh scripts/generate-certs.sh

# Run complete development setup (recommended)
npm run dev:setup

# Or setup step-by-step
npm run env:setup          # Setup environment variables
npm run dev:full          # Complete development environment
```

### 2. Start Development Environment
```bash
# Start development server with Turbo
npm run dev

# Or with SSL certificates
npm run dev:ssl

# Or with debugging
npm run dev:debug
```

### 3. Access Your Application
- **Application**: http://localhost:3000
- **API Documentation**: http://localhost:3000/api/docs
- **Health Check**: http://localhost:3000/api/health
- **Monitoring**: http://localhost:3002 (admin/admin123)

## 📋 Development Scripts

### Core Development
```bash
npm run dev              # Start with Turbo mode
npm run dev:debug        # Start with Node.js inspector
npm run dev:ssl          # Start with HTTPS
npm run dev:watch        # Watch mode with app-only
npm run build            # Production build
npm run build:analyze    # Build with bundle analysis
npm run start            # Start production server
```

### Database Management
```bash
npm run db:setup         # Setup development database
npm run db:migrate       # Run database migrations
npm run db:seed          # Seed with test data
npm run db:reset         # Reset database completely
npm run db:drop          # Drop database
```

### Testing & Quality
```bash
npm run test             # Run all tests
npm run test:watch       # Tests in watch mode
npm run test:coverage    # Generate coverage report
npm run test:api         # Test API endpoints
npm run test:load        # Load testing with Artillery
npm run test:security    # Security tests
npm run test:e2e         # End-to-end tests
```

### Code Quality
```bash
npm run lint             # Check code style
npm run lint:fix         # Fix code style issues
npm run type-check       # TypeScript checking
npm run format           # Format code
npm run code:quality     # Run all quality checks
npm run security:check   # Security audit
```

### Docker Management
```bash
npm run docker:dev       # Start development environment
npm run docker:build     # Build development containers
npm run docker:logs      # View container logs
npm run docker:status    # Check container status
npm run docker:cleanup   # Clean up containers
```

### SSL & Certificates
```bash
npm run cert:generate    # Generate SSL certificates
npm run cert:setup       # Setup certificates and start SSL
```

## 🏗️ Architecture

### Tech Stack
- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS, Framer Motion
- **Backend**: Next.js API Routes, Node.js
- **Database**: PostgreSQL 15
- **Cache**: Redis 7
- **File Storage**: MinIO (S3-compatible)
- **Monitoring**: Prometheus, Grafana, Loki
- **Deployment**: Docker, Docker Compose

### Project Structure
```
SmartSave/
├── 📁 app/                    # Next.js App Router
│   ├── 📁 api/               # API Routes
│   ├── 📁 (auth)/            # Authentication pages
│   ├── 📁 dashboard/         # Dashboard pages
│   └── 📁 globals.css        # Global styles
├── 📁 components/            # React components
│   ├── 📁 ui/               # Reusable UI components
│   ├── 📁 forms/            # Form components
│   └── 📁 charts/           # Chart components
├── 📁 lib/                   # Utility libraries
│   ├── 📁 services/         # Business logic services
│   ├── 📁 validation/       # Data validation schemas
│   ├── 📁 middleware/       # Custom middleware
│   └── 📁 hooks/            # Custom React hooks
├── 📁 database/              # Database schemas and migrations
├── 📁 monitoring/            # Monitoring configuration
├── 📁 scripts/               # Development and deployment scripts
├── 📁 config/                # Configuration files
├── 📁 docs/                  # Documentation
└── 📁 public/               # Static assets
```

## 🔧 Configuration

### Environment Variables
Copy `config/dev.env` to `.env.local` and configure:

```bash
# Database
DATABASE_URL=postgresql://mybudget:password@localhost:5432/mybudget_dev

# Authentication
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret

# External APIs
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...

# Monitoring
GF_ADMIN_PASSWORD=your-grafana-password
```

### Development Configuration
- **Hot Reload**: Automatic code reloading
- **Type Checking**: Real-time TypeScript validation
- **ESLint**: Code quality and style checking
- **Prettier**: Code formatting
- **Bundle Analysis**: Build size optimization

### SSL Certificates (Development)
```bash
# Generate self-signed certificates
npm run cert:generate

# Start with SSL
npm run dev:ssl
```

## 🧪 Testing

### Running Tests
```bash
# All tests
npm test

# Specific test types
npm run test:unit         # Unit tests
npm run test:integration  # Integration tests
npm run test:e2e          # End-to-end tests
npm run test:api          # API tests

# Load testing
npm run test:load
```

### Test Coverage
```bash
npm run test:coverage
# Generates coverage report in ./coverage/
```

## 🚀 Deployment

### Production Setup
```bash
# Complete production setup
./setup-production.sh all

# Deploy application
./deploy.sh deploy

# Access production
https://yourdomain.com
```

### Docker Deployment
```bash
# Build production images
npm run docker:build:prod

# Start production environment
npm run docker:prod
```

## 📊 Monitoring & Analytics

### Development Monitoring
- **Grafana**: http://localhost:3002
- **Prometheus**: http://localhost:9090
- **Application Metrics**: Real-time performance data

### Production Monitoring
- **Health Checks**: Automated system monitoring
- **Error Tracking**: Sentry integration
- **Performance Monitoring**: Real-time metrics
- **Log Aggregation**: Centralized logging with Loki

## 🤝 Contributing

### Development Workflow
1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Setup** development environment (`npm run dev:setup`)
4. **Make** your changes
5. **Test** thoroughly (`npm run test`)
6. **Commit** your changes (`npm run git:commit`)
7. **Push** to the branch (`git push origin feature/amazing-feature`)
8. **Open** a Pull Request

### Code Quality
- Follow TypeScript best practices
- Write comprehensive tests
- Maintain code coverage above 80%
- Use semantic commit messages
- Follow ESLint and Prettier rules

## 📝 Documentation

### API Documentation
- **Swagger UI**: http://localhost:3000/api/docs
- **Health Check**: http://localhost:3000/api/health
- **OpenAPI Spec**: Available in `/api/docs.json`

### Guides
- [Development Guide](./DEVELOPMENT.md)
- [API Documentation](./docs/api.md)
- [Deployment Guide](./PRODUCTION_DEPLOYMENT.md)
- [Security Audit](./SECURITY_AUDIT.md)

## 🔒 Security

### Development Security
- **Environment Variables**: Never commit secrets
- **Input Validation**: Comprehensive data validation
- **SQL Injection**: Protected with parameterized queries
- **XSS Protection**: Sanitized user inputs
- **CSRF Protection**: Token-based protection

### Production Security
- **SSL/TLS**: Full HTTPS encryption
- **Rate Limiting**: API protection
- **Authentication**: JWT with refresh tokens
- **Authorization**: Role-based access control
- **Audit Logging**: Comprehensive security logging

## 🐛 Troubleshooting

### Common Issues

#### Port Conflicts
```bash
# Check what's using ports
sudo lsof -i :3000
sudo lsof -i :5432

# Kill conflicting processes
sudo kill -9 <PID>
```

#### Database Issues
```bash
# Reset development database
npm run db:reset

# Check database status
npm run docker:logs postgres
```

#### SSL Certificate Issues
```bash
# Regenerate certificates
npm run cert:generate

# Trust certificate in browser
# Visit: https://localhost:3000 and accept the security warning
```

### Getting Help
- **Documentation**: Check [docs/](./docs/) folder
- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-repo/discussions)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Next.js Team** for the amazing framework
- **Vercel** for hosting and deployment platform
- **Tailwind CSS** for utility-first CSS framework
- **PostgreSQL** for robust database management
- **Open Source Community** for incredible tools and libraries

## 📞 Support

- **Email**: support@smartsave.local
- **Documentation**: [SmartSave Docs](./docs/)
- **Community**: [GitHub Discussions](https://github.com/your-repo/discussions)

---

**Built with ❤️ by the SmartSave Team**

*Transforming personal finance management, one habit at a time.* 🚀