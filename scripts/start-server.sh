#!/bin/bash
cd /home/ubuntu/rent-reminder-app

# Kill old processes
pkill -f 'node.*server.js' 2>/dev/null
pkill -f 'node.*proxy.js' 2>/dev/null
pkill -f 'vite preview' 2>/dev/null
sleep 2

# Start backend
nohup node server.js > /tmp/server.log 2>&1 &
echo "Backend PID: $!"

# Wait for backend to be ready
sleep 3

# Start proxy
nohup node proxy.js > /tmp/proxy.log 2>&1 &
echo "Proxy PID: $!"

sleep 2
echo "=== Backend Health ==="
curl -s http://localhost:3002/api/health
echo ""
echo "=== Proxy Health ==="
curl -s http://localhost:3003/api/health
echo ""
echo "=== Server Log ==="
tail -5 /tmp/server.log
