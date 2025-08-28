# 🔧 SmartSave Development Configuration Guide

## Overview

This comprehensive guide covers all development configurations for the SmartSave Personal Finance Platform. The development environment is optimized for productivity, debugging, and rapid iteration.

## 📋 Configuration Files Created

### Environment Configuration
- ✅ `config/dev.env` - Development environment variables template
- ✅ `.env.development` - Alternative development configuration
- ✅ Scripts to copy to `.env.local` for local development

### Development Tools
- ✅ `scripts/dev-setup.sh` - Complete development environment setup
- ✅ `scripts/generate-certs.sh` - SSL certificate generation for development
- ✅ Enhanced `package.json` with 25+ development scripts

### Configuration Files
- ✅ `next.config.dev.js` - Development-specific Next.js configuration
- ✅ `lib/middleware/development.ts` - Development middleware enhancements
- ✅ `docker-compose.yml` - Optimized development Docker configuration

### Documentation
- ✅ `README.md` - Updated with comprehensive development guide
- ✅ `DEVELOPMENT.md` - Detailed development documentation
- ✅ This configuration guide

## 🚀 Quick Start Commands

### One-Command Setup
```bash
# Complete development environment setup
npm run dev:setup

# Alternative: Manual setup
npm run env:setup          # Setup environment variables
npm run cert:generate      # Generate SSL certificates
npm run db:setup          # Setup development database
npm run dev:full          # Start full development environment
```

### Development Server Options
```bash
# Standard development (with Turbo)
npm run dev

# With debugging support
npm run dev:debug

# With SSL certificates
npm run dev:ssl

# App-only mode (faster for app directory)
npm run dev:watch
```

## 🛠️ Development Scripts Overview

### Core Development Scripts
| Script | Description | Use Case |
|--------|-------------|----------|
| `npm run dev` | Start with Turbo mode | Fast development builds |
| `npm run dev:debug` | Start with Node.js inspector | Debug server-side code |
| `npm run dev:ssl` | Start with HTTPS | Test SSL functionality |
| `npm run dev:watch` | Watch mode for app directory | Faster app router development |

### Database Scripts
| Script | Description | Use Case |
|--------|-------------|----------|
| `npm run db:setup` | Setup development database | Initial database setup |
| `npm run db:migrate` | Run migrations | Update database schema |
| `npm run db:seed` | Seed with test data | Populate test data |
| `npm run db:reset` | Reset database | Clean development state |

### Testing Scripts
| Script | Description | Use Case |
|--------|-------------|----------|
| `npm run test` | Run all tests | Comprehensive testing |
| `npm run test:watch` | Watch mode tests | Development testing |
| `npm run test:coverage` | Coverage report | Code quality metrics |
| `npm run test:api` | API endpoint tests | Backend testing |
| `npm run test:load` | Load testing | Performance validation |

### Code Quality Scripts
| Script | Description | Use Case |
|--------|-------------|----------|
| `npm run lint` | Check code style | Code consistency |
| `npm run lint:fix` | Fix style issues | Automated fixes |
| `npm run type-check` | TypeScript validation | Type safety |
| `npm run format` | Code formatting | Consistent formatting |
| `npm run code:quality` | All quality checks | Pre-commit validation |

### Docker Scripts
| Script | Description | Use Case |
|--------|-------------|----------|
| `npm run docker:dev` | Start dev environment | Full development stack |
| `npm run docker:build` | Build containers | Custom container builds |
| `npm run docker:logs` | View logs | Debugging containers |
| `npm run docker:status` | Container status | Health monitoring |
| `npm run docker:cleanup` | Clean containers | Resource management |

### SSL & Security Scripts
| Script | Description | Use Case |
|--------|-------------|----------|
| `npm run cert:generate` | Generate SSL certs | HTTPS development |
| `npm run cert:setup` | Setup certificates | SSL configuration |
| `npm run security:check` | Security audit | Vulnerability scanning |
| `npm run security:validate` | Security validation | Pre-deployment checks |

## 🔧 Environment Configuration

### Development Environment Variables
```bash
# Application Configuration
NODE_ENV=development
PORT=3000
NEXT_PUBLIC_API_URL=http://localhost:3000

# Database Configuration
DATABASE_URL=postgresql://mybudget:dev_password@localhost:5432/mybudget_dev
DB_PASSWORD=mybudget_dev_password

# Cache Configuration
REDIS_URL=redis://:redis_dev_password@localhost:6379
REDIS_PASSWORD=redis_dev_password

# Authentication
JWT_SECRET=dev-jwt-secret-key
JWT_REFRESH_SECRET=dev-jwt-refresh-secret-key

# Development Features
ENABLE_SWAGGER=true
ENABLE_DEBUG_LOGGING=true
ENABLE_HOT_RELOAD=true
```

