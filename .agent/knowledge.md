# 📚 Knowledge Base — Workspace Khwarizmi

> Dokumen ini berisi pengetahuan teknis mendalam tentang arsitektur, database, fitur, dan pola pengembangan proyek ini. Selalu baca ini sebelum membuat perubahan besar.

---

## 🧩 Identitas Proyek

| Field | Value |
|---|---|
| **Nama** | Workspace Khwarizmi |
| **Deskripsi** | Platform Manajemen Kerja (Presensi + Task Tracker) |
| **Target** | Mobile-first web app (max-w-xl, seperti native app) |
| **Framework** | SvelteKit 2 + Svelte 5 Runes |
| **Backend** | Supabase (PostgreSQL + Auth + Storage) |
| **Styling** | TailwindCSS v4 |
| **Icons** | Lucide Svelte |
| **Runtime** | Bun + Vite |
| **Adapter** | `@sveltejs/adapter-static` (pure SPA, `ssr = false`) |

---

## 🗂️ Struktur Routing

```
src/routes/
├── +layout.ts          → Auth guard global (redirect ke /auth jika belum login)
├── +layout.svelte      → Root layout: Toaster, BottomNav + mobile container
├── +page.svelte        → Dashboard (/)
├── auth/+page.svelte   → Login, Register, Forgot Password
├── absensi/+page.svelte → Presensi harian dengan GPS + Selfie
├── tasks/+page.svelte  → Task Management kolaboratif
├── notifications/+page.svelte → Pusat notifikasi
├── profile/+page.svelte → Profil & pengaturan akun
└── admin/+page.svelte  → Admin panel (role: admin only)
```

---

## 🧱 Struktur Komponen (`src/lib/components/`)

Agar halaman-halaman utama tidak membengkak (monolith), proyek ini menggunakan arsitektur modular dengan memisahkan UI ke dalam folder per-fitur:

- `shared/` → Komponen umum (`AppHeader.svelte`, `LoadingSpinner.svelte`, `EmptyState.svelte`, `PaginationBar.svelte`)
- `absensi/` → Komponen absensi (`AttendanceBanner.svelte`, `SessionCard.svelte`, `HistoryItem.svelte`, modal kamera/izin, dll)
- `tasks/` → Komponen tugas (`TaskCard.svelte`, `TaskFilterTabs.svelte`, semua modal form/delete/detail, dll)
- `profile/` → Komponen profil (`ProfileHero.svelte`, `ProfileStats.svelte`, `AvatarCropper.svelte`, dll)
- `dashboard/` → Komponen dashboard (`HeroCard.svelte`, `AttendanceSummary.svelte`, `TaskSummary.svelte`, dll)
- `admin/` → Komponen khusus admin panel.

---

## 🗃️ Skema Database Supabase

### Tabel `profiles`
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
created_at  timestamptz
```

### Tabel `attendance`
```sql
id              uuid PK
user_id         uuid FK → profiles
session_id      int  (1=Pagi, 2=Siang, 3=Sore, 4=Lembur)
date            date
check_in        timestamptz | null
check_out       timestamptz | null
photo_in_url    text | null
photo_out_url   text | null
late            boolean default false
late_reason     text | null
forgot_checkout boolean default false
```

### Tabel `attendance_leaves`
```sql
id          uuid PK
user_id     uuid FK → profiles
date        date
type        text ('izin' | 'sakit')
reason      text
session_id  int | null  (null = semua sesi)
status      text ('pending' | 'approved' | 'rejected') default 'pending'
approved_by uuid | null FK → profiles (Admin ID)
```

### Tabel `app_settings` (Singleton)
```sql
id            int PK (selalu 1)
office_lat    float
office_lng    float
office_radius int
updated_at    timestamptz
```

### Tabel `attendance_penalties`
```sql
id          uuid PK
user_id     uuid FK → profiles
date        date
session_id  int
minutes     int
reason      text
created_at  timestamptz
```

### Tabel `tasks`
```sql
id          uuid PK
title       text
description text | null
status      text ('not_started'|'in_progress'|'review'|'revision'|'done')
priority    text ('low'|'medium'|'high')
progress    int  (0-100)
start_date  date | null
due_date    date | null
created_by  uuid FK → profiles
created_at  timestamptz
```

### Tabel `task_assignments`
```sql
id           uuid PK
task_id      uuid FK → tasks
user_id      uuid FK → profiles
status       text ('pending'|'accepted'|'rejected'|'completed')
accepted_at  timestamptz | null
completed_at timestamptz | null
```

### Tabel `notifications`
```sql
id          uuid PK
user_id     uuid FK → profiles
type        text  (lihat tipe notifikasi di bawah)
title       text
message     text
data        jsonb | null
is_read     boolean default false
created_at  timestamptz
```

### Supabase Storage Buckets
| Bucket | Isi | Path Pattern |
|---|---|---|
| `selfies` | Foto absensi | `{user_id}/{timestamp}_{in|out}.jpg` |
| `avatars` | Foto profil | `{user_id}/{timestamp}.jpg` |

### RPC Functions
- **`send_notification`** — SECURITY DEFINER, bypass RLS untuk insert notifikasi antar user
  - Params: `p_user_id`, `p_type`, `p_title`, `p_message`, `p_data`

---

## 🔐 Autentikasi & Authorization

### Auth Guard (`+layout.ts`)
```typescript
// Selalu dipanggil di setiap route
if (!session && !isAuthPage) redirect(303, '/auth')
if (session && isAuthPage)  redirect(303, '/')
```

### Role-Based Access
| Aksi | user | admin |
|---|---|---|
| Akses semua halaman user | ✅ | ✅ |
| Buat task | ✅ | ✅ |
| Edit task sendiri | ✅ | ✅ |
| Edit task orang lain (jika `accepted`) | ✅ | ✅ |
| Hapus task orang lain | ❌ | ✅ |
| Akses `/admin` | ❌ | ✅ |
| Lihat semua task di admin | ❌ | ✅ |
| Kelola users | ❌ | ✅ |

### Pengecekan Admin di Halaman Admin
```typescript
// Di loadData() admin page:
if (!p || p.role !== 'admin') { location.assign('/'); return }
```

---

## 📅 Sistem Sesi Absensi

```typescript
const SESSIONS = [
  { id: 1, name: 'Sesi Pagi',  start: '08:00', end: '11:30',
    unlockAt: '06:00', autoCheckoutAt: '12:00', requireLocation: true },
  { id: 2, name: 'Sesi Siang', start: '13:30', end: '15:00',
    unlockAt: '12:00', autoCheckoutAt: '15:30', requireLocation: true },
  { id: 3, name: 'Sesi Sore',  start: '16:00', end: '22:00',
    unlockAt: '15:30', autoCheckoutAt: '22:30', requireLocation: true },
  { id: 4, name: 'Lembur',     start: '20:00', end: '23:59',
    unlockAt: '19:30', autoCheckoutAt: '23:59', requireLocation: false },
]
```

- **Toleransi Terlambat:** Berdasarkan konfigurasi sesi
- **Auto Checkout Penalty:** 10 menit jika lupa checkout
- **Radius GPS:** Dinamis berdasarkan data `office_lat`, `office_lng`, dan `office_radius` di tabel `app_settings` (bukan *hardcoded*).
- **Format Keterlambatan:** Otomatis mengubah satuan ke `Jam & Menit` jika melebihi 60 menit.

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

### Dual-Strategy Insert Notifikasi
```typescript
// Strategy 1: RPC (bypass RLS)
await supabase.rpc('send_notification', { p_user_id, p_type, p_title, p_message, p_data })

