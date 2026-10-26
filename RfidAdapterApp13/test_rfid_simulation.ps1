# Script giả lập quét RFID vào máy PDA qua USB Debug
param (
    [int]$Count = 50,
    [int]$IntervalMs = 30,
    [switch]$StopHalfway = $false
)

$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " GIẢ LẬP BẮN $Count MÃ RFID VÀO PDA" -ForegroundColor Yellow
Write-Host " Đảm bảo đang mở web trên PDA và con trỏ đang ở ô nhập liệu!" -ForegroundColor Green
Write-Host "=========================================="

1..$Count | ForEach-Object {
    $epc = "E2801191200000000000" + $_.ToString("D4")
    & $adb shell am broadcast -a RFID_UI_UPDATE --es epc $epc | Out-Null
    Write-Host "[$_/$Count] Đã bắn: $epc" -ForegroundColor DarkGray
    Start-Sleep -Milliseconds $IntervalMs

    if ($StopHalfway -and $_ -eq [math]::Floor($Count / 2)) {
        Write-Host "--> KÍCH HOẠT DỪNG QUÉT (STOP) TẠI MÃ THỨ $_ <--" -ForegroundColor Red
        & $adb shell am broadcast -a com.tina.rfidadapterapp.STOP_QUEUE | Out-Null
        break
    }
}

Write-Host "`nHoàn tất phát mã! Log hiệu năng gần nhất:" -ForegroundColor Cyan
& $adb logcat -d -s RFID_PERF:D | Select-Object -Last 10

# .\test_rfid_simulation.ps1 -Count 60 -IntervalMs 25 -StopHalfway
