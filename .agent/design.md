# 🎨 Design System — Workspace Khwarizmi

> Panduan desain lengkap untuk menjaga konsistensi visual di seluruh aplikasi. Setiap komponen baru HARUS mengikuti sistem ini.

---

## 🌈 Color Palette

### Primary — Orange Gradient (Identitas Utama)
```css
/* Warna utama brand */
--color-primary:       #F97316;  /* orange-500 */
--color-primary-dark:  #EA580C;  /* orange-600 */
--color-primary-light: #FB923C;  /* orange-400 */

/* Gradient standar */
background: linear-gradient(135deg, #F97316 0%, #EA580C 100%);

/* Gradient horizontal (progress bar) */
background: linear-gradient(90deg, #F97316, #FBBF24);
```

### Neutral Palette
```css
--color-bg-warm:    #FFF9F0;  /* Warm off-white — background halaman user */
--color-bg-admin:   #F8FAFC;  /* slate-50 — background admin panel */
--color-bg-card:    #FFFFFF;  /* Putih murni — card background */
--color-text-main:  #0F172A;  /* slate-900 — teks utama */
--color-text-sub:   #475569;  /* slate-600 — teks sekunder */
--color-text-muted: #94A3B8;  /* slate-400 — teks muted/placeholder */
--color-border:     #E2E8F0;  /* slate-200 — border default */
--color-border-sub: #F1F5F9;  /* slate-100 — border subtle */
```

### Semantic Colors
```css
/* Status Success */
--color-success:      #16A34A;  /* green-600 */
--color-success-bg:   #F0FDF4;  /* green-50 */
--color-success-text: #15803D;  /* green-700 */

/* Status Error / Danger */
--color-error:        #DC2626;  /* red-600 */
--color-error-bg:     #FEF2F2;  /* red-50 */
--color-error-text:   #B91C1C;  /* red-700 */

/* Status Warning */
--color-warning:      #F59E0B;  /* amber-500 */
--color-warning-bg:   #FFFBEB;  /* amber-50 */
--color-warning-text: #B45309;  /* amber-700 */

/* Status Info */
--color-info:         #3B82F6;  /* blue-500 */
--color-info-bg:      #EFF6FF;  /* blue-50 */
--color-info-text:    #1D4ED8;  /* blue-700 */
```

### Dark Mode Panel (Admin Dark Hero)
```css
/* Digunakan di hero card admin dan dark section */
background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%);
/* Efek glow: bg-orange-500/20 blur-3xl */
```

---

## 🔤 Typography

### Font Families
```css
/* Heading / Brand — untuk judul, brand name, angka besar */
font-family: 'Plus Jakarta Sans', sans-serif;
/* Weights yang digunakan: 500, 600, 700, 800 */

/* Body / UI — untuk teks paragraf, label, form */
font-family: 'Inter', sans-serif;
/* Weights yang digunakan: 400, 500, 600, 700 */
```

### Import Google Fonts
```html
<link href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,400;14..32,500;14..32,600;14..32,700;14..32,800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
```

### Skala Ukuran Teks
| Konteks | Class TW | Ukuran |
|---|---|---|
| Brand / App Name | `text-base font-extrabold` | 16px bold |
| Heading Halaman | `text-2xl` / `text-3xl font-bold` | 24-30px |
| Section Label | `text-[10px] font-bold uppercase tracking-widest` | 10px |
| Card Title | `text-sm font-semibold` | 14px |
| Body Text | `text-sm font-medium` / `text-xs` | 12-14px |
| Caption / Muted | `text-[11px]` / `text-[10px]` | 10-11px |
| Badge / Tag | `text-[9px] font-bold` | 9px |
| Hero Number | `text-2xl font-bold` / `text-xl font-bold` | 20-24px |

---

## 📐 Spacing & Layout

