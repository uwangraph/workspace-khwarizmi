<script lang="ts">
	import {
		Sparkles,
		LayoutDashboard,
		MessageSquare,
		ArrowRight,
		Zap,
		ShieldCheck
	} from 'lucide-svelte';
</script>

<section id="intro" class="mb-40 scroll-mt-32">
	<div class="relative py-20 lg:py-32">
		<!-- Background Decorative Elements -->
		<div
			class="pointer-events-none absolute top-0 -right-20 h-96 w-96 rounded-full bg-orange-100/40 blur-[100px] dark:bg-orange-900/10"
		></div>
		<div
			class="pointer-events-none absolute bottom-0 -left-20 h-72 w-72 rounded-full bg-blue-100/30 blur-[80px] dark:bg-blue-900/10"
		></div>

		<div class="max-w-4xl">
			<div
				class="mb-10 inline-flex items-center gap-2 rounded-full border border-orange-100 bg-orange-50 px-3 py-1.5 text-[10px] font-black tracking-widest text-orange-600 uppercase dark:border-orange-800 dark:bg-orange-900/20 dark:text-orange-400"
			>
				<Sparkles size={12} /> Panduan Resmi v1.0
			</div>

			<h1
				class="mb-12 text-5xl leading-[0.95] font-black tracking-tight text-slate-900 transition-colors duration-300 lg:text-[5.5rem] dark:text-white"
			>
				Efisiensi Tanpa <br />
				<span class="bg-gradient-to-r from-orange-600 to-orange-400 bg-clip-text text-transparent"
					>Batas Ruang.</span
				>
			</h1>

			<div class="space-y-6 mb-14 max-w-2xl">
				<p class="text-xl leading-relaxed font-medium text-slate-600 dark:text-slate-300">
					Selamat datang di <strong>Khwarizmi Workspace</strong>, solusi manajemen kerja all-in-one yang dirancang untuk menjembatani jarak antara efisiensi operasional dan kenyamanan pengguna.
				</p>
				<p class="text-lg leading-relaxed text-slate-500 dark:text-slate-400">
					Kami memahami bahwa di era digital, fleksibilitas adalah kunci. Platform ini hadir untuk memastikan setiap detak produktivitas tim Anda tercatat, terkelola, dan terapresiasi dengan akurasi tinggi, di mana pun mereka berada.
				</p>
			</div>

			<div class="flex flex-wrap items-center gap-6">
				<a
					href="#features"
					class="flex items-center gap-3 rounded-[2rem] bg-slate-900 px-10 py-5 text-sm font-bold text-white shadow-2xl shadow-slate-900/30 transition-all hover:scale-105 active:scale-95 dark:bg-orange-600 dark:shadow-orange-600/20"
				>
					Pelajari Fitur <ArrowRight size={18} />
				</a>
			</div>
		</div>
	</div>

	<!-- Philosophy Cards -->
	<div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-40">
		<div class="p-10 rounded-[2.5rem] bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800">
			<h3 class="text-xl font-bold mb-4 text-slate-900 dark:text-white">Filosofi Desain</h3>
			<p class="text-slate-500 dark:text-slate-400 leading-relaxed">
				Setiap piksel di Khwarizmi Workspace dirancang dengan prinsip <em>"Minimalism with Purpose"</em>. Kami menghilangkan gangguan agar Anda bisa fokus pada apa yang benar-benar penting: <strong>Hasil Kerja</strong>.
			</p>
		</div>
		<div class="p-10 rounded-[2.5rem] bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800">
			<h3 class="text-xl font-bold mb-4 text-orange-900 dark:text-orange-300">Akurasi & Integritas</h3>
			<p class="text-orange-800/70 dark:text-orange-400/70 leading-relaxed">
				Dengan integrasi GPS dan verifikasi biometrik selfie, kami menjamin integritas data presensi. Tidak ada lagi manipulasi, hanya transparansi yang membangun kepercayaan tim.
			</p>
		</div>
	</div>

	<!-- Features List (Detailed) -->
	<div id="features" class="scroll-mt-24">
		<h2 class="text-3xl font-black text-slate-900 dark:text-white mb-12 flex items-center gap-4">
			<span class="w-12 h-1 bg-orange-500 rounded-full"></span>
			Pilar Utama Platform
		</h2>
		
		<div class="flex flex-col gap-8 max-w-[900px]">
			{#each [
				{ 
					title: 'Sinkronisasi Awan (Cloud Sync)', 
					desc: 'Lupakan tombol refresh. Semua data tugas, pesan obrolan, dan catatan presensi disinkronkan secara real-time menggunakan teknologi websocket. Apa yang Anda lihat adalah data terbaru detik ini.',
					icon: Zap,
					color: 'text-orange-600 dark:text-orange-400',
					bg: 'bg-orange-50 dark:bg-orange-900/40'
				},
				{ 
					title: 'Pusat Kendali (Bento Dashboard)', 
					desc: 'Tampilan dashboard yang terinspirasi dari layout Bento Box memberikan ringkasan performa harian Anda dalam sekilas pandang. Mulai dari sisa tugas, statistik kehadiran mingguan, hingga pengumuman terbaru.',
					icon: LayoutDashboard,
					color: 'text-blue-600 dark:text-blue-400',
					bg: 'bg-blue-50 dark:bg-blue-900/40'
				},
				{ 
					title: 'Keamanan Multi-Lapis', 
					desc: 'Data Anda adalah prioritas kami. Khwarizmi Workspace menggunakan enkripsi AES-256 untuk dokumen dan koneksi SSL/TLS tingkat lanjut untuk memastikan komunikasi tim Anda tidak dapat disadap oleh pihak ketiga.',
					icon: ShieldCheck,
					color: 'text-emerald-600 dark:text-emerald-400',
					bg: 'bg-emerald-50 dark:bg-emerald-900/40'
				}
			] as feature}
				<div
					class="group flex flex-col md:flex-row items-start gap-8 rounded-[3rem] border border-slate-100 bg-white p-10 transition-all duration-500 hover:border-orange-200 hover:shadow-2xl hover:shadow-orange-900/5 dark:border-slate-800 dark:bg-slate-900/40 dark:hover:border-orange-500/50"
				>
					<div
						class="h-20 w-20 {feature.bg} {feature.color} flex shrink-0 items-center justify-center rounded-[1.5rem] shadow-sm transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110"
					>
						<svelte:component this={feature.icon} size={40} strokeWidth={2} />
					</div>
					<div>
						<h3
							class="mb-4 text-2xl font-bold tracking-tight text-slate-900 transition-colors group-hover:text-orange-600 dark:text-slate-100"
						>
							{feature.title}
						</h3>
						<p
							class="text-lg leading-relaxed font-medium text-slate-500 transition-colors duration-300 dark:text-slate-400"
						>
							{feature.desc}
						</p>
					</div>
				</div>
			{/each}
		</div>
	</div>
</section>
