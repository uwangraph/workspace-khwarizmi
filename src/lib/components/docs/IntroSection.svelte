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

		<div class="max-w-3xl">
			<div
				class="mb-10 inline-flex items-center gap-2 rounded-full border border-orange-100 bg-orange-50 px-3 py-1.5 text-[10px] font-black tracking-widest text-orange-600 uppercase dark:border-orange-800 dark:bg-orange-900/20 dark:text-orange-400"
			>
				<Sparkles size={12} /> Panduan Resmi
			</div>

			<h1
				class="mb-12 text-5xl leading-[0.95] font-black tracking-tight text-slate-900 transition-colors duration-300 lg:text-[5.5rem] dark:text-white"
			>
				Kelola Kerja <br />
				<span class="bg-gradient-to-r from-orange-600 to-orange-400 bg-clip-text text-transparent"
					>Tanpa Batas.</span
				>
			</h1>

			<p
				class="mb-14 max-w-xl text-xl leading-relaxed font-medium text-slate-500 transition-colors duration-300 dark:text-slate-400"
			>
				Pusat informasi lengkap untuk mengoptimalkan penggunaan Khwarizmi Workspace dalam ekosistem
				kerja tim Anda.
			</p>

			<div class="flex flex-wrap items-center gap-6">
				<a
					href="#features"
					class="flex items-center gap-3 rounded-[2rem] bg-slate-900 px-10 py-5 text-sm font-bold text-white shadow-2xl shadow-slate-900/30 transition-all hover:scale-105 active:scale-95 dark:bg-orange-600 dark:shadow-orange-600/20"
				>
					Mulai Jelajahi <ArrowRight size={18} />
				</a>
			</div>
		</div>
	</div>

	<!-- Features List (Vertical) -->
	<div id="features" class="mt-40 flex max-w-[800px] scroll-mt-24 flex-col gap-6">
		{#each [{ title: 'Real-time Sync', desc: 'Data presensi dan tugas diperbarui secara instan di semua perangkat tanpa perlu refresh halaman.', icon: Zap, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/40' }, { title: 'Satu Dashboard', desc: 'Lihat seluruh performa tim, rekapitulasi gaji, dan jadwal kerja dalam satu tampilan yang bersih.', icon: LayoutDashboard, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/40' }, { title: 'Keamanan Tinggi', desc: 'Sistem enkripsi end-to-end untuk data pribadi dan verifikasi lokasi yang tidak bisa dipalsukan.', icon: ShieldCheck, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/40' }] as feature}
			<div
				class="group flex items-start gap-8 rounded-3xl border border-slate-100 bg-white p-8 transition-all duration-500 hover:border-orange-200 hover:shadow-xl hover:shadow-orange-900/5 dark:border-slate-800 dark:bg-slate-900/40 dark:hover:border-orange-500/50"
			>
				<div
					class="h-16 w-16 {feature.bg} {feature.color} flex shrink-0 items-center justify-center rounded-2xl shadow-sm transition-transform duration-500 group-hover:scale-110"
				>
					<svelte:component this={feature.icon} size={32} strokeWidth={2.5} />
				</div>
				<div>
					<h3
						class="mb-2 text-2xl font-bold tracking-tight text-slate-900 transition-colors group-hover:text-orange-600 dark:text-slate-100"
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
</section>
