@echo off
chcp 65001 >nul
echo ========================================================
echo   CÀI ĐẶT RFID ADAPTER APP LÊN MÁY PDA
echo ========================================================
echo.
set ADB="%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe"
if not exist %ADB% (
    echo [LỖI] Không tìm thấy adb.exe tại: %ADB%
    pause
    exit /b
)

echo Đang kiểm tra kết nối thiết bị PDA...
%ADB% devices
echo.

echo Đang cài đặt app-debug.apk lên PDA...
%ADB% install -r "%~dp0app\build\outputs\apk\debug\app-debug.apk"
if %errorlevel% neq 0 (
    echo.
    echo [CHÚ Ý] Cài đặt thất bại! Có thể do lệch chữ ký bản cũ.
    echo Đang gỡ bản cũ và tiến hành cài lại...
    %ADB% uninstall com.tina.rfidadapterapp
    %ADB% install -r "%~dp0app\build\outputs\apk\debug\app-debug.apk"
)

echo.
echo ========================================================
echo [HOÀN TẤT] Nếu có dòng "Success" là app đã được cài xong!
echo.
echo LƯU Ý BẮT BUỘC SAU KHI CÀI MÁY MỚI:
echo 1. Vào Cài đặt máy PDA > Trợ năng (Accessibility) > BẬT cho RfidAdapterApp.
echo 2. Mở app RfidAdapterApp để service tự kích hoạt kết nối đầu đọc.
echo ========================================================
pause

@REM # 1. Kiểm tra máy PDA đã kết nối chưa (phải thấy dòng kết thúc bằng 'device')
@REM & "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" devices

@REM # 2. Cài đặt trực tiếp file APK mới nhất vào máy PDA
@REM & "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" install -r "c:\Users\Admin\Desktop\react\tpm\RfidAdapterApp13\app\build\outputs\apk\debug\app-debug.apk"