### Environment Setup
```bash
# Option 1: Use setup script
npm run env:setup

# Option 2: Manual setup
cp config/dev.env .env.local
# Edit .env.local with your local settings
```

## 🐳 Docker Development Configuration

### Development Services
```yaml
# docker-compose.yml - Development Services
services:
  postgres:          # Database - Port: 5432 (internal)
  redis:            # Cache - Port: 6379 (internal)
  minio:            # Storage - Ports: 9000, 9001 (local access)
  frontend:         # App - Port: 3000 (main application)
  grafana:          # Monitoring - Port: 3002 (moved to avoid conflict)
  prometheus:       # Metrics - Port: 9090 (local monitoring)
```

### Access Points
- **Application**: http://localhost:3000
- **API Documentation**: http://localhost:3000/api/docs
- **Health Check**: http://localhost:3000/api/health
- **Monitoring**: http://localhost:3002 (admin/admin123)
- **MinIO Console**: http://localhost:9001 (minioadmin/minioadmin)

## 🔒 SSL Configuration (Development)

### Generate SSL Certificates
```bash
# Generate self-signed certificates
npm run cert:generate

# Start with SSL
npm run dev:ssl
```

### Certificate Details
- **Domain**: localhost
- **Validity**: 365 days
- **Location**: `./certs/`
- **Files**: `localhost.crt`, `localhost.key`, `localhost.pem`

### Trust Certificate (Browser)
1. Visit: https://localhost:3000
2. Accept security warning
3. Certificate is now trusted for development

## 📊 Monitoring & Debugging

### Development Monitoring
```bash
# Start monitoring services
npm run docker:dev

# Access monitoring
# Grafana: http://localhost:3002 (admin/admin123)
# Prometheus: http://localhost:9090
```

### Performance Monitoring
- **Bundle Analysis**: `npm run build:analyze`
- **Performance Profiling**: `npm run performance:profile`
- **Memory Monitoring**: Built-in development middleware
- **API Response Times**: Logged in development console

### Error Handling
- **Enhanced Error Pages**: Detailed error information in development
- **Stack Traces**: Full error context for debugging
- **Request Logging**: Comprehensive request/response logging
- **Development Middleware**: Custom error handling and overlays

## 🎯 Development Features

### Hot Reload & Fast Refresh
- **Turbo Mode**: Faster builds and reloads
- **Fast Refresh**: Instant UI updates
- **Hot Module Replacement**: CSS and component updates
- **TypeScript**: Real-time type checking

### Development Middleware
```typescript
// Enhanced development features
- Request logging with performance metrics
- API documentation generation
- Error overlay with detailed information
- Hot reload detection and optimization
- Performance monitoring and memory tracking
```

### Code Quality Tools
- **ESLint**: Code style and error checking
- **Prettier**: Code formatting
- **TypeScript**: Type checking and validation
- **Husky**: Git hooks for pre-commit checks
- **Lint Staged**: Run linters on staged files only

### Testing Infrastructure
- **Jest**: Unit testing framework
- **React Testing Library**: Component testing
- **Artillery**: Load testing
- **API Testing**: Automated endpoint testing
- **Coverage Reports**: Test coverage analysis

## 🚀 Advanced Development Workflows

### Full Development Workflow
```bash
# 1. Initial setup
npm run dev:setup

# 2. Start development
npm run dev

# 3. Run tests in watch mode (new terminal)
npm run test:watch

# 4. Monitor performance (new terminal)
npm run performance:monitor

# 5. Check code quality
npm run code:quality
```

### Production Build Testing
```bash
# Test production build locally
npm run build
npm run start

# Analyze bundle size
npm run build:analyze
```

### Database Development Workflow
```bash
# Reset and reseed database
npm run db:reset

# Run specific migrations
npm run db:migrate

# Check database status
npm run docker:logs postgres
```

### SSL Development Workflow
```bash
# Generate certificates
npm run cert:generate

# Start with SSL
npm run dev:ssl

# Test SSL endpoints
curl -k https://localhost:3000/api/health
```

## 🐛 Debugging Guide

### Server-Side Debugging
```bash
# Start with Node.js inspector
npm run dev:debug

# Connect debugger (Chrome DevTools)
# Visit: chrome://inspect
```

### Client-Side Debugging
- **React DevTools**: Browser extension
- **Redux DevTools**: State debugging
- **Network Tab**: API request monitoring
- **Console**: Development logging

### Database Debugging
```bash
# View database logs
npm run docker:logs postgres

# Connect to database
psql postgresql://mybudget:password@localhost:5432/mybudget_dev

# Query debugging
npm run db:migrate -- --dry-run
```

### Performance Debugging
```bash
# Bundle analysis
npm run build:analyze

# Performance profiling
npm run performance:profile

# Memory monitoring
# Check development console for memory metrics
```

## 📈 Performance Optimization

