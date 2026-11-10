package com.tina.rfidadapterapp;

import android.os.Handler;
import android.os.Looper;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Kênh chuyển mã thẻ trong nội bộ app (không đi qua broadcast hệ thống).
 *
 * Luồng SDK gọi {@link #publish} cho từng lần đọc; các lần đọc được gom lại và giao
 * một lô trên luồng chính sau tối đa {@link #BATCH_MS} ms. Gom lô là để mỗi lần ghi
 * sang trang web chứa nhiều mã, không phải ghi từng mã một.
 */
public final class TagBus {

    public static final class Read {
        public final String code;
        public final int rssi;
        /** Lần đầu thấy mã này trong phiên quét hiện tại. */
        public final boolean first;

        Read(String code, int rssi, boolean first) {
            this.code = code;
            this.rssi = rssi;
            this.first = first;
        }
    }

    public interface Listener {
        void onReads(List<Read> batch);

        default void onSessionCleared() {}

        default void onStatus(ScanService.Status status) {}
    }

    private static final long BATCH_MS = 50;
    private static final CopyOnWriteArrayList<Listener> LISTENERS = new CopyOnWriteArrayList<>();
    private static final Handler MAIN = new Handler(Looper.getMainLooper());
    private static final Object LOCK = new Object();
    private static ArrayList<Read> pending = new ArrayList<>();
    private static boolean posted;

    private TagBus() {}

    public static void register(Listener l) {
        LISTENERS.addIfAbsent(l);
    }

    public static void unregister(Listener l) {
        LISTENERS.remove(l);
    }

    static void publish(String code, int rssi, boolean first) {
        synchronized (LOCK) {
            pending.add(new Read(code, rssi, first));
            if (posted) return;
            posted = true;
        }
        MAIN.postDelayed(TagBus::flush, BATCH_MS);
    }

    static void clearSession() {
        synchronized (LOCK) {
            pending = new ArrayList<>();
        }
        MAIN.post(() -> {
            for (Listener l : LISTENERS) l.onSessionCleared();
        });
    }

    static void publishStatus(ScanService.Status s) {
        MAIN.post(() -> {
            for (Listener l : LISTENERS) l.onStatus(s);
        });
    }

    private static void flush() {
        ArrayList<Read> batch;
        synchronized (LOCK) {
            posted = false;
            if (pending.isEmpty()) return;
            batch = pending;
            pending = new ArrayList<>();
        }
        List<Read> view = java.util.Collections.unmodifiableList(batch);
        for (Listener l : LISTENERS) l.onReads(view);
    }
}
