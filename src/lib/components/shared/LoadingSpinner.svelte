<script lang="ts">
  interface Props { message?: string }
  let { message = 'Memuat...' }: Props = $props()
</script>

<div class="flex flex-col items-center justify-center py-40 gap-3">
  <div class="w-10 h-10 border-4 border-orange-200 border-t-orange-500 animate-spin rounded-full"></div>
  <p class="text-xs text-slate-500">{message}</p>
</div>
