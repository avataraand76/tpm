package com.tina.rfidadapterapp;

import android.accessibilityservice.AccessibilityService;
import android.accessibilityservice.AccessibilityServiceInfo;
import android.content.ClipData;
import android.content.ClipDescription;
import android.content.ClipboardManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.PersistableBundle;
import android.util.Log;
import android.view.KeyEvent;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;

import java.util.List;

/**
 * Dịch vụ Trợ năng, làm hai việc:
 *  1. Bắt phím cò của máy PDA ở mọi màn hình (kể cả khi đang mở TPM) để bật/tắt quét.
 *  2. Đường dự phòng đưa mã vào ô nhập đang focus khi TPM không mở qua TWA.
 */
public class KeyService extends AccessibilityService {

    private static final String TAG = "KeyService";
    /** Mã phím cò trên các dòng máy PDA đang dùng (lấy từ app cũ). */
    private static final int[] TRIGGER_KEYS = {619, 305, 621, 622, 623};
    private static final int MAX_FIELD_CHARS = 20000;
    private static final long RETRY_MS = 80;
    private static final int MAX_RETRY = 8;

    private static volatile KeyService instance;

    private final Handler main = new Handler(Looper.getMainLooper());
    private final StringBuilder queue = new StringBuilder();
    private boolean flushPosted;
    private int retries;

    public static KeyService get() {
        return instance;
    }

    @Override
    protected void onServiceConnected() {
        super.onServiceConnected();
        instance = this;
        AccessibilityServiceInfo info = getServiceInfo();
        if (info != null) {
            info.flags |= AccessibilityServiceInfo.FLAG_REQUEST_FILTER_KEY_EVENTS;
            setServiceInfo(info);
        }
        ScanService.start(this);
    }

    @Override
    public boolean onUnbind(android.content.Intent intent) {
        instance = null;
        return super.onUnbind(intent);
    }

    @Override
    public void onDestroy() {
        instance = null;
        super.onDestroy();
    }

    // ---------------- Phím cò ----------------

    @Override
    protected boolean onKeyEvent(KeyEvent event) {
        if (!isTriggerKey(event.getKeyCode())) return false;
        int action = event.getAction();
        if (action != KeyEvent.ACTION_DOWN && action != KeyEvent.ACTION_UP) return true;
        ScanService s = ScanService.get();
        if (s == null) {
            ScanService.start(this);
            return true;
        }
        s.onTrigger(action == KeyEvent.ACTION_DOWN);
        return true;
    }

    private static boolean isTriggerKey(int code) {
        for (int k : TRIGGER_KEYS) if (k == code) return true;
        return false;
    }

    // ---------------- Ghi mã vào ô nhập (dự phòng) ----------------

    /** Gọi trên luồng chính. */
    void inject(List<String> codes) {
        for (String c : codes) queue.append(c).append('\n');
        if (!flushPosted) {
            flushPosted = true;
            main.post(this::flush);
        }
    }

    private void flush() {
        flushPosted = false;
        if (queue.length() == 0) return;
        int r = write(queue.toString());
        if (r == WRITE_RETRY && retries < MAX_RETRY) {
            retries++;
            flushPosted = true;
            main.postDelayed(this::flush, RETRY_MS);
            return;
        }
        if (r == WRITE_RETRY) Log.w(TAG, "Không thấy ô nhập nào đang focus, bỏ " + queue.length() + " ký tự");
        retries = 0;
        queue.setLength(0);
    }

    private static final int WRITE_OK = 0, WRITE_RETRY = 1, WRITE_SKIP = 2;

    private int write(String payload) {
        AccessibilityNodeInfo root = null, node = null;
        try {
            root = getRootInActiveWindow();
            if (root == null) return WRITE_RETRY;
            // Màn hình của chính app (kiểm tra quét, cài đặt) tự hiển thị mã, không ghi thêm.
            CharSequence pkg = root.getPackageName();
            if (pkg != null && getPackageName().contentEquals(pkg)) return WRITE_SKIP;

            node = root.findFocus(AccessibilityNodeInfo.FOCUS_INPUT);
            if (node == null || !node.isEditable()) return WRITE_RETRY;

            String existing = "";
            boolean hint = Build.VERSION.SDK_INT >= 26 && node.isShowingHintText();
            if (!hint && node.getText() != null) existing = node.getText().toString();
            String next = existing + payload;
            if (next.length() > MAX_FIELD_CHARS) {
                int cut = next.indexOf('\n', next.length() - MAX_FIELD_CHARS);
                next = next.substring(cut < 0 ? next.length() - MAX_FIELD_CHARS : cut + 1);
            }
            Bundle args = new Bundle();
            args.putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, next);
            if (!node.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, args)) {
                pasteViaClipboard(payload);
            }
            return WRITE_OK;
        } catch (Exception e) {
            Log.w(TAG, "Ghi mã lỗi: " + e);
            return WRITE_RETRY;
        } finally {
            if (node != null) node.recycle();
            if (root != null) root.recycle();
        }
    }

    /** Một số ô nhập trong WebView không nhận ACTION_SET_TEXT: dán qua clipboard. */
    private void pasteViaClipboard(String text) {
        ClipboardManager cm = getSystemService(ClipboardManager.class);
        if (cm == null) return;
        ClipData clip = ClipData.newPlainText("EPC", text);
        if (Build.VERSION.SDK_INT >= 33) {
            PersistableBundle extras = new PersistableBundle();
            extras.putBoolean(ClipDescription.EXTRA_IS_SENSITIVE, true);
            clip.getDescription().setExtras(extras);
        }
        cm.setPrimaryClip(clip);
        main.postDelayed(() -> {
            AccessibilityNodeInfo root = getRootInActiveWindow();
            if (root == null) return;
            AccessibilityNodeInfo node = root.findFocus(AccessibilityNodeInfo.FOCUS_INPUT);
            if (node != null) {
                node.performAction(AccessibilityNodeInfo.ACTION_PASTE);
                node.recycle();
            }
            root.recycle();
        }, 40);
    }

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
    }

    @Override
    public void onInterrupt() {
    }
}
