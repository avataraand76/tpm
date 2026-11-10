package com.tina.rfidadapterapp.twa;

import android.app.Activity;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.browser.customtabs.CustomTabsCallback;
import androidx.browser.customtabs.CustomTabsClient;
import androidx.browser.customtabs.CustomTabsService;
import androidx.browser.customtabs.CustomTabsServiceConnection;
import androidx.browser.customtabs.CustomTabsSession;
import androidx.browser.trusted.TrustedWebActivityIntentBuilder;

import com.tina.rfidadapterapp.BuildConfig;

import java.util.Collections;
import java.util.List;

/**
 * Mở trang TPM dưới dạng Trusted Web Activity và giữ một kênh postMessage tới trang.
 *
 * Giao thức với web (frontend/src/rfidBridge.js, đã chạy trên server):
 *   - app mở kênh; trang trả lời chuỗi "ready" qua port;
 *   - app gửi các mã nối bằng "\n" (mỗi mã kết thúc bằng "\n"); trang nối vào ô nhập đang focus.
 * Chrome chỉ cho mở kênh khi xác minh được assetlinks.json của tên miền khớp package + chữ ký app.
 */
public final class TwaBridge {

    private static final String TAG = "TwaBridge";
    private static final String CHROME = "com.android.chrome";
    private static final long LAUNCH_TIMEOUT_MS = 3000;
    private static final long READY_TIMEOUT_MS = 2500;
    private static final int MAX_CHANNEL_RETRIES = 3;

    private static TwaBridge instance;

    private final Context app;
    private final Uri url;
    private final Uri origin;
    private final Handler main = new Handler(Looper.getMainLooper());

    private CustomTabsClient client;
    private CustomTabsSession session;
    private boolean binding;
    /** Tăng mỗi khi tạo phiên mới; callback của phiên cũ bị bỏ qua. */
    private int generation;
    private boolean originValidated;
    private boolean channelReady;
    private boolean tabVisible;
    private int channelRetries;
    private Activity pendingLaunch;

    public static synchronized TwaBridge get(Context ctx) {
        if (instance == null) instance = new TwaBridge(ctx.getApplicationContext());
        return instance;
    }

    private TwaBridge(Context app) {
        this.app = app;
        this.url = Uri.parse(BuildConfig.TWA_URL);
        this.origin = Uri.parse(url.getScheme() + "://" + url.getAuthority());
    }

    /** Kênh đang dùng được: trang TPM đang hiện và đã trả lời "ready". */
    public boolean isActive() {
        return session != null && channelReady && tabVisible;
    }

    public String describe() {
        if (session == null) return "chưa mở TPM qua app";
        if (!originValidated) return "Chrome chưa xác minh assetlinks";
        if (!tabVisible) return "TPM đang ẩn";
        if (!channelReady) return "đang chờ trang TPM sẵn sàng";
        return "đã kết nối";
    }

    // ---------------- Mở TPM ----------------

    public void launch(Activity activity) {
        pendingLaunch = activity;
        main.removeCallbacks(launchTimeout);
        main.postDelayed(launchTimeout, LAUNCH_TIMEOUT_MS);
        if (client != null) {
            newSession();
        } else if (!binding) {
            String pkg = CustomTabsClient.getPackageName(app, Collections.singletonList(CHROME), true);
            binding = CustomTabsClient.bindCustomTabsService(app, pkg != null ? pkg : CHROME, connection);
            if (!binding) openPlainBrowser();
        }
    }

    void onActivityDestroyed(Activity a) {
        if (pendingLaunch == a) {
            pendingLaunch = null;
            main.removeCallbacks(launchTimeout);
        }
    }

    private final Runnable launchTimeout = () -> {
        if (pendingLaunch == null) return;
        Log.w(TAG, "Quá thời gian chờ Chrome, mở TPM luôn");
        if (session != null) launchTab();
        else openPlainBrowser();
    };

    private final CustomTabsServiceConnection connection = new CustomTabsServiceConnection() {
        @Override
        public void onCustomTabsServiceConnected(@NonNull ComponentName name, @NonNull CustomTabsClient c) {
            client = c;
            client.warmup(0L);
            if (pendingLaunch != null) newSession();
        }

        @Override
        public void onServiceDisconnected(ComponentName name) {
            client = null;
            session = null;
            binding = false;
            generation++;
            originValidated = false;
            channelReady = false;
            tabVisible = false;
        }
    };

