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



















# #!/bin/bash

# # Start dockerd in the background
# echo "Starting Docker daemon..."
# dockerd > /var/log/dockerd.log 2>&1 &

# # Wait for the Docker socket to be available
# echo "Waiting for Docker daemon socket..."
# while [ ! -S /var/run/docker.sock ]; do
#   echo -n "."
#   sleep 1
# done
# echo " Docker socket found!"

# # Pull the required solang image
# echo "Pulling solang image..."
# docker pull ghcr.io/hyperledger-solang/solang:latest

# # Change to the app directory where Makefile.toml is located
# cd /app

# # Start the application using cargo make run
# # Use the absolute path to cargo installed in the Docker image
# echo "Starting application using cargo make run..."
# /usr/local/cargo/bin/cargo make run

# # cargo make run will start both backend and frontend in parallel.
# # The container will stay alive as long as these processes run.





















# #!/bin/bash

# # Start dockerd in the background
# echo "Starting Docker daemon..."
# dockerd > /var/log/dockerd.log 2>&1 &

# # Wait for the Docker socket to be available
# echo "Waiting for Docker daemon socket..."
# while [ ! -S /var/run/docker.sock ]; do
#   echo -n "."
#   sleep 1
# done
# echo " Docker socket found!"

# # Pull the required solang image
# echo "Pulling solang image..."
# docker pull ghcr.io/hyperledger-solang/solang:latest

# # Start the backend application in the background
# # Note: We remove the --frontend_folder flag as it's not needed when running next start
# echo "Starting backend server in background..."
# /app/backend --port 4444 & # Run in background

# # Wait a moment for the backend to potentially start
# sleep 3

# # Start the frontend application in the foreground
# echo "Starting frontend server (next start)..."
# cd /app/packages/frontend
# # Use npx to ensure 'next' command is found reliably
# npx next start # Runs `next start` in the foreground, keeping the container alive

# # If npx next start exits, the script finishes, and the container stops.























# # #!/bin/bash

# # # Start dockerd in the background
# # echo "Starting Docker daemon..."
# # dockerd > /var/log/dockerd.log 2>&1 &

# # # Wait a few seconds for dockerd to initialize
# # sleep 5

# # # Pull the required solang image
# # echo "Pulling solang image..."
# # docker pull ghcr.io/hyperledger-solang/solang:latest

# # # Start the backend application in the background
# # # Note: We remove the --frontend_folder flag as it's not needed when running next start
# # echo "Starting backend server in background..."
# # /app/backend --port 4444 & # Run in background

# # # Wait a moment for the backend to potentially start
# # sleep 3

# # # Start the frontend application in the foreground
# # echo "Starting frontend server (next start)..."
# # cd /app/packages/frontend
# # npm run start # Runs `next start` in the foreground, keeping the container alive

# # # If npm run start exits, the script finishes, and the container stops.


















# # # # #!/bin/bash

# # # # # dockerd start
# # # # dockerd > /var/log/dockerd.log 2>&1 &
# # # # sleep 3

# # # # # pull solang image
# # # # docker pull ghcr.io/hyperledger-solang/solang:latest

# # # # cargo make run

# # # # ##########################
# # # # #!/bin/bash
# # # # # dockerd start
# # # # dockerd > /var/log/dockerd.log 2>&1 &
# # # # sleep 3

# # # # # pull solang image
# # # # docker pull ghcr.io/hyperledger-solang/solang:latest

# # # # # Execute the compiled backend directly instead of using cargo make
# # # # # Ensure the path matches where it's copied in the Dockerfile
# # # # /app/target/release/backend --frontend_folder /app/packages/app/dist --port 4444

# #!/bin/bash

# echo "--- Debugging Startup Script ---"

# echo "Current working directory:"
# pwd

# echo "Listing files in current directory:"
# ls -la

# echo "Listing files in /app directory:"
# ls -la /app

# echo "Changing directory to /app"
# cd /app

# echo "Current working directory after cd:"
# pwd

# echo "Listing files in /app directory again:"
# ls -la

# echo "--- End Debugging --- Starting Original Script Logic ---"

# # dockerd start
# dockerd > /var/log/dockerd.log 2>&1 &
# sleep 3

# # pull solang image
# docker pull ghcr.io/hyperledger-solang/solang:latest

# echo "Attempting to run cargo make run from /app"
# cargo make run

# echo "--- Script Finished ---"




# #!/bin/bash

# # dockerd start
# dockerd > /var/log/dockerd.log 2>&1 &
# sleep 2

# # pull solang image 
# docker pull ghcr.io/hyperledger/solang@sha256:e6f687910df5dd9d4f5285aed105ae0e6bcae912db43e8955ed4d8344d49785d 

# cargo make run
