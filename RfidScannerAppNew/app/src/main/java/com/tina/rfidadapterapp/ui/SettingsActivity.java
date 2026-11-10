package com.tina.rfidadapterapp.ui;

import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;

import com.tina.rfidadapterapp.Config;
import com.tina.rfidadapterapp.KeyService;
import com.tina.rfidadapterapp.ScanService;
import com.tina.rfidadapterapp.TagBus;
import com.tina.rfidadapterapp.Thermal;
import com.tina.rfidadapterapp.twa.TwaActivity;
import com.tina.rfidadapterapp.twa.TwaBridge;

import java.util.List;

/** Màn hình cấu hình. Mỗi thay đổi được lưu ngay và đẩy xuống đầu đọc ở lần quét kế tiếp. */
public class SettingsActivity extends AppCompatActivity implements TagBus.Listener {

    private static final String[] TRIGGER_NAMES = {"Immediate (bấm để bắt đầu / dừng)", "Hold (giữ cò để quét)"};
    private static final String[] SCANMODE_NAMES = {"Quét 1 thẻ (Single)", "Quét nhiều thẻ (Multi)"};
    private static final String[] SESSION_NAMES = {
            "S0 – thẻ trả lời liên tục (1 thẻ)",
            "S1 – thẻ nghỉ 0,5–5 giây",
            "S2 – thẻ nghỉ lâu (kho, nhiều thẻ)",
            "S3 – thẻ nghỉ lâu (kho, nhiều thẻ)",
            "Auto – luân phiên S2/S3 (kiểm kê kho)"
    };

