package com.tina.rfidadapterapp;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.media.AudioAttributes;
import android.media.SoundPool;
import android.os.Build;
import android.os.Handler;
import android.os.HandlerThread;
import android.os.IBinder;
import android.os.Looper;
import android.os.SystemClock;
import android.util.Log;

import com.tina.rfidadapterapp.reader.UhfReader;
import com.tina.rfidadapterapp.ui.SettingsActivity;
import com.tina.rfidadapterapp.ui.TestScanActivity;

import java.math.BigInteger;
import java.util.Collections;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Dịch vụ nền giữ kết nối với đầu đọc UHF và điều khiển việc quét.
 *
 * Đường đi của một mã thẻ:
 *   SDK (luồng riêng) → {@link #onTag} → lọc / khử trùng → {@link TagBus} (gom lô 50ms)
 *   → {@link WebDelivery} → trang TPM (TWA postMessage, hoặc Trợ năng nếu không có TWA).
 */
public class ScanService extends Service implements UhfReader.Listener {

    public static final class Status {
        public final boolean connected;
        public final boolean scanning;
        public final int unique;
        public final long reads;
        public final long startedAt;
        public final String message;
        /** Nhiệt độ module UHF lần đo gần nhất (°C), null nếu chưa đo được. */
        public final Integer moduleTemp;
        /** Thời điểm đo (elapsedRealtime), 0 nếu chưa đo. */
        public final long moduleTempAt;

        Status(boolean connected, boolean scanning, int unique, long reads, long startedAt, String message,
               Integer moduleTemp, long moduleTempAt) {
            this.connected = connected;
            this.scanning = scanning;
            this.unique = unique;
            this.reads = reads;
            this.startedAt = startedAt;
            this.message = message;
            this.moduleTemp = moduleTemp;
            this.moduleTempAt = moduleTempAt;
        }

        /** Ví dụ "41 °C (12 giây trước)". */
        public String moduleTempText() {
            if (moduleTemp == null) return connected ? "chưa đo" : "–";
            long ago = (SystemClock.elapsedRealtime() - moduleTempAt) / 1000;
            return moduleTemp + " °C (" + (ago < 2 ? "vừa đo" : ago + " giây trước") + ")";
        }
    }

    /** Thống kê từng thẻ trong phiên quét, cho màn hình kiểm tra. */
    public static final class TagStat {
        public final String code;
        public volatile int count;
        public volatile int rssi;
        public final long firstAt;

        TagStat(String code, int rssi, long firstAt) {
            this.code = code;
            this.rssi = rssi;
            this.firstAt = firstAt;
        }
    }

    private static final String TAG = "ScanService";
    private static final String CHANNEL = "rfid_channel";
    private static final int NOTIFICATION_ID = 1;
    /** Broadcast nút cò của máy PDA (một số dòng máy gửi qua đây thay vì phím). */
    private static final String ACTION_HW_TRIGGER = "android.intent.action.rfid.TRIGGER";
    /** Khoảng cách tối thiểu giữa hai tiếng bíp, để nhiều lượt đọc dồn dập không thành tiếng rè. */
    private static final long BEEP_GAP_MS = 100;
    /** Chu kỳ đo nhiệt độ module khi đang rảnh. */
    private static final long TEMP_PERIOD_MS = 15_000;
    private static final long NOTIFICATION_PERIOD_MS = 10_000;

    private static volatile ScanService instance;

    private final UhfReader reader = new UhfReader();
    private final Handler main = new Handler(Looper.getMainLooper());
    private HandlerThread ioThread;
    private Handler io;

    private volatile Config cfg;
    private volatile boolean configDirty = true;
    private volatile boolean scanning;
    /** Tăng mỗi phiên quét; thẻ SDK trả về muộn của phiên cũ sẽ bị bỏ. */
    private volatile int sessionId;
    private volatile boolean triggerDown;
    private volatile long startedAt;
    private volatile long reads;
    private volatile String message = "Đang kết nối đầu đọc...";
    /** Luồng quét của SDK còn chạy (sau StopRead nó chạy nốt vòng hiện tại rồi mới thoát). */
    private volatile boolean sdkRunning;
    private volatile Integer moduleTemp;
    private volatile long moduleTempAt;
    private final Map<String, TagStat> stats = new ConcurrentHashMap<>();
    private final Set<String> seen = Collections.newSetFromMap(new ConcurrentHashMap<>());

    private SoundPool soundPool;
    private int beepId;
    private long lastBeepAt;
    private WebDelivery delivery;

    // ---------------- Truy cập từ các thành phần khác trong app ----------------

    public static ScanService get() {
        return instance;
    }

    public static void start(Context ctx) {
        if (!Config.load(ctx).serviceEnabled) return;
        Intent i = new Intent(ctx, ScanService.class);
        try {
            if (Build.VERSION.SDK_INT >= 26) ctx.startForegroundService(i);
            else ctx.startService(i);
        } catch (Exception e) {
            Log.w(TAG, "Không khởi động được dịch vụ: " + e);
        }
    }

    public static void stop(Context ctx) {
        ctx.stopService(new Intent(ctx, ScanService.class));
    }

    /** Gọi sau khi đổi cấu hình chỉ xử lý trong app (pre-filter...): không cần ghi lại xuống module. */
    public static void onAppConfigChanged() {
        ScanService s = instance;
        if (s != null) s.cfg = Config.load(s);
    }

    /** Gọi sau khi đổi bất kỳ cấu hình nào. */
    public static void onConfigChanged() {
        ScanService s = instance;
        if (s == null) return;
        s.cfg = Config.load(s);
        s.configDirty = true;
        if (!s.scanning) s.io.post(s::applyConfigIfDirty);
    }

    // ---------------- Vòng đời ----------------

    @Override
    public void onCreate() {
        super.onCreate();
        cfg = Config.load(this);
        startForeground(NOTIFICATION_ID, buildNotification());

        ioThread = new HandlerThread("uhf-io");
        ioThread.start();
        io = new Handler(ioThread.getLooper());

        soundPool = new SoundPool.Builder()
                .setMaxStreams(2)
                .setAudioAttributes(new AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ASSISTANCE_SONIFICATION)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build())
                .build();
        beepId = soundPool.load(this, R.raw.beep, 1);

        delivery = new WebDelivery(this);
        TagBus.register(delivery);

        IntentFilter f = new IntentFilter(ACTION_HW_TRIGGER);
        if (Build.VERSION.SDK_INT >= 33) registerReceiver(hwTrigger, f, Context.RECEIVER_EXPORTED);
        else registerReceiver(hwTrigger, f);

        reader.setListener(this);
        // Gán sau cùng: nơi khác thấy instance != null là io/soundPool đã sẵn sàng.
        instance = this;
        io.post(this::connect);
        main.postDelayed(notificationTicker, NOTIFICATION_PERIOD_MS);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (!Config.load(this).serviceEnabled) {
            stopSelf();
            return START_NOT_STICKY;
        }
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        instance = null;
        scanning = false;
        sessionId++;
        try { unregisterReceiver(hwTrigger); } catch (Exception ignored) {}
        TagBus.unregister(delivery);
        reader.setListener(null);
        io.post(reader::disconnect);
        main.removeCallbacks(notificationTicker);
        ioThread.quitSafely();
        if (soundPool != null) soundPool.release();
        publishStatus();
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    // ---------------- Kết nối và cấu hình (luồng io) ----------------

    private void connect() {
        message = "Đang kết nối đầu đọc...";
        publishStatus();
        if (reader.connect()) {
            configDirty = true;
            applyConfigIfDirty();
            message = "Đầu đọc sẵn sàng";
            io.removeCallbacks(tempTicker);
            io.post(tempTicker);
        } else {
            message = "Lỗi kết nối: " + reader.lastError();
            io.postDelayed(this::connect, 5000);
        }
        publishStatus();
    }

    private void applyConfigIfDirty() {
        if (!configDirty || !reader.isConnected()) return;
        configDirty = false;
        Config c = cfg;
        String r = reader.applyConfig(c);
        Log.i(TAG, "Áp dụng cấu hình: " + r);
        FileLog.write(this, "Áp dụng cấu hình: " + r);
    }

    // ---------------- Điều khiển quét ----------------

    public boolean isScanning() {
        return scanning;
    }

    public void toggleScan() {
        if (scanning) stopScan("người dùng");
        else startScan();
    }

    public void startScan() {
        if (scanning) return;
        if (!reader.isConnected()) {
            message = "Chưa kết nối được đầu đọc";
            publishStatus();
            return;
        }
        scanning = true;
        final int sid = ++sessionId;
        seen.clear();
        stats.clear();
        reads = 0;
        startedAt = SystemClock.elapsedRealtime();
        TagBus.clearSession();
        message = "Đang quét";
        publishStatus();
        io.post(() -> beginInventory(sid, 0));
    }

    private void beginInventory(int sid, int attempt) {
        if (sid != sessionId || !scanning) return;
        applyConfigIfDirty();
        int r = reader.start();
        if (r == 0) {
            sdkRunning = true;
            FileLog.write(this, "BẮT ĐẦU QUÉT" + (moduleTemp != null ? " (module " + moduleTemp + " °C)" : ""));
            return;
        }
        // Vòng quét trước của SDK chưa thoát: nó chỉ dừng khi hết vòng inventory hiện tại,
        // tức tối đa ScanTime (đơn vị 100ms), nên chờ đủ thời gian đó cộng 1 giây.
        int maxAttempts = (cfg.scanTime * 100 + 1000) / 50;
        if (attempt < maxAttempts) {
            io.postDelayed(() -> beginInventory(sid, attempt + 1), 50);
        } else {
            main.post(() -> {
                if (sid != sessionId) return;
                scanning = false;
                message = "Đầu đọc không bắt đầu quét được (mã " + r + ")";
                publishStatus();
            });
        }
    }

    public void stopScan(String reason) {
        if (!scanning) return;
        scanning = false;
        sessionId++;
        reader.stop();
        message = "Đã dừng (" + reason + ")";
        FileLog.write(this, "DỪNG QUÉT (" + reason + "): " + seen.size() + " thẻ, " + reads + " lượt đọc");
        publishStatus();
    }

    /**
     * Nút cò (phím cứng hoặc nút trên màn hình).
     * Immediate: mỗi lần bấm đổi bật/tắt. Hold: giữ để quét, thả ra là dừng.
     */
    public void onTrigger(boolean pressed) {
        Config c = cfg;
        if (c.trigger == Config.TRIGGER_HOLD) {
            if (pressed) startScan();
            else stopScan("thả cò");
            return;
        }
        if (pressed) {
            if (triggerDown) return; // phím đang giữ lặp lại ACTION_DOWN
            triggerDown = true;
            toggleScan();
        } else {
            triggerDown = false;
        }
    }

    // ---------------- Nhận thẻ từ SDK (luồng của SDK) ----------------

    @Override
    public void onTag(String raw, int rssi) {
        final int sid = sessionId;
        if (!scanning) return;
        String code = normalize(raw);
        if (code == null || !isValid(code)) return;

        reads++;
        long now = SystemClock.elapsedRealtime();
        boolean first = seen.add(code);
        TagStat st = stats.get(code);
        if (st == null) {
            st = new TagStat(code, rssi, now);
            stats.put(code, st);
        }
        st.count++;
        st.rssi = rssi;

        Config c = cfg;
        if (first || !c.dedup) TagBus.publish(code, rssi, first);
        // Kêu ở mọi lần đọc (kể cả thẻ đã thấy), như máy quét cầm tay: còn nghe bíp là còn đang đọc được.
        if (c.sound) beep(now);
        if (first && c.scanMode == Config.SCAN_SINGLE) {
            main.post(() -> {
                if (sid == sessionId) stopScan("quét 1 thẻ xong");
            });
        }
    }

    @Override
    public void onInventoryFinished() {
        Log.d(TAG, "SDK đã thoát vòng quét");
        sdkRunning = false;
        // Đo ngay sau khi quét: đây là lúc module nóng nhất.
        if (io != null) io.post(this::measureModuleTemp);
    }

    // ---------------- Nhiệt độ module (luồng io) ----------------

    private final Runnable tempTicker = new Runnable() {
        @Override
        public void run() {
            measureModuleTemp();
            io.postDelayed(this, TEMP_PERIOD_MS);
        }
    };

    private void measureModuleTemp() {
        // Đang quét thì cổng serial thuộc về luồng quét của SDK; giữ số đo cũ.
        if (scanning || sdkRunning || !reader.isConnected()) return;
        Integer t = reader.measureTemperature();
        if (t == null) return;
        boolean afterScan = moduleTempAt < startedAt;
        moduleTemp = t;
        moduleTempAt = SystemClock.elapsedRealtime();
        if (afterScan && startedAt != 0) FileLog.write(this, "Nhiệt độ module sau lượt quét: " + t + " °C");
        publishStatus();
    }

    private void beep(long now) {
        if (now - lastBeepAt < BEEP_GAP_MS || soundPool == null || beepId == 0) return;
        lastBeepAt = now;
        soundPool.play(beepId, 1f, 1f, 1, 0, 1f);
    }

    private String normalize(String raw) {
        String s = raw.trim().toUpperCase();
        if (s.isEmpty()) return null;
        boolean hex = true, digitsOnly = true;
        for (int i = 0; i < s.length(); i++) {
            char ch = s.charAt(i);
            boolean d = ch >= '0' && ch <= '9';
            if (!d) digitsOnly = false;
            if (!d && !(ch >= 'A' && ch <= 'F')) hex = false;
        }
        if (hex && !digitsOnly) return s;
        if (digitsOnly) {
            // Một số bản SDK trả EPC ở dạng số thập phân; đổi về hex 24 ký tự như app cũ.
            try {
                String h = new BigInteger(s, 10).toString(16).toUpperCase();
                return h.length() >= 24 ? h : String.format("%24s", h).replace(' ', '0');
            } catch (Exception e) {
                return null;
            }
        }
        return null;
    }

    private boolean isValid(String code) {
        Config c = cfg;
        // Chế độ TID: bỏ các lần đọc thiếu dữ liệu (độ dài khác số word đã đặt).
        if (reader.isTidMode() && code.length() != c.tidLen * 4) return false;
        return c.passesPrefilter(code);
    }

    // ---------------- Trạng thái ----------------

    public Status status() {
        return new Status(reader.isConnected(), scanning, seen.size(), reads, startedAt, message,
                moduleTemp, moduleTempAt);
    }

    public Map<String, TagStat> stats() {
        return stats;
    }

    private void publishStatus() {
        TagBus.publishStatus(status());
        main.post(this::updateNotification);
    }

    private final BroadcastReceiver hwTrigger = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            onTrigger(intent.getBooleanExtra("pressed", false));
        }
    };

    // ---------------- Thông báo ----------------

    private Notification buildNotification() {
        NotificationManager nm = getSystemService(NotificationManager.class);
        if (nm.getNotificationChannel(CHANNEL) == null) {
            nm.createNotificationChannel(new NotificationChannel(CHANNEL, "Dịch vụ RFID", NotificationManager.IMPORTANCE_LOW));
        }
        int flags = PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE;
        PendingIntent settings = PendingIntent.getActivity(this, 0,
                new Intent(this, SettingsActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK), flags);
        PendingIntent test = PendingIntent.getActivity(this, 1,
                new Intent(this, TestScanActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK), flags);

        String text;
        if (instance == null || !reader.isConnected()) text = message;
        else if (scanning) text = "Đang quét: " + seen.size() + " thẻ";
        else text = "Đầu đọc sẵn sàng".equals(message) ? "Sẵn sàng" : "Sẵn sàng • " + message;

        // Dòng nhiệt độ: hiện ở cả dạng thu gọn (nối sau trạng thái) và dạng mở rộng (từng dòng).
        String moduleT = moduleTemp != null ? moduleTemp + " °C" : "–";
        Float bat = Thermal.batteryTemp(this);
        Float cpu = Thermal.cpuTemp();
        String sys = Thermal.status(this);
        StringBuilder shortT = new StringBuilder("UHF ").append(moduleT);
        if (cpu != null) shortT.append(" • CPU ").append(Math.round(cpu)).append(" °C");
        if (bat != null) shortT.append(" • Pin ").append(Math.round(bat)).append(" °C");
        StringBuilder longT = new StringBuilder(text)
                .append("\nNhiệt độ module UHF: ").append(moduleT);
        if (moduleTemp != null && scanning) longT.append(" (đo trước khi quét)");
        if (cpu != null) longT.append("\nCPU: ").append(String.format(java.util.Locale.US, "%.1f °C", cpu));
        if (bat != null) longT.append("\nPin: ").append(String.format(java.util.Locale.US, "%.1f °C", bat));
        if (sys != null) longT.append("\nMức nhiệt hệ thống: ").append(sys);
        // Nhiệt độ đặt ở tiêu đề để luôn nhìn thấy, kể cả khi thông báo đang thu gọn.
        String title = "RFID • " + shortT;

        return new Notification.Builder(this, CHANNEL)
                .setSmallIcon(R.drawable.ic_stat_rfid)
                .setContentTitle(title)
                .setContentText(text)
                .setStyle(new Notification.BigTextStyle().bigText(longT))
                .setOngoing(true)
                .setOnlyAlertOnce(true)
                .setContentIntent(settings)
                .addAction(new Notification.Action.Builder(null, "Cài đặt", settings).build())
                .addAction(new Notification.Action.Builder(null, "Kiểm tra quét", test).build())
                .build();
    }

    private void updateNotification() {
        if (instance == null) return;
        getSystemService(NotificationManager.class).notify(NOTIFICATION_ID, buildNotification());
    }

    /** Nhiệt độ pin và số thẻ đang quét thay đổi liên tục: làm mới thông báo theo chu kỳ. */
    private final Runnable notificationTicker = new Runnable() {
        @Override
        public void run() {
            updateNotification();
            main.postDelayed(this, NOTIFICATION_PERIOD_MS);
        }
    };
}
