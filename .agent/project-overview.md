# 📋 Project Overview — Workspace Khwarizmi

> Dokumen ini berisi pemahaman lengkap tentang arsitektur, komponen, service, API, database, dan seluruh aspek teknis proyek. Digunakan sebagai referensi utama untuk pengembangan dan testing.

---

## 🧩 Identitas Proyek

| Field | Value |
|---|---|
| **Nama** | Workspace Khwarizmi |
| **Deskripsi** | Platform Manajemen Kerja (Presensi + Task Tracker + Chat) |
| **Target** | Mobile-first web app (max-w-xl, seperti native app) |
| **Framework** | SvelteKit 2 + Svelte 5 Runes |
| **Backend** | Supabase (PostgreSQL + Auth + Storage + Edge Functions) |
| **Styling** | TailwindCSS v4 |
| **Icons** | Lucide Svelte |
| **Runtime** | Bun + Vite |
| **Adapter** | `@sveltejs/adapter-static` (pure SPA, `ssr = false`) |
| **PWA** | Ya, dengan `vite-plugin-pwa` |
| **Push Notification** | Firebase Cloud Messaging (FCM) |
| **Owner** | PT. Alkhwarizmi Kreatif Produktif |

---

## 🏗️ Arsitektur Aplikasi

### Pola: Service-Oriented Architecture (SOA)

```
┌─────────────────────────────────────────────────────┐
│                   UI Layer (.svelte)                 │
│  Hanya menangani tampilan, event, dan state lokal   │
└──────────────────────┬──────────────────────────────┘
                       │ Panggilan via service
                       ▼
┌─────────────────────────────────────────────────────┐
│              Service Layer (src/lib/services/)       │
│  Semua operasi data ke Supabase dikelola di sini    │
│  ┌─────────────┐ ┌──────────────┐ ┌──────────────┐ │
│  │authService  │ │taskService   │ │adminService  │ │
│  │attendanceSvc│ │notifService  │ │chatService   │ │
│  │locationSvc  │ │              │ │              │ │
│  └──────┬──────┘ └──────┬───────┘ └──────┬───────┘ │
└─────────┼───────────────┼────────────────┼──────────┘
          │               │                │
          ▼               ▼                ▼
┌─────────────────────────────────────────────────────┐
│              Supabase Client (src/lib/supabase.ts)   │
│         createClient(SUPABASE_URL, ANON_KEY)         │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│                   Supabase Backend                   │
│  PostgreSQL + Auth + Storage + RPC + Realtime        │
└─────────────────────────────────────────────────────┘
```

**Aturan Utama:**
- ❌ **DILARANG** memanggil `supabase.from()` langsung dari komponen `.svelte`
- ✅ Semua akses data **HARUS** melalui service layer
- ✅ Payload harus dibersihkan dari `undefined` sebelum insert/update

---

## 📁 Struktur Direktori Lengkap

