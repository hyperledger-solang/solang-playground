#!/bin/bash

set -euo pipefail

echo "[init] Checking for Docker availability..."

use_host_docker=false
if [ -S /var/run/docker.sock ]; then
  # If a docker socket is mounted, prefer it
  if docker info >/dev/null 2>&1; then
    echo "[init] Using host Docker socket (/var/run/docker.sock)"
    use_host_docker=true
  fi
fi

if [ "$use_host_docker" = false ]; then
  echo "[init] Starting dockerd inside container..."
  dockerd --debug > /var/log/dockerd.log 2>&1 &
  DOCKERD_PID=$!

  echo "[init] Waiting for Docker socket..."
  until [ -S /var/run/docker.sock ]; do
    sleep 1
    echo -n "."
  done

  echo -n "[init] Waiting for dockerd process..."
  until ps -p ${DOCKERD_PID} >/dev/null 2>&1; do
    sleep 1
    echo -n "."
  done
  echo " dockerd running!"

  echo -n "[init] Waiting for docker responsiveness..."
  docker_count=0
  until docker info >/dev/null 2>&1; do
    sleep 1
    echo -n "."
    docker_count=$((docker_count + 1))
    if [ $docker_count -ge 30 ]; then
      echo " Docker failed to start!"
      echo "--- dockerd.log ---"
      cat /var/log/dockerd.log || true
      echo "------------------"
      exit 1
    fi
  done
  echo " Docker ready!"
fi

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
