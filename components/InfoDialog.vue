<script setup lang="ts">
const emit = defineEmits<{ close: [] }>()
const { t } = useLang()
const box = ref<HTMLElement>()
onMounted(() => box.value?.focus())
</script>

<template>
  <div class="veil" @click.self="emit('close')" @keydown.esc="emit('close')">
    <div ref="box" class="dlg" role="dialog" aria-modal="true" :aria-label="t('info.title')" tabindex="-1">
      <h2>{{ t('info.title') }}</h2>
      <p>{{ t('info.body1') }}</p>
      <p>{{ t('info.body2') }}</p>
      <p class="keys">{{ t('info.keys') }}</p>
      <button class="ok" @click="emit('close')">{{ t('info.close') }}</button>
    </div>
  </div>
</template>

<style scoped>
.veil { position: absolute; inset: 0; z-index: 70; background: rgba(15,30,54,.35); display: grid; place-items: center; padding: 16px; }
.dlg { width: min(460px, 100%); background: #fff; border-radius: 16px; padding: 24px; box-shadow: 0 20px 60px rgba(0,0,0,.25); outline: none; }
h2 { margin: 0 0 12px; font-size: 20px; }
p { margin: 0 0 10px; color: #3e4a5c; font-size: 14px; line-height: 1.6; }
.keys { background: var(--soft); padding: 10px 12px; border-radius: 10px; font-size: 13px; }
.ok { margin-top: 8px; height: 38px; padding: 0 18px; border: 0; border-radius: 9px; background: var(--ink); color: #fff; font: 600 14px var(--font); cursor: pointer; }
</style>
