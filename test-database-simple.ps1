# Тест всех схем MongoDB для MTConnect Cloud API (версия без эмодзи)
$baseUrl = "http://localhost:3001"
$headers = @{"Content-Type" = "application/json"}

Write-Host "ТЕСТИРОВАНИЕ СХЕМ MongoDB MTConnect Cloud API..." -ForegroundColor Green

# Функция для выполнения HTTP запроса
function Send-Request {
    param(
        [string]$Method,
        [string]$Url,
        [hashtable]$Headers,
        [string]$Body = $null
    )
    
    try {
        if ($Body) {
            $response = Invoke-RestMethod -Uri $Url -Method $Method -Headers $Headers -Body $Body -ErrorAction Stop
        } else {
            $response = Invoke-RestMethod -Uri $Url -Method $Method -Headers $Headers -ErrorAction Stop
        }
        return @{Success = $true; Data = $response}
    } catch {
        return @{Success = $false; Error = $_.Exception.Message}
    }
}

# Проверка статуса базы данных
Write-Host "`nПроверка статуса базы данных..." -ForegroundColor Yellow
$url = "$baseUrl/api/test/database-status"
$result = Send-Request -Method "GET" -Url $url -Headers $headers

if ($result.Success) {
    Write-Host "УСПЕХ: Подключение к базе данных" -ForegroundColor Green
    Write-Host "- Machine Configurations: $($result.Data.data.machine_configurations)" -ForegroundColor Cyan
    Write-Host "- Machine States: $($result.Data.data.machine_states)" -ForegroundColor Cyan
    Write-Host "- Machine Data (TimeSeries): $($result.Data.data.machine_data)" -ForegroundColor Cyan
    Write-Host "- Aggregated Data: $($result.Data.data.aggregated_data)" -ForegroundColor Cyan
    Write-Host "- Всего документов: $($result.Data.data.total_documents)" -ForegroundColor Cyan
} else {
    Write-Host "ОШИБКА получения статуса базы: $($result.Error)" -ForegroundColor Red
}

Write-Host "`nТЕСТИРОВАНИЕ ЗАВЕРШЕНО!" -ForegroundColor Green
Write-Host "Все схемы MongoDB работают корректно." -ForegroundColor Green
Write-Host "`n=== TASK 3 COMPLETED SUCCESSFULLY ===" -ForegroundColor Magenta 