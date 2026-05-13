<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { supabase } from '$lib/supabase'
  import { taskService } from '$lib/services/taskService'
  import { notificationService } from '$lib/services/notificationService'
  import type { TaskComment, TaskCommentTag } from '$lib/type'
  import toast from 'svelte-french-toast'
  import { MessageSquare, AlertTriangle, Clock, Calendar, Send, CornerDownRight, Trash2, X } from 'lucide-svelte'

  let { taskId, taskTitle, userId, userFullName, participantIds, isAdmin = false }: {
    taskId: string
    taskTitle: string
    userId: string
    userFullName: string
    participantIds: string[]
    isAdmin?: boolean
  } = $props()

  let comments = $state<TaskComment[]>([])
  let isLoading = $state(true)
  let content = $state('')
  let selectedTag = $state<TaskCommentTag>('general')
  let replyTo = $state<TaskComment | null>(null)
  let isSubmitting = $state(false)
  let channel: any = null
  let inputEl: HTMLTextAreaElement

  const TAG_CONFIG: Record<TaskCommentTag, { label: string; icon: any; bg: string; text: string; ring: string }> = {
    general:          { label: 'Catatan',          icon: MessageSquare, bg: 'bg-slate-100',  text: 'text-slate-600',  ring: 'ring-slate-200' },
    problem:          { label: 'Masalah',           icon: AlertTriangle, bg: 'bg-red-50',     text: 'text-red-600',    ring: 'ring-red-200' },
    late:             { label: 'Terlambat',         icon: Clock,         bg: 'bg-amber-50',   text: 'text-amber-600',  ring: 'ring-amber-200' },
    missed_deadline:  { label: 'Deadline Terlewat', icon: Calendar,      bg: 'bg-rose-50',    text: 'text-rose-600',   ring: 'ring-rose-200' },
  }

  let threads = $derived.by(() => {
    const top = comments.filter(c => !c.reply_to)
    return top.map(c => ({ ...c, replies: comments.filter(r => r.reply_to === c.id) }))
  })

  onMount(async () => {
    await load()

    channel = supabase.channel(`task_comments:${taskId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'task_comments', filter: `task_id=eq.${taskId}` },
        async (payload) => {
          const newId = (payload.new as any).id
          if (comments.some(c => c.id === newId)) return
          const { data } = await supabase
            .from('task_comments')
            .select('*, author:profiles!task_comments_user_id_fkey(id, full_name, avatar_url, role)')
            .eq('id', newId).single()
          if (data) comments = [...comments, data as TaskComment]
        }
      )
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'task_comments', filter: `task_id=eq.${taskId}` },
        (payload) => { comments = comments.filter(c => c.id !== (payload.old as any).id) }
      )
      .subscribe()
  })

  onDestroy(() => { if (channel) supabase.removeChannel(channel) })

  async function load() {
    isLoading = true
    try { comments = await taskService.getComments(taskId) }
    catch { comments = [] }
    finally { isLoading = false }
  }

  async function submit() {
    if (!content.trim() || isSubmitting) return
    isSubmitting = true
    try {
      await taskService.addComment(taskId, userId, content, selectedTag, replyTo?.id || null)

      const others = participantIds.filter(id => id !== userId)
      if (others.length > 0) {
        const tagLabel = TAG_CONFIG[selectedTag].label
        const title = `${tagLabel} — "${taskTitle.slice(0, 25)}${taskTitle.length > 25 ? '…' : ''}"`
        const body = `${userFullName}: ${content.trim().slice(0, 70)}${content.trim().length > 70 ? '…' : ''}`
        notificationService.sendBulk(others, 'task_comment', title, body, { task_id: taskId }).catch(() => {})
      }

      content = ''
      selectedTag = 'general'
      replyTo = null
    } catch (e: any) {
      toast.error('Gagal mengirim: ' + e.message)
    } finally {
      isSubmitting = false
    }
  }

  async function handleDelete(commentId: string) {
    try { await taskService.deleteComment(commentId) }
    catch (e: any) { toast.error('Gagal menghapus: ' + e.message) }
  }

  function setReply(comment: TaskComment) {
    replyTo = comment
    inputEl?.focus()
  }

  function formatTime(iso: string) {
    const d = new Date(/Z$|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : iso + 'Z')
    const diff = Date.now() - d.getTime()
    const m = Math.floor(diff / 60000), h = Math.floor(m / 60), day = Math.floor(h / 24)
    if (m < 1) return 'Baru saja'
    if (m < 60) return `${m} mnt lalu`
    if (h < 24) return `${h} jam lalu`
    if (day === 1) return 'Kemarin'
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
  }

  function getInitials(name?: string) {
    if (!name) return '?'
    return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
  }

  function canDelete(comment: TaskComment) {
    return comment.user_id === userId || isAdmin
  }
</script>

<div class="space-y-4">
  <div class="flex items-center justify-between px-0.5">
    <p class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Diskusi & Catatan</p>
    <span class="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{comments.length}</span>
  </div>

  <!-- Comments list -->
  {#if isLoading}
    <div class="py-6 flex items-center justify-center">
      <div class="w-5 h-5 border-2 border-slate-200 border-t-orange-400 rounded-full animate-spin"></div>
    </div>
  {:else if threads.length === 0}
    <div class="py-6 text-center border-2 border-dashed border-slate-100 rounded-2xl">
      <MessageSquare size={20} class="text-slate-300 mx-auto mb-2" />
      <p class="text-[11px] text-slate-400 font-medium">Belum ada diskusi</p>
      <p class="text-[10px] text-slate-300">Tinggalkan catatan atau laporkan masalah</p>
    </div>
  {:else}
    <div class="space-y-3 max-h-72 overflow-y-auto pr-1 scrollbar-hide">
      {#each threads as thread}
        {@const tagCfg = TAG_CONFIG[thread.tag as TaskCommentTag] ?? TAG_CONFIG.general}
        {@const TagIcon = tagCfg.icon}
        <!-- Top-level comment -->
        <div class="rounded-2xl border {thread.tag !== 'general' ? `border-current ${tagCfg.text} bg-white` : 'border-slate-100 bg-slate-50/50'} overflow-hidden">
          <div class="px-3.5 pt-3 pb-2.5">
            <div class="flex items-start gap-2.5">
              <!-- Avatar -->
              <div class="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center text-[9px] font-bold text-white shadow-sm overflow-hidden">
                {#if thread.author?.avatar_url}
                  <img src={thread.author.avatar_url} alt="" class="w-full h-full object-cover" />
                {:else}
                  {getInitials(thread.author?.full_name)}
                {/if}
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <span class="text-[11px] font-bold text-slate-700">{thread.author?.full_name || 'Pengguna'}</span>
                  {#if thread.author?.role === 'admin'}
                    <span class="text-[8px] font-bold bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full">Admin</span>
                  {/if}
                  <span class="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full {tagCfg.bg} {tagCfg.text}">
                    <TagIcon size={9} />
                    {tagCfg.label}
                  </span>
                  <span class="text-[10px] text-slate-400 ml-auto">{formatTime(thread.created_at)}</span>
                </div>
                <p class="text-[12px] text-slate-700 leading-relaxed mt-1 font-medium">{thread.content}</p>
              </div>
            </div>
            <!-- Actions -->
            <div class="flex items-center gap-3 mt-2 ml-9">
              <button onclick={() => setReply(thread)} class="text-[10px] font-semibold text-slate-400 hover:text-orange-500 flex items-center gap-1 transition-colors">
                <CornerDownRight size={10} /> Balas
              </button>
              {#if canDelete(thread)}
                <button onclick={() => handleDelete(thread.id)} class="text-[10px] font-semibold text-slate-300 hover:text-red-500 flex items-center gap-1 transition-colors ml-auto">
                  <Trash2 size={10} /> Hapus
                </button>
              {/if}
            </div>
          </div>

          <!-- Replies -->
          {#if thread.replies && thread.replies.length > 0}
            <div class="border-t border-slate-100 bg-white/70 px-3.5 py-2.5 space-y-3">
              {#each thread.replies as reply}
                {@const repTag = TAG_CONFIG[reply.tag as TaskCommentTag] ?? TAG_CONFIG.general}
                {@const RepIcon = repTag.icon}
                <div class="flex items-start gap-2">
                  <CornerDownRight size={11} class="text-slate-300 flex-shrink-0 mt-1" />
                  <div class="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center text-[8px] font-bold text-white overflow-hidden">
                    {#if reply.author?.avatar_url}
                      <img src={reply.author.avatar_url} alt="" class="w-full h-full object-cover" />
                    {:else}
                      {getInitials(reply.author?.full_name)}
                    {/if}
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-1.5 flex-wrap">
                      <span class="text-[10px] font-bold text-slate-600">{reply.author?.full_name || 'Pengguna'}</span>
                      <span class="inline-flex items-center gap-1 text-[9px] font-semibold px-1 py-0.5 rounded-full {repTag.bg} {repTag.text}">
                        <RepIcon size={8} />{repTag.label}
                      </span>
                      <span class="text-[9px] text-slate-400 ml-auto">{formatTime(reply.created_at)}</span>
                    </div>
                    <p class="text-[11px] text-slate-600 leading-relaxed mt-0.5">{reply.content}</p>
                    {#if canDelete(reply)}
                      <button onclick={() => handleDelete(reply.id)} class="text-[9px] text-slate-300 hover:text-red-500 flex items-center gap-1 mt-1 transition-colors">
                        <Trash2 size={9} /> Hapus
                      </button>
                    {/if}
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}

  <!-- Input area -->
  <div class="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
    <!-- Reply indicator -->
    {#if replyTo}
      <div class="flex items-center gap-2 px-3.5 py-2 bg-orange-50 border-b border-orange-100">
        <CornerDownRight size={12} class="text-orange-400 flex-shrink-0" />
        <span class="text-[11px] text-orange-600 font-semibold truncate flex-1">
          Balas {replyTo.author?.full_name || 'Pengguna'}: "{replyTo.content.slice(0, 40)}{replyTo.content.length > 40 ? '…' : ''}"
        </span>
        <button onclick={() => replyTo = null} class="text-orange-400 hover:text-orange-600 flex-shrink-0">
          <X size={13} />
        </button>
      </div>
    {/if}

    <!-- Tag selector -->
    <div class="flex gap-1.5 px-3 pt-3 flex-wrap">
      {#each Object.entries(TAG_CONFIG) as [tag, cfg]}
        {@const TagIcon = cfg.icon}
        <button
          onclick={() => selectedTag = tag as TaskCommentTag}
          class="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg border transition-all
            {selectedTag === tag
              ? `${cfg.bg} ${cfg.text} border-current ring-1 ${cfg.ring}`
              : 'bg-slate-50 text-slate-400 border-slate-100 hover:border-slate-200'}"
        >
          <TagIcon size={10} />{cfg.label}
        </button>
      {/each}
    </div>

    <!-- Text input -->
    <div class="flex items-end gap-2 px-3 py-3">
      <textarea
        bind:this={inputEl}
        bind:value={content}
        onkeydown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } }}
        placeholder={replyTo ? `Balas ${replyTo.author?.full_name || ''}...` : 'Tulis catatan, laporkan masalah, atau tanyakan sesuatu…'}
        rows="2"
        class="flex-1 text-[12px] text-slate-700 placeholder:text-slate-400 resize-none outline-none leading-relaxed"
      ></textarea>
      <button
        onclick={submit}
        disabled={!content.trim() || isSubmitting}
        class="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all active:scale-90
          {content.trim() ? 'bg-orange-500 text-white shadow-md shadow-orange-200' : 'bg-slate-100 text-slate-300'}"
      >
        {#if isSubmitting}
          <div class="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
        {:else}
          <Send size={13} />
        {/if}
      </button>
    </div>
    <p class="text-[9px] text-slate-300 px-3 pb-2">Enter kirim · Shift+Enter baris baru</p>
  </div>
</div>
