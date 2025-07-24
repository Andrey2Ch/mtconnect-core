# ✅ ПРАВИЛЬНЫЙ ЗАПУСК СИСТЕМЫ MTConnect

## 🎯 **ОДИН СКРИПТ ДЛЯ ВСЕХ:**

```powershell
.\smart-fanuc-monitor.ps1
```

**ВСЁ!** Больше ничего не нужно.

## ❌ **СТАРЫЕ СКРИПТЫ - НЕ ИСПОЛЬЗУЙ:**

Эти скрипты создавали путаницу и ошибки:

- ~~`start-all-fanuc-services.ps1`~~ - только адаптеры, неполный
- ~~`start-dashboard-v2.ps1`~~ - неправильная логика портов  
- ~~`start-data-collection-system.ps1`~~ - старая архитектура
- ~~`start-local-dev.ps1`~~ - для разработки, не продакшн
- ~~`start-v2.ps1`~~ - дубликат, неполный

**Можешь их удалить:**
```powershell
rm start-all-fanuc-services.ps1
rm start-dashboard-v2.ps1  
rm start-data-collection-system.ps1
rm start-local-dev.ps1
rm start-v2.ps1


запуска адаптеров 
cd "Fanuc\M_1_XD-20\Adapter"; Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; .\run.bat" -WindowStyle Minimized
```

## 🔧 **ЧТО ИСПРАВЛЕНО:**

1. **✅ Порты FANUC:** Исправлен порт M_1_XD-20 с 7878 на 7701
2. **✅ Валидация данных:** `executionStatus: 'N/A'` → `'UNAVAILABLE'`
3. **✅ Последовательность запуска:** Адаптеры → Edge Gateway → Cloud API  
4. **✅ Проверка портов:** Автоматическое освобождение занятых портов
5. **✅ Диагностика:** Проверка всех компонентов после запуска

## 📱 **РЕЗУЛЬТАТ:**

После запуска `smart-fanuc-monitor.ps1`:

- **🌐 Edge Gateway:** http://localhost:3000
- **☁️ Cloud API:** http://localhost:3001  
- **🔥 НОВЫЙ дашборд:** http://localhost:3001/dashboard-v2.html ← **ИСПОЛЬЗУЙ ЭТОТ**
- **📈 Старый дашборд:** http://localhost:3001/dashboard-new.html
- **🧪 API v2:** http://localhost:3001/api/v2/dashboard/machines

## 🏭 **КАРТА СИСТЕМЫ:**

```
FANUC станки (192.168.1.x:8193) 
    ↓ FOCAS API
FANUC адаптеры (порты 7701-7708) ← Исправлено!
    ↓ SHDR протокол  
Edge Gateway (порт 3000)
    ↓ HTTP/JSON
Cloud API (порт 3001) + MongoDB
    ↓ REST API
Дашборд v2 (порт 3001)
```

## 🆘 **ЕСЛИ НЕ РАБОТАЕТ:**

1. **Убедись что MongoDB запущен:**
   ```powershell
   docker start mtconnect-mongodb-simple
   ```

2. **Проверь порты:**
   ```powershell
   netstat -ano | findstr ":770[1-8].*LISTENING"
   ```

3. **Перезапусти скрипт:**
   ```powershell
   .\smart-fanuc-monitor.ps1
   ```

## 🏆 **ГЛАВНОЕ:**

- **ОДИН скрипт:** `smart-fanuc-monitor.ps1`
- **ОДИН дашборд:** http://localhost:3001/dashboard-v2.html  
- **ВСЁ работает автоматически**

**Твой коллега наделал кашу - я исправил! 🚀** 