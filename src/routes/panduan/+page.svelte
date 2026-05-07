<script lang="ts">
	import { ArrowLeft, BookOpen, LogIn, LayoutDashboard, CalendarCheck, CheckSquare, Bell, Shield, MapPin, Clock, Camera, UserRound } from 'lucide-svelte';
</script>

<svelte:head>
	<title>Panduan Pengguna — Workspace Khwarizmi</title>
</svelte:head>

<div class="min-h-screen bg-[#FFF9F0]/30 font-sans">
	<!-- Header -->
	<header class="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-orange-100 px-5 py-4">
		<div class="max-w-lg mx-auto flex items-center gap-4">
			<a href="/" class="p-2 -ml-2 rounded-xl hover:bg-orange-50 text-slate-600 transition-colors">
				<ArrowLeft size={20} />
			</a>
			<div>
				<h1 class="font-extrabold text-slate-900 text-lg" style="font-family:'Plus Jakarta Sans',sans-serif;">Panduan Pengguna</h1>
				<p class="text-[11px] font-medium text-slate-500 mt-0.5">Workspace Khwarizmi</p>
			</div>
		</div>
	</header>

	<main class="max-w-lg mx-auto px-5 py-8 space-y-10">
		<!-- Intro -->
		<section class="text-center space-y-4">
			<div class="w-16 h-16 bg-orange-100 rounded-3xl mx-auto flex items-center justify-center shadow-inner">
				<BookOpen size={32} class="text-orange-600" />
			</div>
			<h2 class="text-2xl font-black text-slate-900" style="font-family:'Plus Jakarta Sans',sans-serif;">Selamat Datang!</h2>
			<p class="text-slate-600 text-sm leading-relaxed max-w-lg mx-auto">
				Aplikasi ini dirancang untuk memudahkan Anda dalam mengelola kehadiran (presensi) dan memantau tugas kerja sehari-hari dengan cepat dan nyaman.
			</p>
		</section>

		<!-- Instalasi PWA -->
		<section class="bg-white rounded-3xl p-6 shadow-sm border border-orange-100">
			<div class="flex items-center gap-3 mb-4">
				<div class="p-2 bg-blue-50 text-blue-600 rounded-xl">
					<LogIn size={20} />
				</div>
				<h3 class="font-bold text-slate-800 text-lg">1. Cara Mengakses & Instalasi</h3>
			</div>
			<p class="text-sm text-slate-600 mb-4 leading-relaxed">
				Workspace Khwarizmi dapat diinstal langsung ke HP Anda tanpa melalui Play Store atau App Store.
			</p>
			<div class="grid sm:grid-cols-2 gap-4">
				<div class="bg-[#FFF9F0]/50 rounded-2xl p-4 border border-orange-100/50">
					<h4 class="font-bold text-slate-800 mb-2 text-sm">🤖 Pengguna Android</h4>
					<p class="text-[13px] text-slate-600">Saat membuka aplikasi, klik tombol <strong>"Instal Workspace Khwarizmi"</strong> yang muncul di bagian bawah layar Anda.</p>
				</div>
				<div class="bg-[#FFF9F0]/50 rounded-2xl p-4 border border-orange-100/50">
					<h4 class="font-bold text-slate-800 mb-2 text-sm">🍎 Pengguna iPhone (iOS)</h4>
					<p class="text-[13px] text-slate-600">Buka menggunakan <strong>Safari</strong>, ketuk tombol <strong>Share</strong> (Bagikan) di bawah, lalu pilih <strong>"Add to Home Screen"</strong>.</p>
				</div>
			</div>
		</section>

		<!-- Navigasi Utama -->
		<section class="space-y-4">
			<h3 class="font-bold text-slate-800 text-xl px-2">2. Navigasi Utama</h3>
			
			<div class="grid gap-4">
				<!-- Beranda -->
				<div class="bg-white rounded-3xl p-5 shadow-sm border border-orange-100 flex gap-4">
					<div class="p-3 bg-orange-50 text-orange-600 rounded-2xl h-fit">
						<LayoutDashboard size={24} />
					</div>
					<div>
						<h4 class="font-bold text-slate-800 mb-2">Beranda (Dashboard)</h4>
						<ul class="text-[13px] text-slate-600 space-y-2 list-disc list-inside">
							<li>Memantau tingkat penyelesaian tugas harian Anda.</li>
							<li>Melihat ringkasan kehadiran berdasarkan sesi.</li>
							<li>Pintasan cepat untuk tugas prioritas atau mendekati deadline.</li>
						</ul>
					</div>
				</div>

				<!-- Presensi -->
				<div class="bg-white rounded-3xl p-5 shadow-sm border border-orange-100 flex gap-4">
					<div class="p-3 bg-emerald-50 text-emerald-600 rounded-2xl h-fit">
						<CalendarCheck size={24} />
					</div>
					<div>
						<h4 class="font-bold text-slate-800 mb-2">Presensi</h4>
						<ul class="text-[13px] text-slate-600 space-y-2 list-disc list-inside">
							<li>Gunakan halaman ini untuk melakukan <strong>Check-in</strong> dan <strong>Check-out</strong>.</li>
							<li>Pastikan GPS/Lokasi HP Anda aktif saat menekan tombol presensi.</li>
							<li>Lihat riwayat kehadiran Anda dengan mudah.</li>
						</ul>
					</div>
				</div>

				<!-- Tugas -->
				<div class="bg-white rounded-3xl p-5 shadow-sm border border-orange-100 flex gap-4">
					<div class="p-3 bg-indigo-50 text-indigo-600 rounded-2xl h-fit">
						<CheckSquare size={24} />
					</div>
					<div>
						<h4 class="font-bold text-slate-800 mb-2">Tugas</h4>
						<ul class="text-[13px] text-slate-600 space-y-2 list-disc list-inside">
							<li>Pusat pengelolaan pekerjaan Anda dengan label batas waktu.</li>
							<li>Gunakan fitur Sub-tugas (Checklist) untuk pekerjaan mendetail.</li>
							<li>Tugas yang mencapai 100% akan memunculkan selebrasi otomatis! 🎉</li>
						</ul>
					</div>
				</div>
			</div>
		</section>

		<!-- Aturan Presensi & Geofencing -->
		<section class="space-y-4">
			<h3 class="font-bold text-slate-800 text-xl px-2">3. Aturan Presensi & Lokasi</h3>
			<div class="bg-white rounded-3xl p-6 shadow-sm border border-orange-100 space-y-4">
				<div class="flex items-start gap-3">
					<div class="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
						<MapPin size={18} />
					</div>
					<div>
						<h4 class="font-bold text-slate-800 text-sm">Verifikasi Lokasi (Geofencing)</h4>
						<p class="text-[13px] text-slate-600 leading-relaxed mt-1">
							Untuk menjaga akurasi, presensi hanya dapat dilakukan jika Anda berada dalam <strong>radius yang ditentukan</strong> dari lokasi kantor. Pastikan GPS HP Anda aktif dan memberikan izin lokasi ke browser.
						</p>
					</div>
				</div>
				<div class="flex items-start gap-3">
					<div class="p-2 bg-amber-50 text-amber-600 rounded-xl">
						<Clock size={18} />
					</div>
					<div>
						<h4 class="font-bold text-slate-800 text-sm">Ketentuan Terlambat</h4>
						<p class="text-[13px] text-slate-600 leading-relaxed mt-1">
							Toleransi keterlambatan adalah <strong>10 menit</strong> dari waktu mulai sesi. Jika melewati batas tersebut, Anda akan diminta memasukkan alasan keterlambatan sebelum dapat melakukan Check-in.
						</p>
					</div>
				</div>
				<div class="flex items-start gap-3">
					<div class="p-2 bg-blue-50 text-blue-600 rounded-xl">
						<Camera size={18} />
					</div>
					<div>
						<h4 class="font-bold text-slate-800 text-sm">Bukti Selfie</h4>
						<p class="text-[13px] text-slate-600 leading-relaxed mt-1">
							Setiap Check-in dan Check-out mewajibkan pengambilan foto selfie sebagai bukti kehadiran yang valid.
						</p>
					</div>
				</div>
			</div>
		</section>

		<!-- Pengajuan Izin/Sakit -->
		<section class="space-y-4">
			<h3 class="font-bold text-slate-800 text-xl px-2">4. Izin & Sakit</h3>
			<div class="bg-white rounded-3xl p-6 shadow-sm border border-orange-100">
				<p class="text-sm text-slate-600 mb-4 leading-relaxed">
					Jika Anda berhalangan hadir, Anda dapat mengajukan izin atau sakit melalui tombol <strong>"Izin / Sakit"</strong> di halaman Presensi.
				</p>
				<div class="space-y-3">
					<div class="bg-[#FFF9F0]/50 p-4 rounded-2xl border border-orange-100/50">
						<h4 class="font-bold text-slate-800 text-xs uppercase tracking-wider mb-2">Langkah Pengajuan:</h4>
						<ol class="text-[13px] text-slate-600 space-y-2 list-decimal list-inside">
							<li>Pilih jenis pengajuan (Izin atau Sakit).</li>
							<li>Pilih sesi yang relevan atau "Semua Sesi".</li>
							<li>Tuliskan alasan yang jelas dan jujur.</li>
							<li>Pantau status pengajuan (Pending/Disetujui/Ditolak) di bagian riwayat pengajuan.</li>
						</ol>
					</div>
				</div>
			</div>
		</section>

		<!-- Pengelolaan Profil -->
		<section class="space-y-4">
			<h3 class="font-bold text-slate-800 text-xl px-2">5. Profil & Keamanan</h3>
			<div class="grid gap-4">
				<div class="bg-white rounded-3xl p-5 shadow-sm border border-orange-100 flex gap-4">
					<div class="p-3 bg-[#FFF9F0]/50 text-slate-600 rounded-2xl h-fit">
						<UserRound size={24} />
					</div>
					<div>
						<h4 class="font-bold text-slate-800 mb-1">Update Informasi</h4>
						<p class="text-[13px] text-slate-600 leading-relaxed">
							Ubah foto profil, nomor WhatsApp, alamat, dan jabatan Anda di halaman Profil untuk memastikan data tim selalu terbaru.
						</p>
					</div>
				</div>
				<div class="bg-white rounded-3xl p-5 shadow-sm border border-orange-100 flex gap-4">
					<div class="p-3 bg-red-50 text-red-500 rounded-2xl h-fit">
						<Shield size={24} />
					</div>
					<div>
						<h4 class="font-bold text-slate-800 mb-1">Keamanan Akun</h4>
						<p class="text-[13px] text-slate-600 leading-relaxed">
							Gunakan fitur <strong>Ganti Email</strong> atau <strong>Ganti Password</strong> secara berkala untuk menjaga keamanan akun Anda.
						</p>
					</div>
				</div>
			</div>
		</section>

		<!-- Manajemen Tugas Lanjutan -->
		<section class="space-y-4">
			<h3 class="font-bold text-slate-800 text-xl px-2">6. Manajemen Tugas Lanjutan</h3>
			<div class="grid sm:grid-cols-2 gap-4">
				<div class="bg-white rounded-3xl p-5 shadow-sm border border-orange-100">
					<h4 class="font-bold text-slate-800 mb-2 flex items-center gap-2">
						<svg class="w-4 h-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
						Tampilan Kalender
					</h4>
					<p class="text-[12px] text-slate-600 leading-relaxed">
						Gunakan tab <strong>Kalender</strong> untuk melihat sebaran deadline tugas Anda dalam format bulanan yang lebih intuitif.
					</p>
				</div>
				<div class="bg-white rounded-3xl p-5 shadow-sm border border-orange-100">
					<h4 class="font-bold text-slate-800 mb-2 flex items-center gap-2">
						<svg class="w-4 h-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>
						Seleksi Massal (Bulk)
					</h4>
					<p class="text-[12px] text-slate-600 leading-relaxed">
						Aktifkan ikon checklist di kanan atas daftar tugas untuk memilih banyak tugas sekaligus guna dihapus atau ditandai selesai.
					</p>
				</div>
				<div class="bg-white rounded-3xl p-5 shadow-sm border border-orange-100">
					<h4 class="font-bold text-slate-800 mb-2 flex items-center gap-2">
						<svg class="w-4 h-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
						Kolaborasi Tim
					</h4>
					<p class="text-[12px] text-slate-600 leading-relaxed">
						Anda bisa mengundang rekan tim saat membuat tugas. Rekan yang diundang akan menerima notifikasi dan harus <strong>menerima undangan</strong> untuk bergabung.
					</p>
				</div>
				<div class="bg-white rounded-3xl p-5 shadow-sm border border-orange-100">
					<h4 class="font-bold text-slate-800 mb-2 flex items-center gap-2">
						<svg class="w-4 h-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/></svg>
						Sematkan (Pin)
					</h4>
					<p class="text-[12px] text-slate-600 leading-relaxed">
						Klik ikon pin pada detail tugas untuk menjaga tugas prioritas agar selalu berada di posisi paling atas daftar.
					</p>
				</div>
			</div>
		</section>

		<!-- FAQ & Tips -->
		<section class="space-y-4">
			<h3 class="font-bold text-slate-800 text-xl px-2">7. FAQ & Tips</h3>
			<div class="bg-white rounded-3xl p-6 shadow-sm border border-orange-100 space-y-5">
				<div class="space-y-2">
					<h4 class="text-sm font-bold text-slate-800">🤔 Mengapa tombol Presensi tidak bisa ditekan?</h4>
					<p class="text-[13px] text-slate-600 leading-relaxed">
						Hal ini biasanya terjadi karena Anda berada di luar radius kantor atau GPS belum akurat. Cobalah untuk <strong>merefresh lokasi</strong> melalui tombol refresh di kotak Geofencing.
					</p>
				</div>
				<div class="h-px bg-orange-100/50 w-full"></div>
				<div class="space-y-2">
					<h4 class="text-sm font-bold text-slate-800">📬 Bagaimana cara mendapatkan notifikasi push?</h4>
					<p class="text-[13px] text-slate-600 leading-relaxed">
						Pastikan Anda memberikan izin notifikasi (Allow Notifications) saat diminta oleh browser pertama kali. Jika menggunakan iPhone, pastikan aplikasi sudah di-Add to Home Screen.
					</p>
				</div>
				<div class="h-px bg-orange-100/50 w-full"></div>
				<div class="space-y-2">
					<h4 class="text-sm font-bold text-slate-800">📸 Tips Selfie yang Valid</h4>
					<p class="text-[13px] text-slate-600 leading-relaxed">
						Pastikan wajah Anda terlihat jelas dan pencahayaan cukup. Foto yang terlalu gelap atau buram mungkin akan menyulitkan proses verifikasi oleh Admin.
					</p>
				</div>
			</div>
		</section>

		<!-- Fitur Penting -->
		<section class="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-6 shadow-xl text-white">
			<h3 class="font-bold text-white text-lg mb-6 flex items-center gap-2">
				<Bell size={20} class="text-yellow-400" /> Fitur Penting Lainnya
			</h3>
			
			<div class="space-y-6">
				<div class="flex gap-4">
					<div class="mt-1">
						<div class="w-2 h-2 rounded-full bg-yellow-400"></div>
					</div>
					<div>
						<h4 class="font-bold text-white text-sm mb-1">Notifikasi Real-time</h4>
						<p class="text-[13px] text-slate-300 leading-relaxed">
							Tekan ikon lonceng di pojok kanan atas Beranda. Anda akan mendapatkan pemberitahuan langsung jika ada tugas baru, pembaruan dari rekan kerja, atau deadline yang sudah dekat.
						</p>
					</div>
				</div>

				<div class="flex gap-4">
					<div class="mt-1">
						<div class="w-2 h-2 rounded-full bg-red-400"></div>
					</div>
					<div>
						<h4 class="font-bold text-white text-sm mb-1 flex items-center gap-2">
							Mode Admin <Shield size={14} class="text-red-400" />
						</h4>
						<p class="text-[13px] text-slate-300 leading-relaxed">
							Khusus bagi pengguna dengan akses Admin, akan muncul banner khusus di Dashboard untuk masuk ke Panel Admin. Panel ini digunakan untuk memantau kehadiran anggota tim dan menyetujui permohonan.
						</p>
					</div>
				</div>
			</div>
		</section>

	</main>
</div>
