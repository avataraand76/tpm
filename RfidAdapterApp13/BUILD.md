# Build và cài app lên máy PDA

Máy này chưa có `java` trong PATH, nên mọi lệnh gradle đều phải đặt `JAVA_HOME`
trỏ vào JDK đi kèm Android Studio trước.

## Cách nhanh nhất (PowerShell)

Mở PowerShell tại thư mục `RfidAdapterApp13`, cắm PDA qua USB (đã bật USB
debugging), rồi chạy:

```powershell
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
.\gradlew.bat installDebug
```

`installDebug` vừa build vừa cài thẳng qua USB, không sinh file để copy tay.
Chạy xong mở app trên PDA là thấy bản mới.

## Nếu muốn tách riêng build và cài

```powershell
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
.\gradlew.bat assembleDebug
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" install -r app\build\outputs\apk\debug\app-debug.apk
```

File APK nằm ở `app\build\outputs\apk\debug\app-debug.apk`.

## Kiểm tra trước khi cài

```powershell
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" devices
```

Phải thấy một dòng kết thúc bằng `device`. Nếu ghi `unauthorized` thì nhìn màn
hình PDA để bấm đồng ý cho phép gỡ lỗi USB.

## Sau khi cài

- Accessibility service thường vẫn giữ nguyên trạng thái bật. Nếu app không tự
  điền được mã sang web nữa thì vào Cài đặt > Trợ năng bật lại cho app.
- Service nền tự khởi động khi mở app, không cần reboot máy.
- Nếu báo lỗi chữ ký khi cài đè, phải gỡ bản cũ trước (sẽ mất cấu hình đã lưu):

```powershell
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" uninstall com.tina.rfidadapterapp
```

## Xem log đo tốc độ quét

ROM của PDA chặn log mức DEBUG, nên phải bật riêng cho tag này sau **mỗi lần
khởi động lại máy**:

```powershell
$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
& $adb shell setprop log.tag.RFID_PERF D
```

Quét thử xong thì đọc log:

```powershell
& $adb logcat -d -s RFID_PERF:D
```

Ý nghĩa các dòng:

- `tag#N +XXXXms` — sau bao nhiêu mili giây kể từ lúc bóp cò thì đầu đọc gặp
  được thẻ thứ N chưa từng đọc. Số này lớn nghĩa là nghẽn ở đầu đọc, chỉnh
  Session và Q Value trong Settings.
- `inject ... root= focus= setText= ok=true` — thời gian app ghi mã sang ô nhập
  của web, tách theo từng chặng.
- `chua co o nhap nao dang focus` — lúc đó trang web không có ô nào đang được
  chọn, mã phải chờ ghi lại.

## Cài đặt khác cần biết

- Cấu hình quét lưu trong SharedPreferences của app. Xem bằng:

```powershell
& $adb shell "run-as com.tina.rfidadapterapp cat /data/data/com.tina.rfidadapterapp/shared_prefs/RFID_CONFIG.xml"
```

- Giá trị mà nút "Khôi phục mặc định" ghi đè nằm ở các hằng số `DEF_*` đầu file
  `app/src/main/java/com/tina/rfidadapterapp/SettingsActivity.java`. Sửa ở đó là
  hộp thoại xác nhận và dòng mô tả trên màn hình tự đổi theo.
