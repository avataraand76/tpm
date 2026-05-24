export const RFID_CONTENT_BG = "#f8f9fc";

export const RFID_DIALOG_VARIANTS = {
  default: {
    gradient: "linear-gradient(45deg, #667eea, #764ba2)",
    primaryButton: "linear-gradient(45deg, #667eea, #764ba2)",
    primaryButtonHover: "linear-gradient(45deg, #5a6fd6, #6a4190)",
    iconColor: "#667eea",
    softBg: "rgba(102, 126, 234, 0.08)",
    softBorder: "rgba(102, 126, 234, 0.22)",
    progressTrack: "rgba(102, 126, 234, 0.12)",
    // foundOverlay: "rgba(102, 126, 234, 0.95)",
    foundOverlay: "rgba(46, 125, 50, 0.95)",
  },
  batch: {
    gradient: "linear-gradient(45deg, #ff9800, #ff5722)",
    primaryButton: "linear-gradient(45deg, #ff9800, #ff5722)",
    primaryButtonHover: "linear-gradient(45deg, #f57c00, #e64a19)",
    iconColor: "#ff9800",
    softBg: "rgba(255, 152, 0, 0.08)",
    softBorder: "rgba(255, 152, 0, 0.25)",
    progressTrack: "rgba(255, 152, 0, 0.12)",
    // foundOverlay: "rgba(255, 152, 0, 0.95)",
    foundOverlay: "rgba(46, 125, 50, 0.95)",
  },
  lookup: {
    gradient: "linear-gradient(135deg, #00897b 0%, #26a69a 100%)",
    primaryButton: "linear-gradient(45deg, #00897b 0%, #26a69a 100%)",
    primaryButtonHover: "linear-gradient(45deg, #00796b 0%, #00897b 100%)",
    iconColor: "#00897b",
    softBg: "rgba(0, 137, 123, 0.08)",
    softBorder: "rgba(0, 137, 123, 0.22)",
    progressTrack: "rgba(0, 137, 123, 0.12)",
    // foundOverlay: "rgba(0, 137, 123, 0.95)",
    foundOverlay: "rgba(46, 125, 50, 0.95)",
  },
};

export const RFID_DIALOG_PAPER_SX = { borderRadius: "20px" };

export const RFID_DIALOG_RADIUS = {
  button: "12px",
  alert: "12px",
  input: "12px",
  section: "16px",
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
    boxShadow: "0 4px 14px rgba(0,0,0,0.12)",
    "&:hover": {
      background: v.primaryButtonHover || v.primaryButton,
      boxShadow: "0 6px 18px rgba(0,0,0,0.16)",
    },
    "&.Mui-disabled": {
      background: "#e0e0e0",
      color: "#9e9e9e",
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
      bgcolor: "#fff",
    },
  };
}

export function rfidMonoInputSx() {
  return {
    ...rfidInputRootSx(),
    "& .MuiOutlinedInput-root": {
      borderRadius: RFID_DIALOG_RADIUS.input,
      bgcolor: "#fff",
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
