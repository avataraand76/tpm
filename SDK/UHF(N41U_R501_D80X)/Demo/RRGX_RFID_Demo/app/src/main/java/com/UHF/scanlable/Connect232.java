package com.UHF.scanlable;

import android.Manifest;
import android.bld.RFIDManager;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.media.AudioManager;
import android.media.SoundPool;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.view.KeyEvent;
import android.view.View;
import android.view.View.OnClickListener;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.RadioButton;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;

import com.lckj.lcrrgxmodule.factory.LcModule;
import com.rfid.PowerUtil;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.HashMap;

public class Connect232 extends AppCompatActivity {


    private static final String TAG = "COONECTRS232";
    private static String devport = "/dev/ttyS3";//蓝畅
    private static String devport2 = "/dev/ttyS2";//蓝畅
    private static final boolean DEBUG = true;
    private TextView mConectButton, txtSerialPort;
    private RadioButton mBaud57600View, mBaud115200View;
    private int retryTimes = 3;

    private int[] baudList = {115200, 460800, 57600};
    

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON,
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        setContentView(R.layout.activity_connect232);
        PowerUtil.power("1");//上电

        txtSerialPort = (TextView) findViewById(R.id.txtSerialPort);
        mConectButton = (TextView) findViewById(R.id.textview_connect);
        mBaud57600View = (RadioButton) findViewById(R.id.baud_57600);
        mBaud115200View = (RadioButton) findViewById(R.id.baud_115200);
        mBaud115200View.setVisibility(View.GONE);
        mBaud57600View.setVisibility(View.GONE);

        try {
            Reader.rrlib = new LcModule(this).createProduct();
            txtSerialPort.setText(devport);
            retryTimes = 3;//重试3次
            ConnectPort();//自动连接
        } catch (Throwable ex) {//抛错误后,手动连接
            ex.printStackTrace();
        }

        mBaud57600View.setOnClickListener(v -> {
            Reader.rrlib = new LcModule().createProduct(0x20);//国芯
            Log.e(TAG, "onClick: Reader.rrlib gx-->" + Reader.rrlib);
        });

        mBaud115200View.setOnClickListener(v -> {
            Log.d(TAG, "onClick: --> rr ");
            Reader.rrlib = new LcModule().createProduct(0x10);//rr
            Log.e(TAG, "onClick: Reader.rrlib rr-->" + Reader.rrlib);
        });

        //连接的动作
        mConectButton.setOnClickListener(v -> {
            retryTimes = 1;//重试1次
            ConnectPort();
        });
    }

    //add by ljh --> 连接
    private void ConnectPort() {
        int result = -1;
        boolean connected = false;
        for (int i = 0; i < retryTimes && !connected; i++) {
            try {
                // 遍历所有波特率进行尝试
                for (int baud : baudList) {
                    // 先尝试devport
                    result = Reader.rrlib.Connect(devport, baud);
                    Log.d(TAG, "尝试连接端口: " + devport + ", 波特率: " + baud + ", 结果: " + result);

                    if (result == 0) {
                        Toast.makeText(getApplicationContext(),
                                getString(R.string.openport_success) + " 端口:" + devport + " 波特率:" + baud,
                                Toast.LENGTH_SHORT).show();
                        connected = true;
                        break;
                    }

                    // 如果devport失败，尝试devport2
                    result = Reader.rrlib.Connect(devport2, baud);
                    Log.d(TAG, "尝试连接端口: " + devport2 + ", 波特率: " + baud + ", 结果: " + result);

                    if (result == 0) {
                        Toast.makeText(getApplicationContext(),
                                getString(R.string.openport_success) + " 端口:" + devport2 + " 波特率:" + baud,
                                Toast.LENGTH_SHORT).show();
                        connected = true;
                        break;
                    }
                }

                if (connected) {
                    Intent intent = new Intent().setClass(Connect232.this, MainActivity.class);
                    startActivity(intent);
                    finish();
                    break;
                } else {
                    Toast.makeText(getApplicationContext(), getString(R.string.openport_failed), Toast.LENGTH_SHORT).show();
                }

            } catch (Exception e) {
                Log.e(TAG, "连接异常: ", e);
                Toast.makeText(getApplicationContext(), getString(R.string.openport_failed), Toast.LENGTH_SHORT).show();
            }

            if (!connected) {
                mBaud115200View.setVisibility(View.VISIBLE);
                mBaud57600View.setVisibility(View.VISIBLE);
            }
        }
    }

    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK) {
            finish();
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }
}
