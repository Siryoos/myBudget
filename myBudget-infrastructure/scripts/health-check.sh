#!/bin/bash

# MyBudget Health Check Script

echo "==================================="
echo "MyBudget Infrastructure Health Check"
echo "==================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Function to check service health
check_service() {
    local service=$1
    local port=$2
    local endpoint=$3
    
    echo -n "Checking $service... "
    
    if nc -z localhost $port 2>/dev/null; then
        if [ -n "$endpoint" ]; then
            if curl -s -o /dev/null -w "%{http_code}" "http://localhost:$port$endpoint" | grep -q "200\|302"; then
                echo -e "${GREEN}✓ Healthy${NC}"
                return 0
            else
                echo -e "${YELLOW}⚠ Port open but endpoint not responding${NC}"
                return 1
            fi
        else
            echo -e "${GREEN}✓ Port open${NC}"
            return 0
        fi
    else
        echo -e "${RED}✗ Not responding${NC}"
        return 1
    fi
}

# Function to check Docker container
check_container() {
    local container=$1
    echo -n "Checking container $container... "
    
    if docker ps --format '{{.Names}}' | grep -q "^$container$"; then
        local status=$(docker inspect -f '{{.State.Health.Status}}' $container 2>/dev/null || echo "no-health-check")
        if [ "$status" = "healthy" ] || [ "$status" = "no-health-check" ]; then
            echo -e "${GREEN}✓ Running${NC}"
            return 0
        else
            echo -e "${YELLOW}⚠ Running but unhealthy${NC}"
            return 1
        fi
    else
        echo -e "${RED}✗ Not running${NC}"
        return 1
    fi
}

# Check Docker daemon
echo -n "Checking Docker daemon... "
if docker ps >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Running${NC}"
else
    echo -e "${RED}✗ Not running${NC}"
    exit 1
fi

echo ""
echo "Checking containers:"
echo "-------------------"

# Check all containers
check_container "mybudget-postgres"
check_container "mybudget-redis"
check_container "mybudget-storage"
check_container "mybudget-auth"
check_container "mybudget-smtp"
check_container "mybudget-proxy"
check_container "mybudget-prometheus"
check_container "mybudget-grafana"

echo ""
echo "Checking services:"
echo "-----------------"

# Check services
check_service "PostgreSQL" 5432
check_service "Redis" 6379
check_service "MinIO API" 9000 "/minio/health/live"
check_service "MinIO Console" 9001
check_service "Keycloak" 8080 "/auth/"
check_service "Nginx" 80
check_service "Prometheus" 9090 "/-/healthy"
check_service "Grafana" 3000 "/api/health"

echo ""
echo "Checking disk usage:"
echo "-------------------"

# Check disk usage
DISK_USAGE=$(df -h . | tail -1 | awk '{print $5}' | sed 's/%//')
echo -n "Disk usage: $DISK_USAGE% "
if [ $DISK_USAGE -lt 80 ]; then
    echo -e "${GREEN}✓ OK${NC}"
elif [ $DISK_USAGE -lt 90 ]; then
    echo -e "${YELLOW}⚠ Warning${NC}"
else
    echo -e "${RED}✗ Critical${NC}"
fi

echo ""
echo "Checking memory usage:"
echo "---------------------"

# Check memory usage
MEMORY_USAGE=$(free | grep Mem | awk '{print int($3/$2 * 100)}')
echo -n "Memory usage: $MEMORY_USAGE% "
if [ $MEMORY_USAGE -lt 80 ]; then
    echo -e "${GREEN}✓ OK${NC}"
elif [ $MEMORY_USAGE -lt 90 ]; then
    echo -e "${YELLOW}⚠ Warning${NC}"
else
    echo -e "${RED}✗ Critical${NC}"
fi

echo ""
echo "==================================="
echo "Health check completed"
echo "==================================="
