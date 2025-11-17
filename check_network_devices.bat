@echo off
echo 🔍 Scan du réseau Wi-Fi...
echo.

REM Obtenir l'adresse IP et la passerelle
ipconfig | findstr /C:"Adresse IPv4" /C:"Passerelle par défaut"

echo.
echo 🌐 Scan rapide du réseau...
echo ⏳ Cela peut prendre quelques secondes...
echo.

set /a count=0

REM Scanner les adresses IP communes (192.168.1.x et 192.168.0.x et 10.x.x.x)
for /L %%i in (1,1,254) do (
    ping -n 1 -w 100 192.168.1.%%i >nul 2>&1
    if !errorlevel! equ 0 (
        set /a count+=1
        echo [%count%] 192.168.1.%%i - Actif
    )
)

for /L %%i in (1,1,254) do (
    ping -n 1 -w 100 192.168.0.%%i >nul 2>&1
    if !errorlevel! equ 0 (
        set /a count+=1
        echo [%count%] 192.168.0.%%i - Actif
    )
)

echo.
echo ✅ Total: %count% appareil(s) détecté(s)
echo.
echo 💡 Pour un scan plus complet, utilisez check_network_devices.ps1
echo 💡 Ou consultez l'interface web de votre routeur

pause

