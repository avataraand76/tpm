// frontend/src/theme/fluid.js
//
// ============================================================================
// TỰ TÍNH KÍCH THƯỚC THEO BỀ RỘNG MÀN HÌNH - KHÔNG CẦN BREAKPOINT
// ============================================================================
//
// Ý tưởng: thay vì dán cứng `fontSize: isMobile ? "0.8rem" : "1rem"`, ta mô tả
// "nhỏ nhất bao nhiêu, lớn nhất bao nhiêu" rồi để TRÌNH DUYỆT tự nội suy tuyến
// tính ở giữa bằng CSS clamp(). Không JS, không re-render, không breakpoint.
//
//   fluid(14, 16)  ->  "clamp(0.875rem, 0.7717rem + 0.2174vw, 1rem)"
//
//   width <= 360px : luôn đúng 14px
//   width = 820px  : ~15px  (tự nội suy)
//   width >= 1280px: luôn đúng 16px
//
// MIN_VW / MAX_VW là "khung tham chiếu": dưới MIN_VW dùng giá trị nhỏ nhất,
// trên MAX_VW dùng giá trị lớn nhất. Đổi 2 hằng số này là đổi độ co giãn của
// TOÀN BỘ ứng dụng.

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
//   theme/typography.js  (variant h1..h6, body1/2, caption...)
//   theme/fontSizes.js   (các cỡ ghi đè trong trang)
//   theme/components.js  (fontSize theo size của Button, TableCell)
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

export default fluid;
