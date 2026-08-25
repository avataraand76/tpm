// frontend/src/hooks/useResponsive.js
//
// GOM TOÀN BỘ CÂU HỎI "màn hình đang bao nhiêu?" VỀ MỘT CHỖ.
//
// Trước đây 19 file tự gọi useTheme() + useMediaQuery() rồi tự đặt luật riêng
// (isMobile ? 10 : 25 dòng/trang, isMobile ? 240 : 400 chiều cao chart...).
// Giờ luật nằm ở đây, sửa một lần ăn cả app.
//
// LƯU Ý QUAN TRỌNG: chỉ dùng hook này khi CSS không làm được, tức là khi cần
// đổi CẤU TRÚC (bảng -> danh sách thẻ, hiện/ẩn cột, số dòng phân trang).
// Còn chỉ để đổi cỡ chữ / padding / số cột thì dùng
//   - typography fluid (đã tự co giãn)
//   - autoGrid(minPx)  (tự tính số cột)
// vì CSS không cần re-render React.

import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";

export function useResponsive() {
  const theme = useTheme();

  // Ba ngưỡng "hẹp" mà dự án đang thực sự dùng. Trước đây mỗi component tự
  // gọi useMediaQuery với ngưỡng riêng (sm ở hầu hết trang, md ở
  // MachineQRScanner, lg ở NavigationBar) nên rất khó biết chỗ nào dùng gì.
  // Giờ cả ba đều có tên và nằm ở một chỗ.
  const belowSm = useMediaQuery(theme.breakpoints.down("sm")); // < 600
  const belowMd = useMediaQuery(theme.breakpoints.down("md")); // < 900
  const belowLg = useMediaQuery(theme.breakpoints.down("lg")); // < 1200

  const isTablet = useMediaQuery(theme.breakpoints.between("sm", "lg")); // 600 - 1199
  const isTouch = useMediaQuery("(hover: none) and (pointer: coarse)");

  const isMobile = belowSm;
  const isDesktop = !belowLg;

  return {
    theme,
    isMobile,
    isTablet,
    isDesktop,
    isTouch,
    belowSm,
    belowMd,
    belowLg,

    // ---- các giá trị phái sinh: đặt luật MỘT LẦN cho cả hệ thống ----
    /** Dialog chiếm hết màn hình trên điện thoại */
    dialogFullScreen: isMobile,
    /** Độ nén của bảng */
    tableSize: isMobile ? "small" : "medium",
    /** Số dòng mặc định khi phân trang */
    rowsPerPage: isMobile ? 10 : isDesktop ? 50 : 25,
    /** Số nút hiển thị trước khi dồn vào menu "..." */
    maxInlineActions: isMobile ? 1 : isTablet ? 2 : 4,
    /** Hướng xếp của các khối 2 cột */
    stackDirection: isMobile ? "column" : "row",
  };
}

export default useResponsive;
