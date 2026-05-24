import React from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  InputAdornment,
  LinearProgress,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Radar, WifiTethering } from "@mui/icons-material";
import {
  RFID_CONTENT_BG,
  RFID_DIALOG_RADIUS,
  RFID_PANEL_PADDING,
  getRfidVariantStyle,
  rfidInputRootSx,
  rfidMonoInputSx,
  rfidOutlinedButtonSx,
  rfidPrimaryButtonSx,
  rfidSectionSx,
} from "./rfidDialogTheme";

export const RfidPanelBody = ({ children, sx }) => (
  <Stack spacing={2.5} sx={{ py: 3, px: RFID_PANEL_PADDING, ...sx }}>
    {children}
  </Stack>
);

export const RfidInfoAlert = ({ children, severity = "info" }) => (
  <Alert severity={severity} sx={{ borderRadius: RFID_DIALOG_RADIUS.alert }}>
    {children}
  </Alert>
);

export const RfidStepLabel = ({ step, total, label, variant = "default" }) => {
  const v = getRfidVariantStyle(variant);
  return (
    <Box>
      <Chip
        size="small"
        label={`Bước ${step}/${total}`}
        sx={{
          mb: 1,
          fontWeight: 700,
          bgcolor: v.softBg,
          color: v.iconColor,
          border: `1px solid ${v.softBorder}`,
        }}
      />
      {label ? (
        <Typography variant="subtitle1" fontWeight={700}>
          {label}
        </Typography>
      ) : null}
    </Box>
  );
};

export const RfidClearableMultiline = ({
  label,
  placeholder,
  value,
  onChange,
  onClear,
  disabled,
  rows = 8,
  inputRef,
  autoFocus,
}) => (
  <Box sx={{ position: "relative" }}>
    {value && !disabled ? (
      <IconButton
        size="small"
        onClick={onClear}
        sx={{
          position: "absolute",
          top: 8,
          right: 8,
          zIndex: 10,
          color: "text.secondary",
          bgcolor: "background.paper",
        }}
      >
        CLEAR
      </IconButton>
    ) : null}
    <TextField
      inputRef={inputRef}
      fullWidth
      multiline
      rows={rows}
      label={label}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      disabled={disabled}
      autoFocus={autoFocus}
      sx={{
        ...rfidInputRootSx(),
        "& .MuiInputBase-root": { paddingRight: "48px" },
      }}
    />
  </Box>
);