### Container Sistem
```html
<!-- Halaman user (mobile-first) -->
<div class="max-w-xl mx-auto min-h-screen bg-white relative shadow-2xl overflow-hidden sm:border-x sm:border-slate-200">

<!-- Halaman admin (full-width) -->
<div class="min-h-screen bg-slate-50">
  <main class="max-w-6xl mx-auto w-full px-4 py-5">

<!-- Content area dalam halaman user -->
<main class="max-w-lg mx-auto px-4 py-5 pb-24 flex flex-col gap-5">
```

### Padding Bottom (untuk BottomNav)
```css
/* Selalu tambahkan pb-24 di main content agar tidak tertutup BottomNav */
pb-24  /* 96px — cukup untuk BottomNav + safe area */
pb-28  /* 112px — untuk halaman dengan banyak scroll */
```

### Spacing Antar Section
```css
gap-5   /* 20px — antar section utama di dashboard */
gap-4   /* 16px — antar elemen dalam section */
gap-3   /* 12px — antar card/item */
gap-2   /* 8px — antar elemen kecil */
```

---

## 🃏 Card System

### Card Standar
```html
<!-- Card utama -->
<div class="bg-white rounded-2xl border border-slate-100 shadow-sm">

<!-- Card dengan divider internal -->
<div class="bg-white rounded-2xl border border-slate-100 overflow-hidden divide-y divide-slate-50">

<!-- Card warm (halaman user) -->
<div class="bg-white/90 rounded-2xl p-4 shadow-sm border border-slate-100">
```

### Hero Card (Gradient Orange)
```html
<div class="rounded-3xl p-6 shadow-lg shadow-orange-200/50"
     style="background: linear-gradient(135deg, #F97316 0%, #EA580C 100%);">
```

### Stat Card
```html
<div class="bg-white/10 backdrop-blur-sm rounded-2xl p-3 text-center">
  <!-- Di dalam hero card (gradient background) -->

<div class="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 text-center">
  <!-- Standalone stat card -->
```

---

## 🔘 Button System

### Button Primary (CTA Utama)
```html
<button class="w-full py-3.5 rounded-xl text-sm font-bold tracking-wide uppercase text-white
               transition-all disabled:opacity-60 hover:shadow-lg hover:-translate-y-0.5
               active:scale-[0.98] bg-gradient-to-r from-orange-500 to-orange-600 shadow-md
               flex items-center justify-center gap-2">
```

### Button Secondary
```html
<button class="py-3 rounded-xl text-sm font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200">
```

### Button Danger
```html
<button class="py-3 rounded-xl text-sm font-semibold text-white" style="background: #DC2626;">
```

### Button Ghost / Icon
```html
<button class="w-8 h-8 rounded-lg bg-slate-100 hover:bg-orange-50 flex items-center justify-center
               text-slate-500 hover:text-orange-600 transition-colors cursor-pointer">
```

### Button Small / Pill
```html
<button class="px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer"
        style="background: linear-gradient(135deg, #F97316, #EA580C); color: white;">
  <!-- Active state -->

<button class="px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500">
  <!-- Inactive state -->
```

---

## 📝 Form System

### Input Field
```html
<input class="w-full pl-10 pr-4 py-3.5 text-sm text-slate-800
              bg-slate-50/50 border border-slate-200 rounded-xl outline-none
              transition-all placeholder:text-slate-400
              focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-400/20" />
```

### Textarea
```html
<textarea class="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm
                 text-slate-700 bg-slate-50 focus:outline-none
                 focus:ring-2 focus:ring-orange-400 resize-none">
```

### Label
```html
<label class="block text-[11px] font-bold text-slate-600 tracking-widest uppercase mb-2">
```

### Error Field
```html
<div class="bg-red-50 border border-red-100 rounded-xl px-3 py-2.5 flex items-start gap-2">
  <AlertTriangle size={14} class="text-red-500 flex-shrink-0 mt-0.5" />
  <p class="text-xs text-red-600 font-medium">{errorMsg}</p>
</div>
```

---

## 🏷️ Badge / Tag System