```
src/
├── app.d.ts                    → TypeScript declarations
├── app.html                    → HTML template utama
├── lib/
│   ├── supabase.ts             → Supabase client (anon key)
│   ├── firebase.ts             → Firebase initialization (FCM, Analytics)
│   ├── index.ts                → Barrel exports
│   ├── type.ts                 → Semua TypeScript interfaces/types
│   ├── server/
│   │   ├── supabase.ts         → Supabase admin client (service role key)
│   │   ├── auth.ts             → Server-side auth helpers
│   │   └── rateLimiter.ts      → In-memory rate limiter
│   ├── services/
│   │   ├── authService.ts      → Auth & profil operasi
│   │   ├── taskService.ts      → CRUD tugas, assignment, comment, attachment
│   │   ├── attendanceService.ts → Clock-in/out, izin, auto-checkout
│   │   ├── adminService.ts     → Admin-only operasi
│   │   ├── notificationService.ts → Notifikasi + FCM push
│   │   ├── chatService.ts      → Chat realtime, media, polling
│   │   └── locationService.ts  → GPS & haversine distance
│   ├── stores/
│   │   ├── globalChatStore.ts  → Global chat rooms & unread
│   │   ├── notificationStore.ts → Unread notification count
│   │   └── chatReadStore.ts    → Read room IDs tracking
│   ├── components/
│   │   ├── BottomNav.svelte    → Navigasi bawah
│   │   ├── shared/             → Komponen umum (header, loading, empty, pagination, confirm)
│   │   ├── dashboard/          → HeroCard, AttendanceSummary, TaskSummary, NotifPreview, TopPerformers
│   │   ├── absensi/            → AttendanceBanner, SessionCard, CameraModal, LateReasonModal, LeaveModal, dll
│   │   ├── tasks/              → TaskCard, TaskFormModal, TaskDetailModal, TaskProgressModal, dll
│   │   ├── chat/               → ChatBubble, ChatHeader, ChatInput, ChatSidebar, ForwardModal, PollModal, dll
│   │   ├── profile/            → ProfileHero, ProfileStats, ChangePasswordModal, ChangeEmailModal, dll
│   │   ├── admin/              → AdminTabBar, tabs (Overview, Users, Tasks, Attendance, Rekap, Holidays, Settings), modals
│   │   └── docs/               → Panduan pengguna (Intro, Dashboard, Presensi, Tasks, Chat, Profile, Install, FAQ)
│   └── assets/
│       └── favicon.svg
├── routes/
│   ├── +layout.ts              → Auth guard global
│   ├── +layout.svelte          → Root layout (Toaster, BottomNav, deletion warning, chat popup, PWA banner)
│   ├── +page.svelte            → Dashboard (/)
│   ├── auth/
│   │   ├── +page.svelte        → Login, Register, Forgot Password
│   │   └── reset/+page.svelte  → Reset Password
│   ├── absensi/+page.svelte    → Presensi harian
│   ├── tasks/+page.svelte      → Task management
│   ├── chat/
│   │   ├── +page.svelte        → Daftar room chat
│   │   └── [room_id]/+page.svelte → Room chat realtime
│   ├── notifications/+page.svelte → Pusat notifikasi
│   ├── profile/+page.svelte    → Profil & pengaturan
│   ├── admin/+page.svelte      → Admin panel
│   ├── docs/                   → Halaman panduan
│   └── api/
│       ├── admin/
│       │   ├── users/+server.ts     → CRUD user (admin)
│       │   ├── holidays/+server.ts  → CRUD hari libur
│       │   ├── leaves/+server.ts    → Approve/reject izin
│       │   ├── settings/+server.ts  → Update pengaturan
│       │   └── system/+server.ts    → Deletion & cleanup
│       ├── chat/metadata/+server.ts → Update metadata pesan
│       ├── user/email/+server.ts    → Ganti email
│       └── firebase-messaging-sw.js → FCM Service Worker
└── layout.css                  → Global CSS (Tailwind import + custom properties)
```

---

## 🗃️ Database Schema (Supabase PostgreSQL)

### Tabel: `profiles`
```sql
id          uuid (PK, FK → auth.users)
full_name   text
role        text  ('admin' | 'user')
avatar_url  text | null
phone       text | null
address     text | null
position    text | null
joined_at   date | null
birth_date  date | null
last_seen   timestamptz | null
created_at  timestamptz
```

### Tabel: `attendance`
```sql
id              uuid PK
user_id         uuid FK → profiles
session_id      int  (1=Pagi, 2=Siang, 3=Sore, 4=Lembur)
date            date
clock_in        timestamptz | null
clock_out       timestamptz | null
photo_in_url    text | null
photo_out_url   text | null
late            boolean default false
late_reason     text | null
forgot_checkout boolean default false
```

### Tabel: `attendance_leaves`
```sql
id              uuid PK
user_id         uuid FK → profiles
date            date
type            text ('izin' | 'sakit')
reason          text
session_id      int | null  (null = semua sesi)
status          text ('pending' | 'approved' | 'rejected') default 'pending'
approved_by     uuid | null FK → profiles
rejection_note  text | null
```

### Tabel: `attendance_penalties`
```sql
id          uuid PK
user_id     uuid FK → profiles
date        date
session_id  int
minutes     int
reason      text
created_at  timestamptz
```

### Tabel: `tasks`
```sql
id            uuid PK
title         text
description   text | null
status        text ('not_started'|'in_progress'|'review'|'revision'|'done')
priority      text ('low'|'medium'|'high')
progress      int  (0-100)
start_date    date | null
due_date      date | null
created_by    uuid FK → profiles
created_at    timestamptz
subtasks      jsonb default '[]'
attachments   jsonb | null
completed_at  timestamptz | null
```

