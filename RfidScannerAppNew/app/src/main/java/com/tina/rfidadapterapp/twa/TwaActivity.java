package com.tina.rfidadapterapp.twa;

import android.app.Activity;
import android.os.Bundle;

import com.tina.rfidadapterapp.ScanService;

/**
 * Icon "TPM" ngoài màn hình chính: bật dịch vụ quét rồi mở trang TPM dạng TWA.
 * Activity này trong suốt, chỉ làm bàn đạp; quay lại từ TPM thì nó tự đóng.
 */
public class TwaActivity extends Activity {

    private boolean launched;

    void markLaunched() {
        launched = true;
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (savedInstanceState != null) {
            finish();
            return;
        }
        ScanService.start(this);
        TwaBridge.get(this).launch(this);
    }

    @Override
    protected void onRestart() {
        super.onRestart();
        if (launched) finish();
    }

    @Override
    protected void onDestroy() {
        TwaBridge.get(this).onActivityDestroyed(this);
        super.onDestroy();
    }
}
