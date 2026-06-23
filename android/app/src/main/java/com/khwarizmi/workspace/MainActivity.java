package com.khwarizmi.workspace;

import android.content.Intent;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    public static boolean isInForeground = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        handleCallIntent(getIntent());
    }

    @Override
    public void onResume() {
        super.onResume();
        isInForeground = true;
    }

    @Override
    public void onPause() {
        super.onPause();
        isInForeground = false;
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        handleCallIntent(intent);
    }

    private void handleCallIntent(Intent intent) {
        if (intent == null) return;
        String callUrl = intent.getStringExtra("call_url");
        if (callUrl == null || callUrl.isEmpty()) return;
        getBridge().getWebView().post(() ->
            getBridge().getWebView().loadUrl("https://localhost" + callUrl)
        );
    }
}
