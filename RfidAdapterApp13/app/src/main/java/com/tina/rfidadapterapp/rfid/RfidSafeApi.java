package com.tina.rfidadapterapp.rfid;

import android.util.Log;
import com.uhf.lcrrgxmodule.factory.ILcUhfProduct;

public final class RfidSafeApi {

    private static final String TAG = "RFID_SAFE";

    private RfidSafeApi() {} // utility class

    // ==============================
    // SAFE WRAPPER: GetUHFInformation
    // ==============================
    public static UHFInfo safeGetUHFInfo(ILcUhfProduct rlib) {
        if (rlib == null) return null;

        try {
            // ⚠️ SDK BUG → buffer phải dư
            byte[] version = new byte[4];
            byte[] power   = new byte[2];
            byte[] band    = new byte[2];
            byte[] maxFre  = new byte[2];
            byte[] minFre  = new byte[2];
            byte[] beep    = new byte[2];
            byte[] ant     = new byte[2];

            int ret = rlib.GetUHFInformation(
                    version, power, band, maxFre, minFre, beep, ant);

            if (ret != 0) {
                Log.e(TAG, "GetUHFInformation failed, code=" + ret);
                return null;
            }

            // Parse kết quả an toàn
            UHFInfo info = new UHFInfo();
            info.fwMajor = version[0] & 0xFF;
            info.fwMinor = version[1] & 0xFF;
            info.power   = power[0] & 0xFF;
            info.band    = band[0] & 0xFF;
            info.antenna = ant[0] & 0xFF;

            return info;

        } catch (Throwable t) { // ⚠️ bắt cả Error từ SDK
            Log.e(TAG, "SDK crashed in GetUHFInformation", t);
            return null;
        }
    }
}
