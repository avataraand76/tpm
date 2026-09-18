package com.UHF.scanlable.fragment;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.View.OnClickListener;
import android.view.ViewGroup;
import android.widget.AdapterView;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.Spinner;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;

import com.UHF.scanlable.R;
import com.UHF.scanlable.Reader;
import com.UHF.scanlable.utils.SPUtils;
import com.rfid.trans.ReaderParameter;

public class SettingFragment extends Fragment implements OnClickListener {

    private TextView tvVersion;
    private TextView tvResult;
    private Spinner tvpowerdBm;

    private Button bSetting;
    private Button bRead;

    private Button paramRead;
    private Button paramSet;
    Button btOpenrf;
    Button btCloserf;
    private int tty_speed = 57600;
    private byte addr = (byte) 0xff;
    private String[] strBand = new String[5];
    private String[] strBand1 = new String[4];
    private String[] strmaxFrm = null;
    private String[] strminFrm = null;
    private String[] strtime = new String[256];
    //TODO:2023-12-27
    Spinner spCodeFormat;
    ReaderParameter param;
    //TODO:end

    Spinner spBand;
    Spinner spmaxFrm;
    Spinner spminFrm;
    Spinner sptime;
    Spinner spqvalue;
    Spinner spsession;
    Spinner sptidaddr;
    Spinner sptidlen;

    private TextView tvTemp;
    private TextView tvLoss;
    Button btReadTemp;
    Button btReadLoss;
    private ArrayAdapter<String> spada_Band;
    private ArrayAdapter<String> spada_maxFrm;
    private ArrayAdapter<String> spada_minFrm;
    private ArrayAdapter<String> spada_time;
    private static final String TAG = "SacnView";

    private String[] strjtTime = new String[201];
    private String[] strBaudRate = new String[5];
    Spinner jgTime;
    private ArrayAdapter<String> spada_jgTime;
    private Context mContext;

    @Override
    public void onAttach(Context context) {
        super.onAttach(context);
        this.mContext = context;
    }

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        View view = inflater.inflate(R.layout.fragment_settings, container, false);

