package com.tina.rfidadapterapp;

import android.content.Context;
import android.util.Log;
import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class FileLogger {
    private static final String FILE_NAME = "rfid_app_debug.txt";
    private static final String BACKUP_FILE_NAME = "rfid_app_debug_old.txt";
    private static final long MAX_FILE_SIZE = 5 * 1024 * 1024;

    private static final ExecutorService executor = Executors.newSingleThreadExecutor();

    public static void save(Context context, String message) {
        String timeStamp = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss.SSS", Locale.getDefault()).format(new Date());
        String finalMsg = timeStamp + " | " + message + "\n";

        Log.d("RFID_LIVE", message);

        executor.execute(() -> {
            try {
                File dir = context.getExternalFilesDir(null);
                if (dir != null) {
                    File file = new File(dir, FILE_NAME);

                    if (file.exists() && file.length() > MAX_FILE_SIZE) {
                        File backupFile = new File(dir, BACKUP_FILE_NAME);

                        if (backupFile.exists()) {
                            backupFile.delete();
                        }

                        boolean renamed = file.renameTo(backupFile);
                        if (renamed) {
                            file = new File(dir, FILE_NAME);

                            FileWriter fw = new FileWriter(file, true);
                            fw.append(timeStamp + " | SYSTEM: Log file rotated. Previous log moved to _old.txt\n");
                            fw.close();
                        }
                    }

                    FileWriter writer = new FileWriter(file, true);
                    writer.append(finalMsg);
                    writer.flush();
                    writer.close();
                }
            } catch (IOException e) {
                e.printStackTrace();
            }
        });
    }
}