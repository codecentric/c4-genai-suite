#!/bin/bash

# Docker Development Helper Script
# Hilft dabei, Docker-Cache-Probleme zu vermeiden

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

# Function to show help
show_help() {
    echo "Docker Development Helper Script"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  start-dev     Start development environment with hot-reload"
    echo "  start-prod    Start production environment"
    echo "  rebuild       Force rebuild frontend (clears cache)"
    echo "  clean         Clean all Docker resources"
    echo "  logs          Show frontend logs"
    echo "  shell         Open shell in frontend container"
    echo "  help          Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 start-dev   # Start with hot-reload for development"
    echo "  $0 rebuild     # Force rebuild when changes don't appear"
    echo "  $0 clean       # Clean everything when having issues"
}

# Function to start development environment
start_dev() {
    print_status "Starting development environment with hot-reload..."
    
    if [ -f "docker-compose-dev-hotreload.yml" ]; then
        docker-compose -f docker-compose-dev-hotreload.yml up -d
        print_success "Development environment started!"
        print_status "Frontend available at: http://localhost:3333"
        print_status "Changes to frontend/src will be automatically reloaded"
    else
        print_error "docker-compose-dev-hotreload.yml not found!"
        exit 1
    fi
}

# Function to start production environment
start_prod() {
    print_status "Starting production environment..."
    docker-compose -f docker-compose-dev.yml up -d
    print_success "Production environment started!"
    print_status "Frontend available at: http://localhost:3333"
}

# Function to force rebuild frontend
rebuild_frontend() {
    print_warning "Force rebuilding frontend (this will take a few minutes)..."
    
    # Stop containers
    print_status "Stopping containers..."
    docker-compose -f docker-compose-dev.yml down c4-frontend 2>/dev/null || true
    
    # Remove old image
    print_status "Removing old frontend image..."
    docker rmi c4-genai-suite-c4-frontend 2>/dev/null || true
    
    # Build new image
    print_status "Building new frontend image..."
    docker-compose -f docker-compose-dev.yml build c4-frontend --no-cache
    
    # Start container
    print_status "Starting frontend container..."
    docker-compose -f docker-compose-dev.yml up c4-frontend -d
    
    print_success "Frontend rebuilt and started!"
    print_status "Frontend available at: http://localhost:3333"
    print_warning "Clear your browser cache (Ctrl+F5) to see changes!"
}

# Function to clean all Docker resources
clean_all() {
    print_warning "Cleaning all Docker resources..."
    
    # Stop all containers
    print_status "Stopping all containers..."
    docker-compose -f docker-compose-dev.yml down 2>/dev/null || true
    docker-compose -f docker-compose-dev-hotreload.yml down 2>/dev/null || true
    
    # Remove images
    print_status "Removing project images..."
    docker rmi c4-genai-suite-c4-frontend 2>/dev/null || true
    docker rmi c4-genai-suite-c4-backend 2>/dev/null || true
    
    # Clean build cache
    print_status "Cleaning Docker build cache..."
    docker builder prune -f
    
    print_success "Docker resources cleaned!"
    print_status "You can now run 'start-dev' or 'start-prod' to rebuild everything"
}

# Function to show logs
show_logs() {
    print_status "Showing frontend logs (Ctrl+C to exit)..."
    docker-compose -f docker-compose-dev.yml logs -f c4-frontend
}

# Function to open shell
open_shell() {
    print_status "Opening shell in frontend container..."
    docker exec -it c4-genai-suite-c4-frontend-1 /bin/sh
}

# Main script logic
case "${1:-help}" in
    "start-dev")
        start_dev
        ;;
    "start-prod")
        start_prod
        ;;
    "rebuild")
        rebuild_frontend
        ;;
    "clean")
        clean_all
        ;;
    "logs")
        show_logs
        ;;
    "shell")
        open_shell
        ;;
    "help"|*)
        show_help
        ;;
esac
