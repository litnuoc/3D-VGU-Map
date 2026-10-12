// CampusScene: dựng toàn bộ cảnh 3D campus VGU bằng Three.js.
// Hệ toạ độ: mét, x = Đông, y = lên, z = −Bắc, gốc tại toà LH (xem public/data/models.json).
import * as THREE from 'three'
import { MapControls } from 'three/examples/jsm/controls/MapControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { LIGHTING, type Preset } from './presets'
import { TreeLayer, type TreeRow } from './trees'
import { facadeTextures, worldFacadeUV } from './facade'

export interface Building {
  id: string
  code: string
  category: string
  name: { vi: string; en: string }
  description: { vi: string; en: string }
  floors: number | null
  center: [number, number] // x, z
  size: [number, number]
  height: number
}

export type LayerName = 'buildings' | 'trees' | 'grass' | 'roads' | 'labels'
export type ViewKind = 'overview' | 'front' | 'back' | 'top' | 'orbit'
export type Quality = 'auto' | 'fine' | 'smooth'

interface ModelEntry { id: string; file: string; position: [number, number, number]; rotationY: number }

// Mô hình được vẽ mặt tiền có cửa sổ (dạng khối, chưa có chi tiết cửa)
const FACADE_IDS = new Set(['AD', 'B1', 'B2', 'B3', 'B5', 'B6', 'CH', 'D1', 'D2', 'FC', 'GH', 'LI', 'SH'])
const LAYER_OF: Record<string, LayerName> = { TRANSPORT: 'roads', co: 'grass', 'san-van-dong': 'roads' }

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

export interface SceneCallbacks {
  onProgress?: (p: number) => void
  onSelect?: (id: string | null) => void
  onFrame?: () => void
  onQuality?: (level: number) => void
}

export class CampusScene {
  readonly renderer: THREE.WebGLRenderer
  readonly scene = new THREE.Scene()
  readonly camera: THREE.PerspectiveCamera
  readonly controls: MapControls
  buildings: Building[] = []

  private base: string
  private cb: SceneCallbacks
  private sun = new THREE.DirectionalLight()
  private hemi = new THREE.HemisphereLight()
  private ground!: THREE.Mesh
  private skyTex!: THREE.CanvasTexture
  private trees?: TreeLayer
  private pickables: THREE.Object3D[] = []
  private roots = new Map<string, THREE.Object3D>()
  private layers: Record<LayerName, THREE.Object3D[]> = { buildings: [], trees: [], grass: [], roads: [], labels: [] }
  private facadeMats: THREE.MeshStandardMaterial[] = []
  private glassMats: THREE.MeshStandardMaterial[] = []
  private lamps?: THREE.InstancedMesh
  private ring: THREE.Mesh
  private flight: null | { t0: number; dur: number; p0: THREE.Vector3; p1: THREE.Vector3; q0: THREE.Vector3; q1: THREE.Vector3; done?: () => void } = null
  private raf = 0
  private dirty = true
  private last = performance.now()
  private insets = { left: 0, bottom: 0 }
  private fps = { frames: 0, t: 0, low: 0, good: 0, cool: 0 }
  private quality: Quality = 'auto'
  level = 1 // 0 = chi tiết, 1 = cân bằng, 2 = mượt
  private compact = false
  selected: string | null = null
  preset: Preset = 'day'