### Status Badge
```html
<!-- not_started -->
<span class="text-[9px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">

<!-- in_progress -->
<span class="text-[9px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">

<!-- review -->
<span class="text-[9px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">

<!-- revision -->
<span class="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">

<!-- done -->
<span class="text-[9px] font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-700">
```

### Role Badge
```html
<span class="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700">ADMIN</span>
```

### Priority Dot
```html
<!-- Batang vertikal di sisi kiri card task -->
<div class="w-1.5 h-6 rounded-full" style="background: {PRIORITY_DOT[task.priority]}">
  <!-- low: #94A3B8 | medium: #F59E0B | high: #EF4444 -->
```

---

## 🔔 Toast Notification

```html
<!-- Selalu fixed bottom-center, z-index tinggi -->
<div class="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] px-5 py-3 rounded-xl
            text-sm font-medium text-white shadow-2xl flex items-center gap-2 max-w-[90vw]"
     style="background: {toastType === 'success' ? '#16A34A' : toastType === 'error' ? '#DC2626' : '#3B82F6'};
            animation: slideInUp 0.3s ease-out;">
```

### Warna Toast
| Type | Background |
|---|---|
| `success` | `#16A34A` (green-600) |
| `error` | `#DC2626` (red-600) |
| `info` | `#3B82F6` (blue-500) |

---

## 🧭 Navigation

### Bottom Navigation
```
Posisi: fixed bottom-0, z-40
Background: bg-white/95 backdrop-blur-xl
Border: border-t border-slate-200
Height: ~68px + safe-area-inset-bottom
```

**Item Aktif:**
```css
color: #EA580C;  /* orange-600 */
background: #FFF7ED;  /* orange-50 */
border-radius: rounded-xl;
```

**Item Non-aktif:**
```css
color: #94A3B8;  /* slate-400 */
hover: text-slate-600 bg-slate-50;
```

### Header Sticky
```html
<header class="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-orange-100 px-5 py-4">
```

---

## 🪟 Modal System

### Modal Overlay
```html
<!-- Overlay backdrop -->
<div class="fixed inset-0 z-[55] flex items-center justify-center p-4"
     style="background: rgba(0,0,0,0.6); backdrop-filter: blur(8px);">
```

### Modal Center (Dialog)
```html
<div class="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
     style="animation: zoomIn 0.2s ease-out;">
```

### Modal Bottom Sheet (Mobile)
```html
<div class="fixed inset-0 z-[55] flex items-end sm:items-center justify-center p-0 sm:p-4">
  <div class="w-full max-w-md bg-white sm:rounded-3xl rounded-t-3xl shadow-2xl max-h-[92vh] overflow-y-auto"
       style="animation: slideUp 0.3s cubic-bezier(0.16,1,0.3,1);">
    <!-- Pull indicator (mobile only) -->
    <div class="sm:hidden flex justify-center pt-3 pb-1">
      <div class="w-10 h-1 rounded-full bg-slate-200"></div>
    </div>
```

### Modal Konfirmasi Delete
```html
<div class="w-full max-w-sm bg-white rounded-2xl shadow-2xl">
  <div class="px-6 py-5">
    <!-- Icon warning -->
    <div class="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
      <Trash2 size={20} class="text-red-600" />
    </div>
    <!-- Judul & pesan -->
    <!-- Tombol Batal + Hapus -->
  </div>
</div>
```

---

## ⚡ Animasi & Transisi

### Keyframe Standar
```css
/* Modal muncul dari bawah (bottom sheet) */
@keyframes slideUp {
  from { transform: translateY(100%); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}

/* Toast slide up dari bawah */
@keyframes slideInUp {
  from { transform: translate(-50%, 20px); opacity: 0; }
  to   { transform: translate(-50%, 0);    opacity: 1; }
}

/* Modal zoom in */
@keyframes zoomIn {
  from { transform: scale(0.9); opacity: 0; }
  to   { transform: scale(1);   opacity: 1; }
}

/* Blob animation (di halaman auth) */
@keyframes blob {
  0%   { transform: translate(0px, 0px) scale(1); }
  33%  { transform: translate(30px, -50px) scale(1.1); }
  66%  { transform: translate(-20px, 20px) scale(0.9); }
  100% { transform: translate(0px, 0px) scale(1); }
}
```

