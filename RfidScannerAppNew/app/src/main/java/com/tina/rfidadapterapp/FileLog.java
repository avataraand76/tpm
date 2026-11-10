package com.tina.rfidadapterapp;

import android.content.Context;

import java.io.File;
import java.io.FileWriter;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/** Nhật ký ngắn trong bộ nhớ riêng của app, xem bằng: adb shell run-as com.tina.rfidadapterapp cat files/rfid_log.txt */
public final class FileLog {
    private static final long MAX_BYTES = 512 * 1024;
    private static final SimpleDateFormat FMT = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.US);

    private FileLog() {}

    public static synchronized void write(Context ctx, String line) {
        try {
            File f = new File(ctx.getFilesDir(), "rfid_log.txt");
            if (f.length() > MAX_BYTES) {
                File old = new File(ctx.getFilesDir(), "rfid_log.old.txt");
                old.delete();
                f.renameTo(old);
            }
            try (FileWriter w = new FileWriter(f, true)) {
                w.append(FMT.format(new Date())).append("  ").append(line).append('\n');
            }
        } catch (Exception ignored) {
        }
    }
}