export const RfidProgressHeader = ({
  title,
  found,
  total,
  variant = "default",
}) => {
  const v = getRfidVariantStyle(variant);
  const pct = total > 0 ? (found / total) * 100 : 0;

  return (
    <Box sx={rfidSectionSx(variant)}>
      <Typography
        variant="overline"
        sx={{ color: "text.secondary", letterSpacing: 1 }}
      >
        {title}
      </Typography>
      <Typography
        variant="h6"
        fontWeight={700}
        sx={{
          mt: 0.5,
          background: v.gradient,
          backgroundClip: "text",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        Đã tìm thấy: {found} / {total} máy
      </Typography>
      <LinearProgress
        variant="determinate"
        value={pct}
        sx={{
          mt: 1.5,
          height: 8,
          borderRadius: RFID_DIALOG_RADIUS.input,
          bgcolor: v.progressTrack,
          "& .MuiLinearProgress-bar": {
            borderRadius: RFID_DIALOG_RADIUS.input,
            background: v.gradient,
          },
        }}
      />
    </Box>
  );
};

export const RfidTargetList = ({ targets, foundSet }) => (
  <Box
    sx={{
      maxHeight: 280,
      overflowY: "auto",
      borderRadius: RFID_DIALOG_RADIUS.section,
      border: "1px solid rgba(0,0,0,0.06)",
      bgcolor: "#fff",
    }}
  >
    {targets.map((target, idx) => {
      const isFound = foundSet.has(target.targetRfid.toUpperCase());
      return (
        <Box
          key={`${target.targetRfid}-${idx}`}
          sx={{
            px: 2,
            py: 1.25,
            borderBottom:
              idx < targets.length - 1 ? "1px solid rgba(0,0,0,0.06)" : "none",
            bgcolor: isFound ? "rgba(46, 125, 50, 0.08)" : "transparent",
          }}
        >
          <Typography variant="body2" fontWeight={600}>
            {target.info?.name &&
            target.info.name.toUpperCase() !== target.targetRfid
              ? target.info.name
              : target.info?.type
                ? `${target.info.type}${target.info.model ? ` ${target.info.model}` : ""}`.trim()
                : target.info?.serial &&
                    target.info.serial !== "—" &&
                    target.info.serial.toUpperCase() !== target.targetRfid
                  ? target.info.serial
                  : target.targetRfid}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Serial:{" "}
            {target.info?.serial &&
            target.info.serial !== "—" &&
            target.info.serial.toUpperCase() !== target.targetRfid
              ? target.info.serial
              : "—"}{" "}
            · RFID: {target.targetRfid}
          </Typography>
        </Box>
      );
    })}
  </Box>
);

export const RfidScanZone = ({
  scanPreview,
  onFocusScan,
  variant = "default",
}) => {
  const v = getRfidVariantStyle(variant);

  return (
    <Box
      onClick={onFocusScan}
      sx={{
        textAlign: "center",
        p: 3,
        borderRadius: RFID_DIALOG_RADIUS.section,
        border: `2px dashed ${v.softBorder}`,
        bgcolor: "#fff",
        cursor: "pointer",
      }}
    >
      <Radar sx={{ fontSize: 52, color: v.iconColor, opacity: 0.45, mb: 1 }} />
      <Typography variant="subtitle1" fontWeight={700}>
        Đang quét tín hiệu
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Bóp cò máy quét và di chuyển xung quanh thiết bị
      </Typography>
      <Box
        sx={{
          p: 1.25,
          borderRadius: RFID_DIALOG_RADIUS.input,
          bgcolor: RFID_CONTENT_BG,
          border: "1px solid rgba(0,0,0,0.06)",
          fontSize: "0.78rem",
          color: v.iconColor,
          overflow: "hidden",
          whiteSpace: "nowrap",
          textOverflow: "ellipsis",
        }}
      >
        {scanPreview || "[ Sẵn sàng nhận tín hiệu ]"}
      </Box>
    </Box>
  );
};

export const RfidPrimaryButton = ({
  children,
  variant = "default",
  fullWidth,
  sx,
  ...props
}) => (
  <Button
    variant="contained"
    fullWidth={fullWidth}
    {...props}
    sx={{
      ...rfidPrimaryButtonSx(variant),
      width: fullWidth ? "100%" : undefined,
      ...sx,
    }}
  >
    {children}
  </Button>
);

export const RfidSecondaryButton = ({ children, sx, ...props }) => (
  <Button
    variant="outlined"
    {...props}
    sx={{ ...rfidOutlinedButtonSx(), ...sx }}
  >
    {children}
  </Button>
);

export const RfidLookupField = ({
  value,
  onChange,
  onClear,
  onEnter,
  disabled,
  maxLength,
}) => {
  const v = getRfidVariantStyle("lookup");
  return (
    <TextField
      fullWidth
      autoFocus
      placeholder="Quét mã RFID để tra cứu"
      value={value}
      onChange={onChange}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          onEnter?.();
        }
      }}
      disabled={disabled}
      sx={rfidMonoInputSx()}
      inputProps={{
        maxLength,
        spellCheck: false,
        autoCapitalize: "off",
        autoCorrect: "off",
      }}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <WifiTethering sx={{ fontSize: 20, color: v.iconColor }} />
          </InputAdornment>
        ),
        endAdornment:
          value && !disabled ? (
            <InputAdornment position="end">
              <IconButton size="small" onClick={onClear} edge="end">
                CLEAR
              </IconButton>
            </InputAdornment>
          ) : null,
      }}
    />
  );
};
