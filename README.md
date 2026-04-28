# 🚀 Workspace Khwarizmi

Productivity Dashboard premium berbasis Svelte 5 yang dirancang untuk manajemen tugas tim dengan antarmuka yang modern, cepat, dan sangat mudah digunakan.

## ✨ Fitur Utama

- **Dual View Mode**: Berpindah dengan mulus antara tampilan **Daftar** yang detail dan tampilan **Kalender** (Month-view) yang intuitif.
- **Bento Stats Dashboard**: Visualisasi statistik tugas yang minimalis dengan indikator progres *real-time*.
- **Bulk Management**: Fitur seleksi massal untuk menghapus atau menyelesaikan banyak tugas sekaligus.
- **Sub-tasks Checklist**: Kelola detail tugas lebih dalam dengan sistem checklist yang tersinkronisasi.
- **Smart Calendar**: Kalender dengan mode fokus harian untuk melihat kepadatan tugas per tanggal secara jelas.
- **Task Sharing**: Bagikan tugas ke rekan tim melalui sistem URL yang otomatis membuka detail tugas.
- **Confetti Celebration**: Efek selebrasi otomatis saat tugas mencapai progres 100%.
- **Ergonomic Design**: Antarmuka yang dioptimalkan untuk penggunaan satu tangan (Thumb-friendly UI).

## 🛠 Tech Stack

- **Framework**: [Svelte 5](https://svelte.dev/) (Runes & Snippets)
- **Styling**: [TailwindCSS 4](https://tailwindcss.com/)
- **Database & Auth**: [Supabase](https://supabase.com/)
- **Icons**: [Lucide Svelte](https://lucide.dev/)
- **Effects**: [Canvas Confetti](https://www.npmjs.com/package/canvas-confetti)
- **Notifications**: [Svelte French Toast](https://www.npmjs.com/package/svelte-french-toast)

## 📦 Instalasi

1. Clone repositori ini.
2. Install dependensi utama:
   ```bash
   npm install
   ```
3. Install library tambahan (jika belum ada):
   ```bash
   npm install @supabase/supabase-js canvas-confetti svelte-french-toast lucide-svelte
   npm install -D @types/canvas-confetti
   ```

## 🗄 Database Setup (Supabase)

Pastikan tabel `tasks` di Supabase Anda memiliki kolom berikut untuk mendukung fitur sub-tugas:

```sql
-- Tambahkan kolom subtasks ke tabel tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS subtasks JSONB DEFAULT '[]'::jsonb;
```

## 🚀 Menjalankan Project

```bash
npm run dev
```

---
Dibuat dengan ❤️ oleh Antigravity untuk Workspace Khwarizmi.
