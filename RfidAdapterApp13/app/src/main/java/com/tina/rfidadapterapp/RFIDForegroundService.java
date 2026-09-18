package com.tina.rfidadapterapp;

import android.app.*;
import android.content.*;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.SystemClock;
import android.util.Log;

import com.uhf.lcrrgxmodule.factory.LcModule;
import com.rfid.trans.*;
import com.tina.rfidadapterapp.rfid.RfidSafeApi;
import com.tina.rfidadapterapp.rfid.UHFInfo;

import java.io.FileWriter;
import java.math.BigInteger;
import java.util.HashSet;
import java.util.Set;
import android.media.AudioManager;
import android.media.SoundPool;
import java.util.HashMap;


public class RFIDForegroundService extends Service implements TagCallback {

    private static final String TAG = "RFID_SERVICE";
    public static boolean isServiceConnected = false;
    public static boolean isScanning = false;
    private final Set<String> scannedTags = new HashSet<>();
    private boolean immediateTriggerLocked = false;
    /** Mốc thời gian bắt đầu phiên quét, dùng để đo sau bao lâu mới đọc được thẻ. */
    private long scanStartTime = 0;
    /** Cấu hình đọc sẵn một lần mỗi phiên quét, thay vì mở SharedPreferences mỗi lần đọc thẻ. */
    private boolean soundEnabledCached = true;
    private int scanModeCached = 1;
    private SoundPool soundPool;
    private int beepSoundId;
    private long lastBeepTime = 0;
    private static final int BAUD_RATE = 115200;
    // ================= ACTION =================
    public static final String ACTION_TRIGGER_PHYSICAL =
            "com.tina.rfidadapterapp.TRIGGER";
    public static final String ACTION_SYNC_DATA =
            "com.tina.rfidadapterapp.SYNC_DATA";
    public static final String ACTION_TAG_COUNT =
            "RFID_TAG_COUNT";
    public static final String ACTION_CLEAR_SESSION =
            "RFID_CLEAR_SESSION";

