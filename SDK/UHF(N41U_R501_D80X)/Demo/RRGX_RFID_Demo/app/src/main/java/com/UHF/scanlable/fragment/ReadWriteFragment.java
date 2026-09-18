package com.UHF.scanlable.fragment;

import android.annotation.SuppressLint;
import android.content.Context;
import android.os.Bundle;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.View.OnClickListener;
import android.view.ViewGroup;
import android.widget.AdapterView;
import android.widget.AdapterView.OnItemSelectedListener;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.EditText;
import android.widget.Spinner;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;

import com.UHF.scanlable.R;
import com.UHF.scanlable.Reader;
import com.rfid.InventoryTagMap;
import com.rfid.Util;
import com.rfid.trans.ReaderParameter;

public class ReadWriteFragment extends Fragment implements OnClickListener, OnItemSelectedListener {

    int selectedEd = 3;

    Spinner c_mem;
    EditText c_wordPtr;
    EditText c_len;
    EditText c_pwd;
    TextView tvResult;

    EditText content;
    EditText readContent;
    Button rButton;
    Button wButton;
    Button btWriteEPC;
    private ArrayAdapter<String> spada_epc;
    Spinner spepc;
    private static final int CHECK_W_6C = 2;
    private static final int CHECK_R_6C = 3;
    private Context mContext;

    //TODO:2023-12-27
    private static final String TAG = "LJH#############";
    //TODO:END

