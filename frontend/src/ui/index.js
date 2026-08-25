// frontend/src/ui/index.js
//
// ════════════════════════════════════════════════════════════════════════════
// CỬA VÀO DUY NHẤT CHO MỌI THỨ LIÊN QUAN GIAO DIỆN
// ════════════════════════════════════════════════════════════════════════════
//
// Thay vì mỗi trang phải viết 4-5 khối import dài:
//
//   import { Box, Card, Typography, ... 50 dòng ... } from "@mui/material";
//   import { Close, Search, ... 30 dòng ... } from "@mui/icons-material";
//   import { PageHeader, StatCard } from "../components/ui";
//   import { sx as preset, radii, gradients } from "../theme";
//   import { useResponsive } from "../hooks/useResponsive";
//
// giờ chỉ cần MỘT khối:
//
//   import { Box, Card, Typography, Close, Search, PageHeader,
//            sx as preset, radii, useResponsive } from "../ui";
//
// ---------------------------------------------------------------------------
// Vì sao an toàn (đã đo, không phải phỏng đoán):
//   - Bundle production: 3.218,52 kB trước và sau khi dùng barrel -> Rollup
//     tree-shake xuyên qua `export *`, KHÔNG kéo thêm gì.
//   - Dev server: barrel phân giải thành đúng 5 module, vì Vite đã pre-bundle
//     @mui/material và @mui/icons-material thành một dep duy nhất. Lấy 5 hay
//     62 component từ đó đều cùng chi phí.
// ---------------------------------------------------------------------------

// 1) Toàn bộ component MUI (Box, Card, Dialog, Table, ...)
export * from "@mui/material";

// 2) Toàn bộ icon MUI (Close, Search, Add, ...)
export * from "@mui/icons-material";

// 3) Gỡ 7 tên TRÙNG giữa hai package.
//    @mui/material có 468 export, @mui/icons-material có 10.773; giao nhau
//    đúng 7 tên dưới đây. Theo chuẩn ESM, tên xuất hiện ở hai `export *` khác
//    nhau sẽ bị loại bỏ hoàn toàn - nên phải chỉ định tường minh, nếu không
//    build sẽ báo `"Menu" is not exported`.
//
//    Quy ước: COMPONENT giữ tên gốc, ICON thêm hậu tố `Icon`.
export {
  Badge,
  Input,
  Link,
  List,
  Menu,
  Radio,
  Tab,
} from "@mui/material";
export {
  Badge as BadgeIcon,
  Input as InputIcon,
  Link as LinkIcon,
  List as ListIcon,
  Menu as MenuIcon,
  Radio as RadioIcon,
  Tab as TabIcon,
} from "@mui/icons-material";

// 4) Design token + preset + bảng trạng thái (src/theme.js - MOT file duy nhat)
export * from "../theme";
export { default as theme } from "../theme";

//    `colors` cũng là tên một export của @mui/material (bảng màu Material).
//    Cùng cơ chế như 7 tên trùng ở trên: phải chỉ định tường minh, nếu không
//    build báo `"colors" is not exported`. Ta lấy bảng màu CỦA DỰ ÁN.
export { colors } from "../theme";
//    Bảng màu gốc của Material, nếu cần: muiColors.red[500] ...
export { colors as muiColors } from "@mui/material";

// 5) Khối UI dùng lại của dự án (components/ui/)
export * from "../components/ui";

// 6) Hook responsive duy nhất của dự án
export { useResponsive } from "../hooks/useResponsive";
