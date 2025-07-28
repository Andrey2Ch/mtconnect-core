// 🧪 ТЕСТОВЫЙ СКРИПТ ДЛЯ HTTP ПОДКЛЮЧЕНИЙ К FANUC АДАПТЕРАМ
// Аналог простого коллектора из рабочего проекта Fanuk_Test

const http = require('http');

// Конфигурация машин (как в config.json)
const machines = [
    { id: 'M_1_XD-20', name: 'XD-20', port: 7701 },
    { id: 'M_2_SR_26', name: 'SR-26', port: 7702 },
    { id: 'M_3_XD_38', name: 'XD-38', port: 7703 },
    { id: 'M_4_SR_10', name: 'SR-10', port: 7704 },
    { id: 'M_5_DT_26', name: 'DT-26', port: 7705 },
    { id: 'M_6_SR_21', name: 'SR-21', port: 7706 },
    { id: 'M_7_SR_23', name: 'SR-23', port: 7707 },
    { id: 'M_8_SR_25', name: 'SR-25', port: 7708 }
];

/**
 * HTTP запрос к адаптеру
 */
function makeHttpRequest(port, endpoint = '/current') {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: port,
            path: endpoint,
            method: 'GET',
            timeout: 5000
        };

        const req = http.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                resolve(data);
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.on('timeout', () => {
            req.destroy();
            reject(new Error('HTTP timeout'));
        });

        req.end();
    });
}

/**
 * Парсинг SHDR данных из HTTP ответа
 */
function parseMTConnectData(rawData, machineId) {
    try {
        const lines = rawData.split('\n');
        
        // Ищем последнюю строку с данными
        let dataLine = '';
        for (let i = lines.length - 1; i >= 0; i--) {
            const line = lines[i].trim();
            if (line.includes('|avail|') || line.includes('|part_count|')) {
                dataLine = line;
                break;
            }
        }

        if (!dataLine) {
            return null;
        }

        // Парсим SHDR строку
        const parts = dataLine.split('|');
        const timestamp = parts[0];
        const data = {};

        for (let i = 1; i < parts.length; i += 2) {
            if (i + 1 < parts.length) {
                data[parts[i]] = parts[i + 1];
            }
        }

        // Извлекаем программу из комментария
        const programComment = data.program_comment || '';
        let program = data.program || '';
        
        if (programComment && programComment.includes('O')) {
            const match = programComment.match(/O(\d+)/);
            if (match) {
                const progNum = parseInt(match[1]);
                program = `${Math.floor(progNum / 1000)}.${progNum % 1000}`;
            }
        }

        return {
            machineId,
            partCount: parseInt(data.part_count) || 0,
            program: program,
            programComment: programComment,
            availability: data.avail || 'UNAVAILABLE',
            execution: data.execution || 'UNAVAILABLE',
            mode: data.mode || 'UNAVAILABLE',
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        console.error(`❌ Ошибка парсинга для ${machineId}:`, error.message);
        return null;
    }
}

/**
 * Тестирование всех машин
 */
async function testAllMachines() {
    console.log('🚀 Тестирование HTTP подключений к FANUC адаптерам...\n');
    
    const results = [];
    
    for (const machine of machines) {
        try {
            console.log(`🔍 Тестирую ${machine.name} (localhost:${machine.port})...`);
            
            const rawData = await makeHttpRequest(machine.port);
            const parsed = parseMTConnectData(rawData, machine.id);
            
            if (parsed) {
                console.log(`  ✅ ${machine.name}: ${parsed.partCount} деталей, программа ${parsed.program || 'N/A'}`);
                console.log(`     Статус: ${parsed.availability}, Режим: ${parsed.mode}`);
                if (parsed.programComment) {
                    console.log(`     Комментарий: ${parsed.programComment}`);
                }
                results.push(parsed);
            } else {
                console.log(`  ⚠️  ${machine.name}: нет корректных данных`);
            }
            
        } catch (error) {
            console.log(`  ❌ ${machine.name}: ошибка подключения (${error.message})`);
        }
        
        console.log('');
    }
    
    // Сводка
    console.log('📊 СВОДКА РЕЗУЛЬТАТОВ:');
    console.log(`   Всего машин: ${machines.length}`);
    console.log(`   Отвечают: ${results.length}`);
    console.log(`   Не отвечают: ${machines.length - results.length}`);
    
    if (results.length > 0) {
        const totalParts = results.reduce((sum, r) => sum + r.partCount, 0);
        console.log(`   Общий объем производства: ${totalParts.toLocaleString()} деталей`);
    }
    
    console.log('\n✅ Тестирование завершено!');
    
    return results;
}

/**
 * Сохранение результатов в файл
 */
function saveResults(results) {
    const fs = require('fs');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `fanuc_test_${timestamp}.json`;
    
    const report = {
        timestamp: new Date().toISOString(),
        totalMachines: machines.length,
        respondingMachines: results.length,
        results: results
    };
    
    fs.writeFileSync(filename, JSON.stringify(report, null, 2));
    console.log(`💾 Результаты сохранены в: ${filename}`);
}

// Запуск тестирования
if (require.main === module) {
    testAllMachines()
        .then(results => {
            if (results.length > 0) {
                saveResults(results);
            }
        })
        .catch(error => {
            console.error('❌ Критическая ошибка:', error);
        });
} 