// Strategy 2: Direct insert (fallback)
await supabase.from('notifications').insert({ user_id, type, title, message, data, is_read: false })
```

### Dedup Deadline Notification
```typescript
// Gunakan localStorage untuk mencegah spam notifikasi deadline
const storageKey = `deadline_notified_${user.id}_${todayISO}`
const alreadyNotified: string[] = JSON.parse(localStorage.getItem(storageKey) || '[]')
```

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

## 📸 Sistem Kamera (Absensi)

Alur check-in selfie:
1. Cek GPS radius → jika gagal, batalkan
2. Cek keterlambatan → jika terlambat, tampilkan modal alasan
3. Buka stream kamera `facingMode: 'user'`
4. Live preview: di-mirror (`scaleX(-1)`) agar natural saat selfie
5. Capture: **tidak** di-mirror (foto asli sesuai kenyataan)
6. Upload ke bucket `selfies`
7. Insert ke tabel `attendance`

---

## 🖼️ Avatar Cropper (Profil)

Custom avatar cropper tanpa library eksternal:
- **CROP_SIZE:** 280px (tampilan crop box)
- **OUTPUT_SIZE:** 512px (output gambar final)
- Support: drag (pointer events), zoom (wheel), pinch-to-zoom (touch)
- Output format: JPEG 0.9 quality
- Upload ke bucket `avatars`

---

## 🏗️ Layout Sistem

```
// Mobile layout (halaman user)
"max-w-xl mx-auto min-h-screen bg-white relative shadow-2xl overflow-hidden"

// Full-width layout (admin, auth)
"min-h-screen bg-slate-50 relative"
```

BottomNav disembunyikan di route:
- `/auth`
- `/login`
- `/register`
- `/admin`

---

## 📦 Dependensi Kunci

| Package | Versi | Fungsi |
|---|---|---|
| `@sveltejs/kit` | ^2.57.0 | Framework utama |
| `svelte` | ^5.55.2 | UI (Runes API) |
| `@supabase/supabase-js` | ^2.103.0 | Backend client |
| `lucide-svelte` | ^1.0.1 | Icon set |
| `tailwindcss` | ^4.2.2 | Styling |
| `@tailwindcss/vite` | ^4.2.2 | TW v4 integration |
| `@tailwindcss/typography` | ^0.5.19 | Typography plugin |
| `typescript` | ^6.0.2 | Type safety |

---

## ⚠️ Gotchas & Known Patterns

1. **Supabase `.in()` format:** Jangan pakai quotes di sekitar UUID: `` `id.in.(${ids.join(',')})` ``
2. **RLS Notifications:** Jika `error.code === '42501'`, berarti RLS memblokir insert → tampilkan toast warning
3. **Svelte 5 `$effect`:** Tidak boleh async langsung, gunakan IIFE atau fungsi terpisah
4. **`ssr = false`:** Semua auth check dan data fetch terjadi di client, tidak ada server-side rendering
5. **Toast Notification:** Seluruh proyek menggunakan `svelte-french-toast`, jangan menggunakan state manual untuk toast.
6. **Auto Checkout:** Dijalankan di `loadData()`, bukan background worker — hanya aktif saat user buka halaman absensi
