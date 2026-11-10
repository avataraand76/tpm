package com.tina.rfidadapterapp;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Bật lại dịch vụ quét sau khi khởi động máy (nếu công tắc dịch vụ đang bật). */
public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())) {
            ScanService.start(context);
        }
    }
}
