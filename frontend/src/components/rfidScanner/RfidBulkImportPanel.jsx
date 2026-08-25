import React from "react";
import {
  CircularProgress,
  useResponsive,
} from "../../ui";
import {
  RfidPanelBody,
  RfidInfoAlert,
  RfidClearableMultiline,
  RfidPrimaryButton,
  RfidSecondaryButton,
} from "./rfidUiPrimitives";

export const RfidBulkImportPanelBody = ({
  rfidInput,
  setRfidInput,
  isProcessing,
  inputRef,
  onClear,
}) => {
  const { isMobile } = useResponsive();

  return (
    <RfidPanelBody>
      <RfidInfoAlert>
        {isMobile
          ? "Ô nhập liệu đã sẵn sàng, hãy dùng máy quét."
          : "Dán danh sách mã RFID/NFC từ máy quét vào ô bên dưới."}
        <br />
        <strong>Các mã trùng lặp sẽ tự động được lọc.</strong>
      </RfidInfoAlert>
      <RfidClearableMultiline
        label="Danh sách mã RFID/NFC"
        placeholder={"RFID1\nRFID2\nRFID3..."}
        rows={10}
        autoFocus
        value={rfidInput}
        onChange={(e) => setRfidInput(e.target.value)}
        onClear={onClear}
        disabled={isProcessing}
        inputRef={inputRef}
      />
    </RfidPanelBody>
  );
};

export const RfidBulkImportPanelActions = ({
  onClose,
  onSubmit,
  isProcessing,
  variant = "default",
}) => (
  <>
    <RfidSecondaryButton
      onClick={onClose}
      disabled={isProcessing}
      sx={{ width: { xs: "100%", sm: "auto" } }}
    >
      Đóng
    </RfidSecondaryButton>
    <RfidPrimaryButton
      onClick={onSubmit}
      disabled={isProcessing}
      variant={variant}
      sx={{ minWidth: 140, width: { xs: "100%", sm: "auto" } }}
    >
      {isProcessing ? (
        <CircularProgress size={24} color="inherit" />
      ) : (
        "Thêm máy"
      )}
    </RfidPrimaryButton>
  </>
);
