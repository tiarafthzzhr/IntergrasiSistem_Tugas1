@echo off
echo ==========================================
echo Starting ChillArrival System...
echo ==========================================

echo Starting gRPC Server (server.js)...
start cmd /k "node server.js"

echo Waiting 2 seconds for gRPC to initialize...
timeout /t 2 /nobreak > NUL

echo Starting API Gateway (gateway.js)...
start cmd /k "node gateway.js"

echo ==========================================
echo System is running!
echo Gateway URL: http://localhost:3000
echo ==========================================
