// Cây vẽ bằng InstancedMesh: mỗi cây chỉ là 1 dòng [x, z, cao, tán, loại] trong
// public/data/trees.json; trình duyệt dùng 2 mẫu cây (cây tán tròn, cây cau/dừa)
// và vẽ hàng nghìn bản sao trong vài lệnh vẽ.
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

export type TreeRow = [number, number, number, number, number] // x, z, height, width, palm(0/1)

/** Băm ổn định theo toạ độ: cùng 1 cây luôn có cùng góc xoay / sắc độ. */
export function hash01(x: number, z: number, salt = 0): number {
  const key = `${Math.round(x * 10)},${Math.round(z * 10)},${salt}`
  let h = 2166136261
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619) >>> 0
  return h / 4294967296
}

function painted(geo: THREE.BufferGeometry, color: string) {
  const g = geo.index ? geo.toNonIndexed() : geo
  const c = new THREE.Color(color)
  const n = g.getAttribute('position').count
  const arr = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) arr.set([c.r, c.g, c.b], i * 3)
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3))
  g.deleteAttribute('uv')
  return g
}

/** Mẫu cây tán tròn, cao 1, tán rộng 1 (sẽ scale theo từng cây). */
function broadleafTemplate() {
  const trunk = new THREE.CylinderGeometry(0.035, 0.05, 0.42, 6).translate(0, 0.21, 0)
  const c1 = new THREE.IcosahedronGeometry(1, 1).scale(0.5, 0.36, 0.5).translate(0, 0.62, 0)
  const c2 = new THREE.IcosahedronGeometry(1, 0).scale(0.32, 0.26, 0.32).translate(0.12, 0.8, -0.06)
  return mergeGeometries([painted(trunk, '#6b4b33'), painted(c1, '#5f9443'), painted(c2, '#6fa64f')])!
}

/** Mẫu cây cau / dừa: thân mảnh, tán lá xoè rủ xuống. */
function palmTemplate() {
  const parts: THREE.BufferGeometry[] = []
  parts.push(painted(new THREE.CylinderGeometry(0.018, 0.03, 0.86, 5).translate(0, 0.43, 0), '#8a7458'))
  for (let i = 0; i < 7; i++) {
    const leaf = new THREE.ConeGeometry(0.07, 0.5, 3, 1)
    leaf.rotateZ(-Math.PI / 2).scale(1, 0.25, 1).translate(0.25, 0, 0)
    leaf.rotateZ(-0.35).rotateY((i / 7) * Math.PI * 2).translate(0, 0.9, 0)
    parts.push(painted(leaf, i % 2 ? '#4f8a3a' : '#5c9a44'))
  }
  parts.push(painted(new THREE.IcosahedronGeometry(0.06, 0).translate(0, 0.9, 0), '#6b5a3c'))
  return mergeGeometries(parts)!
}

export class TreeLayer {
  group = new THREE.Group()
  private meshes: THREE.InstancedMesh[] = []
  private totals: number[] = []

  constructor(rows: TreeRow[]) {
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0, flatShading: true })
    const sets = [rows.filter(r => !r[4]), rows.filter(r => r[4])]
    // Thứ tự ổn định theo băm toạ độ → khi giảm mật độ, cây bị ẩn rải đều khắp campus.
    sets.forEach(s => s.sort((a, b) => hash01(a[0], a[1], 7) - hash01(b[0], b[1], 7)))
    const templates = [broadleafTemplate(), palmTemplate()]
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3()
    const col = new THREE.Color()
    sets.forEach((set, k) => {
      const mesh = new THREE.InstancedMesh(templates[k], mat, Math.max(set.length, 1))
      set.forEach(([x, z, h, w], i) => {
        const rot = hash01(x, z) * Math.PI * 2
        const ww = k ? Math.max(w, h * 0.55) : Math.max(w, h * 0.45)
        q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rot)
        s.set(ww, h, ww)
        p.set(x, 0, z)
        mesh.setMatrixAt(i, m.compose(p, q, s))
        const b = 0.86 + hash01(x, z, 3) * 0.28
        const tint = [[1.0, 1.0, 0.9], [0.9, 1.0, 0.95], [1.05, 1.04, 0.92]][Math.floor(hash01(x, z, 5) * 3)]
        mesh.setColorAt(i, col.setRGB(tint[0] * b, tint[1] * b, tint[2] * b))
      })
      mesh.count = set.length
      mesh.castShadow = true
      mesh.receiveShadow = false
      mesh.frustumCulled = false
      mesh.userData.layer = 'trees'
      this.meshes.push(mesh)
      this.totals.push(set.length)
      this.group.add(mesh)
    })
  }

  /** density 0..1: tỉ lệ số cây được vẽ (dùng khi máy yếu). */
  setDensity(d: number) {
    this.meshes.forEach((mesh, i) => { mesh.count = Math.round(this.totals[i] * d) })
  }

  get total() { return this.totals.reduce((a, b) => a + b, 0) }
}
