// frontend/src/theme.js
//
// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  TOAN BO GIAO DIEN CUA DU AN NAM TRONG FILE NAY
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// Muon doi mau, co chu, bo goc, bong do, gradient, mau trang thai, hay style
// mac dinh cua component MUI -> sua o day, KHONG sua trong pages/ hay
// components/. Cac trang chi import qua "../ui".
//
// MUC LUC (Ctrl+F theo so muc, vi du "§3."):
//   §1  MAU                   colors, hexA
//   §2  CO CHU                FLUID_TYPE, scale, fluid, fluidPx, fontSizes
//   §3  GRADIENT / MAU NHAN   gradients, accents, accentGradient/Wash/Shadow
//   §4  BO GOC / VIEN / BONG  radii, borders, shadow, ring, shadows
//   §5  TRANG THAI            STATUS_*, STAT_COLORS, MAINT_*, TICKET_*
//   §6  THEME MUI             palette, breakpoints, typography, components
//   §7  PRESET sx             autoGrid, sx.*
//
// Truoc day day la 11 file trong theme/ - phai doan file nao chua thu can sua,
// va mot quyet dinh (vi du bong cua the) nam rai o 3 file khac nhau.

import { createTheme } from "@mui/material/styles";


// ══════════════════════════════════════════════════════════════════════════
// §1. MAU
//    Doi mau toan app o day. Moi gia tri giu dung hex cu.
// ══════════════════════════════════════════════════════════════════════════

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

  /**
   * XANH NAVY - thang xám PHA XANH (kiểu Tailwind slate).
   *
   * Dùng cho các KHỐI TỐI của ReportPage: card "Biểu đồ trạng thái máy",
   * "Tiến độ bảo dưỡng", hero "Công suất máy bơm khí nén", dải tiêu đề chế độ
   * standalone và nút "Mở dashboard ở tab mới".
   *
   * CỐ TÌNH TÁCH khỏi `grey` (xám trung tính). Trước đây thang này bị gộp vào
   * grey, làm các card trên chuyển từ navy 2 tông sang xám chì phẳng - đúng
   * chỗ người dùng phát hiện. Đừng gộp lại.
   */
  navy: {
    darkest: "#0f172a", // chặng đầu gradient nền tối
    dark: "#1e293b", // chặng cuối gradient nền tối
    main: "#334155",
    light: "#475569",
    muted: "#64748b",
    pale: "#94a3b8", // chữ MỜ trên nền navy
    wash: "#e2e8f0", // chữ sáng trên nền navy
    tint: "#f1f5f9", // chữ sáng hơn nữa
    lightest: "#f8fafc", // chữ sáng nhất
  },

  /** Vàng - nền ô nhập bị khoá / tự điền (xem sx.fieldHighlight) */
  yellow: {
    wash: "#fffbe5",
  },

  /**
   * THANG XÁM DUY NHẤT của dự án (chuẩn Material, 50..900).
   * Trước đây tồn tại 3 hệ song song + các dạng viết tắt:
   *   grey  (Material)             139 lần / 9 file
   *   slate (kiểu Tailwind, navy)   74 lần / 2 file  <- phần NỀN TỐI đã tách
   *                                    trở lại thành `navy` ở trên
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


// ══════════════════════════════════════════════════════════════════════════
// §2. CO CHU
//    FLUID_TYPE = cong tac co dinh / co gian, chi phoi ca §6.
// ══════════════════════════════════════════════════════════════════════════

const REM = 16; // 1rem = 16px (mặc định của trình duyệt)

export const MIN_VW = 360; // điện thoại nhỏ nhất cần hỗ trợ
export const MAX_VW = 1280; // laptop/màn hình lớn - từ đây trở lên không to thêm

/**
 * Sinh chuỗi CSS clamp() nội suy tuyến tính từ minPx (tại minVw)
 * đến maxPx (tại maxVw).
 *
 * @param {number} minPx  giá trị nhỏ nhất, đơn vị px
 * @param {number} maxPx  giá trị lớn nhất, đơn vị px
 * @param {number} [minVw] bề rộng viewport bắt đầu co giãn
 * @param {number} [maxVw] bề rộng viewport ngừng co giãn
 * @returns {string} ví dụ "clamp(0.875rem, 0.7717rem + 0.2174vw, 1rem)"
 */
export const fluid = (minPx, maxPx, minVw = MIN_VW, maxVw = MAX_VW) => {
  if (minPx === maxPx) return `${minPx / REM}rem`;

  const slope = (maxPx - minPx) / (maxVw - minVw);
  const interceptRem = (minPx - slope * minVw) / REM;
  const vw = slope * 100;

  return `clamp(${minPx / REM}rem, ${interceptRem.toFixed(4)}rem + ${vw.toFixed(
    4
  )}vw, ${maxPx / REM}rem)`;
};

/**
 * Bản dùng cho px thuần (chiều cao, kích thước icon, bề rộng cột...).
 * Giống fluid() nhưng trả về px thay vì rem - tiện cho width/height.
 *
 *   height: fluidPx(240, 420)   // khung chart tự cao dần theo màn hình
 */
export const fluidPx = (minPx, maxPx, minVw = MIN_VW, maxVw = MAX_VW) => {
  if (minPx === maxPx) return `${minPx}px`;

  const slope = (maxPx - minPx) / (maxVw - minVw);
  const intercept = minPx - slope * minVw;
  const vw = slope * 100;

  return `clamp(${minPx}px, ${intercept.toFixed(2)}px + ${vw.toFixed(
    4
  )}vw, ${maxPx}px)`;
};

