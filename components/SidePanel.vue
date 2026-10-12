<script setup lang="ts">
import type { Building, LayerName, ViewKind, Quality } from '~/lib/campus/scene'
import type { Preset } from '~/lib/campus/presets'

const props = defineProps<{
  buildings: Building[]; selected: string | null; layers: Record<LayerName, boolean>; level: number
  tour: { on: boolean; paused: boolean; index: number }; tourCount: number; tourCurrent?: string
  orbiting: boolean; catColor: Record<string, string>
}>()
const tab = defineModel<'explore' | 'layers' | 'env'>('tab', { required: true })
const preset = defineModel<Preset>('preset', { required: true })
const quality = defineModel<Quality>('quality', { required: true })
const open = defineModel<boolean>('open', { required: true })
const emit = defineEmits<{
  select: [id: string | null, kind?: ViewKind]; view: [kind: ViewKind]; share: []
  'tour-start': []; 'tour-step': [d: number]; 'tour-pause': []; 'tour-stop': []
}>()
const { t, lang } = useLang()

const q = ref('')
const cat = ref('all')
const cats = computed(() => ['all', ...new Set(props.buildings.map(b => b.category))])
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').toLowerCase()
const list = computed(() => props.buildings.filter(b =>
  (cat.value === 'all' || b.category === cat.value) &&
  (!q.value || norm(`${b.code} ${b.name.vi} ${b.name.en}`).includes(norm(q.value)))))
const current = computed(() => props.buildings.find(b => b.id === props.selected) || null)

const views: ViewKind[] = ['overview', 'front', 'back', 'top']
const presetIcon: Record<Preset, string> = { morning: 'sunrise', day: 'sun', evening: 'sunset', night: 'moon' }
const layerKeys: LayerName[] = ['buildings', 'trees', 'grass', 'roads', 'labels']
const qualities: Quality[] = ['auto', 'fine', 'smooth']
</script>

