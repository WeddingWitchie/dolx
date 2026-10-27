package org.dol.savebackup;

import android.util.AtomicFile;
import android.util.Log;
import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaPlugin;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

public class DoLSaveBackup extends CordovaPlugin {
    private static final int COPIES = 3;
    private static final Object FILE_LOCK = new Object();

    @Override
    public boolean execute(String action, JSONArray args, CallbackContext callback) throws JSONException {
        if (!action.equals("write") && !action.equals("list") && !action.equals("read")) return false;
        cordova.getThreadPool().execute(() -> {
            synchronized (FILE_LOCK) {
                try {
                    File dir = new File(cordova.getActivity().getFilesDir(), "dol-save-backups");
                    if (!dir.isDirectory() && !dir.mkdirs()) throw new IOException("Cannot create backup directory");
                    if (action.equals("write")) {
                        write(dir, args.getString(0));
                        callback.success();
                    } else if (action.equals("read")) {
                        callback.success(new String(file(dir, args.getInt(0)).readFully(), StandardCharsets.UTF_8));
                    } else {
                        callback.success(list(dir));
                    }
                } catch (Exception ex) {
                    callback.error(ex instanceof JSONException ? "Invalid recovery save"
                            : ex.getClass().getSimpleName() + ": " + ex.getMessage());
                }
            }
        });
        return true;
    }

    private AtomicFile file(File dir, int index) {
        if (index < 0 || index >= COPIES) throw new IllegalArgumentException("Invalid backup index");
        return new AtomicFile(new File(dir, "backup-" + index + ".json"));
    }

    private JSONObject validate(String text) throws JSONException {
        JSONObject payload = new JSONObject(text);
        JSONArray delta = payload.getJSONArray("delta");
        int index = payload.getInt("index");
        if (payload.getInt("version") != 1 || payload.getString("id").isEmpty()
                || delta.length() == 0 || index < 0 || index >= delta.length()
                || payload.getLong("date") <= 0) throw new JSONException("Invalid recovery save");
        return payload;
    }

    private JSONArray list(File dir) throws IOException, JSONException {
        ArrayList<JSONObject> rows = new ArrayList<>();
        for (int i = 0; i < COPIES; i++) {
            try {
                JSONObject payload = validate(new String(file(dir, i).readFully(), StandardCharsets.UTF_8));
                JSONObject row = new JSONObject();
                for (String key : new String[] {"id", "date", "saveName", "saveId", "title", "days", "gameVersion"}) {
                    row.put(key, payload.opt(key));
                }
                row.put("index", i);
                rows.add(row);
            } catch (FileNotFoundException ex) {
                // A new installation has no backups yet.
            } catch (JSONException ex) {
                // Keep the other generations available if one file is damaged.
                Log.w("DoLSaveBackup", "Unreadable backup " + i);
            }
        }
        Collections.sort(rows, (a, b) -> Long.compare(b.optLong("date"), a.optLong("date")));
        return new JSONArray(rows);
    }

    private void write(File dir, String text) throws IOException, JSONException {
        validate(text);
        JSONArray rows = list(dir);
        int target = -1;
        for (int i = 0; i < COPIES; i++) {
            boolean present = false;
            for (int j = 0; j < rows.length(); j++) {
                if (rows.getJSONObject(j).getInt("index") == i) present = true;
            }
            if (!present) { target = i; break; }
        }
        if (target < 0) target = rows.getJSONObject(rows.length() - 1).getInt("index");
        AtomicFile destination = file(dir, target);
        FileOutputStream stream = null;
        try {
            stream = destination.startWrite();
            stream.write(text.getBytes(StandardCharsets.UTF_8));
            destination.finishWrite(stream);
        } catch (IOException ex) {
            if (stream != null) destination.failWrite(stream);
            throw ex;
        }
    }
}
