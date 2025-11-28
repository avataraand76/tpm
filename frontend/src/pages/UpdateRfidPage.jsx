// frontend/src/pages/UpdateRfidPage.jsx

import React, { useState, useRef, useEffect } from "react";
import {
  Container,
  Typography,
  Paper,
  Box,
  Button,
  Stack,
  CircularProgress,
  Alert,
  AlertTitle,
  Snackbar,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  useTheme,
  useMediaQuery,
  Divider,
  Avatar,
} from "@mui/material";
import NavigationBar from "../components/NavigationBar";
import {
  Clear,
  FactCheck,
  UploadFile,
  Autorenew,
  CheckCircleOutline,
  ErrorOutline,
  Save,
} from "@mui/icons-material";
import { api } from "../api/api.jsx"; // Import API client

// Helper: Định dạng kiểu chữ cho ô textarea
const textareaStyle = {
  style: {
    lineHeight: 1.5,
    textTransform: "uppercase",
  },
};

// Component LinedTextarea (Không thay đổi)
const LinedTextarea = ({ value, onChange, rows = 10, placeholder = "" }) => {
  const theme = useTheme();
  const [lineNumbers, setLineNumbers] = useState("1");
  const lineRef = useRef(null);
  const textRef = useRef(null);

  const lineHeight = "1.6rem"; // Chiều cao cố định của 1 dòng
  const paddingY = "10px"; // Padding trên/dưới

  // Hàm cập nhật số dòng
  const updateLineNumbers = (text) => {
    // Đếm số lần xuống dòng + 1
    const lineCount = (text.match(/\n/g) || []).length + 1;
    const numbers = Array.from({ length: lineCount }, (_, i) => i + 1).join(
      "\n"
    );
    setLineNumbers(numbers);
  };

  // Đồng bộ số dòng khi giá trị thay đổi (ví dụ: khi nhấn nút Xóa)
  useEffect(() => {
    updateLineNumbers(value);
  }, [value]);

  // Xử lý khi gõ chữ
  const handleTextChange = (e) => {
    onChange(e); // Gửi sự kiện lên component cha
    updateLineNumbers(e.target.value);
  };

  // Xử lý đồng bộ cuộn (scroll)
  const handleScroll = (e) => {
    const { scrollTop } = e.target;
    // Nếu cuộn ô chính -> cuộn ô số dòng
    if (e.target === textRef.current && lineRef.current) {
      lineRef.current.scrollTop = scrollTop;
    }
    // Nếu cuộn ô số dòng -> cuộn ô chính
    else if (e.target === lineRef.current && textRef.current) {
      textRef.current.scrollTop = scrollTop;
    }
  };

  // Style chung cho cả 2 ô textarea
  const commonTextareaStyle = {
    ...textareaStyle.style, // Áp dụng style gốc (viết hoa, v.v.)
    border: "none",
    outline: "none",
    backgroundColor: "transparent",
    padding: paddingY,
    lineHeight: lineHeight, // Dùng line-height cố định
    fontSize: "1rem",
    boxSizing: "border-box",
    // Tính toán chiều cao: (số dòng * chiều cao dòng) + (padding * 2)
    height: `calc(${rows} * ${lineHeight} + 2 * ${paddingY})`,
    resize: "none",
  };

  return (
    <Box
      sx={{
        display: "flex",
        border: "1px solid",
        borderColor: "rgba(0, 0, 0, 0.23)",
        borderRadius: "12px", // Giữ bo góc
        overflow: "hidden", // Ẩn các phần thừa
        // Style khi hover
        "&:hover": {
          borderColor: "rgba(0, 0, 0, 0.87)",
        },
        // Style khi focus
        "&:focus-within": {
          borderColor: theme.palette.primary.main,
          borderWidth: "2px",
          padding: 0, // Ngăn layout bị giật
        },
      }}
    >
      {/* Ô hiển thị số dòng (bên trái) */}
      <textarea
        ref={lineRef}
        readOnly
        value={lineNumbers}
        onScroll={handleScroll} // Bắt sự kiện cuộn
        style={{
          ...commonTextareaStyle,
          width: "45px", // Độ rộng cho số dòng
          textAlign: "right",
          color: theme.palette.text.secondary,
          backgroundColor: "#f5f5f5", // Nền xám
          paddingRight: "5px",
          overflowY: "hidden", // Ẩn thanh cuộn của ô này
        }}
      />
      {/* Ô nhập liệu chính (bên phải) */}
      <textarea
        ref={textRef}
        value={value}
        onChange={handleTextChange} // Bắt sự kiện gõ
        onScroll={handleScroll} // Bắt sự kiện cuộn
        placeholder={placeholder}
        style={{
          ...commonTextareaStyle,
          flex: 1, // Chiếm hết phần còn lại
          paddingLeft: "10px",
          overflowY: "auto", // Chỉ thanh cuộn này được hiển thị
        }}
      />
    </Box>
  );
};

const UpdateRfidPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Dãy Serial (Input)
  const [serialInput, setSerialInput] = useState("");
  // Dãy RFID (Input)
  const [rfidInput, setRfidInput] = useState("");

  // State cho bảng kết quả (Bao gồm cả Cột RFID Mới)
  // { serial, name, currentRfid, newRfid, notFound }
  const [processedData, setProcessedData] = useState([]);
  const [filterStatus, setFilterStatus] = useState("all");
  const filteredData = processedData.filter((row) => {
    if (filterStatus === "all") return true;
    if (filterStatus === "duplicate") return row.isDuplicateSerial;
    if (filterStatus === "notFound") return row.notFound;
    if (row.notFound) return false;
    if (filterStatus === "diff") return row.newRfid !== row.currentRfid;
    if (filterStatus === "same") return row.newRfid === row.currentRfid;

    return true;
  });

  // State
  const [loadingCheck, setLoadingCheck] = useState(false);
  const [loadingUpdate, setLoadingUpdate] = useState(false);
  const [notification, setNotification] = useState({
    open: false,
    severity: "success",
    title: "",
    message: "",
  });

  const tableContainerRef = useRef(null);

  // Hàm xử lý prefix (MAY-, PHUKIEN-)
  const cleanSerial = (s) => {
    const upper = s.trim().toUpperCase();
    if (upper.startsWith("MAY-") || upper.startsWith("PHUKIEN-")) {
      return upper.split("-").slice(1).join("-");
    }
    return upper;
  };

  // Hàm làm sạch RFID
  const cleanRfid = (s) => {
    return s.trim().toUpperCase();
  };

  // Hàm hiển thị thông báo
  const showNotification = (severity, title, message) => {
    setNotification({
      open: true,
      severity,
      title,
      message,
    });
  };

  // Bước 1: Ghép cặp & Kiểm tra
  const handlePairAndCheck = async () => {
    if (!serialInput) {
      showNotification("warning", "Thiếu Serial", "Vui lòng nhập Serial.");
      return;
    }
    if (!rfidInput) {
      showNotification("warning", "Thiếu RFID", "Vui lòng nhập RFID mới.");
      return;
    }

    setLoadingCheck(true);
    setProcessedData([]);

    // 1. Tách Serial
    const serialsToProcess = serialInput
      .split("\n")
      .map(cleanSerial)
      .filter(Boolean);

    // Tách RFID
    const rfidsToProcess = rfidInput.split("\n").map(cleanRfid).filter(Boolean);

    if (serialsToProcess.length === 0) {
      setLoadingCheck(false);
      return;
    }

    // Kiểm tra khớp số lượng
    if (serialsToProcess.length !== rfidsToProcess.length) {
      setLoadingCheck(false);
      showNotification(
        "error",
        "Lỗi số lượng",
        `Số lượng Serial (${serialsToProcess.length}) không khớp với số lượng RFID mới (${rfidsToProcess.length}). Vui lòng kiểm tra lại.`
      );
      return;
    }

    const serialCounts = serialsToProcess.reduce((acc, curr) => {
      acc[curr] = (acc[curr] || 0) + 1;
      return acc;
    }, {});

    try {
      // 2. Gọi API kiểm tra (Chỉ gửi danh sách unique lên server để tối ưu)
      const uniqueSerials = [...new Set(serialsToProcess)];
      const result = await api.machines.batchCheckSerials({
        serials: uniqueSerials,
      });

      if (!result.success) {
        throw new Error(result.message);
      }

      // 3. Tạo Map để tra cứu
      const machineMap = new Map(result.data.map((m) => [m.serial_machine, m]));

      // 4. Xử lý kết quả trả về theo đúng thứ tự đã nhập
      const dataForTable = [];

      // Lặp theo mảng Serial và ghép cặp với RFID
      for (let i = 0; i < serialsToProcess.length; i++) {
        const serial = serialsToProcess[i];
        const newRfid = rfidsToProcess[i];
        const machine = machineMap.get(serial);

        // Kiểm tra xem serial này có bị trùng trong danh sách nhập vào không
        const isDuplicate = serialCounts[serial] > 1;

        if (machine) {
          // Tìm thấy
          dataForTable.push({
            serial: machine.serial_machine,
            name: `${machine.type_machine || ""} - ${
              machine.model_machine || ""
            }`,
            currentRfid: machine.RFID_machine || "(Chưa có)",
            newRfid: newRfid,
            notFound: false,
            isDuplicateSerial: isDuplicate,
          });
        } else {
          dataForTable.push({
            serial: serial,
            name: "(Serial không tìm thấy)",
            currentRfid: "(Serial không tìm thấy)",
            newRfid: newRfid,
            notFound: true,
            isDuplicateSerial: isDuplicate,
          });
        }
      }

      // 5. Cập nhật state
      setProcessedData(dataForTable);

      // Thông báo: Nếu có trùng lặp thì cảnh báo nhẹ
      const hasDuplicates = dataForTable.some((d) => d.isDuplicateSerial);
      if (hasDuplicates) {
        showNotification(
          "warning",
          "Kiểm tra hoàn tất (Có trùng lặp)",
          `Đã xử lý ${serialsToProcess.length} dòng. Phát hiện Serial trùng lặp (màu cam).`
        );
      } else {
        showNotification(
          "success",
          "Ghép cặp & Kiểm tra hoàn tất",
          `Đã xử lý ${serialsToProcess.length} cặp Serial-RFID.`
        );
      }

      setTimeout(() => {
        tableContainerRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (err) {
      console.error("Error checking serials:", err);
      showNotification(
        "error",
        "Lỗi kiểm tra",
        err.response?.data?.message || err.message
      );
    } finally {
      setLoadingCheck(false);
    }
  };

  // Bước 2: Nhấn nút cập nhật
  const handleUpdateRfids = async () => {
    if (processedData.length === 0) {
      showNotification(
        "error",
        "Lỗi",
        "Vui lòng nhấn 'Ghép cặp & Kiểm tra' trước."
      );
      return;
    }

    setLoadingUpdate(true);

    // 1. Tạo payload từ state 'processedData'
    const updates = processedData
      .filter(
        (row) =>
          !row.notFound && // Phải tìm thấy
          row.newRfid && // Phải có RFID mới
          row.newRfid.trim() !== "" // Không được rỗng
      )
      .map((row) => ({
        serial: row.serial,
        rfid: row.newRfid.trim(),
      }));

    if (updates.length === 0) {
      setLoadingUpdate(false);
      showNotification(
        "warning",
        "Không có gì cập nhật",
        "Không tìm thấy máy hợp lệ hoặc RFID mới bị bỏ trống."
      );
      return;
    }

    try {
      // 2. Gọi API cập nhật hàng loạt (API mới)
      const result = await api.machines.batchUpdateRfid({ updates });

      if (result.success) {
        showNotification(
          "success",
          "Thành công!",
          `Đã cập nhật RFID cho ${result.data.successCount} máy.`
        );
        // Xóa tất cả để làm mới
        handleClear();
      } else {
        // Lỗi từ backend (ví dụ: trùng RFID)
        const errorMessages = result.data.errors.join(" \n ");
        showNotification(
          "error",
          "Cập nhật thất bại",
          `${result.message} \n ${errorMessages}`
        );
      }
    } catch (err) {
      console.error("Error updating RFIDs:", err);
      // Lỗi catch (ví dụ: lỗi transaction)
      const errorMessages = err.response?.data?.data?.errors.join(" \n ") || "";
      showNotification(
        "error",
        "Lỗi nghiêm trọng",
        `${err.response?.data?.message || err.message} \n ${errorMessages}`
      );
    } finally {
      setLoadingUpdate(false);
    }
  };

  // Hàm xóa (reset) form
  const handleClear = () => {
    setSerialInput("");
    setRfidInput("");
    setProcessedData([]);
  };

  const stats = processedData.reduce(
    (acc, row) => {
      // 1. Đếm Serial bị trùng (Đếm tổng số dòng bị đánh dấu trùng)
      if (row.isDuplicateSerial) {
        acc.duplicateCount++;
      }

      // 2. Đếm Serial không tìm thấy
      if (row.notFound) {
        acc.notFoundCount++;
      }
      // Nếu tìm thấy thì mới so sánh RFID
      else {
        if (row.newRfid === row.currentRfid) {
          // 3. RFID Mới GIỐNG RFID Cũ
          acc.sameRfidCount++;
        } else {
          // 4. RFID Mới KHÁC RFID Cũ (Cần cập nhật)
          acc.diffRfidCount++;
        }
      }
      return acc;
    },
    { diffRfidCount: 0, sameRfidCount: 0, notFoundCount: 0, duplicateCount: 0 }
  );

  return (
    <>
      <NavigationBar />
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Header (Giữ nguyên) */}
        <Box sx={{ mb: 6 }}>
          <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
            <Avatar
              sx={{
                width: 60,
                height: 60,
                background: "linear-gradient(45deg, #667eea, #764ba2)",
              }}
            >
              <UploadFile sx={{ fontSize: 30 }} />
            </Avatar>
            <Box>
              <Typography
                variant={isMobile ? "h4" : "h3"}
                component="h1"
                sx={{
                  fontWeight: 700,
                  background: "linear-gradient(45deg, #667eea, #764ba2)",
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  textTransform: "uppercase",
                }}
              >
                Cập nhật RFID Hàng Loạt
              </Typography>
              <Typography
                variant={isMobile ? "body1" : "h6"}
                color="text.secondary"
              >
                Kiểm tra và gán RFID mới cho máy móc.
              </Typography>
            </Box>
          </Stack>
        </Box>

        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, sm: 4 },
            borderRadius: "20px",
            border: "1px solid rgba(0, 0, 0, 0.05)",
          }}
        >
          <Stack direction="column" spacing={3}>
            {/* HÀNG 1: NHẬP LIỆU VÀ NÚT BẤM */}
            <Grid container spacing={2} alignItems="flex-start">
              {/* CỘT SERIAL INPUT */}
              <Grid size={{ xs: 12, md: 5 }}>
                <Typography variant="h6" gutterBottom>
                  Bước 1: Nhập Dãy Serial
                </Typography>

                <LinedTextarea
                  rows={isMobile ? 10 : 15} // Tăng chiều cao
                  placeholder="Dán Serial (mỗi serial 1 dòng)"
                  value={serialInput}
                  onChange={(e) => setSerialInput(e.target.value)}
                />
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mt: 1, display: "block" }}
                >
                  Hệ thống tự xử lý MAY- hoặc PHUKIEN- và loại bỏ dòng trùng
                  lặp.
                </Typography>
              </Grid>

              {/* CỘT RFID INPUT */}
              <Grid size={{ xs: 12, md: 4 }}>
                <Typography variant="h6" gutterBottom>
                  Bước 2: Nhập Dãy RFID Mới
                </Typography>

                <LinedTextarea
                  rows={isMobile ? 10 : 15} // Tăng chiều cao
                  placeholder="Dán RFID mới (mỗi RFID 1 dòng)"
                  value={rfidInput}
                  onChange={(e) => setRfidInput(e.target.value)}
                />
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mt: 1, display: "block" }}
                >
                  Số dòng phải khớp với Serial.
                </Typography>
              </Grid>

              {/* NÚT KIỂM TRA VÀ XÓA */}
              <Grid size={{ xs: 12, md: 3 }}>
                <Typography
                  variant="h6"
                  gutterBottom
                  sx={{
                    visibility: "hidden", // Giữ khoảng cách
                    display: { xs: "none", md: "block" },
                  }}
                >
                  Hành động
                </Typography>
                <Stack spacing={2} sx={{ height: "100%" }}>
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={handlePairAndCheck}
                    disabled={loadingCheck || loadingUpdate}
                    startIcon={
                      loadingCheck ? (
                        <CircularProgress size={20} color="inherit" />
                      ) : (
                        <FactCheck />
                      )
                    }
                    sx={{
                      borderRadius: "12px",
                      py: 1.5,
                      background: "linear-gradient(45deg, #667eea, #764ba2)",
                      "&:hover": {
                        transform: "translateY(-2px)",
                        boxShadow: "0 8px 25px rgba(102, 126, 234, 0.3)",
                      },
                      transition: "all 0.3s ease",
                    }}
                  >
                    Ghép cặp & Kiểm tra
                  </Button>
                  <Button
                    fullWidth
                    variant="outlined"
                    color="error"
                    onClick={handleClear}
                    startIcon={<Clear />}
                    sx={{ borderRadius: "12px", py: 1.5 }}
                  >
                    Xóa (Làm mới)
                  </Button>
                </Stack>
              </Grid>
            </Grid>

            {/* HÀNG 2: BẢNG KẾT QUẢ VÀ NÚT CẬP NHẬT */}
            {processedData.length > 0 && (
              <>
                <Divider sx={{ my: 2 }} />

                <Typography variant="h6" gutterBottom>
                  Bước 3: Xem lại và Cập nhật
                </Typography>

                <Stack
                  direction={{ xs: "column", md: "row" }}
                  spacing={2}
                  sx={{ mb: 2 }}
                >
                  {/* Thẻ: TẤT CẢ (Để reset bộ lọc) */}
                  <Paper
                    variant="outlined"
                    onClick={() => setFilterStatus("all")}
                    sx={{
                      p: 1.5,
                      flex: 1,
                      cursor: "pointer",
                      borderColor: "grey.500",
                      bgcolor:
                        filterStatus === "all"
                          ? "rgba(0, 0, 0, 0.1)"
                          : "transparent",
                      borderWidth: filterStatus === "all" ? 2 : 1,
                      transition: "all 0.2s",
                    }}
                  >
                    <Typography
                      variant="subtitle2"
                      color="text.secondary"
                      fontWeight="bold"
                    >
                      Tất cả
                    </Typography>
                    <Typography
                      variant="h5"
                      color="text.primary"
                      fontWeight="bold"
                    >
                      {processedData.length}
                    </Typography>
                  </Paper>

                  {/* Thẻ: Cần cập nhật */}
                  <Paper
                    variant="outlined"
                    onClick={() => setFilterStatus("diff")}
                    sx={{
                      p: 1.5,
                      flex: 1,
                      cursor: "pointer",
                      borderColor: "primary.main",
                      bgcolor:
                        filterStatus === "diff"
                          ? "rgba(25, 118, 210, 0.15)"
                          : "rgba(25, 118, 210, 0.04)",
                      borderWidth: filterStatus === "diff" ? 2 : 1,
                      transition: "all 0.2s",
                    }}
                  >
                    <Typography
                      variant="subtitle2"
                      color="primary.main"
                      fontWeight="bold"
                    >
                      RFID cần cập nhật
                    </Typography>
                    <Typography
                      variant="h5"
                      color="primary.main"
                      fontWeight="bold"
                    >
                      {stats.diffRfidCount}
                    </Typography>
                  </Paper>

                  {/* Thẻ: Giống nhau */}
                  <Paper
                    variant="outlined"
                    onClick={() => setFilterStatus("same")}
                    sx={{
                      p: 1.5,
                      flex: 1,
                      cursor: "pointer",
                      borderColor: "success.main",
                      bgcolor:
                        filterStatus === "same"
                          ? "rgba(46, 125, 50, 0.15)"
                          : "rgba(46, 125, 50, 0.04)",
                      borderWidth: filterStatus === "same" ? 2 : 1,
                      transition: "all 0.2s",
                    }}
                  >
                    <Typography
                      variant="subtitle2"
                      color="success.main"
                      fontWeight="bold"
                    >
                      RFID trùng khớp
                    </Typography>
                    <Typography
                      variant="h5"
                      color="success.main"
                      fontWeight="bold"
                    >
                      {stats.sameRfidCount}
                    </Typography>
                  </Paper>

                  {/* Thẻ: Không tìm thấy */}
                  <Paper
                    variant="outlined"
                    onClick={() => setFilterStatus("notFound")}
                    sx={{
                      p: 1.5,
                      flex: 1,
                      cursor: "pointer",
                      borderColor: "error.main",
                      bgcolor:
                        filterStatus === "notFound"
                          ? "rgba(211, 47, 47, 0.15)"
                          : "rgba(211, 47, 47, 0.04)",
                      borderWidth: filterStatus === "notFound" ? 2 : 1,
                      transition: "all 0.2s",
                    }}
                  >
                    <Typography
                      variant="subtitle2"
                      color="error.main"
                      fontWeight="bold"
                    >
                      Không tìm thấy Serial
                    </Typography>
                    <Typography
                      variant="h5"
                      color="error.main"
                      fontWeight="bold"
                    >
                      {stats.notFoundCount}
                    </Typography>
                  </Paper>

                  {/* Thẻ: Serial Trùng */}
                  <Paper
                    variant="outlined"
                    onClick={() => setFilterStatus("duplicate")}
                    sx={{
                      p: 1.5,
                      flex: 1,
                      cursor: "pointer",
                      borderColor: "warning.main",
                      bgcolor:
                        filterStatus === "duplicate"
                          ? "rgba(237, 108, 2, 0.15)"
                          : "rgba(237, 108, 2, 0.04)",
                      borderWidth: filterStatus === "duplicate" ? 2 : 1,
                      transition: "all 0.2s",
                    }}
                  >
                    <Typography
                      variant="subtitle2"
                      color="warning.main"
                      fontWeight="bold"
                    >
                      Serial bị trùng
                    </Typography>
                    <Typography
                      variant="h5"
                      color="warning.main"
                      fontWeight="bold"
                    >
                      {stats.duplicateCount}
                    </Typography>
                  </Paper>
                </Stack>

                <TableContainer
                  component={Paper}
                  elevation={0}
                  variant="outlined"
                  sx={{ borderRadius: "12px", maxHeight: "60vh" }}
                  ref={tableContainerRef}
                >
                  <Table stickyHeader>
                    <TableHead>
                      <TableRow
                        sx={{ backgroundColor: "rgba(102, 126, 234, 0.05)" }}
                      >
                        <TableCell
                          sx={{
                            fontWeight: 600,
                            fontSize: "0.95rem",
                            padding: "10px",
                          }}
                        >
                          STT
                        </TableCell>
                        <TableCell
                          sx={{
                            fontWeight: 600,
                            fontSize: "0.95rem",
                            padding: "10px",
                          }}
                        >
                          Serial
                        </TableCell>
                        <TableCell
                          sx={{
                            fontWeight: 600,
                            fontSize: "0.95rem",
                            padding: "10px",
                          }}
                        >
                          Tên máy
                        </TableCell>
                        <TableCell
                          sx={{
                            fontWeight: 600,
                            fontSize: "0.95rem",
                            padding: "10px",
                          }}
                        >
                          RFID Cũ
                        </TableCell>
                        <TableCell
                          sx={{
                            fontWeight: 600,
                            fontSize: "0.95rem",
                            padding: "10px",
                            minWidth: 200,
                          }}
                        >
                          RFID Mới
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredData.map((row, index) => {
                        let statusIcon = null;
                        let rfidColor = "text.primary";

                        if (row.notFound) {
                          // Lỗi: Không tìm thấy
                          statusIcon = (
                            <ErrorOutline
                              color="error"
                              sx={{ fontSize: "1.1rem" }}
                            />
                          );
                          rfidColor = "text.secondary";
                        } else if (row.currentRfid === row.newRfid) {
                          // Trùng khớp: Dấu tick
                          statusIcon = (
                            <CheckCircleOutline
                              color="success"
                              sx={{ fontSize: "1.1rem" }}
                            />
                          );
                          rfidColor = "success.main";
                        } else {
                          // Thay đổi: Dấu change
                          statusIcon = (
                            <Autorenew
                              color="primary"
                              sx={{ fontSize: "1.1rem" }}
                            />
                          );
                          rfidColor = "primary.main";
                        }

                        return (
                          <TableRow
                            key={index}
                            sx={{
                              "&:last-child td, &:last-child th": { border: 0 },
                              backgroundColor: row.notFound
                                ? "rgba(255, 0, 0, 0.05)" // Màu đỏ nhạt
                                : "inherit",
                              transition: "all 0.2s ease",
                              "&:hover": {
                                bgcolor: row.notFound
                                  ? "rgba(255, 0, 0, 0.1)"
                                  : "rgba(102, 126, 234, 0.03)",
                              },
                            }}
                          >
                            <TableCell sx={{ padding: "8px 10px" }}>
                              {index + 1}
                            </TableCell>
                            <TableCell
                              sx={{
                                padding: "8px 10px",
                                fontWeight: 600,
                                // Nếu trùng serial thì dùng màu cam, nếu không thì màu mặc định
                                color: row.isDuplicateSerial
                                  ? "warning.main"
                                  : "text.primary",
                              }}
                            >
                              {row.serial}
                              {/* (Tuỳ chọn) Nếu muốn hiện thêm chữ thì bỏ comment dòng dưới */}
                              {row.isDuplicateSerial && " (Trùng)"}
                            </TableCell>
                            <TableCell
                              sx={{
                                padding: "8px 10px",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {row.name}
                            </TableCell>
                            {/* RFID Cũ */}
                            <TableCell
                              sx={{
                                padding: "8px 10px",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {row.currentRfid}
                            </TableCell>
                            {/* RFID Mới (với Icon) */}
                            <TableCell
                              sx={{
                                padding: "8px 10px",
                                whiteSpace: "nowrap",
                              }}
                            >
                              <Stack
                                direction="row"
                                alignItems="center"
                                spacing={0.5}
                              >
                                {statusIcon} {/* Icon được chèn vào đây */}
                                <Typography
                                  variant="body2"
                                  component="span"
                                  sx={{
                                    fontWeight: 600,
                                    color: rfidColor, // Màu chữ theo logic
                                  }}
                                >
                                  {row.newRfid}
                                </Typography>
                              </Stack>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>

                <Stack direction="row" justifyContent="flex-end" sx={{ mt: 2 }}>
                  <Button
                    variant="contained"
                    color="success"
                    onClick={handleUpdateRfids}
                    disabled={loadingCheck || loadingUpdate}
                    startIcon={
                      loadingUpdate ? (
                        <CircularProgress size={20} color="inherit" />
                      ) : (
                        <Save />
                      )
                    }
                    sx={{
                      borderRadius: "12px",
                      py: 1.5,
                      px: 5,
                      background: "linear-gradient(45deg, #2e7d32, #4caf50)",
                      "&:hover": {
                        transform: "translateY(-2px)",
                        boxShadow: "0 8px 25px rgba(46, 125, 50, 0.3)",
                      },
                      transition: "all 0.3s ease",
                    }}
                  >
                    Xác nhận Cập nhật RFID
                  </Button>
                </Stack>
              </>
            )}
          </Stack>
        </Paper>
      </Container>

      {/* Notification Snackbar (Giữ nguyên) */}
      <Snackbar
        open={notification.open}
        autoHideDuration={5000}
        onClose={() => setNotification({ ...notification, open: false })}
        anchorOrigin={
          isMobile
            ? { vertical: "bottom", horizontal: "center" }
            : { vertical: "top", horizontal: "right" }
        }
      >
        <Alert
          onClose={() => setNotification({ ...notification, open: false })}
          severity={notification.severity}
          variant="filled"
          sx={{
            width: "100%",
            minWidth: { xs: "auto", sm: "350px" },
            boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
            borderRadius: "12px",
            ".MuiAlert-message": {
              whiteSpace: "pre-wrap",
            },
          }}
        >
          <AlertTitle sx={{ fontWeight: "bold", fontSize: "1.1rem" }}>
            {notification.title}
          </AlertTitle>
          {notification.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default UpdateRfidPage;
