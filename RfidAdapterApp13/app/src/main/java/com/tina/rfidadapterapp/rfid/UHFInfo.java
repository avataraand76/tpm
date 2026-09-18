package com.tina.rfidadapterapp.rfid;

public class UHFInfo {
    public int fwMajor;
    public int fwMinor;
    public int power;
    public int band;
    public int antenna;

    @Override
    public String toString() {
        return "FW " + fwMajor + "." + fwMinor +
                " | Power " + power + " dBm" +
                " | Band " + band +
                " | ANT-" + antenna;
    }
}
