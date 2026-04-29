<script lang="ts">
    import { onMount } from 'svelte';
    import './layout.css';
    import { page } from '$app/stores';
    import { Toaster, toast } from 'svelte-french-toast';
    import { notificationService } from '$lib/services/notificationService';
    import { fetchUnreadCount, incrementUnread } from '$lib/stores/notificationStore';
    import { fade } from 'svelte/transition';
    import BottomNav from '$lib/components/BottomNav.svelte';

    // Ambil data session yang sudah di-load oleh +layout.ts
    let { data, children } = $props();
    let user = $derived(data?.session?.user);

    import { supabase } from '$lib/supabase';
    import { adminService } from '$lib/services/adminService';
    import { X, AlertTriangle, RefreshCw } from 'lucide-svelte';

    // ── Constants & Layout ──────────────────────────────
    const hiddenNavRoutes = ['/auth', '/login', '/register', '/admin'];
    const showNav = $derived(!hiddenNavRoutes.some((route) => $page.url.pathname.startsWith(route)));

    const fullWidthRoutes = ['/admin', '/auth', '/login', '/register'];
    const isFullWidthLayout = $derived(
        fullWidthRoutes.some((route) => $page.url.pathname.startsWith(route))
    );

    const NOTIF_SOUND = 'data:audio/mpeg;base64,SUQzBAAAAA...'; // (dipersingkat)

    // ── State ──────────────────────────────────────────
    let deferredPrompt = $state<any>(null);
    let showInstallBanner = $state(false);
    let showIOSInstallBanner = $state(false);
    let audio: HTMLAudioElement;

    // ── Deletion State ─────────────────────────────────
    import { setContext } from 'svelte';
    import { writable } from 'svelte/store';
    
    let isDeletionScheduled = $state(false);
    let showDeletionWarning = $state(false);
    let deletionTimeLeft = $state('');
    let userRole = $state('user');
    let isCancelingDeletion = $state(false);

    // Provide deletion state to all pages
    const deletionStore = writable(false);
    setContext('deletionStore', deletionStore);

    // ── Effects (Realtime & PWA) ───────────────────────
    $effect(() => {
        let unsubscribeRealtime = () => {};

        if (user) {
            // Ambil hitungan unread awal
            fetchUnreadCount(user.id);

            // Subscribe channel melalui service
            unsubscribeRealtime = notificationService.subscribeRealtime(user.id, (newNotif) => {
                if (!audio) audio = new Audio(NOTIF_SOUND);
                audio.currentTime = 0;
                audio.play().catch(() => {});
                
                if (newNotif && newNotif.title) {
                    toast.success(`${newNotif.title}\n${newNotif.message}`, { duration: 5000, position: 'top-center' });
                    incrementUnread();
                }
            });

            // Delay request izin FCM (memberi ruang loading UI)
            setTimeout(() => {
                notificationService.requestPermissionAndGetToken(user.id);
            }, 3000);
        }

        return () => {
            unsubscribeRealtime();
        };
    });

    onMount(() => {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

        if (isIOS && !isStandalone) showIOSInstallBanner = true;

        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            showInstallBanner = true;
        });

        window.addEventListener('appinstalled', () => {
            deferredPrompt = null;
            showInstallBanner = false;
            showIOSInstallBanner = false;
        });

        checkDeletionStatus();
    });

    async function checkDeletionStatus() {
        if (user) {
            const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single();
            if (p) userRole = p.role;
        }

        const { data: settings } = await supabase.from('app_settings').select('deletion_scheduled_at').eq('id', 1).single();
        if (settings?.deletion_scheduled_at) {
            const isStillPending = await adminService.checkScheduledDeletion(settings);
            if (isStillPending) {
                isDeletionScheduled = true;
                showDeletionWarning = true;
                deletionStore.set(true);
                import('$lib/stores/notificationStore').then(m => m.unreadCount.set(0));
                updateTimeLeft(settings.deletion_scheduled_at);
                setInterval(() => updateTimeLeft(settings.deletion_scheduled_at), 60000);
            }
        }
    }

    function updateTimeLeft(scheduledAtStr: string) {
        const scheduledAt = new Date(scheduledAtStr).getTime();
        const diff = (24 * 60 * 60 * 1000) - (Date.now() - scheduledAt);
        if (diff <= 0) {
            location.reload(); // Waktu habis, reload agar dieksekusi
        } else {
            const h = Math.floor(diff / (1000 * 60 * 60));
            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            deletionTimeLeft = `${h} jam ${m} menit`;
        }
    }

    async function handleCancelDeletion() {
        isCancelingDeletion = true;
        await adminService.cancelDeletion();
        toast.success('Penghapusan data dibatalkan!');
        isDeletionScheduled = false;
        showDeletionWarning = false;
        deletionStore.set(false);
        isCancelingDeletion = false;
        setTimeout(() => location.reload(), 1000); // Reload to fetch data again
    }

    // ── Actions ────────────────────────────────────────
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
    {#if showDeletionWarning && $page.url.pathname !== '/auth'}
        <div class="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-sm transition-all duration-300">
            <div class="w-full max-w-sm bg-white rounded-3xl p-8 text-center shadow-2xl border-2 border-red-100 relative">
                <!-- Close Button -->
                <button onclick={() => showDeletionWarning = false} class="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer">
                    <X size={16} />
                </button>

                <div class="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-5 animate-pulse">
                    <AlertTriangle size={40} class="text-red-600" />
                </div>
                <h2 class="text-xl font-black text-slate-900 mb-2" style="font-family:'Plus Jakarta Sans',sans-serif;">Pembersihan Dijadwalkan</h2>
                <p class="text-[13px] text-slate-600 mb-6 leading-relaxed">Seluruh data transaksi disembunyikan dan akan dihapus permanen dalam:</p>
                <div class="bg-red-50 text-red-600 font-black text-2xl py-3 rounded-2xl mb-6 border border-red-100 tracking-wider">
                    {deletionTimeLeft || 'Menghitung...'}
                </div>
                
                {#if userRole === 'admin'}
                    <button onclick={handleCancelDeletion} disabled={isCancelingDeletion}
                            class="w-full py-3.5 rounded-2xl text-sm font-bold text-white shadow-xl transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                            style="background: linear-gradient(135deg, #EF4444, #B91C1C);">
                        {#if isCancelingDeletion}
                            <RefreshCw size={16} class="animate-spin text-white" />
                            Membatalkan...
                        {:else}
                            BATALKAN PENGHAPUSAN
                        {/if}
                    </button>
                    <p class="text-[10px] text-slate-400 mt-4">Anda dapat membatalkan ini dari Admin Panel.</p>
                {/if}
            </div>
        </div>
    {/if}

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