<template>
  <aside class="panel" :class="{ closed: !open }" :aria-label="t('panel.title')">
    <div class="head">
      <template v-if="current">
        <button class="back" @click="emit('select', null)"><Icon name="chevleft" :size="16" /> {{ t('detail.back') }}</button>
      </template>
      <span v-else class="h">{{ t('panel.title') }}</span>
      <button class="fold" :aria-expanded="open" @click="open = !open">
        {{ open ? t('panel.collapse') : t('panel.expand') }} <Icon :name="open ? 'chevup' : 'chevdown'" :size="15" />
      </button>
    </div>

    <div v-show="open" class="body">
      <!-- ───── chi tiết một địa điểm ───── -->
      <section v-if="current" class="detail">
        <div class="kick">{{ t('detail.kicker') }}</div>
        <div class="title-row">
          <h2>{{ current.name[lang] }}</h2>
          <button class="x" :aria-label="t('info.close')" @click="emit('select', null)"><Icon name="close" :size="18" /></button>
        </div>
        <p class="desc">{{ current.description[lang] }}</p>
        <dl class="facts">
          <div><dt>{{ t('detail.code') }}</dt><dd><span class="chip" :style="{ background: catColor[current.category] }">{{ current.code }}</span> {{ t('cat.' + current.category) }}</dd></div>
          <div v-if="current.floors"><dt>{{ t('detail.floors') }}</dt><dd>{{ current.floors }}</dd></div>
          <div><dt>{{ t('detail.height') }}</dt><dd>≈ {{ Math.round(current.height) }} m</dd></div>
          <div><dt>{{ t('detail.size') }}</dt><dd>≈ {{ Math.round(current.size[0]) }} × {{ Math.round(current.size[1]) }} m</dd></div>
        </dl>
        <div class="views">
          <button v-for="v in views" :key="v" @click="emit('view', v)">{{ t('view.' + v) }}</button>
          <button class="wide" :class="{ on: orbiting }" @click="emit('view', 'orbit')"><Icon name="orbit" :size="15" /> {{ t('view.orbit') }}</button>
        </div>
        <button class="link" @click="emit('share')"><Icon name="share" :size="15" /> {{ t('detail.share') }}</button>
      </section>

      <!-- ───── các tab ───── -->
      <template v-else>
        <nav class="tabs" role="tablist">
          <button role="tab" :aria-selected="tab === 'explore'" :class="{ on: tab === 'explore' }" @click="tab = 'explore'"><Icon name="explore" :size="16" /> {{ t('tab.explore') }}</button>
          <button role="tab" :aria-selected="tab === 'layers'" :class="{ on: tab === 'layers' }" @click="tab = 'layers'"><Icon name="layers" :size="16" /> {{ t('tab.layers') }}</button>
          <button role="tab" :aria-selected="tab === 'env'" :class="{ on: tab === 'env' }" @click="tab = 'env'"><Icon name="sun" :size="16" /> {{ t('tab.env') }}</button>
        </nav>

        <section v-if="tab === 'explore'" class="explore">
          <label class="search"><Icon name="search" :size="16" /><input v-model="q" :placeholder="t('search.ph')" type="search"></label>
          <div class="cats">
            <button v-for="c in cats" :key="c" :class="{ on: cat === c }" @click="cat = c">{{ t('cat.' + c) }}</button>
          </div>
          <ul class="list">
            <li v-for="b in list" :key="b.id">
              <button @click="emit('select', b.id)">
                <span class="chip" :style="{ background: catColor[b.category] }">{{ b.code }}</span>
                <span class="nm">{{ b.name[lang] }}<small>{{ t('cat.' + b.category) }}</small></span>
                <Icon name="chevright" :size="15" />
              </button>
            </li>
            <li v-if="!list.length" class="none">{{ t('search.none') }}</li>
          </ul>
          <button v-if="!tour.on" class="tour-start" @click="emit('tour-start')">
            <Icon name="play" :size="16" />
            <span>{{ t('tour.start') }}<small>{{ t('tour.hint', { n: tourCount }) }}</small></span>
          </button>
        </section>

        <section v-else-if="tab === 'layers'" class="layers">
          <p class="note">{{ t('layer.note') }}</p>
          <label v-for="k in layerKeys" :key="k" class="sw">
            <span>{{ t('layer.' + k) }}</span>
            <input v-model="layers[k]" type="checkbox" role="switch"><i />
          </label>
        </section>

        <section v-else class="env">
          <p class="note">{{ t('env.note') }}</p>
          <div class="presets">
            <button v-for="p in (['morning','day','evening','night'] as Preset[])" :key="p" :class="['pre', p, { on: preset === p }]" @click="preset = p">
              <Icon :name="presetIcon[p]" :size="22" />
              <span>{{ t('env.' + p) }}</span>
              <Icon v-if="preset === p" class="tick" name="check" :size="14" />
            </button>
          </div>
          <h3>{{ t('q.title') }}</h3>
          <label v-for="qq in qualities" :key="qq" class="radio">
            <input v-model="quality" type="radio" name="q" :value="qq"><i />
            <span>{{ t('q.' + qq) }}<small>{{ t('q.' + qq + '.d') }}</small></span>
          </label>
          <p class="note">{{ t('q.now') }}: <b>{{ t('q.l' + level) }}</b></p>
        </section>
      </template>

      <!-- ───── thanh điều khiển tham quan ───── -->
      <div v-if="tour.on" class="tourbar">
        <div class="tb-t">
          <b>{{ tour.paused ? t('tour.paused') : t('tour.playing') }}</b>
          <span>{{ tour.index + 1 }} / {{ tourCount }} · {{ buildings.find(b => b.id === tourCurrent)?.name[lang] }}</span>
        </div>
        <div class="tb-b">
          <button :aria-label="'prev'" @click="emit('tour-step', -1)"><Icon name="chevleft" :size="16" /></button>
          <button :aria-label="tour.paused ? 'play' : 'pause'" @click="emit('tour-pause')"><Icon :name="tour.paused ? 'play' : 'pause'" :size="16" /></button>
          <button :aria-label="'next'" @click="emit('tour-step', 1)"><Icon name="chevright" :size="16" /></button>
          <button :aria-label="t('tour.stop')" @click="emit('tour-stop')"><Icon name="stop" :size="14" /></button>
        </div>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.panel {
  position: absolute; z-index: 30; left: 18px; top: calc(var(--hdr) + 18px); width: 352px;
  max-height: calc(100% - var(--hdr) - 36px); display: flex; flex-direction: column;
  background: rgba(255,255,255,.95); backdrop-filter: blur(12px); border: 1px solid var(--line);
  border-radius: 16px; box-shadow: 0 10px 34px rgba(15,30,54,.16); overflow: hidden;
}
.head { display: flex; justify-content: space-between; align-items: center; padding: 14px 16px 10px; }
.h { font-weight: 700; font-size: 15px; }
.fold, .back { display: inline-flex; align-items: center; gap: 4px; border: 0; background: none; color: var(--muted); font: 500 12.5px var(--font); cursor: pointer; padding: 4px; border-radius: 6px; }
.back { color: var(--ink); font-weight: 600; font-size: 14px; }
.fold:hover, .back:hover { background: var(--soft); }
.body { overflow-y: auto; padding: 0 16px 16px; display: flex; flex-direction: column; gap: 12px; }

