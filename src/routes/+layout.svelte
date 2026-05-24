<script lang="ts">
    import { onMount } from 'svelte';
    import { appearanceStore } from '$lib/stores/appearanceStore';
    import './layout.css';
    import { page } from '$app/stores';
    import { Toaster, toast } from 'svelte-french-toast';
    import { notificationService } from '$lib/services/notificationService';
    import { fetchUnreadCount, incrementUnread } from '$lib/stores/notificationStore';
    import { fade } from 'svelte/transition';
    import BottomNav from '$lib/components/BottomNav.svelte';
    import { chatService } from '$lib/services/chatService';
    import { dismissIncomingChat, initGlobalChat, latestIncomingChat } from '$lib/stores/globalChatStore';

    // Ambil data session yang sudah di-load oleh +layout.ts
    let { data, children } = $props();
    let user = $derived(data?.session?.user);

    import { supabase } from '$lib/supabase';
    import { adminService } from '$lib/services/adminService';
    import { X, AlertTriangle, RefreshCw } from 'lucide-svelte';

    // ── Constants & Layout ──────────────────────────────
    const hiddenNavRoutes = ['/auth', '/login', '/register', '/admin', '/notifications', '/docs'];
    const showNav = $derived(
        !hiddenNavRoutes.some((route) => $page.url.pathname.startsWith(route)) &&
        // Sembunyikan nav hanya di dalam ruang chat (sub-route), bukan di halaman daftar /chat
        !($page.url.pathname.startsWith('/chat/') && $page.url.pathname.length > 6)
    );

    const fullWidthRoutes = ['/admin', '/auth', '/login', '/register', '/docs'];
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
    let chatReplyText = $state('');
    let isReplyingChat = $state(false);

    // Provide deletion state to all pages
    const deletionStore = writable(false);
    setContext('deletionStore', deletionStore);

    // ── Effects (Realtime & PWA) ───────────────────────
    // ── Global Heartbeat (Online Status) ────────────────
    import { authService } from '$lib/services/authService';
    import { refreshGlobalChat } from '$lib/stores/globalChatStore';

    $effect(() => {
        let interval: any;
        if (user) {
            // Update immediately
            authService.updateLastSeen(user.id);
            // Update every 30 seconds
            interval = setInterval(() => {
                authService.updateLastSeen(user.id);
            }, 30000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    });

    // Refresh chat saat user kembali ke tab (fallback jika realtime terputus)
    $effect(() => {
        if (!user) return;
        const uid = user.id;
        const onVisible = () => {
            if (document.visibilityState === 'visible') {
                refreshGlobalChat(uid);
            }
        };
        document.addEventListener('visibilitychange', onVisible);
        return () => document.removeEventListener('visibilitychange', onVisible);
    });

    $effect(() => {
        let unsubscribeRealtime = () => {};

        if (user) {
            // Ambil hitungan unread awal
            fetchUnreadCount(user.id);
            
            // Inisialisasi global chat store untuk real-time dan badge nav
            initGlobalChat(user.id);

            // Subscribe channel melalui service
            unsubscribeRealtime = notificationService.subscribeRealtime(user.id, (newNotif) => {
                if (!audio) audio = new Audio(NOTIF_SOUND);
                audio.currentTime = 0;
                audio.play().catch(() => {
                    console.warn('[Layout] Audio playback blocked by browser.');
                });
                
                if (newNotif && newNotif.title) {
                    toast.success(`${newNotif.title}\n${newNotif.message}`, { 
                        duration: 5000, 
                        position: 'top-center' 
                    });
                    incrementUnread();
                    
                    // Munculkan notifikasi sistem (local) HANYA jika tab sedang tidak aktif/tersembunyi
                    // Ini menangani kasus tab aktif di background, bukan aplikasi tertutup
                    if (document.visibilityState === 'hidden' && 'Notification' in window && Notification.permission === 'granted') {
                        try {
                            const systemNotif = new Notification(newNotif.title, {
                                body: newNotif.message,
                                icon: '/logo-khwarizmi-192.png',
                                badge: '/logo-khwarizmi-192.png',
                                tag: 'local-notif-' + newNotif.id
                            });
                            systemNotif.onclick = () => {
                                window.focus();
                                systemNotif.close();
                            };
                        } catch (e) {
                            console.error('[Layout] Failed to show local notification:', e);
                        }
                    }
                }
            });

            // Meminta izin FCM memerlukan interaksi pengguna (User Gesture) di iOS & Android PWA.
            // Jika sudah diizinkan, langsung ambil token. Jika belum, tunggu klik pertama.
            const initFCM = () => {
                const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
                const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
                
                // Di iOS, push notification web hanya bekerja di mode Standalone (PWA)
                if (isIOS && !isStandalone) {
                    console.log('[Layout] FCM skipped: iOS requires PWA Mode for Push Notifications.');
                    return;
                }

                if ('Notification' in window) {
                    if (Notification.permission !== 'denied') {
                        notificationService.requestPermissionAndGetToken(user.id);
                    } else {
                        console.warn('[Layout] FCM skipped: Notification permission denied.');
                    }
                }
            };

            if ('Notification' in window && Notification.permission === 'granted') {
                initFCM();
            } else {
                const onFirstInteraction = () => {
                    initFCM();
                    document.removeEventListener('click', onFirstInteraction);
                    document.removeEventListener('touchstart', onFirstInteraction);
                };
                document.addEventListener('click', onFirstInteraction);
                document.addEventListener('touchstart', onFirstInteraction, { passive: true });
            }
        }

        return () => {
            unsubscribeRealtime();
        };
    });

    let shouldShowChatPopup = $derived(
        !!$latestIncomingChat &&
        !!user &&
        $latestIncomingChat.message?.sender_id !== user.id &&
        $page.url.pathname !== `/chat/${$latestIncomingChat.room?.id}`
    );

    // Session check is now only on load (onMount) or through Supabase auth state change.

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

        appearanceStore.init();
        checkDeletionStatus();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_OUT') {
                window.location.href = '/auth';
            }
            if (event === 'TOKEN_REFRESHED' && !session) {
                window.location.href = '/auth';
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    });

    async function validateUserSession() {
        if (user) {
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('id')
                .eq('id', user.id)
                .single();
            
            if (error || !profile) {
                await supabase.auth.signOut();
                window.location.href = '/auth';
            }
        }
    }

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
                setInterval(() => updateTimeLeft(settings.deletion_scheduled_at), 30000);
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
        const { error } = await adminService.cancelDeletion();
        if (error) {
            toast.error(error);
            isCancelingDeletion = false;
            return;
        }
        toast.success('Penghapusan data dibatalkan!');
        isDeletionScheduled = false;
        showDeletionWarning = false;
        deletionStore.set(false);
        isCancelingDeletion = false;
        setTimeout(() => location.reload(), 1000); // Reload to fetch data again
    }

    function openIncomingChat() {
        const roomId = $latestIncomingChat?.room?.id;
        dismissIncomingChat();
        chatReplyText = '';
        if (roomId) window.location.href = `/chat/${roomId}`;
    }

    async function replyIncomingChat() {
        const incoming = $latestIncomingChat;
        if (!incoming?.room?.id || !user || !chatReplyText.trim()) return;
        isReplyingChat = true;
        try {
            await chatService.sendTextMessage(incoming.room.id, user.id, chatReplyText.trim(), {
                reply_to: incoming.message.id,
                reply_name: incoming.message.sender?.full_name,
                reply_content: incoming.message.content
            });
            toast.success('Balasan terkirim');
            chatReplyText = '';
            dismissIncomingChat();
        } catch {
            toast.error('Gagal membalas pesan');
        } finally {
            isReplyingChat = false;
        }
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
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
    <link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;600;700;800&family=DM+Sans:wght@400;500;600;700;800&family=Fredoka:wght@400;500;600;700&family=Nunito:wght@500;600;700;800&family=Plus+Jakarta+Sans:wght@500;600;700;800&family=Quicksand:wght@500;600;700&display=swap" rel="stylesheet" />
    <link rel="icon" type="image/png" href="/logo-khwarizmi.png" />
    <link rel="apple-touch-icon" href="/logo-khwarizmi.png" />
</svelte:head>

<div
	class={isFullWidthLayout
		? 'relative min-h-screen bg-slate-50 pt-[env(safe-area-inset-top)]'
		: 'relative mx-auto min-h-screen max-w-xl overflow-hidden bg-white pt-[env(safe-area-inset-top)] shadow-2xl sm:border-x sm:border-slate-200'}
>
    {#if shouldShowChatPopup}
        <div class="fixed inset-x-4 top-[calc(env(safe-area-inset-top)+14px)] z-[130] sm:left-auto sm:right-6 sm:w-[360px]" transition:fade>
            <div class="overflow-hidden rounded-[28px] border border-orange-100 bg-white/95 shadow-2xl backdrop-blur-xl">
                <div class="flex items-start gap-3 px-4 py-4 hover:bg-orange-50/60 transition-colors">
                    <img
                        src={$latestIncomingChat.message?.sender?.avatar_url || $latestIncomingChat.room?.partner_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent($latestIncomingChat.message?.sender?.full_name || $latestIncomingChat.room?.name || 'C')}&background=random&color=fff&size=80`}
                        alt="Sender"
                        class="h-11 w-11 shrink-0 rounded-2xl object-cover bg-slate-100"
                    />
                    <button onclick={openIncomingChat} class="min-w-0 flex-1 text-left">
                        <p class="text-[11px] font-black uppercase tracking-wide text-orange-500">Pesan Masuk</p>
                        <p class="truncate text-sm font-bold text-slate-800">
                            {$latestIncomingChat.room?.type === 'group'
                                ? `${$latestIncomingChat.message?.sender?.full_name || 'Anggota'} · ${$latestIncomingChat.room?.name || 'Grup'}`
                                : $latestIncomingChat.room?.name || $latestIncomingChat.message?.sender?.full_name || 'Obrolan'}
                        </p>
                        <p class="mt-1 line-clamp-2 text-xs text-slate-500">
                            {$latestIncomingChat.message?.type === 'text'
                                ? $latestIncomingChat.message?.content
                                : $latestIncomingChat.message?.type === 'image'
                                    ? 'Mengirim foto'
                                    : $latestIncomingChat.message?.type === 'audio'
                                        ? 'Mengirim pesan suara'
                                        : $latestIncomingChat.message?.type === 'file'
                                            ? 'Mengirim berkas'
                                            : 'Mengirim pesan'}
                        </p>
                    </button>
                    <button onclick={() => { dismissIncomingChat(); chatReplyText = ''; }} class="rounded-full p-2 text-slate-300 hover:bg-slate-100 hover:text-slate-500">
                        <X size={16} />
                    </button>
                </div>

                <div class="border-t border-slate-100 px-4 py-3">
                    <input
                        type="text"
                        bind:value={chatReplyText}
                        placeholder="Balas cepat..."
                        onkeydown={(e) => e.key === 'Enter' && replyIncomingChat()}
                        class="mb-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-orange-400 focus:bg-white"
                    />
                    <div class="flex items-center gap-2">
                        <button onclick={openIncomingChat} class="flex-1 rounded-2xl bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-200">
                            Baca
                        </button>
                        <button onclick={replyIncomingChat} disabled={isReplyingChat || !chatReplyText.trim()} class="flex-1 rounded-2xl bg-orange-500 px-4 py-2.5 text-xs font-bold text-white hover:bg-orange-600 disabled:opacity-50">
                            {isReplyingChat ? 'Mengirim...' : 'Balas'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    {/if}

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
				"font-family:var(--app-font-family); font-size:13px; font-weight:500; border-radius:16px; padding:10px 16px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05); border: 1px solid rgba(0,0,0,0.05);"
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
						<h4 class="text-sm font-bold">Instal Khwarizmi Workspace</h4>
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
                            aria-label="Tutup banner iPhone"
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
