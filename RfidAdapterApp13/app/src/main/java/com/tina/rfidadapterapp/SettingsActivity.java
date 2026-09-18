package com.tina.rfidadapterapp;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.view.View;
import android.widget.AdapterView;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ImageButton;
import android.widget.LinearLayout;
import android.widget.SeekBar;
import android.widget.Spinner;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.widget.SwitchCompat;

public class SettingsActivity extends AppCompatActivity {

    private ImageButton btnBack;
    private Button btnResetDefaults;
    private TextView txtResetSummary;
    private LinearLayout rowPower, rowTrigger, rowRegion, rowScanMode;
    private TextView txtPowerSum, txtTriggerSum, txtRegionSum, txtScanModeSummary;

    private Spinner spnQValue, spnSession;
    private EditText edtTidPtr, edtTidLen;
    private SeekBar seekMaxScanTime, seekInterval;
    private TextView txtMaxScanTimeValue, txtIntervalValue;
    private SwitchCompat swSound, swService;

    private int currentPower = 33;
    private int currentTriggerIndex = 1;
    private int currentScanModeIndex = 1;
    private int currentRegionIndex = 0;

    private final String[] Q_VALUES = {"0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15"};
    // Module chi nhan Session 0-3 (chuan EPC Gen2). Da thu ghi 4 xuong dau doc:
    // quet 8 giay khong ra mot the nao, trong khi Session 0 doc duoc ngay sau 139ms.
    private final String[] SESSION_VALUES = {"0", "1", "2", "3"};
    private final String[] TRIGGER_OPTIONS = {"Immediate (Bấm để bắt đầu/dừng)", "Hold (Giữ để quét)"};
    private final String[] SCAN_MODE = {"Quét 1 thẻ (Single)", "Quét nhiều thẻ (Multi)"};
    private final String[] REGION_OPTIONS = {"Vietnam", "US / FCC", "Europe / ETSI", "China"};
    private String[] POWER_OPTIONS;

