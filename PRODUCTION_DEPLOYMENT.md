# 🚀 SmartSave Production Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying SmartSave Personal Finance Platform to production with enterprise-grade monitoring, security, and performance optimizations.

## 📋 Prerequisites

### System Requirements
- **Ubuntu 20.04+** or **CentOS 7+**
- **4GB RAM** (8GB recommended)
- **2 CPU cores** (4 cores recommended)
- **20GB storage** (50GB recommended for logs/backups)
- **Domain name** with DNS access
- **SSL certificate** (Let's Encrypt will be configured)

### Required Software
```bash
# Install Docker and Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install additional tools
sudo apt-get update
sudo apt-get install -y curl wget git ufw certbot nginx postgresql-client redis-tools
```

## ⚡ Quick Start Deployment

### 1. Clone and Setup
```bash
# Clone the repository
git clone <your-repo-url> smartsave
cd smartsave

# Make scripts executable
chmod +x setup-production.sh deploy.sh

# Run complete setup (generates secrets, SSL, monitoring)
./setup-production.sh all
```

### 2. Environment Configuration
```bash
# Copy environment template
cp .env.template .env.production

# Set your domain and email
export DOMAIN="yourdomain.com"
export EMAIL="admin@yourdomain.com"

# Edit the environment file with your values
nano .env.production

# Critical values to update:
# - DOMAIN: Your domain name
# - EMAIL: Admin email for SSL certificates
# - JWT_SECRET: Secure 64-character random string
# - DB_PASSWORD: Strong database password
# - REDIS_PASSWORD: Strong Redis password
# - API keys for payment processors
# - Email SMTP settings
```

### 3. Deploy Application
```bash
# Deploy the application
./deploy.sh deploy

# Check deployment status
./deploy.sh status
```

### 4. Configure DNS
Update your DNS records:
```
Type: A     Name: @          Value: YOUR_SERVER_IP
Type: A     Name: www        Value: YOUR_SERVER_IP
Type: A     Name: api        Value: YOUR_SERVER_IP
Type: A     Name: monitoring Value: YOUR_SERVER_IP
```

## 🔧 Detailed Setup Instructions

### Step 1: Domain and SSL Configuration
```bash
# Set your domain (replace with your actual domain)
export DOMAIN="yourdomain.com"
export EMAIL="admin@yourdomain.com"

# Generate SSL certificates
./setup-production.sh ssl
```

### Step 2: Security Configuration
```bash
# Setup firewall
./setup-production.sh firewall

# Review security audit checklist
cat SECURITY_AUDIT.md
```

### Step 3: Monitoring Setup
```bash
# Setup monitoring infrastructure
./setup-production.sh monitoring

# Access monitoring dashboard after deployment:
# https://monitoring.yourdomain.com
# Username: admin
# Password: admin_password (change in docker-compose.prod.yml)
```

### Step 4: Backup Configuration
```bash
# Setup automated backups
./setup-production.sh backups

# Test backup manually
./backup.sh
```

## 📊 Monitoring and Observability

### Accessing Monitoring Dashboards

1. **Grafana Dashboard**: https://monitoring.yourdomain.com
   - SmartSave Application Dashboard
   - System metrics (CPU, Memory, Disk)
   - Database performance
   - API response times

2. **Prometheus**: http://localhost:9090
   - Raw metrics collection
   - Alert rules configuration
   - Target health status

3. **Application Health**: https://api.yourdomain.com/health
   - System health status
   - Database connectivity
   - Service availability

### Key Metrics to Monitor

- **Response Time**: API response times (< 500ms target)
- **Error Rate**: < 1% error rate
- **Database Connections**: Monitor connection pool usage
- **Memory Usage**: < 80% memory utilization
- **CPU Usage**: < 70% CPU utilization
- **SSL Certificate Expiry**: > 30 days remaining

## 🔒 Security Configuration

### SSL/TLS Setup
- Automatic SSL certificate generation using Let's Encrypt
- Certificate auto-renewal configured
- HSTS headers enabled
- Secure cipher suites configured

### Firewall Configuration
```bash
# Only essential ports are open:
sudo ufw status
# Status: active
# 22/tcp (SSH)
# 80/tcp (HTTP)
# 443/tcp (HTTPS)
```

### Security Headers
```nginx
# Configured security headers:
X-Frame-Options: SAMEORIGIN
X-XSS-Protection: 1; mode=block
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer-when-downgrade
Content-Security-Policy: default-src 'self' ...
```

## 🚀 Performance Optimization

### Caching Strategy
- **Redis Cache**: 30-minute TTL for user data
- **API Response Caching**: 5-minute TTL for public data
- **Database Query Caching**: Automatic query result caching

### Database Optimization
- Connection pooling with 20 max connections
- Query optimization with strategic indexing
- Automatic query performance monitoring

### CDN and Static Assets
- Static assets served with 1-year cache headers
- Gzip compression enabled
- WebP image optimization (when implemented)

## 📈 Load Testing

### Running Load Tests
```bash
# Install Artillery
npm install -g artillery

# Run load tests
artillery run load-test.yml

# Generate performance report
artillery report report.json
```

### Performance Benchmarks
- **Target Response Time**: < 500ms for API calls
- **Target Throughput**: 1000 requests/minute
- **Target Error Rate**: < 1%
- **Target Availability**: 99.9% uptime

## 🔧 Maintenance and Operations

### Daily Operations
```bash
# Check system health
curl https://api.yourdomain.com/health

# View application logs
./deploy.sh logs

# Check monitoring alerts
# Visit Grafana dashboard for alerts
```

### Weekly Maintenance
```bash
# Update SSL certificates
sudo certbot renew

# Update Docker images
docker-compose -f docker-compose.prod.yml pull

# Rotate logs
sudo logrotate -f /etc/logrotate.d/smartsave

# Check disk usage
df -h
```

### Monthly Maintenance
```bash
# Security updates
sudo apt-get update && sudo apt-get upgrade

# Database maintenance
docker-compose -f docker-compose.prod.yml exec smartsave-db vacuumdb -U postgres --all

# Review monitoring metrics
# Check Grafana dashboards for trends
```

## 🚨 Troubleshooting

### Common Issues

#### Application Not Starting
```bash
# Check container status
./deploy.sh status

# View application logs
docker-compose -f docker-compose.prod.yml logs smartsave-app

# Check environment variables
cat .env.production
```

#### Database Connection Issues
```bash
# Check database connectivity
docker-compose -f docker-compose.prod.yml exec smartsave-db pg_isready -U postgres

# View database logs
docker-compose -f docker-compose.prod.yml logs smartsave-db
```

#### SSL Certificate Issues
```bash
# Check certificate validity
openssl x509 -in nginx/ssl/fullchain.pem -text -noout

# Renew certificates
sudo certbot renew
```

#### High Memory Usage
```bash
# Check memory usage
docker stats

# Restart services if needed
./deploy.sh restart
```

### Emergency Contacts
- **Technical Issues**: devops@yourcompany.com
- **Security Incidents**: security@yourcompany.com
- **Business Critical**: management@yourcompany.com

## 📋 Production Checklist

### Pre-Deployment
- [ ] Domain configured and DNS propagated
- [ ] SSL certificates generated
- [ ] Environment variables configured
- [ ] Database backups configured
- [ ] Monitoring alerts set up
- [ ] Security audit completed

### Post-Deployment
- [ ] Application accessible via HTTPS
- [ ] All API endpoints responding
- [ ] Monitoring dashboards accessible
- [ ] Backup system functional
- [ ] SSL certificate valid
- [ ] Performance benchmarks met

### Ongoing Monitoring
- [ ] Daily health checks
- [ ] Weekly log review
- [ ] Monthly security updates
- [ ] Quarterly penetration testing

## 🎯 Success Metrics

### Technical Metrics
- **Uptime**: > 99.9%
- **Response Time**: < 500ms
- **Error Rate**: < 1%
- **Throughput**: > 1000 req/min

### Business Metrics
- **User Satisfaction**: > 95%
- **Conversion Rate**: > 10%
- **Data Security**: 100% compliant
- **Performance**: > 95% satisfaction

## 🔄 Rollback Procedures

### Emergency Rollback
```bash
# Stop current deployment
./deploy.sh stop

# Rollback to previous version
./deploy.sh rollback

# Verify rollback success
curl https://api.yourdomain.com/health
```

### Gradual Rollback
```bash
# Reduce traffic to new version
# Monitor error rates
# Complete rollback if issues persist
```

## 📞 Support and Documentation

### Documentation
- [API Documentation](./docs/api.md)
- [Security Audit](./SECURITY_AUDIT.md)
- [Monitoring Guide](./docs/monitoring.md)
- [Troubleshooting Guide](./docs/troubleshooting.md)

### Support Channels
- **Technical Support**: support@yourdomain.com
- **Bug Reports**: GitHub Issues
- **Feature Requests**: GitHub Discussions
- **Security Issues**: security@yourdomain.com

---

## 🎉 Deployment Complete!

Your SmartSave Personal Finance Platform is now running in production with:

✅ **Enterprise-grade monitoring** with Prometheus & Grafana
✅ **Production-ready security** with SSL, firewalls, and rate limiting
✅ **High-performance caching** with Redis
✅ **Automated backups** and disaster recovery
✅ **Comprehensive logging** with Loki and Promtail
✅ **Load balancing** and scalability ready

**Access your application at: https://www.yourdomain.com**
**API endpoints: https://www.yourdomain.com/api/**
**Health check: https://www.yourdomain.com/api/health**

**Monitoring Access:**
- **Grafana**: Internal network only (Port 3000) - Access via VPN or bastion host
- **Prometheus**: Internal network only (Port 9090) - Access via VPN or bastion host
- **Production Security**: Monitoring services are intentionally not exposed externally

Welcome to production! 🚀
