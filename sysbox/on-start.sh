#!/bin/bash

set -euo pipefail

SOLANG_DOCKER_IMAGE="${SOLANG_DOCKER_IMAGE:-ghcr.io/hyperledger-solang/solang@sha256:86dcaa2ab8d1c60d42939b33878d40c1a02ef1282f2d24be5c6f069633a8e7bf}"
export SOLANG_DOCKER_IMAGE

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
echo "Pulling solang image: ${SOLANG_DOCKER_IMAGE}"
pull_attempt=0
until docker pull "${SOLANG_DOCKER_IMAGE}";
do
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
