<script lang="ts">
  interface Props {
    emoji?: string
    title: string
    subtitle?: string
    actionLabel?: string
    onAction?: () => void
  }
  let { emoji = '📭', title, subtitle, actionLabel, onAction }: Props = $props()
</script>

<div class="flex flex-col items-center justify-center py-16 text-center px-4">
  <div class="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mb-5 border-2 border-orange-100">
    <span class="text-3xl">{emoji}</span>
  </div>
  <p class="text-sm font-bold text-slate-500" style="font-family:'Plus Jakarta Sans',sans-serif;">{title}</p>
  {#if subtitle}
    <p class="text-xs text-slate-400 mt-1">{subtitle}</p>
  {/if}
  {#if actionLabel && onAction}
    <button onclick={onAction}
            class="mt-4 px-5 py-2.5 rounded-xl text-sm font-semibold text-white cursor-pointer hover:shadow-md transition-shadow"
            style="background: linear-gradient(135deg, #F97316, #EA580C);">
      {actionLabel}
    </button>
  {/if}
</div>
