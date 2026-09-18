package com.tina.rfidadapterapp;

import android.content.BroadcastReceiver;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.view.ActionMode;
import android.view.Menu;
import android.view.MenuItem;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ImageButton;
import android.widget.TextView;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;

import java.util.ArrayList;
import java.util.List;

public class MainActivity extends AppCompatActivity {

    private EditText edtResult;
    private Button btnScan;
    private ImageButton btnMenu, btnClear, btnCopy;
    private TextView txtTrangThai;
    private View viewStatusDot;
    private TextView txtTotalTags;
    private boolean isDeviceConnected = false;
    /** Danh sách mã đã quét, giữ đúng thứ tự hiển thị để đánh số và để copy. */
    private final List<String> scannedCodes = new ArrayList<>();

    private final BroadcastReceiver rfidDataReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            if ("RFID_UI_UPDATE".equals(intent.getAction())) {
                String epc = intent.getStringExtra("epc");
                if (epc != null) addScannedCode(epc);
            }
        }
    };
    private final BroadcastReceiver tagCountReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            if ("RFID_TAG_COUNT".equals(intent.getAction())) {
                int count = intent.getIntExtra("count", 0);
                txtTotalTags.setText(String.valueOf(count));
            }
        }
    };

    private final BroadcastReceiver connectionReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            if ("RFID_CONNECTION_STATUS".equals(intent.getAction())) {
                boolean success = intent.getBooleanExtra("is_connected", false);
                Log.d("RFID_DEBUG", "UI nhận được Broadcast kết nối: " + success);

                isDeviceConnected = success;
                refreshInterface();

                if (success) Toast.makeText(context, "Kết nối thành công!", Toast.LENGTH_SHORT).show();
            }
        }
    };

    private final BroadcastReceiver scanStatusReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            if ("RFID_SCAN_STATUS".equals(intent.getAction())) {
                boolean isScanning = intent.getBooleanExtra("scanning", false);
                updateScanButton(isScanning);
            }
        }
    };

    private final BroadcastReceiver clearReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            if ("RFID_CLEAR_UI".equals(intent.getAction())) {
                clearResult();
            }
        }
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        initViews();
        ensureRfidServiceRunning();

        try {
            java.io.File dev = new java.io.File("/dev");
            java.io.File[] files = dev.listFiles();
            if (files != null) {
                for (java.io.File f : files) {
                    if (f.getName().contains("ttyS") || f.getName().contains("ttyMT")) {
                        FileLogger.save(this, "Hệ thống phát hiện cổng: " + f.getAbsolutePath());
                    }
                }
            }
        } catch (Exception e) {
            FileLogger.save(this, "Lỗi khi liệt kê cổng: " + e.getMessage());
        }

        btnScan.setOnClickListener(v -> {
            Intent i = new Intent(RFIDForegroundService.ACTION_TRIGGER_PHYSICAL);
            i.setPackage(getPackageName());
            i.putExtra("pressed", true);
            i.putExtra("source", "UI");
            sendBroadcast(i);
        });

        btnMenu.setOnClickListener(v -> startActivity(new Intent(MainActivity.this, SettingsActivity.class)));
        btnClear.setOnClickListener(v -> {
            Intent i = new Intent("RFID_CLEAR_SESSION");
            i.setPackage(getPackageName());
            sendBroadcast(i);
        });
        btnCopy.setOnClickListener(v -> copyCodesToClipboard());
    }

    /**
     * Hiển thị kèm số thứ tự, căn phải theo cột cố định để phần mã EPC của mọi dòng
     * bắt đầu thẳng hàng: "  1. E2...", "100. E2...".
     */
    private void addScannedCode(String epc) {
        scannedCodes.add(epc);
        edtResult.append(String.format("%3d. %s%n", scannedCodes.size(), epc));
    }

    private void clearResult() {
        scannedCodes.clear();
        edtResult.setText("");
    }

    /** Copy mã thô (không kèm số thứ tự) để dán thẳng vào web TPM. */
    private void copyCodesToClipboard() {
        if (scannedCodes.isEmpty()) {
            Toast.makeText(this, "Chưa có mã nào để copy", Toast.LENGTH_SHORT).show();
            return;
        }

        StringBuilder sb = new StringBuilder();
        for (String code : scannedCodes) sb.append(code).append("\n");

        ClipboardManager clipboard = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
        if (clipboard == null) {
            Toast.makeText(this, "Không truy cập được khay nhớ tạm", Toast.LENGTH_SHORT).show();
            return;
        }
        clipboard.setPrimaryClip(ClipData.newPlainText("EPC", sb.toString()));
        Toast.makeText(this, "Đã copy " + scannedCodes.size() + " mã", Toast.LENGTH_SHORT).show();
    }
    /**
     * Service nền chỉ được BootReceiver bật khi máy khởi động, nên sau khi cài lại app
     * sẽ không có gì chạy cho tới lần reboot kế tiếp. Mở app là bật lại cho chắc.
     */
    private void ensureRfidServiceRunning() {
        Intent serviceIntent = new Intent(this, RFIDForegroundService.class);
        if (Build.VERSION.SDK_INT >= 26) {
            startForegroundService(serviceIntent);
        } else {
            startService(serviceIntent);
        }
    }

    private void registerAllReceivers() {
        IntentFilter filterData = new IntentFilter("RFID_UI_UPDATE");
        IntentFilter filterStatus = new IntentFilter("RFID_CONNECTION_STATUS");
        IntentFilter filterScan = new IntentFilter("RFID_SCAN_STATUS");
        IntentFilter filterClear = new IntentFilter("RFID_CLEAR_UI");
        IntentFilter filterCount = new IntentFilter("RFID_TAG_COUNT");

        if (Build.VERSION.SDK_INT >= 33) {
            registerReceiver(rfidDataReceiver, filterData, Context.RECEIVER_NOT_EXPORTED);
            registerReceiver(connectionReceiver, filterStatus, Context.RECEIVER_NOT_EXPORTED);
            registerReceiver(scanStatusReceiver, filterScan, Context.RECEIVER_NOT_EXPORTED);
            registerReceiver(clearReceiver, filterClear, Context.RECEIVER_NOT_EXPORTED);
            registerReceiver(tagCountReceiver, filterCount, Context.RECEIVER_NOT_EXPORTED);
        } else {
            registerReceiver(rfidDataReceiver, filterData);
            registerReceiver(connectionReceiver, filterStatus);
            registerReceiver(scanStatusReceiver, filterScan);
            registerReceiver(clearReceiver, filterClear);
            registerReceiver(tagCountReceiver, filterCount);
        }
    }

    @Override
    protected void onResume() {
        super.onResume();

        registerAllReceivers();

        boolean serviceState = RFIDForegroundService.isServiceConnected;
        isDeviceConnected = serviceState;
        refreshInterface();

        clearResult();

        if (serviceState) {
            Intent i = new Intent(RFIDForegroundService.ACTION_SYNC_DATA);
            i.setPackage(getPackageName());
            sendBroadcast(i);
        }

        updateScanButton(RFIDForegroundService.isScanning);

    }

    @Override
    protected void onPause() {
        super.onPause();
        try {

            unregisterReceiver(rfidDataReceiver);
            unregisterReceiver(connectionReceiver);
            unregisterReceiver(scanStatusReceiver);
            unregisterReceiver(clearReceiver);
            unregisterReceiver(tagCountReceiver);

        } catch (Exception e) {}
    }
    private void initViews() {
        edtResult = findViewById(R.id.edtResult);
        // Cho phép ấn giữ để bôi đen / copy từng dòng mã.
        // Chặn bàn phím ảo bật lên che mất kết quả (không dùng setKeyListener(null)
        // vì nó tắt luôn long-click, tức là mất luôn menu Copy).
        edtResult.setShowSoftInputOnFocus(false);
        // Chỉ giữ Sao chép / Chọn tất cả, bỏ Cắt và Dán để không lỡ tay làm hỏng danh sách.
        edtResult.setCustomSelectionActionModeCallback(new ActionMode.Callback() {
            @Override
            public boolean onCreateActionMode(ActionMode mode, Menu menu) {
                return true;
            }

            @Override
            public boolean onPrepareActionMode(ActionMode mode, Menu menu) {
                menu.removeItem(android.R.id.cut);
                menu.removeItem(android.R.id.paste);
                menu.removeItem(android.R.id.pasteAsPlainText);
                return true;
            }

            @Override
            public boolean onActionItemClicked(ActionMode mode, MenuItem item) {
                return false;
            }

            @Override
            public void onDestroyActionMode(ActionMode mode) {}
        });
        btnScan = findViewById(R.id.btnScan);
        btnMenu = findViewById(R.id.btnMenu);
        txtTrangThai = findViewById(R.id.txtTtrangThai);
        viewStatusDot = findViewById(R.id.viewStatusDot);
        btnClear = findViewById(R.id.btnClear);
        btnCopy = findViewById(R.id.btnCopy);
        txtTotalTags = findViewById(R.id.txtTotalTags);

        refreshInterface();
    }

    private void refreshInterface() {
        runOnUiThread(() -> {
            if (isDeviceConnected) {
                txtTrangThai.setText("Đã kết nối");
                txtTrangThai.setTextColor(Color.parseColor("#4CAF50"));
                viewStatusDot.setBackgroundResource(R.drawable.bg_status_green);
                btnScan.setEnabled(true);
                btnScan.setAlpha(1.0f);
            } else {
                txtTrangThai.setText("Chưa kết nối");
                txtTrangThai.setTextColor(Color.parseColor("#F44336"));
                viewStatusDot.setBackgroundResource(R.drawable.bg_status_red);
                btnScan.setEnabled(false);
                btnScan.setAlpha(0.5f);
                btnScan.setText("QUÉT RFID");
                btnScan.setBackgroundColor(Color.parseColor("#2196F3"));
            }
        });
    }

    private void updateScanButton(boolean isScanning) {
        runOnUiThread(() -> {
            if (isScanning) {
                btnScan.setText("DỪNG QUÉT");
                btnScan.setBackgroundColor(Color.parseColor("#F44336"));
            } else {
                btnScan.setText("BẮT ĐẦU QUÉT");
                btnScan.setBackgroundColor(Color.parseColor("#2196F3"));
            }
        });
    }
}