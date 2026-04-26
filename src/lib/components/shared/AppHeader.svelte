<script lang="ts">
  interface Props {
    title: string
    subtitle?: string
    backHref?: string
    logoSrc?: string
  }

  let { title, subtitle, backHref, logoSrc }: Props = $props()
</script>

<header class="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-orange-100 px-5 py-4 flex items-center justify-between">
  <div class="flex items-center gap-3">
    {#if backHref}
      <a href={backHref} aria-label="Kembali"
         class="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-50 border border-slate-200 hover:bg-orange-50 transition-colors">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748B" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
      </a>
    {:else if logoSrc}
      <img src={logoSrc} alt="Logo" class="w-9 h-9 rounded-xl object-contain shadow-md p-1 bg-white border border-orange-200" />
    {/if}
    <div>
      <span class="font-extrabold text-slate-900 text-base tracking-tight" style="font-family:'Plus Jakarta Sans',sans-serif;">{title}</span>
      {#if subtitle}
        <p class="text-[10px] font-medium text-orange-600 mt-0.5">{subtitle}</p>
      {/if}
    </div>
  </div>
  <div class="flex items-center gap-2">
    <slot />
  </div>
</header>