### Tabel: `task_assignments`
```sql
id           uuid PK
task_id      uuid FK → tasks
user_id      uuid FK → profiles
status       text ('pending'|'accepted'|'rejected'|'completed')
accepted_at  timestamptz | null
completed_at timestamptz | null
```

### Tabel: `task_attachments`
```sql
id          uuid PK
task_id     uuid FK → tasks
user_id     uuid FK → profiles
filename    text
file_url    text
file_type   text
created_at  timestamptz
```

### Tabel: `task_comments`
```sql
id         uuid PK
task_id    uuid FK → tasks
user_id    uuid FK → profiles
content    text
tag        text ('problem'|'late'|'missed_deadline'|'general')
reply_to   uuid FK → task_comments | null
created_at timestamptz
updated_at timestamptz
```

### Tabel: `notifications`
```sql
id          uuid PK
user_id     uuid FK → profiles
type        text
title       text
message     text
data        jsonb | null
is_read     boolean default false
created_at  timestamptz
```

### Tabel: `chat_rooms`
```sql
id          uuid PK
name        text | null
type        text ('direct' | 'group')
description text | null
avatar_url  text | null
created_by  uuid | null FK → profiles
created_at  timestamptz
```

### Tabel: `chat_participants`
```sql
room_id       uuid PK, FK → chat_rooms
user_id       uuid PK, FK → profiles
joined_at     timestamptz
last_read_at  timestamptz | null
```

### Tabel: `chat_messages`
```sql
id          uuid PK
room_id     uuid FK → chat_rooms
sender_id   uuid | null FK → profiles
type        text ('text'|'image'|'audio'|'file'|'poll'|'system')
content     text | null
metadata    jsonb | null
created_at  timestamptz
```

### Tabel: `chat_poll_votes`
```sql
message_id  uuid PK, FK → chat_messages
user_id     uuid PK, FK → profiles
option_id   text
created_at  timestamptz
```

### Tabel: `app_settings` (Singleton, id=1)
```sql
id              int PK
office_lat      float
office_lng      float
office_radius   int
office_locations jsonb | null
admin_contact   text | null
deletion_scheduled_at timestamptz | null
updated_at      timestamptz
```

### Tabel: `holidays`
```sql
id   uuid PK
date date
name text
```

### Tabel: `special_rules`
```sql
id              uuid PK
date            date
type            text ('normal'|'custom_time'|'wfa')
start_time      text | null
active_sessions int[] | null
note            text | null
created_by      uuid FK → profiles
```

### Tabel: `fcm_tokens`
```sql
user_id  uuid FK → profiles
token    text (unique)
```

### Storage Buckets
| Bucket | Isi | Path Pattern |
|---|---|---|
| `selfies` | Foto absensi | `{user_id}/{timestamp}_{in\|out}.jpg` |
| `avatars` | Foto profil | `{user_id}/{timestamp}.jpg` |
| `chat_media` | Media chat | `{room_id}/{timestamp}-{random}.ext` |
| `tasks` | Lampiran tugas | `{task_id}/{userId}_{timestamp}.ext` |

### RPC Functions
| Fungsi | Tipe | Fungsi |
|---|---|---|
| `send_notification` | SECURITY DEFINER | Insert notifikasi bypass RLS |
| `get_rooms_with_unread` | SECURITY DEFINER | List room + unread count + last message |
| `mark_as_read` | SECURITY DEFINER | Update `last_read_at` |
| `get_top_performers` | SECURITY DEFINER | Hitung top 5 performer |

### Database Triggers
| Trigger | Event | Fungsi |
|---|---|---|
| `trg_notify_admins_on_leave` | AFTER INSERT on `attendance_leaves` | Kirim notifikasi ke semua admin |

---

## 🔐 Autentikasi & Otorisasi

### Auth Guard (`+layout.ts`)
```typescript
if (!session && !isAuthPage) throw redirect(303, '/auth')
if (session && isAuthPage)  throw redirect(303, '/')
```

### Role-Based Access Control