// ============================================================================
// CÔNG TẮC CỠ CHỮ - MỘT CHỖ DUY NHẤT
// ============================================================================
//
// false = MỌI cỡ chữ trong app là con số CỐ ĐỊNH (đúng bằng giá trị "lớn nhất",
//         tức y hệt bản cũ trên desktop). Đây là lựa chọn hiện tại của dự án.
// true  = cỡ chữ tự co giãn theo bề rộng màn hình bằng clamp().
//
// Công tắc này chi phối CẢ BA nơi khai báo cỡ chữ:
//   §6 typography  (variant h1..h6, body1/2, caption...)
//   §2 fontSizes   (các cỡ ghi đè trong trang)
//   §6 components  (fontSize theo size của Button, TableCell)
//
// LƯU Ý: chỉ áp cho CỠ CHỮ. Các kích thước khác (chiều cao khung chart qua
// fluidPx, số cột qua autoGrid) vẫn tự co giãn - đó là phần responsive tự động,
// không liên quan cỡ chữ.
export const FLUID_TYPE = false;

/**
 * Cỡ chữ theo công tắc FLUID_TYPE.
 *   scale(12, 14)  ->  "0.875rem"                      khi FLUID_TYPE = false
 *   scale(12, 14)  ->  "clamp(0.75rem, ... , 0.875rem)" khi FLUID_TYPE = true
 *
 * @param {number} lo cỡ nhỏ nhất (px) - chỉ dùng khi bật co giãn
 * @param {number} hi cỡ lớn nhất (px) - LUÔN là giá trị chuẩn/hiển thị cố định
 */
export const scale = (lo, hi) =>
  FLUID_TYPE ? fluid(lo, hi) : `${hi / REM}rem`;

/** Xuất lại công tắc chung để nơi khác kiểm tra được trạng thái hiện tại.
 *  false = MỌI cỡ chữ trong app là con số cố định (kể cả typography variant). */
export const FLUID = FLUID_TYPE;

// (REM khai bao mot lan o dau §2)
const FIXED = (px) => `${px / REM}rem`;

export const fontSizes = {
  // ── THANG 8 BẬC. Con số là px; đổi ở đây là đổi toàn app. ──────────────
  //  tên      px     số chỗ dùng   thay cho các cỡ cũ
  caption: FIXED(10), //   13   nhãn siêu nhỏ trong Chip / ô bảng   (9.28 9.6 9.92 10.4)
  label: FIXED(11.2), //   20   nhãn, chú thích, icon nhỏ           (10.88 11 11.2 11.52)
  small: FIXED(12.6), //   57   chữ nhỏ: ô bảng dày, Chip           (12 12.16 12.48 12.8 13)
  body: scale(12, 13.6), //   54   chữ nội dung thường              (13.12 13.6 14 14.08 14.24 14.4)
  lead: scale(13.6, 15.6), //   51   chữ nhấn: ô bảng chính, Tabs   (15.2 16)
  title: scale(15.6, 17.6), //   16  tiêu đề nhỏ, AlertTitle        (16.8 17.6 19.2)
  xl: scale(20, 24), //    2   icon hành động trong bảng           (24)
  xxl: scale(24, 28.8), //    1  icon cảnh báo lớn                 (28.8)
};


// ══════════════════════════════════════════════════════════════════════════
// §3. GRADIENT / MAU NHAN
//    Dan xuat tu §1. Phai dat TRUOC §4 vi shadows dung accents.*.rgb.
// ══════════════════════════════════════════════════════════════════════════

export const gradients = {
  // Gradient thương hiệu (tím-xanh) dùng cho tiêu đề, avatar, logo
  brand: "linear-gradient(45deg, #667eea, #764ba2)",
  // Nền mờ của khối chào mừng (3 chặng, nhạt nhất)
  brandWash:
    "linear-gradient(135deg, #667eea11 0%, #764ba211 50%, #2e7d3211 100%)",
  // Nền mờ của thẻ số liệu tổng (2 chặng, đậm hơn brandWash một bậc)
  brandWash2: "linear-gradient(135deg, #667eea22 0%, #764ba222 100%)",
  // Cùng 2 màu thương hiệu nhưng 135deg + có mốc dừng 0%/100%.
  // Dùng ở NavigationBar, LoginPage, AdminPage, MaintenanceSchedulePage.
  brandDeep: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  // Thanh ngang 90deg - dùng cho dải tiêu đề mục
  brandBar: "linear-gradient(90deg,#667eea,#764ba2)",
  // Đảo chiều 2 màu thương hiệu
  brandReverse: "linear-gradient(45deg, #764ba2, #667eea)",
  // Xanh ngọc - dialog & nút của chức năng quét RFID hàng loạt
  teal: "linear-gradient(135deg, #00897b 0%, #26a69a 100%)",
  tealDark: "linear-gradient(135deg, #00796b 0%, #00897b 100%)",
  teal45: "linear-gradient(45deg, #00897b 0%, #26a69a 100%)",
  teal45Dark: "linear-gradient(45deg, #00796b 0%, #00897b 100%)",
  // Bản tối hơn của brand, dùng cho trạng thái hover của nút
  brandHover: "linear-gradient(45deg, #5a6fd6, #6a4190)",
  // Cam đậm - biến thể "batch" của dialog RFID
  orange: "linear-gradient(45deg, #ff9800, #ff5722)",
  orangeHover: "linear-gradient(45deg, #f57c00, #e64a19)",
};

