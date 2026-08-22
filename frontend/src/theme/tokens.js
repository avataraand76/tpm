import { colors } from "./colors";

// frontend/src/theme/tokens.js
//
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

/** Chuỗi rgb dùng trong bóng đổ. Tách riêng để bóng đổ cũng truy được về màu. */
export const shadowRgb = {
  black: "0, 0, 0",
  white: "255, 255, 255",
  brand: accents.brand.rgb, // 102, 126, 234
  green: accents.green.rgb, // 46, 125, 50
  teal: accents.teal.rgb, // 0, 137, 123
  slate: "33, 33, 33", // = grey[900], truoc day la #0f172a (navy)
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

export default { radii, gradients, borders, accents };
