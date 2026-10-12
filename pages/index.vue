<script setup lang="ts">
import type { CampusScene, Building, LayerName, ViewKind, Quality } from '~/lib/campus/scene'
import type { Preset } from '~/lib/campus/presets'

const { t, lang } = useLang()
const base = useRuntimeConfig().app.baseURL

const canvas = ref<HTMLCanvasElement>()
let scene: CampusScene | null = null

const progress = ref(0)
const ready = ref(false)
const failed = ref('')
const buildings = ref<Building[]>([])
const selected = ref<string | null>(null)
const tab = ref<'explore' | 'layers' | 'env'>('explore')
const preset = ref<Preset>('day')
const quality = ref<Quality>('auto')
const level = ref(1)
const layers = reactive<Record<LayerName, boolean>>({ buildings: true, trees: true, grass: true, roads: true, labels: true })
const orbiting = ref(false)
const heading = ref(0)
const target = ref<[number, number]>([0, 0])
const showInfo = ref(false)
const toast = ref('')
let toastTimer: any

// ── tham quan tự động ──
const TOUR_ORDER = ['AD', 'B1', 'B2', 'B3', 'B5', 'B6', 'LI', 'CH', 'LH', 'FC', 'D1', 'D2', 'SH', 'san-van-dong', 'CP', 'GH', 'EXH']
const tour = reactive({ on: false, paused: false, index: 0 })
let tourTimer: any
const tourList = computed(() => TOUR_ORDER.filter(id => buildings.value.some(b => b.id === id)))

function flash(msg: string) {
  toast.value = msg
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.value = ''), 2200)
}

