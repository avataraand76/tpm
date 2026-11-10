package com.tina.rfidadapterapp.reader;

import android.os.SystemClock;
import android.util.Log;

import com.rfid.PowerUtil;
import com.rfid.trans.ReadTag;
import com.rfid.trans.ReaderParameter;
import com.rfid.trans.TagCallback;
import com.tina.rfidadapterapp.Config;
import com.uhf.lcrrgxmodule.factory.ILcUhfProduct;
import com.uhf.lcrrgxmodule.factory.LcModule;

import java.io.FileWriter;

/**
 * Lớp bọc quanh SDK của hãng (lcrrgxmodule). Mọi lời gọi xuống module đi qua đây.
 *
 * Vòng quét dùng đúng StartRead()/StopRead() của SDK: SDK tự chạy luồng gọi lệnh
 * Inventory_G2 liên tục với Q / Session / TID / ScanTime đã đặt, tự đảo target A/B
 * khi Session > 1 và 7 vòng liền không thấy thẻ, nghỉ Interval ms giữa hai vòng,
 * và trả từng thẻ về {@link #tagCallback(ReadTag)} trên luồng của SDK.
 *
 * Các hàm connect/applyConfig/start chặn luồng, phải gọi từ luồng nền.
 */
public final class UhfReader implements TagCallback {

    public interface Listener {
        /** Gọi trên luồng của SDK, phải xử lý thật nhanh. */
        void onTag(String data, int rssi);

        /** SDK đã thoát hẳn vòng quét sau StopRead(). */
        void onInventoryFinished();
    }

    private static final String TAG = "UhfReader";
    /** Mã module RR trong SDK (LcModule.createProduct(0x10) trả về RfidUhfProduct). */
    private static final int PRODUCT_RR = 0x10;
    private static final String[] PORTS = {"/dev/ttyS3", "/dev/ttyS2"};
    private static final int BAUD = 115200;
    private static final String[] POWER_PATHS = {
            "/proc/gpiocontrol/set_uhf",
            "/sys/class/pw_control/usb_uhf/enable",
            "/sys/class/misc/pw-ctl/pw_uhf",
            "/sys/devices/platform/pwr_ctrl/pwr_en"
    };

    private ILcUhfProduct rr;
    private volatile boolean connected;
    private volatile Listener listener;
    private volatile boolean tidMode;
    private String lastError = "";

    public void setListener(Listener l) {
        listener = l;
    }

    public boolean isConnected() {
        return connected;
    }

    public String lastError() {
        return lastError;
    }

    public synchronized boolean connect() {
        if (connected) return true;
        powerOn();
        SystemClock.sleep(1200);
        try {
            if (rr == null) rr = new LcModule().createProduct(PRODUCT_RR);
        } catch (Throwable t) {
            lastError = "Không khởi tạo được SDK: " + t;
            Log.e(TAG, lastError, t);
            return false;
        }
        if (rr == null) {
            lastError = "SDK không nhận ra module UHF";
            return false;
        }
        for (String port : PORTS) {
            int ret;
            try {
                ret = rr.Connect(port, BAUD);
            } catch (Throwable t) {
                ret = -1;
                Log.w(TAG, "Connect " + port + " lỗi: " + t);
            }
            if (ret == 0) {
                rr.SetCallBack(this);
                connected = true;
                lastError = "";
                Log.i(TAG, "Đã kết nối module qua " + port);
                return true;
            }
            try { rr.DisConnect(); } catch (Throwable ignored) {}
            lastError = "Không kết nối được cổng " + port + " (mã " + ret + ")";
            Log.w(TAG, lastError);
        }
        return false;
    }

    public synchronized void disconnect() {
        if (rr == null) return;
        try { rr.StopRead(); } catch (Throwable ignored) {}
        try { rr.DisConnect(); } catch (Throwable ignored) {}
        connected = false;
    }

