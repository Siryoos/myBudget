#!/bin/bash

# Docker Installation Script for MyBudget Infrastructure
set -e

echo "==================================="
echo "Docker Installation Helper"
echo "==================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Detect OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$NAME
    VER=$VERSION_ID
else
    echo -e "${RED}Cannot detect operating system${NC}"
    exit 1
fi

echo -e "Detected OS: ${YELLOW}$OS $VER${NC}\n"

# Function to install Docker on Ubuntu/Debian
install_docker_debian() {
    echo -e "${YELLOW}Installing Docker on $OS...${NC}"
    
    # Update package index
    sudo apt-get update
    
    # Install prerequisites
    sudo apt-get install -y \
        ca-certificates \
        curl \
        gnupg \
        lsb-release
    
    # Add Docker's official GPG key
    sudo mkdir -m 0755 -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    
    # Set up repository
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # Install Docker Engine
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    # Install Docker Compose standalone
    sudo curl -L "https://github.com/docker/compose/releases/download/v2.23.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
}

# Function to install Docker on RHEL/CentOS/Fedora
install_docker_rhel() {
    echo -e "${YELLOW}Installing Docker on $OS...${NC}"
    
    # Remove old versions
    sudo yum remove -y docker \
                      docker-client \
                      docker-client-latest \
                      docker-common \
                      docker-latest \
                      docker-latest-logrotate \
                      docker-logrotate \
                      docker-engine
    
    # Install prerequisites
    sudo yum install -y yum-utils
    
    # Set up repository
    sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
    
    # Install Docker Engine
    sudo yum install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    # Install Docker Compose standalone
    sudo curl -L "https://github.com/docker/compose/releases/download/v2.23.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
}

# Function to configure Docker post-installation
configure_docker() {
    echo -e "\n${YELLOW}Configuring Docker...${NC}"
    
    # Start Docker service
    sudo systemctl start docker
    sudo systemctl enable docker
    
    # Add current user to docker group
    sudo usermod -aG docker $USER
    
    echo -e "${GREEN}✓ Docker configured${NC}"
    echo -e "${YELLOW}NOTE: You need to log out and back in for group changes to take effect${NC}"
}

# Main installation logic
case $OS in
    "Ubuntu"|"Debian GNU/Linux")
        install_docker_debian
        configure_docker
        ;;
    "CentOS Linux"|"Red Hat Enterprise Linux"|"Fedora")
        install_docker_rhel
        configure_docker
        ;;
    *)
        echo -e "${RED}Unsupported operating system: $OS${NC}"
        echo "Please install Docker manually:"
        echo "https://docs.docker.com/engine/install/"
        exit 1
        ;;
esac

# Verify installation
echo -e "\n${YELLOW}Verifying installation...${NC}"

if command -v docker >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Docker installed successfully${NC}"
    docker --version
else
    echo -e "${RED}✗ Docker installation failed${NC}"
    exit 1
fi

if command -v docker-compose >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Docker Compose installed successfully${NC}"
    docker-compose --version
else
    echo -e "${RED}✗ Docker Compose installation failed${NC}"
    exit 1
fi

echo -e "\n${GREEN}==================================="
echo "Docker installation completed!"
echo "===================================${NC}"
echo ""
echo "Next steps:"
echo "1. Log out and back in to apply group changes"
echo "2. Run: docker run hello-world"
echo "3. Continue with MyBudget setup: ./setup.sh"