| Aksi | user | admin |
|---|---|---|
| Akses halaman user | ✅ | ✅ |
| Buat tugas | ✅ | ✅ |
| Edit tugas sendiri | ✅ | ✅ |
| Edit tugas orang lain (jika accepted) | ✅ | ✅ |
| Hapus tugas orang lain | ❌ | ✅ |
| Akses `/admin` | ❌ | ✅ |
| Lihat semua task | ❌ | ✅ |
| Kelola users | ❌ | ✅ |
| Approve/reject izin | ❌ | ✅ |
| Schedule deletion | ❌ | ✅ |

### Server Auth Helpers (`src/lib/server/auth.ts`)
| Fungsi | Fungsi |
|---|---|
| `requireAuthenticated(event)` | Verifikasi Bearer token, return user |
| `requireAdmin(event)` | Verifikasi token + cek role admin |
| `requireSelfOrAdmin(event, targetUserId)` | Verifikasi self atau admin |

### Rate Limiter (`src/lib/server/rateLimiter.ts`)
- In-memory rate limiting per IP
- Default: 20 requests per 60 seconds
- API admin users: 10 req/min
- API admin system: 10 req/min
- API user email: 5 req/min
- API chat metadata: 20 req/min

---

## 📅 Sistem Sesi Absensi

```
Sesi 1 (Pagi):   08:00 - 11:30  | unlock 06:00 | auto-checkout 12:00 | GPS required
Sesi 2 (Siang):  13:30 - 15:00  | unlock 12:00 | auto-checkout 15:30 | GPS required
Sesi 3 (Sore):   16:00 - 17:00  | unlock 15:30 | auto-checkout 17:30 | GPS required
Sesi 4 (Lembur): 20:00 - 23:59  | unlock 19:30 | auto-checkout 23:59 | GPS NOT required
```

**Aturan:**
- **Kamis**: Hanya Sesi Pagi (1 sesi)
- **Jumat**: Tidak ada sesi reguler (hanya Lembur)
- **Hari Libur**: Hanya Lembur (buka jam 06:00)
- **Toleransi Keterlambatan**: 10 menit
- **Penalti Lupa Checkout**: 10 menit
- **Radius GPS**: Dinamis dari `app_settings` (bisa multi-lokasi)
- **Special Rules**: Bisa override jadwal (custom_time, WFA)

---

## ✅ Status & Priority Task

### Status Lifecycle
```
not_started → in_progress → review → revision → done
```

### Auto-Status dari Progress
```typescript
function getStatusByProgress(progress: number): Task['status'] {
  if (progress === 0)   return 'not_started'
  if (progress === 100) return 'done'
  if (progress >= 80)   return 'review'
  return 'in_progress'
}
```

### Priority Colors
```typescript
const PRIORITY_DOT = {
  low:    '#94A3B8',  // slate
  medium: '#F59E0B',  // amber
  high:   '#EF4444',  // red
}
```

---

## 🔔 Sistem Notifikasi

### Tipe Notifikasi & Navigasi
| Type | Icon Color | Navigate To |
|---|---|---|
| `task_collaboration_invite` | 🔵 Blue | `/tasks` |
| `task_assigned` | 🔵 Blue | `/tasks` |
| `collaboration_accepted` | 🟢 Green | `/absensi` |
| `collaboration_rejected` | 🔴 Red | `/absensi` |
| `task_completed` | 🟢 Emerald | `/tasks` |
| `task_ready_review` | 🟣 Purple | `/tasks` |
| `task_deadline_today` | 🔴 Red | `/tasks` |
| `task_deleted` | ⚫ Slate | `/tasks` |
| `task_revision` | 🟡 Amber | `/tasks` |
| `leave_request` | 🟠 Orange | `/admin` |
| `workload_alert` | 🟡 Yellow | `/admin` |
| `task_comment` | 🟣 Indigo | `/tasks` |

### Arsitektur Notifikasi (Serverless)
```
1. Client → notificationService.send()
   ├── RPC 'send_notification' (bypass RLS) → INSERT ke DB ✅
   └── Edge Function 'send-push' → FCM Push Notification 📱
```

### FCM Push Notification
- **Service Worker**: `firebase-messaging-sw.js` (terpisah dari PWA SW)
- **iOS Quirk**: Push hanya bekerja di mode Standalone (PWA)
- **User Gesture**: `Notification.requestPermission()` harus di baris pertama event klik
- **Data-Only Message**: Edge Function mengirim data-only agar PWA Service Worker bisa menampilkan notifikasi dengan `tag` unik

---

## 💬 Chat System

