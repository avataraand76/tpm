// frontend/src/components/RfidScannerDialog.jsx

import React, { useState, useRef } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  CircularProgress,
  Alert,
  Typography,
  Stack,
  IconButton,
  useTheme,
  useMediaQuery,
  Box,
} from "@mui/material";
import { Close } from "@mui/icons-material";
import { api } from "../api/api";

const RfidScannerDialog = ({
  open,
  onClose,
  onAddMachines,
  apiParams,
  showNotification,
  selectedMachineUuids,
}) => {
  const [rfidInput, setRfidInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const inputRef = useRef(null);

  const handleClose = () => {
    setRfidInput("");
    setIsProcessing(false);
    onClose();
  };

  const handleClearInput = () => {
    setRfidInput("");
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleSubmit = async () => {
    setIsProcessing(true);
    try {
      // 1. Tách chuỗi bằng dấu xuống dòng (Windows, Unix) hoặc dấu phẩy.
      // 2. Cắt bỏ khoảng trắng thừa (trim) ở đầu/cuối mỗi mã.
      // 3. Lọc ra các mã rỗng (ví dụ: các dòng trống).
      const codes = rfidInput
        .split(/\r\n|\r|\n|,/) // Tách bằng (Windows newline), (Mac newline), (Unix newline), hoặc (dấu phẩy)
        .map((code) => code.trim()) // Cắt bỏ khoảng trắng thừa
        .filter((code) => code.length > 0); // Lọc ra các dòng rỗng

      if (codes.length === 0) {
        showNotification(
          "warning",
          "Chưa nhập mã",
          "Vui lòng nhập hoặc dán danh sách mã RFID."
        );
        setIsProcessing(false);
        return;
      }

      const payload = {
        rfid_list: codes,
        ...apiParams,
      };

      const result = await api.machines.getByRfidList(payload);

      if (result.success) {
        const { foundMachines, notFoundRfids, filterMessage } = result.data;

        const machinesToAdd = [];
        const duplicateMachines = [];
        const selectedSet = new Set(selectedMachineUuids || []);

        if (foundMachines.length > 0) {
          for (const machine of foundMachines) {
            if (selectedSet.has(machine.uuid_machine)) {
              duplicateMachines.push(machine);
            } else {
              machinesToAdd.push(machine);
              selectedSet.add(machine.uuid_machine);
            }
          }
        }

        if (machinesToAdd.length > 0) {
          onAddMachines(machinesToAdd);
        }

        let title = "";
        let message = "";
        let severity = "success";
        const addedCount = machinesToAdd.length;
        const duplicateCount = duplicateMachines.length;
        const notFoundCount = notFoundRfids.length;

        if (addedCount > 0 && duplicateCount === 0 && notFoundCount === 0) {
          title = "Thành công";
          message = `Đã tìm thấy và thêm ${addedCount} máy.`;
          severity = "success";
        } else if (
          addedCount === 0 &&
          duplicateCount > 0 &&
          notFoundCount === 0
        ) {
          title = "Không thêm máy mới";
          message = `Đã tìm thấy ${duplicateCount} máy, nhưng tất cả đều đã có trong danh sách.`;
          severity = "info";
        } else {
          title = "Hoàn tất (có cảnh báo)";
          severity = "warning";
          let parts = [];
          if (addedCount > 0) parts.push(`Đã thêm ${addedCount} máy`);
          if (duplicateCount > 0)
            parts.push(
              `${duplicateCount} máy bị bỏ qua (đã có trong danh sách)`
            );
          if (notFoundCount > 0)
            parts.push(`${notFoundCount} mã không tìm thấy`);
          message =
            parts.join(". ") +
            `. (Lý do lọc: ${filterMessage || "Máy không hợp lệ"})`;
        }

        showNotification(severity, title, message);
        handleClose();
      } else {
        showNotification(
          "error",
          "Lỗi",
          result.message || "Lỗi khi tìm máy bằng RFID."
        );
      }
    } catch (error) {
      console.error("Error processing RFID list:", error);
      showNotification(
        "error",
        "Lỗi nghiêm trọng",
        error.response?.data?.message || "Lỗi máy chủ khi xử lý danh sách RFID."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          borderRadius: isMobile ? 0 : "20px",
        },
      }}
    >
      <DialogTitle
        sx={{
          background: "linear-gradient(45deg, #667eea, #764ba2)",
          color: "white",
          fontWeight: 700,
        }}
      >
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Typography
            variant="h6"
            component="span"
            fontWeight="bold"
            fontSize={isMobile ? "1.1rem" : "1.25rem"}
          >
            Quét mã RFID/NFC
          </Typography>
          <IconButton onClick={handleClose} sx={{ color: "white" }}>
            <Close />
          </IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent sx={{ pt: 3, pb: 1 }}>
        <Stack spacing={2}>
          <Alert severity="info" sx={{ borderRadius: "12px" }}>
            {isMobile
              ? "Ô nhập liệu đã sẵn sàng, hãy dùng máy quét."
              : "Dán danh sách mã RFID/NFC từ máy quét vào ô bên dưới."}
            <br />
            <strong>Các mã trùng lặp sẽ tự động được lọc.</strong>
          </Alert>

          <Box sx={{ position: "relative" }}>
            {/* Nút Xóa (Clear) */}
            {rfidInput && !isProcessing && (
              <IconButton
                size="small"
                onClick={handleClearInput}
                sx={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  zIndex: 10,
                  color: "text.secondary",
                }}
              >
                CLEAR{" "}
              </IconButton>
            )}

            {/* Ô nhập liệu */}
            <TextField
              inputRef={inputRef}
              fullWidth
              multiline
              rows={10}
              label="Danh sách mã RFID/NFC"
              placeholder="RFID1
RFID2
RFID1
RFID3..."
              value={rfidInput}
              onChange={(e) => setRfidInput(e.target.value)}
              disabled={isProcessing}
              autoFocus
              sx={{
                "& .MuiInputBase-root": {
                  paddingRight: "40px",
                },
              }}
            />
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions
        sx={{
          p: { xs: 2, sm: 3 },
          flexDirection: { xs: "column-reverse", sm: "row" },
          gap: 1,
        }}
      >
        <Button
          variant="outlined"
          onClick={handleClose}
          disabled={isProcessing}
          sx={{
            borderRadius: "12px",
            width: { xs: "100%", sm: "auto" },
          }}
        >
          Đóng
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={isProcessing}
          sx={{
            borderRadius: "12px",
            background: "linear-gradient(45deg, #667eea, #764ba2)",
            minWidth: 140,
            width: { xs: "100%", sm: "auto" },
            m: { xs: "0 !important", sm: "0" },
          }}
        >
          {isProcessing ? (
            <CircularProgress size={24} color="inherit" />
          ) : (
            "Thêm máy"
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RfidScannerDialog;
