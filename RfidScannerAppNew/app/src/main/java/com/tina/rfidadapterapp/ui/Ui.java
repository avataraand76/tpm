package com.tina.rfidadapterapp.ui;

import android.app.Activity;
import android.graphics.Color;
import android.graphics.Typeface;
import android.view.View;
import android.view.ViewGroup;
import android.widget.AdapterView;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.SeekBar;
import android.widget.Spinner;
import android.widget.TextView;

import androidx.appcompat.widget.SwitchCompat;

/** Dựng giao diện cài đặt bằng code: mỗi hàng là tiêu đề + mô tả + một điều khiển. */
final class Ui {

    interface IntSink { void accept(int v); }
    interface BoolSink { void accept(boolean v); }
    interface Label { String of(int v); }

    static final int ACCENT = Color.parseColor("#1E63D6");
    private static final int SUB = Color.parseColor("#6B7280");
    private static final int CARD = Color.WHITE;
    private static final int PAGE = Color.parseColor("#F1F3F7");

    private final Activity a;
    private final ScrollView scroll;
    private final LinearLayout page;

    Ui(Activity a) {
        this.a = a;
        scroll = new ScrollView(a);
        scroll.setBackgroundColor(PAGE);
        page = vertical();
        page.setPadding(0, 0, 0, dp(24));
        scroll.addView(page);
    }

    View root() {
        return scroll;
    }

    int dp(int v) {
        return Math.round(v * a.getResources().getDisplayMetrics().density);
    }

    LinearLayout section(String title) {
        TextView t = new TextView(a);
        t.setText(title);
        t.setTextColor(ACCENT);
        t.setTextSize(12);
        t.setTypeface(Typeface.DEFAULT_BOLD);
        t.setPadding(dp(16), dp(20), dp(16), dp(8));
        page.addView(t);
        LinearLayout box = vertical();
        box.setBackgroundColor(CARD);
        box.setPadding(dp(16), dp(4), dp(16), dp(8));
        page.addView(box);
        return box;
    }

    TextView text(LinearLayout box, String s) {
        TextView t = new TextView(a);
        t.setText(s);
        t.setTextSize(14);
        t.setTextColor(Color.parseColor("#111827"));
        t.setLineSpacing(0, 1.2f);
        t.setPadding(0, dp(10), 0, dp(6));
        box.addView(t);
        return t;
    }