### Development Optimizations
- **Turbo Mode**: Faster builds and rebuilds
- **Bundle Splitting**: Optimized chunk loading
- **Image Optimization**: Automatic WebP/AVIF conversion
- **CSS Optimization**: Tailwind CSS purging
- **Font Optimization**: Automatic font loading

### Monitoring Performance
- **Real-time Metrics**: Development middleware tracking
- **Bundle Size**: Automatic bundle analysis
- **Memory Usage**: Heap monitoring and leak detection
- **API Performance**: Response time tracking

### Build Optimization
```bash
# Analyze bundle size
npm run build:analyze

# Optimize dependencies
npm run bundle:optimize

# Check performance
npm run performance:analyze
```

## 🔄 CI/CD Integration

### Pre-commit Hooks
```bash
# Setup git hooks
npm run git:setup

# Pre-commit checks
npm run precommit  # Runs code quality checks

# Pre-push checks
npm run prepush    # Runs tests before push
```

### CI/CD Scripts
```bash
# CI setup
npm run ci:setup

# Full CI pipeline
npm run ci:full

# Deployment preparation
npm run ci:deploy
```

## 📚 Documentation & Resources

### Development Documentation
- **README.md**: Main project documentation
- **DEVELOPMENT.md**: Detailed development guide
- **API Documentation**: http://localhost:3000/api/docs
- **Health Check**: http://localhost:3000/api/health

### External Resources
- **Next.js Docs**: https://nextjs.org/docs
- **TypeScript Handbook**: https://typescriptlang.org/docs
- **Tailwind CSS**: https://tailwindcss.com/docs
- **PostgreSQL Docs**: https://postgresql.org/docs

## 🔧 Troubleshooting

### Common Issues & Solutions

#### Port Conflicts
```bash
# Check port usage
sudo lsof -i :3000

# Kill conflicting processes
sudo kill -9 $(sudo lsof -ti :3000)

# Alternative: Use different port
PORT=3001 npm run dev
```

#### Database Connection Issues
```bash
# Reset database
npm run db:reset

# Check database status
npm run docker:logs postgres

# Test connection
psql postgresql://mybudget:password@localhost:5432/mybudget_dev
```

#### SSL Certificate Issues
```bash
# Regenerate certificates
npm run cert:generate

# Check certificate files
ls -la certs/

# Restart with SSL
npm run dev:ssl
```

#### Performance Issues
```bash
# Clear cache and rebuild
rm -rf .next node_modules/.cache
npm run dev

# Check bundle size
npm run build:analyze
```

### Getting Help
1. **Check Logs**: `npm run docker:logs`
2. **View Documentation**: `cat DEVELOPMENT.md`
3. **Run Diagnostics**: `npm run env:validate`
4. **Check Health**: `curl http://localhost:3000/api/health`

## 🎯 Best Practices

### Development Workflow
1. **Use Feature Branches**: Always work on feature branches
2. **Write Tests First**: TDD approach for better code quality
3. **Commit Frequently**: Small, frequent commits
4. **Code Reviews**: Always review code before merging
5. **Documentation**: Update docs with code changes

### Code Quality
1. **Type Safety**: Use TypeScript strictly
2. **Consistent Style**: Follow ESLint and Prettier rules
3. **Performance**: Monitor and optimize bundle size
4. **Security**: Validate inputs and use secure practices
5. **Testing**: Maintain high test coverage

### Environment Management
1. **Local Setup**: Use `.env.local` for local overrides
2. **Never Commit Secrets**: Keep secrets out of version control
3. **Environment Parity**: Keep environments as similar as possible
4. **Documentation**: Document environment setup and configuration

## 🚀 Production Readiness

### Pre-deployment Checklist
- [ ] All tests passing: `npm test`
- [ ] Code quality checks: `npm run code:quality`
- [ ] Security audit: `npm run security:check`
- [ ] Bundle analysis: `npm run build:analyze`
- [ ] Environment validation: `npm run env:validate`

### Deployment Commands
```bash
# Production build
npm run build

# Production deployment
npm run docker:build:prod
npm run docker:prod
```

---

## 🎉 Development Environment Ready!

Your SmartSave development environment is now fully configured with:

✅ **25+ Development Scripts** - Comprehensive development workflow
✅ **Enhanced Hot Reload** - Turbo mode and fast refresh
✅ **SSL Support** - HTTPS development capabilities
✅ **Monitoring Stack** - Grafana, Prometheus, and Loki
✅ **Testing Suite** - Unit, integration, and load testing
✅ **Code Quality Tools** - ESLint, Prettier, TypeScript
✅ **Docker Integration** - Complete containerized environment
✅ **Performance Monitoring** - Bundle analysis and optimization
✅ **Security Features** - Development security best practices
✅ **Comprehensive Documentation** - Guides and troubleshooting

**🚀 Happy coding! Start with `npm run dev:setup`**

---

*Development Configuration Version: 2.0*
*Last Updated: $(date)*
*Environment: Development Ready*
