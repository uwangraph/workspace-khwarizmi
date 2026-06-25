package com.khwarizmi.workspace;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.PorterDuff;
import android.graphics.PorterDuffXfermode;
import android.graphics.Rect;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import androidx.core.app.RemoteInput;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

public class CallFCMService extends FirebaseMessagingService {

    public static final int CALL_NOTIFICATION_ID = 1001;
    private static final String CALL_CHANNEL_ID   = "incoming_call_ringtone_v4";
    private static final String CHAT_CHANNEL_ID   = "chat_messages_v2";

    private static final List<String> CHAT_TYPES = Arrays.asList(
        "chat_message", "chat_image", "chat_file", "chat_voice_note"
    );

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        Map<String, String> data = remoteMessage.getData();
        String type = data.get("type");
        String kind = data.get("kind");

        boolean isCall = "call".equals(type) || "call".equals(kind) || "meeting".equals(kind);
        boolean isChat = type != null && CHAT_TYPES.contains(type);

        if (isCall && !MainActivity.isInForeground) {
            showCallNotification(data);
        } else if (isChat && !MainActivity.isInForeground) {
            showChatNotification(data);
        }
    }

    // ─── Chat Notification ────────────────────────────────────────────────────

    private void showChatNotification(Map<String, String> data) {
        String title          = getOrDefault(data, "title", "Pesan Baru");
        String body           = getOrDefault(data, "message", "");
        String roomId         = getOrDefault(data, "roomId", getOrDefault(data, "room_id", ""));
        String roomName       = getOrDefault(data, "roomName", getOrDefault(data, "room_name", title));
        String senderAvatarUrl = data.get("senderAvatarUrl");
        String url            = getOrDefault(data, "url", "/chat");

        NotificationManager manager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        createChatChannel(manager);

        int notifId = roomId.isEmpty() ? (int) System.currentTimeMillis() : Math.abs(roomId.hashCode());

        // Intent: tap notif → buka app ke halaman chat
        Intent openIntent = new Intent(this, MainActivity.class);
        openIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        openIntent.putExtra("chat_url", url);
        PendingIntent openPendingIntent = PendingIntent.getActivity(
            this, notifId, openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        // RemoteInput: tombol Balas di notifikasi
        RemoteInput remoteInput = new RemoteInput.Builder(ChatReplyReceiver.KEY_REPLY_TEXT)
            .setLabel("Balas...")
            .build();

        Intent replyIntent = new Intent(this, ChatReplyReceiver.class);
        replyIntent.setAction(ChatReplyReceiver.ACTION_REPLY);
        replyIntent.putExtra("room_id", roomId);
        replyIntent.putExtra("room_name", roomName);
        replyIntent.putExtra("notif_id", notifId);
        PendingIntent replyPendingIntent = PendingIntent.getBroadcast(
            this, notifId, replyIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE
        );

        NotificationCompat.Action replyAction = new NotificationCompat.Action.Builder(
            R.drawable.ic_notification, "Balas", replyPendingIntent
        ).addRemoteInput(remoteInput).build();

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHAT_CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_MESSAGE)
            .setContentIntent(openPendingIntent)
            .addAction(replyAction)
            .setAutoCancel(true);

        // Download avatar sebagai large icon (dijalankan sinkron karena kita di service thread)
        if (senderAvatarUrl != null && !senderAvatarUrl.isEmpty()) {
            Bitmap avatar = downloadBitmap(senderAvatarUrl);
            if (avatar != null) {
                builder.setLargeIcon(toCircleBitmap(avatar));
            }
        }

        manager.notify(notifId, builder.build());
    }

    private void createChatChannel(NotificationManager manager) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHAT_CHANNEL_ID, "Pesan Chat", NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Notifikasi pesan chat masuk");
            channel.enableVibration(true);
            manager.createNotificationChannel(channel);
        }
    }

    // ─── Call Notification ────────────────────────────────────────────────────

    private void showCallNotification(Map<String, String> data) {
        String callerName = getOrDefault(data, "callerName", getOrDefault(data, "caller_name", "Panggilan Masuk"));
        String callKind   = getOrDefault(data, "kind", "call");
        String voiceOnly  = getOrDefault(data, "voiceOnly", getOrDefault(data, "voice_only", "false"));
        String url        = getOrDefault(data, "url", "");

        NotificationManager manager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        Uri ringtoneUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CALL_CHANNEL_ID, "Panggilan Masuk", NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Panggilan masuk");
            AudioAttributes audioAttrs = new AudioAttributes.Builder()
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                .build();
            channel.setSound(ringtoneUri, audioAttrs);
            channel.enableVibration(true);
            channel.setVibrationPattern(new long[]{0, 1000, 500, 1000, 500, 1000});
            manager.createNotificationChannel(channel);
        }

        Intent openIntent = new Intent(this, MainActivity.class);
        openIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        openIntent.putExtra("call_url", url);
        PendingIntent openPendingIntent = PendingIntent.getActivity(
            this, 0, openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        String callTypeLabel = "meeting".equals(callKind) ? "Undangan Rapat"
                             : ("true".equals(voiceOnly)  ? "Panggilan Suara" : "Panggilan Video");

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CALL_CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(callTypeLabel)
            .setContentText(callerName)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setFullScreenIntent(openPendingIntent, true)
            .setContentIntent(openPendingIntent)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setAutoCancel(true)
            .setOngoing(false);

        manager.notify(CALL_NOTIFICATION_ID, builder.build());
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private String getOrDefault(Map<String, String> map, String key, String def) {
        String val = map.get(key);
        return (val != null && !val.isEmpty()) ? val : def;
    }

    private Bitmap downloadBitmap(String imageUrl) {
        try {
            URL url = new URL(imageUrl);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setConnectTimeout(5000);
            conn.setReadTimeout(5000);
            conn.setDoInput(true);
            conn.connect();
            try (InputStream is = conn.getInputStream()) {
                return BitmapFactory.decodeStream(is);
            }
        } catch (Exception e) {
            return null;
        }
    }

    private Bitmap toCircleBitmap(Bitmap bitmap) {
        int size = Math.min(bitmap.getWidth(), bitmap.getHeight());
        Bitmap output = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(output);
        Paint paint = new Paint();
        paint.setAntiAlias(true);
        Rect rect = new Rect(0, 0, size, size);
        canvas.drawARGB(0, 0, 0, 0);
        canvas.drawCircle(size / 2f, size / 2f, size / 2f, paint);
        paint.setXfermode(new PorterDuffXfermode(PorterDuff.Mode.SRC_IN));
        canvas.drawBitmap(bitmap, rect, rect, paint);
        return output;
    }
}
