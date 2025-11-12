// frontend/src/components/MachineQRScanner.jsx
// PHIÊN BẢN REMAKE (Đơn giản - Scan và Tự động thêm)

import React, { useRef, useEffect, useState, useCallback } from "react";
import QrScanner from "qr-scanner";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Stack,
  IconButton,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { Close, QrCodeScanner, Cameraswitch, Error } from "@mui/icons-material";
import { api } from "../api/api";

// --- CUSTOM HOOK (Dựa trên code mẫu của bạn, đã sửa) ---
const CAMERA_CACHE_KEY = "qr_scanner_preferred_camera";
const LAST_SUCCESS_CAMERA_KEY = "qr_scanner_last_success_camera";

const useAppQRScanner = (videoRef, onScanAsync) => {
  const scannerRef = useRef(null);
  const isPausedRef = useRef(false);

  const [isInitializing, setIsInitializing] = useState(false);
  const [isScanningActive, setIsScanningActive] = useState(false);
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState("environment");
  const [error, setError] = useState("");

  const saveSuccessCamera = useCallback((cameraId) => {
    try {
      localStorage.setItem(LAST_SUCCESS_CAMERA_KEY, cameraId);
    } catch (e) {
      console.error("Failed to save successful camera:", e);
    }
  }, []);

  const getPreferredCameraId = useCallback(async () => {
    try {
      const cameraList = await QrScanner.listCameras(true);
      setCameras(cameraList);
      const lastSuccessCamera = localStorage.getItem(LAST_SUCCESS_CAMERA_KEY);
      const cachedCamera = localStorage.getItem(CAMERA_CACHE_KEY);
      const preferredId = lastSuccessCamera || cachedCamera;
      if (preferredId && cameraList.find((cam) => cam.id === preferredId)) {
        return preferredId;
      }
      const backCamera = cameraList.find(
        (cam) =>
          cam.label.toLowerCase().includes("back") ||
          cam.label.toLowerCase().includes("rear") ||
          cam.label.toLowerCase().includes("environment")
      );
      return backCamera
        ? backCamera.id
        : cameraList.length > 0
        ? cameraList[cameraList.length - 1].id
        : "environment";
    } catch (e) {
      console.error("Error listing cameras:", e);
      return "environment";
    }
  }, []);

  const handleCameraError = useCallback((err) => {
    console.error("Camera error:", err);
    let errorMsg;
    if (err.name === "NotAllowedError" || err.message?.includes("Permission")) {
      errorMsg =
        "Cần cấp quyền truy cập camera. Vui lòng cho phép trong trình duyệt.";
    } else if (err.name === "NotFoundError") {
      errorMsg = "Không tìm thấy camera. Vui lòng kiểm tra thiết bị.";
    } else if (err.name === "NotReadableError") {
      errorMsg = "Camera đang được sử dụng bởi ứng dụng khác.";
    } else {
      errorMsg = "Lỗi khởi tạo camera.";
    }
    setError(errorMsg);
    setIsInitializing(false);
    setIsScanningActive(false);
  }, []);

  const startScanning = useCallback(
    async (newCameraId) => {
      if (!videoRef.current) return;
      if (scannerRef.current) {
        scannerRef.current.destroy();
        scannerRef.current = null;
      }
      setIsInitializing(true);
      setIsScanningActive(false);
      isPausedRef.current = false;
      setError("");
      try {
        if (!QrScanner.hasCamera()) {
          throw new Error("Thiết bị không có camera.");
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        stream.getTracks().forEach((track) => track.stop());
        const finalCameraId = newCameraId || (await getPreferredCameraId());
        setSelectedCameraId(finalCameraId);
        const scanner = new QrScanner(
          videoRef.current,
          async (result) => {
            if (isPausedRef.current) return;
            isPausedRef.current = true; // Dừng quét
            scanner.pause();

            saveSuccessCamera(scanner._preferredCamera);
            if (window.navigator.vibrate) window.navigator.vibrate(100);

            try {
              // Chờ cho hàm onScanAsync (gọi API) thực thi xong
              await onScanAsync(result.data);
            } catch (e) {
              console.error("onScanAsync callback failed:", e);
            }
          },
          {
            returnDetailedScanResult: true,
            highlightScanRegion: true,
            highlightCodeOutline: true,
            preferredCamera: finalCameraId,
            maxScansPerSecond: 1, // 1 lần quét/giây là đủ
          }
        );
        await scanner.start();
        scannerRef.current = scanner;
        setIsInitializing(false);
        setIsScanningActive(true);
        setError("");
        localStorage.setItem(CAMERA_CACHE_KEY, finalCameraId);
      } catch (err) {
        handleCameraError(err);
      }
    },
    [
      videoRef,
      onScanAsync,
      getPreferredCameraId,
      handleCameraError,
      saveSuccessCamera,
    ]
  );

  const stopScanning = useCallback(() => {
    if (scannerRef.current) {
      scannerRef.current.destroy();
      scannerRef.current = null;
    }
    setIsScanningActive(false);
  }, []);

  const switchCamera = useCallback(async () => {
    if (scannerRef.current && cameras.length > 1) {
      const currentIndex = cameras.findIndex(
        (cam) => cam.id === selectedCameraId
      );
      const nextIndex = (currentIndex + 1) % cameras.length;
      const nextCamera = cameras[nextIndex];
      await startScanning(nextCamera.id);
    }
  }, [cameras, selectedCameraId, startScanning]);

  // Hàm cho phép component bên ngoài kích hoạt quét lại
  const resumeScanning = useCallback(() => {
    if (scannerRef.current && scannerRef.current.getState() === "paused") {
      scannerRef.current.start();
      isPausedRef.current = false;
    } else if (scannerRef.current) {
      // Dành cho trường hợp scanner bị lỗi và stop
      scannerRef.current.start();
      isPausedRef.current = false;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.destroy();
      }
    };
  }, []);

  return {
    isInitializing,
    isScanningActive,
    error: error,
    cameras,
    startScanning,
    stopScanning,
    switchCamera,
    resumeScanning, // Trả về hàm resume
  };
};
// --- KẾT THÚC CUSTOM HOOK ---

