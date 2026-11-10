package com.tina.rfidadapterapp;

import android.content.Context;
import android.content.SharedPreferences;

/**
 * Toàn bộ cấu hình đọc thẻ.
 *
 * Tên file SharedPreferences và tên từng khoá giữ y như app cũ (RFID_CONFIG, POWER, SESSION...),
 * nên cài app mới đè lên app cũ thì máy PDA giữ nguyên cấu hình đã chỉnh.
 */
public final class Config {

    public static final String PREFS = "RFID_CONFIG";

    public static final String SERVICE_ENABLED = "SERVICE_ENABLED";
    public static final String SOUND_ENABLED = "SOUND_ENABLED";
    public static final String DEDUP = "DEDUP";
    public static final String POWER = "POWER";
    public static final String REGION = "REGION";
    public static final String TRIGGER = "TRIGGER";
    public static final String SCANMODE = "SCANMODE";
    public static final String Q_VALUE = "Q_VALUE";
    public static final String SESSION = "SESSION";
    public static final String TID_PTR = "TID_PTR";
    public static final String TID_LEN = "TID_LEN";
    public static final String MAX_SCAN_TIME = "MAX_SCAN_TIME";
    public static final String INTERVAL = "INTERVAL";
    public static final String PREFILTER_ENABLED = "PREFILTER_ENABLED";
    /** Kiểu String (các khoá khác đều là int). */
    public static final String PREFILTER_PREFIX = "PREFILTER_PREFIX";

    public static final int TRIGGER_IMMEDIATE = 0;
    public static final int TRIGGER_HOLD = 1;
    public static final int SCAN_SINGLE = 0;
    public static final int SCAN_MULTI = 1;
    /** Giá trị lưu trong prefs cho Session Auto. Xuống module phải gửi 255, xem {@link #sdkSession()}. */
    public static final int SESSION_AUTO = 4;

    // Giá trị mặc định, cũng là bộ giá trị của nút "Khôi phục mặc định".
    public static final int DEF_SERVICE_ENABLED = 1;
    public static final int DEF_SOUND_ENABLED = 1;
    public static final int DEF_DEDUP = 1;
    public static final int DEF_POWER = 33;
    public static final int DEF_REGION = 0;
    public static final int DEF_TRIGGER = TRIGGER_IMMEDIATE;
    public static final int DEF_SCANMODE = SCAN_MULTI;
    public static final int DEF_Q_VALUE = 7;
    public static final int DEF_SESSION = SESSION_AUTO;
    public static final int DEF_TID_PTR = 0;
    public static final int DEF_TID_LEN = 0;
    /** Đơn vị 100ms (đúng đơn vị của byte ScanTime trong lệnh inventory). 5 = 500ms. */
    public static final int DEF_MAX_SCAN_TIME = 5;
    /** Đơn vị ms. */
    public static final int DEF_INTERVAL = 0;
    /** Bật sẵn với "E2": giữ đúng hành vi app cũ (chỉ nhận thẻ máy của công ty, bắt đầu bằng E2). */
    public static final int DEF_PREFILTER_ENABLED = 1;
    public static final String DEF_PREFILTER_PREFIX = "E2";

    public boolean serviceEnabled;
    public boolean prefilter;
    /** Đã chuẩn hoá: chữ hoa, chỉ ký tự hex. Rỗng = không lọc. */
    public String prefilterPrefix;
    public boolean sound;
    public boolean dedup;
    public int power;
    public int region;
    public int trigger;
    public int scanMode;
    public int q;
    public int session;
    public int tidPtr;
    public int tidLen;
    public int scanTime;
    public int interval;