    private final Handler main = new Handler(Looper.getMainLooper());
    private TextView statusText;
    private android.widget.EditText prefixInput;
    private Ui ui;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setTitle("Cài đặt RFID");
        ui = new Ui(this);
        build();
        setContentView(ui.root());
        ScanService.start(this);
        refreshPinnedShortcut();
    }

    private void build() {
        Config c = Config.load(this);
        LinearLayout box;

        box = ui.section("TRẠNG THÁI");
        statusText = ui.text(box, "");
        ui.button(box, "Mở TPM", v -> startActivity(new Intent(this, TwaActivity.class)));
        ui.button(box, "Màn hình kiểm tra quét", v -> startActivity(new Intent(this, TestScanActivity.class)));
        ui.button(box, "Mở cài đặt Trợ năng (phím cò)",
                v -> startActivity(new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)));
        ui.button(box, "Thêm icon \"Cài đặt RFID\" ra màn hình chính", v -> pinSettingsShortcut());

        box = ui.section("CHUNG");
        ui.switchRow(box, "Dịch vụ RFID", "Tắt thì đầu đọc ngắt kết nối và phím cò không còn tác dụng",
                c.serviceEnabled, on -> {
                    Config.put(this, Config.SERVICE_ENABLED, on ? 1 : 0);
                    if (on) ScanService.start(this);
                    else ScanService.stop(this);
                    main.postDelayed(this::refreshStatus, 300);
                });
        ui.switchRow(box, "Âm báo", "Kêu bíp liên tục mỗi khi đầu đọc đọc được thẻ", c.sound,
                on -> save(Config.SOUND_ENABLED, on ? 1 : 0));
        ui.switchRow(box, "Lọc thẻ trùng",
                "Bật: mỗi thẻ chỉ gửi 1 lần trong một lượt quét. Tắt: gửi mọi lần đọc (dùng khi dò tìm theo tín hiệu)",
                c.dedup, on -> save(Config.DEDUP, on ? 1 : 0));

        box = ui.section("LỌC THẺ (PRE-FILTER)");
        ui.switchRow(box, "Pre-filter",
                "Bật: chỉ nhận thẻ có mã bắt đầu bằng chuỗi bên dưới, thẻ khác bị bỏ qua (không bíp, không gửi lên TPM)",
                c.prefilter, on -> {
                    Config.put(this, Config.PREFILTER_ENABLED, on ? 1 : 0);
                    ScanService.onAppConfigChanged();
                    setPrefixEnabled(on);
                });
        prefixInput = ui.hexRow(box, "Mã bắt đầu bằng", "Ký tự hex 0–9, A–F. Để trống = nhận mọi thẻ",
                c.prefilterPrefix, 24, s -> {
                    Config.putString(this, Config.PREFILTER_PREFIX, Config.cleanHex(s));
                    ScanService.onAppConfigChanged();
                });
        setPrefixEnabled(c.prefilter);

        box = ui.section("ĐẦU ĐỌC");
        String[] powers = new String[34];
        for (int i = 0; i <= 33; i++) powers[i] = i + " dBm";
        ui.spinnerRow(box, "Công suất phát (RF power)", "Càng cao đọc càng xa, tốn pin và nóng máy hơn",
                powers, c.power, i -> save(Config.POWER, i));
        ui.spinnerRow(box, "Vùng tần số (Region)", null, Config.REGION_NAMES, c.region, i -> save(Config.REGION, i));
        ui.spinnerRow(box, "Chế độ cò (Trigger mode)", null, TRIGGER_NAMES, c.trigger, i -> save(Config.TRIGGER, i));
        ui.spinnerRow(box, "Chế độ quét", null, SCANMODE_NAMES, c.scanMode, i -> save(Config.SCANMODE, i));

        box = ui.section("THAM SỐ KIỂM KÊ");
        String[] qs = new String[16];
        for (int i = 0; i < 16; i++) qs[i] = "Q = " + i + "  (" + (1 << i) + " khe)";
        ui.spinnerRow(box, "Q value", "Nhiều thẻ cùng lúc (>20) nên để 7–10; ít thẻ để 0–4",
                qs, c.q, i -> save(Config.Q_VALUE, i));
        ui.spinnerRow(box, "Session", "Kiểm kê kho nên dùng S2, S3 hoặc Auto",
                SESSION_NAMES, c.session, i -> save(Config.SESSION, i));
        String[] words = new String[33];
        for (int i = 0; i <= 32; i++) words[i] = i + " word";
        ui.spinnerRow(box, "TID pointer", "Địa chỉ word bắt đầu đọc vùng TID", words, c.tidPtr,
                i -> save(Config.TID_PTR, i));
        String[] lens = words.clone();
        lens[0] = "0 – không đọc TID (đọc EPC)";
        ui.spinnerRow(box, "TID length", "Lớn hơn 0 thì đầu đọc trả về TID thay cho EPC", lens, c.tidLen,
                i -> save(Config.TID_LEN, i));
        ui.seekRow(box, "Thời gian mỗi vòng quét (Max scan time)",
                "Cầm tay đi lại: 100–500 ms. Đứng yên kiểm kê: dài hơn",
                1, 255, c.scanTime, v -> (v * 100) + " ms", v -> save(Config.MAX_SCAN_TIME, v));
        ui.seekRow(box, "Nghỉ giữa hai vòng (Interval)", "0 = quét liên tục, nhanh nhất nhưng nóng máy nhất",
                0, 200, c.interval / 10, v -> (v * 10) + " ms", v -> save(Config.INTERVAL, v * 10));

        box = ui.section("KHÁC");
        ui.button(box, "Khôi phục mặc định", v -> confirmReset());
    }

    /**
     * Nhờ Android đặt một icon mở thẳng màn hình này ra màn hình chính.
     * Cần vì launcher của máy, khi tự thêm icon lúc cài app, cho cả hai icon trỏ vào trang web TPM.
     */
    private void pinSettingsShortcut() {
        android.content.pm.ShortcutManager sm = getSystemService(android.content.pm.ShortcutManager.class);
        if (sm == null || !sm.isRequestPinShortcutSupported()) {
            android.widget.Toast.makeText(this,
                    "Launcher của máy không hỗ trợ thêm icon. Hãy kéo \"Cài đặt RFID\" từ ngăn kéo ứng dụng ra.",
                    android.widget.Toast.LENGTH_LONG).show();
            return;
        }
        boolean ok = sm.requestPinShortcut(settingsShortcut(), null);
        if (!ok) {
            android.widget.Toast.makeText(this, "Không thêm được icon", android.widget.Toast.LENGTH_SHORT).show();
        }
    }

    private static final String PIN_ID = "rfid_settings";

    private android.content.pm.ShortcutInfo settingsShortcut() {
        Intent open = new Intent(this, SettingsActivity.class)
                .setAction(Intent.ACTION_MAIN)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        return new android.content.pm.ShortcutInfo.Builder(this, PIN_ID)
                .setShortLabel("Cài đặt RFID")
                .setLongLabel("Cài đặt RFID")
                .setIcon(android.graphics.drawable.Icon.createWithResource(this,
                        com.tina.rfidadapterapp.R.mipmap.ic_settings_launcher))
                .setIntent(open)
                .build();
    }

    /** Icon Cài đặt đã đặt ra màn hình chính từ bản trước (logo TPM) được đổi sang bánh răng. */
    private void refreshPinnedShortcut() {
        try {
            android.content.pm.ShortcutManager sm = getSystemService(android.content.pm.ShortcutManager.class);
            if (sm == null) return;
            for (android.content.pm.ShortcutInfo s : sm.getPinnedShortcuts()) {
                if (PIN_ID.equals(s.getId())) {
                    sm.updateShortcuts(java.util.Collections.singletonList(settingsShortcut()));
                    return;
                }
            }
        } catch (Exception ignored) {
        }
    }

    /** Tắt pre-filter thì ô tiền tố mờ đi và không sửa được (giá trị vẫn giữ để bật lại dùng tiếp). */
    private void setPrefixEnabled(boolean on) {
        if (prefixInput == null) return;
        prefixInput.setEnabled(on);
        if (!on) prefixInput.clearFocus();
        android.view.View row = (android.view.View) prefixInput.getParent();
        row.setAlpha(on ? 1f : 0.4f);
    }

    private void save(String key, int value) {
        Config.put(this, key, value);
        ScanService.onConfigChanged();
    }

    private void confirmReset() {
        new AlertDialog.Builder(this)
                .setTitle("Khôi phục mặc định?")
                .setMessage("Power " + Config.DEF_POWER + " dBm, Region Việt Nam, Trigger Immediate, Quét nhiều thẻ, "
                        + "Q " + Config.DEF_Q_VALUE + ", Session Auto, TID 0/0, Scan time "
                        + (Config.DEF_MAX_SCAN_TIME * 100) + " ms, Interval " + Config.DEF_INTERVAL + " ms, "
                        + "bật âm báo, bật lọc trùng, bật pre-filter \"" + Config.DEF_PREFILTER_PREFIX + "\".")
                .setPositiveButton("Khôi phục", (d, w) -> {
                    Config.resetDefaults(this);
                    ScanService.onConfigChanged();
                    recreate();
                })
                .setNegativeButton("Huỷ", null)
                .show();
    }

    // ---------------- Trạng thái ----------------

    private final Runnable ticker = new Runnable() {
        @Override
        public void run() {
            refreshStatus();
            main.postDelayed(this, 1000);
        }
    };

    private void refreshStatus() {
        StringBuilder sb = new StringBuilder();
        ScanService s = ScanService.get();
        if (s == null) {
            sb.append("Dịch vụ RFID: đang tắt");
        } else {
            ScanService.Status st = s.status();
            sb.append("Đầu đọc: ").append(st.connected ? "đã kết nối" : "chưa kết nối").append('\n');
            sb.append("Trạng thái: ").append(st.message);
            if (st.scanning) sb.append(" – ").append(st.unique).append(" thẻ");
            sb.append('\n').append("Nhiệt độ module UHF: ").append(st.moduleTempText());
        }
        sb.append('\n').append(Thermal.summary(this));
        sb.append('\n').append("Phím cò (Trợ năng): ").append(KeyService.get() != null ? "đã bật" : "CHƯA BẬT");
        sb.append('\n').append("Kênh gửi mã sang TPM: ").append(TwaBridge.get(this).describe());
        statusText.setText(sb);
    }

    @Override
    protected void onResume() {
        super.onResume();
        TagBus.register(this);
        main.post(ticker);
    }

    @Override
    protected void onPause() {
        TagBus.unregister(this);
        main.removeCallbacks(ticker);
        super.onPause();
    }

    @Override
    public void onReads(List<TagBus.Read> batch) {
    }

    @Override
    public void onStatus(ScanService.Status status) {
        refreshStatus();
    }
}
