<script setup lang="ts">
// Chế độ "Bản đồ": mô hình 3D campus đặt trên bản đồ nền MapLibre (CARTO), giống VGU Map.
// Toạ độ mô hình: mét, x = Đông, y = lên, z = −Bắc, gốc tại toà LH (public/data/models.json).
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { Building } from '~/lib/campus/scene'

const { t, lang } = useLang()
const base = useRuntimeConfig().app.baseURL

const STYLES = {
  dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  light: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
}
const M_PER_DEG_LON = 109234.3187 // như docs/rhino-inch-transform.json
const M_PER_DEG_LAT = 110574.0
const catColor: Record<string, string> = { academic: '#2f6db5', admin: '#0F1E36', event: '#8a4fbf', life: '#2f9a6b', sport: '#d0632a', tech: '#6b7380' }

const mapEl = ref<HTMLDivElement>()
const buildings = ref<Building[]>([])
const selected = ref<string | null>(null)
const basemap = ref<'dark' | 'light'>('dark')
const progress = ref(0)
const ready = ref(false)
const failed = ref('')
const panelOpen = ref(true)
const sel = computed(() => buildings.value.find(b => b.id === selected.value) || null)

let map: maplibregl.Map | null = null
let origin: [number, number] = [106.61502684609346, 11.107046143806222]
let footprints: Record<string, [number, number][]> = {}
let THREE: any = null
let three: { scene: any; roots: Map<string, any>; matrix: any } | null = null
const markers: maplibregl.Marker[] = []

const toLngLat = (x: number, z: number): [number, number] =>
  [origin[0] + x / M_PER_DEG_LON, origin[1] + (-z) / M_PER_DEG_LAT]

// ── mô hình 3D (Three.js) vẽ chung khung hình với MapLibre ──
function buildMatrix() {
  const m0 = maplibregl.MercatorCoordinate.fromLngLat(origin, 0)
  const me = maplibregl.MercatorCoordinate.fromLngLat([origin[0] + 100 / M_PER_DEG_LON, origin[1]], 0)
  const mn = maplibregl.MercatorCoordinate.fromLngLat([origin[0], origin[1] + 100 / M_PER_DEG_LAT], 0)
  const s = m0.meterInMercatorCoordinateUnits()
  const ex = [(me.x - m0.x) / 100, (me.y - m0.y) / 100]
  const ey = [(mn.x - m0.x) / 100, (mn.y - m0.y) / 100]
  // cột: x (Đông) → ex, y (lên) → độ cao, z (−Bắc) → −ey
  return new THREE.Matrix4().set(
    ex[0], 0, -ey[0], m0.x,
    ex[1], 0, -ey[1], m0.y,
    0, s, 0, 0,
    0, 0, 0, 1)
}

function styleModel(id: string, root: any) {
  root.traverse((o: any) => {
    if (!o.isMesh) return
    const src = o.material
    const color = (src?.color || new THREE.Color('#ddd')).clone()
    const isGlass = (src?.transmission ?? 0) > 0 || (src?.opacity ?? 1) < 0.95 || /glass|kinh|window/i.test(src?.name || '')
    let mat
    if (id === 'TRANSPORT') mat = new THREE.MeshStandardMaterial({ color: '#59606c', roughness: 0.95 })
    else if (id === 'co') mat = new THREE.MeshStandardMaterial({ color: '#4f7d45', roughness: 1 })
    else if (id === 'san-van-dong') {
      const hsl = { h: 0, s: 0, l: 0 }; color.getHSL(hsl)
      const track = hsl.s > 0.5 && hsl.h < 0.1, pitch = hsl.s > 0.5 && hsl.h > 0.2 && hsl.h < 0.45
      mat = new THREE.MeshStandardMaterial({ color: track ? '#b8573f' : pitch ? '#5f9b48' : color, roughness: 0.95 })
    } else if (isGlass) mat = new THREE.MeshStandardMaterial({ color: '#9fc4d8', roughness: 0.15, metalness: 0.25, transparent: true, opacity: 0.6 })
    else mat = new THREE.MeshStandardMaterial({ color: color.lerp(new THREE.Color('#ffffff'), 0.2), roughness: 0.8, metalness: 0.02 })
    mat.emissive = new THREE.Color('#F26F21'); mat.emissiveIntensity = 0
    o.material = mat
  })
}

