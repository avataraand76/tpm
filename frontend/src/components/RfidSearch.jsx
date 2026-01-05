// frontend/src/components/RfidSearch.jsx

import React, { useState, useRef, useEffect } from "react";
import {
  Typography,
  Box,
  TextField,
  Button,
  Stack,
  CircularProgress,
  Card,
  CardContent,
  Alert,
  List,
  ListItem,
  ListItemText,
  Divider,
  IconButton,
  Snackbar,
  AlertTitle,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { Search, Radar, CheckCircle, Replay } from "@mui/icons-material";
import { api } from "../api/api";

const RfidSearch = ({ onClose, selectedMachines = [], onClearSelection }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // --- STATE ---
  const [step, setStep] = useState(1); // 1: Nhập mục tiêu, 2: Đang dò
  const [inputTarget, setInputTarget] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState([]);

  // State cho Snackbar
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarTitle, setSnackbarTitle] = useState("");

  // Dữ liệu mục tiêu đã được server xác nhận (mảng)
  const [targets, setTargets] = useState([]);

  // State xử lý quét
  const [scanInput, setScanInput] = useState("");
  const [foundTargets, setFoundTargets] = useState(new Set()); // Set các RFID đã tìm thấy
  const [currentFoundTarget, setCurrentFoundTarget] = useState(null); // Target vừa tìm thấy để hiển thị overlay

  // Refs
  const scanInputRef = useRef(null);
  const audioRef = useRef(null);

  // Hàm lấy giá trị ưu tiên từ máy (serial -> rfid -> nfc -> code)
  const getMachineSearchValue = (machine) => {
    if (machine.serial_machine && machine.serial_machine.trim() !== "") {
      return machine.serial_machine.trim();
    }
    if (machine.RFID_machine && machine.RFID_machine.trim() !== "") {
      return machine.RFID_machine.trim();
    }
    if (machine.NFC_machine && machine.NFC_machine.trim() !== "") {
      return machine.NFC_machine.trim();
    }
    if (machine.code_machine && machine.code_machine.trim() !== "") {
      return machine.code_machine.trim();
    }
    return null;
  };

  // Tự động điền inputTarget khi có selectedMachines
  useEffect(() => {
    if (selectedMachines && selectedMachines.length > 0) {
      const values = selectedMachines
        .map((machine) => getMachineSearchValue(machine))
        .filter((value) => value !== null); // Loại bỏ các giá trị null

      if (values.length > 0) {
        setInputTarget(values.join("\n"));
      }
    }
  }, [selectedMachines]);

  // --- AUDIO LOGIC ---
  // Khởi tạo Audio object từ file trong public folder
  useEffect(() => {
    // Tạo Audio object với file từ public folder
    audioRef.current = new Audio("/coibaochay.mp3");
    audioRef.current.preload = "auto"; // Tải sẵn để phát nhanh hơn

    return () => {
      // Cleanup khi component unmount
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Hàm phát âm thanh từ file
  const playSound = () => {
    if (!audioRef.current) return;

    try {
      // Reset về đầu file và phát
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch((err) => {
        console.error("Lỗi phát âm thanh:", err);
      });
    } catch (err) {
      console.error("Lỗi phát âm thanh:", err);
    }
  };

  // --- BƯỚC 1: API LẤY MỤC TIÊU ---
  const handleSetTarget = async (e) => {
    e?.preventDefault();
    if (!inputTarget.trim()) return;

    setLoading(true);
    setError("");
    setErrors([]);
    setTargets([]);
    setFoundTargets(new Set());
    setCurrentFoundTarget(null);

    try {
      // Tách input thành mảng (mỗi dòng là một keyword)
      const keywords = inputTarget
        .split("\n")
        .map((k) => k.trim())
        .filter((k) => k);

      const res = await api.machines.resolveTarget(keywords);
      if (res.success) {
        // res.data có thể là object (backward compatibility) hoặc array
        const targetsArray = Array.isArray(res.data) ? res.data : [res.data];
        // Hoặc dùng res.targets nếu có
        const finalTargets = res.targets || targetsArray;

        if (finalTargets.length === 0) {
          setError("Không có máy nào hợp lệ để dò tìm.");
          return;
        }

        setTargets(finalTargets);
        if (res.errors && res.errors.length > 0) {
          setErrors(res.errors);
          // Hiển thị snackbar cho các lỗi về RFID chưa được gán
          const rfidErrors = res.errors.filter((err) =>
            err.message.includes("chưa được gán thẻ RFID")
          );
          if (rfidErrors.length > 0) {
            const errorMessages = rfidErrors
              .map((err) => err.message)
              .join("; ");
            setSnackbarTitle("Cảnh báo");
            setSnackbarMessage(errorMessages);
            setSnackbarOpen(true);
          }
        }
        setStep(2);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Lỗi kết nối server");
      if (err.response?.data?.errors) {
        setErrors(err.response.data.errors);
        // Hiển thị snackbar cho các lỗi về RFID chưa được gán
        const rfidErrors = err.response.data.errors.filter((err) =>
          err.message.includes("chưa được gán thẻ RFID")
        );
        if (rfidErrors.length > 0) {
          const errorMessages = rfidErrors.map((err) => err.message).join("; ");
          setSnackbarTitle("Cảnh báo");
          setSnackbarMessage(errorMessages);
          setSnackbarOpen(true);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // --- BƯỚC 2: LOGIC QUÉT MỚI (QUAN TRỌNG) ---

  // Tự động focus liên tục vào ô nhập liệu ẩn
  useEffect(() => {
    if (step === 2 && scanInputRef.current) {
      scanInputRef.current.focus();
      const interval = setInterval(() => {
        // Chỉ focus lại nếu người dùng click ra ngoài,
        // để đảm bảo máy quét luôn bắn dữ liệu vào đúng chỗ
        if (
          scanInputRef.current &&
          document.activeElement !== scanInputRef.current
        ) {
          scanInputRef.current.focus();
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [step]);

  // Tự động ẩn overlay sau 0.5 giây khi tìm thấy máy
  useEffect(() => {
    if (currentFoundTarget) {
      const timer = setTimeout(() => {
        setCurrentFoundTarget(null);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [currentFoundTarget]);

  // Hàm xử lý khi dữ liệu từ máy quét đổ vào
  const handleStreamInput = (e) => {
    const rawValue = e.target.value;
    setScanInput(rawValue); // Cập nhật state để debug nếu cần

    // Kiểm tra tất cả các targets chưa tìm thấy
    targets.forEach((target) => {
      const targetRfid = target.targetRfid.toUpperCase();
      const isAlreadyFound = foundTargets.has(targetRfid);

      // Nếu chưa tìm thấy và khớp với dữ liệu quét
      if (!isAlreadyFound && rawValue.toUpperCase().includes(targetRfid)) {
        // Đánh dấu đã tìm thấy
        setFoundTargets((prev) => new Set([...prev, targetRfid]));
        // Set target hiện tại để hiển thị overlay
        setCurrentFoundTarget(target);
        // Phát âm thanh cảnh báo
        playSound();
      }
    });

    // Tùy chọn: Giới hạn độ dài bộ nhớ đệm.
    // Nếu máy quét bắn quá nhiều ký tự (ví dụ > 5000), ta xóa bớt để trình duyệt không bị đơ.
    if (rawValue.length > 5000) {
      setScanInput(rawValue.slice(-1000)); // Chỉ giữ lại 1000 ký tự cuối
    }
  };

  const handleReset = () => {
    setStep(1);
    setFoundTargets(new Set());
    setCurrentFoundTarget(null);
    setInputTarget("");
    setScanInput("");
    setError("");
    setErrors([]);
  };

  // Hàm để người dùng reset trạng thái tìm kiếm (để quét tiếp)
  const handleRescanSameTarget = () => {
    setCurrentFoundTarget(null);
    setScanInput("");
    // Focus lại ngay
    setTimeout(() => scanInputRef.current?.focus(), 100);
  };

  // Hàm xóa nội dung input
  const handleClearInput = () => {
    setInputTarget("");
    setError("");
    setErrors([]);
    // Gọi callback để bỏ chọn các máy trong MachineListPage
    if (onClearSelection) {
      onClearSelection();
    }
  };

  // Handler đóng snackbar
  const handleCloseSnackbar = (event, reason) => {
    if (reason === "clickaway") {
      return;
    }
    setSnackbarOpen(false);
  };

  // Kiểm tra xem còn máy nào chưa tìm thấy không
  const allFound = targets.length > 0 && foundTargets.size === targets.length;

  return (
    <>
      {/* OVERLAY KHI TÌM THẤY */}
      <Box
        sx={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: currentFoundTarget
            ? "rgba(46, 125, 50, 0.95)"
            : "transparent",
          zIndex: currentFoundTarget ? 9999 : -1,
          transition: "background-color 0.1s ease",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          pointerEvents: currentFoundTarget ? "auto" : "none",
        }}
        onClick={handleRescanSameTarget}
      >
        {currentFoundTarget && (
          <Stack
            alignItems="center"
            spacing={2}
            sx={{ animation: "pulse 0.5s infinite", cursor: "pointer" }}
          >
            <CheckCircle sx={{ fontSize: 180, color: "#fff" }} />
            <Typography variant="h1" sx={{ color: "#fff", fontWeight: "900" }}>
              TÌM THẤY!
            </Typography>
            <Typography
              variant="h3"
              sx={{ color: "#fff", textAlign: "center" }}
            >
              {currentFoundTarget.info.serial}
            </Typography>
            <Typography
              variant="h5"
              sx={{ color: "#fff", textAlign: "center" }}
            >
              {currentFoundTarget.info.name}
            </Typography>
            <Typography
              variant="h6"
              sx={{ color: "rgba(255,255,255,0.8)", mt: 2 }}
            >
              Đã tìm thấy: {foundTargets.size} / {targets.length} máy
            </Typography>
            <Typography
              variant="h6"
              sx={{ color: "rgba(255,255,255,0.8)", mt: 2 }}
            >
              (Chạm vào màn hình để quét tiếp)
            </Typography>
          </Stack>
        )}
      </Box>

      <Box sx={{ p: 3 }}>
        {/* BƯỚC 1: SETUP */}
        {step === 1 && (
          <Card
            elevation={0}
            sx={{
              borderRadius: "20px",
              border: "1px solid rgba(0, 0, 0, 0.05)",
            }}
          >
            <CardContent sx={{ p: 3, "&:last-child": { pb: 3 } }}>
              <Typography
                variant="h6"
                gutterBottom
                sx={{ fontWeight: 600, mb: 3 }}
              >
                Bước 1: Nhập thông tin thiết bị cần tìm
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Nhập nhiều máy, mỗi dòng một máy (Serial, Mã máy hoặc NFC)
              </Typography>
              <form onSubmit={handleSetTarget}>
                <Stack spacing={3}>
                  <Box sx={{ position: "relative" }}>
                    <TextField
                      label="Nhập Serial, Mã máy hoặc NFC"
                      fullWidth
                      multiline
                      rows={6}
                      variant="outlined"
                      value={inputTarget}
                      onChange={(e) => setInputTarget(e.target.value)}
                      placeholder="Ví dụ:&#10;SN123456&#10;RACING00001&#10;NFC123"
                      autoFocus
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          borderRadius: "12px",
                        },
                      }}
                    />
                    {inputTarget && (
                      <IconButton
                        onClick={handleClearInput}
                        size="small"
                        sx={{
                          position: "absolute",
                          top: 8,
                          right: 8,
                          zIndex: 1,
                          bgcolor: "background.paper",
                          "&:hover": {
                            bgcolor: "action.hover",
                          },
                        }}
                      >
                        CLEAR
                      </IconButton>
                    )}
                  </Box>
                  {error && (
                    <Alert severity="error" sx={{ borderRadius: "12px" }}>
                      {error}
                    </Alert>
                  )}
                  {errors.length > 0 && (
                    <Alert severity="warning" sx={{ borderRadius: "12px" }}>
                      <Typography
                        variant="subtitle2"
                        fontWeight="bold"
                        gutterBottom
                      >
                        Một số máy không hợp lệ:
                      </Typography>
                      <List dense>
                        {errors.map((err, idx) => (
                          <ListItem key={idx} sx={{ py: 0.5 }}>
                            <ListItemText
                              primary={err.keyword}
                              secondary={err.message}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </Alert>
                  )}
                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    disabled={loading}
                    startIcon={
                      loading ? (
                        <CircularProgress size={20} color="inherit" />
                      ) : (
                        <Search />
                      )
                    }
                    sx={{
                      py: 1.5,
                      borderRadius: "12px",
                      background: "linear-gradient(45deg, #667eea, #764ba2)",
                      "&:hover": {
                        transform: "translateY(-2px)",
                        boxShadow: "0 8px 25px rgba(102, 126, 234, 0.3)",
                      },
                      transition: "all 0.3s ease",
                    }}
                  >
                    {loading ? "Đang kiểm tra..." : "Bắt đầu dò tìm"}
                  </Button>
                </Stack>
              </form>
            </CardContent>
          </Card>
        )}

        {/* BƯỚC 2: QUÉT (SCANNING) */}
        {step === 2 && targets.length > 0 && (
          <Stack spacing={3}>
            {/* Thẻ thông tin mục tiêu */}
            <Card
              elevation={0}
              sx={{
                borderRadius: "20px",
                border: "1px solid rgba(102, 126, 234, 0.3)",
                background:
                  "linear-gradient(135deg, #667eea11 0%, #764ba211 100%)",
              }}
            >
              <CardContent sx={{ p: 3, "&:last-child": { pb: 3 } }}>
                <Typography
                  variant="subtitle2"
                  color="text.secondary"
                  gutterBottom
                >
                  DANH SÁCH MỤC TIÊU ({targets.length} máy)
                </Typography>
                <Typography
                  variant="h6"
                  fontWeight="bold"
                  sx={{
                    background: "linear-gradient(45deg, #667eea, #764ba2)",
                    backgroundClip: "text",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    mb: 2,
                  }}
                >
                  Đã tìm thấy: {foundTargets.size} / {targets.length} máy
                </Typography>
                <Divider sx={{ my: 2 }} />
                <List dense>
                  {targets.map((target, idx) => {
                    const isFound = foundTargets.has(
                      target.targetRfid.toUpperCase()
                    );
                    return (
                      <ListItem
                        key={idx}
                        sx={{
                          bgcolor: isFound
                            ? "rgba(46, 125, 50, 0.1)"
                            : "transparent",
                          borderRadius: "8px",
                          mb: 1,
                          border: isFound
                            ? "1px solid rgba(46, 125, 50, 0.3)"
                            : "1px solid transparent",
                        }}
                      >
                        <ListItemText
                          primary={
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                              }}
                            >
                              <Typography variant="body1" fontWeight={600}>
                                {target.info.name}
                              </Typography>
                              {isFound && (
                                <CheckCircle
                                  sx={{ color: "#2e7d32", fontSize: 20 }}
                                />
                              )}
                            </Box>
                          }
                          secondary={
                            <Stack direction="row" spacing={2} sx={{ mt: 0.5 }}>
                              <Typography variant="body2">
                                Serial: <strong>{target.info.serial}</strong>
                              </Typography>
                              <Typography variant="body2">
                                RFID: <strong>{target.targetRfid}</strong>
                              </Typography>
                            </Stack>
                          }
                        />
                      </ListItem>
                    );
                  })}
                </List>
                {allFound && (
                  <Alert
                    severity="success"
                    sx={{ mt: 2, borderRadius: "12px" }}
                  >
                    <Typography variant="h6" fontWeight="bold">
                      Hoàn thành! Đã tìm thấy tất cả {targets.length} máy.
                    </Typography>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Khu vực nhận tín hiệu */}
            <Card
              elevation={0}
              sx={{
                p: 4,
                textAlign: "center",
                borderRadius: "20px",
                border: "2px dashed",
                borderColor: "rgba(0, 0, 0, 0.15)",
                bgcolor: "background.paper",
                position: "relative",
              }}
            >
              <Radar
                sx={{
                  fontSize: 60,
                  color: "text.secondary",
                  mb: 2,
                  opacity: 0.5,
                }}
              />
              <Typography variant="h5" gutterBottom fontWeight={600}>
                Đang quét tín hiệu...
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Bóp cò máy quét và di chuyển xung quanh.
              </Typography>

              {/* SỬ DỤNG TEXTAREA ĐỂ HỨNG STREAM DỮ LIỆU */}
              <textarea
                ref={scanInputRef}
                value={scanInput}
                onChange={handleStreamInput}
                style={{
                  opacity: 0,
                  position: "absolute",
                  top: "-2000px",
                  width: "1px",
                  height: "1px",
                }}
                autoComplete="off"
                spellCheck="false"
              />

              <Box
                sx={{
                  mt: 3,
                  p: 1.5,
                  border: "1px solid rgba(0, 0, 0, 0.1)",
                  borderRadius: "12px",
                  bgcolor: "#f5f5f5",
                  color: "#2e7d32",
                  fontFamily: "monospace",
                  fontSize: "0.8rem",
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                  textOverflow: "ellipsis",
                  cursor: "pointer",
                  "&:hover": {
                    bgcolor: "#eeeeee",
                  },
                }}
                onClick={() => scanInputRef.current?.focus()}
              >
                {/* Hiển thị một phần nhỏ dữ liệu đang nhận để user biết máy đang chạy */}
                {scanInput.slice(-50) || "[ Sẵn sàng nhận tín hiệu ]"}
              </Box>
            </Card>

            <Stack
              direction="row"
              spacing={2}
              sx={{ justifyContent: "center", flexWrap: "wrap" }}
            >
              <Button
                variant="outlined"
                color="inherit"
                startIcon={<Replay />}
                onClick={handleReset}
                sx={{
                  borderRadius: "12px",
                  px: 3,
                  py: 1.5,
                }}
              >
                Chọn thiết bị khác
              </Button>
              {onClose && (
                <Button
                  variant="outlined"
                  color="error"
                  onClick={onClose}
                  sx={{
                    borderRadius: "12px",
                    px: 3,
                    py: 1.5,
                  }}
                >
                  Đóng
                </Button>
              )}
            </Stack>
          </Stack>
        )}
      </Box>

      <style>{`
        @keyframes pulse {
          0% { transform: scale(0.95); opacity: 0.9; }
          50% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(0.95); opacity: 0.9; }
        }
      `}</style>

      {/* Snackbar thông báo lỗi RFID */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={5000}
        onClose={handleCloseSnackbar}
        anchorOrigin={
          isMobile
            ? { vertical: "bottom", horizontal: "center" }
            : { vertical: "top", horizontal: "right" }
        }
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity="warning"
          variant="filled"
          sx={{
            width: "100%",
            minWidth: { xs: "auto", sm: "350px" },
            boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
            borderRadius: "12px",
          }}
        >
          <AlertTitle sx={{ fontWeight: "bold", fontSize: "1.1rem" }}>
            {snackbarTitle}
          </AlertTitle>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </>
  );
};

export default RfidSearch;
