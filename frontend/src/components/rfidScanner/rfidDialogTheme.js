// frontend/src/components/rfidScanner/rfidDialogTheme.js
//
// Sub-theme riêng của bộ dialog RFID. Giữ nguyên cấu trúc 3 biến thể (default /
// batch / lookup) vì đó là từ vựng thiết kế riêng của tính năng này, NHƯNG mọi
// gradient, bo góc và màu xám nay LẤY TỪ theme chính thay vì viết lại hex.
// Nhờ vậy đổi màu thương hiệu ở theme/tokens.js là dialog RFID đổi theo.

import {
  gradients,
  radii,
  accents,
  shadow,
  shadowRgb,
  colors,
} from "../../theme";

export const RFID_CONTENT_BG = colors.grey[50];

/** rgba() theo accent + độ mờ, ví dụ soft(accents.brand, 0.08) */
const soft = (accent, alpha) => `rgba(${accent.rgb}, ${alpha})`;

export const RFID_DIALOG_VARIANTS = {
  default: {
    gradient: gradients.brand,
    primaryButton: gradients.brand,
    primaryButtonHover: gradients.brandHover,
    iconColor: accents.brand.from,
    softBg: soft(accents.brand, 0.08),
    softBorder: soft(accents.brand, 0.22),
    progressTrack: soft(accents.brand, 0.12),
    // foundOverlay: soft(accents.brand, 0.95),
    foundOverlay: soft(accents.green, 0.95),
  },
  batch: {
    gradient: gradients.orange,
    primaryButton: gradients.orange,
    primaryButtonHover: gradients.orangeHover,
    iconColor: accents.orange.from,
    softBg: soft(accents.orange, 0.08),
    softBorder: soft(accents.orange, 0.25),
    progressTrack: soft(accents.orange, 0.12),
    // foundOverlay: soft(accents.orange, 0.95),
    foundOverlay: soft(accents.green, 0.95),
  },
  lookup: {
    gradient: gradients.teal,
    primaryButton: gradients.teal45,
    primaryButtonHover: gradients.teal45Dark,
    iconColor: accents.teal.from,
    softBg: soft(accents.teal, 0.08),
    softBorder: soft(accents.teal, 0.22),
    progressTrack: soft(accents.teal, 0.12),
    // foundOverlay: soft(accents.teal, 0.95),
    foundOverlay: soft(accents.green, 0.95),
  },
};

export const RFID_DIALOG_PAPER_SX = { borderRadius: `${radii.lg}px` };

export const RFID_DIALOG_RADIUS = {
  button: `${radii.md}px`,
  alert: `${radii.md}px`,
  input: `${radii.md}px`,
  section: `${radii.lg}px`,
};

export const RFID_PANEL_PADDING = { xs: 2, sm: 3 };

export const RFID_MODE_DEFAULTS = {
  "bulk-import": {
    variant: "default",
    maxWidth: "sm",
    title: "Quét mã RFID/NFC",
    showDivider: false,
  },
  radar: {
    variant: "default",
    maxWidth: "md",
    title: "Dò tìm thiết bị (RFID)",
    showDivider: false,
  },
  lookup: {
    variant: "lookup",
    maxWidth: "xs",
    title: "Quét RFID",
    subtitle: "Tra cứu lịch bảo dưỡng thiết bị",
    showDivider: false,
  },
};

export function getRfidVariantStyle(variant = "default") {
  return RFID_DIALOG_VARIANTS[variant] || RFID_DIALOG_VARIANTS.default;
}

export function rfidPrimaryButtonSx(variant = "default") {
  const v = getRfidVariantStyle(variant);
  return {
    borderRadius: RFID_DIALOG_RADIUS.button,
    textTransform: "none",
    fontWeight: 600,
    background: v.primaryButton,
    boxShadow: shadow(4, 14, shadowRgb.black, 0.12),
    "&:hover": {
      background: v.primaryButtonHover || v.primaryButton,
      boxShadow: shadow(6, 18, shadowRgb.black, 0.16),
    },
    "&.Mui-disabled": {
      background: colors.grey[300],
      color: colors.grey[500],
      boxShadow: "none",
    },
  };
}

export function rfidOutlinedButtonSx() {
  return {
    borderRadius: RFID_DIALOG_RADIUS.button,
    textTransform: "none",
    fontWeight: 600,
  };
}

export function rfidInputRootSx() {
  return {
    "& .MuiOutlinedInput-root": {
      borderRadius: RFID_DIALOG_RADIUS.input,
      bgcolor: colors.white,
    },
  };
}

export function rfidMonoInputSx() {
  return {
    ...rfidInputRootSx(),
    "& .MuiOutlinedInput-root": {
      borderRadius: RFID_DIALOG_RADIUS.input,
      bgcolor: colors.white,
      fontFamily:
        "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
      letterSpacing: "0.04em",
    },
  };
}

export function rfidSectionSx(variant = "default") {
  const v = getRfidVariantStyle(variant);
  return {
    p: 2,
    borderRadius: RFID_DIALOG_RADIUS.section,
    bgcolor: v.softBg,
    border: `1px solid ${v.softBorder}`,
  };
}