async function loadModels() {
  THREE = await import('three')
  const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js')
  const { DRACOLoader } = await import('three/examples/jsm/loaders/DRACOLoader.js')
  const get = (p: string) => fetch(base + p).then(r => { if (!r.ok) throw new Error(p); return r.json() })
  const [models, bjson, fp] = await Promise.all([get('data/models.json'), get('data/buildings.json'), get('data/footprints.json')])
  if (Array.isArray(models.origin_lnglat)) origin = models.origin_lnglat
  buildings.value = bjson.buildings
  footprints = fp

  const scene = new THREE.Scene()
  scene.add(new THREE.HemisphereLight(0xffffff, 0x6b7686, 1.6))
  const sun = new THREE.DirectionalLight(0xffffff, 1.8)
  sun.position.set(-0.5, 1, 0.35)
  scene.add(sun)
  const roots = new Map<string, any>()
  const draco = new DRACOLoader().setDecoderPath(base + 'draco/')
  const loader = new GLTFLoader().setDRACOLoader(draco)
  let done = 0
  await Promise.all(models.models.map(async (m: any) => {
    const gltf = await loader.loadAsync(base + m.file)
    const root = gltf.scene
    root.position.set(...m.position)
    root.rotation.y = m.rotationY || 0
    styleModel(m.id, root)
    scene.add(root)
    roots.set(m.id, root)
    progress.value = ++done / models.models.length
  }))
  draco.dispose()
  three = { scene, roots, matrix: buildMatrix() }
}

function addLayers() {
  if (!map || !three) return
  // vùng bấm chọn toà (trong suốt) + viền toà đang chọn
  const features = buildings.value.filter(b => footprints[b.id]).map(b => ({
    type: 'Feature' as const,
    properties: { id: b.id },
    geometry: { type: 'Polygon' as const, coordinates: [footprints[b.id].map(([x, z]) => toLngLat(x, z))] },
  }))
  if (!map.getSource('fp')) map.addSource('fp', { type: 'geojson', data: { type: 'FeatureCollection', features } })
  if (!map.getLayer('fp-hit')) map.addLayer({ id: 'fp-hit', type: 'fill', source: 'fp', paint: { 'fill-color': '#000', 'fill-opacity': 0 } })
  if (!map.getLayer('fp-sel')) map.addLayer({ id: 'fp-sel', type: 'line', source: 'fp', paint: { 'line-color': '#F26F21', 'line-width': 3 }, filter: ['==', ['get', 'id'], selected.value || ''] })

  if (!map.getLayer('campus-3d')) {
    const t3 = three
    map.addLayer({
      id: 'campus-3d', type: 'custom', renderingMode: '3d',
      onAdd(m: any, gl: any) {
        (this as any).camera = new THREE.Camera()
        ;(this as any).renderer = new THREE.WebGLRenderer({ canvas: m.getCanvas(), context: gl, antialias: true })
        ;(this as any).renderer.autoClear = false
      },
      render(_gl: any, matrix: any) {
        const self = this as any
        self.camera.projectionMatrix = new THREE.Matrix4().fromArray(matrix).multiply(t3.matrix)
        self.renderer.resetState()
        self.renderer.render(t3.scene, self.camera)
      },
    } as any)
  }
}

function addMarkers() {
  markers.forEach(mk => mk.remove()); markers.length = 0
  for (const b of buildings.value) {
    const el = document.createElement('button')
    el.className = 'bd-label'
    el.style.setProperty('--c', catColor[b.category] || '#0F1E36')
    el.innerHTML = `<span class="code"></span><span class="nm"></span>`
    ;(el.querySelector('.code') as HTMLElement).textContent = b.code
    ;(el.querySelector('.nm') as HTMLElement).textContent = b.name[lang.value]
    el.dataset.id = b.id
    el.addEventListener('click', (e) => { e.stopPropagation(); select(b.id) })
    const mk = new maplibregl.Marker({ element: el, anchor: 'bottom' })
      .setLngLat(toLngLat(b.center[0], b.center[1]))
      .addTo(map!)
    markers.push(mk)
  }
  syncMarkers()
}
function syncMarkers() {
  for (const mk of markers) {
    const el = mk.getElement() as HTMLElement
    el.classList.toggle('on', el.dataset.id === selected.value)
    const b = buildings.value.find(x => x.id === el.dataset.id)
    const nm = el.querySelector('.nm') as HTMLElement | null
    if (b && nm) nm.textContent = b.name[lang.value]
  }
}

function highlight(id: string | null) {
  if (!three) return
  for (const [rid, root] of three.roots) {
    const on = rid === id
    root.traverse((o: any) => { if (o.isMesh && o.material?.emissive) o.material.emissiveIntensity = on ? 0.35 : 0 })
  }
  map?.setFilter('fp-sel', ['==', ['get', 'id'], id || ''])
  map?.triggerRepaint()
}

