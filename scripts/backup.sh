#!/bin/bash

# MyBudget Database Backup Script
# This script runs in the backup container to create database backups

set -e

# Configuration
DB_NAME=${DB_NAME:-mybudget}
DB_USER=${DB_USER:-mybudget_user}
DB_PASSWORD=${DB_PASSWORD}
BACKUP_PATH=${BACKUP_PATH:-/backups}
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}

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

# Check if required environment variables are set
if [ -z "$DB_PASSWORD" ]; then
    print_error "DB_PASSWORD environment variable is not set"
    exit 1
fi

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_PATH"

# Generate backup filename with timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_PATH/mybudget_backup_$TIMESTAMP.sql"

print_status "Starting database backup..."

# Create the backup
PGPASSWORD="$DB_PASSWORD" pg_dump \
    -h postgres \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --verbose \
    --clean \
    --create \
    --if-exists \
    --no-password \
    --file="$BACKUP_FILE"

if [ $? -eq 0 ]; then
    print_success "Database backup completed successfully: $BACKUP_FILE"
    
    # Compress the backup
    gzip "$BACKUP_FILE"
    COMPRESSED_FILE="$BACKUP_FILE.gz"
    
    if [ $? -eq 0 ]; then
        print_success "Backup compressed: $COMPRESSED_FILE"
        
        # Get file size
        FILE_SIZE=$(du -h "$COMPRESSED_FILE" | cut -f1)
        print_status "Backup size: $FILE_SIZE"
    else
        print_warning "Failed to compress backup"
    fi
else
    print_error "Database backup failed"
    exit 1
fi

# Clean up old backups
print_status "Cleaning up old backups (older than $RETENTION_DAYS days)..."

find "$BACKUP_PATH" -name "mybudget_backup_*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete

if [ $? -eq 0 ]; then
    print_success "Old backups cleaned up"
else
    print_warning "Failed to clean up old backups"
fi

# List remaining backups
print_status "Remaining backups:"
ls -lh "$BACKUP_PATH"/mybudget_backup_*.sql.gz 2>/dev/null || print_warning "No backups found"

print_success "Backup process completed successfully"
