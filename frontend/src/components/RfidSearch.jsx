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
  ListItemIcon,
  ListItemText,
  Divider,
  IconButton,
  Snackbar,
  AlertTitle,
  useTheme,
  useMediaQuery,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Chip,
  Fab,
  Badge,
  Tooltip,
} from "@mui/material";
import {
  Search,
  Radar,
  CheckCircle,
  Replay,
  LocationOn,
  Save,
} from "@mui/icons-material";
import { api } from "../api/api";

const RfidSearch = ({
  onClose,
  selectedMachines = [],
  onClearSelection,
  // Khi ở chế độ kiểm kê (inventory) thì không cần gọi API resolve target
  skipResolveApi = false,
  // Danh sách vị trí để chọn khi tìm thấy máy (chế độ kiểm kê)
  inventoryLocations = [],
  // Callback khi user xác nhận thêm máy vào vị trí (chế độ kiểm kê - từng máy)
  onFoundMachineInventory = null,
  // Khi đã chọn sẵn vị trí (batch mode): tích lũy danh sách, user bấm xác nhận mới lưu 1 lần
  preSelectedLocationUuid = null,
  // Callback batch: (targets[], locationUuid) => Promise — lưu toàn bộ 1 lần
  onBatchConfirm = null,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // --- STATE ---
  const [step, setStep] = useState(1); // 1: Nhập mục tiêu, 2: Đang dò
  const [inputTarget, setInputTarget] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState([]);
  // Switch để chọn chế độ: true = chỉ tìm RFID (không dùng API), false = dùng API
  const [useRfidOnly, setUseRfidOnly] = useState(skipResolveApi);

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

  // State cho dialog chọn vị trí khi ở chế độ kiểm kê
  const [openLocationDialog, setOpenLocationDialog] = useState(false);
  // Sync ref để dùng trong interval (tránh stale closure)
  useEffect(() => {
    openLocationDialogRef.current = openLocationDialog;
  }, [openLocationDialog]);
  const [pendingFoundTarget, setPendingFoundTarget] = useState(null);
  const [selectedLocationUuid, setSelectedLocationUuid] = useState("");
  const [savingLocation, setSavingLocation] = useState(false);

  // Batch mode: tích lũy máy tìm thấy, user xác nhận mới lưu 1 lần
  const [batchFoundList, setBatchFoundList] = useState([]); // [{target, locationUuid}]
  const [batchSaving, setBatchSaving] = useState(false);
  const [openBatchConfirmDialog, setOpenBatchConfirmDialog] = useState(false);

  // Refs
  const scanInputRef = useRef(null);
  const audioRef = useRef(null);
  const openLocationDialogRef = useRef(false);

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

  // --- BƯỚC 1: THIẾT LẬP MỤC TIÊU ---
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

      if (useRfidOnly) {
        // --- CHẾ ĐỘ CHỈ TÌM RFID: KHÔNG GỌI API, DÙNG TRỰC TIẾP DANH SÁCH RFID ---
        const localTargets = keywords.map((keyword) => ({
          targetRfid: keyword.toUpperCase(),
          info: {
            serial: keyword,
            name: keyword,
          },
        }));

        if (localTargets.length === 0) {
          setError("Vui lòng nhập ít nhất một RFID để dò tìm.");
          return;
        }

        setTargets(localTargets);
        setStep(2);
      } else {
        // --- CHẾ ĐỘ MẶC ĐỊNH: GỌI API ĐỂ XÁC THỰC THIẾT BỊ ---
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
      }
    } catch (err) {
      console.error("Lỗi xử lý mục tiêu RFID:", err);
      // Giữ lại logic thông báo lỗi cũ khi có response từ server
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else if (!useRfidOnly) {
        setError("Lỗi kết nối server");
      } else {
        setError("Đã xảy ra lỗi khi chuẩn bị danh sách RFID.");
      }

      if (!useRfidOnly && err.response?.data?.errors) {
        setErrors(err.response.data.errors);
        const rfidErrors = err.response.data.errors.filter((er) =>
          er.message.includes("chưa được gán thẻ RFID")
        );
        if (rfidErrors.length > 0) {
          const errorMessages = rfidErrors.map((er) => er.message).join("; ");
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
        // và không có dialog chọn vị trí đang mở
        if (
          scanInputRef.current &&
          document.activeElement !== scanInputRef.current &&
          !openLocationDialogRef.current
        ) {
          scanInputRef.current.focus();
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [step]);

  // Tự động ẩn overlay sau 3.5 giây khi tìm thấy máy (chỉ ở chế độ thông thường)
  useEffect(() => {
    if (currentFoundTarget && !(skipResolveApi && onFoundMachineInventory)) {
      const timer = setTimeout(() => {
        setCurrentFoundTarget(null);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [currentFoundTarget, skipResolveApi, onFoundMachineInventory]);

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
        // Phát âm thanh cảnh báo
        playSound();

        if (skipResolveApi && preSelectedLocationUuid && onBatchConfirm) {
          // Batch mode: tích lũy vào danh sách tạm, chờ user bấm xác nhận
          setFoundTargets((prev) => new Set([...prev, targetRfid]));
          setCurrentFoundTarget(target);
          setBatchFoundList((prev) => {
            const alreadyIn = prev.some(
              (item) => item.target.targetRfid.toUpperCase() === targetRfid
            );
            if (alreadyIn) return prev;
            return [...prev, { target, locationUuid: preSelectedLocationUuid }];
          });
        } else if (skipResolveApi && onFoundMachineInventory) {
          // Chế độ kiểm kê thông thường: hiện dialog chọn vị trí
          setPendingFoundTarget(target);
          setSelectedLocationUuid("");
          setOpenLocationDialog(true);
        } else {
          // Chế độ thông thường: hiện overlay toàn màn hình
          setFoundTargets((prev) => new Set([...prev, targetRfid]));
          setCurrentFoundTarget(target);
        }
      }
    });

    // Tùy chọn: Giới hạn độ dài bộ nhớ đệm.
    if (rawValue.length > 5000) {
      setScanInput(rawValue.slice(-1000)); // Chỉ giữ lại 1000 ký tự cuối
    }
  };

  // Xử lý khi user xác nhận chọn vị trí trong dialog
  const handleConfirmLocation = async () => {
    if (!selectedLocationUuid || !pendingFoundTarget) return;

    setSavingLocation(true);
    try {
      await onFoundMachineInventory(pendingFoundTarget, selectedLocationUuid);
      // Đánh dấu đã tìm thấy sau khi lưu thành công
      setFoundTargets(
        (prev) =>
          new Set([...prev, pendingFoundTarget.targetRfid.toUpperCase()])
      );
      setOpenLocationDialog(false);
      setPendingFoundTarget(null);
      setSelectedLocationUuid("");
      // Xóa bộ đệm scan để tránh match lại RFID cũ khi quét máy tiếp theo
      setScanInput("");
      setTimeout(() => {
        if (scanInputRef.current) {
          scanInputRef.current.value = "";
          scanInputRef.current.focus();
        }
      }, 200);
    } catch (err) {
      console.error("Lỗi lưu máy vào vị trí:", err);
    } finally {
      setSavingLocation(false);
    }
  };

  // Đóng dialog chọn vị trí mà không lưu — máy vẫn ở trạng thái "chưa quét"
  const handleCancelLocationDialog = () => {
    setOpenLocationDialog(false);
    setPendingFoundTarget(null);
    setSelectedLocationUuid("");
    // Xóa bộ đệm scan để tránh match lại RFID cũ khi quét máy tiếp theo
    setScanInput("");
    setTimeout(() => {
      if (scanInputRef.current) {
        scanInputRef.current.value = "";
        scanInputRef.current.focus();
      }
    }, 200);
  };

  const handleReset = () => {
    setStep(1);
    setFoundTargets(new Set());
    setCurrentFoundTarget(null);
    setInputTarget("");
    setScanInput("");
    setError("");
    setErrors([]);
    setBatchFoundList([]);
  };

  // Batch mode: user bấm xác nhận → lưu toàn bộ 1 lần
  const handleBatchConfirm = async () => {
    if (!onBatchConfirm || batchFoundList.length === 0) return;
    setBatchSaving(true);
    try {
      await onBatchConfirm(batchFoundList);
      setBatchFoundList([]);
      setFoundTargets(new Set());
      setCurrentFoundTarget(null);
      setScanInput("");
      setOpenBatchConfirmDialog(false);
    } catch (err) {
      console.error("Lỗi xác nhận batch:", err);
    } finally {
      setBatchSaving(false);
    }
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

      {/* DIALOG CHỌN VỊ TRÍ KHI TÌM THẤY MÁY (CHẾ ĐỘ KIỂM KÊ) */}
      <Dialog
        open={openLocationDialog}
        onClose={handleCancelLocationDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: "20px" } }}
      >
        <DialogTitle
          sx={{
            background: "linear-gradient(45deg, #2e7d32, #43a047)",
            color: "white",
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <CheckCircle sx={{ fontSize: 28 }} />
          <Box>
            <Typography variant="h6" fontWeight={700}>
              Đã tìm thấy thiết bị!
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.85 }}>
              Chọn vị trí để lưu máy này vào phiếu kiểm kê
            </Typography>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ pt: 3 }}>
          {pendingFoundTarget && (
            <Stack spacing={3}>
              {/* Thông tin máy tìm thấy */}
              <Box
                sx={{
                  p: 2,
                  bgcolor: "rgba(46, 125, 50, 0.07)",
                  borderRadius: "12px",
                  border: "1px solid rgba(46, 125, 50, 0.2)",
                }}
              >
                <Typography
                  variant="subtitle2"
                  color="text.secondary"
                  gutterBottom
                >
                  THIẾT BỊ VỪA QUÉT
                </Typography>
                <Typography
                  variant="h6"
                  fontWeight={700}
                  sx={{ color: "#2e7d32" }}
                >
                  {pendingFoundTarget.info.name !==
                  pendingFoundTarget.info.serial
                    ? pendingFoundTarget.info.name
                    : pendingFoundTarget.info.serial}
                </Typography>
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ mt: 1, flexWrap: "wrap", gap: 0.5 }}
                >
                  <Chip
                    label={`Serial: ${pendingFoundTarget.info.serial}`}
                    size="small"
                    variant="outlined"
                    color="success"
                  />
                  <Chip
                    label={`RFID: ${pendingFoundTarget.targetRfid}`}
                    size="small"
                    variant="outlined"
                    sx={{ fontFamily: "monospace" }}
                  />
                </Stack>
              </Box>

              {/* Chọn vị trí */}
              <FormControl fullWidth>
                <InputLabel id="location-select-label">
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <LocationOn sx={{ fontSize: 18 }} />
                    Chọn vị trí lưu máy
                  </Box>
                </InputLabel>
                <Select
                  labelId="location-select-label"
                  value={selectedLocationUuid}
                  onChange={(e) => setSelectedLocationUuid(e.target.value)}
                  label="Chọn vị trí lưu máy"
                  sx={{ borderRadius: "12px" }}
                >
                  {inventoryLocations.length === 0 ? (
                    <MenuItem disabled value="">
                      <Typography color="text.secondary" variant="body2">
                        Không có vị trí nào
                      </Typography>
                    </MenuItem>
                  ) : (
                    inventoryLocations.map((loc) => (
                      <MenuItem
                        key={loc.uuid_location || loc.id_location}
                        value={loc.uuid_location}
                      >
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            {loc.name_location}
                          </Typography>
                          {loc._dept_name && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {loc._dept_name}
                            </Typography>
                          )}
                        </Box>
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>

              {/* Tiến độ tìm thấy */}
              <Box
                sx={{
                  p: 1.5,
                  bgcolor: "rgba(0,0,0,0.04)",
                  borderRadius: "10px",
                  textAlign: "center",
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  Đã tìm thấy:{" "}
                  <strong>
                    {foundTargets.size + 1} / {targets.length} máy
                  </strong>
                </Typography>
              </Box>
            </Stack>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button
            onClick={handleCancelLocationDialog}
            variant="outlined"
            color="inherit"
            sx={{ borderRadius: "10px" }}
            disabled={savingLocation}
          >
            Bỏ qua
          </Button>
          <Button
            onClick={handleConfirmLocation}
            variant="contained"
            disabled={!selectedLocationUuid || savingLocation}
            startIcon={
              savingLocation ? (
                <CircularProgress size={18} color="inherit" />
              ) : (
                <CheckCircle />
              )
            }
            sx={{
              borderRadius: "10px",
              background: "linear-gradient(45deg, #2e7d32, #43a047)",
              px: 3,
            }}
          >
            {savingLocation ? "Đang lưu..." : "Xác nhận lưu"}
          </Button>
        </DialogActions>
      </Dialog>

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
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      p: 1.5,
                      bgcolor: "rgba(0, 0, 0, 0.02)",
                      borderRadius: "12px",
                      border: "1px solid rgba(0, 0, 0, 0.08)",
                    }}
                  >
                    <Box>
                      <Typography variant="body2" fontWeight={600} gutterBottom>
                        Chế độ quét
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {useRfidOnly
                          ? "Chỉ quét RFID"
                          : "Chỉ quét thiết bị trong hệ thống"}
                      </Typography>
                    </Box>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={useRfidOnly}
                          onChange={(e) => setUseRfidOnly(e.target.checked)}
                          color="primary"
                        />
                      }
                    />
                  </Box>
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

            {/* BATCH MODE: FAB xác nhận lưu */}
            {preSelectedLocationUuid && onBatchConfirm && (
              <>
                <Tooltip
                  title={
                    batchFoundList.length === 0
                      ? "Chưa quét được máy nào"
                      : `Xác nhận lưu ${batchFoundList.length} máy`
                  }
                  placement="left"
                >
                  <Fab
                    color="success"
                    size="large"
                    onClick={() => setOpenBatchConfirmDialog(true)}
                    disabled={batchFoundList.length === 0}
                    sx={{
                      position: "fixed",
                      bottom: 24,
                      right: 24,
                      zIndex: 1000,
                      boxShadow: "0 6px 24px rgba(46,125,50,0.45)",
                      "&:not(:disabled)": {
                        animation: "fabPulse 2s ease-in-out infinite",
                      },
                    }}
                  >
                    <Badge
                      badgeContent={batchFoundList.length}
                      color="error"
                      sx={{
                        "& .MuiBadge-badge": {
                          fontSize: "0.75rem",
                          fontWeight: "bold",
                          minWidth: "24px",
                          height: "24px",
                        },
                      }}
                    >
                      <Save />
                    </Badge>
                  </Fab>
                </Tooltip>

                {/* Dialog xác nhận lưu batch */}
                <Dialog
                  open={openBatchConfirmDialog}
                  onClose={() =>
                    !batchSaving && setOpenBatchConfirmDialog(false)
                  }
                  maxWidth="sm"
                  fullWidth
                  PaperProps={{ sx: { borderRadius: "20px" } }}
                >
                  <DialogTitle
                    sx={{
                      background: "linear-gradient(45deg, #2e7d32, #4caf50)",
                      color: "white",
                      fontWeight: 700,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Box>
                      <Typography variant="h6" fontWeight={700}>
                        Xác nhận lưu
                      </Typography>
                      <Typography variant="caption" sx={{ opacity: 0.9 }}>
                        Phát hiện {batchFoundList.length} máy
                      </Typography>
                    </Box>
                    <Chip
                      label={`${batchFoundList.length} máy`}
                      sx={{
                        bgcolor: "rgba(255,255,255,0.25)",
                        color: "white",
                        fontWeight: 700,
                        fontSize: "0.95rem",
                      }}
                    />
                  </DialogTitle>
                  <DialogContent sx={{ p: 0 }}>
                    <List dense sx={{ maxHeight: 360, overflowY: "auto" }}>
                      {batchFoundList.map((item, idx) => (
                        <ListItem
                          key={idx}
                          sx={{
                            py: 1,
                            px: 2.5,
                            borderBottom: "1px solid rgba(0,0,0,0.06)",
                            "&:last-child": { borderBottom: "none" },
                          }}
                        >
                          <ListItemIcon sx={{ minWidth: 36 }}>
                            <CheckCircle
                              sx={{ color: "#2e7d32", fontSize: 20 }}
                            />
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <Typography variant="body2" fontWeight={600}>
                                {item.target.info?.code ||
                                  item.target.info?.serial ||
                                  item.target.targetRfid}
                              </Typography>
                            }
                            secondary={
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {[
                                  item.target.info?.type,
                                  item.target.info?.model,
                                ]
                                  .filter(Boolean)
                                  .join(" ")}{" "}
                                {[
                                  item.target.info?.type,
                                  item.target.info?.model,
                                ].some(Boolean) && "·"}{" "}
                                RFID: {item.target.targetRfid}
                              </Typography>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  </DialogContent>
                  <DialogActions sx={{ p: 2.5, gap: 1 }}>
                    <Button
                      variant="outlined"
                      color="inherit"
                      onClick={() => setOpenBatchConfirmDialog(false)}
                      disabled={batchSaving}
                      sx={{ borderRadius: "10px", px: 3 }}
                    >
                      Quét thêm
                    </Button>
                    <Button
                      variant="contained"
                      color="success"
                      onClick={handleBatchConfirm}
                      disabled={batchSaving}
                      startIcon={
                        batchSaving ? (
                          <CircularProgress size={18} color="inherit" />
                        ) : (
                          <Save />
                        )
                      }
                      sx={{
                        borderRadius: "10px",
                        px: 3,
                        fontWeight: 700,
                        background: "linear-gradient(45deg, #2e7d32, #4caf50)",
                      }}
                    >
                      {batchSaving
                        ? "Đang lưu..."
                        : `Lưu ${batchFoundList.length} máy`}
                    </Button>
                  </DialogActions>
                </Dialog>
              </>
            )}

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
        @keyframes fabPulse {
          0% { box-shadow: 0 6px 24px rgba(46,125,50,0.45); }
          50% { box-shadow: 0 6px 32px rgba(46,125,50,0.75), 0 0 0 8px rgba(76,175,80,0.15); }
          100% { box-shadow: 0 6px 24px rgba(46,125,50,0.45); }
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
          onClick={handleCloseSnackbar}
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
