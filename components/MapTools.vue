<script setup lang="ts">
defineProps<{ heading: number; orbiting: boolean }>()
const emit = defineEmits<{ tool: [name: string] }>()
const { t } = useLang()
</script>

<template>
  <div class="tools">
    <button class="compass" :title="t('tool.north')" :aria-label="t('tool.north')" @click="emit('tool', 'north')">
      <svg :style="{ transform: `rotate(${-heading}deg)` }" width="26" height="26" viewBox="0 0 24 24">
        <path d="M12 2l4.5 10H7.5z" fill="var(--accent)" /><path d="M12 22l-4.5-10h9z" fill="#c3cad4" />
      </svg>
      <span>N</span>
    </button>
    <div class="grp">
      <button :title="t('tool.zoomin')" :aria-label="t('tool.zoomin')" @click="emit('tool', 'zoomin')"><Icon name="plus" :size="20" /></button>
      <button :title="t('tool.zoomout')" :aria-label="t('tool.zoomout')" @click="emit('tool', 'zoomout')"><Icon name="minus" :size="20" /></button>
    </div>
    <div class="grp">
      <button class="hide-m" :title="t('tool.layers')" :aria-label="t('tool.layers')" @click="emit('tool', 'layers')"><Icon name="layers" :size="19" /></button>
      <button :title="t('tool.home')" :aria-label="t('tool.home')" @click="emit('tool', 'home')"><Icon name="home" :size="19" /></button>
      <button :class="{ on: orbiting }" :title="t('tool.orbit')" :aria-label="t('tool.orbit')" @click="emit('tool', 'orbit')"><Icon name="orbit" :size="19" /></button>
      <button class="hide-m" :title="t('tool.full')" :aria-label="t('tool.full')" @click="emit('tool', 'full')"><Icon name="full" :size="19" /></button>
      <button :title="t('tool.share')" :aria-label="t('tool.share')" @click="emit('tool', 'share')"><Icon name="share" :size="19" /></button>
      <button class="hide-m" :title="t('tool.png')" :aria-label="t('tool.png')" @click="emit('tool', 'png')"><Icon name="download" :size="19" /></button>
    </div>
  </div>
</template>

<style scoped>
.tools { position: absolute; z-index: 30; right: 18px; top: calc(var(--hdr) + 18px); display: flex; flex-direction: column; gap: 10px; }
.grp, .compass { background: rgba(255,255,255,.95); backdrop-filter: blur(10px); border: 1px solid var(--line); border-radius: 12px; box-shadow: 0 6px 20px rgba(15,30,54,.14); }
.grp { display: flex; flex-direction: column; overflow: hidden; }
button { width: 46px; height: 46px; display: grid; place-items: center; border: 0; background: none; color: var(--ink); cursor: pointer; }
.grp button + button { border-top: 1px solid var(--line); }
button:hover { background: var(--soft); }
button.on { color: var(--accent); }
.compass { height: 58px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0; }
.compass svg { transition: transform .1s linear; }
.compass span { font-size: 9px; font-weight: 700; color: var(--muted); }
@media (max-width: 760px) {
  .tools { right: 8px; top: calc(var(--hdr) + 8px); gap: 6px; }
  button { width: 40px; height: 40px; }
  .compass { height: 50px; }
  .hide-m { display: none; }
}
</style>
