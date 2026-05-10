@echo off
echo ============================================================
echo  ChillArrival Eco-Analytics - MQTT Project Launcher
echo ============================================================
echo.
echo Membuka semua komponen MQTT di terminal terpisah...
echo.

:: 1. Broker (harus pertama)
start "MQTT Broker" cmd /k "cd /d "%~dp0" && node broker.js"
timeout /t 2 /nobreak >nul

:: 2. Publishers
start "Publisher - Suhu Ruangan" cmd /k "cd /d "%~dp0" && node publisher-suhu.js"
start "Publisher - AC Bedroom"   cmd /k "cd /d "%~dp0" && node publisher-ac.js"
start "Publisher - Lamp Kitchen" cmd /k "cd /d "%~dp0" && node publisher-lamp.js"
start "Publisher - Main System (LWT)" cmd /k "cd /d "%~dp0" && node publisher-system.js"

timeout /t 1 /nobreak >nul

:: 3. Subscribers
start "Subscriber - Data Logger"    cmd /k "cd /d "%~dp0" && node subscriber-logger.js"
start "Subscriber - Alert Monitor"  cmd /k "cd /d "%~dp0" && node subscriber-alert.js"

echo.
echo ============================================================
echo  Semua proses berjalan!
echo  Buka dashboard di: http://localhost:8080/
echo ============================================================
echo.
timeout /t 3 /nobreak >nul
start http://localhost:8080/