  constructor(canvas: HTMLCanvasElement, base: string, cb: SceneCallbacks = {}) {
    this.base = base
    this.cb = cb
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: false, powerPreference: 'high-performance' })
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFShadowMap
    this.compact = Math.min(window.innerWidth, window.innerHeight) < 700

    this.camera = new THREE.PerspectiveCamera(42, 1, 5, 6000)
    this.camera.position.set(-330, 360, 420)
    this.controls = new MapControls(this.camera, canvas)
    this.controls.target.set(-10, 0, -60)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.08
    this.controls.minDistance = 25
    this.controls.maxDistance = 1500
    this.controls.maxPolarAngle = Math.PI * 0.46
    this.controls.screenSpacePanning = false
    this.controls.zoomToCursor = true
    this.controls.autoRotateSpeed = -0.9
    this.controls.addEventListener('change', () => { this.dirty = true })
    this.controls.addEventListener('start', () => { this.flight = null })

    this.scene.add(this.hemi, this.sun, this.sun.target)
    this.sun.castShadow = true
    const sc = this.sun.shadow.camera
    sc.left = -520; sc.right = 520; sc.top = 520; sc.bottom = -520; sc.near = 10; sc.far = 2400
    this.sun.shadow.bias = -0.0004
    this.sun.shadow.normalBias = 0.6

    const groundMat = new THREE.MeshStandardMaterial({ color: '#ced5c0', roughness: 1 })
    this.ground = new THREE.Mesh(new THREE.CircleGeometry(2600, 64).rotateX(-Math.PI / 2), groundMat)
    this.ground.position.y = -0.4
    this.ground.receiveShadow = true
    this.scene.add(this.ground)

    const ringGeo = new THREE.RingGeometry(0.94, 1, 96).rotateX(-Math.PI / 2)
    this.ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: '#F26F21', transparent: true, opacity: 0.95, depthWrite: false }))
    this.ring.visible = false
    this.ring.renderOrder = 5
    this.scene.add(this.ring)

    this.bindPointer(canvas)
    this.resize()
    this.applyQuality()
    this.setPreset('day')
  }

  // ───────────────────────── tải dữ liệu ─────────────────────────
  async load() {
    const get = (p: string) => fetch(this.base + p).then(r => { if (!r.ok) throw new Error(p); return r.json() })
    const [models, bjson, trees] = await Promise.all([get('data/models.json'), get('data/buildings.json'), get('data/trees.json')])
    this.buildings = bjson.buildings

    const draco = new DRACOLoader().setDecoderPath(this.base + 'draco/')
    const loader = new GLTFLoader().setDRACOLoader(draco)
    const list: ModelEntry[] = models.models
    let done = 0
    this.cb.onProgress?.(0.05)

    this.trees = new TreeLayer(trees as TreeRow[])
    this.trees.group.userData.layer = 'trees'
    this.layers.trees.push(this.trees.group)
    this.scene.add(this.trees.group)
    this.applyQuality()

    await Promise.all(list.map(async (m) => {
      const gltf = await loader.loadAsync(this.base + m.file)
      const root = gltf.scene
      root.position.set(...m.position)
      root.rotation.y = m.rotationY
      root.userData.bid = m.id
      this.styleModel(m.id, root)
      this.scene.add(root)
      this.roots.set(m.id, root)
      const layer = LAYER_OF[m.id] || 'buildings'
      this.layers[layer].push(root)
      if (layer === 'buildings' || m.id === 'san-van-dong') this.pickables.push(root)
      done++
      this.cb.onProgress?.(0.05 + 0.9 * (done / list.length))
    }))
    draco.dispose()
    this.addLamps()
    this.setPreset(this.preset)
    this.cb.onProgress?.(1)
    this.dirty = true
  }

  private styleModel(id: string, root: THREE.Object3D) {
    const { map, glow } = facadeTextures()
    root.updateMatrixWorld(true)
    root.traverse((o: any) => {
      if (!o.isMesh) return
      const src = o.material as THREE.MeshPhysicalMaterial
      const color = (src.color || new THREE.Color('#ddd')).clone()
      const isGlass = (src.transmission ?? 0) > 0 || (src.opacity ?? 1) < 0.95 || /glass|kinh|window/i.test(src.name || '')
      let mat: THREE.MeshStandardMaterial
      if (id === 'TRANSPORT') {
        mat = new THREE.MeshStandardMaterial({ color: '#676c73', roughness: 0.95 })
        o.receiveShadow = true; o.position.y += 0.02
      } else if (id === 'co') {
        mat = new THREE.MeshStandardMaterial({ color: '#8fb86a', roughness: 1 })
        o.receiveShadow = true; o.position.y += 0.04
      } else if (id === 'san-van-dong') {
        const hsl = { h: 0, s: 0, l: 0 }; color.getHSL(hsl)
        const track = hsl.s > 0.5 && hsl.h < 0.1, pitch = hsl.s > 0.5 && hsl.h > 0.2 && hsl.h < 0.45
        mat = new THREE.MeshStandardMaterial({ color: track ? '#b8573f' : pitch ? '#5f9b48' : color, roughness: 0.95 })
        o.position.y += 0.06
        o.receiveShadow = true
      } else if (isGlass) {
        mat = new THREE.MeshStandardMaterial({ color: '#9fc4d8', roughness: 0.12, metalness: 0.25, transparent: true, opacity: 0.6, emissive: new THREE.Color('#ffd79a'), emissiveIntensity: 0 })
        this.glassMats.push(mat)
        o.castShadow = true
      } else {
        // làm sáng màu gốc một chút cho giống phong cách mô hình kiến trúc
        const c = color.clone().lerp(new THREE.Color('#ffffff'), 0.15)
        const useFacade = FACADE_IDS.has(id)
        mat = new THREE.MeshStandardMaterial({ color: c, roughness: 0.82, metalness: 0.02 })
        if (useFacade) {
          worldFacadeUV(o)
          mat.map = map
          mat.emissiveMap = glow
          mat.emissive = new THREE.Color('#ffffff')
          mat.emissiveIntensity = 0
          this.facadeMats.push(mat)
        }
        o.castShadow = true
        o.receiveShadow = true
      }
      mat.side = THREE.DoubleSide
      if (id === 'TRANSPORT' || id === 'san-van-dong') {
        mat.polygonOffset = true
        mat.polygonOffsetFactor = -1
        mat.polygonOffsetUnits = -2
      }
      o.material = mat
    })
  }

  /** Đèn đường: điểm sáng nhỏ dọc theo hàng cây (chỉ hiện chiều tối/ban đêm). */
  private addLamps() {
    const pts: THREE.Vector3[] = []
    const roads = this.roots.get('TRANSPORT')
    if (!roads) return
    // lấy mẫu đỉnh mạng đường, giữ các điểm cách nhau ≥ 28 m
    const grid = new Map<string, THREE.Vector3>()
    roads.traverse((o: any) => {
      if (!o.isMesh) return
      const p = o.geometry.getAttribute('position'); const v = new THREE.Vector3()
      for (let i = 0; i < p.count; i += 7) {
        v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld)
        const k = `${Math.round(v.x / 28)},${Math.round(v.z / 28)}`
        if (!grid.has(k)) grid.set(k, v.clone())
      }
    })
    grid.forEach(v => pts.push(v))
    const geo = new THREE.SphereGeometry(0.45, 8, 6)
    const mat = new THREE.MeshBasicMaterial({ color: '#ffd59a', transparent: true, opacity: 0 })
    const mesh = new THREE.InstancedMesh(geo, mat, pts.length)
    const m = new THREE.Matrix4()
    pts.forEach((p, i) => mesh.setMatrixAt(i, m.makeTranslation(p.x, 5, p.z)))
    mesh.visible = false
    this.lamps = mesh
    this.layers.roads.push(mesh)
    this.scene.add(mesh)
  }

  // ───────────────────────── ánh sáng ─────────────────────────
  setPreset(p: Preset) {
    this.preset = p
    const L = LIGHTING[p]
    this.sun.color.set(L.sun)
    this.sun.intensity = L.sunPower
    const d = new THREE.Vector3(...L.dir).normalize().multiplyScalar(1200)
    this.sun.position.copy(d)
    this.sun.target.position.set(0, 0, 0)
    this.hemi.color.set(L.hemiSky)
    this.hemi.groundColor.set(L.hemiGround)
    this.hemi.intensity = L.hemiPower
    ;(this.ground.material as THREE.MeshStandardMaterial).color.set(L.ground)
    this.renderer.toneMappingExposure = L.exposure
    this.facadeMats.forEach(m => { m.emissiveIntensity = L.windows })
    this.glassMats.forEach(m => { m.emissiveIntensity = L.windows * 0.5 })
    if (this.lamps) {
      this.lamps.visible = L.lamps > 0 && this.layerVisible('roads')
      ;(this.lamps.material as THREE.MeshBasicMaterial).opacity = Math.min(1, L.lamps)
    }
    // nền trời dạng dải màu + sương mù cùng màu chân trời
    const c = document.createElement('canvas'); c.width = 4; c.height = 256
    const g = c.getContext('2d')!
    const grad = g.createLinearGradient(0, 0, 0, 256)
    grad.addColorStop(0, L.skyTop); grad.addColorStop(0.62, L.skyHorizon); grad.addColorStop(1, L.skyHorizon)
    g.fillStyle = grad; g.fillRect(0, 0, 4, 256)
    this.skyTex?.dispose()
    this.skyTex = new THREE.CanvasTexture(c)
    this.skyTex.colorSpace = THREE.SRGBColorSpace
    this.scene.background = this.skyTex
    this.scene.fog = new THREE.Fog(L.skyHorizon, 1400, 3800)
    this.dirty = true
  }

  // ───────────────────────── lớp hiển thị ─────────────────────────
  private layerState: Record<LayerName, boolean> = { buildings: true, trees: true, grass: true, roads: true, labels: true }
  layerVisible(l: LayerName) { return this.layerState[l] }
  setLayer(l: LayerName, on: boolean) {
    this.layerState[l] = on
    this.layers[l].forEach(o => { o.visible = on })
    if (l === 'roads' && this.lamps) this.lamps.visible = on && LIGHTING[this.preset].lamps > 0
    this.dirty = true
  }

  // ───────────────────────── chất lượng ─────────────────────────
  setQuality(q: Quality) { this.quality = q; this.fps.low = this.fps.good = 0; this.applyQuality() }
  private applyQuality() {
    const level = this.quality === 'fine' ? 0 : this.quality === 'smooth' || (this.quality === 'auto' && this.compact) ? 2 : this.level
    this.level = level
    const dpr = Math.min(window.devicePixelRatio || 1, [2, 1.5, 1.1][level])
    this.renderer.setPixelRatio(dpr)
    this.renderer.shadowMap.enabled = level < 2
    this.sun.castShadow = level < 2
    const ms = level === 0 ? 4096 : 2048
    if (this.sun.shadow.mapSize.x !== ms) { this.sun.shadow.mapSize.set(ms, ms); this.sun.shadow.map?.dispose(); this.sun.shadow.map = null as any }
    this.trees?.setDensity([1, 0.8, 0.55][level])
    this.resize()
    this.cb.onQuality?.(level)
    this.dirty = true
  }
  private sampleFps(dt: number) {
    if (this.quality !== 'auto' || this.compact) return
    const f = this.fps
    f.frames++; f.t += dt
    if (f.t < 1.5) return
    const fps = f.frames / f.t
    f.frames = 0; f.t = 0
    f.cool = Math.max(0, f.cool - 1)
    f.low = fps < 30 ? f.low + 1 : 0
    f.good = fps > 55 ? f.good + 1 : 0
    if (f.low >= 2 && this.level < 2) { this.level++; f.low = 0; f.cool = 8; this.applyQuality() }
    else if (f.good >= 6 && !f.cool && this.level > 0) { this.level--; f.good = 0; f.cool = 8; this.applyQuality() }
  }

  // ───────────────────────── camera ─────────────────────────
  flyTo(pos: THREE.Vector3, target: THREE.Vector3, dur = 1.6, done?: () => void) {
    this.controls.autoRotate = false
    this.flight = { t0: performance.now(), dur: dur * 1000, p0: this.camera.position.clone(), p1: pos, q0: this.controls.target.clone(), q1: target, done }
    this.dirty = true
  }

  building(id: string) { return this.buildings.find(b => b.id === id) }

  viewBuilding(id: string, kind: ViewKind = 'overview', dur = 1.6) {
    const b = this.building(id); if (!b) return
    const [cx, cz] = b.center
    const span = Math.max(b.size[0], b.size[1])
    const dist = Math.max(120, span * 2.1 + b.height * 2.6)
    const distK = dist * this.portraitK
    const t = new THREE.Vector3(cx, b.height * 0.35, cz)
    const at = (az: number, el: number, r = distK) => new THREE.Vector3(
      cx + Math.sin(az) * Math.cos(el) * r, Math.sin(el) * r, cz + Math.cos(az) * Math.cos(el) * r)
    // az = 0 → nhìn từ phía Nam (z dương) về phía Bắc
    const pos = {
      overview: at(-0.6, 0.62),
      front: at(0.05, 0.28, distK * 0.9),
      back: at(Math.PI + 0.05, 0.28, distK * 0.9),
      top: at(0.0, 1.35, distK * 1.15),
      orbit: at(-0.6, 0.5),
    }[kind]
    this.flyTo(pos, t, dur, kind === 'orbit' ? () => { this.controls.autoRotate = true } : undefined)
  }

  select(id: string | null, kind: ViewKind = 'overview') {
    this.selected = id
    const b = id ? this.building(id) : null
    if (b) {
      const r = Math.max(b.size[0], b.size[1]) * 0.62 + 6
      this.ring.scale.set(r, 1, r)
      this.ring.position.set(b.center[0], 0.35, b.center[1])
      this.ring.visible = true
      this.viewBuilding(b.id, kind)
    } else {
      this.ring.visible = false
      this.controls.autoRotate = false
    }
    this.cb.onSelect?.(id)
    this.dirty = true
  }

  /** Màn hình dọc (điện thoại) cần lùi camera xa hơn để thấy đủ. */
  private get portraitK() { return this.camera.aspect < 1 ? 1.25 + (1 - this.camera.aspect) * 0.9 : 1 }
  home(dur = 1.6) {
    const t = new THREE.Vector3(-10, 0, -60)
    const off = new THREE.Vector3(-320, 360, 480).multiplyScalar(this.portraitK)
    this.flyTo(t.clone().add(off), t, dur)
  }
  zoom(f: number) {
    const off = this.camera.position.clone().sub(this.controls.target).multiplyScalar(f)
    const len = THREE.MathUtils.clamp(off.length(), this.controls.minDistance, this.controls.maxDistance)
    this.flyTo(this.controls.target.clone().add(off.setLength(len)), this.controls.target.clone(), 0.5)
  }
  north() {
    const t = this.controls.target, off = this.camera.position.clone().sub(t)
    const r = Math.hypot(off.x, off.z)
    this.flyTo(new THREE.Vector3(t.x, this.camera.position.y, t.z + r), t.clone(), 0.8)
  }
  setOrbit(on: boolean) { this.controls.autoRotate = on; this.dirty = true }
  get orbiting() { return this.controls.autoRotate }
  /** Góc phương vị camera (độ, 0 = đang nhìn về hướng Bắc) — cho la bàn. */
  heading() {
    const d = this.controls.target.clone().sub(this.camera.position)
    return THREE.MathUtils.radToDeg(Math.atan2(d.x, -d.z))
  }
  panTo(x: number, z: number) {
    const t = this.controls.target, off = this.camera.position.clone().sub(t)
    const nt = new THREE.Vector3(x, 0, z)
    this.flyTo(nt.clone().add(off), nt, 0.9)
  }

  // ───────────────────────── chia sẻ góc nhìn ─────────────────────────
  viewHash() {
    const p = this.camera.position, t = this.controls.target, r = (v: number) => Math.round(v)
    const parts = [`v=${r(p.x)},${r(p.y)},${r(p.z)},${r(t.x)},${r(t.y)},${r(t.z)}`, `l=${this.preset}`]
    if (this.selected) parts.push(`b=${this.selected}`)
    return '#' + parts.join('&')
  }
  applyHash(hash: string) {
    const q = new URLSearchParams(hash.replace(/^#/, ''))
    const l = q.get('l') as Preset | null
    if (l && LIGHTING[l]) this.setPreset(l)
    const b = q.get('b')
    const v = q.get('v')?.split(',').map(Number)
    if (b && this.building(b)) {
      this.selected = b
      this.select(b)
    }
    if (v && v.length === 6 && v.every(Number.isFinite)) {
      this.flight = null
      this.camera.position.set(v[0], v[1], v[2])
      this.controls.target.set(v[3], v[4], v[5])
      this.controls.update()
    }
    return { preset: l, building: b }
  }

  /** Ảnh PNG của khung nhìn hiện tại (kèm dòng ghi chú ở chân ảnh). */
  snapshot(caption: string): string {
    this.renderer.render(this.scene, this.camera)
    const src = this.renderer.domElement
    const c = document.createElement('canvas'); c.width = src.width; c.height = src.height
    const g = c.getContext('2d')!
    g.drawImage(src, 0, 0)
    const s = Math.max(1, c.width / 1400)
    g.fillStyle = 'rgba(15,30,54,.72)'
    g.fillRect(0, c.height - 34 * s, c.width, 34 * s)
    g.fillStyle = '#fff'
    g.font = `${13 * s}px "Be Vietnam Pro", system-ui, sans-serif`
    g.textBaseline = 'middle'
    g.fillText(caption, 14 * s, c.height - 17 * s)
    return c.toDataURL('image/png')
  }

  // ───────────────────────── nhãn ─────────────────────────
  private v = new THREE.Vector3()
  /** Toạ độ màn hình của điểm neo nhãn; null nếu nằm sau camera / ngoài khung. */
  project(x: number, y: number, z: number) {
    const v = this.v.set(x, y, z).project(this.camera)
    if (v.z > 1 || v.z < -1) return null
    const w = this.renderer.domElement.clientWidth, h = this.renderer.domElement.clientHeight
    const sx = (v.x * 0.5 + 0.5) * w, sy = (-v.y * 0.5 + 0.5) * h
    if (sx < -60 || sx > w + 60 || sy < -40 || sy > h + 40) return null
    return { x: sx, y: sy, d: this.camera.position.distanceTo(this.v.set(x, y, z)) }
  }

  // ───────────────────────── tương tác chuột ─────────────────────────
  private bindPointer(canvas: HTMLCanvasElement) {
    let down: { x: number; y: number; t: number } | null = null
    canvas.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY, t: performance.now() } })
    canvas.addEventListener('pointerup', e => {
      if (!down) return
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y)
      const quick = performance.now() - down.t < 400
      down = null
      if (moved > 6 || !quick) return
      const id = this.pick(e.clientX, e.clientY)
      if (id) this.select(id)
    })
  }
  private ray = new THREE.Raycaster()
  pick(cx: number, cy: number): string | null {
    const r = this.renderer.domElement.getBoundingClientRect()
    const ndc = new THREE.Vector2(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1)
    this.ray.setFromCamera(ndc, this.camera)
    const hits = this.ray.intersectObjects(this.pickables.filter(o => o.visible), true)
    for (const h of hits) {
      let o: THREE.Object3D | null = h.object
      while (o && !o.userData.bid) o = o.parent
      const id = o?.userData.bid
      if (id && this.building(id)) return id
      if (id === 'tam-giac-CH-LI') return 'LI'
    }
    return null
  }

  // ───────────────────────── vòng lặp ─────────────────────────
  resize() {
    const c = this.renderer.domElement
    const w = c.clientWidth || window.innerWidth, h = c.clientHeight || window.innerHeight
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / h
    // Dời tâm khung nhìn sang vùng không bị bảng điều khiển che (bảng trái / ngăn kéo dưới)
    const { left, bottom } = this.insets
    if (left || bottom) this.camera.setViewOffset(w, h, -left / 2, bottom / 2, w, h)
    else this.camera.clearViewOffset()
    this.camera.updateProjectionMatrix()
    this.dirty = true
  }
  /** Phần màn hình bị bảng che (px) để căn giữa toà nhà vào vùng còn lại. */
  setInsets(left: number, bottom: number) {
    if (left === this.insets.left && bottom === this.insets.bottom) return
    this.insets = { left, bottom }
    this.resize()
  }

  start() {
    const loop = () => {
      this.raf = requestAnimationFrame(loop)
      const now = performance.now(); const dt = (now - this.last) / 1000; this.last = now
      if (this.flight) {
        const f = this.flight
        const k = Math.min(1, (performance.now() - f.t0) / f.dur)
        const e = ease(k)
        this.camera.position.lerpVectors(f.p0, f.p1, e)
        this.controls.target.lerpVectors(f.q0, f.q1, e)
        if (k >= 1) { this.flight = null; f.done?.() }
        this.dirty = true
      }
      if (this.ring.visible) {
        const pulse = 0.75 + Math.sin(performance.now() / 380) * 0.2
        ;(this.ring.material as THREE.MeshBasicMaterial).opacity = pulse
        this.dirty = true
      }
      const changed = this.controls.update()
      if (changed || this.controls.autoRotate) this.dirty = true
      // chỉ đo FPS khi đang vẽ liên tục (bỏ qua lúc cảnh đứng yên)
      if (!this.dirty) { this.fps.frames = 0; this.fps.t = 0; return }
      this.dirty = false
      this.renderer.render(this.scene, this.camera)
      this.sampleFps(dt)
      this.cb.onFrame?.()
    }
    loop()
  }

  dispose() {
    cancelAnimationFrame(this.raf)
    this.controls.dispose()
    this.renderer.dispose()
  }
}
