// frontend/src/components/MachineQRScanner.jsx

import React, { useRef, useEffect, useState, useCallback } from "react";
import QrScanner from "qr-scanner";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Stack,
  IconButton,
  Chip,
} from "@mui/material";
import { Close, Add, Refresh, Cameraswitch } from "@mui/icons-material";
import { api } from "../api/api";

// --- CONFIG CÁC HẰNG SỐ ---
const STATUS_CONFIG = {
  available: { bg: "#2e7d3222", color: "#2e7d32", label: "Sẵn sàng" },
  in_use: { bg: "#667eea22", color: "#667eea", label: "Đang sử dụng" },
  maintenance: { bg: "#ff980022", color: "#ff9800", label: "Bảo trì" },
  rented: { bg: "#673ab722", color: "#673ab7", label: "Đang thuê" },
  borrowed: { bg: "#03a9f422", color: "#03a9f4", label: "Đang mượn" },
  borrowed_out: { bg: "#00bcd422", color: "#00bcd4", label: "Cho mượn" },
  liquidation: { bg: "#f4433622", color: "#f44336", label: "Thanh lý" },
  disabled: { bg: "#9e9e9e22", color: "#9e9e9e", label: "Vô hiệu hóa" },
};

const getStatusInfo = (statusKey) => {
  return (
    STATUS_CONFIG[statusKey] || {
      bg: "#9e9e9e22",
      color: "#9e9e9e",
      label: statusKey,
    }
  );
};

const getMachineStatusLabel = (status) => {
  return getStatusInfo(status).label;
};

// --- CUSTOM HOOK CHO LOGIC QR SCANNER (Mô phỏng hook mẫu) ---
const CAMERA_CACHE_KEY = "qr_scanner_preferred_camera";
const LAST_SUCCESS_CAMERA_KEY = "qr_scanner_last_success_camera";

const useMachineQRScannerLogic = (videoRef, handleScanResult) => {
  const scannerRef = useRef(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isScanningActive, setIsScanningActive] = useState(false);
  const [error, setError] = useState("");
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState("environment");

  // Lưu camera đã quét thành công
  const saveSuccessCamera = useCallback((cameraId) => {
    try {
      localStorage.setItem(LAST_SUCCESS_CAMERA_KEY, cameraId);
    } catch (error) {
      console.error("Failed to save successful camera:", error);
    }
  }, []);

  // Lấy camera ưu tiên (Ưu tiên camera đã quét thành công)
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

      // Ưu tiên camera sau (environment) nếu không có cache
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

  // Xử lý lỗi
  const handleCameraError = useCallback((err) => {
    console.error("Camera error:", err);

    let errorMsg;
    if (err.name === "NotAllowedError" || err.message?.includes("Permission")) {
      errorMsg =
        "Cần cấp quyền truy cập camera. Vui lòng cho phép trong trình duyệt và nhấn 'Thử lại'.";
    } else if (err.name === "NotFoundError") {
      errorMsg = "Không tìm thấy camera. Vui lòng kiểm tra thiết bị.";
    } else if (err.name === "NotReadableError") {
      errorMsg =
        "Camera đang được sử dụng bởi ứng dụng khác. Vui lòng đóng ứng dụng khác và thử lại.";
    } else {
      errorMsg = `Lỗi khởi tạo camera: ${
        err.message || err.name || "Unknown error"
      }`;
    }

    setError(errorMsg);
    setIsInitializing(false);
    setIsScanningActive(false);
  }, []);

  // Hàm khởi động/tái khởi động scan
  const startScanning = useCallback(
    async (newCameraId) => {
      if (!videoRef.current) return;

      // 1. Dọn dẹp scanner cũ
      if (scannerRef.current) {
        scannerRef.current.destroy();
        scannerRef.current = null;
      }

      setIsInitializing(true);
      setIsScanningActive(false);
      setError("");

      try {
        if (!QrScanner.hasCamera()) {
          throw new Error("Thiết bị không có camera hoặc không được hỗ trợ.");
        }

        // Xin quyền camera trước
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        stream.getTracks().forEach((track) => track.stop());

        const finalCameraId = newCameraId || (await getPreferredCameraId());
        setSelectedCameraId(finalCameraId);

        // 2. Khởi tạo scanner
        const scanner = new QrScanner(
          videoRef.current,
          (result) => {
            // Lưu camera thành công
            saveSuccessCamera(scanner._preferredCamera);
            handleScanResult(result);
          },
          {
            returnDetailedScanResult: true,
            highlightScanRegion: true,
            highlightCodeOutline: true,
            preferredCamera: finalCameraId,
            maxScansPerSecond: 1,
            scanRegion: {
              x: 5, // Bắt đầu từ 5% (5% offset)
              y: 5, // Bắt đầu từ 5% (5% offset)
              width: 90, // Chiều rộng 90%
              height: 90, // Chiều cao 90%
            },
          }
        );

        await scanner.start();

        scannerRef.current = scanner;
        setIsInitializing(false);
        setIsScanningActive(true);
        setError("");

        // Lưu camera hiện tại vào cache để dùng cho lần sau
        localStorage.setItem(CAMERA_CACHE_KEY, finalCameraId);
      } catch (err) {
        handleCameraError(err);
      }
    },
    [
      videoRef,
      handleScanResult,
      getPreferredCameraId,
      handleCameraError,
      saveSuccessCamera,
    ]
  );

  // Dừng scan
  const stopScanning = useCallback(() => {
    if (scannerRef.current) {
      scannerRef.current.stop();
      setIsScanningActive(false);
    }
  }, []);

  // Chuyển camera
  const switchCamera = useCallback(() => {
    if (scannerRef.current && cameras.length > 1) {
      const currentIndex = cameras.findIndex(
        (cam) => cam.id === selectedCameraId
      );
      const nextIndex = (currentIndex + 1) % cameras.length;
      const nextCamera = cameras[nextIndex];

      // Khởi động lại với camera mới
      startScanning(nextCamera.id);
    }
  }, [cameras, selectedCameraId, startScanning]);

  // Cần gọi stopScanning khi component unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.destroy();
        scannerRef.current = null;
      }
    };
  }, []);

  return {
    isInitializing,
    isScanningActive,
    error,
    cameras,
    selectedCameraId,
    startScanning,
    stopScanning,
    switchCamera,
    scanner: scannerRef.current,
  };
};