export const accents = {
  red: { from: "#ff6b6b", to: "#ee5a6f", rgb: "255, 107, 107" },
  // Cam đậm (biến thể "batch" của dialog RFID) - khác `amber` bên dưới
  orange: { from: "#ff9800", to: "#ff5722", rgb: "255, 152, 0" },
  teal: { from: "#00897b", to: "#26a69a", rgb: "0, 137, 123" },
  green: { from: "#2e7d32", to: "#4caf50", rgb: "46, 125, 50" },
  cyan: { from: "#03a9f4", to: "#00bcd4", rgb: "3, 169, 244" },
  amber: { from: "#ffa726", to: "#fb8c00", rgb: "255, 167, 38" },
  purple: { from: "#9c27b0", to: "#e91e63", rgb: "156, 39, 176" },
  slate: { from: "#607d8b", to: "#455a64", rgb: "96, 125, 139" },
  brand: { from: "#667eea", to: "#764ba2", rgb: "102, 126, 234" },
};

/** "linear-gradient(45deg, #ff6b6b, #ee5a6f)" */
export const accentGradient = (key, deg = 45) => {
  const a = accents[key] ?? accents.brand;
  return `linear-gradient(${deg}deg, ${a.from}, ${a.to})`;
};

/** Nền mờ 13% của accent - dùng làm nền thẻ */
export const accentWash = (key) => {
  const a = accents[key] ?? accents.brand;
  return `linear-gradient(135deg, ${a.from}22 0%, ${a.to}22 100%)`;
};

/** Bóng đổ mang màu accent */
export const accentShadow = (key, y = 20, blur = 40, alpha = 0.2) => {
  const a = accents[key] ?? accents.brand;
  return `0 ${y}px ${blur}px rgba(${a.rgb}, ${alpha})`;
};


// ══════════════════════════════════════════════════════════════════════════
// §4. BO GOC / VIEN / BONG DO
//    Bong chuan cua moi mat phang noi dung la shadows.card.
// ══════════════════════════════════════════════════════════════════════════

// "Design token" - các giá trị hình ảnh bị lặp lại khắp app.
// Trước đây chuỗi "linear-gradient(45deg, #667eea, #764ba2)" xuất hiện 5 lần
// chỉ riêng trong HomePage. Giờ nó có ĐÚNG MỘT nguồn.

export const radii = {
  // ------- THANG CHUẨN: dùng cái này cho code mới -------
  sm: 8,
  md: 12, // bo góc CHUẨN của dự án (nút, ô nhập, alert, card, paper)
  lg: 20, // thẻ lớn, dialog chính

  // Hai hình dạng, không phải bậc thang
  circle: "50%",
  pill: 999,
};

// ---------------------------------------------------------------------------
// ĐÃ GỘP XONG các bo góc lệch thang (trước đây là radii.alt.*):
//     6px  ->  sm (8)    2 chỗ   MaintenanceSchedule, MachineProfileCard
//    10px  ->  md (12)  51 chỗ   Admin/Maintenance/Report/TestProposal/Ticket
//    14px  ->  md (12)   4 chỗ   Report, TestProposal
//    16px  ->  lg (20)  44 chỗ   Admin/Maintenance/Report/TestProposal
//    18px  ->  lg (20)   5 chỗ   Report
//    24px  ->  lg (20)   3 chỗ   Login, TestProposal
// Lệch tối đa 4px. Từ nay CHỈ dùng sm/md/lg; muốn đổi bo góc toàn app thì sửa
// đúng ba con số ở trên, không phát sinh bậc mới.
// ---------------------------------------------------------------------------

export const borders = {
  /** Viền gần như vô hình, dùng cho thẻ mềm */
  subtle: "1px solid rgba(0, 0, 0, 0.05)",
  /** Đậm hơn subtle một bậc (TestProposalPage dùng) */
  subtle2: "1px solid rgba(0, 0, 0, 0.08)",
  /** Viền xám nhạt thấy rõ, dùng cho bảng và khung ảnh */
  light: `1px solid ${colors.grey[300]}`,
  /** Viền xám nhạt kiểu gạch nối */
  dashed: `1px dashed ${colors.grey[300]}`,
};

/**
 * Bộ màu nhấn cho các thẻ điều hướng / thẻ thống kê.
 * Mỗi accent gồm: 2 màu gradient + chuỗi rgb dùng cho bóng đổ trong suốt.
 * Thêm một mục ở đây là có ngay một thẻ màu mới, không phải copy 40 dòng sx.
 */

/** Chuỗi rgb dùng trong bóng đổ. Tách riêng để bóng đổ cũng truy được về màu. */
export const shadowRgb = {
  black: "0, 0, 0",
  white: "255, 255, 255",
  brand: accents.brand.rgb, // 102, 126, 234
  green: accents.green.rgb, // 46, 125, 50
  teal: accents.teal.rgb, // 0, 137, 123
  slate: "33, 33, 33", // = grey[900] (xám trung tính)
  navy: "15, 23, 42", // = colors.navy.darkest - bóng của các khối tối ReportPage
  indigo: "63, 81, 181",
  orange: "245, 124, 0",
};

/**
 * Sinh chuỗi box-shadow.
 *
 *   shadow(8, 25, shadowRgb.brand, 0.3)  ->  "0 8px 25px rgba(102, 126, 234, 0.3)"
 *
 * Trước đây 59 chỗ tự viết chuỗi box-shadow bằng tay, và có những cặp TRÙNG
 * NHAU bị che bởi khoảng trắng - `rgba(102, 126, 234, 0.4)` và
 * `rgba(102,126,234,0.4)` là cùng một giá trị nhưng đếm ra thành hai. Dùng hàm
 * này thì khoảng trắng được chuẩn hoá, và màu luôn truy về được token.
 *
 * @param {number} y     độ lệch dọc (px)
 * @param {number} blur  độ nhoè (px)
 * @param {string} rgb   một khoá của shadowRgb
 * @param {number} alpha độ mờ 0-1
 */
