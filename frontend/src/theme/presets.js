// frontend/src/theme/presets.js
//
// Các đoạn `sx` bị lặp lại nhiều nơi, gom về một chỗ.
// Dùng:   <Box sx={sx.pageWrap}>
// Trộn:   <Box sx={{ ...sx.toolbarRow, mb: 2 }}>

import { fluidPx } from "./fluid";
import { gradients, radii, borders, shadows } from "./tokens";
import { colors } from "./colors";

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

/**
 * Giống autoGrid nhưng KHÔNG kéo giãn ô cuối cho đầy hàng (auto-fill).
 * Dùng khi muốn các ô luôn giữ đúng bề rộng, ví dụ danh sách thẻ nhỏ.
 */
export const autoGridFill = (minPx = 280, gap = 3) => ({
  display: "grid",
  gap,
  gridTemplateColumns: `repeat(auto-fill, minmax(min(${minPx}px, 100%), 1fr))`,
});

// ============================================================================
// CÁC PRESET sx DÙNG CHUNG
// ============================================================================

export const sx = {
  /** Bọc nội dung trang: padding tự co, giới hạn bề rộng, canh giữa */
  pageWrap: {
    px: { xs: 1.5, sm: 2, md: 3 },
    py: { xs: 2, md: 4 },
    maxWidth: 1600,
    mx: "auto",
  },

  /** Canh giữa toàn màn hình - dùng cho loading / trạng thái rỗng.
   *  Lưu ý dùng 100dvh chứ không phải 100vh: trên mobile 100vh bị thanh địa
   *  chỉ của trình duyệt cắt mất, gây tràn và nhảy layout. */
  centerFull: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100dvh",
  },

  /** Vùng cuộn cho bảng dài: cao hết màn hình trừ phần header/toolbar */
  scrollArea: (reservedPx = 260) => ({
    maxHeight: `calc(100dvh - ${reservedPx}px)`,
    overflow: "auto",
  }),

  /** Hàng công cụ (nút, filter) tự xuống dòng khi hẹp */
  toolbarRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 1,
    alignItems: "center",
  },

  /** Cắt chữ 1 dòng kèm dấu ... */
  ellipsis: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  /** Cắt chữ sau n dòng */
  clampLines: (n = 2) => ({
    display: "-webkit-box",
    WebkitLineClamp: n,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  }),

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

  /** Khung biểu đồ tự cao dần theo màn hình (240px -> 420px) */
  chartBox: {
    width: "100%",
    height: fluidPx(240, 420),
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

  /** Hiệu ứng nhấc lên khi hover - dùng cho thẻ bấm được */
  hoverLift: (shadow) => ({
    transition: "all 0.3s ease",
    "&:hover": {
      transform: "translateY(-8px)",
      ...(shadow ? { boxShadow: shadow } : null),
    },
  }),
};

export default sx;