    Button button(LinearLayout box, String label, View.OnClickListener l) {
        Button b = new Button(a);
        b.setText(label);
        b.setAllCaps(false);
        b.setOnClickListener(l);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT);
        lp.topMargin = dp(4);
        box.addView(b, lp);
        return b;
    }

    void switchRow(LinearLayout box, String title, String desc, boolean value, BoolSink sink) {
        LinearLayout row = new LinearLayout(a);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setPadding(0, dp(10), 0, dp(10));
        LinearLayout texts = labels(title, desc);
        row.addView(texts, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f));
        SwitchCompat sw = new SwitchCompat(a);
        sw.setChecked(value);
        sw.setOnCheckedChangeListener((b, on) -> sink.accept(on));
        row.addView(sw);
        row.setOnClickListener(v -> sw.toggle());
        box.addView(row);
        divider(box);
    }

    void spinnerRow(LinearLayout box, String title, String desc, String[] items, int selected, IntSink sink) {
        LinearLayout col = labels(title, desc);
        col.setPadding(0, dp(10), 0, dp(4));
        Spinner sp = new Spinner(a);
        ArrayAdapter<String> ad = new ArrayAdapter<>(a, android.R.layout.simple_spinner_item, items);
        ad.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
        sp.setAdapter(ad);
        sp.setSelection(Math.max(0, Math.min(items.length - 1, selected)), false);
        sp.setOnItemSelectedListener(new AdapterView.OnItemSelectedListener() {
            int last = sp.getSelectedItemPosition();

            @Override
            public void onItemSelected(AdapterView<?> parent, View view, int position, long id) {
                if (position == last) return;
                last = position;
                sink.accept(position);
            }

            @Override
            public void onNothingSelected(AdapterView<?> parent) {
            }
        });
        col.addView(sp);
        box.addView(col);
        divider(box);
    }

    void seekRow(LinearLayout box, String title, String desc, int min, int max, int value, Label label, IntSink sink) {
        LinearLayout col = labels(title, desc);
        col.setPadding(0, dp(10), 0, dp(4));
        TextView val = new TextView(a);
        val.setTextColor(ACCENT);
        val.setTypeface(Typeface.DEFAULT_BOLD);
        int start = Math.max(min, Math.min(max, value));
        val.setText(label.of(start));
        col.addView(val);
        SeekBar sb = new SeekBar(a);
        sb.setMax(max - min);
        sb.setProgress(start - min);
        sb.setOnSeekBarChangeListener(new SeekBar.OnSeekBarChangeListener() {
            @Override
            public void onProgressChanged(SeekBar s, int p, boolean fromUser) {
                val.setText(label.of(p + min));
            }

            @Override
            public void onStartTrackingTouch(SeekBar s) {
            }

            @Override
            public void onStopTrackingTouch(SeekBar s) {
                sink.accept(s.getProgress() + min);
            }
        });
        col.addView(sb);
        box.addView(col);
        divider(box);
    }

    interface TextSink { void accept(String v); }

    /** Ô nhập mã hex: tự đổi chữ hoa, chỉ nhận 0-9 A-F, lưu sau mỗi lần sửa. */
    android.widget.EditText hexRow(LinearLayout box, String title, String desc, String value, int maxLen, TextSink sink) {
        LinearLayout col = labels(title, desc);
        col.setPadding(0, dp(10), 0, dp(6));
        android.widget.EditText e = new android.widget.EditText(a);
        e.setSingleLine(true);
        e.setTypeface(Typeface.MONOSPACE);
        e.setHint("Ví dụ: E2");
        e.setInputType(android.text.InputType.TYPE_CLASS_TEXT
                | android.text.InputType.TYPE_TEXT_FLAG_CAP_CHARACTERS
                | android.text.InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS);
        e.setFilters(new android.text.InputFilter[]{
                new android.text.InputFilter.AllCaps(),
                new android.text.InputFilter.LengthFilter(maxLen),
                (src, start, end, dst, dstart, dend) -> {
                    StringBuilder ok = new StringBuilder();
                    for (int i = start; i < end; i++) {
                        char ch = Character.toUpperCase(src.charAt(i));
                        if ((ch >= '0' && ch <= '9') || (ch >= 'A' && ch <= 'F')) ok.append(ch);
                    }
                    return ok.length() == end - start ? null : ok.toString();
                }
        });
        e.setText(value);
        e.addTextChangedListener(new android.text.TextWatcher() {
            @Override public void beforeTextChanged(CharSequence s, int st, int c, int af) {}
            @Override public void onTextChanged(CharSequence s, int st, int b, int c) {}
            @Override public void afterTextChanged(android.text.Editable s) { sink.accept(s.toString()); }
        });
        col.addView(e);
        box.addView(col);
        divider(box);
        return e;
    }

    private LinearLayout labels(String title, String desc) {
        LinearLayout col = vertical();
        TextView t = new TextView(a);
        t.setText(title);
        t.setTextSize(16);
        t.setTextColor(Color.parseColor("#111827"));
        col.addView(t);
        if (desc != null) {
            TextView d = new TextView(a);
            d.setText(desc);
            d.setTextSize(13);
            d.setTextColor(SUB);
            col.addView(d);
        }
        return col;
    }

    private void divider(LinearLayout box) {
        View v = new View(a);
        v.setBackgroundColor(Color.parseColor("#E5E7EB"));
        box.addView(v, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 1));
    }

    private LinearLayout vertical() {
        LinearLayout l = new LinearLayout(a);
        l.setOrientation(LinearLayout.VERTICAL);
        return l;
    }
}