export const shadow = (y, blur, rgb, alpha) =>
  `0 ${y}px ${blur}px rgba(${rgb}, ${alpha})`;

/** Vòng sáng quanh phần tử (spread, không lệch) - dùng cho focus/highlight */
export const ring = (spread, rgb, alpha) =>
  `0 0 0 ${spread}px rgba(${rgb}, ${alpha})`;

/**
 * Các bóng đổ LẶP LẠI nhiều chỗ. Bóng chỉ dùng một lần thì gọi shadow() ngay
 * tại chỗ - đặt tên cho giá trị dùng một lần chỉ thêm lớp gián tiếp.
 */
export const shadows = {
  /**
   * BÓNG CHUẨN CỦA MẶT PHẲNG NỘI DUNG - dùng cho mọi khối "thẻ" trong app.
   *
   * Đây là bóng mà <Card> đã luôn có (theme MuiCard ép nó, thắng cả
   * elevation={0}). Trước đây <Paper variant="outlined"> và các thẻ mềm lại
   * KHÔNG có bóng, nên cùng một trang có chỗ nổi chỗ phẳng. Nay cả ba
   * đường vào (MuiCard, MuiPaper variant="outlined", sx.softCard) đều trỏ về
   * đúng token này.
   */
  card: shadow(2, 8, "0, 0, 0", 0.1),

  /** Nhấc nổi mang màu thương hiệu (8 chỗ) */
  brandLift: shadow(8, 25, accents.brand.rgb, 0.3),
  /** Nhấc nổi màu xanh thành công (7 chỗ) */
  greenLift: shadow(8, 25, accents.green.rgb, 0.3),
  /** Bóng nổi của modal / panel đè lên (6 chỗ) */
  overlay: shadow(8, 32, "0, 0, 0", 0.2),
  /** Bóng vừa, trung tính (3 chỗ) */
  medium: shadow(4, 12, "0, 0, 0", 0.15),
  /** Bóng rất nhẹ khi hover thẻ (2 chỗ) */
  hover: shadow(4, 12, "0, 0, 0", 0.05),
};


// ══════════════════════════════════════════════════════════════════════════
// §5. MAU + NHAN TRANG THAI
//    Du lieu nghiep vu: trang thai may, phieu, lich bao duong.
// ══════════════════════════════════════════════════════════════════════════

export const STATUS_COLORS = {
  available: "#2e7d32",
  in_use: "#667eea",
  maintenance: "#ff9800",
  rented: "#673ab7",
  rented_return: "#673ab7",
  borrowed: "#03a9f4",
  borrowed_return: "#03a9f4",
  borrowed_out: "#00bcd4",
  liquidation: "#f44336",
  pending_liquidation: "#ff5722",
  disabled: "#9e9e9e",
  broken: "#9e9e9e",
};

/**
 * Nhãn mặc định. Một số trang dùng nhãn khác cho cùng trạng thái
 * (ví dụ TicketManagementPage gọi `disabled` là "Vô hiệu hóa"), nên
 * getStatusInfo() cho phép truyền bảng nhãn riêng để ghi đè.
 */
export const STATUS_LABELS = {
  available: "Có thể sử dụng",
  in_use: "Đang sử dụng",
  maintenance: "Bảo trì",
  rented: "Máy thuê",
  rented_return: "Đã trả (Máy Thuê)",
  borrowed: "Máy mượn",
  borrowed_return: "Đã trả (Máy Mượn)",
  borrowed_out: "Cho mượn",
  liquidation: "Thanh lý",
  pending_liquidation: "Chờ thanh lý",
  disabled: "Chưa sử dụng",
  broken: "Máy hư",
};

export const STATUS_FALLBACK = { bg: "#f0f0f0", color: "#555", label: "-" };

/**
 * Trả về { bg, color, label } cho một trạng thái.
 * Nền chip là màu chính + độ mờ 13% (hậu tố "22" trong hex 8 ký tự).
 *
 * @param {string} status
 * @param {object} [options]
 * @param {object} [options.labels]   bảng nhãn riêng của trang, ghi đè nhãn mặc định
 * @param {object|func} [options.fallback] giá trị trả về khi không nhận ra trạng thái;
 *        truyền hàm (status) => ({...}) nếu cần dựng theo chính trạng thái đó.
 *        Các trang không dùng chung một fallback: MachineListPage trả về
 *        { "#f0f0f0", "#555", "-" }, còn LocationTrackPage trả về màu xám kèm
 *        chính tên trạng thái - nên fallback phải để trang tự quyết.
 */
export const getStatusInfo = (status, options = {}) => {
  const { labels, fallback } = options;
  const color = STATUS_COLORS[status];
  if (!color) {
    if (typeof fallback === "function") return fallback(status);
    return fallback || STATUS_FALLBACK;
  }
  return {
    bg: `${color}22`,
    color,
    label: (labels && labels[status]) || STATUS_LABELS[status] || "-",
  };
};

/**
 * Bảng tra cứu sẵn { status: { bg, color, label } }.
 * Dùng khi trang cần TRA CỨU TRỰC TIẾP thay vì gọi hàm, ví dụ
 * `STATUS_CONFIG[machine.current_status] && (...)`.
 * Nội dung y hệt kết quả của getStatusInfo() cho từng trạng thái.
 */
export const STATUS_CONFIG = Object.fromEntries(
  Object.keys(STATUS_COLORS).map((k) => [k, getStatusInfo(k)])
);

