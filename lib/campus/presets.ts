// Bốn chế độ ánh sáng. Đây là thông số mang tính thẩm mỹ, không tính vị trí mặt trời thật.
export type Preset = 'morning' | 'day' | 'evening' | 'night'
export const PRESETS: Preset[] = ['morning', 'day', 'evening', 'night']

export interface Lighting {
  sun: string          // màu nắng
  sunPower: number
  dir: [number, number, number] // hướng tới mặt trời (x=Đông, y=lên, z=−Bắc)
  hemiSky: string
  hemiGround: string
  hemiPower: number
  skyTop: string       // màu trời phía trên
  skyHorizon: string   // màu chân trời (cũng là màu sương mù)
  ground: string       // màu nền đất
  exposure: number
  windows: number      // độ sáng cửa sổ ban đêm (0 = tắt)
  lamps: number        // độ sáng đèn đường
}

export const LIGHTING: Record<Preset, Lighting> = {
  morning: {
    sun: '#ffe2bd', sunPower: 2.6, dir: [520, 260, 300],
    hemiSky: '#cfe0f5', hemiGround: '#7d8a6a', hemiPower: 0.95,
    skyTop: '#86b3e3', skyHorizon: '#f4e2c8', ground: '#c9cfb8',
    exposure: 1.0, windows: 0, lamps: 0,
  },
  day: {
    sun: '#fff6e6', sunPower: 3.0, dir: [-280, 700, 260],
    hemiSky: '#d6e8fb', hemiGround: '#87906c', hemiPower: 0.9,
    skyTop: '#6fa7e0', skyHorizon: '#dcecf7', ground: '#ced5c0',
    exposure: 1.0, windows: 0, lamps: 0,
  },
  evening: {
    sun: '#ffc79c', sunPower: 2.2, dir: [-560, 190, -260],
    hemiSky: '#d9dcef', hemiGround: '#7d7363', hemiPower: 0.95,
    skyTop: '#5d6fa8', skyHorizon: '#f2b88c', ground: '#c2c3b6',
    exposure: 1.0, windows: 0.55, lamps: 0.4,
  },
  night: {
    sun: '#9fbde6', sunPower: 0.55, dir: [-300, 600, -350],
    hemiSky: '#6d89b6', hemiGround: '#26313f', hemiPower: 0.6,
    skyTop: '#060c1e', skyHorizon: '#1d2c4a', ground: '#4a5363',
    exposure: 1.05, windows: 1.6, lamps: 1.0,
  },
}
