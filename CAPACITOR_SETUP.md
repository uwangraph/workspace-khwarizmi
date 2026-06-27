# Capacitor Setup

## Android

1. Install Android Studio dan JDK 17 atau lebih baru.
2. Ambil file Firebase Android `google-services.json` dari Firebase Console.
3. Letakkan file itu di:

   ```text
   android/app/google-services.json
   ```

4. Build dan sync asset web ke Android:

   ```bash
   npm run cap:sync
   ```

5. Buka project Android:

   ```bash
   npm run cap:open:android
   ```

6. Dari Android Studio, jalankan app ke emulator atau HP Android.

## Push Notification

App memakai tabel `fcm_tokens` yang sama untuk token web dan token native. Saat berjalan di Capacitor, `notificationService.requestPermissionAndGetToken(userId)` akan memakai plugin `@capacitor/push-notifications`, menyimpan token native ke Supabase, dan membuka `data.url` saat notifikasi ditekan.

Untuk notifikasi panggilan, pastikan payload FCM membawa `type: "call"` dan `url` atau data room/caller yang sudah dibentuk oleh Edge Function `send-push`.

## Command Harian

```bash
npm run cap:sync
npm run cap:run:android
```

Jika hanya mengubah kode web, jalankan `npm run cap:sync` sebelum build/run Android agar asset terbaru masuk ke app native.
