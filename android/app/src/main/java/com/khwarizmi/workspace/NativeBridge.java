package com.khwarizmi.workspace;

import android.content.Context;
import android.content.SharedPreferences;
import android.webkit.JavascriptInterface;

public class NativeBridge {
    static final String PREFS_NAME = "KhwarizmiPrefs";
    private final Context context;

    public NativeBridge(Context context) {
        this.context = context;
    }

    @JavascriptInterface
    public void setPreference(String key, String value) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
               .edit().putString(key, value).apply();
    }

    @JavascriptInterface
    public String getPreference(String key) {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                      .getString(key, null);
    }
}