/**
 * Fallback "màu xám + chính tên trạng thái".
 * LocationTrackPage, TestProposalPage và TicketManagementPage đều dùng dạng
 * này (MachineListPage thì dùng STATUS_FALLBACK với dấu "-").
 */
export const grayFallback = (status) => ({
  bg: "#9e9e9e22",
  color: "#9e9e9e",
  label: status,
});

/**
 * Bảng nhãn "Đã trả" viết THƯỜNG. TicketManagementPage và TestProposalPage
 * dùng dạng này, khác với MachineListPage / LocationTrackPage viết hoa.
 * Truyền vào buildStatusConfig() để ghi đè nhãn mặc định.
 */
export const STATUS_LABELS_LOWER = {
  rented_return: "Đã trả (máy thuê)",
  borrowed_return: "Đã trả (máy mượn)",
};

/**
 * Dựng bảng { status: { bg, color, label } } với bảng nhãn ghi đè riêng.
 * Dùng khi trang cần nhãn khác mặc định, ví dụ
 *   buildStatusConfig({ ...STATUS_LABELS_LOWER, disabled: "Vô hiệu hóa" })
 */
export const buildStatusConfig = (labels) =>
  Object.fromEntries(
    Object.keys(STATUS_COLORS).map((k) => [k, getStatusInfo(k, { labels })])
  );

// ---------------------------------------------------------------------------
// 4. Trạng thái PHIẾU xuất/nhập
//    Khác hẳn trạng thái máy và trạng thái bảo dưỡng, dù dùng chung một số
//    khoá như `pending`, `completed`. Đừng trộn ba bảng này với nhau.
// ---------------------------------------------------------------------------

/** Chip trạng thái phiếu trộn lẫn trong bảng danh sách máy (TicketManagement,
 *  TestProposal). LƯU Ý: `pending` ở đây là "Chờ xử lý", khác với
 *  TICKET_FLOW.pending ("Chờ duyệt") và MAINT_STATUS.pending ("Chưa thực hiện"). */
export const TICKET_STATUS = {
  pending: { bg: "#ff980022", color: "#ff9800", label: "Chờ xử lý" },
  completed: { bg: "#2e7d3222", color: "#2e7d32", label: "Đã duyệt" },
  cancelled: { bg: "#f4433622", color: "#f44336", label: "Đã hủy" },
};

/** Luồng duyệt phiếu -> màu Chip của MUI + nhãn.
 *  Trước đây cặp getStatusColor/getStatusLabel này bị copy y nguyên trong
 *  ReportPage và TestProposalPage. */
export const TICKET_FLOW = {
  draft: { muiColor: "info", label: "Nháp" },
  pending: { muiColor: "warning", label: "Chờ duyệt" },
  pending_confirmation: { muiColor: "warning", label: "Chờ xác nhận" },
  pending_approval: { muiColor: "warning", label: "Chờ duyệt" },
  completed: { muiColor: "success", label: "Đã duyệt" },
  cancelled: { muiColor: "error", label: "Đã hủy" },
};

/** Màu Chip MUI cho trạng thái phiếu; "default" nếu không nhận ra. */
export const getTicketFlowColor = (status) =>
  TICKET_FLOW[status]?.muiColor || "default";

/** Nhãn tiếng Việt cho trạng thái phiếu; trả về chính `status` nếu lạ. */
export const getTicketFlowLabel = (status) =>
  TICKET_FLOW[status]?.label || status;

// ---------------------------------------------------------------------------
// 3. Trạng thái của LỊCH BẢO DƯỠNG (khác với trạng thái máy ở trên)
//    Trước đây bị copy trong MaintenanceSchedulePage và ReportPage.
//    Chỉ chứa dữ liệu - phần `icon` do trang tự gắn để theme không phải
//    import component React.
// ---------------------------------------------------------------------------
export const MAINT_STATUS = {
  pending: {
    label: "Chưa thực hiện",
    color: "#e65100",
    bg: "#fff3e0",
    borderColor: "#ffcc80",
  },
  completed: {
    label: "Đã thực hiện",
    color: "#1565c0",
    bg: "#e3f2fd",
    borderColor: "#90caf9",
  },
  confirm_completed: {
    label: "Đã hoàn thành",
    color: "#2e7d32",
    bg: "#e8f5e9",
    borderColor: "#a5d6a7",
  },
};

/**
 * Biến thể dùng riêng ở MachineProfileCard. Nó KHÁC MAINT_STATUS ở 2 điểm và
 * đây là chênh lệch thật, không phải lỗi copy:
 *   - viền đậm hơn một bậc (ffb74d/64b5f6/81c784 thay vì ffcc80/90caf9/a5d6a7)
 *   - `confirm_completed` gọi là "Đã duyệt hoàn thành", không phải "Đã hoàn thành"
 * Nhãn/màu chữ/nền thì dùng chung, nên chỉ ghi đè đúng phần lệch.
 */
export const MAINT_STATUS_CARD = {
  pending: { ...MAINT_STATUS.pending, borderColor: "#ffb74d" },
  completed: { ...MAINT_STATUS.completed, borderColor: "#64b5f6" },
  confirm_completed: {
    ...MAINT_STATUS.confirm_completed,
    borderColor: "#81c784",
    label: "Đã duyệt hoàn thành",
  },
};