function select(id: string | null) {
  selected.value = id
  highlight(id)
  syncMarkers()
  history.replaceState(null, '', id ? '#b=' + id : location.pathname)
  if (!map) return
  const b = id ? buildings.value.find(x => x.id === id) : null
  if (b) {
    const big = Math.max(b.size[0], b.size[1])
    const mobile = window.innerWidth <= 760
    map.flyTo({
      center: toLngLat(b.center[0], b.center[1]),
      zoom: big > 120 ? 17.2 : big > 60 ? 17.7 : 18.2,
      pitch: 60, duration: 1600,
      padding: mobile ? { top: 60, bottom: 260, left: 0, right: 0 } : { top: 0, bottom: 0, left: panelOpen.value ? 340 : 0, right: 0 },
    })
  }
}
function home() {
  select(null)
  map?.flyTo({ center: toLngLat(-10, -60), zoom: 16.2, pitch: 55, bearing: 34, duration: 1600 })
}

function setBasemap(k: 'dark' | 'light') {
  if (!map || basemap.value === k) return
  basemap.value = k
  map.setStyle(STYLES[k])
  map.once('style.load', () => { addLayers(); highlight(selected.value) })
}

watch(lang, syncMarkers)

onMounted(async () => {
  try {
    const gl = document.createElement('canvas').getContext('webgl2')
    if (!gl) { failed.value = t('nowebgl'); return }
    await loadModels()
    map = new maplibregl.Map({
      container: mapEl.value!,
      style: STYLES[basemap.value],
      center: toLngLat(-10, -60), zoom: 16.2, pitch: 55, bearing: 34, maxPitch: 75,
      antialias: true,
      attributionControl: { compact: true },
      locale: { 'GeolocateControl.FindMyLocation': t('map.gps'), 'GeolocateControl.LocationNotAvailable': t('map.gpsNo') },
    })
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right')
    map.addControl(new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: true }), 'top-right')
    map.addControl(new maplibregl.ScaleControl({ maxWidth: 110, unit: 'metric' }), 'bottom-right')
    map.on('style.load', () => { addLayers() })
    map.once('load', () => {
      addLayers()
      addMarkers()
      ready.value = true
      const q = new URLSearchParams(location.hash.replace(/^#/, ''))
      const b = q.get('b')
      if (b && buildings.value.some(x => x.id === b)) select(b)
    })
    map.on('click', 'fp-hit', (e: any) => {
      const id = e.features?.[0]?.properties?.id
      if (id) select(id)
    })
    map.on('mouseenter', 'fp-hit', () => { map!.getCanvas().style.cursor = 'pointer' })
    map.on('mouseleave', 'fp-hit', () => { map!.getCanvas().style.cursor = '' })
    ;(window as any).__vguMap = map // tiện kiểm tra trong DevTools
  } catch (e) {
    console.error(e)
    failed.value = t('error')
  }
})
onBeforeUnmount(() => { markers.forEach(mk => mk.remove()); map?.remove(); map = null })
</script>

<template>
  <div class="bd">
    <div ref="mapEl" class="map" />
    <AppHeader @info="() => {}" />

    <aside class="panel" :class="{ closed: !panelOpen }">
      <button class="toggle" :aria-label="panelOpen ? t('panel.collapse') : t('panel.expand')" @click="panelOpen = !panelOpen">
        <Icon :name="panelOpen ? 'chevleft' : 'chevright'" :size="18" />
      </button>
      <template v-if="sel">
        <button class="back" @click="select(null)"><Icon name="chevleft" :size="16" /> {{ t('detail.back') }}</button>
        <div class="kicker" :style="{ color: catColor[sel.category] }">{{ t('cat.' + sel.category) }} · {{ sel.code }}</div>
        <h2>{{ sel.name[lang] }}</h2>
        <p class="desc">{{ sel.description[lang] }}</p>
        <div v-if="sel.floors" class="fact"><span>{{ t('detail.floors') }}</span><b>{{ sel.floors }}</b></div>
        <a class="btn pri" :href="base + '#b=' + sel.id"><Icon name="building" :size="16" /> {{ t('map.open3d') }}</a>
      </template>
      <template v-else>
        <h2>{{ t('panel.title') }}</h2>
        <p class="desc">{{ t('map.hint') }}</p>
        <ul class="list">
          <li v-for="b in buildings" :key="b.id">
            <button @click="select(b.id)">
              <span class="code" :style="{ background: catColor[b.category] }">{{ b.code }}</span>
              <span class="nm">{{ b.name[lang] }}</span>
            </button>
          </li>
        </ul>
      </template>
    </aside>

    <div class="tools">
      <button :title="t('tool.home')" :aria-label="t('tool.home')" @click="home"><Icon name="home" :size="18" /></button>
      <button :class="{ on: basemap === 'dark' }" @click="setBasemap('dark')">{{ t('map.dark') }}</button>
      <button :class="{ on: basemap === 'light' }" @click="setBasemap('light')">{{ t('map.light') }}</button>
    </div>

    <Transition name="fade">
      <div v-if="!ready && !failed" class="loading">
        <div class="bar"><i :style="{ width: Math.round(progress * 100) + '%' }" /></div>
        <span>{{ t('loading') }}</span>
      </div>
    </Transition>
    <div v-if="failed" class="loading err">{{ failed }}</div>
  </div>
