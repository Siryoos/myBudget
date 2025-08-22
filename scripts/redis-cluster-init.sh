#!/bin/bash

# Redis Cluster Initialization Script
# This script sets up a Redis cluster with 3 masters and 3 replicas

set -e

# Configuration
REDIS_PASSWORD="${REDIS_PASSWORD:-}"
REDIS_PORT_START=7000
REDIS_NODES=6
REDIS_REPLICAS=1
CLUSTER_DIR="/var/lib/redis-cluster"
LOG_DIR="/var/log/redis"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}Redis Cluster Initialization${NC}"
echo "==============================="

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}This script must be run as root${NC}"
   exit 1
fi

# Create directories
echo -e "${YELLOW}Creating directories...${NC}"
mkdir -p $CLUSTER_DIR
mkdir -p $LOG_DIR

# Create Redis nodes
for ((i=0; i<$REDIS_NODES; i++)); do
    PORT=$((REDIS_PORT_START + i))
    NODE_DIR="$CLUSTER_DIR/node-$PORT"
    
    echo -e "${YELLOW}Setting up Redis node on port $PORT...${NC}"
    
    # Create node directory
    mkdir -p $NODE_DIR
    
    # Create node configuration
    cat > $NODE_DIR/redis.conf <<EOF
# Redis Node $PORT Configuration
bind 0.0.0.0
port $PORT
cluster-enabled yes
cluster-config-file $NODE_DIR/nodes.conf
cluster-node-timeout 5000
appendonly yes
appendfilename "appendonly-$PORT.aof"
dbfilename "dump-$PORT.rdb"
dir $NODE_DIR
logfile $LOG_DIR/redis-$PORT.log
pidfile /var/run/redis-$PORT.pid
maxmemory 1gb
maxmemory-policy allkeys-lru
EOF

    # Add password if provided
    if [ ! -z "$REDIS_PASSWORD" ]; then
        echo "requirepass $REDIS_PASSWORD" >> $NODE_DIR/redis.conf
        echo "masterauth $REDIS_PASSWORD" >> $NODE_DIR/redis.conf
    fi
    
    # Start Redis instance
    redis-server $NODE_DIR/redis.conf --daemonize yes
    
    echo -e "${GREEN}Node $PORT started${NC}"
    sleep 1
done

# Wait for all nodes to be ready
echo -e "${YELLOW}Waiting for nodes to be ready...${NC}"
sleep 5

# Create cluster
echo -e "${YELLOW}Creating Redis cluster...${NC}"
NODES=""
for ((i=0; i<$REDIS_NODES; i++)); do
    PORT=$((REDIS_PORT_START + i))
    NODES="$NODES 127.0.0.1:$PORT"
done

if [ ! -z "$REDIS_PASSWORD" ]; then
    redis-cli --cluster create $NODES --cluster-replicas $REDIS_REPLICAS --cluster-yes -a $REDIS_PASSWORD
else
    redis-cli --cluster create $NODES --cluster-replicas $REDIS_REPLICAS --cluster-yes
fi

# Check cluster status
echo -e "${YELLOW}Checking cluster status...${NC}"
if [ ! -z "$REDIS_PASSWORD" ]; then
    redis-cli -p $REDIS_PORT_START -a $REDIS_PASSWORD cluster info
else
    redis-cli -p $REDIS_PORT_START cluster info
fi

echo -e "${GREEN}Redis cluster initialization complete!${NC}"
echo ""
echo "Cluster nodes:"
for ((i=0; i<$REDIS_NODES; i++)); do
    PORT=$((REDIS_PORT_START + i))
    echo "  - 127.0.0.1:$PORT"
done

# Create systemd service file
echo -e "${YELLOW}Creating systemd service file...${NC}"
cat > /etc/systemd/system/redis-cluster.service <<EOF
[Unit]
Description=Redis Cluster
After=network.target

[Service]
Type=forking
ExecStart=/usr/local/bin/redis-cluster-start.sh
ExecStop=/usr/local/bin/redis-cluster-stop.sh
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# Create start script
cat > /usr/local/bin/redis-cluster-start.sh <<'EOF'
#!/bin/bash
for ((i=0; i<6; i++)); do
    PORT=$((7000 + i))
    redis-server /var/lib/redis-cluster/node-$PORT/redis.conf --daemonize yes
done
EOF

# Create stop script
cat > /usr/local/bin/redis-cluster-stop.sh <<'EOF'
#!/bin/bash
for ((i=0; i<6; i++)); do
    PORT=$((7000 + i))
    redis-cli -p $PORT shutdown
done
EOF

chmod +x /usr/local/bin/redis-cluster-start.sh
chmod +x /usr/local/bin/redis-cluster-stop.sh

echo -e "${GREEN}Systemd service created${NC}"
echo "Use 'systemctl start redis-cluster' to start the cluster"
echo "Use 'systemctl enable redis-cluster' to enable on boot"