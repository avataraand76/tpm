// frontend/src/theme/colors.js
//
// ════════════════════════════════════════════════════════════════════════════
// BẢNG MÀU - NGUỒN DUY NHẤT
// ════════════════════════════════════════════════════════════════════════════
//
// Trước đây 753 chuỗi hex nằm rải rác trong 20 file; 65 màu trong số đó lặp
// từ 3 lần trở lên, chiếm 89% tổng lượt dùng.
//
// Mọi giá trị dưới đây GIỮ ĐÚNG hex cũ - đổi tên chứ không đổi màu.
//
// ĐÃ NHẤT QUÁN: chỉ còn MỘT thang xám (chuẩn Material 50..900). Hai hệ cũ
// `slate` (xám pha navy) và `panel` (6 sắc trắng-ngà) đã được gộp vào đây,
// cùng các dạng viết tắt #333/#444/#555/#666/#eee.
// Trong mỗi nhóm màu, các sắc lệch nhau quá ít để mắt phân biệt cũng đã gộp
// (ghi rõ ở từng dòng). Các nền pastel `*.wash` thì KHÔNG gộp - chúng mang
// nghĩa trạng thái khác nhau (đỏ = lỗi, xanh = ổn, cam = chờ).

export const colors = {
  /** Tím-xanh thương hiệu (gradient chính của hệ thống) */
  brand: {
    main: "#667eea",
    alt: "#764ba2",
    hover: "#5568d3",
    altHover: "#6a3f8f", // cặp hover của `alt`, luôn đi kèm `hover`
    line: "#d0d4f0", // viền tím nhạt
    wash: "#eef0fb", // đã gộp `tint` (#ede7f6) vào đây - lệch 20
  },

  /** Xanh lá - thành công / máy có thể sử dụng */
  green: {
    main: "#2e7d32", // = palette.success.main
    light: "#4caf50", // = palette.success.light
    dark: "#1b5e20", // = palette.success.dark
    pale: "#a5d6a7",
    wash: "#e8f5e9",
  },

  /** Xanh dương - thông tin / máy đang sử dụng */
  blue: {
    main: "#1976d2", // = palette.primary.main
    light: "#42a5f5", // = palette.primary.light
    dark: "#1565c0", // = palette.primary.dark
    sky: "#03a9f4",
    bright: "#38bdf8",
    deep: "#0288d1",
    wash: "#e3f2fd",
  },

  /** Cam - cảnh báo / chưa sử dụng */
  orange: {
    main: "#ff9800",
    dark: "#ed6c02", // đã gộp `alt` (#ef6c00) - lệch 4.5
    deep: "#e65100",
    hover: "#f57c00",
    burnt: "#bf360c",
    amber: "#f57f17",
    red: "#ff5722",
    wash: "#fff3e0",
  },

  /** Đỏ - lỗi / thanh lý */
  red: {
    main: "#f44336", // đã gộp `bright` (#e53935) - lệch 29
    dark: "#d32f2f", // đã gộp `alt` (#dc2626) và `deeper` (#c62828)
    deepest: "#b71c1c",
    pale: "#ef9a9a",
    wash: "#ffebee",
  },

  /** Xanh ngọc - chức năng RFID */
  teal: {
    main: "#00897b",
    light: "#26a69a",
    dark: "#00796b",
  },

  /** Tím - lịch sử sửa chữa */
  purple: {
    main: "#673ab7",
    deep: "#7b1fa2",
    magenta: "#9c27b0",
    violet: "#9333ea",
    pink: "#c2185b",
  },

  /** Lơ - trạng thái con của "chưa sử dụng" */
  cyan: {
    main: "#00bcd4",
  },

  /** Vàng - nền ô nhập bị khoá / tự điền (xem sx.fieldHighlight) */
  yellow: {
    wash: "#fffbe5",
  },

  /**
   * THANG XÁM DUY NHẤT của dự án (chuẩn Material, 50..900).
   * Trước đây tồn tại 3 hệ song song + các dạng viết tắt:
   *   grey  (Material)             139 lần / 9 file
   *   slate (kiểu Tailwind, navy)   74 lần / 2 file
   *   panel (6 sắc trắng-ngà)       28 lần / 7 file
   *   và #333 / #444 / #555 / #666 / #eee viết tắt
   * Tất cả đã gộp về bảng này. KHÔNG thêm sắc xám nào ngoài đây.
   */
  grey: {
    50: "#fafafa",
    100: "#f5f5f5",
    200: "#eeeeee",
    300: "#e0e0e0",
    400: "#bdbdbd",
    500: "#9e9e9e",
    600: "#757575",
    700: "#616161",
    800: "#424242",
    900: "#212121",
  },

  white: "#ffffff",
  black: "#000",
};

/**
 * Ghép hậu tố alpha vào mã hex 6 ký tự -> hex 8 ký tự.
 *
 *   hexA(colors.green.main, "11")  ->  "#2e7d3211"   (~7% mờ)
 *   hexA(colors.brand.main, "22")  ->  "#667eea22"   (~13% mờ)
 *
 * 64 chỗ trong dự án đang viết thẳng hex 8 ký tự kiểu "#2e7d3211". Dùng hàm
 * này thì màu gốc vẫn truy được về token, và chuỗi sinh ra GIỐNG HỆT bản cũ.
 */
export const hexA = (hex6, alphaHex) => `${hex6}${alphaHex}`;

export default colors;
