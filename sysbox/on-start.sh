#!/bin/bash

# Start dockerd in background with debug logging
echo "Starting Docker daemon..."
dockerd --debug > /var/log/dockerd.log 2>&1 &
DOCKERD_PID=$!

# Wait for Docker socket and daemon readiness
echo "Waiting for Docker daemon to become ready..."
while [ ! -S /var/run/docker.sock ]; do
    sleep 1
    echo -n "."
done

# Wait for dockerd to be fully ready
echo -n "Waiting for dockerd process..."
while ! ps -p $DOCKERD_PID > /dev/null; do
    sleep 1
    echo -n "."
done
echo " dockerd running!"

# Additional check to ensure dockerd is responsive
echo -n "Waiting for docker responsiveness..."
docker_count=0
until docker info >/dev/null 2>&1; do
    sleep 1
    echo -n "."
    docker_count=$((docker_count + 1))
    if [ $docker_count -ge 30 ]; then
        echo " Docker failed to start!"
        echo "--- dockerd.log ---"
        cat /var/log/dockerd.log
        echo "------------------"
        exit 1
    fi
done
echo " Docker ready!"

# Pull solang image with retries
echo "Pulling solang image..."
pull_attempt=0
until docker pull ghcr.io/hyperledger-solang/solang:latest; do
    pull_attempt=$((pull_attempt + 1))
    if [ $pull_attempt -ge 3 ]; then
        echo "Failed to pull solang image after 3 attempts"
        exit 1
    fi
    echo "Pull failed, retrying in 5 seconds..."
    sleep 5
done

# Start application services
echo "Starting application services..."
cd /app
./start-services.sh
