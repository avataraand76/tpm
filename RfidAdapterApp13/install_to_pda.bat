@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
echo ========================================================
echo   CAI DAT RFID ADAPTER APP (TWA) LEN MAY PDA
echo ========================================================
echo.

set ADB="%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe"
if not exist %ADB% (
    echo [LOI] Khong tim thay adb.exe tai: %ADB%
    pause
    exit /b
)

echo Kiem tra ket noi thiet bi PDA...
%ADB% devices
echo.

set APK="%~dp0app\build\outputs\apk\debug\app-debug.apk"
if not exist %APK% set APK="%~dp0app\build\intermediates\apk\debug\app-debug.apk"

if not exist %APK% (
    echo [LOI] Khong tim thay file APK nao trong build!
    echo Dang tien hanh build moi bang Gradle...
    cd /d "%~dp0"
    call gradlew.bat assembleDebug
    if not exist %APK% (
        echo [LOI] Build that bai hoac khong tao duoc APK!
        pause
        exit /b
    )
)

echo Dang cai dat APK len PDA tu: %APK%
%ADB% install -r -t -d -g %APK%
if %errorlevel% neq 0 (
    echo.
    echo [CHU Y] Cai dat that bai! Co the do lech chu ky ban cu.
    echo Dang go ban cu va tien hanh cai lai...
    %ADB% uninstall com.tina.rfidadapterapp
    %ADB% install -r -t -d -g %APK%
)

echo.
echo ========================================================
echo [HOAN TAT] Neu co dong "Success" la app da duoc cai xong!
echo.
echo LUU Y BAT BUOC SAU KHI CAI MAY MOI:
echo 1. Vao Cai dat may PDA ^> Tro nang (Accessibility) ^> BAT cho RfidAdapterApp.
echo 2. Mo app de service tu kich hoat ket noi dau doc.
echo ========================================================
pause
