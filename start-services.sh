#!/bin/bash

# Start backend service
echo "Starting backend..."
/app/target/release/backend --port 4444 &
BACKEND_PID=$!

# Start frontend service
echo "Starting frontend..."
cd /app/packages/frontend
./node_modules/.bin/next start --port 3000 --hostname 0.0.0.0 &
FRONTEND_PID=$!

# Wait for either process to exit
echo "Services running, waiting for termination..."
wait -n $BACKEND_PID $FRONTEND_PID
EXIT_CODE=$?
echo "One service exited with code $EXIT_CODE"

# Clean up remaining processes
echo "Stopping other services..."
kill $BACKEND_PID 2>/dev/null
kill $FRONTEND_PID 2>/dev/null
wait $BACKEND_PID 2>/dev/null
wait $FRONTEND_PID 2>/dev/null

exit $EXIT_CODE