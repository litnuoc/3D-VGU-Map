<script setup lang="ts">
// Bộ biểu tượng nét (24×24, stroke) dùng trong giao diện.
const props = defineProps<{ name: string; size?: number }>()
const P: Record<string, string> = {
  compass: 'M12 2l4 10-4 10-4-10z M12 2v10',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  layers: 'M12 3l9 5-9 5-9-5 9-5z M3 13l9 5 9-5',
  home: 'M3 11l9-7 9 7 M5 10v10h14V10',
  orbit: 'M21 12a9 9 0 1 1-3-6.7 M21 4v5h-5',
  full: 'M4 9V4h5 M20 9V4h-5 M4 15v5h5 M20 15v5h-5',
  share: 'M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M18 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M8.6 13.5l6.8 4 M15.4 6.5l-6.8 4',
  download: 'M12 4v11 M7 10l5 5 5-5 M4 20h16',
  info: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 11v6 M12 7.5v.5',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z M20 20l-4-4',
  explore: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M15.5 8.5l-2 5-5 2 2-5z',
  sun: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M12 2v2 M12 20v2 M4.9 4.9l1.4 1.4 M17.7 17.7l1.4 1.4 M2 12h2 M20 12h2 M4.9 19.1l1.4-1.4 M17.7 6.3l1.4-1.4',
  sunrise: 'M12 3v6 M9 6l3-3 3 3 M5 13l1.4 1.4 M19 13l-1.4 1.4 M3 19h18 M7 19a5 5 0 0 1 10 0',
  sunset: 'M12 9V3 M9 6l3 3 3-3 M5 13l1.4 1.4 M19 13l-1.4 1.4 M3 19h18 M7 19a5 5 0 0 1 10 0',
  moon: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z',
  chevdown: 'M6 9l6 6 6-6',
  chevup: 'M6 15l6-6 6 6',
  chevleft: 'M15 6l-6 6 6 6',
  chevright: 'M9 6l6 6-6 6',
  close: 'M6 6l12 12 M18 6L6 18',
  play: 'M7 5l12 7-12 7z',
  pause: 'M8 5v14 M16 5v14',
  stop: 'M6 6h12v12H6z',
  pin: 'M12 22s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z M12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  building: 'M4 21V5l8-3 8 3v16 M9 21v-4h6v4 M8 8h2 M14 8h2 M8 12h2 M14 12h2',
  check: 'M5 12l4.5 4.5L19 7',
  github: 'M9 19c-4 1.5-4-2-6-2.5 M15 22v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1-.3-3.4 1.3a11.6 11.6 0 0 0-6 0C6.8 2.8 5.8 3.1 5.8 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4.4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V22',
  external: 'M14 4h6v6 M20 4l-9 9 M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5',
  globe: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M2 12h20 M12 2a15 15 0 0 1 0 20 M12 2a15 15 0 0 0 0 20',
}
</script>

<template>
  <svg :width="props.size || 18" :height="props.size || 18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path :d="P[props.name] || ''" />
  </svg>
</template>
