// Mặt tiền có cửa sổ cho các mô hình dạng khối (SketchUp): vẽ lưới cửa sổ bằng
// texture sinh trong trình duyệt, gán UV theo toạ độ thế giới (mỗi ô ≈ 3,2 m × 3,6 m/tầng).
// Ban đêm dùng emissiveMap để một phần cửa sổ sáng đèn.
import * as THREE from 'three'

const BAYS = 8, FLOORS = 6, BAY_W = 3.2, FLOOR_H = 3.6
const TILE_W = BAYS * BAY_W, TILE_H = FLOORS * FLOOR_H
const PX = 64 // px mỗi ô

let cache: { map: THREE.Texture; glow: THREE.Texture } | null = null

function seeded(i: number) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x) }

export function facadeTextures() {
  if (cache) return cache
  const W = BAYS * PX, H = FLOORS * PX
  const make = (fn: (g: CanvasRenderingContext2D) => void) => {
    const c = document.createElement('canvas'); c.width = W; c.height = H
    const g = c.getContext('2d')!; fn(g)
    const t = new THREE.CanvasTexture(c)
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 4
    return t
  }
  const win = (bx: number, fy: number) => {
    // toạ độ canvas (y hướng xuống); hàng 0 của canvas = tầng trên cùng của ô
    const x = bx * PX + PX * 0.16, w = PX * 0.68
    const y = (FLOORS - 1 - fy) * PX + PX * 0.22, h = PX * 0.5
    return [x, y, w, h] as const
  }
  const map = make(g => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, H)
    for (let fy = 0; fy < FLOORS; fy++) {
      // gờ sàn mỗi tầng
      g.fillStyle = '#e6e3dc'; g.fillRect(0, (FLOORS - 1 - fy) * PX + PX * 0.86, W, PX * 0.08)
      for (let bx = 0; bx < BAYS; bx++) {
        const [x, y, w, h] = win(bx, fy)
        g.fillStyle = '#5d7184'; g.fillRect(x, y, w, h)
        g.fillStyle = '#7f94a6'; g.fillRect(x, y, w, h * 0.35)
        g.fillStyle = '#d9d6cf'; g.fillRect(x + w / 2 - 1, y, 2, h)
      }
    }
  })
  const glow = make(g => {
    g.fillStyle = '#000000'; g.fillRect(0, 0, W, H)
    for (let fy = 0; fy < FLOORS; fy++) for (let bx = 0; bx < BAYS; bx++) {
      const r = seeded(fy * BAYS + bx)
      if (r < 0.42) continue
      const [x, y, w, h] = win(bx, fy)
      g.fillStyle = r > 0.85 ? '#cfe3ff' : '#ffd79a'
      g.fillRect(x, y, w, h)
    }
  })
  cache = { map, glow }
  return cache
}

/** Gán UV theo toạ độ thế giới: mặt đứng → lưới cửa sổ, mặt ngang → vùng tường trơn. */
export function worldFacadeUV(mesh: THREE.Mesh) {
  let geo = mesh.geometry as THREE.BufferGeometry
  if (geo.index) geo = geo.toNonIndexed()
  geo.computeVertexNormals()
  mesh.updateWorldMatrix(true, false)
  const pos = geo.getAttribute('position')
  const uv = new Float32Array(pos.count * 2)
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3()
  const n = new THREE.Vector3(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3()
  const mw = mesh.matrixWorld
  for (let i = 0; i < pos.count; i += 3) {
    a.fromBufferAttribute(pos, i).applyMatrix4(mw)
    b.fromBufferAttribute(pos, i + 1).applyMatrix4(mw)
    c.fromBufferAttribute(pos, i + 2).applyMatrix4(mw)
    n.crossVectors(e1.subVectors(b, a), e2.subVectors(c, a)).normalize()
    const vertical = Math.abs(n.y) < 0.35
    for (let k = 0; k < 3; k++) {
      const v = k === 0 ? a : k === 1 ? b : c
      if (vertical) {
        const tx = -n.z, tz = n.x
        uv[(i + k) * 2] = (v.x * tx + v.z * tz) / TILE_W
        uv[(i + k) * 2 + 1] = (v.y + 0.0) / TILE_H
      } else {
        uv[(i + k) * 2] = 0.003
        uv[(i + k) * 2 + 1] = 0.985
      }
    }
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  mesh.geometry = geo
}