.tabs { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; background: var(--soft); padding: 4px; border-radius: 11px; }
.tabs button { display: flex; align-items: center; justify-content: center; gap: 5px; height: 36px; white-space: nowrap; padding: 0 4px; border: 0; border-radius: 8px; background: none; color: var(--muted); font: 600 12.5px var(--font); cursor: pointer; }
.tabs button.on { background: #fff; color: var(--accent-ink); box-shadow: 0 1px 4px rgba(15,30,54,.1); }

.search { display: flex; align-items: center; gap: 8px; height: 40px; padding: 0 12px; border: 1px solid var(--line); border-radius: 10px; color: var(--muted); }
.search:focus-within { border-color: var(--accent); }
.search input { flex: 1; border: 0; outline: 0; background: none; font: 14px var(--font); color: var(--ink); min-width: 0; }
.cats { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
.cats button { height: 28px; padding: 0 11px; border-radius: 99px; border: 1px solid var(--line); background: #fff; font: 500 12.5px var(--font); color: var(--ink); cursor: pointer; }
.cats button.on { background: var(--ink); border-color: var(--ink); color: #fff; }
.list { list-style: none; margin: 10px 0 0; padding: 0; display: flex; flex-direction: column; gap: 2px; }
.list button { width: 100%; display: flex; align-items: center; gap: 10px; padding: 8px 8px; border: 0; background: none; border-radius: 9px; cursor: pointer; text-align: left; color: var(--ink); font: 14px var(--font); }
.list button:hover { background: var(--soft); }
.list .nm { flex: 1; display: flex; flex-direction: column; font-weight: 600; }
.list small { font-weight: 400; font-size: 12px; color: var(--muted); }
.list .none { color: var(--muted); font-size: 13px; padding: 10px 8px; }
.chip { display: inline-grid; place-items: center; min-width: 32px; height: 26px; padding: 0 6px; border-radius: 7px; color: #fff; font: 700 11.5px var(--font); }
.tour-start { margin-top: 12px; width: 100%; display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 12px; border: 1px dashed var(--accent); background: var(--accent-soft); color: var(--accent-ink); cursor: pointer; text-align: left; font: 600 14px var(--font); }
.tour-start span { display: flex; flex-direction: column; }
.tour-start small { font-weight: 400; font-size: 12px; color: var(--muted); }

.note { margin: 0; color: var(--muted); font-size: 13px; }
.sw { display: flex; align-items: center; justify-content: space-between; padding: 10px 2px; border-bottom: 1px solid var(--line); font-size: 14px; cursor: pointer; position: relative; }
.sw input { position: absolute; opacity: 0; pointer-events: none; }
.sw i { width: 38px; height: 22px; border-radius: 99px; background: #cfd5dd; position: relative; transition: background .2s; }
.sw i::after { content: ''; position: absolute; top: 3px; left: 3px; width: 16px; height: 16px; border-radius: 50%; background: #fff; transition: transform .2s; box-shadow: 0 1px 2px rgba(0,0,0,.2); }
.sw input:checked + i { background: var(--accent); }
.sw input:checked + i::after { transform: translateX(16px); }
.sw input:focus-visible + i { outline: 2px solid var(--accent); outline-offset: 2px; }

.presets { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.pre { position: relative; display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 16px 8px; border-radius: 12px; border: 1px solid var(--line); background: #fff; color: var(--ink); font: 500 13px var(--font); cursor: pointer; }
.pre.on { border-color: var(--accent); background: var(--accent-soft); color: var(--accent-ink); }
.pre .tick { position: absolute; top: 7px; right: 7px; }
.env h3 { margin: 8px 0 0; font-size: 14px; }
.radio { display: flex; gap: 12px; align-items: flex-start; padding: 8px 2px; cursor: pointer; position: relative; font-size: 14px; }
.radio input { position: absolute; opacity: 0; }
.radio i { flex: none; width: 18px; height: 18px; margin-top: 1px; border-radius: 50%; border: 2px solid #b8c0ca; }
.radio input:checked + i { border: 5px solid var(--ink); }
.radio input:focus-visible + i { outline: 2px solid var(--accent); outline-offset: 2px; }
.radio span { display: flex; flex-direction: column; font-weight: 600; }
.radio small { font-weight: 400; color: var(--muted); font-size: 12px; }

.kick { font-size: 10.5px; letter-spacing: .16em; color: var(--muted); }
.title-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
.title-row h2 { margin: 4px 0 0; font-size: 24px; line-height: 1.2; letter-spacing: -.01em; }
.x { border: 0; background: none; cursor: pointer; color: var(--muted); padding: 4px; border-radius: 6px; }
.x:hover { background: var(--soft); }
.desc { margin: 10px 0 0; color: #3e4a5c; font-size: 14px; line-height: 1.65; }
.facts { margin: 14px 0 0; display: grid; grid-template-columns: 1fr 1fr; gap: 10px 14px; }
.facts div { display: flex; flex-direction: column; gap: 3px; }
.facts dt { font-size: 11.5px; color: var(--muted); }
.facts dd { margin: 0; font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 6px; }
.facts .chip { min-width: 0; height: 20px; font-size: 10.5px; }
.views { margin-top: 16px; display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.views button { height: 38px; border-radius: 9px; border: 1px solid var(--line); background: #fff; font: 500 13.5px var(--font); color: var(--ink); cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 6px; }
.views button:hover { border-color: var(--ink); }
.views .wide { grid-column: span 2; }
.views .on { background: var(--ink); color: #fff; border-color: var(--ink); }
.link { margin-top: 10px; align-self: flex-start; display: inline-flex; align-items: center; gap: 6px; border: 0; background: none; color: var(--accent-ink); font: 600 13px var(--font); cursor: pointer; padding: 6px 0; }

.tourbar { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 10px 12px; border-radius: 12px; background: var(--ink); color: #fff; }
.tb-t { display: flex; flex-direction: column; gap: 2px; font-size: 13px; min-width: 0; }
.tb-t span { color: #b9c4d4; font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tb-b { display: flex; gap: 2px; }
.tb-b button { width: 32px; height: 32px; display: grid; place-items: center; border: 0; border-radius: 8px; background: rgba(255,255,255,.08); color: #fff; cursor: pointer; }
.tb-b button:hover { background: rgba(255,255,255,.18); }

/* ── điện thoại: bảng thành ngăn kéo dưới đáy ── */
@media (max-width: 760px) {
  .panel { left: 8px; right: 8px; top: auto; bottom: 8px; width: auto; max-height: 46%; border-radius: 16px; }
  .panel.closed { max-height: 52px; }
  .head { padding: 10px 14px 8px; }
  .title-row h2 { font-size: 20px; }
}
</style>
