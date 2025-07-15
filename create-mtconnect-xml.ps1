#!/usr/bin/env pwsh

Write-Host "Creating probe.xml files for all MTConnect machines..." -ForegroundColor Green

# Базовый шаблон XML
$xmlTemplate = @"
<?xml version="1.0" encoding="UTF-8"?>
<MTConnectDevices xmlns="urn:mtconnect.org:MTConnectDevices:1.3" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="urn:mtconnect.org:MTConnectDevices:1.3 http://www.mtconnect.org/schemas/MTConnectDevices_1.3.xsd">
  <Header creationTime="2023-01-01T00:00:00Z" sender="MTConnect" instanceId="1" version="1.3" bufferSize="131072"/>
  <Devices>
    <Device id="{{MACHINE_ID}}" name="{{MACHINE_NAME}}" uuid="{{MACHINE_UUID}}">
      <Description manufacturer="FANUC" model="{{MACHINE_NAME}}"/>
      <DataItems>
        <DataItem category="EVENT" id="avail" name="avail" type="AVAILABILITY"/>
        <DataItem category="EVENT" id="estop" name="estop" type="EMERGENCY_STOP"/>
        <DataItem category="EVENT" id="execution" name="execution" type="EXECUTION"/>
        <DataItem category="SAMPLE" id="spindle_speed" name="spindle_speed" type="SPINDLE_SPEED" units="REVOLUTION/MINUTE"/>
        <DataItem category="SAMPLE" id="part_count" name="part_count" type="PART_COUNT"/>
        <DataItem category="EVENT" id="program" name="program" type="PROGRAM"/>
      </DataItems>
      <Components>
        <Axes id="base" name="base">
          <Components>
            <Linear id="X" name="X">
              <DataItems>
                <DataItem category="SAMPLE" id="Xpos" name="Xpos" type="POSITION" units="MILLIMETER"/>
                <DataItem category="SAMPLE" id="Xload" name="Xload" type="LOAD" units="PERCENT"/>
              </DataItems>
            </Linear>
            <Linear id="Y" name="Y">
              <DataItems>
                <DataItem category="SAMPLE" id="Ypos" name="Ypos" type="POSITION" units="MILLIMETER"/>
                <DataItem category="SAMPLE" id="Yload" name="Yload" type="LOAD" units="PERCENT"/>
              </DataItems>
            </Linear>
            <Linear id="Z" name="Z">
              <DataItems>
                <DataItem category="SAMPLE" id="Zpos" name="Zpos" type="POSITION" units="MILLIMETER"/>
                <DataItem category="SAMPLE" id="Zload" name="Zload" type="LOAD" units="PERCENT"/>
              </DataItems>
            </Linear>
          </Components>
        </Axes>
        <Spindles id="spindles">
          <Components>
            <Spindle id="S1" name="S1">
              <DataItems>
                <DataItem category="SAMPLE" id="S1speed" name="S1speed" type="SPINDLE_SPEED" units="REVOLUTION/MINUTE"/>
                <DataItem category="SAMPLE" id="S1load" name="S1load" type="LOAD" units="PERCENT"/>
              </DataItems>
            </Spindle>
          </Components>
        </Spindles>
      </Components>
    </Device>
  </Devices>
</MTConnectDevices>
"@

# Массив машин
$machines = @(
    @{id="M_1_XD-20"; name="XD-20"; uuid="M_1_XD-20"},
    @{id="M_2_SR_26"; name="SR-26"; uuid="M_2_SR_26"},
    @{id="M_3_XD_38"; name="XD-38"; uuid="M_3_XD_38"},
    @{id="M_4_SR_10"; name="SR-10"; uuid="M_4_SR_10"},
    @{id="M_5_DT_26"; name="DT-26"; uuid="M_5_DT_26"},
    @{id="M_6_SR_21"; name="SR-21"; uuid="M_6_SR_21"},
    @{id="M_7_SR_23"; name="SR-23"; uuid="M_7_SR_23"},
    @{id="M_8_SR_25"; name="SR-25"; uuid="M_8_SR_25"}
)

# Создаем XML файлы для каждой машины
foreach ($machine in $machines) {
    $agentPath = "PIM/Fanuc/$($machine.id)/Agent"
    $xmlPath = "$agentPath/probe.xml"
    
    Write-Host "Creating probe.xml for $($machine.name)..." -ForegroundColor Cyan
    
    # Заменяем плейсхолдеры в шаблоне
    $xmlContent = $xmlTemplate -replace "{{MACHINE_ID}}", $machine.id
    $xmlContent = $xmlContent -replace "{{MACHINE_NAME}}", $machine.name
    $xmlContent = $xmlContent -replace "{{MACHINE_UUID}}", $machine.uuid
    
    # Создаем файл
    $xmlContent | Out-File -FilePath $xmlPath -Encoding UTF8
    
    Write-Host "  ✅ Created: $xmlPath" -ForegroundColor Green
}

Write-Host ""
Write-Host "All probe.xml files created successfully!" -ForegroundColor Green
Write-Host "Now you can run: .\start-local-dev.ps1" -ForegroundColor Yellow 