    /** Ghi cấu hình xuống module. Trả về mô tả ngắn kết quả để ghi log. */
    public synchronized String applyConfig(Config c) {
        if (!connected) return "chưa kết nối";
        StringBuilder sb = new StringBuilder();
        sb.append("power=").append(c.power).append('(').append(safe(() -> rr.SetRfPower(c.power))).append(')');
        int[] reg = c.regionParams();
        sb.append(" region=").append(reg[0]).append(':').append(reg[2]).append("..").append(reg[1])
                .append('(').append(safe(() -> rr.SetRegion(reg[0], reg[1], reg[2]))).append(')');
        // Tắt còi trên module: app tự phát tiếng beep theo công tắc "Âm báo".
        sb.append(" beepOff(").append(safe(() -> rr.SetBeepNotification(0))).append(')');

        ReaderParameter p = rr.GetInventoryParameter();
        if (p == null) {
            p = new ReaderParameter();
            p.ComAddr = (byte) 0xFF;
        }
        p.QValue = c.q;
        p.Session = c.sdkSession();
        p.TidPtr = c.tidPtr;
        p.TidLen = c.tidLen;
        p.ScanTime = c.scanTime;
        p.Interval = c.interval;
        rr.SetInventoryParameter(p);
        tidMode = c.readsTid();
        sb.append(" Q=").append(c.q).append(" S=").append(p.Session)
                .append(" tid=").append(c.tidPtr).append('/').append(c.tidLen)
                .append(" scanTime=").append(c.scanTime * 100).append("ms interval=").append(c.interval).append("ms");
        return sb.toString();
    }

    /** @return 0 nếu đã bắt đầu, khác 0 nếu vòng quét trước của SDK chưa thoát hẳn. */
    public synchronized int start() {
        if (!connected) return -1;
        try {
            return rr.StartRead();
        } catch (Throwable t) {
            Log.e(TAG, "StartRead lỗi", t);
            return -1;
        }
    }

    /** Chỉ bật cờ dừng. SDK thoát sau khi vòng inventory hiện tại (tối đa ScanTime) kết thúc. */
    public void stop() {
        ILcUhfProduct r = rr;
        if (r == null) return;
        try { r.StopRead(); } catch (Throwable ignored) {}
    }

    /**
     * Nhiệt độ module UHF (khối phát RF nối với anten), °C.
     * Module trả 2 byte: [0] dấu (0 = âm), [1] độ lớn. Không gọi khi đang quét:
     * luồng quét của SDK đang dùng cổng serial, hai lệnh chen nhau sẽ hỏng khung dữ liệu.
     * @return null nếu đo không được.
     */
    public synchronized Integer measureTemperature() {
        if (!connected) return null;
        byte[] t = new byte[2];
        int r;
        try {
            r = rr.MeasureTemperature(t);
        } catch (Throwable e) {
            return null;
        }
        if (r != 0) return null;
        int v = t[1] & 0xFF;
        return t[0] == 0 ? -v : v;
    }

    public boolean isTidMode() {
        return tidMode;
    }

    @Override
    public void tagCallback(ReadTag tag) {
        Listener l = listener;
        if (l == null || tag == null || tag.epcId == null) return;
        l.onTag(tag.epcId, tag.rssi);
    }

    @Override
    public int tagCallbackFailed(int reason) {
        return 0;
    }

    @Override
    public int CRCErrorCallBack(int reason) {
        return 0;
    }

    @Override
    public void FinishCallBack() {
        Listener l = listener;
        if (l != null) l.onInventoryFinished();
    }

    private static void powerOn() {
        for (String path : POWER_PATHS) {
            try (FileWriter fw = new FileWriter(path)) {
                fw.append("1");
            } catch (Exception ignored) {
            }
        }
        try {
            PowerUtil.power("1");
        } catch (Throwable ignored) {
        }
    }

    private interface IntCall {
        int call();
    }

    private static int safe(IntCall c) {
        try {
            return c.call();
        } catch (Throwable t) {
            return -1;
        }
    }
}