// ---------------------------------------------------------------------------
// 2. Bộ màu cho THẺ SỐ LIỆU + BẢNG MA TRẬN thống kê
//    color  = màu chữ số / màu nhấn
//    soft   = nền thẻ (độ mờ ~7%)
//    pastel = nền ô trong bảng ma trận
// ---------------------------------------------------------------------------
export const STAT_COLORS = {
  total: { color: "#667eea", soft: "#667eea22", pastel: "#eef0fb" },
  available: { color: "#2e7d32", soft: "#2e7d3211", pastel: "#e8f5e9" },
  in_use: { color: "#1976d2", soft: "#1976d211", pastel: "#e3f2fd" },
  not_in_use: { color: "#ed6c02", soft: "#ff980011", pastel: "#fff3e0" },
  pending_liquidation: {
    color: "#ff5722",
    soft: "#ff572211",
    pastel: "#fbe9e7",
  },
  liquidation: { color: "#d32f2f", soft: "#f4433611", pastel: "#ffebee" },
  // Ba trạng thái con của "Chưa sử dụng" dùng chung một màu
  maintenance: { color: "#00bcd4", soft: "#00bcd411", pastel: "#e0f7fa" },
  broken: { color: "#00bcd4", soft: "#00bcd411", pastel: "#e0f7fa" },
  disabled: { color: "#00bcd4", soft: "#00bcd411", pastel: "#e0f7fa" },
};


// ══════════════════════════════════════════════════════════════════════════
// §6. THEME MUI
//    palette / breakpoints / typography / style mac dinh component.
// ══════════════════════════════════════════════════════════════════════════

export const palette = {
  primary: {
    main: "#1976d2",
    light: "#42a5f5",
    dark: "#1565c0",
  },
  secondary: {
    main: "#dc004e",
    light: "#f50057",
    dark: "#c51162",
  },
  success: {
    main: "#2e7d32",
    light: "#4caf50",
    dark: "#1b5e20",
  },
  background: {
    default: "#f5f5f5",
    paper: "#ffffff",
  },
};

export const breakpoints = {
  values: {
    xs: 0,
    sm: 600,
    md: 900,
    lg: 1200,
    xl: 1536,
  },
};

// Dưới 600px (breakpoints.down("sm")) tiêu đề LÙI MỘT BẬC.
//
// Bản trước refactor viết tay `variant={isMobile ? "h4" : "h3"}` ở 65 chỗ. Khi
// gom về theme tôi bỏ hết và trông chờ clamp() lo, nhưng dự án đã chọn cỡ chữ
// CỐ ĐỊNH (FLUID_TYPE = false) nên tiêu đề giữ nguyên cỡ desktop trên điện
// thoại -> chữ to quá. Nay quy tắc lùi bậc nằm ĐÚNG MỘT CHỖ là đây; các trang
// không cần biết isMobile nữa.
//
// KHÔNG lùi h6: bản cũ dùng h6 CỐ ĐỊNH 72 chỗ (chỉ 14 chỗ có isMobile), lùi
// toàn cục sẽ làm 72 chỗ đó nhỏ đi so với trước. Phụ đề của PageHeader cần lùi
// thì xử lý riêng trong components/ui/PageHeader.jsx.
const MOBILE = "@media (max-width:599.95px)"; // = breakpoints.down("sm")

/**
 * Cỡ chữ tiêu đề: chuẩn `hi` px, trên điện thoại dùng `mobile` px.
 * Bật FLUID_TYPE thì clamp() đã tự co nên không cần lùi bậc.
 */
const heading = (lo, hi, mobile) =>
  FLUID_TYPE
    ? { fontSize: fluid(lo, hi) }
    : {
        fontSize: `${hi / REM}rem`,
        [MOBILE]: { fontSize: `${mobile / REM}rem` },
      };

export const typography = {
  fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',

  //          nhỏ nhất  chuẩn  mobile(<600px) = cỡ của bậc kế tiếp
  h1: heading(40, 96, 60), // -> cỡ h2
  h2: heading(32, 60, 48), // -> cỡ h3
  h3: heading(26, 48, 34), // -> cỡ h4   (tiêu đề trang)
  h4: { ...heading(22, 34, 24), fontWeight: 600 }, // -> cỡ h5
  h5: { ...heading(18, 24, 20), fontWeight: 500 }, // -> cỡ h6
  h6: { fontSize: scale(16, 20), fontWeight: 500 }, // giữ nguyên - xem ghi chú trên

  subtitle1: { fontSize: scale(15, 16) },
  subtitle2: { fontSize: scale(13, 14) },

  body1: { fontSize: scale(14, 16) },
  body2: { fontSize: scale(13, 14) },

  button: { fontSize: scale(13, 14) },
  caption: { fontSize: scale(11.5, 12) },
  overline: { fontSize: scale(11.5, 12) },
};

