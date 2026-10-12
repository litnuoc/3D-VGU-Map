// Song ngữ Việt / Anh. Lựa chọn được nhớ trong trình duyệt.
type Lang = 'vi' | 'en'

const DICT: Record<string, { vi: string; en: string }> = {
  'app.name': { vi: 'Campus 3D', en: 'Campus 3D' },
  'app.sub': { vi: 'VIETNAMESE-GERMAN UNIVERSITY · CAMPUS EXPLORER', en: 'VIETNAMESE-GERMAN UNIVERSITY · CAMPUS EXPLORER' },
  'app.place': { vi: 'Bến Cát · TP. Hồ Chí Minh', en: 'Ben Cat · Ho Chi Minh City' },
  'panel.title': { vi: 'Khám phá campus', en: 'Explore campus' },
  'panel.collapse': { vi: 'Thu gọn', en: 'Collapse' },
  'panel.expand': { vi: 'Mở', en: 'Open' },
  'tab.explore': { vi: 'Khám phá', en: 'Explore' },
  'tab.layers': { vi: 'Lớp', en: 'Layers' },
  'tab.env': { vi: 'Môi trường', en: 'Environment' },
  'search.ph': { vi: 'Tìm toà nhà, mã toà…', en: 'Search buildings, codes…' },
  'search.none': { vi: 'Không tìm thấy địa điểm phù hợp.', en: 'No matching places.' },
  'cat.all': { vi: 'Tất cả', en: 'All' },
  'cat.academic': { vi: 'Học tập', en: 'Academic' },
  'cat.admin': { vi: 'Hành chính', en: 'Administration' },
  'cat.event': { vi: 'Sự kiện', en: 'Events' },
  'cat.life': { vi: 'Đời sống', en: 'Campus life' },
  'cat.sport': { vi: 'Thể thao', en: 'Sports' },
  'cat.tech': { vi: 'Kỹ thuật', en: 'Utilities' },
  'tour.start': { vi: 'Tham quan tự động', en: 'Start campus tour' },
  'tour.hint': { vi: 'Camera tự bay qua {n} địa điểm', en: 'The camera visits {n} places' },
  'tour.paused': { vi: 'Đã tạm dừng', en: 'Paused' },
  'tour.playing': { vi: 'Đang tham quan', en: 'Touring' },
  'tour.stop': { vi: 'Dừng', en: 'Stop' },
  'layer.buildings': { vi: 'Toà nhà', en: 'Buildings' },
  'layer.trees': { vi: 'Cây xanh', en: 'Trees' },
  'layer.grass': { vi: 'Thảm cỏ', en: 'Lawns' },
  'layer.roads': { vi: 'Đường & sân', en: 'Roads & fields' },
  'layer.labels': { vi: 'Nhãn tên', en: 'Labels' },
  'layer.note': { vi: 'Bật / tắt từng lớp của mô hình.', en: 'Toggle each layer of the model.' },
  'env.note': { vi: 'Cùng một campus, nhiều khoảnh khắc.', en: 'One campus, different light.' },
  'env.morning': { vi: 'Bình minh', en: 'Morning' },
  'env.day': { vi: 'Ban ngày', en: 'Daytime' },
  'env.evening': { vi: 'Hoàng hôn', en: 'Dusk' },
  'env.night': { vi: 'Ban đêm', en: 'Night' },
  'q.title': { vi: 'Chất lượng hình ảnh', en: 'Image quality' },
  'q.auto': { vi: 'Tự động', en: 'Automatic' },
  'q.auto.d': { vi: 'Theo màn hình và tốc độ máy', en: 'Adapts to screen and performance' },
  'q.fine': { vi: 'Chi tiết', en: 'Fine' },
  'q.fine.d': { vi: 'Đủ cây, bóng đổ sắc nét', en: 'All trees, crisp shadows' },
  'q.smooth': { vi: 'Mượt', en: 'Smooth' },
  'q.smooth.d': { vi: 'Bớt cây, tắt bóng đổ — cho máy yếu', en: 'Fewer trees, no shadows — for slower devices' },
  'q.now': { vi: 'Đang dùng', en: 'Current' },
  'q.l0': { vi: 'chi tiết', en: 'fine' },
  'q.l1': { vi: 'cân bằng', en: 'balanced' },
  'q.l2': { vi: 'mượt', en: 'smooth' },
  'detail.kicker': { vi: 'ĐỊA ĐIỂM TRONG CAMPUS', en: 'CAMPUS LANDMARK' },
  'detail.floors': { vi: 'Số tầng', en: 'Floors' },
  'detail.height': { vi: 'Chiều cao mô hình', en: 'Model height' },
  'detail.size': { vi: 'Kích thước', en: 'Footprint' },
  'detail.code': { vi: 'Mã', en: 'Code' },
  'view.overview': { vi: 'Toàn cảnh', en: 'Overview' },
  'view.front': { vi: 'Mặt trước', en: 'Front' },
  'view.back': { vi: 'Mặt sau', en: 'Back' },
  'view.top': { vi: 'Nhìn từ trên', en: 'Top view' },
  'view.orbit': { vi: 'Xoay vòng', en: 'Orbit' },
  'detail.share': { vi: 'Chia sẻ góc nhìn', en: 'Share this view' },
  'detail.back': { vi: 'Danh sách', en: 'All places' },
  'tool.north': { vi: 'Quay về hướng Bắc', en: 'Face north' },
  'tool.zoomin': { vi: 'Phóng to', en: 'Zoom in' },
  'tool.zoomout': { vi: 'Thu nhỏ', en: 'Zoom out' },
  'tool.layers': { vi: 'Lớp hiển thị', en: 'Layers' },
  'tool.home': { vi: 'Về toàn cảnh', en: 'Reset view' },
  'tool.orbit': { vi: 'Tự xoay', en: 'Auto-rotate' },
  'tool.full': { vi: 'Toàn màn hình', en: 'Full screen' },
  'tool.share': { vi: 'Chia sẻ góc nhìn', en: 'Share view' },
  'tool.png': { vi: 'Tải ảnh PNG', en: 'Download PNG' },
  'toast.copied': { vi: 'Đã sao chép liên kết góc nhìn', en: 'View link copied' },
  'toast.png': { vi: 'Đã tải ảnh', en: 'Image saved' },
  'loading': { vi: 'Đang dựng campus…', en: 'Building the campus…' },
  'error': { vi: 'Không tải được dữ liệu 3D. Hãy tải lại trang.', en: 'Could not load the 3D data. Please reload.' },
  'nowebgl': { vi: 'Trình duyệt không hỗ trợ WebGL.', en: 'Your browser does not support WebGL.' },
  'info.title': { vi: 'Về bản đồ này', en: 'About this map' },
  'info.body1': {
    vi: 'Mô hình 3D khuôn viên Trường Đại học Việt Đức (VGU). Toà nhà lấy từ mô hình SketchUp/IFC của trường; đường, cây xanh và thảm cỏ lấy từ bản vẽ quy hoạch, được ghép theo toạ độ thật.',
    en: 'A 3D model of the Vietnamese-German University campus. Buildings come from the university’s SketchUp/IFC models; roads, trees and lawns come from the site plan and were aligned to real coordinates.',
  },
  'info.body2': {
    vi: 'Vị trí có sai số vài mét. Mặt tiền cửa sổ và cây là hình minh hoạ, không phải khảo sát thực địa. Mô tả toà nhà có thể sửa trong public/data/buildings.json.',
    en: 'Positions may be off by a few metres. Window facades and trees are illustrative, not surveyed. Building descriptions can be edited in public/data/buildings.json.',
  },
  'info.keys': { vi: 'Chuột trái: kéo bản đồ · Chuột phải: xoay · Cuộn: phóng to/thu nhỏ · Bấm vào toà nhà để xem chi tiết.', en: 'Left drag: pan · Right drag: rotate · Scroll: zoom · Click a building for details.' },
  'info.close': { vi: 'Đóng', en: 'Close' },
  'minimap': { vi: 'Bản đồ nhỏ — bấm để di chuyển', en: 'Mini map — click to move' },
}

export function useLang() {
  const lang = useState<Lang>('lang', () => {
    try { return (localStorage.getItem('vgu3d-lang') as Lang) || 'vi' } catch { return 'vi' }
  })
  const t = (k: string, vars?: Record<string, string | number>) => {
    let s = DICT[k]?.[lang.value] ?? k
    if (vars) for (const [a, b] of Object.entries(vars)) s = s.replace(`{${a}}`, String(b))
    return s
  }
  const setLang = (l: Lang) => {
    lang.value = l
    try { localStorage.setItem('vgu3d-lang', l) } catch {}
    if (typeof document !== 'undefined') document.documentElement.lang = l
  }
  return { lang, t, setLang }
}