// ------------------------------------
// --- COMPONENT CHÍNH (Bản Đơn Giản) ---
// ------------------------------------
const MachineQRScanner = ({
  isOpen,
  onClose,
  onMachineAdd, // Hàm từ parent để thêm máy
  selectedMachines, // Máy đã có trong phiếu (để check trùng)
  apiParams = {},
  ticketTypeLabel = "",
  showNotification, // Hàm thông báo từ parent
}) => {
  const videoRef = useRef(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  // State thông báo lỗi/loading (hiển thị đè lên video)
  const [overlayState, setOverlayState] = useState({
    status: "idle", // idle, loading, error
    message: "",
  });

  // --- Hàm gọi API (được truyền vào hook) ---
  const handleScanAPI = useCallback(
    async (resultData) => {
      setOverlayState({ status: "loading", message: "Đang xử lý..." });

      // 1. Phân tích mã QR
      const parts = resultData.split("-");
      if (
        parts.length < 2 ||
        (parts[0].toUpperCase() !== "MAY" &&
          parts[0].toUpperCase() !== "PHUKIEN")
      ) {
        setOverlayState({
          status: "error",
          message: "Mã QR không hợp lệ (Format: [MAY/PHUKIEN]-[SERIAL]).",
        });
        // Tự động reset sau 2 giây để quét tiếp
        setTimeout(() => {
          setOverlayState({ status: "idle", message: "" });
          logic.resumeScanning();
        }, 2000);
        return;
      }

      const serial = parts.slice(1).join("-");

      // 2. Gọi API lấy thông tin máy
      try {
        const response = await api.machines.getBySerial(serial, apiParams);

        if (response.success && response.data) {
          const machine = response.data;

          // 3. Kiểm tra trùng lặp
          const isDuplicate = selectedMachines.some(
            (m) => m.uuid_machine === machine.uuid_machine
          );

          if (isDuplicate) {
            // Lỗi: Trùng lặp
            setOverlayState({
              status: "error",
              message: `Máy ${machine.code_machine} đã có trong phiếu!`,
            });
            setTimeout(() => {
              setOverlayState({ status: "idle", message: "" });
              logic.resumeScanning();
            }, 2000);
          } else {
            // THÀNH CÔNG
            onMachineAdd({ ...machine, note: "" }); // Thêm máy vào form
            showNotification(
              "success",
              "Thành công",
              `Đã thêm máy: ${machine.code_machine}`
            );
            onClose(); // Tự động đóng dialog
          }
        } else {
          // Lỗi: API báo không tìm thấy (lỗi nghiệp vụ)
          setOverlayState({
            status: "error",
            message:
              response.message || `Không tìm thấy máy với Serial: ${serial}`,
          });
          setTimeout(() => {
            setOverlayState({ status: "idle", message: "" });
            logic.resumeScanning();
          }, 2000);
        }
      } catch (error) {
        // Lỗi: Lỗi API, mạng...
        const errorMessage =
          error.response?.data?.message || "Lỗi kết nối hoặc tìm kiếm Serial.";
        setOverlayState({ status: "error", message: errorMessage });
        setTimeout(() => {
          setOverlayState({ status: "idle", message: "" });
          logic.resumeScanning();
        }, 2000);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [apiParams, selectedMachines, onMachineAdd, onClose, showNotification]
  );

  // --- Sử dụng Hook ---
  const logic = useAppQRScanner(videoRef, handleScanAPI);

  // --- Effect quản lý mở/đóng ---
  useEffect(() => {
    if (isOpen) {
      logic.startScanning();
    } else {
      logic.stopScanning();
      setOverlayState({ status: "idle", message: "" }); // Reset lỗi khi đóng
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, logic.startScanning, logic.stopScanning]);

  // --- Text hiển thị trạng thái camera ---
  const cameraStatusText = logic.isInitializing
    ? "Đang khởi động camera..."
    : logic.error
    ? logic.error // Hiển thị lỗi từ hook
    : logic.isScanningActive
    ? "Di chuyển camera đến mã QR..."
    : "Camera đã dừng.";

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          borderRadius: "20px",
          overflow: "hidden",
          height: isMobile ? "100%" : "auto",
        },
      }}
    >
      <DialogTitle
        sx={{
          background: "#2e7d32",
          color: "white",
          fontWeight: 700,
          py: { xs: 1.5, md: 2 },
          px: { xs: 2, md: 3 },
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <QrCodeScanner />
          <Typography
            variant="h6"
            component="div"
            sx={{
              fontWeight: 700,
              fontSize: { xs: "1.1rem", md: "1.25rem" },
            }}
          >
            {ticketTypeLabel
              ? `Quét máy vào phiếu ${ticketTypeLabel.toLowerCase()}`
              : "Quét Mã QR Máy Móc"}
          </Typography>
        </Stack>
        <IconButton
          onClick={onClose}
          sx={{
            color: "white",
            position: "absolute",
            right: 8,
            top: isMobile ? 4 : 8,
          }}
        >
          <Close />
        </IconButton>
      </DialogTitle>

      {/* BỐ CỤC ĐƠN GIẢN (CHỈ VIDEO) */}
      <DialogContent sx={{ p: 0, overflow: "hidden" }}>
        <Box
          sx={{
            position: "relative",
            // Chiều cao 4:3
            width: "100%",
            paddingTop: "75%", // Tỷ lệ 4:3 (height/width)
            bgcolor: "black",
            overflow: "hidden",
          }}
        >
          <video
            ref={videoRef}
            style={{
              // <<< SỬA LỖI ZOOM >>>
              width: "100%",
              height: "100%",
              objectFit: "contain", // Hiển thị vừa vặn, không zoom
              position: "absolute",
              top: 0,
              left: 0,
              display:
                logic.isScanningActive || logic.isInitializing
                  ? "block"
                  : "none",
            }}
            playsInline
          />

          {/* Lớp phủ trạng thái (Loading, Error, Idle) */}
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              color: "white",
              p: 2,
              textAlign: "center",
              // Chỉ hiển thị khi camera không active, hoặc có lỗi/loading
              backgroundColor:
                logic.isScanningActive && overlayState.status === "idle"
                  ? "transparent" // Trong suốt khi đang quét
                  : "rgba(0, 0, 0, 0.7)", // Mờ khi có thông báo
              transition: "background-color 0.3s ease",
            }}
          >
            {/* 1. Trạng thái Loading (từ API) */}
            {overlayState.status === "loading" && (
              <>
                <CircularProgress color="inherit" size={30} sx={{ mb: 1 }} />
                <Typography variant="h6" fontWeight="bold">
                  {overlayState.message}
                </Typography>
              </>
            )}

            {/* 2. Trạng thái Error (từ API) */}
            {overlayState.status === "error" && (
              <Stack alignItems="center" spacing={1}>
                <Error sx={{ fontSize: 40, color: "error.main" }} />
                <Typography variant="h6" fontWeight="bold" color="error.light">
                  {overlayState.message}
                </Typography>
                <Typography variant="body2">
                  Đang sẵn sàng quét mã tiếp theo...
                </Typography>
              </Stack>
            )}

            {/* 3. Trạng thái Chờ/Lỗi Camera (từ Hook) */}
            {overlayState.status === "idle" && !logic.isScanningActive && (
              <>
                {logic.isInitializing && (
                  <CircularProgress color="inherit" size={30} sx={{ mb: 1 }} />
                )}
                <Typography variant="h6" fontWeight="bold">
                  {cameraStatusText}
                </Typography>
              </>
            )}
          </Box>

          {/* Nút chuyển camera (vẫn giữ lại) */}
          {logic.isScanningActive && logic.cameras.length > 1 && (
            <IconButton
              onClick={logic.switchCamera}
              sx={{
                position: "absolute",
                bottom: 16,
                right: 16,
                bgcolor: "rgba(0,0,0,0.5)",
                color: "white",
                "&:hover": { bgcolor: "rgba(0,0,0,0.7)" },
              }}
            >
              <Cameraswitch />
            </IconButton>
          )}
        </Box>
      </DialogContent>
      {/* KHÔNG CÓ DIALOG ACTIONS */}
    </Dialog>
  );
};

export default MachineQRScanner;