    @Override
    public void onCreate() {
        super.onCreate();
        FileLogger.save(this, "RFIDForegroundService onCreate()");
        registerCommandReceiver();
        registerHardwareTrigger();
        forcePowerOn();
        startForeground(1, createNotification());
        connectReaderAsync();
        initSound();
    }
    private void initSound() {
        soundPool = new SoundPool(10, AudioManager.STREAM_MUSIC, 5);
        beepSoundId = soundPool.load(this, R.raw.barcodebeep, 1);
        if (Reader.rrlib != null) {
            Reader.rrlib.setsoundid(beepSoundId, soundPool);
        }
    }
    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        FileLogger.save(this, "RFIDForegroundService onStartCommand");
        return START_STICKY;
    }
    @Override
    public void onDestroy() {
        FileLogger.save(this, "Service onDestroy");
        isScanning = false;
        isServiceConnected = false;

        if (Reader.rrlib != null) {
            Reader.rrlib.StopRead();
            Reader.rrlib.DisConnect();
        }

        try { unregisterReceiver(commandReceiver); } catch (Exception ignored) {}
        try { unregisterReceiver(hardwareTriggerReceiver); } catch (Exception ignored) {}
        if (soundPool != null) {
            soundPool.release();
            soundPool = null;
        }
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void connectReaderAsync() {
        new Thread(() -> {
            try {
                FileLogger.save(this, "Bắt đầu khởi động RFID Service...");

                com.rfid.PowerUtil.power("1");
                Thread.sleep(1500);

                if (Reader.rrlib == null) {
                    Reader.rrlib = new LcModule().createProduct(0x10);
                }

                if (Reader.rrlib == null) {
                    sendBroadcastStatus("RFID_CONNECTION_STATUS", "is_connected", false);
                    return;
                }

                int ret = Reader.rrlib.Connect("/dev/ttyS3", BAUD_RATE);

                if (ret != 0) {
                    Reader.rrlib.DisConnect();
                    ret = Reader.rrlib.Connect("/dev/ttyS2", BAUD_RATE);
                }

                if (ret == 0) {
                    FileLogger.save(this, "RFID đã kết nối thành công!");
                    Reader.rrlib.SetCallBack(this);
                    isServiceConnected = true;
                    applyHardwareConfig();
                    applyInventoryConfig();
                    sendBroadcastStatus("RFID_CONNECTION_STATUS", "is_connected", true);
                } else {
                    FileLogger.save(this, "Lỗi kết nối RFID, mã: " + ret);
                    sendBroadcastStatus("RFID_CONNECTION_STATUS", "is_connected", false);
                }

            } catch (Exception e) {
                FileLogger.save(this, "Lỗi hệ thống: " + e.getMessage());
            }
        }).start();
    }
    private int getTriggerMode() {
        return getSharedPreferences("RFID_CONFIG", MODE_PRIVATE)
                .getInt("TRIGGER", 0); // 0=Immediate, 1=Hold
    }
    /** Nạp lại các cấu hình được dùng trong đường xử lý mỗi thẻ đọc được. */
    private void refreshRuntimeConfig() {
        SharedPreferences prefs = getSharedPreferences("RFID_CONFIG", MODE_PRIVATE);
        soundEnabledCached = prefs.getInt("SOUND_ENABLED", 1) == 1;
        scanModeCached = prefs.getInt("SCANMODE", 1);
    }
    private int getScanMode() {
        return getSharedPreferences("RFID_CONFIG", MODE_PRIVATE)
                .getInt("SCANMODE", 1); // 0=Single, 1=Multi
    }
    private void applyHardwareConfig() {
        if (Reader.rrlib == null) return;

        SharedPreferences prefs = getSharedPreferences("RFID_CONFIG", MODE_PRIVATE);

        Reader.rrlib.SetRfPower(prefs.getInt("POWER", 30));

        int region = prefs.getInt("REGION", 0);
        int band = (region == 2) ? 4 : (region == 3 ? 1 : 2);
        Reader.rrlib.SetRegion(band, 0, 0);
        FileLogger.save(this, "Apply HW config: power=" + prefs.getInt("POWER", 30));
    }

    private void applyInventoryConfig() {
        if (Reader.rrlib == null) return;
        ReaderParameter p = Reader.rrlib.GetInventoryParameter();
        if (p == null) return;

        SharedPreferences prefs = getSharedPreferences("RFID_CONFIG", MODE_PRIVATE);
        p.QValue   = prefs.getInt("Q_VALUE", p.QValue);
        p.Session  = prefs.getInt("SESSION", p.Session);
        p.ScanTime = prefs.getInt("MAX_SCAN_TIME", p.ScanTime);
        p.Interval = prefs.getInt("INTERVAL", p.Interval);
        p.TidLen   = 0;

        Reader.rrlib.SetInventoryParameter(p);
        Reader.rrlib.SetAntenna((byte) prefs.getInt("ANTENNA", 1));
    }
    private void startScan() {
        if (!isServiceConnected || isScanning) return;
        FileLogger.save(this, "START SCAN");
        applyHardwareConfig();
        applyInventoryConfig();
        refreshRuntimeConfig();
        scannedTags.clear();
        scanStartTime = SystemClock.uptimeMillis();
        sendTagCount(0);
        Reader.rrlib.StartRead();
        isScanning = true;
        sendBroadcastStatus("RFID_SCAN_STATUS", "scanning", true);
    }
    private void stopScan() {
        if (!isScanning) return;

        FileLogger.save(this, "STOP SCAN");

        Reader.rrlib.StopRead();
        isScanning = false;
        sendBroadcastStatus("RFID_SCAN_STATUS", "scanning", false);
    }
    private void toggleScanning() {
        if (isScanning) stopScan();
        else startScan();
    }
    private String normalizeEpc(String raw) {
        if (raw == null) return null;
        // Trước đây dùng raw.matches(".*[A-F].*"), tức biên dịch lại biểu thức chính quy
        // cho MỖI lần đọc thẻ - kể cả thẻ trùng, trong kho dày đặc là hàng nghìn lần
        // mỗi giây. Quét ký tự thủ công không cấp phát gì cả.
        if (hasHexLetter(raw)) return raw.toUpperCase();
        try {
            String hex = new BigInteger(raw, 10).toString(16).toUpperCase();
            return String.format("%24s", hex).replace(' ', '0');
        } catch (Exception e) {
            return null;
        }
    }

    private boolean hasHexLetter(String raw) {
        for (int i = 0; i < raw.length(); i++) {
            char c = raw.charAt(i);
            if (c >= 'A' && c <= 'F') return true;
        }
        return false;
    }
    @Override
    public void tagCallback(ReadTag tag) {
        if (!isScanning || tag == null) return;

        String epc = normalizeEpc(tag.epcId);
        if (!isRealEpc(epc)) return;

        // BƯỚC 1: PHÁT TIẾNG BEEP NGAY KHI NHẬN ĐƯỢC DỮ LIỆU
        if (soundPool != null && beepSoundId != 0 && soundEnabledCached) {
            long currentTime = System.currentTimeMillis();
            // Chỉ beep nếu khoảng cách giữa 2 lần nhận > 100ms để tránh âm thanh bị rè/dính
            if (currentTime - lastBeepTime > 100) {
                soundPool.play(beepSoundId, 1.0f, 1.0f, 1, 0, 1.0f);
                lastBeepTime = currentTime;
            }
        }

        // BƯỚC 2: GHI DỮ LIỆU (Thêm vào danh sách và gửi sang bàn phím)
        int scanMode = scanModeCached;

        if (scanMode == 0) { // Chế độ quét đơn (Single)
            if (scannedTags.add(epc)) {
                sendBroadcastText("RFID_UI_UPDATE", "epc", epc);
                sendTagCount(scannedTags.size());
                stopScan();
                immediateTriggerLocked = false;
            }
            return;
        }

        if (scanMode == 1) { // Chế độ quét liên tục (Multi)
            if (scannedTags.add(epc)) {
                Log.d("RFID_PERF", "tag#" + scannedTags.size()
                        + " +" + (SystemClock.uptimeMillis() - scanStartTime) + "ms " + epc);
                // Chỉ "ghi" vào bàn phím nếu là thẻ mới chưa quét trong phiên này
                sendBroadcastText("RFID_UI_UPDATE", "epc", epc);
                sendTagCount(scannedTags.size());
            }
        }
    }

    @Override public int tagCallbackFailed(int reason) { return 0; }
    @Override public int CRCErrorCallBack(int reason) { return 0; }
    @Override public void FinishCallBack() {}

    private final BroadcastReceiver commandReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context c, Intent i) {
            if (i == null) return;
            switch (i.getAction()) {
                case ACTION_CLEAR_SESSION:
                    scannedTags.clear();
                    sendBroadcast(new Intent("RFID_CLEAR_UI"));
                    sendTagCount(0);
                    break;

                case ACTION_SYNC_DATA:
                    for (String epc : scannedTags)
                        sendBroadcastText("RFID_UI_UPDATE", "epc", epc);
                    sendTagCount(scannedTags.size());
                    sendBroadcastStatus("RFID_SCAN_STATUS", "scanning", isScanning);
                    break;

                case ACTION_TRIGGER_PHYSICAL: {
                    boolean pressed = i.getBooleanExtra("pressed", false);
                    String source = i.getStringExtra("source");
                    boolean isFromUI = "UI".equals(source);

                    int triggerMode = getTriggerMode(); // 0: Immediate, 1: Hold

                    if (isFromUI) {
                        if (pressed) {
                            toggleScanning();
                        }
                    } else {
                        if (triggerMode == 1) { // CHẾ ĐỘ HOLD
                            if (pressed) {
                                if (!isScanning) startScan();
                            } else {
                                if (isScanning) stopScan();
                            }
                        } else { // CHẾ ĐỘ IMMEDIATE
                            if (pressed) {
                                if (!immediateTriggerLocked) {
                                    immediateTriggerLocked = true;
                                    toggleScanning();
                                }
                            } else {
                                immediateTriggerLocked = false;
                            }
                        }
                    }
                    break;
                }
                case "ACTION_APPLY_CONFIG":
                    applyHardwareConfig();
                    applyInventoryConfig();
                    refreshRuntimeConfig();
                    break;
            }
        }
    };
    private final BroadcastReceiver hardwareTriggerReceiver =
            new BroadcastReceiver() {
                @Override
                public void onReceive(Context context, Intent intent) {
                    boolean pressed =
                            intent.getBooleanExtra("pressed", false);

                    Intent i = new Intent(ACTION_TRIGGER_PHYSICAL);
                    i.setPackage(getPackageName());
                    i.putExtra("pressed", pressed);

                    sendBroadcast(i);
                }
            };
    private void registerHardwareTrigger() {
        IntentFilter f = new IntentFilter();
        f.addAction("android.intent.action.rfid.TRIGGER");
        registerReceiver(hardwareTriggerReceiver, f);

        Log.e(TAG, "Hardware trigger receiver registered");
    }
    private void registerCommandReceiver() {
        IntentFilter f = new IntentFilter();

        // Trigger vật lý
        f.addAction(ACTION_TRIGGER_PHYSICAL);

        // Các action khác
        f.addAction(ACTION_SYNC_DATA);
        f.addAction(ACTION_CLEAR_SESSION);

        registerReceiver(commandReceiver, f);
    }
    private void forcePowerOn() {
        new Thread(() -> {
            String[] powerPaths = {
                    "/proc/gpiocontrol/set_uhf",
                    "/sys/class/pw_control/usb_uhf/enable",
                    "/sys/class/misc/pw-ctl/pw_uhf",
                    "/sys/devices/platform/pwr_ctrl/pwr_en"
            };

            for (String path : powerPaths) {
                try {
                    java.io.FileWriter fw = new java.io.FileWriter(path);
                    fw.append("1");
                    fw.close();
                    FileLogger.save(this, "Đã thử kích nguồn thành công qua: " + path);
                } catch (Exception e) {}
            }
        }).start();
    }

    private Notification createNotification() {
        String ch = "rfid_channel";
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel c = new NotificationChannel(
                    ch, "RFID Service", NotificationManager.IMPORTANCE_LOW);
            getSystemService(NotificationManager.class)
                    .createNotificationChannel(c);
        }
        return new Notification.Builder(this, ch)
                .setContentTitle("RFID Scanner")
                .setContentText("Service running")
                .setSmallIcon(R.mipmap.ic_launcher)
                .build();
    }
    private boolean isRealEpc(String epc) {
        return epc != null && epc.length() == 24 && epc.startsWith("E2");
    }

    private void sendTagCount(int count) {
        Intent i = new Intent(ACTION_TAG_COUNT);
        i.setPackage(getPackageName());
        i.putExtra("count", count);
        sendBroadcast(i);
    }

    private void sendBroadcastText(String action, String key, String value) {
        Intent i = new Intent(action);
        i.setPackage(getPackageName());
        i.putExtra(key, value);
        sendBroadcast(i);
    }

    private void sendBroadcastStatus(String action, String key, boolean value) {
        Intent i = new Intent(action);
        i.setPackage(getPackageName());
        i.putExtra(key, value);
        sendBroadcast(i);
    }
}
