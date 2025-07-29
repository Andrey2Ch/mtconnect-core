@echo off
set CLOUD_API_URL=https://mtconnect-core-production.up.railway.app
set EDGE_GATEWAY_ID=ANDREY-PC-edge-gateway
cd /d "C:\Projects\MTConnect"
npx ts-node src/main.ts
