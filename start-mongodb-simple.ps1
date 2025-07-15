#!/usr/bin/env pwsh

Write-Host "Starting MongoDB for development..." -ForegroundColor Green

# Go to docker folder
cd docker

# Stop existing MongoDB containers
Write-Host "Stopping existing MongoDB containers..." -ForegroundColor Yellow
docker stop mtconnect-mongodb-simple 2>$null
docker stop mtconnect-mongodb 2>$null

# Remove existing MongoDB containers
docker rm mtconnect-mongodb-simple 2>$null
docker rm mtconnect-mongodb 2>$null

# Start simple MongoDB
Write-Host "Starting MongoDB without authentication..." -ForegroundColor Green
docker-compose -f compose.simple.yml up -d

# Wait for MongoDB to start
Write-Host "Waiting for MongoDB to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Check status
Write-Host "Checking MongoDB status..." -ForegroundColor Green
docker ps | Select-String mongo

# Go back to project root
cd ..

Write-Host "MongoDB started! Now you can run Cloud API:" -ForegroundColor Green
Write-Host "cd apps/cloud-api && npm run start:dev" -ForegroundColor Cyan 