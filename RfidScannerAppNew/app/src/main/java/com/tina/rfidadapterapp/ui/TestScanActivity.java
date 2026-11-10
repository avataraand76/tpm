package com.tina.rfidadapterapp.ui;

import android.content.ClipData;
import android.content.ClipboardManager;
import android.graphics.Color;
import android.graphics.Typeface;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.ViewGroup;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ListView;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import com.tina.rfidadapterapp.Config;
import com.tina.rfidadapterapp.ScanService;
import com.tina.rfidadapterapp.Thermal;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;

/**
 * Màn hình đo khả năng đọc: số thẻ khác nhau, tổng lượt đọc, tốc độ, danh sách thẻ.
 * Dùng để so cấu hình (Session, Q, power...) ngay tại kho trước khi kiểm kê thật.
 */
public class TestScanActivity extends AppCompatActivity {

    private static final int[] TRIGGER_KEYS = {619, 305, 621, 622, 623};
    private static final int MAX_ROWS = 500;

    private final Handler main = new Handler(Looper.getMainLooper());
    private TextView bigCount, detail;
    private Button toggle;
    private ArrayAdapter<String> adapter;
    private final ArrayList<String> rows = new ArrayList<>();
    private boolean keyDown;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setTitle("Kiểm tra quét");
        Ui ui = new Ui(this);
        int pad = ui.dp(16);

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(pad, pad, pad, pad);
        root.setBackgroundColor(Color.parseColor("#F1F3F7"));

        bigCount = new TextView(this);
        bigCount.setTextSize(48);
        bigCount.setTypeface(Typeface.DEFAULT_BOLD);
        bigCount.setTextColor(Ui.ACCENT);
        bigCount.setGravity(Gravity.CENTER_HORIZONTAL);
        root.addView(bigCount);

        detail = new TextView(this);
        detail.setGravity(Gravity.CENTER_HORIZONTAL);
        detail.setTextSize(14);
        detail.setPadding(0, 0, 0, pad / 2);
        root.addView(detail);

        LinearLayout buttons = new LinearLayout(this);
        buttons.setOrientation(LinearLayout.HORIZONTAL);
        toggle = new Button(this);
        toggle.setAllCaps(false);
        toggle.setOnClickListener(v -> {
            ScanService s = ScanService.get();
            if (s == null) {
                Toast.makeText(this, "Dịch vụ RFID đang tắt", Toast.LENGTH_SHORT).show();
                return;
            }
            s.toggleScan();
            refresh();
        });
        Button copy = new Button(this);
        copy.setAllCaps(false);
        copy.setText("Sao chép danh sách");
        copy.setOnClickListener(v -> copyAll());
        buttons.addView(toggle, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f));
        buttons.addView(copy, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f));
        root.addView(buttons);

        ListView list = new ListView(this);
        adapter = new ArrayAdapter<>(this, android.R.layout.simple_list_item_1, rows);
        list.setAdapter(adapter);
        root.addView(list, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f));

        setContentView(root);
        ScanService.start(this);
    }

    private final Runnable ticker = new Runnable() {
        @Override
        public void run() {
            refresh();
            main.postDelayed(this, 300);
        }
    };

    private void refresh() {
        ScanService s = ScanService.get();
        if (s == null) {
            bigCount.setText("–");
            detail.setText("Dịch vụ RFID đang tắt");
            toggle.setText("Bắt đầu quét");
            return;
        }
        ScanService.Status st = s.status();
        bigCount.setText(String.valueOf(st.unique));
        long ms = st.startedAt == 0 ? 0 : SystemClock.elapsedRealtime() - st.startedAt;
        double sec = ms / 1000.0;
        Config c = Config.load(this);
        String session = c.session >= Config.SESSION_AUTO ? "Auto" : "S" + c.session;
        String filter = c.prefilter && !c.prefilterPrefix.isEmpty() ? "lọc \"" + c.prefilterPrefix + "…\"" : "không lọc";
        detail.setText(String.format(Locale.US,
                "thẻ khác nhau • %d lượt đọc • %.1f s • %.0f lượt/s\n%s\nPower %d dBm • %s • Q %d • %d ms/vòng • %s\nModule UHF: %s\n%s",
                st.reads, sec, sec > 0 ? st.reads / sec : 0.0, st.message,
                c.power, session, c.q, c.scanTime * 100, filter,
                st.moduleTempText(), Thermal.summary(this)));
        toggle.setText(st.scanning ? "Dừng quét" : "Bắt đầu quét");

        List<ScanService.TagStat> tags = new ArrayList<>(s.stats().values());
        Collections.sort(tags, (x, y) -> Long.compare(y.firstAt, x.firstAt));
        rows.clear();
        for (int i = 0; i < tags.size() && i < MAX_ROWS; i++) {
            ScanService.TagStat t = tags.get(i);
            rows.add(t.code + "\n×" + t.count + "   RSSI " + t.rssi);
        }
        adapter.notifyDataSetChanged();
    }

    private void copyAll() {
        ScanService s = ScanService.get();
        if (s == null) return;
        StringBuilder sb = new StringBuilder();
        for (String code : s.stats().keySet()) sb.append(code).append('\n');
        ClipboardManager cm = getSystemService(ClipboardManager.class);
        cm.setPrimaryClip(ClipData.newPlainText("RFID", sb.toString()));
        Toast.makeText(this, "Đã sao chép " + s.stats().size() + " mã", Toast.LENGTH_SHORT).show();
    }

    /** Khi chưa bật Trợ năng, phím cò vẫn dùng được trên màn hình này. */
    @Override
    public boolean dispatchKeyEvent(KeyEvent event) {
        if (isTrigger(event.getKeyCode())) {
            ScanService s = ScanService.get();
            if (s != null) {
                if (event.getAction() == KeyEvent.ACTION_DOWN && !keyDown) {
                    keyDown = true;
                    s.onTrigger(true);
                } else if (event.getAction() == KeyEvent.ACTION_UP) {
                    keyDown = false;
                    s.onTrigger(false);
                }
            }
            return true;
        }
        return super.dispatchKeyEvent(event);
    }

    private static boolean isTrigger(int code) {
        for (int k : TRIGGER_KEYS) if (k == code) return true;
        return false;
    }

    @Override
    protected void onResume() {
        super.onResume();
        main.post(ticker);
    }

    @Override
    protected void onPause() {
        main.removeCallbacks(ticker);
        super.onPause();
    }
}