    // Bộ giá trị mà nút "Khôi phục mặc định" sẽ ghi đè lên cấu hình hiện tại.
    // Sửa ở đây là xong: cả hộp thoại xác nhận lẫn dòng mô tả trên màn hình
    // đều tự dựng lại từ các hằng số này nên không bao giờ lệch nhau.
    private static final int DEF_POWER = 33;
    private static final int DEF_SESSION = 0;
    private static final int DEF_Q_VALUE = 7;
    private static final int DEF_TRIGGER = 0;      // Immediate
    private static final int DEF_SCANMODE = 1;     // Multi
    private static final int DEF_REGION = 0;       // Vietnam
    private static final int DEF_MAX_SCAN_TIME = 100;
    private static final int DEF_INTERVAL = 0;
    private static final int DEF_SOUND_ENABLED = 1;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_settings);

        POWER_OPTIONS = new String[34];
        for (int i = 0; i <= 33; i++) {
            POWER_OPTIONS[i] = i + " dBm";
        }

        initViews();
        setupSpinners();
        setupSeekBars();
        setupSwitches();
        loadSavedConfig();

        btnBack.setOnClickListener(v -> {
            saveInventoryToDisk();
            finish();
        });

        btnResetDefaults.setOnClickListener(v -> showResetDialog());

        rowPower.setOnClickListener(v -> showPowerDialog());
        rowTrigger.setOnClickListener(v -> showTriggerDialog());
        rowScanMode.setOnClickListener(v -> showScanModeDialog());
        rowRegion.setOnClickListener(v -> showRegionDialog());
    }

    private void setupSwitches() {
        // Xử lý Bật/Tắt Âm thanh
        swSound.setOnCheckedChangeListener((buttonView, isChecked) -> {
            saveConfig("SOUND_ENABLED", isChecked ? 1 : 0);
            notifyApplyConfig();
            //Toast.makeText(this, isChecked ? "Đã bật âm thanh" : "Đã tắt âm thanh", Toast.LENGTH_SHORT).show();
        });

        // Xử lý Bật/Tắt Service
        swService.setOnCheckedChangeListener((buttonView, isChecked) -> {
            saveConfig("SERVICE_ENABLED", isChecked ? 1 : 0);
            Intent serviceIntent = new Intent(this, RFIDForegroundService.class);

            if (isChecked) {
                if (Build.VERSION.SDK_INT >= 26) startForegroundService(serviceIntent);
                else startService(serviceIntent);
                Toast.makeText(this, "RFID Service: Đã kích hoạt", Toast.LENGTH_SHORT).show();
            } else {
                stopService(serviceIntent);
                Toast.makeText(this, "RFID Service: Đã ngắt kết nối", Toast.LENGTH_LONG).show();
            }
        });
    }

    private void initViews() {
        btnBack = findViewById(R.id.btnBack);
        btnResetDefaults = findViewById(R.id.btnResetDefaults);
        txtResetSummary = findViewById(R.id.txtResetSummary);
        txtResetSummary.setText(buildDefaultsSummary());
        rowPower = findViewById(R.id.rowPower);
        rowTrigger = findViewById(R.id.rowTrigger);
        rowRegion = findViewById(R.id.rowRegion);
        txtPowerSum = findViewById(R.id.txtPowerSummary);
        txtTriggerSum = findViewById(R.id.txtTriggerSummary);
        txtRegionSum = findViewById(R.id.txtRegionSummary);
        txtScanModeSummary = findViewById(R.id.txtScanModeSummary);
        rowScanMode = findViewById(R.id.rowScanMode);

        spnQValue = findViewById(R.id.spnQValue);
        spnSession = findViewById(R.id.spnSession);
        edtTidPtr = findViewById(R.id.edtTidPtr);
        edtTidLen = findViewById(R.id.edtTidLen);
        seekMaxScanTime = findViewById(R.id.seekMaxScanTime);
        seekInterval = findViewById(R.id.seekInterval);
        txtMaxScanTimeValue = findViewById(R.id.txtMaxScanTimeValue);
        txtIntervalValue = findViewById(R.id.txtIntervalValue);

        swSound = findViewById(R.id.swSound);
        swService = findViewById(R.id.swService);
    }

    private void setupSpinners() {
        ArrayAdapter<String> qAdapter = new ArrayAdapter<>(this, android.R.layout.simple_spinner_item, Q_VALUES);
        qAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
        spnQValue.setAdapter(qAdapter);
        spnQValue.setOnItemSelectedListener(new SimpleSpinnerListener("Q_VALUE"));

        ArrayAdapter<String> sAdapter = new ArrayAdapter<>(this, android.R.layout.simple_spinner_item, SESSION_VALUES);
        sAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
        spnSession.setAdapter(sAdapter);
        spnSession.setOnItemSelectedListener(new SimpleSpinnerListener("SESSION"));
    }

    private void setupSeekBars() {
        seekMaxScanTime.setOnSeekBarChangeListener(new SeekBar.OnSeekBarChangeListener() {
            @Override
            public void onProgressChanged(SeekBar seekBar, int progress, boolean fromUser) {
                txtMaxScanTimeValue.setText(String.valueOf(progress));
                if (fromUser) saveConfig("MAX_SCAN_TIME", progress);
            }
            @Override public void onStartTrackingTouch(SeekBar seekBar) {}
            @Override public void onStopTrackingTouch(SeekBar seekBar) {}
        });

        seekInterval.setOnSeekBarChangeListener(new SeekBar.OnSeekBarChangeListener() {
            @Override
            public void onProgressChanged(SeekBar seekBar, int progress, boolean fromUser) {
                int realValue = progress * 20;
                txtIntervalValue.setText(realValue + " ms");
                if (fromUser) saveConfig("INTERVAL", realValue);
            }
            @Override public void onStartTrackingTouch(SeekBar seekBar) {}
            @Override public void onStopTrackingTouch(SeekBar seekBar) {}
        });
    }

    private void showPowerDialog() {
        new AlertDialog.Builder(this)
                .setTitle("RF Transmit Power")
                .setSingleChoiceItems(POWER_OPTIONS, currentPower, (dialog, which) -> {
                    currentPower = which;
                    txtPowerSum.setText(POWER_OPTIONS[which]);
                    saveConfig("POWER", which);
                    dialog.dismiss();
                })
                .setNegativeButton("HỦY", null).show();
    }

    private void showTriggerDialog() {
        new AlertDialog.Builder(this)
                .setTitle("Trigger Mode")
                .setSingleChoiceItems(TRIGGER_OPTIONS, currentTriggerIndex, (dialog, which) -> {
                    currentTriggerIndex = which;
                    txtTriggerSum.setText(TRIGGER_OPTIONS[which]);
                    saveConfig("TRIGGER", which);
                    dialog.dismiss();
                })
                .setNegativeButton("HỦY", null).show();
    }

    private void showScanModeDialog(){
        new AlertDialog.Builder(this)
                .setTitle("Chọn chế độ quét")
                .setSingleChoiceItems(SCAN_MODE, currentScanModeIndex, (dialog, which) ->{
                    currentScanModeIndex = which;
                    txtScanModeSummary.setText(SCAN_MODE[which]);
                    saveConfig("SCANMODE", which);
                    dialog.dismiss();
                })
                .setNegativeButton("HỦY", null).show();
    }

    private void showRegionDialog() {
        new AlertDialog.Builder(this)
                .setTitle("Region / Frequency")
                .setSingleChoiceItems(REGION_OPTIONS, currentRegionIndex, (dialog, which) -> {
                    currentRegionIndex = which;
                    txtRegionSum.setText(REGION_OPTIONS[which]);
                    saveConfig("REGION", which);
                    dialog.dismiss();
                })
                .setNegativeButton("HỦY", null).show();
    }

    /** Bỏ phần trong ngoặc cho gọn: "Immediate (Bấm để...)" -> "Immediate". */
    private String shortLabel(String label) {
        int i = label.indexOf(" (");
        return (i > 0) ? label.substring(0, i) : label;
    }

    private String buildDefaultsSummary() {
        return "Đưa toàn bộ thông số quét về bộ mặc định: công suất " + DEF_POWER
                + " dBm, Session " + DEF_SESSION
                + ", Q Value " + DEF_Q_VALUE
                + ", " + shortLabel(SCAN_MODE[DEF_SCANMODE])
                + ", nút bấm " + shortLabel(TRIGGER_OPTIONS[DEF_TRIGGER])
                + ", vùng " + REGION_OPTIONS[DEF_REGION]
                + ", Max Scan Time " + DEF_MAX_SCAN_TIME
                + ", Interval " + DEF_INTERVAL + " ms"
                + ", âm thanh " + (DEF_SOUND_ENABLED == 1 ? "bật" : "tắt")
                + ". Trạng thái dịch vụ giữ nguyên, không bị tắt.";
    }

    private void showResetDialog() {
        new AlertDialog.Builder(this)
                .setTitle("Khôi phục mặc định")
                .setMessage("Đưa toàn bộ thông số quét về bộ mặc định?\n\n"
                        + "Công suất: " + DEF_POWER + " dBm\n"
                        + "Session: " + DEF_SESSION + "\n"
                        + "Q Value: " + DEF_Q_VALUE + "\n"
                        + "Chế độ quét: " + SCAN_MODE[DEF_SCANMODE] + "\n"
                        + "Nút bấm: " + TRIGGER_OPTIONS[DEF_TRIGGER] + "\n"
                        + "Vùng tần số: " + REGION_OPTIONS[DEF_REGION] + "\n"
                        + "Max Scan Time: " + DEF_MAX_SCAN_TIME + "\n"
                        + "Interval: " + DEF_INTERVAL + " ms\n"
                        + "Âm thanh: bật")
                .setPositiveButton("KHÔI PHỤC", (dialog, which) -> restoreDefaults())
                .setNegativeButton("HỦY", null)
                .show();
    }

    private void restoreDefaults() {
        SharedPreferences.Editor editor =
                getSharedPreferences("RFID_CONFIG", Context.MODE_PRIVATE).edit();

        editor.putInt("POWER", DEF_POWER);
        editor.putInt("SESSION", DEF_SESSION);
        editor.putInt("Q_VALUE", DEF_Q_VALUE);
        editor.putInt("TRIGGER", DEF_TRIGGER);
        editor.putInt("SCANMODE", DEF_SCANMODE);
        editor.putInt("REGION", DEF_REGION);
        editor.putInt("MAX_SCAN_TIME", DEF_MAX_SCAN_TIME);
        editor.putInt("INTERVAL", DEF_INTERVAL);
        editor.putInt("SOUND_ENABLED", DEF_SOUND_ENABLED);
        editor.putInt("TID_PTR", 0);
        editor.putInt("TID_LEN", 0);
        // SERVICE_ENABLED giữ nguyên: bật tắt dịch vụ là việc khác, không phải thông số quét.
        editor.apply();

        loadSavedConfig();
        notifyApplyConfig();
        Toast.makeText(this, "Đã khôi phục thông số mặc định", Toast.LENGTH_SHORT).show();
    }

    private void saveConfig(String key, int value) {
        SharedPreferences prefs = getSharedPreferences("RFID_CONFIG", Context.MODE_PRIVATE);
        prefs.edit().putInt(key, value).apply();
    }

    private void saveInventoryToDisk() {
        SharedPreferences prefs = getSharedPreferences("RFID_CONFIG", Context.MODE_PRIVATE);
        SharedPreferences.Editor editor = prefs.edit();
        try {
            editor.putInt("TID_PTR", Integer.parseInt(edtTidPtr.getText().toString()));
            editor.putInt("TID_LEN", Integer.parseInt(edtTidLen.getText().toString()));
        } catch (NumberFormatException ignored) {}
        editor.apply();
        notifyApplyConfig();
    }

    private void notifyApplyConfig() {
        Intent intent = new Intent("ACTION_APPLY_CONFIG");
        intent.setPackage(getPackageName());
        sendBroadcast(intent);
    }

    private void loadSavedConfig() {
        SharedPreferences prefs = getSharedPreferences("RFID_CONFIG", Context.MODE_PRIVATE);
        currentPower = prefs.getInt("POWER", 33);
        txtPowerSum.setText(currentPower + " dBm");
        currentTriggerIndex = prefs.getInt("TRIGGER", 0);
        txtTriggerSum.setText(TRIGGER_OPTIONS[Math.min(currentTriggerIndex, TRIGGER_OPTIONS.length-1)]);
        currentScanModeIndex = prefs.getInt("SCANMODE", 1);
        txtScanModeSummary.setText(SCAN_MODE[Math.min(currentScanModeIndex, SCAN_MODE.length-1)]);
        currentRegionIndex = prefs.getInt("REGION", 0);
        txtRegionSum.setText(REGION_OPTIONS[Math.min(currentRegionIndex, REGION_OPTIONS.length-1)]);

        spnQValue.setSelection(Math.min(prefs.getInt("Q_VALUE", 7), Q_VALUES.length - 1));
        spnSession.setSelection(Math.min(prefs.getInt("SESSION", 0), SESSION_VALUES.length - 1));
        edtTidPtr.setText(String.valueOf(prefs.getInt("TID_PTR", 0)));
        edtTidLen.setText(String.valueOf(prefs.getInt("TID_LEN", 0)));

        int savedMaxScan = prefs.getInt("MAX_SCAN_TIME", 100);
        seekMaxScanTime.setProgress(savedMaxScan);
        txtMaxScanTimeValue.setText(String.valueOf(savedMaxScan));

        int savedInterval = prefs.getInt("INTERVAL", 0);
        seekInterval.setProgress(savedInterval / 20);
        txtIntervalValue.setText(savedInterval + " ms");

        swSound.setChecked(prefs.getInt("SOUND_ENABLED", 1) == 1);

        swService.setOnCheckedChangeListener(null); 
        swService.setChecked(prefs.getInt("SERVICE_ENABLED", 0) == 1);
        setupSwitches();

    }

    private class SimpleSpinnerListener implements AdapterView.OnItemSelectedListener {
        private String key;
        public SimpleSpinnerListener(String key) { this.key = key; }
        @Override
        public void onItemSelected(AdapterView<?> parent, View view, int position, long id) {
            saveConfig(key, position);
        }
        @Override public void onNothingSelected(AdapterView<?> parent) {}
    }
}