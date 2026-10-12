<script setup lang="ts">
// Bản đồ nhỏ nhìn từ trên: khối toà nhà + vị trí, hướng nhìn của camera. Bấm để di chuyển.
import type { Building } from '~/lib/campus/scene'
const props = defineProps<{ base: string; buildings: Building[]; selected: string | null; target: [number, number]; heading: number; catColor: Record<string, string> }>()
const emit = defineEmits<{ pan: [x: number, z: number]; select: [id: string] }>()
const { t } = useLang()

const fp = ref<Record<string, [number, number][]>>({})
onMounted(async () => { fp.value = await fetch(props.base + 'data/footprints.json').then(r => r.json()).catch(() => ({})) })

// khung nhìn của bản đồ nhỏ (mét): x = Đông, z = −Bắc
const VB = { x: -470, z: -460, w: 900, h: 720 }
const catOf = (fid: string) => {
  const b = props.buildings.find(b => b.id === fid || (fid.startsWith('V') && b.id === 'GH'))
  return b ? props.catColor[b.category] : '#8892a0'
}
const owner = (fid: string) => (/^V\d$/.test(fid) ? 'GH' : fid)
const poly = (pts: [number, number][]) => pts.map(p => p.join(',')).join(' ')

const svg = ref<SVGSVGElement>()
function click(e: MouseEvent) {
  const r = svg.value!.getBoundingClientRect()
  const x = VB.x + ((e.clientX - r.left) / r.width) * VB.w
  const z = VB.z + ((e.clientY - r.top) / r.height) * VB.h
  emit('pan', x, z)
}
</script>

<template>
  <div class="mini" :title="t('minimap')">
    <svg ref="svg" :viewBox="`${VB.x} ${VB.z} ${VB.w} ${VB.h}`" preserveAspectRatio="xMidYMid meet" @click="click">
      <rect :x="VB.x" :y="VB.z" :width="VB.w" :height="VB.h" fill="#eef1ea" />
      <polygon v-for="(pts, id) in fp" :key="id" :points="poly(pts)"
               :fill="owner(String(id)) === selected ? 'var(--accent)' : catOf(String(id))" :opacity="owner(String(id)) === selected ? 1 : .75"
               class="fp" @click.stop="emit('select', owner(String(id)))" />
      <g :transform="`translate(${target[0]} ${target[1]}) rotate(${heading})`">
        <path d="M0 0 L-70 -150 A165 165 0 0 1 70 -150 Z" fill="rgba(242,111,33,.18)" />
        <circle r="13" fill="var(--accent)" stroke="#fff" stroke-width="5" />
      </g>
    </svg>
    <span class="n">N ↑</span>
  </div>
</template>

<style scoped>
.mini { position: absolute; z-index: 25; right: 18px; bottom: 18px; width: 210px; height: 168px; border-radius: 12px; overflow: hidden; border: 1px solid var(--line); background: #fff; box-shadow: 0 6px 20px rgba(15,30,54,.14); }
svg { width: 100%; height: 100%; display: block; cursor: crosshair; }
.fp { cursor: pointer; }
.fp:hover { opacity: 1; }
.n { position: absolute; top: 6px; left: 8px; font-size: 10px; font-weight: 700; color: var(--muted); }
@media (max-width: 760px) { .mini { display: none; } }
</style>
