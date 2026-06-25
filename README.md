# 🚀 Khwarizmi Workspace

**Platform Produktivitas Tim All-in-One** berbasis web & mobile yang dirancang untuk membantu tim mengelola tugas, absensi, komunikasi, dan kolaborasi dalam satu tempat. Dibangun dengan teknologi modern dan antarmuka yang responsif.

---

## 📑 Daftar Isi

- [Tentang Nama Khwarizmi](#tentang-nama-khwarizmi)
- [Fitur Utama](#fitur-utama)
- [Tech Stack](#tech-stack)
- [Struktur Proyek](#struktur-proyek)
- [Instalasi](#instalasi)
- [Konfigurasi Lingkungan](#konfigurasi-lingkungan)
- [Menjalankan Proyek](#menjalankan-proyek)
- [Capacitor (Aplikasi Mobile)](#capacitor-aplikasi-mobile)
- [Skrip Tersedia](#skrip-tersedia)
- [Kontribusi](#kontribusi)
- [Lisensi](#lisensi)

---

## Tentang Nama Khwarizmi

Nama **Khwarizmi** diambil dari [Muhammad ibn Musa al-Khwarizmi](https://en.wikipedia.org/wiki/Al-Khw%C4%81rizm%C5%AB), seorang matematikawan, astronom, dan geografer Persia yang hidup pada abad ke-9. Beliau dikenal sebagai bapak aljabar (kata "algoritma" berasal dari namanya). Nama ini melambangkan semangat sistematis, logis, dan inovatif yang menjadi fondasi workspace ini.

---

## Fitur Utama

### 1. Dashboard Produktivitas

- **Bento Stats Dashboard**: Visualisasi statistik tugas yang minimalis dengan indikator progres _real-time_
- **Dual View Mode**: Berpindah dengan mulus antara tampilan **Daftar** yang detail dan tampilan **Kalender** (Month-view) yang intuitif
- **Smart Calendar**: Kalender dengan mode fokus harian untuk melihat kepadatan tugas per tanggal secara jelas
- **Confetti Celebration**: Efek selebrasi otomatis saat tugas mencapai progres 100%
- **Ergonomic Design**: Antarmuka yang dioptimalkan untuk penggunaan satu tangan (Thumb-friendly UI)

### 2. Manajemen Tugas (Tasks)

- **Sub-tasks Checklist**: Kelola detail tugas lebih dalam dengan sistem checklist yang tersinkronisasi
- **Bulk Management**: Fitur seleksi massal untuk menghapus atau menyelesaikan banyak tugas sekaligus
- **Task Sharing**: Bagikan tugas ke rekan tim melalui URL yang otomatis membuka detail tugas

### 3. Sistem Absensi

- Check-in/check-out digital
- Riwayat absensi yang tersimpan di database
- Terintegrasi dengan autentikasi pengguna

### 4. Chat & Kolaborasi

- Sistem chat real-time untuk komunikasi tim
- Berbagi file dan pesan antar pengguna

### 5. Meeting Virtual

- Penjadwalan dan pengelolaan meeting
- Terintegrasi dengan sistem kalender

### 6. Notifikasi Push

- Notifikasi push menggunakan Firebase Cloud Messaging (FCM)
- Mendukung notifikasi web dan mobile (native)
- Tabel `fcm_tokens` untuk menyimpan token perangkat

### 7. Dokumentasi & Panduan

- Halaman dokumentasi internal untuk pengguna
- Panduan penggunaan fitur-fitur workspace

### 8. Admin Panel

- Panel administrasi untuk mengelola pengguna dan kontrol sistem
- Akses terbatas untuk administrator

---

## Tech Stack

| Kategori | Teknologi |
| ---------- | ---------- |
| **Framework** | [Svelte 5](https://svelte.dev/) (Runes & Snippets) |
| **Styling** | [TailwindCSS 4](https://tailwindcss.com/) |
| **Database & Auth** | [Supabase](https://supabase.com/) |
| **Push Notification** | [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging) |
| **Icons** | [Lucide Svelte](https://lucide.dev/) |
| **Effects** | [Canvas Confetti](https://www.npmjs.com/package/canvas-confetti) |
| **Notifications** | [Svelte French Toast](https://www.npmjs.com/package/svelte-french-toast) |
| **Mobile** | [Capacitor](https://capacitorjs.com/) |
| **PDF Generation** | [jsPDF](https://github.com/parallax/jsPDF) + jsPDF-Autotable |
| **Build Tool** | [Vite](https://vitejs.dev/) |
| **Language** | [TypeScript](https://www.typescriptlang.org/) |
| **PWA** | [@vite-pwa/sveltekit](https://vite-pwa-org.netlify.app/frameworks/sveltekit) |

---

## Struktur Proyek

```
khwarizmi-workspace/
├── src/
│   ├── lib/                    # Library & komponen inti
│   │   ├── components/         # Komponen UI reusable
│   │   ├── services/           # Service layer (API calls)
│   │   ├── stores/             # State management (Svelte stores)
│   │   ├── server/             # Server-side logic
│   │   ├── assets/             # Asset statis
│   │   ├── firebase.ts         # Konfigurasi Firebase
│   │   ├── supabase.ts         # Konfigurasi Supabase
│   │   └── type.ts             # TypeScript type definitions
│   ├── routes/                 # Halaman rute (SvelteKit)
│   │   ├── absensi/            # Halaman absensi
│   │   ├── admin/              # Halaman admin
│   │   ├── api/                # API endpoints
│   │   ├── auth/               # Halaman autentikasi
│   │   ├── chat/               # Halaman chat
│   │   ├── docs/               # Halaman dokumentasi
│   │   ├── meeting/            # Halaman meeting
│   │   ├── notifications/      # Halaman notifikasi
│   │   ├── panduan/            # Halaman panduan
│   │   ├── profile/            # Halaman profil pengguna
│   │   └── tasks/              # Halaman manajemen tugas
│   ├── app.d.ts                # Type declarations
│   └── app.html                # HTML template
├── android/                    # Project Android (Capacitor)
├── supabase/                   # Migrasi & konfigurasi Supabase
├── migrations/                 # Database migrations
├── static/                     # File statis (favicon, dll.)
├── .env                        # Environment variables
├── package.json                # Dependencies & scripts
├── svelte.config.js            # Konfigurasi SvelteKit
├── tsconfig.json               # Konfigurasi TypeScript
├── vite.config.ts              # Konfigurasi Vite
└── capacitor.config.ts         # Konfigurasi Capacitor
```

---

## Instalasi

### Prasyarat

- **Node.js** versi 18 atau lebih baru
- **npm** atau **bun** sebagai package manager
- **Supabase** project (gratis di [supabase.com](https://supabase.com))
- **Firebase** project (gratis di [firebase.google.com](https://firebase.google.com))
- **Android Studio** (untuk build Android)

### Langkah Instalasi

1. **Clone repositori**

   ```bash
   git clone <repository-url>
   cd khwarizmi-workspace
   ```

2. **Install dependensi**

   ```bash
   npm install
   ```

3. **Konfigurasi environment**

   Salin file `.env.example` ke `.env` dan isi dengan kredensial Anda, lalu isi variabel yang diperlukan (lihat [Konfigurasi Lingkungan](#konfigurasi-lingkungan)).

4. **Setup database**

   Jalankan migrasi SQL di folder `supabase/` melalui SQL Editor Supabase.

5. **Jalankan development server**

   ```bash
   npm run dev
   ```

---

## Konfigurasi Lingkungan

Buat file `.env` di root proyek dengan variabel berikut:

### Supabase

```env
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_ACCESS_TOKEN=your-access-token
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Firebase

```env
PUBLIC_FIREBASE_API_KEY=your-api-key
PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
PUBLIC_FIREBASE_PROJECT_ID=your-project-id
PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
PUBLIC_FIREBASE_APP_ID=your-app-id
PUBLIC_FIREBASE_MEASUREMENT_ID=your-measurement-id
PUBLIC_FIREBASE_VAPID_KEY=your-vapid-key
FIREBASE_SERVICE_ACCOUNT_JSON='your-service-account-json'
```

---

## Menjalankan Proyek

### Development

```bash
npm run dev
```

Server development akan berjalan di `http://localhost:5173` (atau port yang tersedia).

### Build untuk Produksi

```bash
npm run build
```

Hasil build tersimpan di folder `build/`.

### Preview Build

```bash
npm run preview
```

### Lint & Format

```bash
npm run lint      # Cek format kode
npm run format    # Format kode otomatis
npm run check     # Type check & svelte check
```

---

## Capacitor (Aplikasi Mobile)

Khwarizmi Workspace mendukung build ke aplikasi Android menggunakan Capacitor.

### Setup Android

1. Install **Android Studio** dan **JDK 17** atau lebih baru
2. Ambil file Firebase Android `google-services.json` dari Firebase Console
3. Letakkan file tersebut di `android/app/google-services.json`
4. Build dan sync asset web ke Android:

   ```bash
   npm run cap:sync
   ```

5. Buka project Android:

   ```bash
   npm run cap:open:android
   ```

6. Dari Android Studio, jalankan app ke emulator atau HP Android

### Push Notification

App menggunakan tabel `fcm_tokens` yang sama untuk token web dan token native. Saat berjalan di Capacitor, `notificationService.requestPermissionAndGetToken(userId)` akan memakai plugin `@capacitor/push-notifications`, menyimpan token native ke Supabase, dan membuka `data.url` saat notifikasi ditekan.

Untuk notifikasi panggilan, pastikan payload FCM membawa `type: "call"` dan `url` atau data room/caller yang sudah dibentuk oleh Edge Function `send-push`.

### Command Harian Mobile

```bash
npm run cap:sync
npm run cap:run:android
```

Jika hanya mengubah kode web, jalankan `npm run cap:sync` sebelum build/run Android agar asset terbaru masuk ke app native.

---

## Skrip Tersedia

| Skrip | Deskripsi |
| ----- | --------- |
| `npm run dev` | Jalankan development server |
| `npm run build` | Build untuk produksi |
| `npm run preview` | Preview hasil build |
| `npm run check` | Type check & svelte check |
| `npm run check:watch` | Check dengan mode watch |
| `npm run lint` | Cek format kode dengan Prettier |
| `npm run format` | Format kode otomatis |
| `npm run cap:copy` | Salin asset web ke project native |
| `npm run cap:sync` | Build + sync ke project native |
| `npm run cap:open:android` | Buka project Android di Android Studio |
| `npm run cap:run:android` | Build + run di Android |

---

## Kontribusi

1. Fork repositori ini
2. Buat branch fitur baru (`git checkout -b feature/fitur-baru`)
3. Commit perubahan (`git commit -m 'Tambah fitur baru'`)
4. Push ke branch (`git push origin feature/fitur-baru`)
5. Buat Pull Request

---

## Lisensi

Proyek ini bersifat private dan dilindungi hak cipta. Dibuat dengan ❤️ oleh **PT. AlSI Kreatif Produktif**.

---

> **Catatan**: Pastikan untuk tidak membagikan kredensial `.env` atau kunci API secara publik. File `.env` sudah termasuk dalam `.gitignore`.
