package com.tina.rfidadapterapp;

import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.BatteryManager;
import android.os.Build;
import android.os.PowerManager;

import java.io.BufferedReader;
import java.io.FileReader;

/**
 * Đọc nhiệt độ của máy PDA.
 *
 * Nhiệt độ CPU nằm trong /sys/class/thermal, nhưng trên máy N60 (Android 13, MT6765) SELinux
 * chặn app thường đọc thư mục này; API của Android cho đọc nhiệt độ CPU (getCurrentTemperatures)
 * cũng chỉ mở cho app hệ thống. Vì vậy app vẫn thử đọc CPU (máy khác có thể cho phép),
 * và luôn có thêm hai số đọc được: nhiệt độ pin, và mức nhiệt / khoảng cách tới ngưỡng hạ xung.
 */
public final class Thermal {

    private Thermal() {}

    private static volatile boolean cpuBlocked;

    /** °C, hoặc null nếu máy không cho đọc. */
    public static Float cpuTemp() {
        if (cpuBlocked) return null;
        float best = Float.NaN;
        boolean anyReadable = false;
        for (int i = 0; i < 40; i++) {
            String base = "/sys/class/thermal/thermal_zone" + i + "/";
            String type = readLine(base + "type");
            if (type == null) continue;
            anyReadable = true;
            String t = type.toLowerCase();
            if (!(t.contains("cpu") || t.contains("soc") || t.contains("tsens"))) continue;
            String v = readLine(base + "temp");
            if (v == null) continue;
            try {
                float c = Float.parseFloat(v.trim());
                if (c > 1000) c /= 1000f;          // đa số máy ghi theo milli-độ
                if (c > 0 && c < 150 && !(c <= best)) best = c;
            } catch (NumberFormatException ignored) {
            }
        }
        if (!anyReadable) cpuBlocked = true;
        return Float.isNaN(best) ? null : best;
    }

    /** °C nhiệt độ pin (xấp xỉ nhiệt độ thân máy), hoặc null. */
    public static Float batteryTemp(Context ctx) {
        Intent i = ctx.getApplicationContext().registerReceiver(null, new IntentFilter(Intent.ACTION_BATTERY_CHANGED));
        if (i == null) return null;
        int t = i.getIntExtra(BatteryManager.EXTRA_TEMPERATURE, Integer.MIN_VALUE);
        return t == Integer.MIN_VALUE ? null : t / 10f;
    }

    /** Mức nhiệt hệ thống do Android đánh giá (dựa trên cả CPU), dạng chữ. */
    public static String status(Context ctx) {
        if (Build.VERSION.SDK_INT < 29) return null;
        PowerManager pm = ctx.getSystemService(PowerManager.class);
        if (pm == null) return null;
        switch (pm.getCurrentThermalStatus()) {
            case PowerManager.THERMAL_STATUS_NONE: return "bình thường";
            case PowerManager.THERMAL_STATUS_LIGHT: return "hơi nóng";
            case PowerManager.THERMAL_STATUS_MODERATE: return "nóng – bắt đầu hạ xung";
            case PowerManager.THERMAL_STATUS_SEVERE: return "rất nóng – hạ xung mạnh";
            case PowerManager.THERMAL_STATUS_CRITICAL: return "quá nóng";
            case PowerManager.THERMAL_STATUS_EMERGENCY: return "khẩn cấp";
            case PowerManager.THERMAL_STATUS_SHUTDOWN: return "sắp tắt máy vì nóng";
            default: return null;
        }
    }

    /**
     * Phần trăm đã đi tới ngưỡng hạ xung (100% = bắt đầu hạ xung), dự báo trong 10 giây tới.
     * Null nếu máy không hỗ trợ. Không nên gọi dày hơn 1 lần/giây.
     */
    public static Integer headroomPercent(Context ctx) {
        if (Build.VERSION.SDK_INT < 30) return null;
        PowerManager pm = ctx.getSystemService(PowerManager.class);
        if (pm == null) return null;
        float h = pm.getThermalHeadroom(10);
        if (Float.isNaN(h) || h < 0) return null;
        return Math.round(h * 100);
    }

    private static String cachedSummary;
    private static long cachedAt;

    /** Mô tả gọn cho màn hình. Giữ kết quả 2 giây vì getThermalHeadroom không cho gọi dày. */
    public static synchronized String summary(Context ctx) {
        long now = android.os.SystemClock.elapsedRealtime();
        if (cachedSummary != null && now - cachedAt < 2000) return cachedSummary;
        cachedSummary = buildSummary(ctx);
        cachedAt = now;
        return cachedSummary;
    }

    private static String buildSummary(Context ctx) {
        StringBuilder sb = new StringBuilder();
        Float cpu = cpuTemp();
        sb.append("CPU: ").append(cpu != null ? String.format(java.util.Locale.US, "%.1f °C", cpu) : "máy không cho đọc");
        Float bat = batteryTemp(ctx);
        if (bat != null) sb.append(" • Pin: ").append(String.format(java.util.Locale.US, "%.1f °C", bat));
        String st = status(ctx);
        if (st != null) sb.append("\nMức nhiệt hệ thống: ").append(st);
        Integer hr = headroomPercent(ctx);
        if (hr != null) sb.append(" (").append(hr).append("% tới ngưỡng hạ xung)");
        return sb.toString();
    }

    private static String readLine(String path) {
        try (BufferedReader r = new BufferedReader(new FileReader(path))) {
            return r.readLine();
        } catch (Exception e) {
            return null;
        }
    }
}