### Transisi Standar
```css
/* Hover button */
transition-all duration-200

/* Background/color change */
transition-colors

/* Transform scale on active */
active:scale-[0.98]

/* Hover lift effect (CTA button) */
hover:-translate-y-0.5 hover:shadow-lg
```

### Loading Spinner
```html
<!-- Spinner standar -->
<div class="w-10 h-10 border-4 border-orange-200 border-t-orange-500 animate-spin rounded-full">

<!-- Spinner kecil di dalam tombol -->
<svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
</svg>
```

---

## 👤 Avatar System

### Avatar dengan Fallback Inisial
```html
<div class="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white overflow-hidden"
     style="background: linear-gradient(135deg, #F97316, #EA580C)">
  {#if user.avatar_url}
    <img src={user.avatar_url} alt="" class="w-full h-full object-cover" />
  {:else}
    {getInitials(user.full_name)}
  {/if}
</div>
```

### Helper `getInitials`
```typescript
function getInitials(name: string) {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
}
```

### Ukuran Avatar Standar
| Ukuran | Class | Digunakan di |
|---|---|---|
| XS | `w-5 h-5 text-[8px]` | Dot indicator mini |
| SM | `w-8 h-8 text-xs` | List item, row |
| MD | `w-10 h-10 text-sm` | Card, bottom nav |
| LG | `w-14 h-14 text-base` | Detail modal |
| XL | `w-20 h-20 text-2xl` | Profil hero |

---

## 🏁 Section Label Pattern

```html
<!-- Label untuk memisahkan section dalam halaman -->
<p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
  NAMA SECTION
</p>

<!-- Dengan action di kanan -->
<div class="flex justify-between items-center px-1">
  <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">SECTION</p>
  <a href="/..." class="text-[10px] font-bold text-orange-600 flex items-center gap-1">
    Lihat Semua <ArrowRight size={12} />
  </a>
</div>
```

---

## 📋 Status Color Reference

| Status | Background | Text | Dot Color |
|---|---|---|---|
| `not_started` | `bg-slate-100` | `text-slate-600` | `#94A3B8` |
| `in_progress` | `bg-blue-50` | `text-blue-700` | `#3B82F6` |
| `review` | `bg-purple-50` | `text-purple-700` | `#A855F7` |
| `revision` | `bg-amber-50` | `text-amber-700` | `#F59E0B` |
| `done` | `bg-green-50` | `text-green-700` | `#22C55E` |

| Priority | Dot Color | Label |
|---|---|---|
| `low` | `#94A3B8` | Rendah |
| `medium` | `#F59E0B` | Sedang |
| `high` | `#EF4444` | Tinggi |

---

## ✅ Checklist Konsistensi Desain

Saat membuat komponen atau halaman baru, pastikan:

- [ ] Font-family sudah di-set (`Inter` untuk body, `Plus Jakarta Sans` untuk heading)
- [ ] Background halaman menggunakan `#FFF9F0` (user) atau `#F8FAFC` (admin)
- [ ] Semua card menggunakan `rounded-2xl` atau `rounded-3xl`
- [ ] CTA button menggunakan orange gradient
- [ ] Section label menggunakan `text-[10px] font-bold uppercase tracking-widest text-slate-400`
- [ ] Loading state ada spinner `border-t-orange-500`
- [ ] Toast feedback ada untuk semua aksi yang berhasil/gagal
- [ ] Mobile: `pb-24` di main content untuk ruang BottomNav
- [ ] Hover state ada di semua elemen interaktif
- [ ] `active:scale-[0.98]` di semua tombol