    private void newSession() {
        final int gen = ++generation;
        originValidated = false;
        channelReady = false;
        tabVisible = false;
        channelRetries = 0;
        session = client.newSession(callback(gen));
        if (session == null) {
            openPlainBrowser();
            return;
        }
        // Mở trang ngay khi Chrome xác minh xong (hoặc khi hết thời gian chờ).
        if (!session.validateRelationship(CustomTabsService.RELATION_USE_AS_ORIGIN, origin, null)) {
            launchTab();
        }
    }

    private void launchTab() {
        Activity a = pendingLaunch;
        pendingLaunch = null;
        main.removeCallbacks(launchTimeout);
        if (a == null || session == null) return;
        try {
            new TrustedWebActivityIntentBuilder(url).build(session).launchTrustedWebActivity(a);
            tabVisible = true;
            if (a instanceof TwaActivity) ((TwaActivity) a).markLaunched();
        } catch (Exception e) {
            Log.w(TAG, "Không mở được TWA: " + e);
            a.finish();
        }
    }

    private void openPlainBrowser() {
        Activity a = pendingLaunch;
        pendingLaunch = null;
        main.removeCallbacks(launchTimeout);
        if (a == null) return;
        try {
            a.startActivity(new Intent(Intent.ACTION_VIEW, url));
        } catch (Exception e) {
            Log.w(TAG, "Không mở được trình duyệt: " + e);
        }
        a.finish();
    }

    // ---------------- Kênh postMessage ----------------

    private CustomTabsCallback callback(final int gen) {
        return new CustomTabsCallback() {
            @Override
            public void onRelationshipValidationResult(int relation, @NonNull Uri requestedOrigin,
                                                       boolean result, @Nullable Bundle extras) {
                if (gen != generation) return;
                Log.i(TAG, "Xác minh assetlinks: " + result);
                originValidated = result;
                if (pendingLaunch != null) launchTab();
            }

            @Override
            public void onNavigationEvent(int event, @Nullable Bundle extras) {
                if (gen != generation) return;
                switch (event) {
                    case TAB_SHOWN:
                        tabVisible = true;
                        break;
                    case TAB_HIDDEN:
                        tabVisible = false;
                        break;
                    case NAVIGATION_STARTED:
                        channelReady = false;
                        break;
                    case NAVIGATION_FINISHED:
                        channelRetries = 0;
                        requestChannel();
                        break;
                }
            }

            @Override
            public void onPostMessage(@NonNull String message, @Nullable Bundle extras) {
                if (gen != generation || !"ready".equals(message)) return;
                channelReady = true;
                channelRetries = 0;
                main.removeCallbacks(readyCheck);
                Log.i(TAG, "Trang TPM đã sẵn sàng nhận mã");
            }
        };
    }

    private void requestChannel() {
        if (session == null || !originValidated) return;
        channelReady = false;
        boolean ok = session.requestPostMessageChannel(origin, origin, new Bundle());
        if (!ok) ok = session.requestPostMessageChannel(origin);
        Log.i(TAG, "Yêu cầu mở kênh postMessage: " + ok);
        main.removeCallbacks(readyCheck);
        main.postDelayed(readyCheck, READY_TIMEOUT_MS);
    }

    /** Trang không trả lời "ready" (chưa tải xong, hoặc bản web chưa có rfidBridge.js): thử lại vài lần. */
    private final Runnable readyCheck = () -> {
        if (channelReady || !tabVisible || channelRetries >= MAX_CHANNEL_RETRIES) return;
        channelRetries++;
        requestChannel();
    };

    /**
     * Gửi một lô mã sang trang.
     * @return false nếu kênh chưa dùng được; khi đó nơi gọi tự chuyển sang Trợ năng.
     */
    public boolean send(List<String> codes) {
        if (!isActive() || codes.isEmpty()) return false;
        StringBuilder sb = new StringBuilder(codes.size() * 25);
        for (String c : codes) sb.append(c).append('\n');
        int r = session.postMessage(sb.toString(), null);
        if (r == CustomTabsService.RESULT_SUCCESS) return true;
        Log.w(TAG, "postMessage thất bại (" + r + "), mở lại kênh");
        channelReady = false;
        channelRetries = 0;
        if (tabVisible) requestChannel();
        return false;
    }
}
