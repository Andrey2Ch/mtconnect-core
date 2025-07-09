# Test API data sending
$url = "https://mtconnect-core-production.up.railway.app/api/ext/data"
$body = Get-Content "test-api-data.json" -Raw

$headers = @{
    "Content-Type" = "application/json"
}

Write-Host "Testing Cloud API data sending..."
Write-Host "URL: $url"

try {
    $response = Invoke-RestMethod -Uri $url -Method POST -Body $body -Headers $headers
    Write-Host "SUCCESS!" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor Yellow
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "ERROR:" -ForegroundColor Red
    Write-Host $_.Exception.Message
    if ($_.ErrorDetails) {
        Write-Host "Details:" $_.ErrorDetails.Message
    }
}

Write-Host ""
Write-Host "Checking database status..."
try {
    $dbStatus = Invoke-RestMethod -Uri "https://mtconnect-core-production.up.railway.app/api/test/database-status"
    Write-Host "Database Status:" -ForegroundColor Cyan
    $dbStatus | ConvertTo-Json -Depth 10
} catch {
    Write-Host "Database check ERROR:" -ForegroundColor Red
    Write-Host $_.Exception.Message
} 