export const components = {
  MuiButton: {
    styleOverrides: {
      root: {
        textTransform: "none",
        // 12px là bo góc chuẩn của dự án: trước đây 72 chỗ trong 12 file tự
        // khai báo `borderRadius: "12px"` để ghi đè mặc định 8px của theme.
        // Nay mặc định đúng ngay từ đầu, các khai báo đó đã được xoá.
        borderRadius: radii.md,
        fontWeight: 500,
      },
      // Button tự đặt fontSize cứng theo size. Ghi đè lại ở đây để cỡ chữ nút
      // cũng đi qua công tắc FLUID_TYPE như phần còn lại (giá trị chuẩn 13/14/15
      // đúng bằng mặc định của MUI -> không lệch giao diện).
      sizeSmall: { fontSize: scale(12, 13) },
      sizeMedium: { fontSize: scale(13, 14) },
      sizeLarge: { fontSize: scale(14, 15) },
    },
  },

  MuiCard: {
    styleOverrides: {
      root: {
        borderRadius: radii.md,
        boxShadow: shadows.card,
      },
    },
    variants: [
      {
        // <Card variant="soft"> - bản variant của sx.softCard.
        // Cũng KHÔNG đặt boxShadow (xem giải thích ở sx.softCard, §7).
        props: { variant: "soft" },
        style: {
          borderRadius: radii.lg,
          border: borders.subtle,
        },
      },
    ],
  },

  MuiPaper: {
    styleOverrides: {
      root: {
        borderRadius: radii.md,
      },
    },
    variants: [
      {
        // <Paper variant="outlined"> - MUI cố tình BỎ bóng cho outlined (elevation
        // bị bỏ qua hoàn toàn, chỉ còn viền). Nhưng trong dự án này outlined được
        // dùng làm KHỐI NỘI DUNG, nằm cạnh các <Card> vốn luôn có bóng -> cùng một
        // trang có chỗ nổi chỗ phẳng. Trả lại đúng bóng chuẩn để đồng nhất.
        props: { variant: "outlined" },
        style: {
          boxShadow: shadows.card,
        },
      },
      {
        // <Paper variant="section"> - khối nội dung có tiêu đề trong trang
        props: { variant: "section" },
        style: ({ theme }) => ({
          padding: theme.spacing(2),
          borderRadius: radii.md,
          border: `1px solid ${theme.palette.divider}`,
          boxShadow: "none",
          [theme.breakpoints.up("md")]: { padding: theme.spacing(3) },
        }),
      },
      {
        // <Paper variant="statCard"> - ô số liệu nền gradient thương hiệu
        props: { variant: "statCard" },
        style: ({ theme }) => ({
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing(0.5),
          padding: theme.spacing(2),
          borderRadius: radii.md,
          color: theme.palette.common.white,
          background: gradients.brand,
          boxShadow: "none",
        }),
      },
    ],
  },

  // Alert: 9 chỗ tự khai báo 12px -> đưa lên mặc định
  MuiAlert: {
    styleOverrides: {
      root: {
        borderRadius: radii.md,
      },
    },
  },

  // Ô nhập viền (TextField/Select/Autocomplete variant="outlined").
  // 27 chỗ tự khai báo 12px, phần lớn qua selector lồng nhau
  // `"& .MuiOutlinedInput-root": { borderRadius: "12px" }` -> nay là mặc định.
  MuiOutlinedInput: {
    styleOverrides: {
      root: {
        borderRadius: radii.md,
      },
    },
  },

  // Bảng dày đặc dùng khắp các trang danh sách: set một lần, khỏi sx từng ô.
  // Chỉ áp cho <Table size="small"> để không đổi các bảng đang dùng size mặc định.
  // 14px = đúng mặc định cũ của MUI, nên bảng KHÔNG bị nhỏ đi so với bản trước.
  MuiTableCell: {
    styleOverrides: {
      sizeSmall: {
        fontSize: scale(12, 14),
      },
    },
  },

  // Tooltip trên màn hình cảm ứng ở nhà máy: cho phép chạm để hiện
  MuiTooltip: {
    defaultProps: {
      enterTouchDelay: 0,
      leaveTouchDelay: 3000,
    },
  },
};

export const theme = createTheme({
  breakpoints,
  palette,
  typography,
  shape: { borderRadius: radii.sm },
  components,
});

export default theme;


// ══════════════════════════════════════════════════════════════════════════
// §7. PRESET sx
//    Chi nhung doan sx lap lai nhieu noi. Dung MOT lan thi viet ngay tai cho.
// ══════════════════════════════════════════════════════════════════════════

// ============================================================================
// LƯỚI TỰ TÍNH SỐ CỘT  (thay cho <Grid size={{ xs: 12, sm: 6, md: 4 }}>)
// ============================================================================
//
// Trình duyệt tự lấy bề rộng CONTAINER chia cho minPx để ra số cột.
// Không có breakpoint nào. Đổi sidebar, đổi zoom, mở trong dialog -> tự đúng.

/**
 * @param {number} minPx   bề rộng tối thiểu của một ô trước khi ngắt cột
 * @param {number} gap     khoảng cách (đơn vị theme.spacing, 1 = 8px)
 * @param {number} maxCols trần số cột (0 = không giới hạn, cột chạy tự do)
 *
 * Không đặt maxCols -> số cột = container / minPx, màn hình càng rộng càng
 * nhiều cột. Phù hợp cho danh sách dài (thẻ máy móc, ô số liệu).
 *
 * Đặt maxCols -> ô tự giãn rộng ra để KHÔNG BAO GIỜ vượt quá số cột đó, nhưng
 * vẫn tự bớt cột khi container hẹp. Phù hợp khi số phần tử ít và cần bố cục
 * cân đối. Ví dụ autoGrid(320, 3, 3):
 *     điện thoại      -> 1 cột
 *     tablet dọc      -> 2 cột
 *     laptop trở lên  -> đúng 3 cột (không nhảy lên 4 trên màn hình rộng)
 *
 * `min(100%, ...)` để phần tử không tràn ngang khi container hẹp hơn minPx.
 */
export const autoGrid = (minPx = 280, gap = 3, maxCols = 0) => {
  const gapPx = gap * 8; // theme.spacing mặc định: 1 = 8px
  const track =
    maxCols > 0
      ? `min(100%, max(${minPx}px, calc((100% - ${
          (maxCols - 1) * gapPx
        }px) / ${maxCols})))`
      : `min(${minPx}px, 100%)`;

  return {
    display: "grid",
    gap,
    gridTemplateColumns: `repeat(auto-fit, minmax(${track}, 1fr))`,
  };
};

// ============================================================================
// CÁC PRESET sx DÙNG CHUNG
// ============================================================================

