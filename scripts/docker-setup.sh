#!/bin/bash

# MyBudget Docker Setup Script
# This script helps you set up and manage the Docker environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is installed
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    # Check if Docker Compose plugin is available
    if ! docker compose version &> /dev/null; then
        print_error "Docker Compose plugin is not available. Please install Docker Compose plugin first."
        print_error "Run: sudo apt-get install docker-compose-plugin"
        exit 1
    fi
    
    print_success "Docker and Docker Compose plugin are available"
}

# Check if Docker daemon is running
check_docker_daemon() {
    if ! docker info &> /dev/null; then
        print_error "Docker daemon is not running. Please start Docker first."
        exit 1
    fi
    
    print_success "Docker daemon is running"
}

# Create necessary directories
create_directories() {
    print_status "Creating necessary directories..."
    
    mkdir -p database/backups
    mkdir -p logs
    mkdir -p uploads
    mkdir -p nginx/logs
    mkdir -p nginx/ssl
    
    print_success "Directories created"
}

# Generate environment file
generate_env() {
    if [ ! -f .env ]; then
        print_status "Generating .env file from docker.env.example..."
        cp docker.env.example .env
        
        # Generate new complex passwords
        print_status "Generating new complex passwords..."
        
        # Generate database password
        DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
        sed -i "s/DB_PASSWORD=.*/DB_PASSWORD=$DB_PASSWORD/" .env
        
        # Generate Redis password
        REDIS_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
        sed -i "s/REDIS_PASSWORD=.*/REDIS_PASSWORD=$REDIS_PASSWORD/" .env
        
        # Generate JWT secret
        JWT_SECRET=$(openssl rand -base64 64 | tr -d "=+/" | cut -c1-50)
        sed -i "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" .env
        
        # Generate session secret
        SESSION_SECRET=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
        sed -i "s/SESSION_SECRET=.*/SESSION_SECRET=$SESSION_SECRET/" .env
        
        print_success ".env file generated with new passwords"
        print_warning "Please review and update the .env file as needed"
    else
        print_status ".env file already exists"
    fi
}

# Build and start services
start_services() {
    print_status "Building and starting Docker services..."
    
    # Build images
    docker compose build
    
    # Start services
    docker compose up -d
    
    print_success "Services started successfully"
}

# Wait for services to be healthy
wait_for_services() {
    print_status "Waiting for services to be healthy..."
    
    # Wait for database
    print_status "Waiting for database..."
    timeout=60
    while [ $timeout -gt 0 ]; do
        if docker compose exec -T postgres pg_isready -U mybudget_user -d mybudget &> /dev/null; then
            print_success "Database is ready"
            break
        fi
        sleep 2
        timeout=$((timeout - 2))
    done
    
    if [ $timeout -le 0 ]; then
        print_error "Database failed to start within 60 seconds"
        exit 1
    fi
    
    # Wait for backend
    print_status "Waiting for backend..."
    timeout=60
    while [ $timeout -gt 0 ]; do
        if curl -f http://localhost:3001/health &> /dev/null; then
            print_success "Backend is ready"
            break
        fi
        sleep 2
        timeout=$((timeout - 2))
    done
    
    if [ $timeout -le 0 ]; then
        print_error "Backend failed to start within 60 seconds"
        exit 1
    fi
    
    # Wait for frontend
    print_status "Waiting for frontend..."
    timeout=60
    while [ $timeout -gt 0 ]; do
        if curl -f http://localhost:3000 &> /dev/null; then
            print_success "Frontend is ready"
            break
        fi
        sleep 2
        timeout=$((timeout - 2))
    done
    
    if [ $timeout -le 0 ]; then
        print_error "Frontend failed to start within 60 seconds"
        exit 1
    fi
}

# Show service status
show_status() {
    print_status "Service status:"
    docker compose ps
    
    echo ""
    print_status "Service URLs:"
    echo "Frontend: http://localhost:3000"
    echo "Backend API: http://localhost:3001"
    echo "Database: localhost:5432"
    echo "Redis: localhost:6379"
    echo "Nginx: http://localhost:80"
}

# Main setup function
setup() {
    print_status "Starting MyBudget Docker setup..."
    
    check_docker
    check_docker_daemon
    create_directories
    generate_env
    start_services
    wait_for_services
    show_status
    
    print_success "Setup completed successfully!"
    echo ""
    print_status "Next steps:"
    echo "1. Open http://localhost:3000 in your browser"
    echo "2. Use demo@mybudget.com / DemoPassword123! to login"
    echo "3. Test the API at http://localhost:3001/health"
    echo ""
    print_status "Useful commands:"
    echo "  docker-compose logs -f [service]  # View logs"
    echo "  docker-compose down               # Stop services"
    echo "  docker-compose up -d              # Start services"
    echo "  docker-compose restart [service]  # Restart a service"
}

# Function to stop services
stop_services() {
    print_status "Stopping Docker services..."
    docker compose down
    print_success "Services stopped"
}

# Function to restart services
restart_services() {
    print_status "Restarting Docker services..."
    docker compose restart
    print_success "Services restarted"
}

# Function to view logs
view_logs() {
    service=${1:-""}
    if [ -z "$service" ]; then
        docker compose logs -f
    else
        docker compose logs -f "$service"
    fi
}

# Function to clean up
cleanup() {
    print_warning "This will remove all containers, volumes, and images. Are you sure? (y/N)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
            print_status "Cleaning up Docker environment..."
    docker compose down -v --rmi all
        print_success "Cleanup completed"
    else
        print_status "Cleanup cancelled"
    fi
}

# Main script logic
case "${1:-setup}" in
    "setup")
        setup
        ;;
    "start")
        start_services
        ;;
    "stop")
        stop_services
        ;;
    "restart")
        restart_services
        ;;
    "logs")
        view_logs "$2"
        ;;
    "cleanup")
        cleanup
        ;;
    "status")
        show_status
        ;;
    *)
        echo "Usage: $0 {setup|start|stop|restart|logs|cleanup|status}"
        echo ""
        echo "Commands:"
        echo "  setup    - Complete setup (default)"
        echo "  start    - Start services"
        echo "  stop     - Stop services"
        echo "  restart  - Restart services"
        echo "  logs     - View logs (optionally specify service)"
        echo "  cleanup  - Remove all containers and volumes"
        echo "  status   - Show service status"
        exit 1
        ;;
esac
