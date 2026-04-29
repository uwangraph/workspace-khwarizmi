# 📐 Coding Rules — Workspace Khwarizmi

> Aturan-aturan ini WAJIB diikuti saat mengembangkan atau memodifikasi kode proyek ini. Konsistensi adalah prioritas utama.

---

## 1. Framework & Syntax

### ✅ Gunakan Svelte 5 Runes API (WAJIB)
```svelte
<!-- ✅ BENAR — Svelte 5 Runes -->
let count = $state(0)
let doubled = $derived(count * 2)
let { children } = $props()

$effect(() => {
  console.log(count)
  return () => { /* cleanup */ }
})
```

```svelte
<!-- ❌ SALAH — Svelte 4 Legacy (JANGAN dipakai) -->
let count = 0
$: doubled = count * 2
export let children
```

### ✅ TypeScript Selalu
- Semua file `.svelte` menggunakan `<script lang="ts">`
- Selalu definisikan interface untuk semua data structure
- Hindari penggunaan `any` — gunakan `unknown` atau type yang spesifik

### ✅ Async dalam $effect
```typescript
// ✅ BENAR
$effect(() => {
  void (async () => {
    const data = await fetchData()
    // ...
  })()
})

// ❌ SALAH — $effect tidak bisa langsung async
$effect(async () => { ... })
```

---

## 2. Supabase Patterns

### ✅ Service Layer Architecture (Wajib)
Semua akses database dan autentikasi tidak boleh dipanggil langsung dari komponen UI (`.svelte`). 
Semua interaksi dengan Supabase HARUS dialihkan ke file `service` yang sesuai (di dalam folder `src/lib/services/`).
Komponen UI hanya bertugas menangani tampilan, event, dan state.

```typescript
// ✅ BENAR — Menggunakan Service Layer dari file .svelte
const { data: p } = await authService.getProfile(user.id)
const tasks = await taskService.getTasks(user.id, profile.role)
const result = await adminService.deleteUser(id)

// ❌ SALAH — Memanggil Supabase langsung dari komponen UI
const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
const { error } = await supabase.auth.signOut()
```

### ✅ Parallel Data Fetching di Service
```typescript
// ✅ BENAR — fetch paralel dengan Promise.all di dalam method service
const [profileRes, attendRes, taskRes] = await Promise.all([
  supabase.from('profiles').select('*').eq('id', u.id).single(),
  supabase.from('attendance').select('*').eq('user_id', u.id),
  supabase.from('tasks').select('*').eq('created_by', u.id),
])

// ❌ SALAH — fetch serial (lebih lambat)
const profileRes = await supabase.from('profiles')...
const attendRes = await supabase.from('attendance')...
```

### ✅ Format `.in()` Supabase
```typescript
// ✅ BENAR — UUID tanpa quotes
const ids = ['uuid-1', 'uuid-2']
query.or(`created_by.eq.${userId},id.in.(${ids.join(',')})`)

// ❌ SALAH — jangan tambah quotes di sekitar UUID
query.in('id', ids) // ✅ ok untuk simple .in()
query.or(`id.in.("${ids.join('","')}")`) // ❌ SALAH
```

### ✅ Error Handling Supabase
```typescript
// ✅ Pattern standar
const { data, error } = await supabase.from('table').select('*')
if (error) {
  showToast(error.message, 'error')
  return
}
// gunakan data
```

### ✅ Auth Check di Setiap Halaman
```typescript
// Awal setiap loadData()
const { data: { user: u } } = await supabase.auth.getUser()
if (!u) { location.assign('/auth'); return }
user = u
```

### ✅ Admin Actions (Server-side API)
Gunakan backend API Endpoint (`/api/.../+server.ts`) dengan `supabaseAdmin` (Service Role Key) untuk operasi administratif (contoh: membuat akun user baru tanpa mengaktifkan email konfirmasi). Jangan gunakan `supabase.auth.signUp()` di panel Admin karena akan membuat Admin ter-logout dan berpindah sesi secara otomatis.
```typescript
// ✅ BENAR — Panggil API
await fetch('/api/admin/users', { method: 'POST', body: JSON.stringify(data) })

// ❌ SALAH — Menjalankan signUp di sisi client Admin
await supabase.auth.signUp({ ... })
```

---

## 3. State Management

### ✅ Pola State Lokal per Halaman
Setiap halaman mengelola state sendiri. Tidak ada global store kecuali untuk session.

```typescript
// ✅ Deklarasi state di atas, terstruktur
// ── State ──────────────────────────────────────────
let user = $state<User | null>(null)
let profile = $state<Profile | null>(null)
let isLoading = $state(true)

// Modals
let showModal = $state(false)
let selectedItem = $state<Item | null>(null)

// Gunakan svelte-french-toast untuk notifikasi, bukan state manual
// import toast from 'svelte-french-toast'
```

### ✅ Optimistic Update Pattern
```typescript
// ✅ Update UI dulu, rollback jika gagal
const prev = notifications
notifications = notifications.map(n => n.id === id ? { ...n, is_read: true } : n)

const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id)
if (error) {
  notifications = prev  // rollback
  showToast('Gagal memperbarui', 'error')
}
```

