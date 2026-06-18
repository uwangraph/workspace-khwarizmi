package com.khwarizmi.workspace;

import android.app.Activity;
import android.app.NotificationManager;
import android.content.Intent;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.WindowManager;
import android.widget.ImageButton;
import android.widget.TextView;

public class IncomingCallActivity extends Activity {

    private MediaPlayer ringtonePlayer;
    private String callUrl;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Tampil di atas lock screen dan nyalakan layar
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                setInheritShowWhenLocked(true);
            }
        } else {
            getWindow().addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON |
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON |
                WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD
            );
        }

        setContentView(R.layout.activity_incoming_call);

        String callerName = getIntent().getStringExtra("caller_name");
        String callKind = getIntent().getStringExtra("call_kind");
        callUrl = getIntent().getStringExtra("url");

        TextView callerNameView = findViewById(R.id.caller_name);
        TextView callTypeView = findViewById(R.id.call_type_label);

        if (callerName != null) callerNameView.setText(callerName);
        if ("meeting".equals(callKind)) {
            callTypeView.setText("Undangan Rapat");
        } else if ("true".equals(getIntent().getStringExtra("voice_only"))) {
            callTypeView.setText("Panggilan Suara");
        } else {
            callTypeView.setText("Panggilan Video");
        }

        playRingtone();

        ImageButton btnAnswer = findViewById(R.id.btn_answer);
        ImageButton btnDecline = findViewById(R.id.btn_decline);

        btnAnswer.setOnClickListener(v -> {
            stopRingtone();
            cancelNotification();
            Intent intent = new Intent(this, MainActivity.class);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
            // Tambah auto_accept=1 agar app langsung join call tanpa konfirmasi ulang
            String autoAcceptUrl = callUrl != null
                ? (callUrl.contains("?") ? callUrl + "&auto_accept=1" : callUrl + "?auto_accept=1")
                : null;
            if (autoAcceptUrl != null) intent.putExtra("call_url", autoAcceptUrl);
            startActivity(intent);
            finish();
        });

        btnDecline.setOnClickListener(v -> {
            stopRingtone();
            cancelNotification();
            finish();
        });
    }

    private void playRingtone() {
        try {
            Uri ringtoneUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
            ringtonePlayer = new MediaPlayer();
            ringtonePlayer.setDataSource(this, ringtoneUri);
            ringtonePlayer.setAudioStreamType(AudioManager.STREAM_RING);
            ringtonePlayer.setLooping(true);
            ringtonePlayer.prepare();
            ringtonePlayer.start();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void stopRingtone() {
        if (ringtonePlayer != null) {
            try {
                ringtonePlayer.stop();
                ringtonePlayer.release();
            } catch (Exception ignored) {}
            ringtonePlayer = null;
        }
    }

    private void cancelNotification() {
        NotificationManager manager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        manager.cancel(CallFCMService.CALL_NOTIFICATION_ID);
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        stopRingtone();
    }
}
