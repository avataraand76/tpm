package com.UHF.scanlable;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.widget.Toolbar;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.fragment.app.Fragment;
import androidx.viewpager.widget.ViewPager;

import android.Manifest;
import android.app.AlertDialog;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.media.AudioManager;
import android.media.SoundPool;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.Settings;
import android.util.Log;
import android.view.KeyEvent;
import android.view.Menu;
import android.view.MenuItem;
import android.widget.Toast;

import com.UHF.scanlable.adapter.FragmentAdapter;
import com.UHF.scanlable.fragment.ReadFragment;
import com.UHF.scanlable.fragment.ReadWriteFragment;
import com.UHF.scanlable.fragment.SettingFragment;
import com.UHF.scanlable.utils.SPUtils;
import com.google.android.material.bottomnavigation.BottomNavigationView;
import com.lckj.lcrrgxmodule.factory.LcModule;
import com.rfid.PowerUtil;
import com.rfid.trans.ReaderParameter;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;

public class MainActivity extends BaseActivity implements Toolbar.OnMenuItemClickListener {

    private ViewPager mViewPager;
    private BottomNavigationView mBottomNavView;
    private FragmentAdapter adapter;
    private Fragment fg;

    private static final int REQUEST_PERMISSIONS = 100;
    private static final int REQUEST_CODE_MANAGE_STORAGE = 200;
    private Context mContext;
    private AlertDialog mPermissionDialog;

    private static HashMap<Integer, Integer> soundMap = new HashMap<Integer, Integer>();
    private static SoundPool soundPool;
    private static AudioManager am;
    private long exitTime = 0;
    private String comPort = "/dev/ttyS3";

    //TODO:2023-12-27
    private static final String TAG = "LJH########";
    //TODO:END

    ReaderParameter readerParameter;
    //TODO:end

    @Override
    protected void onCreate(Bundle savedInstanceState) {

        super.onCreate(savedInstanceState);
        setContentLayout(R.layout.activity_main);
        setTitle(getString(R.string.tab_scan));//设置标题
        setToolBarMenuOnclick(this);
        mViewPager = findViewById(R.id.view_pager);
        mBottomNavView = findViewById(R.id.bottom_nav_view);

        mViewPager.setOffscreenPageLimit(3);
        List<Fragment> fragments = new ArrayList<>();
        fragments.add(new ReadFragment());
        fragments.add(new ReadWriteFragment());
        fragments.add(new SettingFragment());
        adapter = new FragmentAdapter(fragments, getSupportFragmentManager());
        mViewPager.setAdapter(adapter);
        fg = adapter.getItem(0);

        mContext = getApplicationContext();
        requestPermissions();

        mBottomNavView.setOnNavigationItemSelectedListener(menuItem -> {
            int menuId = menuItem.getItemId();
            // 跳转指定页面：Fragment
            switch (menuId) {
                case R.id.tab_one:
                    setTitle(getString(R.string.tab_scan));//设置标题
                    mViewPager.setCurrentItem(0);
                    break;
                case R.id.tab_two:
                    setTitle(getString(R.string.tab_rw));
                    mViewPager.setCurrentItem(1);
                    break;
                case R.id.tab_three:
                    setTitle(getString(R.string.tab_param));
                    mViewPager.setCurrentItem(2);
                    break;
            }
            return false;
        });

        mViewPager.addOnPageChangeListener(new ViewPager.OnPageChangeListener() {
            @Override
            public void onPageScrolled(int i, float v, int i1) {

            }

            @Override
            public void onPageSelected(int i) {
                if (i == 0) {
                    setTitle(getString(R.string.tab_scan));//设置标题
                } else if (i == 1) {
                    setTitle(getString(R.string.tab_rw));
                } else if (i == 2) {
                    setTitle(getString(R.string.tab_param));
                }
                mBottomNavView.getMenu().getItem(i).setChecked(true);
                fg = adapter.getItem(i);
            }

            @Override
            public void onPageScrollStateChanged(int i) {

            }
        });
        initSound();
        initSet();
    }

    @Override
    protected void onSaveInstanceState(@NonNull Bundle outState) {
        super.onSaveInstanceState(outState);
    }

    @Override
    protected void onResume() {
        super.onResume();
    }

    @Override
    protected void onPause() {
        super.onPause();
    }

