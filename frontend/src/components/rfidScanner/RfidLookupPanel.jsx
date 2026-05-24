import React from "react";
import { Alert, Typography, Box, CircularProgress } from "@mui/material";
import { HourglassEmpty } from "@mui/icons-material";
import { RFID_LOOKUP_LENGTH } from "./rfidCodeUtils";
import { RFID_DIALOG_RADIUS } from "./rfidDialogTheme";
import {
  RfidPanelBody,
  RfidLookupField,
  RfidPrimaryButton,
  RfidSecondaryButton,
} from "./rfidUiPrimitives";

export const RfidLookupPanelBody = ({
  rfidInput,
  setRfidInput,
  loading,
  error,
  setError,
  warning,
  setWarning,
  onLookup,
}) => (
  <RfidPanelBody sx={{ py: 2.5 }}>
    <RfidLookupField
      value={rfidInput}
      maxLength={RFID_LOOKUP_LENGTH}
      disabled={loading}
      onChange={(e) => {
        const next = e.target.value.slice(0, RFID_LOOKUP_LENGTH);
        setRfidInput(next);
        if (error) setError(null);
        if (warning) setWarning(null);
        if (next.trim().length === RFID_LOOKUP_LENGTH && !loading) {
          onLookup(next);
        }
      }}
      onClear={() => {
        setRfidInput("");
        setError(null);
        setWarning(null);
      }}
      onEnter={() => onLookup()}
    />

    {error ? (
      <Alert
        severity="error"
        onClose={() => setError(null)}
        sx={{ borderRadius: RFID_DIALOG_RADIUS.alert, fontSize: "0.82rem" }}
      >
        {error}
      </Alert>
    ) : null}

    {warning ? (
      <Alert
        severity="warning"
        icon={<HourglassEmpty fontSize="inherit" />}
        onClose={() => setWarning(null)}
        sx={{
          borderRadius: RFID_DIALOG_RADIUS.alert,
          fontSize: "0.82rem",
          "& .MuiAlert-message": { width: "100%" },
        }}
      >
        <Typography variant="body2" fontWeight={700} sx={{ mb: 0.5 }}>
          {warning.code === "NO_SCHEDULE"
            ? "Chưa có lịch bảo dưỡng"
            : "Chưa có nội dung bảo dưỡng"}
        </Typography>
        <Typography variant="caption" sx={{ display: "block" }}>
          {warning.message}
        </Typography>
        {warning.machine ? (
          <Box
            sx={{
              mt: 1,
              p: 1,
              bgcolor: "rgba(255,152,0,0.08)",
              borderRadius: "8px",
              border: "1px dashed rgba(255,152,0,0.4)",
            }}
          >
            <Typography variant="caption" fontWeight={600} display="block">
              {warning.machine.type_machine} {warning.machine.attribute_machine}
            </Typography>
            {warning.machine.serial_machine ? (
              <Typography variant="caption" display="block">
                Serial: {warning.machine.serial_machine}
              </Typography>
            ) : null}
          </Box>
        ) : null}
      </Alert>
    ) : null}
  </RfidPanelBody>
);

export const RfidLookupPanelActions = ({
  onClose,
  onLookup,
  loading,
  rfidInput,
}) => (
  <>
    <RfidSecondaryButton
      onClick={onClose}
      disabled={loading}
      sx={{ width: { xs: "100%", sm: "auto" } }}
    >
      Đóng
    </RfidSecondaryButton>
    <RfidPrimaryButton
      variant="lookup"
      onClick={onLookup}
      disabled={!rfidInput.trim() || loading}
      sx={{ minWidth: 180, width: { xs: "100%", sm: "auto" } }}
    >
      {loading ? (
        <CircularProgress size={18} color="inherit" />
      ) : (
        "Xem lịch bảo dưỡng"
      )}
    </RfidPrimaryButton>
  </>
);
