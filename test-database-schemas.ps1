# Тест всех схем MongoDB для MTConnect Cloud API
$baseUrl = "http://localhost:3001"
$headers = @{"Content-Type" = "application/json"}

Write-Host "🧪 Тестирование схем MongoDB MTConnect Cloud API..." -ForegroundColor Green

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

# Тест 1: Добавление конфигурации машины
Write-Host "`n1. Тестирование Machine Configuration Schema..." -ForegroundColor Yellow
$configData = Get-Content -Path "test-machine-config.json" -Raw
$url = "$baseUrl/api/test/machine-config"
$result = Send-Request -Method "POST" -Url $url -Headers $headers -Body $configData

if ($result.Success) {
    Write-Host "✅ Machine Configuration успешно добавлена" -ForegroundColor Green
} else {
    Write-Host "❌ Ошибка Machine Configuration: $($result.Error)" -ForegroundColor Red
}

# Тест 2: Добавление состояния машины
Write-Host "`n2. Тестирование Machine State Schema..." -ForegroundColor Yellow
$stateData = Get-Content -Path "test-machine-state.json" -Raw
$url = "$baseUrl/api/test/machine-state"
$result = Send-Request -Method "POST" -Url $url -Headers $headers -Body $stateData

if ($result.Success) {
    Write-Host "✅ Machine State успешно добавлено" -ForegroundColor Green
} else {
    Write-Host "❌ Ошибка Machine State: $($result.Error)" -ForegroundColor Red
}

# Тест 3: Добавление данных машины (TimeSeries)
Write-Host "`n3. Тестирование Machine Data Schema (TimeSeries)..." -ForegroundColor Yellow
$dataData = Get-Content -Path "test-machine-data.json" -Raw
$url = "$baseUrl/api/test/machine-data"
$result = Send-Request -Method "POST" -Url $url -Headers $headers -Body $dataData

if ($result.Success) {
    Write-Host "✅ Machine Data (TimeSeries) успешно добавлены" -ForegroundColor Green
} else {
    Write-Host "❌ Ошибка Machine Data: $($result.Error)" -ForegroundColor Red
}

# Тест 4: Добавление агрегированных данных
Write-Host "`n4. Тестирование Aggregated Data Schema..." -ForegroundColor Yellow
$aggregatedData = Get-Content -Path "test-aggregated-data.json" -Raw
$url = "$baseUrl/api/test/aggregated-data"
$result = Send-Request -Method "POST" -Url $url -Headers $headers -Body $aggregatedData

if ($result.Success) {
    Write-Host "✅ Aggregated Data успешно добавлены" -ForegroundColor Green
} else {
    Write-Host "❌ Ошибка Aggregated Data: $($result.Error)" -ForegroundColor Red
}

# Тест 5: Проверка содержимого коллекций
Write-Host "`n5. Проверка содержимого коллекций..." -ForegroundColor Yellow

# Получение конфигурации
$url = "$baseUrl/api/test/machine-config/SR-22"
$result = Send-Request -Method "GET" -Url $url -Headers $headers

if ($result.Success) {
    Write-Host "✅ Получена конфигурация машины: $($result.Data.machineName)" -ForegroundColor Green
} else {
    Write-Host "❌ Ошибка получения конфигурации: $($result.Error)" -ForegroundColor Red
}

# Получение состояния
$url = "$baseUrl/api/test/machine-state/SR-22"
$result = Send-Request -Method "GET" -Url $url -Headers $headers

if ($result.Success) {
    Write-Host "✅ Получено состояние машины: $($result.Data.executionStatus)" -ForegroundColor Green
} else {
    Write-Host "❌ Ошибка получения состояния: $($result.Error)" -ForegroundColor Red
}

# Получение данных
$url = "$baseUrl/api/test/machine-data/SR-22"
$result = Send-Request -Method "GET" -Url $url -Headers $headers

if ($result.Success) {
    Write-Host "✅ Получены данные машины: $($result.Data.Count) записей" -ForegroundColor Green
} else {
    Write-Host "❌ Ошибка получения данных: $($result.Error)" -ForegroundColor Red
}

# Получение агрегированных данных
$url = "$baseUrl/api/test/aggregated-data/SR-22"
$result = Send-Request -Method "GET" -Url $url -Headers $headers

if ($result.Success) {
    Write-Host "✅ Получены агрегированные данные: $($result.Data.Count) записей" -ForegroundColor Green
} else {
    Write-Host "❌ Ошибка получения агрегированных данных: $($result.Error)" -ForegroundColor Red
}

Write-Host "`n🎯 Тестирование завершено!" -ForegroundColor Green 