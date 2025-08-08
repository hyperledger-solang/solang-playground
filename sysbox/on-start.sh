#!/bin/bash

# dockerd start
dockerd > /var/log/dockerd.log 2>&1 &
sleep 2

# pull solang image 
docker pull ghcr.io/hyperledger/solang@sha256:8776a9bd756664f7bf8414710d1a799799bf6fedc1c8f9f0bda17e76749dea7a 

# Start Next.js frontend in the background
cd /app/packages/frontend && npm install --production && npm start &

# start backend server
./app/target/release/backend --port 9000 --host 0.0.0.0 --frontend_folder /app/packages/app/dist