---

## 4. Komponen & File

### ✅ Struktur Section dalam File .svelte
Gunakan komentar section yang konsisten:
```typescript
// ── Types ──────────────────────────────────────────
// ── Constants ──────────────────────────────────────
// ── State ──────────────────────────────────────────
// ── Effects ────────────────────────────────────────
// ── Computed ───────────────────────────────────────
// ── Helpers ────────────────────────────────────────
// ── Data (Loaders) ─────────────────────────────────
// ── Actions ────────────────────────────────────────
```

### ✅ Menggunakan `svelte-french-toast`
Proyek ini tidak menggunakan fungsi toast lokal. Selalu gunakan `toast` dari `svelte-french-toast`.
```typescript
import toast from 'svelte-french-toast'

toast.success('Berhasil menyimpan data')
toast.error('Terjadi kesalahan koneksi')
toast('Informasi tambahan', { icon: 'ℹ️' })
```

### ✅ Loading State Pattern
```typescript
async function loadData() {
  isLoading = true
  try {
    // ...fetch data...
  } finally {
    isLoading = false
  }
}
```

---

## 5. Navigasi & Routing

### ✅ Redirect setelah action
```typescript
// Gunakan location.assign() untuk hard redirect
location.assign('/auth')

// Gunakan goto() dari $app/navigation untuk soft navigate
import { goto } from '$app/navigation'
goto('/')
```

### ✅ Auth Guard Pattern
```typescript
// Di +layout.ts (global)
if (!session && !isAuthPage) redirect(303, '/auth')
if (session && isAuthPage)  redirect(303, '/')

// Di halaman spesifik (local fallback)
const { data: { user: u } } = await supabase.auth.getUser()
if (!u) { location.assign('/auth'); return }
```

---

## 6. Pagination Pattern

```typescript
// ✅ Standar pagination yang digunakan di seluruh proyek
const itemsPerPage = 10
let currentPage = $state(1)

let filteredItems = $derived(
  items.filter(i => !search || i.title.toLowerCase().includes(search.toLowerCase()))
)

let paginatedItems = $derived(
  filteredItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
)

let totalPages = $derived(Math.ceil(filteredItems.length / itemsPerPage))

// Reset ke halaman 1 saat search/filter berubah
$effect(() => { search; filter; currentPage = 1 })
```

---

## 7. Notifikasi (insertNotification)

### ✅ Selalu Gunakan Dual-Strategy
```typescript
// ✅ WAJIB — gunakan fungsi ini, bukan insert langsung
await insertNotification(userId, 'task_assigned', 'Judul', 'Pesan', { task_id })
await insertNotificationMany([uid1, uid2], 'type', 'Judul', 'Pesan', data)
```

Jangan pernah insert langsung ke tabel `notifications` tanpa try/catch dan fallback.

---

## 8. Form Validation

```typescript
// ✅ Validasi sebelum submit, set error per-field
function validateForm(): boolean {
  formFieldErrors = {}
  let valid = true

  if (!formTitle.trim()) {
    formFieldErrors.title = 'Judul wajib diisi'
    valid = false
  }

  if (!valid) formError = 'Mohon lengkapi semua field yang ditandai'
  return valid
}

async function handleSubmit() {
  if (!validateForm()) return
  isSubmitting = true
  try {
    // ...
  } catch (e) {
    formError = e instanceof Error ? e.message : 'Terjadi kesalahan'
  } finally {
    isSubmitting = false
  }
}
```

---

## 9. Penamaan

| Konteks | Konvensi | Contoh |
|---|---|---|
| State boolean modal | `show` prefix | `showModal`, `showDeleteModal` |
| State loading | `is` prefix | `isLoading`, `isSubmitting`, `isDeleting` |
| Fungsi buka modal | `open` prefix | `openEditModal()`, `openCamera()` |
| Fungsi tutup | `close` prefix | `closeCamera()`, `closeModal()` |
| Fungsi load data | `load` prefix | `loadData()`, `loadTasks()` |
| Fungsi submit | `handle` atau `save` prefix | `handleSubmit()`, `saveTask()` |
| Computed/derived | deskriptif | `filteredTasks`, `paginatedUsers` |

---

## 10. Hal yang DILARANG

```typescript
// ❌ JANGAN gunakan Svelte 4 reactive ($:)
$: doubled = count * 2  // ← JANGAN

// ❌ JANGAN hardcode user_id tanpa validasi
supabase.from('profiles').select('*').eq('id', 'hardcoded-id')  // ← JANGAN

// ❌ JANGAN nested await tanpa Promise.all jika bisa paralel
const a = await fetch1()  // ← tidak efisien
const b = await fetch2()

// ❌ JANGAN skip error handling Supabase
const { data } = await supabase.from('x').select() // ← tidak cek error

// ❌ JANGAN pakai console.log di production code
// Gunakan conditional check atau hapus sebelum commit
```
