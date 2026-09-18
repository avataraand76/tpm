package com.UHF.scanlable.fragment;

import android.Manifest;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.Handler;
import android.os.Message;
import android.os.SystemClock;
import android.preference.PreferenceManager;
import android.util.Log;
import android.view.KeyEvent;
import android.view.LayoutInflater;
import android.view.View;
import android.view.View.OnClickListener;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.DividerItemDecoration;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.UHF.scanlable.MainActivity;
import com.UHF.scanlable.R;
import com.UHF.scanlable.Reader;
import com.UHF.scanlable.adapter.MyAdapter;
import com.UHF.scanlable.utils.ExcelUtil;
import com.UHF.scanlable.utils.SPUtils;
import com.rfid.InventoryTagMap;
import com.rfid.trans.ReadTag;
import com.rfid.trans.ReaderParameter;
import com.rfid.trans.TagCallback;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.Hashtable;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TimeZone;
import java.util.Timer;
import java.util.TimerTask;

import me.weyye.hipermission.HiPermission;
import me.weyye.hipermission.PermissionCallback;
import me.weyye.hipermission.PermissionItem;


public class ReadFragment extends Fragment implements OnClickListener {

    private static final String TAG = "LJH";

    Button scan;
    RecyclerView listView;
    TextView txNum, txTime, txtCount, txtSpeed, txtEPCorTIDTitle;
    long beginTime = 0;
    private Timer timer;
    private MyAdapter myAdapter;
    private boolean isCanceled = true;
    private static final int SCAN_INTERVAL = 1000;
    private static final int MSG_UPDATE_LISTVIEW = 0;
    private static final int MSG_UPDATE_TIME = 1;
    private static final int MSG_UPDATE_ERROR = 2;
    private static final int MSG_UPDATE_STOP = 3;
    private static boolean isReader = false;
    SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd_HH.mm.ss");

    public boolean isStopThread = false;
    public static int ErrorCount;
    public static int ErrorCRC;
    public Map<String, Integer> dtIndexMap = new LinkedHashMap<String, Integer>();
    private List<InventoryTagMap> data = new ArrayList<>();
    private Context mContext;
    private Runnable calcSpeedRunnable = null;
    private Handler calcSeepHandler = new Handler();
    private SimpleDateFormat formatter = new SimpleDateFormat("HH:mm:ss");
    private int time = 0;
    private Map<String, Long> rateMap = new Hashtable<String, Long>();


    //TODO:2023-12-26
    int asciiNum;
    //TODO:END
    //TODO:2023-12-27
    ReaderParameter readerParameter;
    //TODO:end

    @Override
    public void onAttach(Context context) {
        super.onAttach(context);
        this.mContext = context;
    }

    private Handler mHandler = new Handler() {
        @Override
        public void handleMessage(@NonNull Message msg) {
            super.handleMessage(msg);
            try {
                switch (msg.what) {
                    case MSG_UPDATE_LISTVIEW:
                        data = Reader.rrlib.getInventoryTagMapList();
                        txNum.setText(String.valueOf(myAdapter.getItemCount()));//更新读取的张数
                        myAdapter.notifyData(data, dtIndexMap);
                        break;
                    case MSG_UPDATE_TIME:
                        txTime.post(() -> {//更新时间
                            String toTime = secToTime(++time);
                            txTime.setText(toTime + " (s)");
                        });
                        long before = 0;
                        long after = 0;
                        Long afterValue = rateMap.get("after");
                        if (null != afterValue) {
                            before = afterValue;
                        }
                        long readCount = getReadCount(myAdapter.getData());
                        rateMap.put("after", readCount);
                        after = readCount;
                        if (after >= before) {//更新读取的速度
                            long rateValue = after - before;
                            txtSpeed.post(() -> txtSpeed.setText(rateValue + " (t/s)"));
                        }
                        break;
                    case MSG_UPDATE_ERROR:
                        break;
                    case MSG_UPDATE_STOP:
                        scan.setText(getString(R.string.btscan));
                        break;
                    default:
                        break;
                }
            } catch (Exception ex) {
                ex.toString();
            }
        }
    };