</template>

<style scoped>
.bd { position: fixed; inset: 0; }
.map { position: absolute; inset: var(--hdr) 0 0 0; }
.panel {
  position: absolute; top: calc(var(--hdr) + 14px); left: 14px; bottom: 14px; width: 310px; z-index: 30;
  background: rgba(255,255,255,.96); border: 1px solid var(--line); border-radius: 14px; padding: 18px 16px;
  box-shadow: 0 8px 30px rgba(15,30,54,.18); overflow: auto; transition: transform .3s;
}
.panel.closed { transform: translateX(calc(-100% - 14px)); }
.toggle {
  position: absolute; top: 14px; right: -44px; width: 34px; height: 34px; border-radius: 9px; border: 1px solid var(--line);
  background: #fff; color: var(--ink); display: grid; place-items: center; cursor: pointer;
}
.panel h2 { margin: 2px 0 6px; font-size: 19px; }
.desc { margin: 0 0 12px; color: var(--muted); font-size: 13.5px; line-height: 1.5; }
.kicker { font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
.back { border: 0; background: none; color: var(--muted); font-weight: 600; font-size: 13px; display: inline-flex; align-items: center; gap: 4px; padding: 0; margin-bottom: 10px; cursor: pointer; }
.fact { display: flex; justify-content: space-between; padding: 9px 0; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); margin-bottom: 14px; font-size: 13.5px; }
.btn { display: inline-flex; align-items: center; gap: 8px; height: 38px; padding: 0 14px; border-radius: 10px; font-weight: 600; font-size: 13.5px; text-decoration: none; }
.btn.pri { background: var(--accent); color: #fff; }
.list { list-style: none; margin: 0; padding: 0; }
.list button { width: 100%; display: flex; align-items: center; gap: 10px; padding: 8px 6px; border: 0; border-radius: 9px; background: none; text-align: left; cursor: pointer; color: var(--ink); font-size: 13.5px; }
.list button:hover { background: var(--soft); }
.list .code { min-width: 42px; text-align: center; padding: 3px 6px; border-radius: 6px; color: #fff; font-size: 11px; font-weight: 700; }
.tools { position: absolute; left: 50%; bottom: 18px; transform: translateX(-50%); z-index: 30; display: flex; gap: 6px; padding: 6px; background: rgba(255,255,255,.95); border: 1px solid var(--line); border-radius: 12px; box-shadow: 0 6px 20px rgba(15,30,54,.18); }
.tools button { white-space: nowrap; height: 34px; padding: 0 12px; border: 0; border-radius: 8px; background: none; color: var(--ink); font-weight: 600; font-size: 13px; cursor: pointer; display: grid; place-items: center; }
.tools button.on { background: var(--ink); color: #fff; }
.loading { position: absolute; inset: var(--hdr) 0 0 0; z-index: 50; display: grid; place-content: center; gap: 12px; text-align: center; background: rgba(15,30,54,.85); color: #fff; font-size: 14px; }
.loading .bar { width: 220px; height: 4px; border-radius: 4px; background: rgba(255,255,255,.2); overflow: hidden; }
.loading .bar i { display: block; height: 100%; background: var(--accent); transition: width .2s; }
.loading.err { color: #ffd2c2; }
:deep(.bd-label) {
  display: inline-flex; align-items: center; gap: 6px; padding: 4px 9px 4px 4px; border-radius: 999px; border: 0;
  background: rgba(255,255,255,.95); box-shadow: 0 2px 8px rgba(0,0,0,.25); font: 600 12px var(--font); color: var(--ink); cursor: pointer; white-space: nowrap;
}
:deep(.bd-label .code) { background: var(--c); color: #fff; border-radius: 999px; padding: 2px 7px; font-size: 10.5px; }
:deep(.bd-label.on) { outline: 2px solid var(--accent); }
:deep(.maplibregl-ctrl-top-right) { top: 8px; }
@media (max-width: 760px) {
  .panel { top: auto; left: 8px; right: 8px; bottom: 70px; width: auto; max-height: 38vh; padding: 14px; }
  .panel.closed { transform: none; }
  .toggle { display: none; }
  .tools { bottom: 12px; }
  :deep(.bd-label .nm) { display: none; }
}
</style>
