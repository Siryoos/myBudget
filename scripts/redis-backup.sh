#!/bin/bash

# Redis Backup Script
# Supports both standalone and cluster mode backups

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/var/backups/redis}"
REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"
REDIS_PASSWORD="${REDIS_PASSWORD:-}"
REDIS_MODE="${REDIS_MODE:-standalone}" # standalone or cluster
S3_BUCKET="${S3_BUCKET:-}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Logging
LOG_FILE="/var/log/redis-backup.log"
exec 1> >(tee -a "$LOG_FILE")
exec 2>&1

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Function to backup standalone Redis
backup_standalone() {
    local backup_file="$BACKUP_DIR/redis-backup-$TIMESTAMP.rdb"
    
    log "Starting standalone Redis backup..."
    
    # Trigger BGSAVE
    if [ ! -z "$REDIS_PASSWORD" ]; then
        redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" BGSAVE
    else
        redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" BGSAVE
    fi
    
    # Wait for backup to complete
    log "Waiting for background save to complete..."
    while true; do
        if [ ! -z "$REDIS_PASSWORD" ]; then
            status=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" LASTSAVE)
        else
            status=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" LASTSAVE)
        fi
        
        if [ "$status" != "$last_save" ]; then
            break
        fi
        sleep 1
    done
    
    # Copy RDB file
    log "Copying RDB file..."
    if [ ! -z "$REDIS_PASSWORD" ]; then
        redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" --rdb "$backup_file"
    else
        redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" --rdb "$backup_file"
    fi
    
    # Compress backup
    log "Compressing backup..."
    gzip "$backup_file"
    backup_file="${backup_file}.gz"
    
    echo "$backup_file"
}

# Function to backup Redis cluster
backup_cluster() {
    local backup_base_dir="$BACKUP_DIR/cluster-backup-$TIMESTAMP"
    mkdir -p "$backup_base_dir"
    
    log "Starting Redis cluster backup..."
    
    # Get cluster nodes
    if [ ! -z "$REDIS_PASSWORD" ]; then
        nodes=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" cluster nodes | grep master | awk '{print $2}')
    else
        nodes=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" cluster nodes | grep master | awk '{print $2}')
    fi
    
    # Backup each master node
    for node in $nodes; do
        host=$(echo $node | cut -d: -f1)
        port=$(echo $node | cut -d: -f2)
        
        log "Backing up node $host:$port..."
        
        # Trigger BGSAVE on node
        if [ ! -z "$REDIS_PASSWORD" ]; then
            redis-cli -h "$host" -p "$port" -a "$REDIS_PASSWORD" BGSAVE
        else
            redis-cli -h "$host" -p "$port" BGSAVE
        fi
        
        # Wait for completion
        sleep 5
        
        # Copy RDB file
        node_backup="$backup_base_dir/node-${host}-${port}.rdb"
        if [ ! -z "$REDIS_PASSWORD" ]; then
            redis-cli -h "$host" -p "$port" -a "$REDIS_PASSWORD" --rdb "$node_backup"
        else
            redis-cli -h "$host" -p "$port" --rdb "$node_backup"
        fi
    done
    
    # Create cluster config backup
    log "Backing up cluster configuration..."
    if [ ! -z "$REDIS_PASSWORD" ]; then
        redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" cluster nodes > "$backup_base_dir/cluster-nodes.txt"
        redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" cluster info > "$backup_base_dir/cluster-info.txt"
    else
        redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" cluster nodes > "$backup_base_dir/cluster-nodes.txt"
        redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" cluster info > "$backup_base_dir/cluster-info.txt"
    fi
    
    # Compress backup
    log "Compressing cluster backup..."
    cd "$BACKUP_DIR"
    tar -czf "cluster-backup-$TIMESTAMP.tar.gz" "cluster-backup-$TIMESTAMP"
    rm -rf "$backup_base_dir"
    
    echo "$BACKUP_DIR/cluster-backup-$TIMESTAMP.tar.gz"
}

# Function to upload to S3
upload_to_s3() {
    local file=$1
    
    if [ ! -z "$S3_BUCKET" ]; then
        log "Uploading backup to S3..."
        aws s3 cp "$file" "s3://$S3_BUCKET/redis-backups/$(basename $file)"
        
        if [ $? -eq 0 ]; then
            log "Backup uploaded to S3 successfully"
        else
            log "ERROR: Failed to upload backup to S3"
            return 1
        fi
    fi
}

# Function to clean old backups
cleanup_old_backups() {
    log "Cleaning up old backups..."
    
    # Local cleanup
    find "$BACKUP_DIR" -name "*.gz" -type f -mtime +$RETENTION_DAYS -delete
    find "$BACKUP_DIR" -name "*.tar.gz" -type f -mtime +$RETENTION_DAYS -delete
    
    # S3 cleanup
    if [ ! -z "$S3_BUCKET" ]; then
        cutoff_date=$(date -d "$RETENTION_DAYS days ago" '+%Y-%m-%d')
        aws s3 ls "s3://$S3_BUCKET/redis-backups/" | while read -r line; do
            file_date=$(echo $line | awk '{print $1}')
            file_name=$(echo $line | awk '{print $4}')
            
            if [[ "$file_date" < "$cutoff_date" ]]; then
                aws s3 rm "s3://$S3_BUCKET/redis-backups/$file_name"
                log "Deleted old S3 backup: $file_name"
            fi
        done
    fi
}

# Main backup process
log "=== Redis Backup Started ==="
log "Mode: $REDIS_MODE"
log "Host: $REDIS_HOST:$REDIS_PORT"

# Perform backup based on mode
if [ "$REDIS_MODE" == "cluster" ]; then
    backup_file=$(backup_cluster)
else
    backup_file=$(backup_standalone)
fi

# Upload to S3 if configured
upload_to_s3 "$backup_file"

# Clean up old backups
cleanup_old_backups

# Generate backup report
BACKUP_SIZE=$(du -h "$backup_file" | cut -f1)
log "Backup completed successfully"
log "Backup file: $backup_file"
log "Backup size: $BACKUP_SIZE"

# Send notification (if configured)
if [ ! -z "$SLACK_WEBHOOK" ]; then
    curl -X POST "$SLACK_WEBHOOK" \
        -H 'Content-Type: application/json' \
        -d "{\"text\":\"Redis backup completed successfully. Size: $BACKUP_SIZE\"}"
fi

log "=== Redis Backup Completed ==="

# Exit with success
exit 0