// ------------------------------------
// --- COMPONENT CHÍNH ---
const MachineQRScanner = ({
  isOpen,
  onClose,
  onMachineAdd,
  selectedMachines,
}) => {
  const videoRef = useRef(null);

  const [scanResult, setScanResult] = useState({
    scannedSerial: "",
    machine: null,
    loading: false,
    error: "",
  });

  // SỬ DỤNG HOOK TÁCH LOGIC (Di chuyển lên trước để tránh dependency issues)
  const scannerRef = useRef(null);

  // --- HÀM XỬ LÝ KẾT QUẢ VÀ GỌI API ---
  const handleScanResult = useCallback(
    async (result) => {
      const scanner = scannerRef.current;
      // Dừng scan ngay lập tức để xử lý
      if (scanner) {
        scanner.pause();
      }

      const resultData = result.data;
      if (window.navigator.vibrate) {
        window.navigator.vibrate(200);
      }

      setScanResult({
        scannedSerial: resultData,
        machine: null,
        loading: true,
        error: "",
      });

      // 1. Phân tích mã QR
      const parts = resultData.split("-");
      if (
        parts.length < 2 ||
        (parts[0].toUpperCase() !== "MAY" &&
          parts[0].toUpperCase() !== "PHUKIEN")
      ) {
        setScanResult((prev) => ({
          ...prev,
          loading: false,
          error: "Mã QR không hợp lệ (Format: [MAY/PHUKIEN]-[SERIAL]).",
        }));
        return;
      }

      const serial = parts.slice(1).join("-");

      // 2. Gọi API lấy thông tin máy
      try {
        const response = await api.machines.getBySerial(serial);

        if (response.success && response.data) {
          const machine = response.data;

          // Kiểm tra trùng lặp
          const isDuplicate = selectedMachines.some(
            (m) => m.uuid_machine === machine.uuid_machine
          );

          if (isDuplicate) {
            setScanResult((prev) => ({
              ...prev,
              loading: false,
              error: `Máy ${machine.code_machine} (Serial: ${serial}) đã có trong phiếu! Vui lòng quét mã khác hoặc bấm "Quét tiếp".`,
            }));
          } else {
            setScanResult((prev) => ({
              ...prev,
              loading: false,
              machine: machine,
              error: "",
            }));
          }
        } else {
          setScanResult((prev) => ({
            ...prev,
            loading: false,
            error:
              response.message ||
              `Không tìm thấy máy móc có sẵn với Serial: ${serial}`,
          }));
        }
      } catch (error) {
        const errorMessage =
          error.response?.data?.message ||
          "Lỗi kết nối hoặc tìm kiếm Serial. (Thử lại)";
        setScanResult((prev) => ({
          ...prev,
          loading: false,
          error: errorMessage,
        }));
      }
    },
    [selectedMachines]
  );

  const logic = useMachineQRScannerLogic(videoRef, handleScanResult);

  // Đồng bộ scannerRef với logic.scanner
  useEffect(() => {
    scannerRef.current = logic.scanner;
  }, [logic.scanner]);

  // --- EFFECT QUẢN LÝ VÒNG ĐỜI VÀ MỞ/ĐÓNG ---
  useEffect(() => {
    if (isOpen) {
      // Khởi động khi Dialog mở
      logic.startScanning();
    } else {
      // Dọn dẹp khi Dialog đóng
      logic.stopScanning();
      // Reset state kết quả
      setScanResult({
        scannedSerial: "",
        machine: null,
        loading: false,
        error: "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // --- HÀM TIẾP TỤC QUÉT ---
  const resumeScanning = () => {
    // Reset state kết quả
    setScanResult({
      scannedSerial: "",
      machine: null,
      loading: false,
      error: "",
    });

    // Bắt đầu lại scanner
    if (logic.scanner) {
      logic.scanner.start();
      logic.setIsScanningActive(true); // Cập nhật state trong hook
    } else {
      // Nếu scanner bị hủy do lỗi, thử khởi tạo lại
      logic.startScanning();
    }
  };

  // --- HÀM THÊM MÁY VÀ ĐÓNG DIALOG ---
  const handleAddScannedMachine = () => {
    if (scanResult && scanResult.machine) {
      // Đảm bảo chỉ gửi uuid_machine và các trường cần thiết lên parent component
      onMachineAdd({
        // KHÔNG GỬI id_machine
        uuid_machine: scanResult.machine.uuid_machine,
        code_machine: scanResult.machine.code_machine,
        type_machine: scanResult.machine.type_machine,
        model_machine: scanResult.machine.model_machine,
        serial_machine: scanResult.machine.serial_machine,
        name_location: scanResult.machine.name_location,
        current_status: scanResult.machine.current_status,
        note: "", // Luôn thêm trường note để tương thích với TicketManagementPage
      });
      // Reset state sau khi thêm
      setScanResult(null);
      resumeScanning();
    }
  };

  // --- LOGIC HIỂN THỊ ---
  const isAddButtonDisabled =
    !scanResult.machine ||
    scanResult.loading ||
    scanResult.error ||
    selectedMachines.some(
      (m) => m.uuid_machine === scanResult.machine?.uuid_machine
    );

  const cameraStatusText = logic.isInitializing
    ? "Đang khởi động camera..."
    : logic.error
    ? "Camera bị lỗi"
    : logic.isScanningActive
    ? "Đang chờ quét mã..."
    : "Camera đã dừng hoặc chưa được khởi động.";

  // Xác định nút "Quét tiếp" hay "Quét lại"
  const isScannerBlocked = scanResult.scannedSerial && !logic.isScanningActive;

  const isResumeDisabled = logic.isInitializing || scanResult.loading;

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { borderRadius: "20px" } }}
    >
      <DialogTitle
        sx={{ background: "#2e7d32", color: "white", fontWeight: 700 }}
      >
        Quét Mã QR Máy Móc
        <IconButton
          onClick={onClose}
          sx={{ color: "white", position: "absolute", right: 8, top: 8 }}
        >
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent
        dividers
        sx={{
          p: 0,
          // THAY ĐỔI: Giới hạn chiều cao tối đa và cho phép cuộn nội dung
          maxHeight: "80vh", // Chiều cao tối đa là 80% viewport height
          overflowY: "hidden", // Bật cuộn dọc
          overflowX: "hidden", // Ẩn cuộn ngang
        }}
      >
        <Box
          sx={{
            position: "relative",
            width: "100%",
            aspectRatio: "16/9",
            bgcolor: "black",
          }}
        >
          <video
            ref={videoRef}
            style={{
              width: "100%",
              height: "100%",
              // Hiển thị video khi đang scan hoặc đang khởi tạo (đang chờ video stream)
              display:
                logic.isScanningActive || logic.isInitializing
                  ? "block"
                  : "none",
            }}
            playsInline
          />
          {/* Vùng hiển thị trạng thái khi không quét/đang khởi tạo */}
          {!logic.isScanningActive && (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                height: "100%",
                color: "white",
                p: 2,
              }}
            >
              {logic.isInitializing && (
                <CircularProgress color="inherit" size={30} sx={{ mb: 1 }} />
              )}
              <Typography variant="body1" textAlign="center">
                {cameraStatusText}
              </Typography>
              {(logic.error || logic.cameras.length === 0) && ( // Hiển thị nút thử lại khi có lỗi camera
                <Button
                  onClick={() => logic.startScanning(logic.selectedCameraId)}
                  variant="contained"
                  color="error"
                  size="small"
                  startIcon={<Refresh />}
                  sx={{ mt: 2, borderRadius: "12px" }}
                >
                  Thử lại camera
                </Button>
              )}
            </Box>
          )}

          {/* Nút chuyển camera (hiển thị khi đang quét và có nhiều camera) */}
          {logic.isScanningActive && logic.cameras.length > 1 && (
            <IconButton
              onClick={logic.switchCamera}
              sx={{
                position: "absolute",
                top: 10,
                right: 10,
                bgcolor: "rgba(0,0,0,0.5)",
                color: "white",
                "&:hover": { bgcolor: "rgba(0,0,0,0.7)" },
              }}
            >
              <Cameraswitch />
            </IconButton>
          )}
        </Box>

        <Box sx={{ p: 2 }}>
          {scanResult.loading && (
            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{ mb: 1 }}
            >
              <CircularProgress size={24} />
              <Typography>Đang xử lý kết quả quét...</Typography>
            </Stack>
          )}

          {/* Hiển thị lỗi từ quá trình quét/API */}
          {scanResult.error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {scanResult.error}
            </Alert>
          )}

          {/* Hiển thị kết quả API */}
          {scanResult.scannedSerial && (
            <Stack spacing={1}>
              <Typography variant="subtitle1" fontWeight="bold">
                Mã quét: {scanResult.scannedSerial}
              </Typography>
              {scanResult.machine && (
                <Alert severity="success">
                  <Typography variant="body2" fontWeight="bold">
                    Máy tìm thấy: {scanResult.machine.code_machine} -{" "}
                    {scanResult.machine.type_machine} -
                    {scanResult.machine.model_machine}
                  </Typography>
                  <Typography variant="caption" component="div">
                    Serial: {scanResult.machine.serial_machine} | Vị trí:{" "}
                    {scanResult.machine.name_location || "Kho"} | Tình trạng:
                    <Chip
                      label={getMachineStatusLabel(
                        scanResult.machine.current_status
                      )}
                      size="small"
                      sx={{
                        ml: 1,
                        height: 20,
                        fontSize: "0.75rem",
                        background: getStatusInfo(
                          scanResult.machine.current_status
                        ).bg,
                        color: getStatusInfo(scanResult.machine.current_status)
                          .color,
                        fontWeight: 600,
                        borderRadius: "8px",
                      }}
                    />
                  </Typography>
                </Alert>
              )}
            </Stack>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2, justifyContent: "space-between" }}>
        <Button
          onClick={resumeScanning}
          variant="outlined"
          disabled={isResumeDisabled}
          color="info"
          sx={{ borderRadius: "12px" }}
        >
          {isScannerBlocked ? "Quét tiếp" : "Quét lại"}
        </Button>
        <Stack direction="row" spacing={1}>
          <Button
            onClick={onClose}
            variant="outlined"
            color="inherit"
            sx={{ borderRadius: "12px" }}
          >
            Hủy
          </Button>
          <Button
            onClick={handleAddScannedMachine}
            variant="contained"
            startIcon={<Add />}
            disabled={isAddButtonDisabled}
            sx={{
              borderRadius: "12px",
              background: "linear-gradient(45deg, #2e7d32, #4caf50)",
            }}
          >
            Thêm vào phiếu
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
};

export default MachineQRScanner;
