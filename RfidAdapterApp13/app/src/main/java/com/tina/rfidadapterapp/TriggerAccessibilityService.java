package com.tina.rfidadapterapp;

import android.accessibilityservice.AccessibilityService;
import android.accessibilityservice.AccessibilityServiceInfo;
import android.content.BroadcastReceiver;
import android.content.ClipData;
import android.content.ClipDescription;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Build;
import android.os.Bundle;
import android.os.PersistableBundle;
import android.os.SystemClock;
import android.util.Log;
import android.view.KeyEvent;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;
import java.util.ArrayDeque;
import java.util.Deque;
import android.os.Handler;
import android.os.Looper;

public class TriggerAccessibilityService extends AccessibilityService {

    /** Gom EPC nhận được trong khoảng này rồi ghi 1 lần, thay vì nhả từng thẻ một. */
    private static final long FLUSH_DELAY_MS = 60;
    /** Trần độ dài chuỗi ghi vào ô nhập, tránh chuỗi phình vô hạn làm chậm dần. */
    private static final int MAX_BUFFER_CHARS = 20000;
    /** Số EPC tối đa giữ trong hàng đợi; quá thì bỏ thẻ cũ nhất (ưu tiên thẻ vừa quét). */
    private static final int MAX_QUEUE_SIZE = 500;
    /** Chờ chút trước khi ACTION_PASTE để clipboard kịp commit, tránh dán nội dung cũ. */
    private static final long CLIPBOARD_SETTLE_MS = 40;
    private static final String PERF_TAG = "RFID_PERF";
    /** Không tìm thấy ô nhập thì chờ ngần này rồi thử lại, thay vì vứt mã đi. */
    private static final long RETRY_DELAY_MS = 120;
    /** Tối đa chừng này lần thử lại (~2,4 giây) rồi mới chịu bỏ. */
    private static final int MAX_RETRY = 20;

    private final Deque<String> epcQueue = new ArrayDeque<>();
    private boolean flushScheduled = false;
    private int retryCount = 0;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private boolean isKeyPressed = false;

    @Override
    protected void onServiceConnected() {
        super.onServiceConnected();

        IntentFilter filter = new IntentFilter();
        filter.addAction("RFID_UI_UPDATE");
        filter.addAction("RFID_CLEAR_UI");
        filter.addAction(RFIDForegroundService.ACTION_TRIGGER_PHYSICAL);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(rfidDataReceiver, filter, Context.RECEIVER_EXPORTED);
        } else {
            registerReceiver(rfidDataReceiver, filter);
        }