export const sx = {
  /** Canh giữa toàn màn hình - dùng cho loading / trạng thái rỗng.
   *  Lưu ý dùng 100dvh chứ không phải 100vh: trên mobile 100vh bị thanh địa
   *  chỉ của trình duyệt cắt mất, gây tràn và nhảy layout. */
  centerFull: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100dvh",
  },

  /** Hàng chip thống kê: tự xuống dòng, mỗi chip giữ đúng bề rộng nội dung.
   *  Trước đây mỗi chip bị bọc trong <Grid size={{ xs: 12, sm: 6, md: 3 }}>,
   *  nên trên điện thoại mỗi chip chiếm TRỌN một dòng - 9 chip là 9 dòng.
   *  Dùng ở 11 hàng thống kê phiếu của TestProposalPage / TicketManagementPage. */
  chipRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 1,
  },

  /** Cắt chữ 1 dòng kèm dấu ... */
  ellipsis: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  /** Chữ tô gradient (tiêu đề TPM, tiêu đề section) */
  gradientText: (gradient = gradients.brand) => ({
    background: gradient,
    backgroundClip: "text",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  }),

  /** Khối thẻ mềm: bo góc lớn + viền nhạt + BÓNG CHUẨN.
   *
   *  Lưu ý cái bẫy đã từng làm mất bóng ở đây: theme đặt
   *  MuiCard.styleOverrides.root.boxShadow = shadows.card, và khai báo đó nằm
   *  SAU box-shadow: var(--Paper-shadow) trong cùng một rule CSS, nên nó THẮNG
   *  cả elevation={0}. Tức <Card elevation={0}> trong dự án này VẪN có bóng.
   *  Từng có `boxShadow: "none"` ở preset này và nó đã xoá mất bóng của các card
   *  "Chào mừng", "Thống kê theo loại máy", ô tìm kiếm, "Bộ lọc chi tiết"...
   *  Nay ghi tường minh shadows.card để <Paper> dùng preset này cũng nổi
   *  giống <Card>. */
  softCard: {
    borderRadius: `${radii.lg}px`,
    border: borders.subtle,
    // Đặt TƯỜNG MINH bóng chuẩn: <Card> đã tự có nó qua theme, nhưng <Paper>
    // thì không -> nếu không ghi ở đây thì thẻ mềm dựng bằng Paper
    // (AdminPage, UpdateRfidPage) sẽ phẳng trong khi thẻ dựng bằng Card lại nổi.
    boxShadow: shadows.card,
  },

  /** Panel nội dung có viền xám rõ (các mục "Lý lịch thiết bị", "Thông tin đơn
   *  vị", "Bảng tổng hợp lịch bảo dưỡng"... trong dialog lý lịch máy).
   *  Cùng bóng chuẩn với Card và Paper outlined để không có chỗ nổi chỗ phẳng. */
  panel: {
    border: borders.light,
    overflow: "hidden",
    boxShadow: shadows.card,
  },

  /** Thẻ bấm được, ở trạng thái CHƯA chọn */
  cardSelectable: {
    cursor: "pointer",
    border: borders.subtle,
    transition: "all 0.2s ease",
    "&:hover": {
      transform: "translateY(-2px)",
      boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
    },
  },

  /** Thẻ bấm được, ở trạng thái ĐANG chọn (dùng làm filter) */
  cardSelected: (theme) => ({
    cursor: "pointer",
    border: `3px solid ${theme.palette.primary.main}`,
    boxShadow: "0 8px 25px rgba(102, 126, 234, 0.3)",
    transform: "translateY(-4px)",
    transition: "all 0.2s ease",
  }),

  /** PaperProps.sx cho Dialog: bo góc trên desktop, vuông khi fullScreen */
  dialogPaper: (fullScreen) => ({
    borderRadius: fullScreen ? 0 : `${radii.lg}px`,
  }),

  /** Tiêu đề Dialog nền gradient thương hiệu */
  dialogTitle: {
    pb: 1,
    background: gradients.brand,
    color: "white",
    fontWeight: 700,
  },

  /** Ô nhập liệu được TÔ SÁNG để người dùng biết là tự điền / bị khoá:
   *  nền vàng nhạt, chữ và viền đỏ.
   *
   *  BẢN DUY NHẤT. Trước đây có hai bản (fieldHighlight + fieldHighlightOutlined)
   *  lệch nhau 3 điểm; nay hợp nhất thành hợp của cả hai:
   *    - !important cho nền  -> nền vàng không bị style khác đè
   *    - opacity: 1          -> chữ trong ô disabled không bị mờ
   *    - phủ CẢ MuiFilledInput lẫn MuiOutlinedInput
   *  Đã kiểm: không trang nào dùng đồng thời ô variant="filled" với sx này,
   *  nên việc gộp KHÔNG đổi giao diện hiện tại. */
  fieldHighlight: {
    "& .MuiInputBase-root.Mui-disabled": {
      backgroundColor: `${colors.yellow.wash} !important`,
      "& fieldset": {
        borderColor: `${colors.red.main} !important`,
      },
      "& .MuiInputBase-input": {
        color: colors.red.main,
        WebkitTextFillColor: `${colors.red.main} !important`,
        fontWeight: 600,
        opacity: 1,
      },
      "& .MuiFormLabel-root": {
        color: `${colors.red.main} !important`,
      },
    },
    "& .MuiOutlinedInput-root.Mui-disabled": {
      backgroundColor: `${colors.yellow.wash} !important`,
    },
    "& .MuiFilledInput-root": {
      backgroundColor: `${colors.yellow.wash} !important`,
      "& input": {
        color: colors.red.main,
        fontWeight: 600,
      },
      "& .MuiFormLabel-root": {
        color: colors.red.main,
      },
    },
  },
};