// ── nhãn: cập nhật vị trí trực tiếp trên DOM mỗi khung hình (không qua Vue) ──
const labelEls = new Map<string, HTMLElement>()
function setLabelEl(id: string, el: any) { if (el) labelEls.set(id, el as HTMLElement); else labelEls.delete(id) }
function updateLabels() {
  if (!scene) return
  heading.value = scene.heading()
  const tg = scene.controls.target
  target.value = [tg.x, tg.z]
  for (const b of buildings.value) {
    const el = labelEls.get(b.id); if (!el) continue
    const p = layers.labels ? scene.project(b.center[0], b.height + 6, b.center[1]) : null
    const maxD = window.innerWidth <= 760 ? 1900 : 1100
    const far = selected.value ? (b.id !== selected.value && p && p.d > 320) : (p && p.d > maxD)
    if (!p || far) { el.style.opacity = '0'; el.style.pointerEvents = 'none'; continue }
    const s = Math.max(0.78, Math.min(1, 520 / p.d + 0.55))
    el.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -100%) scale(${s})`
    el.style.opacity = '1'
    el.style.pointerEvents = 'auto'
    el.style.zIndex = String(10000 - Math.round(p.d))
  }
}

onMounted(async () => {
  try {
    const gl = document.createElement('canvas').getContext('webgl2')
    if (!gl) { failed.value = t('nowebgl'); return }
    const { CampusScene } = await import('~/lib/campus/scene')
    scene = new CampusScene(canvas.value!, base, {
      onProgress: p => (progress.value = p),
      onSelect: id => { selected.value = id; if (id) tab.value = 'explore' },
      onFrame: updateLabels,
      onQuality: l => (level.value = l),
    })
    window.addEventListener('resize', onResize)
    const panelEl = document.querySelector('.panel') as HTMLElement | null
    if (panelEl) new ResizeObserver(syncInsets).observe(panelEl)
    syncInsets()
    scene.start()
    await scene.load()
    buildings.value = scene.buildings
    ready.value = true
    if (location.hash) {
      const r = scene.applyHash(location.hash)
      if (r.preset) preset.value = r.preset
    } else {
      scene.home(2.4)
    }
    ;(window as any).__vgu3d = scene // tiện kiểm tra trong DevTools
  } catch (e: any) {
    console.error(e)
    failed.value = t('error')
  }
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  clearTimeout(tourTimer)
  scene?.dispose()
})
function onResize() { syncInsets(); scene?.resize() }
// Báo cho cảnh biết phần màn hình bị bảng che, để toà nhà được căn giữa phần còn lại
function syncInsets() {
  const el = document.querySelector('.panel') as HTMLElement | null
  if (!scene || !el) return
  const r = el.getBoundingClientRect()
  const mobile = window.innerWidth <= 760
  scene.setInsets(mobile ? 0 : Math.round(r.right), mobile ? Math.round(window.innerHeight - r.top) : 0)
}

// ── hành động từ giao diện ──
function selectBuilding(id: string | null, kind: ViewKind = 'overview') {
  if (!scene) return
  if (tour.on && id === null) stopTour()
  scene.select(id, kind)
  orbiting.value = scene.orbiting || kind === 'orbit'
}
function view(kind: ViewKind) {
  if (!scene || !selected.value) return
  scene.viewBuilding(selected.value, kind)
  orbiting.value = kind === 'orbit'
}
watch(preset, p => scene?.setPreset(p))
watch(quality, q => scene?.setQuality(q))
watch(layers, l => { if (scene) (Object.keys(l) as LayerName[]).forEach(k => scene!.setLayer(k, l[k])); updateLabels() }, { deep: true })

function tool(name: string) {
  if (!scene) return
  switch (name) {
    case 'north': scene.north(); break
    case 'zoomin': scene.zoom(0.6); break
    case 'zoomout': scene.zoom(1.6); break
    case 'layers': tab.value = 'layers'; panelOpen.value = true; if (selected.value) selectBuilding(null); break
    case 'home': stopTour(); selectBuilding(null); scene.home(); break
    case 'orbit': scene.setOrbit(!scene.orbiting); orbiting.value = scene.orbiting; break
    case 'full':
      if (document.fullscreenElement) document.exitFullscreen()
      else document.documentElement.requestFullscreen?.()
      break
    case 'share': share(); break
    case 'png': png(); break
  }
}
async function share() {
  if (!scene) return
  const url = location.origin + location.pathname + scene.viewHash()
  history.replaceState(null, '', scene.viewHash())
  try {
    if (navigator.share && matchMedia('(pointer:coarse)').matches) await navigator.share({ title: 'VGU Campus 3D', url })
    else { await navigator.clipboard.writeText(url); flash(t('toast.copied')) }
  } catch { flash(url) }
}
function png() {
  if (!scene) return
  const b = selected.value ? scene.building(selected.value) : null
  const d = new Date().toISOString().slice(0, 10)
  const cap = `VGU Campus 3D${b ? ' · ' + b.name[lang.value] : ''} · ${t('env.' + preset.value)} · ${d}`
  const a = document.createElement('a')
  a.href = scene.snapshot(cap)
  a.download = `vgu-campus-3d-${b ? b.id.toLowerCase() + '-' : ''}${d}.png`
  a.click()
  flash(t('toast.png'))
}

// ── tham quan ──
function startTour() {
  tour.on = true; tour.paused = false; tour.index = 0
  runTour()
}
function runTour() {
  clearTimeout(tourTimer)
  if (!tour.on || tour.paused || !scene) return
  const id = tourList.value[tour.index]
  scene.select(id, 'orbit')
  orbiting.value = true
  tourTimer = setTimeout(() => {
    tour.index = (tour.index + 1) % tourList.value.length
    runTour()
  }, 7000)
}
function tourStep(d: number) {
  tour.index = (tour.index + d + tourList.value.length) % tourList.value.length
  if (tour.paused) { scene?.select(tourList.value[tour.index], 'overview') } else runTour()
}
function toggleTourPause() {
  tour.paused = !tour.paused
  if (tour.paused) { clearTimeout(tourTimer); scene?.setOrbit(false); orbiting.value = false } else runTour()
}
function stopTour() {
  tour.on = false; tour.paused = false
  clearTimeout(tourTimer)
  scene?.setOrbit(false); orbiting.value = false
}

const panelOpen = ref(true)
const catColor: Record<string, string> = { academic: '#2f6db5', admin: '#0F1E36', event: '#8a4fbf', life: '#2f9a6b', sport: '#d0632a', tech: '#6b7380' }
</script>

<template>
  <div class="app">
    <canvas ref="canvas" class="stage" />

    <!-- nhãn nổi trên toà nhà -->
    <div class="labels" aria-hidden="false">
      <button
        v-for="b in buildings" :key="b.id" :ref="el => setLabelEl(b.id, el)"
        class="label" :class="{ on: b.id === selected }"
        :style="{ '--c': catColor[b.category] || '#0F1E36' }"
        @click="selectBuilding(b.id)"
      >
        <span class="code">{{ b.code }}</span>
        <span class="nm">{{ b.name[lang] }}</span>
      </button>
    </div>

    <AppHeader @info="showInfo = true" />

    <SidePanel
      v-model:tab="tab" v-model:preset="preset" v-model:quality="quality" v-model:open="panelOpen"
      :buildings="buildings" :selected="selected" :layers="layers" :level="level" :tour="tour"
      :tour-count="tourList.length" :tour-current="tourList[tour.index]" :orbiting="orbiting" :cat-color="catColor"
      @select="selectBuilding" @view="view" @share="share"
      @tour-start="startTour" @tour-step="tourStep" @tour-pause="toggleTourPause" @tour-stop="stopTour"
    />

    <MapTools :heading="heading" :orbiting="orbiting" @tool="tool" />

    <MiniMap v-if="ready" :base="base" :buildings="buildings" :selected="selected" :target="target" :heading="heading"
             :cat-color="catColor" @pan="(x, z) => scene?.panTo(x, z)" @select="id => selectBuilding(id)" />

    <InfoDialog v-if="showInfo" @close="showInfo = false" />

    <Transition name="fade">
      <div v-if="toast" class="toast" role="status">{{ toast }}</div>
    </Transition>

    <Transition name="fade">
      <div v-if="!ready || failed" class="loader">
        <img :src="base + 'vgu-mark.svg'" alt="VGU" class="loader-logo">
        <div v-if="failed" class="loader-err">{{ failed }}</div>
        <template v-else>
          <div class="bar"><i :style="{ width: Math.round(progress * 100) + '%' }" /></div>
          <div class="loader-t">{{ t('loading') }} {{ Math.round(progress * 100) }}%</div>
        </template>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.app { position: fixed; inset: 0; overflow: hidden; background: var(--sky); }
.stage { position: absolute; inset: 0; width: 100%; height: 100%; display: block; touch-action: none; outline: none; }
.labels { position: absolute; inset: 0; z-index: 20; pointer-events: none; overflow: hidden; }
.label {
  position: absolute; left: 0; top: 0; opacity: 0; transform-origin: 50% 100%;
  display: inline-flex; align-items: center; gap: 6px; padding: 4px 9px 4px 4px;
  border: 1px solid rgba(255,255,255,.7); border-radius: 8px; cursor: pointer;
  background: rgba(255,255,255,.88); backdrop-filter: blur(6px); color: var(--ink);
  font: 600 12px/1 var(--font); white-space: nowrap; box-shadow: 0 2px 10px rgba(15,30,54,.18);
  transition: opacity .2s, background .2s;
}
.label::after { content: ''; position: absolute; left: 50%; bottom: -6px; width: 1px; height: 6px; background: rgba(15,30,54,.5); }
.label .code { display: grid; place-items: center; min-width: 22px; height: 20px; padding: 0 4px; border-radius: 5px; background: var(--c); color: #fff; font-size: 10.5px; letter-spacing: .02em; }
.label:hover, .label.on { background: #fff; border-color: var(--accent); }
.label.on .code { background: var(--accent); }
@media (max-width: 760px) {
  .label { padding: 3px; gap: 0; }
  .label .nm { display: none; }
  .label.on { padding-right: 9px; gap: 6px; }
  .label.on .nm { display: inline; }
}
.toast {
  position: absolute; left: 50%; bottom: 28px; transform: translateX(-50%); z-index: 60;
  background: var(--ink); color: #fff; padding: 10px 16px; border-radius: 10px; font-size: 13px;
  box-shadow: 0 8px 24px rgba(0,0,0,.25); max-width: calc(100vw - 32px); overflow-wrap: anywhere;
}
.loader {
  position: absolute; inset: 0; z-index: 80; display: grid; place-content: center; justify-items: center; gap: 18px;
  background: radial-gradient(ellipse at 50% 40%, #f7f4ee, #e3e8ee);
}
.loader-logo { width: 150px; }
.bar { width: 220px; height: 4px; border-radius: 4px; background: rgba(15,30,54,.12); overflow: hidden; }
.bar i { display: block; height: 100%; background: var(--accent); transition: width .3s; }
.loader-t { font-size: 13px; color: var(--muted); }
.loader-err { color: #b3261e; font-weight: 600; max-width: 280px; text-align: center; }
</style>
