<script lang="ts">
  import { UserRound, Shield } from 'lucide-svelte';
</script>

<section id="profile" class="scroll-mt-32 mb-32">
  <h1 class="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-8 transition-colors duration-300">Profil & Keamanan</h1>
  
  <div class="prose prose-slate dark:prose-invert max-w-none mb-12">
    <p class="text-lg text-slate-500 dark:text-slate-400 leading-relaxed">
      Halaman Profil bukan hanya sekadar identitas, tetapi juga <strong>Dashboard Performa Pribadi</strong> Anda. Di sini Anda bisa memantau kontribusi Anda terhadap tim secara keseluruhan.
    </p>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
    <div class="p-8 bg-white dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] hover:shadow-xl transition-all group">
      <div class="w-14 h-14 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600 mb-6 group-hover:scale-110 transition-transform">
        <UserRound size={28} />
      </div>
      <h4 class="text-xl font-bold text-slate-900 dark:text-white mb-4">Kustomisasi Profil</h4>
      <p class="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
        Pastikan data Anda selalu mutakhir untuk memudahkan koordinasi tim. Anda dapat memperbarui:
      </p>
      <ul class="space-y-3 text-xs font-bold text-slate-600 dark:text-slate-300 list-disc pl-4">
        <li>Foto Profil (Mendukung Cropping Foto)</li>
        <li>Nomor WhatsApp Aktif</li>
        <li>Jabatan & Alamat Tinggal</li>
        <li>Tanggal Lahir & Tanggal Bergabung</li>
      </ul>
    </div>

    <div class="p-8 bg-white dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] hover:shadow-xl transition-all group">
      <div class="w-14 h-14 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center text-emerald-600 mb-6 group-hover:scale-110 transition-transform">
        <Shield size={28} />
      </div>
      <h4 class="text-xl font-bold text-slate-900 dark:text-white mb-4">Keamanan Akun</h4>
      <p class="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
        Lindungi akses pekerjaan Anda dengan fitur keamanan tingkat lanjut:
      </p>
      <ul class="space-y-3 text-xs font-bold text-slate-600 dark:text-slate-300 list-disc pl-4">
        <li><strong>Ganti Email:</strong> Memerlukan verifikasi kode ke email baru.</li>
        <li><strong>Ganti Password:</strong> Gunakan minimal 8 karakter dengan kombinasi angka.</li>
        <li><strong>Sesi Aktif:</strong> Keluar otomatis jika akun tidak digunakan dalam waktu lama.</li>
      </ul>
    </div>
  </div>

  <div class="bg-gradient-to-br from-slate-800 to-slate-950 rounded-[3rem] p-10 md:p-14 text-white">
    <div class="max-w-2xl">
      <h4 class="text-2xl font-black mb-6">📈 Statistik Performa</h4>
      <p class="text-slate-400 leading-relaxed mb-10">
        Kami merangkum seluruh aktivitas Anda dalam bentuk angka yang mudah dibaca agar Anda bisa mengevaluasi produktivitas secara mandiri:
      </p>
      <div class="grid grid-cols-2 md:grid-cols-3 gap-8">
        <div class="border-l-2 border-orange-500 pl-4">
          <div class="text-3xl font-black mb-1">98%</div>
          <div class="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Penyelesaian Tugas</div>
        </div>
        <div class="border-l-2 border-blue-500 pl-4">
          <div class="text-3xl font-black mb-1">220</div>
          <div class="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Hari Kehadiran</div>
        </div>
        <div class="border-l-2 border-emerald-500 pl-4">
          <div class="text-3xl font-black mb-1">12</div>
          <div class="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Proyek Selesai</div>
        </div>
      </div>
    </div>
  </div>
</section>
