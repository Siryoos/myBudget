#!/bin/bash

# MyBudget Infrastructure Deployment Script
# This script deploys the entire infrastructure stack

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo -e "${BLUE}==================================="
echo "MyBudget Infrastructure Deployment"
echo "===================================${NC}"

# Function to wait for service
wait_for_service() {
    local service=$1
    local port=$2
    local max_attempts=30
    local attempt=1
    
    echo -n "Waiting for $service to be ready..."
    while ! nc -z localhost $port 2>/dev/null; do
        if [ $attempt -eq $max_attempts ]; then
            echo -e "${RED} Failed${NC}"
            return 1
        fi
        sleep 2
        attempt=$((attempt + 1))
    done
    echo -e "${GREEN} Ready${NC}"
    return 0
}

# Phase 1: Foundation
echo -e "\n${YELLOW}Phase 1: Foundation Services${NC}"
echo "Starting PostgreSQL and Redis..."

docker compose up -d postgres redis
wait_for_service "PostgreSQL" 5432
wait_for_service "Redis" 6379

# Verify database initialization
echo -n "Verifying database initialization..."
sleep 5
if docker exec mybudget-postgres psql -U mybudget -d mybudget -c "SELECT 1" >/dev/null 2>&1; then
    echo -e "${GREEN} Success${NC}"
else
    echo -e "${RED} Failed${NC}"
    exit 1
fi

# Phase 2: Core Services
echo -e "\n${YELLOW}Phase 2: Core Services${NC}"
echo "Starting MinIO and Keycloak..."

docker compose up -d minio keycloak
wait_for_service "MinIO" 9000
wait_for_service "Keycloak" 8080

# Configure MinIO
echo -e "\n${YELLOW}Configuring MinIO...${NC}"
sleep 10
docker exec mybudget-storage mc alias set local http://localhost:9000 admin ${MINIO_ROOT_PASSWORD:-admin}
docker exec mybudget-storage mc mb local/mybudget-uploads || true
docker exec mybudget-storage mc mb local/mybudget-backups || true
docker exec mybudget-storage mc mb local/mybudget-static || true
echo -e "${GREEN}✓ MinIO buckets created${NC}"

# Phase 3: Supporting Services
echo -e "\n${YELLOW}Phase 3: Supporting Services${NC}"
echo "Starting SMTP, Nginx, and monitoring..."

docker compose up -d postfix nginx prometheus grafana backup

# Wait for all services
wait_for_service "Nginx" 80
wait_for_service "Prometheus" 9090
wait_for_service "Grafana" 3000

# Phase 4: Verification
echo -e "\n${YELLOW}Phase 4: Service Verification${NC}"

# Check all containers
echo -e "\nContainer Status:"
docker compose ps

# Run health check
if [ -f ./scripts/health-check.sh ]; then
    echo -e "\n${YELLOW}Running health check...${NC}"
    ./scripts/health-check.sh
fi

# Display access information
echo -e "\n${GREEN}==================================="
echo "Deployment Complete!"
echo "===================================${NC}"
echo ""
echo -e "${YELLOW}Service URLs:${NC}"
echo "• Keycloak:       http://localhost:8080"
echo "• MinIO Console:  http://localhost:9001"
echo "• Grafana:        http://localhost:3000"
echo "• Prometheus:     http://localhost:9090"
echo ""
echo -e "${YELLOW}With domain configuration:${NC}"
echo "• Auth:    https://auth.mybudget.local"
echo "• Storage: https://storage.mybudget.local"
echo "• Mail:    https://mail.mybudget.local"
echo ""
echo -e "${YELLOW}Default Credentials:${NC}"
echo "Check your .env file for admin passwords"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Configure DNS entries in /etc/hosts"
echo "2. Access Keycloak and create application realm"
echo "3. Configure MinIO access policies"
echo "4. Set up Grafana dashboards"
echo "5. Configure email DNS records"
