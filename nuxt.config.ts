// Cảnh 3D chạy hoàn toàn phía trình duyệt → tắt SSR, xuất web tĩnh cho GitHub Pages.
// Đường dẫn gốc lấy từ biến môi trường NUXT_APP_BASE_URL (vd "/vgu-campus-3d/"),
// workflow .github/workflows/pages.yml tự đặt theo tên repo.
export default defineNuxtConfig({
  ssr: false,
  devtools: { enabled: false },
  app: {
    baseURL: process.env.NUXT_APP_BASE_URL || '/',
    buildAssetsDir: 'assets',
    head: {
      title: 'VGU · Campus 3D',
      htmlAttrs: { lang: 'vi' },
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'theme-color', content: '#0F1E36' },
        { name: 'description', content: 'Bản đồ 3D tương tác khuôn viên Trường Đại học Việt Đức (VGU).' },
      ],
      link: [
        { rel: 'icon', type: 'image/png', href: (process.env.NUXT_APP_BASE_URL || '/') + 'icon-192x192.png' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700&display=swap' },
      ],
    },
  },
  // Link GitHub ở góc phải header: workflow tự đặt NUXT_PUBLIC_REPO_URL = link repo.
  runtimeConfig: { public: { repoUrl: process.env.NUXT_PUBLIC_REPO_URL || '' } },
  css: ['~/assets/main.css'],
  nitro: { preset: 'github_pages' },
  vite: { optimizeDeps: { include: ['three'] } },
  build: { transpile: ['three'] },
  typescript: { strict: false },
  compatibilityDate: '2026-07-20',
})
