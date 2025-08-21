#!/bin/bash

# MyBudget Infrastructure Setup Script
set -e

echo "==================================="
echo "MyBudget Infrastructure Setup"
echo "==================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   echo -e "${RED}This script should not be run as root!${NC}"
   exit 1
fi

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo -e "\n${YELLOW}Checking prerequisites...${NC}"

if ! command_exists docker; then
    echo -e "${RED}Docker is not installed. Please install Docker first.${NC}"
    echo "Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

if ! command_exists docker; then
    echo -e "${RED}Docker is not installed. Please install Docker first.${NC}"
    echo "Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if docker compose is available
if ! docker compose version >/dev/null 2>&1; then
    echo -e "${RED}Docker Compose is not available. Please ensure Docker Compose v2 is installed.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Docker and Docker Compose are installed${NC}"

# Check Docker service
if ! sudo systemctl is-active --quiet docker; then
    echo -e "${YELLOW}Starting Docker service...${NC}"
    sudo systemctl start docker
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo -e "\n${YELLOW}Creating .env file...${NC}"
    cp .env.example .env
    echo -e "${GREEN}✓ Created .env file from template${NC}"
    echo -e "${YELLOW}⚠ Please edit .env file and set secure passwords!${NC}"
    read -p "Press Enter after editing .env file..."
fi

# Generate self-signed SSL certificates
if [ ! -f ssl/cert.pem ]; then
    echo -e "\n${YELLOW}Generating self-signed SSL certificates...${NC}"
    mkdir -p ssl
    openssl req -x509 -newkey rsa:4096 -keyout ssl/key.pem -out ssl/cert.pem \
        -days 365 -nodes -subj "/C=US/ST=State/L=City/O=MyBudget/CN=*.mybudget.local"
    echo -e "${GREEN}✓ SSL certificates generated${NC}"
fi

# Set proper permissions
echo -e "\n${YELLOW}Setting permissions...${NC}"
chmod 600 ssl/key.pem
chmod 644 ssl/cert.pem
chmod 600 .env
chmod +x scripts/*.sh

# Create necessary directories
echo -e "\n${YELLOW}Creating data directories...${NC}"
mkdir -p data/{postgres,redis,storage,keycloak,postal,prometheus,grafana,backups}
mkdir -p logs/{nginx,postal}

# Pull Docker images
echo -e "\n${YELLOW}Pulling Docker images...${NC}"
docker compose pull

# Initialize database
echo -e "\n${YELLOW}Starting database service...${NC}"
docker compose up -d postgres
echo "Waiting for PostgreSQL to be ready..."
sleep 10

# Start Redis
echo -e "\n${YELLOW}Starting Redis cache...${NC}"
docker compose up -d redis

# Verify services
echo -e "\n${YELLOW}Verifying services...${NC}"
docker compose ps

echo -e "\n${GREEN}==================================="
echo "Setup completed successfully!"
echo "===================================${NC}"
echo ""
echo "Next steps:"
echo "1. Start all services: docker compose up -d"
echo "2. Access services:"
echo "   - Keycloak: http://localhost:8080"
echo "   - MinIO: http://localhost:9000"
echo "   - MinIO Console: http://localhost:9001"
echo "   - Grafana: http://localhost:3000"
echo "   - Prometheus: http://localhost:9090"
echo ""
echo "3. Configure DNS entries in /etc/hosts:"
echo "   127.0.0.1 auth.mybudget.local"
echo "   127.0.0.1 storage.mybudget.local"
echo "   127.0.0.1 mail.mybudget.local"
echo ""