        AccessibilityServiceInfo info = getServiceInfo();
        if (info == null) return;
        info.flags |= AccessibilityServiceInfo.FLAG_REQUEST_FILTER_KEY_EVENTS;
        setServiceInfo(info);
    }
    @Override
    public boolean onKeyEvent(KeyEvent event) {
        if (event.getKeyCode() == 619 || event.getKeyCode() == 305 || event.getKeyCode() == 621 || event.getKeyCode() == 622 || event.getKeyCode() == 623) {
            if (event.getAction() == KeyEvent.ACTION_DOWN) {
                if (!isKeyPressed) {
                    isKeyPressed = true;
                    Intent i = new Intent(RFIDForegroundService.ACTION_TRIGGER_PHYSICAL);
                    i.setPackage(getPackageName());
                    i.putExtra("pressed", true);
                    sendBroadcast(i);
                }
            } else if (event.getAction() == KeyEvent.ACTION_UP) {
                isKeyPressed = false;
                Intent i = new Intent(RFIDForegroundService.ACTION_TRIGGER_PHYSICAL);
                i.setPackage(getPackageName());
                i.putExtra("pressed", false);
                sendBroadcast(i);
            }
            return true;
        }
        return false;
    }
    private final BroadcastReceiver rfidDataReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            String action = intent.getAction();
            if (action == null) return;

            if ("RFID_UI_UPDATE".equals(action)) {
                String epc = intent.getStringExtra("epc");
                if (epc != null) enqueue(epc);
            } else if ("RFID_CLEAR_UI".equals(action)) {
                // Bấm Clear thì bỏ luôn các thẻ còn chờ ghi.
                clearQueue();
            }
        }
    };

    private void enqueue(String epc) {
        synchronized (epcQueue) {
            while (epcQueue.size() >= MAX_QUEUE_SIZE) epcQueue.pollFirst();
            epcQueue.addLast(epc);
        }
        scheduleFlush();
    }

    private void clearQueue() {
        synchronized (epcQueue) {
            epcQueue.clear();
        }
    }

    private void scheduleFlush() {
        if (flushScheduled) return;
        flushScheduled = true;
        mainHandler.postDelayed(this::flushQueue, FLUSH_DELAY_MS);
    }

    /**
     * Ghi TOÀN BỘ hàng đợi trong một lần inject.
     * Trước đây mỗi thẻ ghi riêng và chờ 200ms -> một lần bóp cò đọc được N thẻ
     * là phải mất N*200ms mới ghi xong, thẻ cần tìm nằm cuối hàng thì trễ rất lâu.
     */
    private void flushQueue() {
        flushScheduled = false;

        StringBuilder batch = new StringBuilder();
        synchronized (epcQueue) {
            String epc;
            while ((epc = epcQueue.pollFirst()) != null) {
                batch.append(epc).append("\n");
            }
        }
        if (batch.length() == 0) return;

        String payload = batch.toString();
        Log.d(PERF_TAG, "flush start, batch chars=" + payload.length()
                + (retryCount > 0 ? " (retry " + retryCount + ")" : ""));

        if (pasteEpcToFocusNode(payload)) {
            retryCount = 0;
            return;
        }

        // Chưa có ô nhập nào nhận được (trang web vừa mất focus chẳng hạn).
        // Trả mã về đầu hàng đợi và thử lại, nếu bỏ đi thì mã này chỉ xuất hiện
        // lại ở lần bóp cò sau - đúng kiểu trễ vài giây mà người dùng thấy.
        if (retryCount >= MAX_RETRY) {
            Log.d(PERF_TAG, "bo qua batch sau " + retryCount + " lan thu lai");
            retryCount = 0;
            return;
        }
        retryCount++;
        String[] pending = payload.split("\n");
        synchronized (epcQueue) {
            // Duyệt ngược vì addFirst, để hàng đợi giữ đúng thứ tự quét ban đầu.
            for (int i = pending.length - 1; i >= 0; i--) {
                if (!pending[i].isEmpty()) epcQueue.addFirst(pending[i]);
            }
        }
        flushScheduled = true;
        mainHandler.postDelayed(this::flushQueue, RETRY_DELAY_MS);
    }

    /** @return true nếu đã ghi được (hoặc không cần ghi), false nếu nên thử lại. */
    private boolean pasteEpcToFocusNode(String text) {
        long tStart = SystemClock.uptimeMillis();
        try {
            AccessibilityNodeInfo rootNode = getRootInActiveWindow();
            long tRoot = SystemClock.uptimeMillis();
            if (rootNode == null) return false;

            // App của mình đang ở foreground: MainActivity đã tự hiện mã qua broadcast,
            // ô kết quả giờ nhận được focus (để bôi đen copy) nên nếu ghi thêm vào đó
            // thì mỗi mã sẽ bị hiện hai lần.
            CharSequence activePkg = rootNode.getPackageName();
            if (activePkg != null && getPackageName().contentEquals(activePkg)) {
                rootNode.recycle();
                return true;
            }

            AccessibilityNodeInfo focusNode = findActualFocus(rootNode);
            long tFocus = SystemClock.uptimeMillis();

            if (focusNode != null) {
                CharSequence currentText = focusNode.getText();
                String existingText = (currentText == null) ? "" : currentText.toString();

                String newText = existingText + text;
                if (newText.length() > MAX_BUFFER_CHARS) {
                    newText = newText.substring(newText.length() - MAX_BUFFER_CHARS);
                }

                Bundle arguments = new Bundle();
                arguments.putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, newText);

                boolean success = focusNode.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, arguments);
                long tSet = SystemClock.uptimeMillis();

                Log.d(PERF_TAG, "inject len=" + newText.length()
                        + " root=" + (tRoot - tStart) + "ms"
                        + " focus=" + (tFocus - tRoot) + "ms"
                        + " setText=" + (tSet - tFocus) + "ms"
                        + " ok=" + success);

                if (!success) {
                    pasteViaClipboard(text);
                }
                focusNode.recycle();
                rootNode.recycle();
                return true;
            }

            Log.d(PERF_TAG, "chua co o nhap nao dang focus"
                    + " root=" + (tRoot - tStart) + "ms"
                    + " focus=" + (tFocus - tRoot) + "ms");
            rootNode.recycle();
            return false;
        } catch (Exception e) {
            Log.e("ACC", "Inject text error: " + e.getMessage());
            return false;
        }
    }

    /** Dự phòng khi ACTION_SET_TEXT thất bại (ô nhập trong WebView/trình duyệt). */
    private void pasteViaClipboard(final String text) {
        ClipboardManager clipboard = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
        if (clipboard == null) return;

        ClipData clip = ClipData.newPlainText("EPC", text);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            // Ẩn overlay "Đã sao chép" của SystemUI theo đúng API, không cần appops.
            PersistableBundle extras = new PersistableBundle();
            extras.putBoolean(ClipDescription.EXTRA_IS_SENSITIVE, true);
            clip.getDescription().setExtras(extras);
        }
        clipboard.setPrimaryClip(clip);

        // Paste ở nhịp sau để clipboard kịp commit, nếu không dễ dán nhầm nội dung cũ.
        final long tPasteStart = SystemClock.uptimeMillis();
        mainHandler.postDelayed(() -> {
            try {
                AccessibilityNodeInfo root = getRootInActiveWindow();
                if (root == null) return;
                AccessibilityNodeInfo node = findActualFocus(root);
                if (node != null) {
                    node.performAction(AccessibilityNodeInfo.ACTION_PASTE);
                    Log.d(PERF_TAG, "clipboard paste focus+paste="
                            + (SystemClock.uptimeMillis() - tPasteStart) + "ms");
                    node.recycle();
                }
                root.recycle();
            } catch (Exception e) {
                Log.e("ACC", "Clipboard paste error: " + e.getMessage());
            }
        }, CLIPBOARD_SETTLE_MS);
    }

    /**
     * Lấy ô đang nhập liệu.
     *
     * findFocus() hỏi thẳng hệ thống, tốn đúng một lệnh. Cách cũ là tự đệ quy khắp cây
     * node: mỗi getChild() là một lần gọi liên tiến trình sang trình duyệt, một trang web
     * vài trăm node là mất hàng trăm ms tới vài giây, mà hàm này chạy lại sau mỗi lần ghi.
     * Chỉ đệ quy khi findFocus() không trả về gì.
     */
    private AccessibilityNodeInfo findActualFocus(AccessibilityNodeInfo node) {
        if (node == null) return null;

        AccessibilityNodeInfo focused = node.findFocus(AccessibilityNodeInfo.FOCUS_INPUT);
        if (focused != null) return focused;

        return findFocusByWalking(node);
    }

    private AccessibilityNodeInfo findFocusByWalking(AccessibilityNodeInfo node) {
        if (node == null) return null;
        if (node.isFocused()) return node;

        for (int i = 0; i < node.getChildCount(); i++) {
            AccessibilityNodeInfo child = node.getChild(i);
            AccessibilityNodeInfo result = findFocusByWalking(child);
            if (result != null) return result;
        }
        return null;
    }

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {}

    @Override
    public void onInterrupt() {}
}
