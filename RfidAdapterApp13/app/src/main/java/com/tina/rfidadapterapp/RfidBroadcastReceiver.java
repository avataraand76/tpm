package com.tina.rfidadapterapp;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

public class RfidBroadcastReceiver extends BroadcastReceiver {

    public static final String ACTION_EPC_RECEIVED =
            "com.tina.rfidadapterapp.EPC_RECEIVED";

    public static final String EXTRA_EPC = "epc";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (ACTION_EPC_RECEIVED.equals(intent.getAction())) {
            String epc = intent.getStringExtra(EXTRA_EPC);

            if (epc != null && !epc.isEmpty()) {
                Log.d("RFID", "EPC nhận được: " + epc);

                Intent uiIntent = new Intent("RFID_UI_UPDATE");
                uiIntent.putExtra("epc", epc);
                context.sendBroadcast(uiIntent);
            }
        }
    }
}
