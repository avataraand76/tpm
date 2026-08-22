// frontend/src/theme/typography.js
//
// Cỡ chữ của các variant Typography, khai báo MỘT LẦN ở đây.
// Nhờ vậy các trang KHÔNG cần `fontSize: isMobile ? "0.8rem" : "1rem"` nữa,
// chỉ cần dùng đúng variant: <Typography variant="body2">.
//
// Cột "chuẩn" = giá trị mặc định của MUI -> giao diện y hệt bản cũ.
// Cột "nhỏ nhất" chỉ có tác dụng khi bật FLUID_TYPE trong theme/fluid.js.

import { scale } from "./fluid";

export const typography = {
  fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',

  //                          nhỏ nhất  chuẩn (= mặc định MUI)
  h1: { fontSize: scale(40, 96) },
  h2: { fontSize: scale(32, 60) },
  h3: { fontSize: scale(26, 48) },
  h4: { fontSize: scale(22, 34), fontWeight: 600 },
  h5: { fontSize: scale(18, 24), fontWeight: 500 },
  h6: { fontSize: scale(16, 20), fontWeight: 500 },

  subtitle1: { fontSize: scale(15, 16) },
  subtitle2: { fontSize: scale(13, 14) },

  body1: { fontSize: scale(14, 16) },
  body2: { fontSize: scale(13, 14) },

  button: { fontSize: scale(13, 14) },
  caption: { fontSize: scale(11.5, 12) },
  overline: { fontSize: scale(11.5, 12) },
};

export default typography;