    @Override
    public void onAttach(Context context) {
        super.onAttach(context);
        this.mContext = context;
    }

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        View view = inflater.inflate(R.layout.fragment_read_write_6c, container, false);
        initView(view);
        return view;
    }

    @Override
    public void setUserVisibleHint(boolean isVisibleToUser) {
        super.setUserVisibleHint(isVisibleToUser);
        if (isVisibleToUser) {
            Log.e("TAG", "setUserVisibleHint: 1");
            int epcCount = Reader.rrlib.getInventoryTagMapList().size();//epc数据的数量
            String[] epcdata = new String[epcCount];
            for (int m = 0; m < epcCount; m++) {
                InventoryTagMap map = Reader.rrlib.getInventoryTagMapList().get(m);
                epcdata[m] = map.strEPC;
            }
            if (epcCount > 0) {
                spada_epc = new ArrayAdapter<String>(mContext, android.R.layout.simple_spinner_item, epcdata);
                spada_epc.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
                spepc.setAdapter(spada_epc);
                spepc.setSelection(0, false);
            }
        } else {
            Log.e("TAG", "setUserVisibleHint: 2");
        }
    }

    private void initView(View view) {
        spepc = view.findViewById(R.id.epc_spinner);
        tvResult = view.findViewById(R.id.rw_result);
        c_mem = view.findViewById(R.id.mem_spinner);
        ArrayAdapter<CharSequence> adapter = ArrayAdapter.createFromResource(mContext, R.array.men_select, android.R.layout.simple_spinner_item);
        adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
        c_mem.setAdapter(adapter);
        c_mem.setSelection(3, true);
        c_mem.setOnItemSelectedListener(this);

        c_wordPtr = view.findViewById(R.id.et_wordptr);
        c_wordPtr.setText("0");
        c_len = view.findViewById(R.id.et_length);
        c_len.setText("6");
        c_pwd = view.findViewById(R.id.et_pwd);
        c_pwd.setText("00000000");
        content = view.findViewById(R.id.et_content_6c);
        readContent = view.findViewById(R.id.et_read_6c);
        rButton = view.findViewById(R.id.button_read_6c);
        wButton = view.findViewById(R.id.button_write_6c);
        btWriteEPC = view.findViewById(R.id.button_write_epc);
        rButton.setOnClickListener(this);
        wButton.setOnClickListener(this);
        btWriteEPC.setOnClickListener(this);
    }

    @SuppressLint("ResourceAsColor")
    @Override
    public void onClick(View view) {
        if (view == wButton) {//写标签
            if (!checkContent(CHECK_W_6C)) return;
            try {
                int result = 0x30;//通讯失败
                ReaderParameter param = Reader.rrlib.GetInventoryParameter();
                String str = spepc.getSelectedItem().toString();//标签ID
                byte Mem = (byte) c_mem.getSelectedItemPosition();//存储区--epc区
                byte WordPtr = (byte) (int) Integer.valueOf(c_wordPtr.getText().toString());//地址
                int WordPtr1 = Integer.valueOf(c_wordPtr.getText().toString());//地址
                byte[] Password = hexStringToBytes(c_pwd.getText().toString());//密码
                String strData = content.getText().toString();//要写的数据
                //TODO:2023-12-27
                Log.e(TAG, "onClick: write str "+ strData );
                if (param.AsciiPtr == 1){
                    str = asciiToHex(str);
                }
                Log.e(TAG, "onClick: toHex " + strData );
                //TODO:END
                if (param.TidLen == 0) {
                    Log.e(TAG, "onClick: "+ strData);
                    result = Reader.rrlib.WriteDataByEPC(str, Mem, WordPtr1, Password, strData);
                } else {
                    result = Reader.rrlib.WriteDataByTID(str, Mem, WordPtr, Password, strData);
                }
                if (result != 0) {
                    Reader.writelog(getString(R.string.write_failed), tvResult);
                } else {
                    Reader.writelog(getString(R.string.write_success), tvResult);
                    Reader.rrlib.playSound();
                }
            } catch (Exception ex) {
                Reader.writelog(getString(R.string.write_failed), tvResult);
            }

        } else if (view == rButton) { //读标签
            if (!checkContent(CHECK_R_6C)) return;
            try {
                String strData = "";
                ReaderParameter param = Reader.rrlib.GetInventoryParameter();
                String str = spepc.getSelectedItem().toString();//标签ID
                byte Mem = (byte) c_mem.getSelectedItemPosition();//存储区--epc区
                byte Num = (byte) (int) Integer.valueOf(c_len.getText().toString());//长度
                byte WordPtr = (byte) (int) Integer.valueOf(c_wordPtr.getText().toString());//地址
                int WordPtr1 = Integer.valueOf(c_wordPtr.getText().toString());//地址
                byte[] Password = hexStringToBytes(c_pwd.getText().toString());//密码
                //TODO:2023-12-27
                if (param.AsciiPtr == 1){
                    str = asciiToHex(str);
                }
                Log.e(TAG, "onClick: " + str );
                //TODO:END
                if (param.TidLen == 0) {
                    strData = Reader.rrlib.ReadDataByEPC(str, Mem, WordPtr1, Num, Password);//读出来的数据
                } else {
                    strData = Reader.rrlib.ReadDataByTID(str, Mem, WordPtr1, Num, Password);
                }
                if (strData.length() < 4) {
                    Reader.writelog(getString(R.string.get_failed) + " ErrorCode=" + strData, tvResult);
                } else {
                    readContent.setText(strData);
                    Reader.writelog(getString(R.string.get_success), tvResult);
                    Reader.rrlib.playSound();
                }
            } catch (Exception ex) {
                Reader.writelog(getString(R.string.get_failed), tvResult);
            }
        } else if (view == btWriteEPC) { //写EPC号
            if (!checkContent(CHECK_W_6C)) return;
            try {
                int result = 0x30;
                ReaderParameter param = Reader.rrlib.GetInventoryParameter();
                if (param.TidLen == 0) {
                    Reader.writelog(getString(R.string.info_select_tid), tvResult);
                    return;
                }
                String str = spepc.getSelectedItem().toString();
                byte Mem = (byte) c_mem.getSelectedItemPosition();
                byte WordPtr = (byte) (int) Integer.valueOf(c_wordPtr.getText().toString());
                byte[] Password = hexStringToBytes(c_pwd.getText().toString());
                String strData = content.getText().toString();
                //TODO:2023-12-27
                if (param.AsciiPtr == 1){
                    str = asciiToHex(str);
                }
                Log.e(TAG, "onClick: " + str );
                //TODO:END
                if (param.TidLen == 0) {
                    Reader.writelog(getString(R.string.write_failed), tvResult);
                    return;
                } else {
                    result = Reader.rrlib.WriteEPCByTID(str, strData, Password);
                }
                if (result != 0) {
                    Reader.writelog(getString(R.string.write_failed), tvResult);
                } else {
                    Reader.writelog(getString(R.string.write_success), tvResult);
                    Reader.rrlib.playSound();
                }
            } catch (Exception ex) {
                Reader.writelog(getString(R.string.write_failed), tvResult);
            }
        }
    }

    @Override
    public void onItemSelected(AdapterView<?> arg0, View arg1, int position,
                               long arg3) {
        selectedEd = position;
    }

    @Override
    public void onNothingSelected(AdapterView<?> arg0) {
        // TODO Auto-generated method stub

    }

    private boolean checkContent(int check) {
        switch (check) {
            case CHECK_W_6C:
                if (Util.isEtEmpty(content))
                    return Util.showWarning(mContext, R.string.content_empty_warning);
                if (Integer.valueOf(c_len.getText().toString()) != content.getText().toString().length() / 4)
                    return Util.showWarning(mContext, R.string.length_content_warning);
                if (!(Util.isLenLegal(content)))
                    return Util.showWarning(mContext, R.string.str_lenght_odd_warning);
                if (!(Util.isLenLegal(c_pwd)))
                    return Util.showWarning(mContext, R.string.str_lenght_odd_warning);
            case CHECK_R_6C:
                if (Util.isEtEmpty(c_wordPtr))
                    return Util.showWarning(mContext, R.string.wordptr_empty_warning);
                if (Util.isEtEmpty(c_len))
                    return Util.showWarning(mContext, R.string.length_empty_warning);
                if (Util.isEtEmpty(c_pwd))
                    return Util.showWarning(mContext, R.string.pwd_empty_warning);
                if (!(Util.isLenLegal(c_pwd)))
                    return Util.showWarning(mContext, R.string.str_lenght_odd_warning);
                break;
            default:
                break;
        }
        return true;
    }

    public byte[] hexStringToBytes(String hexString) {
        if (hexString == null || hexString.equals("")) {
            return null;
        }
        hexString = hexString.toUpperCase();
        int length = hexString.length() / 2;
        char[] hexChars = hexString.toCharArray();
        byte[] d = new byte[length];
        for (int i = 0; i < length; i++) {
            int pos = i * 2;
            d[i] = (byte) (charToByte(hexChars[pos]) << 4 | charToByte(hexChars[pos + 1]));
        }
        return d;
    }

    private byte charToByte(char c) {
        return (byte) "0123456789ABCDEF".indexOf(c);
    }

    //TODO：2023-12-27 --> ASCII转HEX
    private static String asciiToHex(String asciiStr) {
        char[] chars = asciiStr.toCharArray();
        StringBuilder hex = new StringBuilder();
        for (char ch : chars) {
            hex.append(Integer.toHexString((int) ch));
        }

        return hex.toString();
    }
    //TODO:END
}
