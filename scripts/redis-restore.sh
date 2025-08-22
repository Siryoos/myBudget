#!/bin/bash

# Redis Restore Script
# Restores Redis data from backup files

set -e

# Configuration
BACKUP_FILE="${1:-}"
REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"
REDIS_PASSWORD="${REDIS_PASSWORD:-}"
REDIS_MODE="${REDIS_MODE:-standalone}" # standalone or cluster
S3_BUCKET="${S3_BUCKET:-}"
RESTORE_DIR="/tmp/redis-restore-$$"

# Logging
LOG_FILE="/var/log/redis-restore.log"
exec 1> >(tee -a "$LOG_FILE")
exec 2>&1

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Validate input
if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup-file> [s3://bucket/path]"
    echo "Environment variables:"
    echo "  REDIS_HOST, REDIS_PORT, REDIS_PASSWORD, REDIS_MODE"
    exit 1
fi

# Create restore directory
mkdir -p "$RESTORE_DIR"

# Function to download from S3
download_from_s3() {
    local s3_path=$1
    local local_file="$RESTORE_DIR/$(basename $s3_path)"
    
    log "Downloading backup from S3: $s3_path"
    aws s3 cp "$s3_path" "$local_file"
    
    if [ $? -eq 0 ]; then
        log "Download completed successfully"
        echo "$local_file"
    else
        log "ERROR: Failed to download backup from S3"
        exit 1
    fi
}

# Function to restore standalone Redis
restore_standalone() {
    local rdb_file=$1
    
    log "Starting standalone Redis restore..."
    
    # Check if file is compressed
    if [[ "$rdb_file" == *.gz ]]; then
        log "Decompressing backup file..."
        gunzip -c "$rdb_file" > "${rdb_file%.gz}"
        rdb_file="${rdb_file%.gz}"
    fi
    
    # Stop Redis temporarily
    log "Stopping Redis service..."
    if [ ! -z "$REDIS_PASSWORD" ]; then
        redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" SHUTDOWN SAVE
    else
        redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" SHUTDOWN SAVE
    fi
    
    # Wait for Redis to stop
    sleep 5
    
    # Get Redis data directory
    REDIS_DATA_DIR=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" CONFIG GET dir | tail -1)
    
    # Backup current data
    if [ -f "$REDIS_DATA_DIR/dump.rdb" ]; then
        log "Backing up current data..."
        mv "$REDIS_DATA_DIR/dump.rdb" "$REDIS_DATA_DIR/dump.rdb.bak.$(date +%Y%m%d_%H%M%S)"
    fi
    
    # Copy new RDB file
    log "Copying restored data..."
    cp "$rdb_file" "$REDIS_DATA_DIR/dump.rdb"
    chown redis:redis "$REDIS_DATA_DIR/dump.rdb"
    
    # Start Redis
    log "Starting Redis service..."
    systemctl start redis || service redis start
    
    # Wait for Redis to start
    sleep 5
    
    # Verify restore
    if [ ! -z "$REDIS_PASSWORD" ]; then
        db_size=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" DBSIZE | awk '{print $2}')
    else
        db_size=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" DBSIZE | awk '{print $2}')
    fi
    
    log "Restore completed. Database size: $db_size keys"
}

# Function to restore Redis cluster
restore_cluster() {
    local backup_archive=$1
    
    log "Starting Redis cluster restore..."
    
    # Extract archive
    log "Extracting cluster backup..."
    tar -xzf "$backup_archive" -C "$RESTORE_DIR"
    
    # Find extracted directory
    backup_dir=$(find "$RESTORE_DIR" -name "cluster-backup-*" -type d | head -1)
    
    if [ -z "$backup_dir" ]; then
        log "ERROR: Could not find cluster backup directory"
        exit 1
    fi
    
    # Get current cluster nodes
    if [ ! -z "$REDIS_PASSWORD" ]; then
        current_nodes=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" cluster nodes | grep master)
    else
        current_nodes=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" cluster nodes | grep master)
    fi
    
    # Stop all cluster nodes
    log "Stopping all cluster nodes..."
    echo "$current_nodes" | while read -r line; do
        node_info=$(echo $line | awk '{print $2}')
        host=$(echo $node_info | cut -d: -f1)
        port=$(echo $node_info | cut -d: -f2)
        
        log "Stopping node $host:$port..."
        if [ ! -z "$REDIS_PASSWORD" ]; then
            redis-cli -h "$host" -p "$port" -a "$REDIS_PASSWORD" SHUTDOWN SAVE || true
        else
            redis-cli -h "$host" -p "$port" SHUTDOWN SAVE || true
        fi
    done
    
    # Wait for all nodes to stop
    sleep 10
    
    # Restore each node
    for rdb_file in "$backup_dir"/node-*.rdb; do
        if [ -f "$rdb_file" ]; then
            # Extract host and port from filename
            basename=$(basename "$rdb_file")
            node_info=$(echo "$basename" | sed 's/node-\(.*\)\.rdb/\1/')
            host=$(echo "$node_info" | cut -d- -f1)
            port=$(echo "$node_info" | cut -d- -f2)
            
            log "Restoring node $host:$port..."
            
            # Copy RDB file to node directory
            node_dir="/var/lib/redis-cluster/node-$port"
            if [ -d "$node_dir" ]; then
                cp "$rdb_file" "$node_dir/dump.rdb"
                chown redis:redis "$node_dir/dump.rdb"
            fi
        fi
    done
    
    # Start all nodes
    log "Starting all cluster nodes..."
    systemctl start redis-cluster || /usr/local/bin/redis-cluster-start.sh
    
    # Wait for cluster to form
    sleep 15
    
    # Verify cluster status
    if [ ! -z "$REDIS_PASSWORD" ]; then
        cluster_state=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" cluster info | grep cluster_state | cut -d: -f2 | tr -d '\r')
    else
        cluster_state=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" cluster info | grep cluster_state | cut -d: -f2 | tr -d '\r')
    fi
    
    log "Cluster restore completed. State: $cluster_state"
}

# Main restore process
log "=== Redis Restore Started ==="
log "Backup file: $BACKUP_FILE"

# Download from S3 if needed
if [[ "$BACKUP_FILE" == s3://* ]]; then
    BACKUP_FILE=$(download_from_s3 "$BACKUP_FILE")
fi

# Verify backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    log "ERROR: Backup file not found: $BACKUP_FILE"
    exit 1
fi

# Create safety backup
log "Creating safety backup of current data..."
./redis-backup.sh

# Perform restore based on mode
if [ "$REDIS_MODE" == "cluster" ]; then
    restore_cluster "$BACKUP_FILE"
else
    restore_standalone "$BACKUP_FILE"
fi

# Cleanup
rm -rf "$RESTORE_DIR"

log "=== Redis Restore Completed ==="

# Send notification (if configured)
if [ ! -z "$SLACK_WEBHOOK" ]; then
    curl -X POST "$SLACK_WEBHOOK" \
        -H 'Content-Type: application/json' \
        -d '{"text":"Redis restore completed successfully"}'
fi

exit 0