### Arsitektur Realtime
```
Supabase Realtime (Postgres Changes)
├── chat_{roomId}     → INSERT/UPDATE/DELETE pesan
├── typing_{roomId}   → Broadcast status mengetik
└── Custom Broadcast  → Metadata update (reaksi, pin) tanpa Postgres UPDATE
```

### Fitur Chat
- Direct Message (DM) & Group Chat
- Pesan teks, gambar, audio (voice note), file
- Polling dengan voting
- Reaksi emoji (custom broadcast)
- Pin pesan
- Forward pesan
- Reply/quote pesan
- Edit pesan
- Hapus pesan (+ hapus media dari storage)
- Typing indicator
- Read receipt (centang biru)
- Wallpaper chat (preset + custom upload + warna)
- Search pesan
- Multi-select & bulk actions
- Star/bintangi pesan
- Room info (anggota, media, file)
- Unread badge & separator "belum terbaca"

### Global Chat Store
- `globalRooms` — Daftar semua room user
- `globalUnreadChatCount` — Total unread
- `latestIncomingChat` — Untuk popup notifikasi chat
- **Multiplexing**: 1 channel per room (`global-chat-{uid}-{roomId}`)

---

## 🧹 Global Deletion Scheduler

1. Admin menjadwalkan deletion via `adminService.scheduleDeletion()`
2. `deletionStore` di-set `true` via `setContext` di layout
3. Semua halaman yang consume `deletionStore` akan menyembunyikan data
4. Modal peringatan countdown muncul di semua halaman
5. Admin bisa batalkan via `adminService.cancelDeletion()`
6. Setelah timer habis, aplikasi reload untuk memuat state kosong

---

## 📦 State Management

### Svelte 5 Runes
```typescript
let count = $state(0)              // State reaktif
let doubled = $derived(count * 2)  // Computed
$effect(() => { ... })             // Side effect (tidak boleh async langsung)
```

### Stores
| Store | Fungsi |
|---|---|
| `globalChatStore.ts` | Global rooms, unread count, incoming chat popup |
| `notificationStore.ts` | Unread notification count |
| `chatReadStore.ts` | Set of read room IDs |

### Context API
- `deletionStore` — Writable boolean untuk status pembersihan data global

---

## 🎨 Design System

### Color Palette
| Warna | Hex | Kegunaan |
|---|---|---|
| Primary | `#F97316` | CTA, brand |
| Primary Dark | `#EA580C` | Active state |
| BG Warm | `#FFF9F0` | Background user pages |
| BG Admin | `#F8FAFC` | Background admin |
| Success | `#16A34A` | Status sukses |
| Error | `#DC2626` | Status error |
| Warning | `#F59E0B` | Status warning |
| Info | `#3B82F6` | Status info |

### Typography
| Font | Kegunaan | Weights |
|---|---|---|
| Plus Jakarta Sans | Heading, brand, angka | 500, 600, 700, 800 |
| Inter | Body, label, form | 400, 500, 600, 700 |

### Layout
```
User pages:  max-w-xl mx-auto (mobile-first)
Admin pages: max-w-6xl mx-auto (full-width)
Auth pages:  min-h-screen (full-width)
BottomNav:   hidden di /auth, /admin
Content pb:  pb-24 (ruang BottomNav)
```

---

## 🔌 API Endpoints

| Endpoint | Method | Auth | Fungsi |
|---|---|---|---|
| `/api/admin/users` | POST | Admin | Buat user baru |
| `/api/admin/users?id=` | DELETE | Admin | Hapus user |
| `/api/admin/holidays` | POST | Admin | Simpan hari libur |
| `/api/admin/holidays?id=` | DELETE | Admin | Hapus hari libur |
| `/api/admin/leaves` | POST | Admin | Approve/reject izin |
| `/api/admin/settings` | POST | Admin | Update pengaturan |
| `/api/admin/system` | POST | Admin | Schedule/cancel deletion, cleanup |
| `/api/chat/metadata` | POST | Auth | Update metadata pesan |
| `/api/user/email` | POST | Self/Admin | Ganti email |
| `/firebase-messaging-sw.js` | GET | Public | Service Worker FCM |

---

## ⚠️ Gotchas & Known Patterns

