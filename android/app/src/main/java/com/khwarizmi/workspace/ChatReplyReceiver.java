package com.khwarizmi.workspace;

import android.app.NotificationManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.app.RemoteInput;
import org.json.JSONObject;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

public class ChatReplyReceiver extends BroadcastReceiver {

    public static final String KEY_REPLY_TEXT = "key_reply_text";
    public static final String ACTION_REPLY = "com.khwarizmi.workspace.REPLY_CHAT";

    @Override
    public void onReceive(Context context, Intent intent) {
        Bundle remoteInput = RemoteInput.getResultsFromIntent(intent);
        if (remoteInput == null) return;

        CharSequence replyCharSeq = remoteInput.getCharSequence(KEY_REPLY_TEXT);
        if (replyCharSeq == null || replyCharSeq.toString().trim().isEmpty()) return;

        String message  = replyCharSeq.toString().trim();
        String roomId   = intent.getStringExtra("room_id");
        String roomName = intent.getStringExtra("room_name");
        int    notifId  = intent.getIntExtra("notif_id", 0);

        SharedPreferences prefs = context.getSharedPreferences(NativeBridge.PREFS_NAME, Context.MODE_PRIVATE);
        String userId = prefs.getString("user_id", null);

        if (userId == null || roomId == null) return;

        // Tampilkan notif "Mengirim..." sementara
        showSendingNotification(context, notifId, roomName, message, false);

        String supabaseUrl  = context.getString(R.string.supabase_url);
        String supabaseKey  = context.getString(R.string.supabase_anon_key);

        final String finalUserId   = userId;
        final String finalRoomId   = roomId;
        final String finalRoomName = roomName;

        new Thread(() -> {
            boolean success = sendReply(supabaseUrl, supabaseKey, finalUserId, finalRoomId, message);
            showSendingNotification(context, notifId, finalRoomName, message, success);
        }).start();
    }

    private boolean sendReply(String supabaseUrl, String anonKey,
                               String userId, String roomId, String message) {
        try {
            URL url = new URL(supabaseUrl + "/functions/v1/reply-chat");
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setConnectTimeout(10000);
            conn.setReadTimeout(10000);
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setRequestProperty("Authorization", "Bearer " + anonKey);
            conn.setDoOutput(true);

            JSONObject body = new JSONObject();
            body.put("user_id", userId);
            body.put("room_id", roomId);
            body.put("message", message);

            try (OutputStream os = conn.getOutputStream()) {
                os.write(body.toString().getBytes("UTF-8"));
            }

            int code = conn.getResponseCode();
            conn.disconnect();
            return code == 200 || code == 201;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    private void showSendingNotification(Context context, int notifId,
                                          String roomName, String message, boolean sent) {
        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, "chat_messages_v2")
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(roomName != null ? roomName : "Chat")
            .setContentText(sent ? "✓ " + message : "Mengirim...")
            .setAutoCancel(sent);

        try {
            NotificationManagerCompat.from(context).notify(notifId, builder.build());
        } catch (SecurityException ignored) {}
    }
}
