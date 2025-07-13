// Проверка базы MongoDB
db = db.getSiblingDB('mtconnect')

print('=== ПРОВЕРКА БАЗЫ ДАННЫХ ===')
print('Базы данных:')
db.adminCommand('listDatabases').databases.forEach(db => print('  ' + db.name))

print('\n=== КОЛЛЕКЦИИ В mtconnect ===')
print('Коллекции:')
db.listCollectionNames().forEach(name => print('  ' + name))

print('\n=== СЧЕТЧИКИ ДОКУМЕНТОВ ===')
try {
  let machineDataCount = db.machine_data.countDocuments()
  print('machine_data: ' + machineDataCount)
} catch(e) {
  print('machine_data: коллекция не найдена')
}

try {
  let machineStatesCount = db.machine_states.countDocuments()
  print('machine_states: ' + machineStatesCount)
} catch(e) {
  print('machine_states: коллекция не найдена')
}

try {
  let aggregatedDataCount = db.aggregated_data.countDocuments()
  print('aggregated_data: ' + aggregatedDataCount)
} catch(e) {
  print('aggregated_data: коллекция не найдена')
}

print('\n=== ПОСЛЕДНИЕ 3 ЗАПИСИ machine_data ===')
try {
  db.machine_data.find().sort({timestamp: -1}).limit(3).forEach(printjson)
} catch(e) {
  print('Ошибка: ' + e)
}

print('\n=== ПОСЛЕДНИЕ 3 ЗАПИСИ machine_states ===')
try {
  db.machine_states.find().sort({timestamp: -1}).limit(3).forEach(printjson)
} catch(e) {
  print('Ошибка: ' + e)
} 