<script setup lang="ts">
const emit = defineEmits<{ info: [] }>()
const { t, lang, setLang } = useLang()
const base = useRuntimeConfig().app.baseURL
// Link repo do workflow đặt lúc build (NUXT_PUBLIC_REPO_URL); để trống thì ẩn nút.
const REPO_URL = useRuntimeConfig().public.repoUrl as string
</script>

<template>
  <header class="hdr">
    <div class="brand">
      <img :src="base + 'vgu-mark.svg'" alt="VGU" class="mark">
      <div class="txt">
        <div class="ttl">{{ t('app.name') }}</div>
        <div class="sub">{{ t('app.sub') }}</div>
      </div>
    </div>
    <div class="right">
      <span class="place"><i class="dot" />{{ t('app.place') }}</span>
      <button class="lang" :aria-label="lang === 'vi' ? 'Switch to English' : 'Chuyển sang tiếng Việt'" @click="setLang(lang === 'vi' ? 'en' : 'vi')">
        <Icon name="globe" :size="16" /> {{ lang === 'vi' ? 'EN' : 'VI' }}
      </button>
      <button class="icon" :aria-label="t('info.title')" :title="t('info.title')" @click="emit('info')"><Icon name="info" :size="20" /></button>
      <a v-if="REPO_URL" class="gh" :href="REPO_URL" target="_blank" rel="noopener">GitHub <Icon name="external" :size="14" /></a>
    </div>
  </header>
</template>

<style scoped>
.hdr {
  position: absolute; top: 0; left: 0; right: 0; z-index: 40; height: var(--hdr);
  display: flex; align-items: center; justify-content: space-between; padding: 0 22px;
  background: rgba(255,255,255,.94); backdrop-filter: blur(10px); border-bottom: 1px solid var(--line);
}
.brand { display: flex; align-items: center; gap: 14px; min-width: 0; }
.mark { height: 30px; width: auto; }
.txt { min-width: 0; border-left: 1px solid var(--line); padding-left: 14px; }
.ttl { font-size: 19px; font-weight: 700; color: var(--ink); letter-spacing: -.01em; }
.sub { font-size: 10px; letter-spacing: .14em; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.right { display: flex; align-items: center; gap: 10px; }
.place { font-size: 12.5px; color: var(--muted); display: flex; align-items: center; gap: 7px; margin-right: 8px; }
.dot { width: 6px; height: 6px; border-radius: 50%; background: var(--accent); }
.lang, .icon, .gh {
  display: inline-flex; align-items: center; gap: 6px; height: 34px; padding: 0 10px; border-radius: 9px;
  border: 1px solid transparent; background: none; color: var(--ink); font: 600 13px var(--font); cursor: pointer; text-decoration: none;
}
.lang:hover, .icon:hover, .gh:hover { background: var(--soft); }
.lang { border-color: var(--line); }
@media (max-width: 760px) {
  .hdr { padding: 0 12px; }
  .place, .gh { display: none; }
  .mark { height: 24px; }
  .ttl { font-size: 16px; }
  .sub { font-size: 8.5px; letter-spacing: .08em; max-width: 46vw; }
  .txt { padding-left: 10px; }
}
</style>
