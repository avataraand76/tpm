package com.tina.rfidadapterapp;

import android.content.Context;
import android.util.Log;

import com.tina.rfidadapterapp.twa.TwaBridge;

import java.util.ArrayList;
import java.util.List;

/**
 * Đưa mã thẻ vào trang TPM.
 *
 * Ưu tiên kênh TWA (postMessage thẳng vào JavaScript của trang, file rfidBridge.js phía web):
 * không đụng tới cây Trợ năng nên không chậm dần khi ô nhập dài ra.
 * Khi TPM không mở qua app (mở trong Chrome thường) thì dùng Trợ năng ghi vào ô đang focus.
 */
final class WebDelivery implements TagBus.Listener {

    private final Context app;

    WebDelivery(Context ctx) {
        app = ctx.getApplicationContext();
    }

    @Override
    public void onReads(List<TagBus.Read> batch) {
        ArrayList<String> codes = new ArrayList<>(batch.size());
        for (TagBus.Read r : batch) codes.add(r.code);

        if (TwaBridge.get(app).send(codes)) return;
        KeyService ks = KeyService.get();
        if (ks != null) {
            ks.inject(codes);
        } else {
            Log.w("WebDelivery", "Không có kênh nào nhận " + codes.size() + " mã (chưa mở TPM qua app, chưa bật Trợ năng)");
        }
    }
}
