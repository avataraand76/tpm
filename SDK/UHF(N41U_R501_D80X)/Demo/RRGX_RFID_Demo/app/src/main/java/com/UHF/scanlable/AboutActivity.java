package com.UHF.scanlable;


import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.widget.ImageView;
import android.widget.TextView;

import java.text.SimpleDateFormat;
import java.util.Date;

public class AboutActivity extends BaseActivity {

    private ImageView mBtnBack, mBtnAbout;

    private SimpleDateFormat formatter = new SimpleDateFormat("yyyyMMdd");

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate (savedInstanceState);
        setContentLayout (R.layout.activity_about);
        setTitle (getString (R.string.app_set_about));//设置标题
        setBackArrow ();//设置返回按钮和点击事件

        TextView txt_version = findViewById (R.id.txt_version);
        Date currentTime = new Date();
        String dateString = formatter.format(currentTime);
        txt_version.setText ("UHF2_1.1.1_"+dateString+"_beta");
        txt_version.setText ("UHF2_0.11_20241028_release");
    }

    public static void toSelfSetting(Context context) {

        Intent mIntent=new Intent ();
        mIntent.addFlags (Intent.FLAG_ACTIVITY_NEW_TASK);
        if (Build.VERSION.SDK_INT >= 9) {
            mIntent.setAction ("android.settings.APPLICATION_DETAILS_SETTINGS");
            mIntent.setData (Uri.fromParts ("package", context.getPackageName (), null));
        } else if (Build.VERSION.SDK_INT <= 8) {
            mIntent.setAction (Intent.ACTION_VIEW);
            mIntent.setClassName ("com.android.settings", "com.android.setting.InstalledAppDetails");
            mIntent.putExtra ("com.android.settings.ApplicationPkgName", context.getPackageName ());
        }
        context.startActivity (mIntent);

    }
}