1. **Supabase `.in()` format**: UUID tanpa quotes → `` `id.in.(${ids.join(',')})` ``
2. **RLS Notifications**: Error `42501` = RLS memblokir → toast warning
3. **Svelte 5 `$effect`**: Tidak boleh async langsung, gunakan IIFE
4. **`ssr = false`**: Semua auth check & data fetch terjadi di client
5. **Toast**: Selalu gunakan `svelte-french-toast`
6. **Auto Checkout**: Dijalankan di `loadData()`, bukan background worker
7. **Service Layer Only**: `supabase.from()` di UI = pelanggaran arsitektur
8. **Realtime Channels**: Filter harus diinisialisasi setelah user tidak null
9. **Channel Cleanup**: Wajib `removeChannel` sebelum membuat channel baru
10. **Multiple Rooms**: 1 channel per room, jangan pakai `in.()` untuk banyak ID
11. **iOS User Gesture**: `Notification.requestPermission()` di baris pertama event klik
12. **Deletion Status**: Cek `app_settings.deletion_scheduled_at` sebelum operasi data

---

## 📦 Dependencies

| Package | Versi | Fungsi |
|---|---|---|
| `@sveltejs/kit` | ^2.57.0 | Framework utama |
| `svelte` | ^5.55.2 | UI (Runes API) |
| `@supabase/supabase-js` | ^2.103.0 | Backend client |
| `tailwindcss` | ^4.2.2 | Styling |
| `lucide-svelte` | ^1.0.1 | Icon set |
| `svelte-french-toast` | ^1.2.0 | Toast notification |
| `canvas-confetti` | ^1.9.4 | Efek selebrasi |
| `firebase` | ^12.12.1 | FCM push notification |
| `firebase-admin` | ^13.8.0 | Server-side FCM |
| `jspdf` | ^4.2.1 | Export PDF |
| `typescript` | ^6.0.2 | Type safety |
| `vite` | ^8.0.7 | Build tool |
| `vite-plugin-pwa` | ^1.2.0 | PWA support |

---

## 🔄 Alur Data Utama

### Check-in Absensi
```
User klik "Check In" → Cek GPS radius → Cek keterlambatan
→ Jika terlambat: LateReasonModal → Buka kamera → Capture foto
→ Upload ke bucket 'selfies' → Insert ke tabel 'attendance' → Refresh data
```

### Buat Tugas
```
User klik "+" → TaskFormModal → Isi form → Validasi
→ taskService.saveTask() → Insert 'tasks' + 'task_assignments'
→ Kirim notifikasi ke collaborator → Refresh daftar
```

### Chat Realtime
```
Masuk room → getMessages() → subscribeToMessages() → markMessagesAsRead()
→ Kirim pesan → sendTextMessage() → Listener INSERT → update messages[]
```

---

## 📊 Migrasi Database

| File | Fungsi |
|---|---|
| `add_rejection_note.sql` | Kolom `rejection_note` + Realtime `attendance_leaves` |
| `add_leave_request_notification_type.sql` | Tipe `leave_request` di constraint |
| `notify_admins_on_leave.sql` | Trigger notifikasi otomatis ke admin |
| `get_top_performers.sql` | RPC hitung top performer |
| `task_comments.sql` | Tabel komentar + RLS + Realtime |

---

## 🧪 Testing Strategy

### Unit Test Targets
- **Services**: `authService`, `taskService`, `attendanceService`, `notificationService`, `chatService`, `locationService`, `adminService`
- **Helpers**: `rateLimiter`, auth helpers
- **Utilities**: Date formatting, form validation, pagination logic
- **Stores**: `globalChatStore`, `notificationStore`, `chatReadStore`

### E2E Test Targets (Playwright)
- **Auth Flow**: Login, Register, Forgot Password, Reset Password, Logout
- **Dashboard**: Load data, navigation, real-time updates
- **Absensi**: Check-in/out flow, GPS validation, leave submission
- **Tasks**: CRUD, filtering, sorting, bulk operations, calendar view
- **Chat**: Send messages, real-time receive, media upload, reactions
- **Notifications**: Receive, read, delete, navigate
- **Profile**: View, edit, change password/email, avatar upload
- **Admin**: User management, task management, attendance overview, settings

---

> Dokumen ini dibuat pada 2026-05-13 berdasarkan analisis lengkap terhadap seluruh source code, konfigurasi, dan dokumentasi proyek Workspace Khwarizmi.
