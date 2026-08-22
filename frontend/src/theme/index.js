// frontend/src/theme/index.js
//
// Điểm vào duy nhất của toàn bộ giao diện.
// Muốn đổi màu, cỡ chữ, bo góc, style mặc định của component -> vào folder này.
// Các trang/component KHÔNG được khai báo lại những thứ đó bằng sx.

import { createTheme } from "@mui/material/styles";

import { palette } from "./palette";
import { typography } from "./typography";
import { breakpoints } from "./breakpoints";
import { components } from "./components";
import { radii } from "./tokens";

export const theme = createTheme({
  breakpoints,
  palette,
  typography,
  shape: { borderRadius: radii.sm },
  components,
});

export default theme;

// Xuất lại để các trang chỉ cần import từ "../theme"
export { fluid, fluidPx, scale, FLUID_TYPE, MIN_VW, MAX_VW } from "./fluid";
export { sx, autoGrid, autoGridFill } from "./presets";
export {
  STATUS_COLORS,
  STATUS_LABELS,
  STATUS_FALLBACK,
  STAT_COLORS,
  STATUS_CONFIG,
  STATUS_LABELS_LOWER,
  buildStatusConfig,
  MAINT_STATUS,
  MAINT_STATUS_CARD,
  TICKET_STATUS,
  TICKET_FLOW,
  getStatusInfo,
  grayFallback,
  getTicketFlowColor,
  getTicketFlowLabel,
} from "./statusTokens";
export { colors, hexA } from "./colors";
export { fontSizes, FLUID as FLUID_FONT_SIZES } from "./fontSizes";
export {
  radii,
  borders,
  shadows,
  shadowRgb,
  shadow,
  ring,
  gradients,
  accents,
  accentGradient,
  accentWash,
  accentShadow,
} from "./tokens";
