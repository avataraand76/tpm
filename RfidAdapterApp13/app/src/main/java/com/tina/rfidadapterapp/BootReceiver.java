package com.tina.rfidadapterapp;

import android.content.*;
import android.os.Build;
import android.util.Log;

public class BootReceiver extends BroadcastReceiver {

    @Override
    public void onReceive(Context context, Intent intent) {

        if (Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())) {

            Log.e("BOOT", "Device rebooted → starting RFID service");

            Intent serviceIntent =
                    new Intent(context, RFIDForegroundService.class);

            if (Build.VERSION.SDK_INT >= 26) {
                context.startForegroundService(serviceIntent);
            } else {
                context.startService(serviceIntent);
            }
        }
    }
}