    public static Config load(Context ctx) {
        SharedPreferences p = prefs(ctx);
        Config c = new Config();
        c.serviceEnabled = p.getInt(SERVICE_ENABLED, DEF_SERVICE_ENABLED) == 1;
        c.sound = p.getInt(SOUND_ENABLED, DEF_SOUND_ENABLED) == 1;
        c.dedup = p.getInt(DEDUP, DEF_DEDUP) == 1;
        c.power = clamp(p.getInt(POWER, DEF_POWER), 0, 33);
        c.region = clamp(p.getInt(REGION, DEF_REGION), 0, REGION_NAMES.length - 1);
        c.trigger = clamp(p.getInt(TRIGGER, DEF_TRIGGER), 0, 1);
        c.scanMode = clamp(p.getInt(SCANMODE, DEF_SCANMODE), 0, 1);
        c.q = clamp(p.getInt(Q_VALUE, DEF_Q_VALUE), 0, 15);
        c.session = clamp(p.getInt(SESSION, DEF_SESSION), 0, SESSION_AUTO);
        c.tidPtr = clamp(p.getInt(TID_PTR, DEF_TID_PTR), 0, 32);
        c.tidLen = clamp(p.getInt(TID_LEN, DEF_TID_LEN), 0, 32);
        c.scanTime = clamp(p.getInt(MAX_SCAN_TIME, DEF_MAX_SCAN_TIME), 1, 255);
        c.interval = clamp(p.getInt(INTERVAL, DEF_INTERVAL), 0, 2000);
        c.prefilter = p.getInt(PREFILTER_ENABLED, DEF_PREFILTER_ENABLED) == 1;
        c.prefilterPrefix = cleanHex(p.getString(PREFILTER_PREFIX, DEF_PREFILTER_PREFIX));
        return c;
    }

    /** Mã thẻ có qua được pre-filter không. Tắt pre-filter hoặc để trống tiền tố thì nhận mọi mã. */
    public boolean passesPrefilter(String code) {
        return !prefilter || prefilterPrefix.isEmpty() || code.startsWith(prefilterPrefix);
    }

    /** Giữ lại các ký tự hex, đổi sang chữ hoa (mã thẻ luôn ở dạng hex chữ hoa). */
    public static String cleanHex(String s) {
        if (s == null) return "";
        StringBuilder sb = new StringBuilder(s.length());
        for (int i = 0; i < s.length(); i++) {
            char ch = Character.toUpperCase(s.charAt(i));
            if ((ch >= '0' && ch <= '9') || (ch >= 'A' && ch <= 'F')) sb.append(ch);
        }
        return sb.toString();
    }

    public static void putString(Context ctx, String key, String value) {
        prefs(ctx).edit().putString(key, value).apply();
    }

    public static SharedPreferences prefs(Context ctx) {
        return ctx.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    public static void put(Context ctx, String key, int value) {
        prefs(ctx).edit().putInt(key, value).apply();
    }

    public static void resetDefaults(Context ctx) {
        prefs(ctx).edit()
                .putInt(SOUND_ENABLED, DEF_SOUND_ENABLED)
                .putInt(DEDUP, DEF_DEDUP)
                .putInt(POWER, DEF_POWER)
                .putInt(REGION, DEF_REGION)
                .putInt(TRIGGER, DEF_TRIGGER)
                .putInt(SCANMODE, DEF_SCANMODE)
                .putInt(Q_VALUE, DEF_Q_VALUE)
                .putInt(SESSION, DEF_SESSION)
                .putInt(TID_PTR, DEF_TID_PTR)
                .putInt(TID_LEN, DEF_TID_LEN)
                .putInt(MAX_SCAN_TIME, DEF_MAX_SCAN_TIME)
                .putInt(INTERVAL, DEF_INTERVAL)
                .putInt(PREFILTER_ENABLED, DEF_PREFILTER_ENABLED)
                .putString(PREFILTER_PREFIX, DEF_PREFILTER_PREFIX)
                .apply();
    }

    /**
     * Session gửi xuống module. Demo của hãng đổi lựa chọn "Auto" thành 255 (module tự
     * luân phiên S2/S3); gửi thẳng số 4 thì module không trả về thẻ nào.
     */
    public int sdkSession() {
        return session >= SESSION_AUTO ? 255 : session;
    }

    public boolean readsTid() {
        return tidLen > 0;
    }

    // ---- Vùng tần số ----

    public static final String[] REGION_NAMES = {
            "Việt Nam (920–923 MHz)", "Mỹ / FCC (902–928 MHz)", "Châu Âu / ETSI (865–868 MHz)", "Trung Quốc (920–925 MHz)"
    };

    /** {band, maxFre, minFre} theo bảng công thức tần số trong tài liệu SDK. */
    public int[] regionParams() {
        switch (region) {
            case 1: return new int[]{2, 49, 0};   // US band: 902.75 + 0.5N, N 0..49
            case 2: return new int[]{4, 14, 0};   // EU band: 865.1 + 0.2N, N 0..14
            case 3: return new int[]{1, 19, 0};   // Chinese band2: 920.125 + 0.25N, N 0..19
            default: return new int[]{1, 11, 0};  // Chinese band2 rút gọn N 0..11 = 920.125–922.875 MHz
        }
    }

    public static int clamp(int v, int lo, int hi) {
        return Math.max(lo, Math.min(hi, v));
    }
}