    /**
     * 初始化超高频设置参数
     */
    private void initSet() {
        int i = Reader.rrlib.GetModuleVersion();
        if (i == 1){
            /*int tidlen = SPUtils.getInt(MainActivity.this, "tidlen", 0);
            int tidptr = SPUtils.getInt(MainActivity.this, "tidptr", 0);
            int qvalue = SPUtils.getInt(MainActivity.this, "qvalue", 4);
            int scanTime = SPUtils.getInt(MainActivity.this, "ScanTime", 0);
            int session = SPUtils.getInt(MainActivity.this, "session", 0);//单标读取用session0,多标读取用session2
            int jgTimes = SPUtils.getInt(MainActivity.this, "jgTimes", 0);*/
            ReaderParameter param = Reader.rrlib.GetInventoryParameter();
            int tidlen = SPUtils.getInt(MainActivity.this, "tidlen", param.TidLen);
            int tidptr = SPUtils.getInt(MainActivity.this, "tidptr", param.TidPtr);
            int qvalue = SPUtils.getInt(MainActivity.this, "qvalue", param.QValue);
            int scanTime = SPUtils.getInt(MainActivity.this, "ScanTime", param.ScanTime);
            int session = SPUtils.getInt(MainActivity.this, "session", param.Session);//单标读取用session0,多标读取用session2
            int jgTimes = SPUtils.getInt(MainActivity.this, "jgTimes", param.Interval);

            param.QValue = qvalue;
            param.Session = session;
            param.TidLen = tidlen;
            param.TidPtr = tidptr;
            param.ScanTime = scanTime;
            int Session = session;
            if (Session == 4) Session = 255;
            param.Session = Session;
            param.Interval = jgTimes * 10;
            Reader.rrlib.SetInventoryParameter(param);
        }
    }

    private void initSound() {
        soundPool = new SoundPool(10, AudioManager.STREAM_MUSIC, 5);
        soundMap.put(1, soundPool.load(this, R.raw.barcodebeep, 1));
        am = (AudioManager) this.getSystemService(AUDIO_SERVICE);
        Reader.rrlib.setsoundid(soundMap.get(1), soundPool);
    }

    

    @Override
    public boolean onCreateOptionsMenu(Menu menu) {
        getMenuInflater().inflate(R.menu.menu, menu);
        return true;
    }

    @Override
    protected void onDestroy() {
        // TODO Auto-generated method stub
        Log.e(TAG, "onDestroy: ");
        super.onDestroy();
        Reader.rrlib.DisConnect();
        PowerUtil.power("0");//下电,关闭设备
    }

    @Override
    public boolean onMenuItemClick(MenuItem menuItem) {
        if (menuItem.getItemId() == R.id.menu_btn_export) {
            if (fg instanceof ReadFragment) {
                ((ReadFragment) fg).exportExcel();
            } else {
                Toast.makeText(this, getString(R.string.toast_export_clear), Toast.LENGTH_SHORT).show();
            }
        } 
        else if (menuItem.getItemId() == R.id.menu_btn_about) {
            Intent intent = new Intent(this, AboutActivity.class);
            startActivity(intent);
        }
        return false;
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == 4) {
            if (System.currentTimeMillis() - exitTime > 2000) {
                Toast.makeText(this, getString(R.string.toast_exit), Toast.LENGTH_SHORT).show();
                exitTime = System.currentTimeMillis();
            } else {
                finish();
                return true;
            }
        }
        if (fg instanceof ReadFragment) {
            ((ReadFragment) fg).onKeyDown(keyCode, event);
        }
        return false;
    }

    //TODO:2025-05-05 --> A13获取权限
    // 根据不同版本返回所需权限数组
    private String[] getRequiredPermissions() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) { // Android 13+
            return new String[] {
                    Manifest.permission.READ_MEDIA_IMAGES,
                    Manifest.permission.READ_MEDIA_VIDEO,
                    Manifest.permission.READ_MEDIA_AUDIO
            };
        } else {
            // Android 10 以下
            return new String[] {
                    Manifest.permission.READ_EXTERNAL_STORAGE,
                    Manifest.permission.WRITE_EXTERNAL_STORAGE
            };
        }
    }

    private boolean allPermissionsGranted() {
        String[] perms = getRequiredPermissions();
        for (String permission : perms) {
            if (ContextCompat.checkSelfPermission(this, permission) != PackageManager.PERMISSION_GRANTED) {
                return false;
            }
        }
        return true;
    }

    // 请求存储权限
    private void requestPermissions() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            // Android 11及以上，需要检查是否为“所有文件访问”权限
            if (!Environment.isExternalStorageManager()) {
                Intent intent = new Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION);
                intent.setData(Uri.parse("package:" + getPackageName()));
                startActivityForResult(intent, REQUEST_CODE_MANAGE_STORAGE);
            }
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            String[] perms = getRequiredPermissions();
            if (perms.length > 0 && !allPermissionsGranted()) {
                ActivityCompat.requestPermissions(this, perms, REQUEST_PERMISSIONS);
            }
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQUEST_PERMISSIONS) {
            if (allPermissionsGranted()) {
                Toast.makeText(this, "权限已授予", Toast.LENGTH_SHORT).show();
            } else {
                Toast.makeText(this, "权限未授予，某些功能可能无法使用", Toast.LENGTH_SHORT).show();
            }
        }
    }
    //TODO:end
}