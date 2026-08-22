// frontend/src/theme/components.js
//
// Style mặc định + biến thể (variant) của từng component MUI.
// Đây là chỗ "ăn" nhiều sx nhất: cái gì lặp lại ở nhiều trang thì khai báo
// một lần tại đây, các trang chỉ việc gọi variant.
//
// LƯU Ý: mọi thứ ở dưới đều là OPT-IN (variant riêng) hoặc giữ y nguyên override
// đã có từ trước -> không làm lệch giao diện các trang hiện tại.

import { radii, borders, gradients, shadows } from "./tokens";
import { scale } from "./fluid";

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
        // Cũng KHÔNG đặt boxShadow (xem giải thích trong theme/presets.js).
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

export default components;
