// frontend/src/theme/fontSizes.js
//
// ════════════════════════════════════════════════════════════════════════════
// CỠ CHỮ GHI ĐÈ - NGUỒN DUY NHẤT
// ════════════════════════════════════════════════════════════════════════════
//
// 214 chỗ trong 20 file từng tự viết `fontSize: "0.95rem"` và tương tự, với
// 26 giá trị khác nhau, ghi đè typography của theme ngay tại chỗ.
//
// Cách xử lý ở đây:
//   - Mỗi token giữ ĐÚNG con số cũ (cột `hi` của scale / tham số của FIXED),
//     nên giao diện y hệt bản trước khi gom.
//   - Nếu sau này bật FLUID_TYPE: cỡ >= 13px sẽ co giãn (max = số cũ), còn cỡ
//     < 13px vẫn cố định vì nhãn 10-12px co thêm sẽ khó đọc.
//
// Tên token đặt theo ĐÚNG SỐ PX (px12_8 = 12.8px) để không ai tưởng đây là
// một thang bậc thiết kế. 26 bậc là quá nhiều - nên gộp về 6-8 bậc, nhưng
// việc đó ĐỔI GIAO DIỆN nên cần bạn duyệt.
//
// Bật/tắt co giãn: công tắc FLUID_TYPE trong theme/fluid.js (dùng chung với
// typography.js và components.js).

import { scale, FLUID_TYPE } from "./fluid";

/** Xuất lại công tắc chung để nơi khác kiểm tra được trạng thái hiện tại.
 *  false = MỌI cỡ chữ trong app là con số cố định (kể cả typography variant). */
export const FLUID = FLUID_TYPE;

const REM = 16;
const FIXED = (px) => `${px / REM}rem`;

export const fontSizes = {
  px9_28: FIXED(9.28), // 9.28px, 1 chỗ - giữ cố định (dưới 13px)
  px9_6: FIXED(9.6), // 9.6px, 2 chỗ - giữ cố định (dưới 13px)
  px9_92: FIXED(9.92), // 9.92px, 4 chỗ - giữ cố định (dưới 13px)
  px10_4: FIXED(10.4), // 10.4px, 6 chỗ - giữ cố định (dưới 13px)
  px10_88: FIXED(10.88), // 10.88px, 3 chỗ - giữ cố định (dưới 13px)
  px11: FIXED(11), // 11px, 1 chỗ - giữ cố định (dưới 13px)
  px11_2: FIXED(11.2), // 11.2px, 10 chỗ - giữ cố định (dưới 13px)
  px11_52: FIXED(11.52), // 11.52px, 6 chỗ - giữ cố định (dưới 13px)
  px12: FIXED(12), // 12px, 18 chỗ - giữ cố định (dưới 13px)
  px12_16: FIXED(12.16), // 12.16px, 1 chỗ - giữ cố định (dưới 13px)
  px12_48: FIXED(12.48), // 12.48px, 16 chỗ - giữ cố định (dưới 13px)
  px12_8: FIXED(12.8), // 12.8px, 21 chỗ - giữ cố định (dưới 13px)
  px13: scale(12, 13), // 13px, 1 chỗ - tự co giãn
  px13_12: scale(12, 13.12), // 13.12px, 16 chỗ - tự co giãn
  px13_6: scale(12, 13.6), // 13.6px, 20 chỗ - tự co giãn
  px14: scale(12, 14), // 14px, 3 chỗ - tự co giãn
  px14_08: scale(12.08, 14.08), // 14.08px, 1 chỗ - tự co giãn
  px14_24: scale(12.24, 14.24), // 14.24px, 1 chỗ - tự co giãn
  px14_4: scale(12.4, 14.4), // 14.4px, 13 chỗ - tự co giãn
  px15_2: scale(13.2, 15.2), // 15.2px, 38 chỗ - tự co giãn
  px16: scale(14, 16), // 16px, 13 chỗ - tự co giãn
  px16_8: scale(14.8, 16.8), // 16.8px, 3 chỗ - tự co giãn
  px17_6: scale(15.6, 17.6), // 17.6px, 12 chỗ - tự co giãn
  px19_2: scale(17.2, 19.2), // 19.2px, 1 chỗ - tự co giãn
  px24: scale(22, 24), // 24px, 2 chỗ - tự co giãn
  px28_8: scale(26.8, 28.8), // 28.8px, 1 chỗ - tự co giãn
};

export default fontSizes;
