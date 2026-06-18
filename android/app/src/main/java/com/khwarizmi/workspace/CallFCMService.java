package com.khwarizmi.workspace;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.media.RingtoneManager;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

import java.util.Map;

public class CallFCMService extends FirebaseMessagingService {

    public static final int CALL_NOTIFICATION_ID = 1001;
    private static final String CALL_CHANNEL_ID = "incoming_call_fullscreen";

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        Map<String, String> data = remoteMessage.getData();
        String type = data.get("type");
        String kind = data.get("kind");

        boolean isCall = "call".equals(type) || "call".equals(kind) || "meeting".equals(kind);

        if (isCall) {
            showFullScreenCallNotification(data);
        }
        // Non-call: biarkan FCM handle via notification block
    }

    private void showFullScreenCallNotification(Map<String, String> data) {
        String callerName = data.containsKey("callerName") ? data.get("callerName") :
                           (data.containsKey("caller_name") ? data.get("caller_name") : "Panggilan Masuk");
        String callKind = data.containsKey("kind") ? data.get("kind") : "call";
        String voiceOnly = data.containsKey("voiceOnly") ? data.get("voiceOnly") :
                          (data.containsKey("voice_only") ? data.get("voice_only") : "false");
        String url = data.containsKey("url") ? data.get("url") : "";

        NotificationManager manager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CALL_CHANNEL_ID,
                "Panggilan Masuk",
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Panggilan masuk full screen");
            channel.enableVibration(true);
            channel.setVibrationPattern(new long[]{0, 500, 500, 500});
            manager.createNotificationChannel(channel);
        }

        Intent callIntent = new Intent(this, IncomingCallActivity.class);
        callIntent.putExtra("caller_name", callerName);
        callIntent.putExtra("call_kind", callKind);
        callIntent.putExtra("voice_only", voiceOnly);
        callIntent.putExtra("url", url);
        callIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);

        // Langsung buka activity — diizinkan Android karena dipicu high-priority FCM data message
        startActivity(callIntent);

        // Tetap tampilkan notifikasi sebagai fallback (jika HP terkunci / activity gagal launch)
        PendingIntent fullScreenPendingIntent = PendingIntent.getActivity(
            this, 0, callIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        String callTypeLabel = "meeting".equals(callKind) ? "Undangan Rapat" :
                              ("true".equals(voiceOnly) ? "Panggilan Suara" : "Panggilan Video");

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CALL_CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(callTypeLabel)
            .setContentText(callerName)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setFullScreenIntent(fullScreenPendingIntent, true)
            .setContentIntent(fullScreenPendingIntent)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE))
            .setAutoCancel(false)
            .setOngoing(true);

        manager.notify(CALL_NOTIFICATION_ID, builder.build());
    }
}