        initView(view);
        return view;
    }

    private void initView(final View view) {

        tvTemp = view.findViewById(R.id.txt_tempe);
        tvLoss = view.findViewById(R.id.txt_loss);

        btReadTemp = view.findViewById(R.id.bt_Readtemp);
        btReadLoss = view.findViewById(R.id.bt_Readloss);


        tvVersion = view.findViewById(R.id.version);
        tvResult = view.findViewById(R.id.param_result);

        tvpowerdBm = view.findViewById(R.id.power_spinner);
        ArrayAdapter<CharSequence> adapter3 = ArrayAdapter.createFromResource(mContext, R.array.Power_select, android.R.layout.simple_spinner_item);
        adapter3.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
        tvpowerdBm.setAdapter(adapter3);
        tvpowerdBm.setSelection(30, true);

        //TODO:2023-12-27
        spCodeFormat = view.findViewById(R.id.codeFormat_spinner);
        ArrayAdapter<CharSequence> adapter4 = ArrayAdapter.createFromResource(mContext, R.array.CodeFormat_select, android.R.layout.simple_spinner_item);
        adapter4.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
        spCodeFormat.setAdapter(adapter4);
        spCodeFormat.setSelection(0,true);
        //TODO:end


        bSetting = view.findViewById(R.id.pro_setting);
        bRead = view.findViewById(R.id.pro_read);
        paramRead = view.findViewById(R.id.ivt_read);
        paramSet = view.findViewById(R.id.ivt_setting);
        btOpenrf = view.findViewById(R.id.ivt_open);
        btCloserf = view.findViewById(R.id.ivt_close);

        LinearLayout ll_min = view.findViewById(R.id.ll_min);
        LinearLayout ll_max = view.findViewById(R.id.ll_max);
        int i = Reader.rrlib.GetModuleVersion();
        if (i == 1) {
            ll_max.setVisibility(View.GONE);
            ll_min.setVisibility(View.GONE);
        } else {
            ll_max.setVisibility(View.VISIBLE);
            ll_min.setVisibility(View.VISIBLE);
        }

        bSetting.setOnClickListener(this);
        bRead.setOnClickListener(this);
        paramRead.setOnClickListener(this);
        paramSet.setOnClickListener(this);
        btOpenrf.setOnClickListener(this);
        btCloserf.setOnClickListener(this);

        btReadLoss.setOnClickListener(this);
        btReadTemp.setOnClickListener(this);
        //最大询查时间
        for (int index = 0; index < 256; index++) {
            strtime[index] = String.valueOf(index) + "*100ms";
        }
        sptime = view.findViewById(R.id.time_spinner);
        spada_time = new ArrayAdapter<String>(mContext,
                android.R.layout.simple_spinner_item, strtime);
        spada_time.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
        sptime.setAdapter(spada_time);
        sptime.setSelection(20, false);

        strBand[0] = "Chinese band2";
        strBand[1] = "US band";
        strBand[2] = "Korean band";
        strBand[3] = "EU band";
        strBand[4] = "Chinese band1";

        strBand1[0] = "Chinese band2";
        strBand1[1] = "US band";
        strBand1[2] = "EU band";
        strBand1[3] = "Chinese band1";

        strBaudRate[0] = "9600bps";//波特率
        strBaudRate[1] = "19200bps";
        strBaudRate[2] = "38400bps";
        strBaudRate[3] = "57600bps";
        strBaudRate[4] = "115200bps";

        spBand = view.findViewById(R.id.band_spinner);
        if (Reader.rrlib.GetModuleVersion() == 1){
            spada_Band = new ArrayAdapter<String>(mContext,
                    android.R.layout.simple_spinner_item, strBand1);
        }else {
            spada_Band = new ArrayAdapter<String>(mContext,
                    android.R.layout.simple_spinner_item, strBand);
        }

        spada_Band.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
        spBand.setAdapter(spada_Band);
        spBand.setSelection(1, false);
        SetFre(view, 2);

        spBand.setOnItemSelectedListener(new Spinner.OnItemSelectedListener() {
            public void onItemSelected(AdapterView<?> arg0, View arg1,
                                       int arg2, long arg3) {
                // TODO Auto-generated method stub

                arg0.setVisibility(View.VISIBLE);
                if (arg2 == 0) SetFre(view, 1);
                if (arg2 == 1) SetFre(view, 2);
                if (arg2 == 2) SetFre(view, 3);
                if (arg2 == 3) SetFre(view, 4);
                if (arg2 == 4) SetFre(view, 8);

            }

            public void onNothingSelected(AdapterView<?> arg0) {
                // TODO Auto-generated method stub
            }
        });

        for (int index = 0; index < 201; index++) {
            strjtTime[index] = String.valueOf(index * 10) + "ms";
        }
        jgTime = view.findViewById(R.id.jgTime_spinner);
        spada_jgTime = new ArrayAdapter<String>(mContext,
                android.R.layout.simple_spinner_item, strjtTime);
        spada_jgTime.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
        jgTime.setAdapter(spada_jgTime);
        jgTime.setSelection(2, true);

        spqvalue = view.findViewById(R.id.qvalue_spinner);
        ArrayAdapter<CharSequence> adapter = ArrayAdapter.createFromResource(mContext, R.array.men_q, android.R.layout.simple_spinner_item);
        adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
        spqvalue.setAdapter(adapter);
        spqvalue.setSelection(4, true);


        spsession = view.findViewById(R.id.session_spinner);
        ArrayAdapter<CharSequence> adapter1;
        if (Reader.rrlib.GetModuleVersion() == 0) {
            adapter1 = ArrayAdapter.createFromResource(mContext, R.array.men_s, android.R.layout.simple_spinner_item);
        } else {
            adapter1 = ArrayAdapter.createFromResource(mContext, R.array.men_s_nation, android.R.layout.simple_spinner_item);
        }

        adapter1.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
        spsession.setAdapter(adapter1);
        spsession.setSelection(0, true);

        sptidaddr = view.findViewById(R.id.tidptr_spinner);
        sptidlen = view.findViewById(R.id.tidlen_spinner);
        ArrayAdapter<CharSequence> adapter2 = ArrayAdapter.createFromResource(mContext, R.array.men_tid, android.R.layout.simple_spinner_item);
        adapter2.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
        sptidaddr.setAdapter(adapter2);
        sptidaddr.setSelection(0, true);
        sptidlen.setAdapter(adapter2);
        sptidlen.setSelection(0, true);
    }

    @Override
    public void onClick(View view) {
        try {
            if (view == paramRead) {
                //ReaderParameter param = Reader.rrlib.GetInventoryParameter();
                param = Reader.rrlib.GetInventoryParameter();
                sptidlen.setSelection(param.TidLen, true);
                sptidaddr.setSelection(param.TidPtr, true);
                spqvalue.setSelection(param.QValue, true);
                sptime.setSelection(param.ScanTime, true);
                int sessionindex = param.Session;
                if (sessionindex == 255) sessionindex = 4;
//                else sessionindex = 0;//TODO:改变读取后的Session值
                spsession.setSelection(sessionindex, true);
                jgTime.setSelection(param.Interval / 10, true);
                //TODO:2024-06-22 --> 增加读取sp记录的询查参数值
                SharedPreferences preferencesTidLen = mContext.getSharedPreferences("myTidLen",Context.MODE_PRIVATE);
                int selectedTidLen = preferencesTidLen.getInt("selectedTidLen",param.TidLen);
                sptidlen.setSelection(selectedTidLen,true);

                SharedPreferences preferencesTidPtr = mContext.getSharedPreferences("myTidPtr",Context.MODE_PRIVATE);
                int selectedTidPtr = preferencesTidPtr.getInt("selectedTidPtr",param.TidPtr);
                sptidaddr.setSelection(selectedTidPtr,true);

                SharedPreferences preferencesQValue = mContext.getSharedPreferences("myQValue",Context.MODE_PRIVATE);
                int selectedQValue = preferencesQValue.getInt("selectedQValue",param.QValue);
                spqvalue.setSelection(selectedQValue,true);

                SharedPreferences preferencesScanTime = mContext.getSharedPreferences("myScanTime",Context.MODE_PRIVATE);
                int selectedScanTime = preferencesScanTime.getInt("selectedScanTime",param.ScanTime);
                sptime.setSelection(selectedScanTime,true);

                SharedPreferences preferencesSession = mContext.getSharedPreferences("mySession",Context.MODE_PRIVATE);
                int selectedSession = preferencesSession.getInt("selectedSession",param.Session);
                spsession.setSelection(selectedSession,true);

                SharedPreferences preferencesInterval = mContext.getSharedPreferences("myInterval",Context.MODE_PRIVATE);
                int selectedInterval = preferencesInterval.getInt("selectedInterval",param.Interval);
                jgTime.setSelection(selectedInterval,true);
                //TODO:END
                //TODO:2023-12-27 --> 增加ASCII码格式
                SharedPreferences preferences = mContext.getSharedPreferences("myCodeFormat",Context.MODE_PRIVATE);
                int selectedFormat = preferences.getInt("selectedFormat",param.AsciiPtr);
                spCodeFormat.setSelection(selectedFormat,true);
                //TODO:end
                Reader.writelog(getString(R.string.get_success), tvResult);
            } else if (view == paramSet) {
                param = Reader.rrlib.GetInventoryParameter();
                param.TidLen = sptidlen.getSelectedItemPosition();
                param.TidPtr = sptidaddr.getSelectedItemPosition();
                param.QValue = spqvalue.getSelectedItemPosition();
                param.ScanTime = sptime.getSelectedItemPosition();
                int Session = spsession.getSelectedItemPosition();

                //TODO:2024-06-22 --> 通过sp保存记录的询查参数值
                int selectedTidLen = sptidlen.getSelectedItemPosition();
                param.TidLen = selectedTidLen;
                SharedPreferences preferencesTidLen = mContext.getSharedPreferences("myTidLen",Context.MODE_PRIVATE);
                SharedPreferences.Editor editorTidLen = preferencesTidLen.edit();
                editorTidLen.putInt("selectedTidLen",param.TidLen);
                editorTidLen.apply();

                int selectedTidPtr = sptidaddr.getSelectedItemPosition();
                param.TidPtr = selectedTidPtr;
                SharedPreferences preferencesTidPtr = mContext.getSharedPreferences("myTidPtr",Context.MODE_PRIVATE);
                SharedPreferences.Editor editorTidPtr = preferencesTidPtr.edit();
                editorTidPtr.putInt("selectedTidPtr",param.TidPtr);
                editorTidPtr.apply();


                int selectedQValue = spqvalue.getSelectedItemPosition();
                param.QValue = selectedQValue;
                SharedPreferences preferencesQValue = mContext.getSharedPreferences("myQValue",Context.MODE_PRIVATE);
                SharedPreferences.Editor editorQValue = preferencesQValue.edit();
                editorQValue.putInt("selectedQValue",param.QValue);
                editorQValue.apply();

                int selectedScanTime = sptime.getSelectedItemPosition();
                param.ScanTime = selectedScanTime;
                SharedPreferences preferencesScanTime = mContext.getSharedPreferences("myScanTime",Context.MODE_PRIVATE);
                SharedPreferences.Editor editorScanTime = preferencesScanTime.edit();
                editorScanTime.putInt("selectedScanTime",param.ScanTime);
                editorScanTime.apply();

                int selectedSession = spsession.getSelectedItemPosition();
                param.Session = selectedSession;
                SharedPreferences preferencesSession = mContext.getSharedPreferences("mySession",Context.MODE_PRIVATE);
                SharedPreferences.Editor editorSession = preferencesSession.edit();
                editorSession.putInt("selectedSession",param.Session);
                editorSession.apply();

                int selectedInterval = jgTime.getSelectedItemPosition();
                param.Interval = selectedInterval;
                SharedPreferences preferencesInterval = mContext.getSharedPreferences("myInterval",Context.MODE_PRIVATE);
                SharedPreferences.Editor editorInterval = preferencesInterval.edit();
                editorInterval.putInt("selectedInterval",param.Interval);
                editorInterval.apply();
                //TODO:END

                //TODO:2023-12-27 --> 通过sp保存记录的ASCII参数值
                int selectedFormat = spCodeFormat.getSelectedItemPosition();
                param.AsciiPtr = selectedFormat;
                SharedPreferences preferences = mContext.getSharedPreferences("myCodeFormat",Context.MODE_PRIVATE);
                SharedPreferences.Editor editor = preferences.edit();
                editor.putInt("selectedFormat",param.AsciiPtr);
                editor.apply();
                //TODO:end

                if (Session == 4) Session = 255;
                param.Session = Session;

                int jgTimes = jgTime.getSelectedItemPosition();
                param.Interval = jgTimes * 10;
                Reader.rrlib.SetInventoryParameter(param);
                Reader.writelog(getString(R.string.set_success), tvResult);

                SPUtils.putInt(mContext,"tidlen",sptidlen.getSelectedItemPosition());
                SPUtils.putInt(mContext,"tidptr",sptidaddr.getSelectedItemPosition());
                SPUtils.putInt(mContext,"qvalue",spqvalue.getSelectedItemPosition());
                SPUtils.putInt(mContext,"ScanTime",sptime.getSelectedItemPosition());
                SPUtils.putInt(mContext,"session",spsession.getSelectedItemPosition());
                SPUtils.putInt(mContext,"jgTimes",jgTime.getSelectedItemPosition());

            } else if (view == bSetting) {//设置基本参数

                int MaxFre = 0;
                int MinFre = 0;
                int Power = tvpowerdBm.getSelectedItemPosition();
                int fband = spBand.getSelectedItemPosition();
                int band = 0;

                if (Reader.rrlib.GetModuleVersion() == 1){
                    if (fband == 0) band = 1;
                    if (fband == 1) band = 2;
                    if (fband == 2) band = 4;
                    if (fband == 3) band = 8;

                }else {
                    if (fband == 0) band = 1;
                    if (fband == 1) band = 2;
                    if (fband == 2) band = 3;
                    if (fband == 3) band = 4;
                    if (fband == 4) band = 8;
                }



                MinFre = spminFrm.getSelectedItemPosition();
                MaxFre = spmaxFrm.getSelectedItemPosition();
                int Antenna = 0;

                String temp = "";
                int result = Reader.rrlib.SetRfPower(Power);
                if (result != 0) {
                    temp = getString(R.string.power_error);
                }

                result = Reader.rrlib.SetRegion(band, MaxFre, MinFre);
                if (result != 0) {
                    if (temp == "")
                        temp = getString(R.string.frequent_error);
                    else
                        temp += (",\r\n" + getString(R.string.frequent_error));
                }
                if (temp != "") {
                    Reader.writelog(temp, tvResult);
                } else {
                    Reader.writelog(getString(R.string.set_success), tvResult);
                }
            } else if (view == bRead) {//读取基本参数
                byte[] Version = new byte[4];
//                byte[] Version = new byte[2];
                byte[] Power = new byte[1];
                byte[] band = new byte[1];
                byte[] MaxFre = new byte[1];
                byte[] MinFre = new byte[1];
                byte[] BeepEn = new byte[1];
                byte[] Ant = new byte[1];
                byte[] ScanTime = new byte[1];
                byte[] powermode = new byte[1];

                int result = Reader.rrlib.GetUHFInformation(Version, Power, band, MaxFre, MinFre, BeepEn, Ant);
                if (result == 0) {
                    tvpowerdBm.setSelection(Power[0], true);

                    SetFre(this.getView(), band[0]);
                    int bandindex = band[0];
                    if (Reader.rrlib.GetModuleVersion() == 1){
                        if (bandindex == 8) {
                            bandindex = 3;
                        } else if(bandindex == 4){
                            bandindex = 2;
                        }else {
                            bandindex = bandindex - 1;
                        }
                    }else {
                        if (bandindex == 8) {
                            bandindex = bandindex - 4;
                        } else {
                            bandindex = bandindex - 1;
                        }
                    }


                    spBand.setSelection(bandindex, true);
                    spminFrm.setSelection(MinFre[0], true);
                    spmaxFrm.setSelection(MaxFre[0], true);
                    //sptime.setSelection(ScanTime[0]&255,true);
                    Reader.writelog(getString(R.string.get_success), tvResult);
                } else {
                    Reader.writelog(getString(R.string.get_failed), tvResult);
                }
            } else if (view == btReadLoss) {
                byte[] returnloss = new byte[1];
                tvLoss.setText("");
                int result = Reader.rrlib.MeasureReturnLoss(returnloss);//模块的回损值
                if (result == 0) {
                    tvLoss.setText(String.valueOf(returnloss[0]));
                    Reader.writelog("测量成功", tvResult);
                } else {
                    Reader.writelog("测量失败", tvResult);
                }
            } else if (view == btOpenrf) {
                int result = Reader.rrlib.SetPowerMode((byte) 1);
                if (result == 0) {
                    Reader.writelog("打开成功", tvResult);
                } else {
                    Reader.writelog("打开失败", tvResult);
                }
            } else if (view == btCloserf) {
                int result = Reader.rrlib.SetPowerMode((byte) 0);
                if (result == 0) {
                    Reader.writelog("关闭成功", tvResult);
                } else {
                    Reader.writelog("关闭失败", tvResult);
                }
            } else if (view == btReadTemp) {
                byte[] temp = new byte[2];
                tvTemp.setText("");
                int result = Reader.rrlib.MeasureTemperature(temp);//模块RTC检测问题,不一定很准,可以忽略
                if (result == 0) {
                    if (temp[0] == 1) {
                        tvTemp.setText(String.valueOf(temp[1]) + "℃");
                    } else {
                        tvTemp.setText("-" + String.valueOf(temp[1]) + "℃");
                    }
                    Reader.writelog("测量成功", tvResult);
                } else {
                    Reader.writelog("测量失败", tvResult);
                }
            }
        } catch (Exception ex) {
            Log.e("设置异常", ex.getLocalizedMessage());
        }
    }


    private void SetFre(View view, int m) {
        if (m == 1) {
            strmaxFrm = new String[20];
            strminFrm = new String[20];
            for (int i = 0; i < 20; i++) {
                String temp = "";
                float values = (float) (920.125 + i * 0.25);
                temp = String.valueOf(values) + "MHz";
                strminFrm[i] = temp;
                strmaxFrm[i] = temp;
            }
            spmaxFrm = view.findViewById(R.id.max_spinner);
            spada_maxFrm = new ArrayAdapter<String>(mContext,
                    android.R.layout.simple_spinner_item, strmaxFrm);
            spada_maxFrm.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
            spmaxFrm.setAdapter(spada_maxFrm);
            spmaxFrm.setSelection(19, false);

            spminFrm = view.findViewById(R.id.min_spinner);
            spada_minFrm = new ArrayAdapter<String>(mContext,
                    android.R.layout.simple_spinner_item, strminFrm);
            spada_minFrm.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
            spminFrm.setAdapter(spada_minFrm);
            spminFrm.setSelection(0, false);
        } else if (m == 2) {
            strmaxFrm = new String[50];
            strminFrm = new String[50];
            for (int i = 0; i < 50; i++) {
                String temp = "";
                float values = (float) (902.75 + i * 0.5);
                temp = String.valueOf(values) + "MHz";
                strminFrm[i] = temp;
                strmaxFrm[i] = temp;
            }
            spmaxFrm = view.findViewById(R.id.max_spinner);
            spada_maxFrm = new ArrayAdapter<String>(mContext,
                    android.R.layout.simple_spinner_item, strmaxFrm);
            spada_maxFrm.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
            spmaxFrm.setAdapter(spada_maxFrm);
            spmaxFrm.setSelection(49, false);

            spminFrm = view.findViewById(R.id.min_spinner);
            spada_minFrm = new ArrayAdapter<String>(mContext,
                    android.R.layout.simple_spinner_item, strminFrm);
            spada_minFrm.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
            spminFrm.setAdapter(spada_minFrm);
            spminFrm.setSelection(0, false);
        } else if (m == 3) {
            strmaxFrm = new String[32];
            strminFrm = new String[32];
            for (int i = 0; i < 32; i++) {
                String temp = "";
                float values = (float) (917.1 + i * 0.2);
                temp = String.valueOf(values) + "MHz";
                strminFrm[i] = temp;
                strmaxFrm[i] = temp;
            }
            spmaxFrm = view.findViewById(R.id.max_spinner);
            spada_maxFrm = new ArrayAdapter<String>(mContext,
                    android.R.layout.simple_spinner_item, strmaxFrm);
            spada_maxFrm.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
            spmaxFrm.setAdapter(spada_maxFrm);
            spmaxFrm.setSelection(31, false);

            spminFrm = view.findViewById(R.id.min_spinner);
            spada_minFrm = new ArrayAdapter<String>(mContext,
                    android.R.layout.simple_spinner_item, strminFrm);
            spada_minFrm.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
            spminFrm.setAdapter(spada_minFrm);
            spminFrm.setSelection(0, false);
        } else if (m == 4) {
            strmaxFrm = new String[15];
            strminFrm = new String[15];
            for (int i = 0; i < 15; i++) {
                String temp = "";
                float values = (float) (865.1 + i * 0.2);
                temp = String.valueOf(values) + "MHz";
                strminFrm[i] = temp;
                strmaxFrm[i] = temp;
            }
            spmaxFrm = view.findViewById(R.id.max_spinner);
            spada_maxFrm = new ArrayAdapter<String>(mContext,
                    android.R.layout.simple_spinner_item, strmaxFrm);
            spada_maxFrm.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
            spmaxFrm.setAdapter(spada_maxFrm);
            spmaxFrm.setSelection(14, false);

            spminFrm = view.findViewById(R.id.min_spinner);
            spada_minFrm = new ArrayAdapter<String>(mContext,
                    android.R.layout.simple_spinner_item, strminFrm);
            spada_minFrm.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
            spminFrm.setAdapter(spada_minFrm);
            spminFrm.setSelection(0, false);
        } else if (m == 8) {
            strmaxFrm = new String[20];
            strminFrm = new String[20];
            for (int i = 0; i < 20; i++) {
                String temp = "";
                float values = (float) (840.125 + i * 0.25);
                temp = String.valueOf(values) + "MHz";
                strminFrm[i] = temp;
                strmaxFrm[i] = temp;
            }
            spmaxFrm = view.findViewById(R.id.max_spinner);
            spada_maxFrm = new ArrayAdapter<String>(mContext,
                    android.R.layout.simple_spinner_item, strmaxFrm);
            spada_maxFrm.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
            spmaxFrm.setAdapter(spada_maxFrm);
            spmaxFrm.setSelection(19, false);

            spminFrm = view.findViewById(R.id.min_spinner);
            spada_minFrm = new ArrayAdapter<String>(mContext,
                    android.R.layout.simple_spinner_item, strminFrm);
            spada_minFrm.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
            spminFrm.setAdapter(spada_minFrm);
            spminFrm.setSelection(0, false);
        }
    }
}
