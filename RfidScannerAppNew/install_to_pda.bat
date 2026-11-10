@echo off
setlocal
chcp 65001 >nul
echo ========================================================
echo   CAI DAT RFID SCANNER (BAN MOI) LEN MAY PDA
echo ========================================================
set ADB="%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe"
if not exist %ADB% (
    echo [LOI] Khong tim thay adb.exe tai %ADB%
    pause
    exit /b 1
)
set APK="%~dp0app\build\outputs\apk\debug\app-debug.apk"
if not exist %APK% (
    echo Chua co APK, dang build...
    cd /d "%~dp0"
    call gradlew.bat assembleDebug || (pause & exit /b 1)
)
%ADB% devices
%ADB% install -r -d -g %APK%
if errorlevel 1 (
    echo [CHU Y] Cai de that bai, co the do khac chu ky. Go ban cu roi cai lai...
    %ADB% uninstall com.tina.rfidadapterapp
    %ADB% install -r -d -g %APK%
)
echo.
echo SAU KHI CAI:
echo  1. Cai dat PDA ^> Tro nang ^> BAT "RFID - phim co" (ten dich vu da doi so voi app cu).
echo  2. Mo TPM bang icon "TPM" cua app de ma the di thang vao trang web.
pause
