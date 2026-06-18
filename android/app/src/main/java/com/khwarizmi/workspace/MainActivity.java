package com.khwarizmi.workspace;

import android.content.Intent;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        handleCallIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        handleCallIntent(intent);
    }

    private void handleCallIntent(Intent intent) {
        if (intent == null) return;
        String callUrl = intent.getStringExtra("call_url");
        if (callUrl != null && !callUrl.isEmpty()) {
            // Navigasi WebView ke URL panggilan setelah bridge siap
            getBridge().getWebView().post(() ->
                getBridge().getWebView().loadUrl("https://localhost" + callUrl)
            );
        }
    }
}