    final Handler handlerStop = new Handler() {
        @Override
        public void handleMessage(Message msg) {
            switch (msg.what) {
                case 1:
                    calcSeepHandler.removeCallbacks(calcSpeedRunnable);
                    break;
            }
            super.handleMessage(msg);
        }
    };

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        View view = inflater.inflate(R.layout.fragment_read, container, false);
        scan = view.findViewById(R.id.button_scan);
        scan.setOnClickListener(this);
        listView = view.findViewById(R.id.tag_real_list_view);
        data = new ArrayList<>();
        txNum = view.findViewById(R.id.tx_num);
        txTime = view.findViewById(R.id.tx_time);
        txtCount = view.findViewById(R.id.txt_errorcount);
        txtSpeed = view.findViewById(R.id.txt_speed);
        txtEPCorTIDTitle = view.findViewById(R.id.epc_text);

        LinearLayoutManager layoutManager = new LinearLayoutManager(mContext);
        layoutManager.setOrientation(LinearLayoutManager.VERTICAL);
        listView.setLayoutManager(layoutManager);
        listView.addItemDecoration(new DividerItemDecoration(mContext, 1));

        myAdapter = new MyAdapter(mContext, new ArrayList(data), dtIndexMap);
        listView.setAdapter(myAdapter);

        time = 0;
        return view;
    }

    @Override
    public void onResume() { //亮屏后的状态
        //Log.e(TAG, "onResume: start"  );
        super.onResume();
        long startTime = SystemClock.elapsedRealtime();
        isStopThread = false;
        readerParameter = Reader.rrlib.GetInventoryParameter();
        if (readerParameter.TidLen > 0) {
            txtEPCorTIDTitle.setText("TID");
            asciiNum = 0;
        } else {
            txtEPCorTIDTitle.setText("EPC");
        }
        long endTime = SystemClock.elapsedRealtime();
        Log.e("耗时3", "耗时3=" + (endTime - startTime));
    }


    @Override
    public void onClick(View arg0) {

        switch (arg0.getId()) {
            case R.id.button_scan://存盘
                int tidlen = SPUtils.getInt(mContext, "tidlen", readerParameter.TidLen);
                int tidptr = SPUtils.getInt(mContext, "tidptr", readerParameter.TidPtr);
                int qvalue = SPUtils.getInt(mContext, "qvalue", readerParameter.QValue);
                int scanTime = SPUtils.getInt(mContext, "ScanTime", readerParameter.ScanTime);
                int session = SPUtils.getInt(mContext, "session", readerParameter.Session);//单标读取用session0,多标读取用session2
                int jgTimes = SPUtils.getInt(mContext, "jgTimes", readerParameter.Interval);
                ReaderParameter param = Reader.rrlib.GetInventoryParameter();
                param.TidLen = tidlen;//根据实际TID长度进行配置。参数找标签供应商获取。
                param.TidPtr = tidptr;//根据实际TID起始地址进行配置。参数找标签供应商获取。
                param.QValue = qvalue;
                param.ScanTime = scanTime;
                param.Session = session;
                param.Interval = jgTimes;
                Reader.rrlib.SetInventoryParameter(param);
                readRfid();
                break;
        }
    }

    private void readRfid() {
        if (!isReader) {
            try {
                Log.e("TAG", "onClick: ");
                if (timer == null) {
                    if (isStopThread) return;//true
                    isStopThread = true;
                    Reader.rrlib.getInventoryTagMapList().clear();
                    Reader.rrlib.getInventoryTagResultList().clear();
                    dtIndexMap = new LinkedHashMap<String, Integer>();
                    MsgCallback callback = new MsgCallback();
                    Reader.rrlib.SetCallBack(callback);//读取标签的回调
                    ErrorCount = 0;
                    ErrorCRC = 0;

                    if (Reader.rrlib.StartRead() == 0) { //读取的数量
                        
                        isReader = true;
                        isCanceled = false;
                        rateMap = new Hashtable<String, Long>();
                        if (myAdapter != null) {
                            txNum.setText("0");//读取的张数
                            txTime.setText("0");
                            txtCount.setText("");

                            time = 0;
                            myAdapter.notifyDataSetChanged();
                            mHandler.removeMessages(MSG_UPDATE_LISTVIEW);
                            mHandler.sendEmptyMessage(MSG_UPDATE_LISTVIEW);
                        }
                        beginTime = System.currentTimeMillis();
                        timer = new Timer();
                        timer.schedule(new TimerTask() {
                            @Override
                            public void run() {
                                mHandler.removeMessages(MSG_UPDATE_TIME);
                                mHandler.sendEmptyMessage(MSG_UPDATE_TIME);
                            }
                        }, 0, SCAN_INTERVAL);
                        
                        scan.setText(getString(R.string.btstop));
                    }
                } else {
                    cancelScan();
                }
            } catch (Exception e) {
                cancelScan();
            }
        } else {
            cancelScan();
        }
    }

    // 停止存盘
    public void cancelScan() {
        Reader.rrlib.StopRead();
        isReader = false;
        if (timer != null) {
            timer.cancel();
            timer = null;
            try {
                Thread.sleep(500);//延时500ms
            } catch (InterruptedException e) {
                e.printStackTrace();
            }
            scan.setText(getString(R.string.btscan));
        }
    }

    //TODO：2025-05-06 --> 导出excel文件
    private String getStoragePath() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            // **如果用户授予 `MANAGE_EXTERNAL_STORAGE` 权限，则允许写入 `/sdcard/excel_Tags/`**
            if (Environment.isExternalStorageManager()) {
                return Environment.getExternalStorageDirectory().getAbsolutePath() + "/file_Tags";
                // 用户已授予MANAGE_EXTERNAL_STORAGE，写入公共下载目录
//                return Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS).getAbsolutePath() + "/file_Tags";
            } else {
                // 否则存储在 `Android/data/.../files/Documents`
                return getContext().getExternalFilesDir(Environment.DIRECTORY_DOCUMENTS).getAbsolutePath();
            }
        } else {
            // Android 10及以下
            return Environment.getExternalStorageDirectory().getAbsolutePath() + "/file_Tags";
        }
    }

    private static final int REQUEST_PERMISSIONS = 100;

    private boolean allPermissionsGranted() {
        String[] perms = getRequiredPermissions();
        for (String permission : perms) {
            if (ContextCompat.checkSelfPermission(getContext(), permission) != PackageManager.PERMISSION_GRANTED) {
                return false;
            }
        }
        return true;
    }

    private String[] getRequiredPermissions() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            return new String[] {
                    Manifest.permission.READ_MEDIA_IMAGES,
                    Manifest.permission.READ_MEDIA_VIDEO,
                    Manifest.permission.READ_MEDIA_AUDIO
            };
        } else {
            return new String[] {
                    Manifest.permission.READ_EXTERNAL_STORAGE,
                    Manifest.permission.WRITE_EXTERNAL_STORAGE
            };
        }
    }

    public void exportExcel() {
        if (!isReader) {
            // **删除 HiPermission**
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !allPermissionsGranted()) {
                ActivityCompat.requestPermissions(getActivity(), getRequiredPermissions(), REQUEST_PERMISSIONS);
                return;
            }

            String filePath = getStoragePath();  // ✅ 使用适配后的存储路径
            String fileName = "Tag_" + dateFormat.format(new Date()) + ".xls";
            String[] title = {"EPC"};

            if (data.size() > 0) {
                ExcelUtil.initExcel(filePath, fileName, title, getContext());
                ExcelUtil.writeObjListToExcel(getRecordData(data), filePath + "/" + fileName);
                Log.e(TAG, "exportExcel: " +  filePath + "/" + fileName);
                Toast.makeText(getContext(), "Export path: " + filePath + "/" + fileName, Toast.LENGTH_SHORT).show();
            } else {
                Toast.makeText(getContext(), "No Data!", Toast.LENGTH_SHORT).show();
            }
        } else {
            Toast.makeText(getContext(), "Please stop scanning first!", Toast.LENGTH_SHORT).show();
        }
    }

    public ArrayList<ArrayList<String>> getRecordData(List<InventoryTagMap> infos) {
        ArrayList<ArrayList<String>> recordList = new ArrayList<ArrayList<String>>();
        for (int i = 0; i < infos.size(); i++) {
            ArrayList<String> beanList = new ArrayList<String>();
            InventoryTagMap info = infos.get(i);
            beanList.add(info.strEPC != null ? info.strEPC : "");
            recordList.add(beanList);
        }
        return recordList;
    }


    public boolean onKeyDown(int keyCode, KeyEvent event) {
        Log.e("TAG", "onKeyDown: " + keyCode);
        if (keyCode == 305 || keyCode == 619 || keyCode == 621) {//修改键值,S70手柄的键值:619,N41U上的手柄按键的键值:621
            readRfid();
        }
        return true;
    }

    public class MsgCallback implements TagCallback {

        @Override
        public void tagCallback(ReadTag arg0) {
            if (arg0 != null) {
                // TODO Auto-generated method stub
                String epc = arg0.epcId.toUpperCase();
                //TODO:2023-12-27
                // 从SharedPreferences中获取编码格式，默认为0（Hex）
                SharedPreferences preferences = PreferenceManager.getDefaultSharedPreferences(mContext);
                int encodingFormat = preferences.getInt("selectedFormat",readerParameter.AsciiPtr);
                // 根据编码格式设置读取EPC的方式
                if (encodingFormat == 1 && readerParameter.TidLen == 0) {
                    // ASCII 形式
                    asciiNum = 1;
                } else {
                    // 十六进制形式
                    asciiNum = 0;
                }
                //TODO:end
                // TODO:2023-12-26--> 将epc转为ascii码
                if (asciiNum == 1){
                    epc = hexToAscii(epc);
                }
                // TODO: end
                InventoryTagMap m;
                
                Integer findIndex = dtIndexMap.get(epc);//读到的标签数量,下标从0开始计数
                Log.d(TAG, "tagCallback: findIndex -->" + findIndex);
                if (findIndex == null) {//没读到则为null
                    Reader.rrlib.beginSound(false);
                    dtIndexMap.put(epc, dtIndexMap.size());
                    m = new InventoryTagMap();
                    m.strEPC = epc;
                    m.antenna = arg0.antId;
                    m.strRSSI = String.valueOf(arg0.rssi);
                    m.nReadCount = 1;
                    Reader.rrlib.getInventoryTagMapList().add(m);
                } else {
                    Reader.rrlib.beginSound(true);
                    m = Reader.rrlib.getInventoryTagMapList().get(findIndex);
                    m.antenna |= arg0.antId;
                    m.nReadCount++;
                    m.strRSSI = String.valueOf(arg0.rssi);
                }
            } else {
                Reader.rrlib.beginSound(false);
            }
            
            mHandler.removeMessages(MSG_UPDATE_LISTVIEW);
            mHandler.sendEmptyMessage(MSG_UPDATE_LISTVIEW);
        }

        @Override
        public int CRCErrorCallBack(int reason) {
            // TODO Auto-generated method stub
            if (reason == 1) {
                ErrorCRC += 1;
            }
            ErrorCount += 1;
            mHandler.removeMessages(MSG_UPDATE_ERROR);
            mHandler.sendEmptyMessage(MSG_UPDATE_ERROR);
            return 0;
        }

        @Override
        public void FinishCallBack() {
            // TODO Auto-generated method stub
            isStopThread = false;
            mHandler.removeMessages(MSG_UPDATE_STOP);
            mHandler.sendEmptyMessage(MSG_UPDATE_STOP);
        }

        @Override
        public int tagCallbackFailed(int reason) {
            // TODO Auto-generated method stub
            return 0;
        }
    }

    @Override
    public void setUserVisibleHint(boolean isVisibleToUser) {
        super.setUserVisibleHint(isVisibleToUser);
        if (!isVisibleToUser) {
            cancelScan();
        }
    }

    @Override
    public void onPause() { //息屏后的状态
        cancelScan();
        super.onPause();
    }

    //格式化时间
    public String secToTime(long time) {
        formatter.setTimeZone(TimeZone.getTimeZone("GMT+00:00"));
        time = time * 1000;
        String hms = formatter.format(time);
        return hms;
    }

    //获取读取总次数
    private long getReadCount(List<InventoryTagMap> tagInfoList) {
        long readCount = 0;
        for (int i = 0; i < tagInfoList.size(); i++) {
            readCount += tagInfoList.get(i).nReadCount;
        }
        return readCount;
    }

    //TODO: 2023-12-26: 16进制转ASCII方法
    private static String hexToAscii(String hexStr) {
        StringBuilder output = new StringBuilder("");

        for (int i = 0; i < hexStr.length(); i += 2) {
            String str = hexStr.substring(i, i + 2);
            output.append((char) Integer.parseInt(str, 16));
        }

        return output.toString();
    }

    public int transToASCII(){
        asciiNum = 1;
        return asciiNum;
    }
    //TODO: end
}
