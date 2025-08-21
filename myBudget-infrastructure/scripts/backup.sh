#!/bin/bash

# MyBudget Backup Script
set -e

BACKUP_DIR="/workspace/myBudget-infrastructure/data/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="mybudget_backup_${TIMESTAMP}"

echo "Starting backup: ${BACKUP_NAME}"

# Create backup directory
mkdir -p "${BACKUP_DIR}/${BACKUP_NAME}"

# Backup PostgreSQL
echo "Backing up PostgreSQL databases..."
docker exec mybudget-postgres pg_dumpall -U mybudget > "${BACKUP_DIR}/${BACKUP_NAME}/postgres_all.sql"

# Backup Redis
echo "Backing up Redis..."
docker exec mybudget-redis redis-cli --rdb "${BACKUP_DIR}/${BACKUP_NAME}/redis_dump.rdb"

# Backup MinIO data
echo "Backing up MinIO storage..."
docker run --rm -v mybudget-infrastructure_storage_data:/source:ro \
    -v "${BACKUP_DIR}/${BACKUP_NAME}":/backup \
    alpine tar czf /backup/minio_data.tar.gz -C /source .

# Backup configurations
echo "Backing up configurations..."
tar czf "${BACKUP_DIR}/${BACKUP_NAME}/configs.tar.gz" \
    -C /workspace/myBudget-infrastructure \
    config/ docker-compose.yml .env

# Compress entire backup
echo "Compressing backup..."
cd "${BACKUP_DIR}"
tar czf "${BACKUP_NAME}.tar.gz" "${BACKUP_NAME}/"
rm -rf "${BACKUP_NAME}/"

# Cleanup old backups (keep last 7 days)
find "${BACKUP_DIR}" -name "mybudget_backup_*.tar.gz" -mtime +7 -delete

echo "Backup completed: ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"

# Calculate backup size
BACKUP_SIZE=$(du -h "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" | cut -f1)
echo "Backup size: ${BACKUP_SIZE}"