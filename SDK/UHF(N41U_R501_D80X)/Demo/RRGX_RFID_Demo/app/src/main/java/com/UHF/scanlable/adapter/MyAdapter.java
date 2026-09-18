package com.UHF.scanlable.adapter;

import android.content.Context;
import android.graphics.Color;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.UHF.scanlable.R;
import com.rfid.InventoryTagMap;

import java.util.List;
import java.util.Map;

/**
 * Created by moxiaomo
 * on 2021/3/18
 */
public class MyAdapter extends RecyclerView.Adapter<MyAdapter.ViewHolder> {

    private Context mContext;
    private List<InventoryTagMap> mList;
    private LayoutInflater layoutInflater;
    private Map<String, Integer> dtIndexMap;
    private final int bgColor = Color.rgb(135, 206, 235);
    private Integer thisPosition = null;

    public MyAdapter(Context context, List<InventoryTagMap> list, Map<String, Integer> map) {
        mContext = context;
        mList = list;
        dtIndexMap = map;
        layoutInflater = LayoutInflater.from(mContext);
    }

    public List<InventoryTagMap> getData(){
        return mList;
    }

    public Integer getThisPosition() {
        return thisPosition;
    }

    public void setThisPosition(Integer thisPosition) {
        this.thisPosition = thisPosition;
    }

    @NonNull
    @Override
    public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int i) {
        View view = LayoutInflater.from(parent.getContext()).inflate(R.layout.list, parent, false);
        final ViewHolder holder = new ViewHolder(view);
        view.setOnClickListener(v -> {
            setThisPosition(holder.getAdapterPosition());
            notifyDataSetChanged();
        });

        return holder;
    }

    @Override
    public void onBindViewHolder(@NonNull ViewHolder holder, int position) {

        String epc = mList.get(position).strEPC;
        int findIndex = 0;
        if (dtIndexMap != null) {
            synchronized (dtIndexMap) {
                if (dtIndexMap != null && epc != null)
                    try {
                        findIndex = dtIndexMap.get(epc);
                    }catch (NullPointerException nex){
                        nex.printStackTrace();
                    }
            }
        }
        holder.tvId.setText(String.valueOf(findIndex + 1));
        holder.tvEpc.setText(epc);
        holder.tvTime.setText(String.valueOf(mList.get(position).nReadCount));
        holder.tvRssi.setText(mList.get(position).strRSSI);
        if (getThisPosition() != null && position == getThisPosition()) {
            holder.itemView.setBackgroundColor(bgColor);
        } else {
            holder.itemView.setBackgroundColor(Color.WHITE);
        }
    }

    @Override
    public int getItemCount() {
        return mList.size();
    }

    class ViewHolder extends RecyclerView.ViewHolder {
        TextView tvId;
        TextView tvEpc;
        TextView tvTime;
        TextView tvRssi;

        public ViewHolder(final View view) {
            super(view);
            tvId = view.findViewById(R.id.id_text);
            tvEpc = view.findViewById(R.id.epc_text);
            tvTime = view.findViewById(R.id.times_text);
            tvRssi = view.findViewById(R.id.rssi_text);
        }
    }

    public void notifyData(List<InventoryTagMap> poiItemList, Map<String, Integer> map) {
        if (poiItemList != null) {
            mList = poiItemList;
            dtIndexMap = map;
            notifyDataSetChanged();
        }
    }

}