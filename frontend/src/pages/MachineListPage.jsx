// frontend/src/pages/MachineListPage.jsx

import React, { useState, useEffect } from "react";
import {
  Container,
  Typography,
  Paper,
  Box,
  Grid,
  Card,
  CardContent,
  Chip,
  Button,
  Stack,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  TextField,
  InputAdornment,
  Pagination,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Divider,
} from "@mui/material";
import {
  PrecisionManufacturing,
  Search,
  Refresh,
  CheckCircle,
  Build,
  Cancel,
  Settings,
  Close,
  Save,
  QrCode2,
  Print,
  Download,
} from "@mui/icons-material";
import { QRCodeSVG } from "qrcode.react";
import NavigationBar from "../components/NavigationBar";
import { api } from "../api/api";

const MachineListPage = () => {
  const [machines, setMachines] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    available: 0,
    in_use: 0,
    maintenance: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  });

  // Dialog states
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [editedData, setEditedData] = useState({});

  // QR Code states
  const [showQRCode, setShowQRCode] = useState(false);

  const fetchMachines = async (searchQuery = "") => {
    try {
      setLoading(true);
      setError(null);

      const result = await api.machines.getAll({
        page: page,
        limit: rowsPerPage,
        search: searchQuery,
      });

      if (result.success) {
        setMachines(result.data);
        setPagination(result.pagination);
      } else {
        setError(result.message || "Failed to fetch machines");
      }
    } catch (err) {
      setError("Error connecting to server");
      console.error("Error fetching machines:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const result = await api.machines.getStats();
      if (result.success) {
        setStats(result.data);
      }
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  };

  useEffect(() => {
    fetchMachines(searchTerm);
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, rowsPerPage]);

  useEffect(() => {
    // Debounce search
    const timeoutId = setTimeout(() => {
      setPage(1); // Reset to first page on search
      fetchMachines(searchTerm);
    }, 500);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  const handlePageChange = (event, newPage) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleRowsPerPageChange = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(1); // Reset to first page when changing rows per page
  };

  const handleOpenDialog = async (uuid) => {
    try {
      const result = await api.machines.getById(uuid);
      if (result.success) {
        setSelectedMachine(result.data);
        setEditedData(result.data);
        setOpenDialog(true);
      }
    } catch (err) {
      console.error("Error fetching machine details:", err);
    }
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedMachine(null);
    setEditedData({});
    setShowQRCode(false);
  };

  const handlePrintQRCode = () => {
    // Tạo nội dung HTML chỉ chứa QR code
    const qrCodeElement = document.getElementById("qr-code-svg");
    if (!qrCodeElement) return;

    const printWindow = window.open("", "_blank");
    const qrCodeHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>In mã QR - ${editedData.code_machine}</title>
          <style>
            @page {
              size: A6 landscape;
              margin: 8mm;
            }
            body {
              margin: 0;
              padding: 15px;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              font-family: Arial, sans-serif;
            }
            .qr-container {
              display: flex;
              flex-direction: row;
              align-items: center;
              gap: 15px;
              background: white;
              padding: 15px;
              border: 2px solid #000;
              border-radius: 8px;
              max-width: 100%;
            }
            .qr-code {
              flex-shrink: 0;
            }
            .qr-code svg {
              display: block;
              width: 120px !important;
              height: 120px !important;
            }
            .info {
              flex: 1;
              display: flex;
              flex-direction: column;
              justify-content: center;
              gap: 8px;
            }
            .code {
              font-size: 22px;
              font-weight: bold;
              color: #000;
              line-height: 1.2;
            }
            .serial {
              font-size: 20px;
              color: #000;
              font-weight: 600;
            }
            .name {
              font-size: 12px;
              color: #000;
              line-height: 1.3;
            }
            @media print {
              body {
                padding: 0;
              }
              .qr-container {
                border-color: #000;
                padding: 12px;
              }
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <div class="qr-code">
              ${qrCodeElement.outerHTML}
            </div>
            <div class="info">
              <div class="code">${editedData.code_machine || ""}</div>
              <div class="serial">Serial: ${
                editedData.serial_machine || ""
              }</div>
              <div class="name">${editedData.name_machine || ""}</div>
            </div>
          </div>
          <script>
            // Tự động in khi trang load xong
            window.onload = function() {
              window.print();
              // Đóng cửa sổ sau khi in (hoặc hủy)
              window.onafterprint = function() {
                window.close();
              };
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(qrCodeHTML);
    printWindow.document.close();
  };

  const handleDownloadQRCode = () => {
    // Tạo SVG element từ QR code
    const svg = document.getElementById("qr-code-svg");
    if (!svg) return;

    // Chuyển SVG thành canvas để download
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      // Download canvas as PNG
      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `QR_${editedData.code_machine || "Machine"}_${
        editedData.serial_machine || "Serial"
      }.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src =
      "data:image/svg+xml;base64," +
      btoa(unescape(encodeURIComponent(svgData)));
  };

  const handleInputChange = (field, value) => {
    setEditedData({ ...editedData, [field]: value });
  };

  const handleSave = async () => {
    try {
      const result = await api.machines.update(
        selectedMachine.uuid_machine,
        editedData
      );
      if (result.success) {
        // Refresh the list
        fetchMachines(searchTerm);
        fetchStats();
        // Update selected machine with new data
        setSelectedMachine(result.data);
        setEditedData(result.data);
        alert("Cập nhật thành công!");
      } else {
        alert("Cập nhật thất bại: " + result.message);
      }
    } catch (err) {
      console.error("Error updating machine:", err);
      alert("Lỗi khi cập nhật máy móc");
    }
  };

  const getStatusColor = (status) => {
    const statusColors = {
      available: { bg: "#2e7d3222", color: "#2e7d32", label: "Sẵn sàng" },
      in_use: { bg: "#667eea22", color: "#667eea", label: "Đang sử dụng" },
      maintenance: { bg: "#ff980022", color: "#ff9800", label: "Bảo trì" },
      rented_out: { bg: "#9c27b022", color: "#9c27b0", label: "Cho thuê" },
      borrowed_out: { bg: "#00bcd422", color: "#00bcd4", label: "Cho mượn" },
      scrapped: { bg: "#f4433622", color: "#f44336", label: "Thanh lý" },
    };
    return statusColors[status] || statusColors.available;
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "available":
        return <CheckCircle sx={{ color: "#2e7d32", fontSize: 16 }} />;
      case "in_use":
        return <Build sx={{ fontSize: 16 }} />;
      case "maintenance":
        return <Build sx={{ fontSize: 16 }} />;
      case "scrapped":
        return <Cancel sx={{ fontSize: 16 }} />;
      default:
        return <CheckCircle sx={{ fontSize: 16 }} />;
    }
  };

  const formatCurrency = (value) => {
    if (!value) return "-";
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(value);
  };

  const formatNumberVN = (value) => {
    if (!value && value !== 0) return "";
    return new Intl.NumberFormat("vi-VN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const parseNumberVN = (value) => {
    if (!value) return "";
    // Loại bỏ dấu chấm phân cách hàng nghìn và thay dấu phẩy thành dấu chấm
    const cleanValue = value.replace(/\./g, "").replace(",", ".");
    return cleanValue;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatDateForInput = (dateString) => {
    if (!dateString) return "";
    // Xử lý timezone: lấy chỉ phần date, không convert timezone
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  return (
    <>
      <NavigationBar />
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 6 }}>
          <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
            <Avatar
              sx={{
                width: 60,
                height: 60,
                background: "linear-gradient(45deg, #667eea, #764ba2)",
              }}
            >
              <PrecisionManufacturing sx={{ fontSize: 30 }} />
            </Avatar>
            <Box>
              <Typography
                variant="h3"
                component="h1"
                sx={{
                  fontWeight: 700,
                  background: "linear-gradient(45deg, #667eea, #764ba2)",
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Danh sách Máy móc
              </Typography>
              <Typography variant="h6" color="text.secondary">
                Quản lý thông tin máy móc thiết bị
              </Typography>
            </Box>
          </Stack>
        </Box>

        {/* Statistics Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card
              elevation={0}
              sx={{
                borderRadius: "20px",
                background:
                  "linear-gradient(135deg, #667eea22 0%, #764ba222 100%)",
                border: "1px solid rgba(0, 0, 0, 0.05)",
              }}
            >
              <CardContent sx={{ textAlign: "center", py: 3 }}>
                <Typography variant="h3" fontWeight="bold" color="#667eea">
                  {stats.total}
                </Typography>
                <Typography
                  variant="body1"
                  color="text.secondary"
                  sx={{ mt: 1 }}
                >
                  Tổng số máy
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card
              elevation={0}
              sx={{
                borderRadius: "20px",
                background:
                  "linear-gradient(135deg, #2e7d3222 0%, #4caf5022 100%)",
                border: "1px solid rgba(0, 0, 0, 0.05)",
              }}
            >
              <CardContent sx={{ textAlign: "center", py: 3 }}>
                <Typography variant="h3" fontWeight="bold" color="#2e7d32">
                  {stats.available}
                </Typography>
                <Typography
                  variant="body1"
                  color="text.secondary"
                  sx={{ mt: 1 }}
                >
                  Sẵn sàng
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card
              elevation={0}
              sx={{
                borderRadius: "20px",
                background:
                  "linear-gradient(135deg, #1976d222 0%, #42a5f522 100%)",
                border: "1px solid rgba(0, 0, 0, 0.05)",
              }}
            >
              <CardContent sx={{ textAlign: "center", py: 3 }}>
                <Typography variant="h3" fontWeight="bold" color="#1976d2">
                  {stats.in_use}
                </Typography>
                <Typography
                  variant="body1"
                  color="text.secondary"
                  sx={{ mt: 1 }}
                >
                  Đang sử dụng
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card
              elevation={0}
              sx={{
                borderRadius: "20px",
                background:
                  "linear-gradient(135deg, #ff980022 0%, #ffa72622 100%)",
                border: "1px solid rgba(0, 0, 0, 0.05)",
              }}
            >
              <CardContent sx={{ textAlign: "center", py: 3 }}>
                <Typography variant="h3" fontWeight="bold" color="#ff9800">
                  {stats.maintenance}
                </Typography>
                <Typography
                  variant="body1"
                  color="text.secondary"
                  sx={{ mt: 1 }}
                >
                  Bảo trì
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Search and Actions */}
        <Card
          elevation={0}
          sx={{
            mb: 3,
            borderRadius: "20px",
            border: "1px solid rgba(0, 0, 0, 0.05)",
          }}
        >
          <CardContent sx={{ p: 3 }}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              alignItems="center"
              justifyContent="space-between"
            >
              <Stack direction="row" spacing={2} sx={{ flexGrow: 1 }}>
                <TextField
                  placeholder="Tìm kiếm máy móc..."
                  variant="outlined"
                  size="medium"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  sx={{
                    flexGrow: 1,
                    maxWidth: { xs: "100%", sm: 400 },
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "12px",
                    },
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search />
                      </InputAdornment>
                    ),
                  }}
                />
                <FormControl sx={{ minWidth: 120 }}>
                  <InputLabel>Số dòng</InputLabel>
                  <Select
                    value={rowsPerPage}
                    label="Số dòng"
                    onChange={handleRowsPerPageChange}
                    sx={{
                      borderRadius: "12px",
                    }}
                  >
                    <MenuItem value={10}>10</MenuItem>
                    <MenuItem value={20}>20</MenuItem>
                    <MenuItem value={50}>50</MenuItem>
                    <MenuItem value={100}>100</MenuItem>
                  </Select>
                </FormControl>
              </Stack>
              <Button
                variant="contained"
                startIcon={<Refresh />}
                onClick={() => fetchMachines(searchTerm)}
                sx={{
                  borderRadius: "12px",
                  background: "linear-gradient(45deg, #667eea, #764ba2)",
                  px: 3,
                  py: 1.5,
                  "&:hover": {
                    transform: "translateY(-2px)",
                    boxShadow: "0 8px 25px rgba(102, 126, 234, 0.3)",
                  },
                  transition: "all 0.3s ease",
                }}
              >
                Làm mới
              </Button>
            </Stack>
          </CardContent>
        </Card>

        {/* Machine Table */}
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ borderRadius: "12px" }}>
            {error}
          </Alert>
        ) : (
          <Card
            elevation={0}
            sx={{
              borderRadius: "20px",
              border: "1px solid rgba(0, 0, 0, 0.05)",
            }}
          >
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: "#f8f9fa" }}>
                    <TableCell sx={{ fontWeight: 600, fontSize: "0.95rem" }}>
                      STT
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: "0.95rem" }}>
                      Mã máy
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: "0.95rem" }}>
                      Tên máy
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: "0.95rem" }}>
                      Hãng SX
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: "0.95rem" }}>
                      Serial
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: "0.95rem" }}>
                      RFID
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: "0.95rem" }}>
                      Loại máy
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: "0.95rem" }}>
                      Trạng thái
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: "0.95rem" }}>
                      Giá
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: "0.95rem" }}>
                      Ngày sử dụng
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: "0.95rem" }}>
                      Thao tác
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {machines.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} align="center" sx={{ py: 4 }}>
                        <Typography color="text.secondary">
                          Không tìm thấy máy móc nào
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    machines.map((machine, index) => {
                      const statusInfo = getStatusColor(machine.current_status);
                      return (
                        <TableRow
                          key={machine.id_machine}
                          sx={{
                            "&:hover": {
                              bgcolor: "#f8f9fa",
                            },
                            transition: "all 0.2s ease",
                          }}
                        >
                          <TableCell>
                            {(page - 1) * rowsPerPage + index + 1}
                          </TableCell>
                          <TableCell sx={{ fontWeight: 500 }}>
                            {machine.code_machine || "-"}
                          </TableCell>
                          <TableCell sx={{ fontWeight: 500 }}>
                            {machine.name_machine || "-"}
                          </TableCell>
                          <TableCell>{machine.manufacturer || "-"}</TableCell>
                          <TableCell>{machine.serial_machine || "-"}</TableCell>
                          <TableCell>{machine.RFID_machine || "-"}</TableCell>
                          <TableCell>
                            {machine.name_category ? (
                              <Chip
                                label={machine.name_category}
                                size="small"
                                sx={{
                                  background: "#f0f0f0",
                                  fontWeight: 500,
                                }}
                              />
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell>
                            <Chip
                              icon={getStatusIcon(machine.current_status)}
                              label={statusInfo.label}
                              size="small"
                              sx={{
                                background: statusInfo.bg,
                                color: statusInfo.color,
                                fontWeight: 600,
                                borderRadius: "8px",
                              }}
                            />
                          </TableCell>
                          <TableCell>{formatCurrency(machine.price)}</TableCell>
                          <TableCell>
                            {formatDate(machine.date_of_use)}
                          </TableCell>
                          <TableCell>
                            <IconButton
                              color="primary"
                              size="small"
                              onClick={() =>
                                handleOpenDialog(machine.uuid_machine)
                              }
                              sx={{
                                "&:hover": {
                                  background:
                                    "linear-gradient(45deg, #667eea22, #764ba222)",
                                },
                              }}
                            >
                              <Settings />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Pagination */}
            {!loading && !error && machines.length > 0 && (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  p: 3,
                  borderTop: "1px solid rgba(0, 0, 0, 0.05)",
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  Hiển thị {(page - 1) * rowsPerPage + 1} -{" "}
                  {Math.min(page * rowsPerPage, pagination.total)} trong tổng số{" "}
                  {pagination.total} máy móc
                </Typography>
                <Pagination
                  count={pagination.totalPages}
                  page={page}
                  onChange={handlePageChange}
                  color="primary"
                  size="large"
                  showFirstButton
                  showLastButton
                  sx={{
                    "& .MuiPaginationItem-root": {
                      borderRadius: "8px",
                      fontWeight: 500,
                      "&.Mui-selected": {
                        background: "linear-gradient(45deg, #667eea, #764ba2)",
                        color: "white",
                      },
                    },
                  }}
                />
              </Box>
            )}
          </Card>
        )}

        {/* Detail Dialog */}
        <Dialog
          open={openDialog}
          onClose={handleCloseDialog}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: "20px",
            },
          }}
        >
          <DialogTitle sx={{ pb: 1 }}>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
            >
              <Typography variant="h5" fontWeight="bold">
                Chỉnh sửa máy móc
              </Typography>
              <IconButton onClick={handleCloseDialog} size="small">
                <Close />
              </IconButton>
            </Stack>
          </DialogTitle>
          <Divider />
          <DialogContent sx={{ pt: 3 }}>
            {selectedMachine && (
              <Grid container spacing={3}>
                {/* QR Code Section */}
                {showQRCode && editedData.serial_machine && (
                  <Grid size={{ xs: 12 }}>
                    <Card
                      elevation={0}
                      sx={{
                        borderRadius: "16px",
                        border: "2px solid #667eea",
                        background:
                          "linear-gradient(135deg, #667eea11 0%, #764ba211 100%)",
                      }}
                    >
                      <CardContent>
                        <Stack direction="row" spacing={3} alignItems="center">
                          {/* QR Code Display */}
                          <Box
                            sx={{
                              p: 3,
                              bgcolor: "white",
                              borderRadius: "12px",
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              gap: 2,
                            }}
                          >
                            <QRCodeSVG
                              id="qr-code-svg"
                              value={editedData.serial_machine}
                              size={150}
                              level="H"
                              includeMargin={true}
                            />
                            <Box sx={{ textAlign: "center", display: "none" }}>
                              <Typography variant="h6" fontWeight="bold">
                                {editedData.code_machine}
                              </Typography>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                Serial: {editedData.serial_machine}
                              </Typography>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                {editedData.name_machine}
                              </Typography>
                            </Box>
                          </Box>

                          {/* QR Code Info */}
                          <Box sx={{ flex: 1 }}>
                            <Typography
                              variant="h6"
                              fontWeight="bold"
                              gutterBottom
                            >
                              Mã QR đã được tạo
                            </Typography>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              paragraph
                            >
                              Mã QR được tạo từ Serial Number của máy móc. Bạn
                              có thể in hoặc tải xuống mã QR này để dán lên máy
                              móc.
                            </Typography>
                            <Stack
                              direction="row"
                              spacing={2}
                              sx={{ mt: 2 }}
                              flexWrap="wrap"
                            >
                              <Button
                                variant="contained"
                                startIcon={<Print />}
                                onClick={handlePrintQRCode}
                                sx={{
                                  borderRadius: "12px",
                                  background:
                                    "linear-gradient(45deg, #667eea, #764ba2)",
                                }}
                              >
                                In mã QR
                              </Button>
                              <Button
                                variant="contained"
                                startIcon={<Download />}
                                onClick={handleDownloadQRCode}
                                sx={{
                                  borderRadius: "12px",
                                  background:
                                    "linear-gradient(45deg, #2e7d32, #4caf50)",
                                }}
                              >
                                Tải xuống
                              </Button>
                              <Button
                                variant="outlined"
                                onClick={() => setShowQRCode(false)}
                                sx={{ borderRadius: "12px" }}
                              >
                                Ẩn mã QR
                              </Button>
                            </Stack>
                          </Box>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                )}

                {/* Show QR Code Button */}
                {!showQRCode && editedData.serial_machine && (
                  <Grid size={{ xs: 12 }}>
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<QrCode2 />}
                      onClick={() => setShowQRCode(true)}
                      sx={{
                        borderRadius: "12px",
                        py: 1.5,
                        borderColor: "#667eea",
                        color: "#667eea",
                        "&:hover": {
                          borderColor: "#764ba2",
                          bgcolor: "#667eea11",
                        },
                      }}
                    >
                      Tạo mã QR từ Serial
                    </Button>
                  </Grid>
                )}

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Mã máy"
                    value={editedData.code_machine || ""}
                    onChange={(e) =>
                      handleInputChange("code_machine", e.target.value)
                    }
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Serial"
                    value={editedData.serial_machine || ""}
                    onChange={(e) =>
                      handleInputChange("serial_machine", e.target.value)
                    }
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="RFID"
                    value={editedData.RFID_machine || ""}
                    onChange={(e) =>
                      handleInputChange("RFID_machine", e.target.value)
                    }
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Loại máy"
                    value={editedData.name_category || ""}
                    disabled={true}
                    variant="filled"
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    label="Tên máy"
                    value={editedData.name_machine || ""}
                    onChange={(e) =>
                      handleInputChange("name_machine", e.target.value)
                    }
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Hãng sản xuất"
                    value={editedData.manufacturer || ""}
                    onChange={(e) =>
                      handleInputChange("manufacturer", e.target.value)
                    }
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth>
                    <InputLabel>Trạng thái</InputLabel>
                    <Select
                      value={editedData.current_status}
                      label="Trạng thái"
                      onChange={(e) =>
                        handleInputChange("current_status", e.target.value)
                      }
                    >
                      <MenuItem value="available">Sẵn sàng</MenuItem>
                      <MenuItem value="in_use">Đang sử dụng</MenuItem>
                      <MenuItem value="maintenance">Bảo trì</MenuItem>
                      <MenuItem value="rented_out">Cho thuê</MenuItem>
                      <MenuItem value="borrowed_out">Cho mượn</MenuItem>
                      <MenuItem value="scrapped">Thanh lý</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Giá (VNĐ)"
                    value={formatNumberVN(editedData.price)}
                    onChange={(e) => {
                      const parsedValue = parseNumberVN(e.target.value);
                      handleInputChange(
                        "price",
                        parsedValue ? parseFloat(parsedValue) : ""
                      );
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Tuổi thọ (năm)"
                    value={editedData.lifespan?.toString() || ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Chỉ cho phép số
                      if (value === "" || /^\d+$/.test(value)) {
                        handleInputChange(
                          "lifespan",
                          value ? parseInt(value) : ""
                        );
                      }
                    }}
                    onKeyPress={(e) => {
                      // Chặn các ký tự không phải số
                      if (!/[0-9]/.test(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    inputProps={{
                      inputMode: "numeric",
                      pattern: "[0-9]*",
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Chi phí sửa chữa (VNĐ)"
                    value={formatNumberVN(editedData.repair_cost) || ""}
                    onChange={(e) => {
                      const parsedValue = parseNumberVN(e.target.value);
                      handleInputChange(
                        "repair_cost",
                        parsedValue ? parseFloat(parsedValue) : ""
                      );
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Ngày sử dụng"
                    type="date"
                    value={formatDateForInput(editedData.date_of_use)}
                    onChange={(e) =>
                      handleInputChange("date_of_use", e.target.value)
                    }
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    label="Ghi chú"
                    multiline
                    rows={3}
                    value={editedData.note || ""}
                    onChange={(e) => handleInputChange("note", e.target.value)}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Ngày tạo"
                    value={formatDate(selectedMachine.created_at)}
                    disabled={true}
                    variant="filled"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Ngày cập nhật"
                    value={formatDate(selectedMachine.updated_at)}
                    disabled={true}
                    variant="filled"
                  />
                </Grid>
              </Grid>
            )}
          </DialogContent>
          <Divider />
          <DialogActions sx={{ p: 3 }}>
            <Button
              onClick={handleCloseDialog}
              variant="outlined"
              color="inherit"
              sx={{ borderRadius: "12px" }}
            >
              Hủy
            </Button>
            <Button
              onClick={handleSave}
              variant="contained"
              startIcon={<Save />}
              sx={{
                borderRadius: "12px",
                background: "linear-gradient(45deg, #667eea, #764ba2)",
              }}
            >
              Lưu thay đổi
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </>
  );
};

export default MachineListPage;
