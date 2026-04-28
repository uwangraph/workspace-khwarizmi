<script lang="ts">
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabase';
	import './layout.css';
	import { page } from '$app/stores';
	import { Toaster } from 'svelte-french-toast';
	import { fade } from 'svelte/transition';
	import BottomNav from '$lib/components/BottomNav.svelte';

	let { children } = $props();

	// Routes yang tidak perlu BottomNav
	const hiddenNavRoutes = ['/auth', '/login', '/register', '/admin'];
	const showNav = $derived(!hiddenNavRoutes.some((route) => $page.url.pathname.startsWith(route)));

	// Routes yang perlu tampil penuh di desktop tanpa batas max-w-xl
	const fullWidthRoutes = ['/admin', '/auth', '/login', '/register'];
	const isFullWidthLayout = $derived(
		fullWidthRoutes.some((route) => $page.url.pathname.startsWith(route))
	);

	// Audio for notification
	const NOTIF_SOUND =
		'data:audio/mpeg;base64,SUQzBAAAAAABAFRYWFgAAAASAAADbWFqb3JfYnJhbmQAZGFzaABUWFhYAAAAEAAAA21pbm9yX3ZlcnNpb24AMABUWFhYAAAAHAAAA2NvbXBhdGlibGVfYnJhbmRzAGlzbzZtcDQxAFRTU0UAAAAPAAADTGF2ZjYwLjMuMTAwAAAAAAAAAAAAAAD/80MUAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAMAAAbWAAfHx8fHx8fPz8/Pz8/Pz9PT09PT09PT19fX19fX19fX39/f39/f39/f////////////////wAAAABMYXZmAAAAAAAAAAAAAAAAAAAAAAAkAAAAAAAAAAAbWAAAAAAAAAAAAP/zQxQkAAAAtYABZDAAAAlIADzSDAAAAAYAAAAIAAAAMAAAAAAAAA/8EAcB/8EAcB//zQxREAAAAtYABZDAAAAlIADzSDAAAAAAYAAAAIAAAAMAAAAAAAAA/8EAcB/8EAcB//zQxRkAAAAtYABZDAAAAlIADzSDAAAAAAYAAAAIAAAAMAAAAAAAAA/8EAcB/8EAcB';

	let deferredPrompt = $state<any>(null);
	let showInstallBanner = $state(false);
	let showIOSInstallBanner = $state(false);

	onMount(() => {
		let audio: HTMLAudioElement;

		// Deteksi iOS untuk panduan instalasi manual
		const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
		const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

		if (isIOS && !isStandalone) {
			showIOSInstallBanner = true;
		}

		// PWA Install Prompt (Android/Chrome)
		window.addEventListener('beforeinstallprompt', (e) => {
			e.preventDefault();
			deferredPrompt = e;
			showInstallBanner = true;
		});

		window.addEventListener('appinstalled', () => {
			deferredPrompt = null;
			showInstallBanner = false;
			showIOSInstallBanner = false;
			console.log('PWA: Installed');
		});

		const setupRealtime = async () => {
			const {
				data: { user }
			} = await supabase.auth.getUser();
			if (!user) return;

			const channel = supabase
				.channel(`public:notifications:user_id=eq.${user.id}`)
				.on(
					'postgres_changes',
					{
						event: 'INSERT',
						schema: 'public',
						table: 'notifications',
						filter: `user_id=eq.${user.id}`
					},
					() => {
						if (!audio) audio = new Audio(NOTIF_SOUND);
						audio.currentTime = 0;
						audio.play().catch(() => {});
					}
				)
				.subscribe();

			return () => {
				supabase.removeChannel(channel);
			};
		};

		setupRealtime();
	});
	async function installApp() {
		if (!deferredPrompt) return;
		deferredPrompt.prompt();
		const { outcome } = await deferredPrompt.userChoice;
		if (outcome === 'accepted') {
			deferredPrompt = null;
			showInstallBanner = false;
		}
	}
</script>

<svelte:head>
	<link rel="icon" type="image/png" href="/logo-khwarizmi.png" />
	<link rel="apple-touch-icon" href="/logo-khwarizmi.png" />
</svelte:head>

<div
	class={isFullWidthLayout
		? 'relative min-h-screen bg-slate-50 pt-[env(safe-area-inset-top)]'
		: 'relative mx-auto min-h-screen max-w-xl overflow-hidden bg-white pt-[env(safe-area-inset-top)] shadow-2xl sm:border-x sm:border-slate-200'}
>
	<Toaster
		position="bottom-center"
		toastOptions={{
			style:
				"font-family:'Inter',sans-serif; font-size:13px; font-weight:500; border-radius:14px; padding:12px 16px;"
		}}
	/>

	{#if showInstallBanner}
		<div class="fixed bottom-24 left-1/2 z-[100] w-[90%] max-w-sm -translate-x-1/2" transition:fade>
			<div
				class="flex items-center justify-between gap-4 rounded-2xl border border-white/20 bg-white/40 p-4 text-slate-900 shadow-2xl backdrop-blur-xl"
			>
				<div class="flex items-center gap-3">
					<div class="h-10 w-auto flex-shrink-0">
						<img src="/logo-khwarizmi.png" alt="Logo" class="h-full w-auto object-contain" />
					</div>
					<div>
						<h4 class="text-sm font-bold">Instal Workspace Khwarizmi</h4>
						<p class="text-[10px] text-slate-600">Akses lebih cepat & mudah</p>
					</div>
				</div>
				<div class="flex gap-2">
					<button
						onclick={() => (showInstallBanner = false)}
						class="px-3 py-2 text-xs font-medium text-slate-500 transition-colors hover:text-slate-900"
						>Nanti</button
					>
					<button
						onclick={installApp}
						class="rounded-xl bg-orange-500 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-orange-500/20 transition-all hover:bg-orange-600 active:scale-95"
						>Instal</button
					>
				</div>
			</div>
		</div>
	{:else if showIOSInstallBanner}
		<div class="fixed bottom-24 left-1/2 z-[100] w-[90%] max-w-sm -translate-x-1/2" transition:fade>
			<div
				class="flex flex-col gap-3 rounded-2xl border border-white/20 bg-white/40 p-4 text-slate-900 shadow-2xl backdrop-blur-xl"
			>
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-3">
						<div class="h-10 w-auto flex-shrink-0">
							<img src="/logo-khwarizmi.png" alt="Logo" class="h-full w-auto object-contain" />
						</div>
						<div>
							<h4 class="text-sm font-bold">Instal di iPhone</h4>
							<p class="text-[10px] text-slate-600">Gunakan Safari untuk fitur ini</p>
						</div>
					</div>
					<button
						onclick={() => (showIOSInstallBanner = false)}
						class="p-1 text-slate-400 hover:text-slate-900"
					>
						<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"
							><path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M6 18L18 6M6 6l12 12"
							/></svg
						>
					</button>
				</div>
				<div class="rounded-xl bg-black/5 p-3 text-[11px] leading-relaxed text-slate-700">
					Klik tombol <span class="inline-block px-1 align-middle"
						><svg
							class="h-4 w-4 text-blue-600"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							><path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
							/></svg
						></span
					> <strong>Share</strong> lalu pilih <br />
					<span class="font-bold text-slate-900">"Add to Home Screen"</span> untuk menginstal.
				</div>
			</div>
		</div>
	{/if}

	{@render children()}
	{#if showNav}
		<BottomNav />
	{/if}
</div>
