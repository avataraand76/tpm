import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Stack,
  IconButton,
  Box,
  Avatar,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { Close, WifiTethering } from "@mui/icons-material";
import {
  RFID_CONTENT_BG,
  RFID_DIALOG_PAPER_SX,
  getRfidVariantStyle,
} from "./rfidDialogTheme";

const RfidDialogShell = ({
  open,
  onClose,
  title,
  subtitle,
  variant = "default",
  maxWidth = "md",
  fullWidth = true,
  children,
  actions,
  contentSx,
  disableClose = false,
  disableEnforceFocus = false,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const variantStyle = getRfidVariantStyle(variant);

  const handleClose = (...args) => {
    if (disableClose) return;
    onClose?.(...args);
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth={maxWidth}
      fullWidth={fullWidth}
      fullScreen={isMobile}
      disableEnforceFocus={disableEnforceFocus}
      PaperProps={{
        sx: isMobile ? { borderRadius: 0 } : RFID_DIALOG_PAPER_SX,
      }}
    >
      <DialogTitle
        sx={{
          background: variantStyle.gradient,
          color: "white",
          fontWeight: 700,
          py: 2,
          px: { xs: 2, sm: 3 },
        }}
      >
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          spacing={1.5}
        >
          <Stack
            direction="row"
            alignItems="center"
            spacing={1.5}
            sx={{ minWidth: 0 }}
          >
            <Avatar
              sx={{
                width: 40,
                height: 40,
                bgcolor: "rgba(255,255,255,0.2)",
                flexShrink: 0,
              }}
            >
              <WifiTethering sx={{ color: "#fff" }} />
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography
                variant={isMobile ? "h6" : maxWidth === "xs" ? "h6" : "h5"}
                component="span"
                fontWeight="bold"
                sx={{ display: "block", lineHeight: 1.3 }}
              >
                {title}
              </Typography>
              {subtitle ? (
                <Typography
                  variant="caption"
                  component="div"
                  sx={{ opacity: 0.92, mt: 0.25, display: "block" }}
                >
                  {subtitle}
                </Typography>
              ) : null}
            </Box>
          </Stack>
          <IconButton
            onClick={handleClose}
            disabled={disableClose}
            sx={{ color: "white", flexShrink: 0 }}
            size="small"
          >
            <Close />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent
        sx={{
          p: 0,
          bgcolor: RFID_CONTENT_BG,
          ...contentSx,
        }}
      >
        {children}
      </DialogContent>

      {actions ? (
        <DialogActions
          sx={{
            p: { xs: 2, sm: 2.5 },
            bgcolor: RFID_CONTENT_BG,
            borderTop: "1px solid rgba(0,0,0,0.06)",
            flexDirection: { xs: "column-reverse", sm: "row" },
            gap: 1,
            "& > :not(style) + :not(style)": {
              marginLeft: { xs: "0px !important", sm: "8px !important" },
            },
          }}
        >
          {actions}
        </DialogActions>
      ) : null}
    </Dialog>
  );
};

export default RfidDialogShell;
