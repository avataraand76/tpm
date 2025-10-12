// frontend/src/pages/TicketManagementPage.jsx

import React, { useState, useEffect, useCallback } from "react";
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Stack,
  Avatar,
  Tooltip,
  Alert,
  Snackbar,
  CircularProgress,
  Pagination,
  InputAdornment,
  Grid,
  AlertTitle,
  Checkbox,
  Autocomplete,
} from "@mui/material";
import {
  Add,
  Visibility,
  Search,
  FileDownload,
  FileUpload,
  Close,
  Save,
  Receipt,
  Delete,
  QrCode2, // Thêm QrCode2
} from "@mui/icons-material";
import NavigationBar from "../components/NavigationBar";
import { api } from "../api/api";
import MachineQRScanner from "../components/MachineQRScanner"; // IMPORT COMPONENT MỚI

const TicketManagementPage = () => {
  const [activeTab, setActiveTab] = useState(0); // 0: Import, 1: Export
  const [imports, setImports] = useState([]);
  const [exports, setExports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [locations, setLocations] = useState([]);

  // Dialog states
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState("create"); // create, edit, view
  const [dialogType, setDialogType] = useState("import"); // import, export
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    to_location_uuid: "",
    type: "",
    date: new Date().toISOString().split("T")[0],
    note: "",
    machines: [],
  });

  // States cho tìm kiếm máy móc
  const [searchMachineTerm, setSearchMachineTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  // NEW STATES FOR SEARCH PAGINATION
  const [searchPage, setSearchPage] = useState(1);
  const [searchTotalPages, setSearchTotalPages] = useState(1);
  const SEARCH_LIMIT = 5; // Giới hạn số lượng kết quả tìm kiếm hiển thị

  // States cho QR Scanner (Mới)
  const [openScanDialog, setOpenScanDialog] = useState(false);

  // Snackbar
  const [notification, setNotification] = useState({
    open: false,
    severity: "success",
    title: "",
    message: "",
  });

  // ĐỊNH NGHĨA CONFIG TRẠNG THÁI ĐỒNG BỘ VỚI MachineListPage.jsx
  const STATUS_CONFIG = {
    // Trạng thái máy móc
    available: { bg: "#2e7d3222", color: "#2e7d32", label: "Sẵn sàng" },
    in_use: { bg: "#667eea22", color: "#667eea", label: "Đang sử dụng" },
    maintenance: { bg: "#ff980022", color: "#ff9800", label: "Bảo trì" },
    rented: { bg: "#673ab722", color: "#673ab7", label: "Đang thuê" },
    borrowed: { bg: "#03a9f422", color: "#03a9f4", label: "Đang mượn" },
    borrowed_out: { bg: "#00bcd422", color: "#00bcd4", label: "Cho mượn" },
    liquidation: { bg: "#f4433622", color: "#f44336", label: "Thanh lý" },
    disabled: { bg: "#9e9e9e22", color: "#9e9e9e", label: "Vô hiệu hóa" },

    // Trạng thái phiếu
    pending: { bg: "#ff980022", color: "#ff9800", label: "Chờ xử lý" },
    completed: { bg: "#2e7d3222", color: "#2e7d32", label: "Hoàn thành" },
    cancelled: { bg: "#f4433622", color: "#f44336", label: "Đã hủy" },
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

  const showNotification = useCallback((severity, title, message) => {
    setNotification({
      open: true,
      severity,
      title,
      message,
    });
  }, []);

  const fetchLocations = useCallback(async () => {
    try {
      const response = await api.locations.getAll();
      setLocations(response.data);
    } catch (error) {
      console.error("Error fetching locations:", error);
      showNotification("error", "Tải thất bại", "Lỗi khi tải danh sách vị trí");
    }
  }, [showNotification]);

  // Fetch data based on active tab
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 20,
        status: statusFilter,
      };

      if (activeTab === 0) {
        params.import_type = typeFilter;
        const response = await api.imports.getAll(params);
        setImports(response.data);
        setTotalPages(response.pagination.totalPages);
      } else {
        params.export_type = typeFilter;
        const response = await api.exports.getAll(params);
        setExports(response.data);
        setTotalPages(response.pagination.totalPages);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      showNotification("error", "Tải thất bại", "Lỗi khi tải dữ liệu phiếu");
    } finally {
      setLoading(false);
    }
  }, [activeTab, page, statusFilter, typeFilter, showNotification]);

  // Cập nhật searchMachines để hỗ trợ phân trang
  const searchMachines = useCallback(
    async (searchTerm, pageNumber = 1) => {
      if (searchTerm.length < 2) {
        setSearchResults([]);
        setSearchTotalPages(1);
        setSearchPage(1);
        return;
      }
      setSearchLoading(true);
      try {
        // API gọi đã được cập nhật để chấp nhận page và limit
        const response = await api.machines.search(searchTerm, {
          page: pageNumber,
          limit: SEARCH_LIMIT,
        });
        setSearchResults(response.data);
        setSearchTotalPages(response.pagination.totalPages);
        setSearchPage(pageNumber);
      } catch (error) {
        console.error("Error searching machines:", error);
        showNotification("error", "Tìm kiếm thất bại", "Lỗi khi tìm máy móc");
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    },
    [showNotification]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    setPage(1);
    setStatusFilter("");
    setTypeFilter("");
  };

  const handleSearchTermChange = (e) => {
    const term = e.target.value;
    setSearchMachineTerm(term);
    // Khi thay đổi term, reset về trang 1
    searchMachines(term, 1);
  };

  const handleSearchPageChange = (event, value) => {
    // 1. Cập nhật state trang mới
    setSearchPage(value);

    // 2. Chỉ gọi API nếu có từ khóa tìm kiếm hợp lệ
    if (searchMachineTerm && searchMachineTerm.length >= 2) {
      // Gọi hàm tìm kiếm với từ khóa hiện tại và trang mới được chọn
      searchMachines(searchMachineTerm, value);
    }
  };

  const handleOpenDialog = async (mode, type, ticket = null) => {
    setDialogMode(mode);
    setDialogType(type);
    setOpenDialog(true);
    setSearchResults([]);
    setSearchMachineTerm("");
    setSearchPage(1); // Reset search pagination
    setOpenScanDialog(false); // Đảm bảo đóng scanner dialog

    if (mode === "create") {
      setSelectedTicket(null);
      setFormData({
        to_location_uuid: "",
        type: "",
        date: new Date().toISOString().split("T")[0],
        note: "",
        machines: [],
      });
    } else if (mode === "view" && ticket) {
      setSelectedTicket(ticket);
      setDetailLoading(true);
      setFormData({
        to_location_uuid: "",
        type: "",
        date: "",
        note: "",
        machines: [],
      });

      try {
        const uuid = ticket.uuid_machine_import || ticket.uuid_machine_export;
        let response;

        if (type === "import") {
          response = await api.imports.getById(uuid);
        } else {
          response = await api.exports.getById(uuid);
        }

        const ticketDetails = response.data.import || response.data.export;
        const ticketDate =
          ticketDetails.import_date || ticketDetails.export_date || "";

        setFormData({
          to_location_uuid: ticketDetails.to_location_uuid || "",
          type: ticketDetails.import_type || ticketDetails.export_type || "",
          date: ticketDate
            ? new Date(ticketDate).toISOString().split("T")[0]
            : "",
          note: ticketDetails.note || "",
          // Cập nhật machines để hiển thị chi tiết đầy đủ thông tin máy
          machines: response.data.details.map((d) => ({
            uuid_machine: d.uuid_machine,
            code_machine: d.code_machine,
            name_machine: d.name_machine,
            serial_machine: d.serial_machine,
            current_status: d.current_status, // Thêm trạng thái hiện tại
            name_category: d.name_category, // Thêm loại máy
            note: d.note,
          })),
        });
      } catch (error) {
        console.error("Error fetching ticket details:", error);
        showNotification("error", "Tải thất bại", "Lỗi khi tải chi tiết phiếu");
        handleCloseDialog();
      } finally {
        setDetailLoading(false);
      }
    }
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedTicket(null);
    setFormData({
      to_location_uuid: "",
      type: "",
      date: new Date().toISOString().split("T")[0],
      note: "",
      machines: [],
    });
    setOpenScanDialog(false); // Đảm bảo đóng scanner dialog
  };

  const handleFormChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSelectMachine = (machine) => {
    // Kiểm tra xem máy đã được chọn chưa (dựa vào id_machine)
    const isSelected = formData.machines.some(
      (m) => m.uuid_machine === machine.uuid_machine
    );

    if (isSelected) {
      // Bỏ chọn
      setFormData((prev) => ({
        ...prev,
        machines: prev.machines.filter(
          (m) => m.uuid_machine !== machine.uuid_machine
        ),
      }));
      // showNotification(
      //   "info",
      //   "Đã xóa",
      //   `Máy ${machine.code_machine} đã bị xóa khỏi phiếu.`
      // );
    } else {
      // Chọn: thêm vào danh sách (giữ lại các trường quan trọng cho hiển thị và gửi đi)
      setFormData((prev) => ({
        ...prev,
        machines: [
          ...prev.machines,
          {
            uuid_machine: machine.uuid_machine,
            code_machine: machine.code_machine,
            name_machine: machine.name_machine,
            serial_machine: machine.serial_machine,
            // Thêm các trường vị trí và trạng thái để hiển thị trong danh sách đã chọn
            name_location: machine.name_location,
            current_status: machine.current_status,
            note: "", // Ghi chú riêng cho máy trong phiếu
          },
        ],
      }));
      // showNotification(
      //   "success",
      //   "Đã thêm",
      //   `Máy ${machine.code_machine} đã được thêm vào phiếu.`
      // );
    }
  };

  // Hàm xử lý khi máy được thêm từ QR Scanner (MỚI)
  const handleAddMachineFromScanner = (machine) => {
    // Tái sử dụng logic chọn máy
    handleSelectMachine(machine);
  };

  const handleRemoveSelectedMachine = (uuid_machine) => {
    setFormData((prev) => ({
      ...prev,
      machines: prev.machines.filter((m) => m.uuid_machine !== uuid_machine),
    }));
  };

  const handleUpdateMachineNote = (uuid_machine, note) => {
    setFormData((prev) => ({
      ...prev,
      machines: prev.machines.map((m) =>
        m.uuid_machine === uuid_machine ? { ...m, note } : m
      ),
    }));
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);

      // Lọc dữ liệu máy móc để gửi: chỉ giữ lại id_machine và note
      const machinesToSend = formData.machines
        .map((m) => ({
          uuid_machine: m.uuid_machine,
          note: m.note,
        }))
        .filter((m) => m.uuid_machine);

      if (machinesToSend.length === 0) {
        showNotification(
          "error",
          "Lỗi nhập liệu",
          "Vui lòng chọn ít nhất một máy móc."
        );
        setLoading(false);
        return;
      }

      // Kiểm tra vị trí đích
      if (!formData.to_location_uuid) {
        showNotification(
          "error",
          "Lỗi nhập liệu",
          "Vui lòng chọn vị trí nhập/xuất."
        );
        setLoading(false);
        return;
      }

      const submitData = {
        note: formData.note,
        machines: machinesToSend,
        to_location_uuid: formData.to_location_uuid,
      };

      if (dialogType === "import") {
        submitData.import_type = formData.type;
        submitData.import_date = formData.date;

        await api.imports.create(submitData);
        showNotification("success", "Thành công", "Tạo phiếu nhập thành công");
      } else {
        submitData.export_type = formData.type;
        submitData.export_date = formData.date;

        await api.exports.create(submitData);
        showNotification("success", "Thành công", "Tạo phiếu xuất thành công");
      }

      handleCloseDialog();
      fetchData();
    } catch (error) {
      console.error("Error creating ticket:", error);
      showNotification(
        "error",
        "Thao tác thất bại",
        error.response?.data?.message || "Lỗi khi tạo phiếu"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (uuid, status, type) => {
    try {
      if (type === "import") {
        await api.imports.updateStatus(uuid, status);
      } else {
        await api.exports.updateStatus(uuid, status);
      }
      showNotification(
        "success",
        "Thành công",
        "Cập nhật trạng thái thành công"
      );
      fetchData();
    } catch (error) {
      console.error("Error updating status:", error);
      showNotification("error", "Thất bại", "Lỗi khi cập nhật trạng thái");
    }
  };

  const handleCloseNotification = (event, reason) => {
    if (reason === "clickaway") {
      return;
    }
    setNotification({ ...notification, open: false });
  };

  const getStatusColor = (status) => {
    // Hàm này được dùng trong bảng danh sách phiếu, trả về tên màu Mui
    switch (status) {
      case "pending":
        return "warning";
      case "completed":
        return "success";
      case "cancelled":
        return "error";
      default:
        return "default";
    }
  };

  const getStatusLabel = (status) => {
    // Hàm dịch trạng thái phiếu
    switch (status) {
      case "pending":
        return "Chờ xử lý";
      case "completed":
        return "Hoàn thành";
      case "cancelled":
        return "Đã hủy";
      default:
        return status;
    }
  };

  // HÀM DỊCH TRẠNG THÁI MÁY MÓC (SỬ DỤNG LẠI TỪ CONFIG)
  const getMachineStatusLabel = (status) => {
    return getStatusInfo(status).label;
  };

  const getTypeLabel = (type) => {
    const typeMap = {
      internal: "Điều chuyển nội bộ",
      // Import types
      borrowed: "Nhập đi mượn",
      rented: "Nhập đi thuê",
      purchased: "Nhập mua mới",
      maintenance_return: "Nhập sau bảo trì",
      // Export types
      maintenance: "Xuất bảo trì",
      borrowed_out: "Xuất cho mượn",
      liquidation: "Xuất thanh lý",
    };
    return typeMap[type] || type;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const renderTableContent = () => {
    const data = activeTab === 0 ? imports : exports;

    if (loading) {
      return (
        <TableRow>
          <TableCell colSpan={8} align="center" sx={{ py: 8 }}>
            <CircularProgress />
          </TableCell>
        </TableRow>
      );
    }

    if (data.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={8} align="center" sx={{ py: 8 }}>
            <Typography variant="body1" color="text.secondary">
              Không có dữ liệu
            </Typography>
          </TableCell>
        </TableRow>
      );
    }

    return data.map((item) => {
      const locationName = item.to_location_name || "Bên ngoài (Xuất/Nhập)";

      return (
        <TableRow
          key={item.uuid_machine_import || item.uuid_machine_export}
          hover
        >
          <TableCell>
            {formatDate(item.import_date || item.export_date)}
          </TableCell>
          <TableCell>
            {getTypeLabel(item.import_type || item.export_type)}
          </TableCell>

          <TableCell>{locationName}</TableCell>
          <TableCell align="center">{item.machine_count || 0}</TableCell>
          <TableCell>
            <Chip
              label={getStatusLabel(item.status)}
              color={getStatusColor(item.status)}
              size="small"
            />
          </TableCell>
          <TableCell>{item.note || "-"}</TableCell>
          <TableCell>
            <Stack direction="row" spacing={1}>
              <Tooltip title="Xem chi tiết">
                <IconButton
                  size="small"
                  onClick={() =>
                    handleOpenDialog(
                      "view",
                      activeTab === 0 ? "import" : "export",
                      item
                    )
                  }
                >
                  <Visibility fontSize="small" />
                </IconButton>
              </Tooltip>
              {item.status === "pending" && (
                <>
                  <Tooltip title="Hoàn thành">
                    <IconButton
                      size="small"
                      color="success"
                      onClick={() =>
                        handleUpdateStatus(
                          item.uuid_machine_import || item.uuid_machine_export,
                          "completed",
                          activeTab === 0 ? "import" : "export"
                        )
                      }
                    >
                      <Save fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Hủy">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() =>
                        handleUpdateStatus(
                          item.uuid_machine_import || item.uuid_machine_export,
                          "cancelled",
                          activeTab === 0 ? "import" : "export"
                        )
                      }
                    >
                      <Close fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </>
              )}
            </Stack>
          </TableCell>
        </TableRow>
      );
    });
  };

  return (
    <>
      <NavigationBar />
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
            <Avatar
              sx={{
                width: 60,
                height: 60,
                background: "linear-gradient(45deg, #667eea, #764ba2)",
              }}
            >
              <Receipt sx={{ fontSize: 30 }} />
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
                  textTransform: "uppercase",
                }}
              >
                Quản lý phiếu
              </Typography>
              <Typography variant="h6" color="text.secondary">
                Tạo và quản lý phiếu nhập xuất máy móc thiết bị
              </Typography>
            </Box>
          </Stack>
        </Box>

        {/* Main Card */}
        <Card
          elevation={0}
          sx={{
            borderRadius: "20px",
            border: "1px solid rgba(0, 0, 0, 0.05)",
          }}
        >
          <CardContent sx={{ p: 4 }}>
            {/* Tabs and Actions */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 3,
              }}
            >
              <Tabs
                value={activeTab}
                onChange={handleTabChange}
                sx={{
                  "& .MuiTab-root": {
                    fontWeight: 600,
                    fontSize: "1rem",
                    minWidth: 140,
                    borderRadius: "12px",
                    margin: "0 4px",
                    transition: "all 0.3s ease",
                    "&.Mui-selected": {
                      color: "#667eea",
                      background: "rgba(102, 126, 234, 0.1)",
                    },
                  },
                  "& .MuiTabs-indicator": {
                    display: "none",
                  },
                }}
              >
                <Tab
                  icon={<FileDownload />}
                  label="Phiếu nhập"
                  iconPosition="start"
                />
                <Tab
                  icon={<FileUpload />}
                  label="Phiếu xuất"
                  iconPosition="start"
                />
              </Tabs>

              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() =>
                  handleOpenDialog(
                    "create",
                    activeTab === 0 ? "import" : "export"
                  )
                }
                sx={{
                  borderRadius: "12px",
                  background: "linear-gradient(45deg, #667eea, #764ba2)",
                  px: 4,
                  py: 1.5,
                  "&:hover": {
                    transform: "translateY(-2px)",
                    boxShadow: "0 8px 25px rgba(102, 126, 234, 0.3)",
                  },
                  transition: "all 0.3s ease",
                }}
              >
                Tạo phiếu {activeTab === 0 ? "nhập" : "xuất"}
              </Button>
            </Box>

            {/* Filters */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  select
                  label="Trạng thái"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "12px",
                    },
                  }}
                >
                  <MenuItem value="">Tất cả</MenuItem>
                  <MenuItem value="pending">Chờ xử lý</MenuItem>
                  <MenuItem value="completed">Hoàn thành</MenuItem>
                  <MenuItem value="cancelled">Đã hủy</MenuItem>
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  select
                  label="Loại phiếu"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "12px",
                    },
                  }}
                >
                  <MenuItem value="">Tất cả</MenuItem>
                  {activeTab === 0
                    ? [
                        <MenuItem key="purchased" value="purchased">
                          Nhập mua mới
                        </MenuItem>,
                        <MenuItem
                          key="maintenance_return"
                          value="maintenance_return"
                        >
                          Nhập sau bảo trì
                        </MenuItem>,
                        <MenuItem key="rented" value="rented">
                          Nhập đi thuê
                        </MenuItem>,
                        <MenuItem key="borrowed" value="borrowed">
                          Nhập đi mượn
                        </MenuItem>,
                        <MenuItem key="internal" value="internal">
                          Điều chuyển nội bộ
                        </MenuItem>,
                      ]
                    : [
                        <MenuItem key="liquidation" value="liquidation">
                          Xuất thanh lý
                        </MenuItem>,
                        <MenuItem key="maintenance" value="maintenance">
                          Xuất bảo trì
                        </MenuItem>,
                        <MenuItem key="borrowed_out" value="borrowed_out">
                          Xuất cho mượn
                        </MenuItem>,
                        <MenuItem key="internal" value="internal">
                          Điều chuyển nội bộ
                        </MenuItem>,
                      ]}
                </TextField>
              </Grid>
            </Grid>

            {/* Table */}
            <TableContainer
              component={Paper}
              elevation={0}
              sx={{
                borderRadius: "20px",
                border: "1px solid rgba(0, 0, 0, 0.05)",
              }}
            >
              <Table>
                <TableHead>
                  <TableRow
                    sx={{ backgroundColor: "rgba(102, 126, 234, 0.05)" }}
                  >
                    <TableCell sx={{ fontWeight: 600 }}>Ngày</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Loại</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>
                      {activeTab === 0 ? "Nhập vào" : "Xuất đến"}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="center">
                      Số lượng máy
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Trạng thái</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Ghi chú</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Thao tác</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>{renderTableContent()}</TableBody>
              </Table>
            </TableContainer>

            {/* Pagination */}
            <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(e, value) => setPage(value)}
                color="primary"
                sx={{
                  "& .MuiPaginationItem-root": {
                    borderRadius: "8px",
                  },
                }}
              />
            </Box>
          </CardContent>
        </Card>

        {/* Create/Edit/View Dialog */}
        <Dialog
          open={openDialog}
          onClose={handleCloseDialog}
          maxWidth="lg" // ĐÃ CHỈNH SỬA MAX WIDTH
          fullScreen
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: "20px",
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
            {dialogMode === "create"
              ? `Tạo phiếu ${dialogType === "import" ? "nhập" : "xuất"}`
              : dialogMode === "edit"
              ? "Chỉnh sửa phiếu"
              : "Chi tiết phiếu"}
          </DialogTitle>
          <DialogContent sx={{ mt: 3 }}>
            {detailLoading ? (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  minHeight: 300,
                }}
              >
                <CircularProgress />
              </Box>
            ) : (
              <Stack spacing={3}>
                <TextField
                  fullWidth
                  select
                  label={`Loại ${dialogType === "import" ? "nhập" : "xuất"}`}
                  value={formData.type}
                  onChange={(e) => handleFormChange("type", e.target.value)}
                  disabled={dialogMode === "view"}
                  required
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "12px",
                    },
                  }}
                >
                  {dialogType === "import"
                    ? [
                        <MenuItem key="purchased" value="purchased">
                          Nhập mua mới
                        </MenuItem>,
                        <MenuItem
                          key="maintenance_return"
                          value="maintenance_return"
                        >
                          Nhập sau bảo trì
                        </MenuItem>,
                        <MenuItem key="rented" value="rented">
                          Nhập đi thuê
                        </MenuItem>,
                        <MenuItem key="borrowed" value="borrowed">
                          Nhập đi mượn
                        </MenuItem>,
                        <MenuItem key="internal" value="internal">
                          Điều chuyển nội bộ
                        </MenuItem>,
                      ]
                    : [
                        <MenuItem key="liquidation" value="liquidation">
                          Xuất thanh lý
                        </MenuItem>,
                        <MenuItem key="maintenance" value="maintenance">
                          Xuất bảo trì
                        </MenuItem>,
                        <MenuItem key="borrowed_out" value="borrowed_out">
                          Xuất cho mượn
                        </MenuItem>,
                        <MenuItem key="internal" value="internal">
                          Điều chuyển nội bộ
                        </MenuItem>,
                      ]}
                </TextField>

                <TextField
                  fullWidth
                  type="date"
                  label="Ngày"
                  value={formData.date}
                  onChange={(e) => handleFormChange("date", e.target.value)}
                  disabled={dialogMode === "view"}
                  required
                  InputLabelProps={{ shrink: true }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "12px",
                    },
                  }}
                />

                <Autocomplete
                  fullWidth
                  // 1. Danh sách các tùy chọn
                  options={locations}
                  // 2. Cách hiển thị nhãn của mỗi tùy chọn
                  getOptionLabel={(option) => option.name_location || ""}
                  // 3. Xử lý khi giá trị thay đổi
                  onChange={(event, newValue) => {
                    // newValue là object { uuid_location: '...', name_location: '...' } hoặc null
                    handleFormChange(
                      "to_location_uuid",
                      newValue ? newValue.uuid_location : ""
                    );
                  }}
                  // 4. Giá trị hiện tại được chọn (dựa trên uuid)
                  value={
                    locations.find(
                      (loc) => loc.uuid_location === formData.to_location_uuid
                    ) || null
                  }
                  // 5. Vô hiệu hóa
                  disabled={dialogMode === "view"}
                  // 6. Cấu hình TextField bên trong
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label={dialogType === "import" ? "Nhập vào" : "Xuất đến"}
                      required
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          borderRadius: "12px",
                        },
                      }}
                    />
                  )}
                  // 7. Cấu hình box
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "12px",
                      padding: "9px 10px !important", // Để phù hợp với style chung
                    },
                  }}
                />

                {/* --- PHẦN TÌM KIẾM VÀ CHỌN MÁY MÓC (CHỈ HIỆN KHI mode="create") --- */}
                {dialogMode === "create" && (
                  <Card variant="outlined" sx={{ borderRadius: "12px" }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Chọn máy móc ({formData.machines.length})
                      </Typography>

                      <Button
                        variant="outlined"
                        startIcon={<QrCode2 />}
                        onClick={() => setOpenScanDialog(true)} // Mở dialog quét QR
                        sx={{
                          borderRadius: "12px",
                          py: 1,
                          borderColor: "#2e7d32",
                          color: "#2e7d32",
                          mb: 2,
                          "&:hover": {
                            borderColor: "#4caf50",
                            bgcolor: "#2e7d3211",
                          },
                        }}
                      >
                        Quét Mã QR Máy Móc
                      </Button>

                      <TextField
                        fullWidth
                        label="Tìm kiếm máy"
                        value={searchMachineTerm}
                        onChange={handleSearchTermChange}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <Search />
                            </InputAdornment>
                          ),
                          endAdornment: searchLoading && (
                            <InputAdornment position="end">
                              <CircularProgress size={20} />
                            </InputAdornment>
                          ),
                          sx: { borderRadius: "12px" },
                        }}
                        sx={{ mb: 2 }}
                      />

                      {/* Hiển thị kết quả tìm kiếm */}
                      {searchResults.length > 0 && (
                        <>
                          <Paper
                            elevation={3}
                            sx={{ maxHeight: 300, overflow: "auto" }}
                          >
                            <Table size="small">
                              <TableBody>
                                {searchResults.map((machine) => {
                                  const isSelected = formData.machines.some(
                                    (m) =>
                                      m.uuid_machine === machine.uuid_machine
                                  );
                                  return (
                                    <TableRow
                                      key={machine.uuid_machine}
                                      hover
                                      onClick={() =>
                                        handleSelectMachine(machine)
                                      }
                                      sx={{
                                        cursor: "pointer",
                                        backgroundColor: isSelected
                                          ? "rgba(102, 126, 234, 0.1)"
                                          : "inherit",
                                      }}
                                    >
                                      <TableCell padding="checkbox">
                                        <Tooltip
                                          title={
                                            isSelected ? "Đã chọn" : "Chọn"
                                          }
                                        >
                                          <Checkbox
                                            checked={isSelected}
                                            size="small"
                                          />
                                        </Tooltip>
                                      </TableCell>
                                      <TableCell>
                                        <Stack>
                                          <Typography
                                            variant="body2"
                                            sx={{ fontWeight: 600 }}
                                          >
                                            {machine.code_machine} -{" "}
                                            {machine.name_machine}
                                            <Chip
                                              label={getMachineStatusLabel(
                                                machine.current_status
                                              )}
                                              size="small"
                                              // SỬ DỤNG MÀU TỪ CONFIG ĐÃ ĐỒNG BỘ
                                              sx={{
                                                ml: 1,
                                                height: 20,
                                                fontSize: "0.75rem",
                                                background: getStatusInfo(
                                                  machine.current_status
                                                ).bg,
                                                color: getStatusInfo(
                                                  machine.current_status
                                                ).color,
                                                fontWeight: 600,
                                                borderRadius: "8px",
                                              }}
                                            />
                                          </Typography>
                                          <Typography
                                            variant="caption"
                                            color="text.secondary"
                                          >
                                            Serial:{" "}
                                            {machine.serial_machine || "N/A"} |
                                            Vị trí:{" "}
                                            {machine.name_location ||
                                              "Chưa xác định"}
                                          </Typography>
                                        </Stack>
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </Paper>
                          {/* PHÂN TRANG KẾT QUẢ TÌM KIẾM */}
                          {searchTotalPages > 1 && (
                            <Box
                              sx={{
                                display: "flex",
                                justifyContent: "center",
                                mt: 1,
                                mb: 2,
                              }}
                            >
                              <Pagination
                                count={searchTotalPages}
                                page={searchPage}
                                onChange={handleSearchPageChange}
                                size="small"
                                color="primary"
                                showFirstButton
                                showLastButton
                              />
                            </Box>
                          )}
                        </>
                      )}

                      {/* Danh sách máy móc đã chọn */}
                      {formData.machines.length > 0 && (
                        <Box sx={{ mt: 2 }}>
                          <Typography
                            variant="subtitle1"
                            sx={{ fontWeight: 600, mb: 1 }}
                          >
                            Danh sách máy sẽ thêm:
                          </Typography>
                          <Stack spacing={2}>
                            {formData.machines.map((machine) => (
                              <Paper
                                key={machine.uuid_machine}
                                variant="outlined"
                                sx={{ p: 2, borderRadius: "12px" }}
                              >
                                <Stack
                                  direction="row"
                                  spacing={2}
                                  alignItems="center"
                                >
                                  <Box sx={{ flexGrow: 1 }}>
                                    <Typography
                                      variant="body2"
                                      sx={{ fontWeight: 600 }}
                                    >
                                      {machine.code_machine} -{" "}
                                      {machine.name_machine}
                                      <Chip
                                        label={getMachineStatusLabel(
                                          machine.current_status
                                        )}
                                        size="small"
                                        // SỬ DỤNG MÀU TỪ CONFIG ĐÃ ĐỒNG BỘ
                                        sx={{
                                          ml: 1,
                                          height: 20,
                                          fontSize: "0.75rem",
                                          background: getStatusInfo(
                                            machine.current_status
                                          ).bg,
                                          color: getStatusInfo(
                                            machine.current_status
                                          ).color,
                                          fontWeight: 600,
                                          borderRadius: "8px",
                                        }}
                                      />
                                    </Typography>
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                    >
                                      Serial:{" "}
                                      {machine.serial_machine || "Máy mới"} | Vị
                                      trí hiện tại:{" "}
                                      {machine.name_location || "N/A"}
                                    </Typography>
                                  </Box>
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() =>
                                      handleRemoveSelectedMachine(
                                        machine.uuid_machine
                                      )
                                    }
                                  >
                                    <Delete fontSize="small" />
                                  </IconButton>
                                </Stack>
                                <TextField
                                  fullWidth
                                  size="small"
                                  label="Ghi chú riêng cho máy (Tùy chọn)"
                                  value={machine.note || ""}
                                  onChange={(e) =>
                                    handleUpdateMachineNote(
                                      machine.uuid_machine,
                                      e.target.value
                                    )
                                  }
                                  disabled={dialogMode === "view"}
                                  sx={{ mt: 1 }}
                                />
                              </Paper>
                            ))}
                          </Stack>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                )}
                {/* --- KẾT THÚC PHẦN TÌM KIẾM VÀ CHỌN MÁY MÓC --- */}

                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Ghi chú"
                  value={formData.note}
                  onChange={(e) => handleFormChange("note", e.target.value)}
                  disabled={dialogMode === "view"}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "12px",
                    },
                  }}
                />

                {/* Phần hiển thị chi tiết máy khi ở chế độ xem */}
                {dialogMode === "view" && formData.machines.length > 0 && (
                  <Card variant="outlined" sx={{ borderRadius: "12px" }}>
                    <CardContent>
                      <Typography
                        variant="h6"
                        gutterBottom
                        sx={{ fontWeight: 600 }}
                      >
                        Danh sách máy móc ({formData.machines.length})
                      </Typography>
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{ fontWeight: 600 }}>
                                Mã máy
                              </TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>
                                Tên máy
                              </TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>
                                Serial
                              </TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>
                                Loại máy
                              </TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>
                                Trạng thái
                              </TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>
                                Ghi chú phiếu
                              </TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {formData.machines.map((machine, index) => (
                              <TableRow key={machine.uuid_machine || index}>
                                <TableCell>{machine.code_machine}</TableCell>
                                <TableCell>{machine.name_machine}</TableCell>
                                <TableCell>
                                  {machine.serial_machine || "-"}
                                </TableCell>
                                <TableCell>
                                  {machine.name_category || "-"}
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    label={getMachineStatusLabel(
                                      machine.current_status
                                    )}
                                    size="small"
                                    // SỬ DỤNG MÀU TỪ CONFIG ĐÃ ĐỒNG BỘ
                                    sx={{
                                      background: getStatusInfo(
                                        machine.current_status
                                      ).bg,
                                      color: getStatusInfo(
                                        machine.current_status
                                      ).color,
                                      fontWeight: 600,
                                      borderRadius: "8px",
                                    }}
                                  />
                                </TableCell>
                                <TableCell>{machine.note || "-"}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </CardContent>
                  </Card>
                )}

                {dialogMode === "view" && selectedTicket && (
                  <Alert severity="info">
                    <Typography variant="body2">
                      <strong>Trạng thái:</strong>{" "}
                      {getStatusLabel(selectedTicket.status)}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Tạo lúc:</strong>{" "}
                      {new Date(selectedTicket.created_at).toLocaleString(
                        "vi-VN"
                      )}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Cập nhật lúc:</strong>{" "}
                      {new Date(selectedTicket.updated_at).toLocaleString(
                        "vi-VN"
                      )}
                    </Typography>
                  </Alert>
                )}
              </Stack>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button
              variant="outlined"
              onClick={handleCloseDialog}
              sx={{
                borderRadius: "12px",
                px: 3,
              }}
            >
              {dialogMode === "view" ? "Đóng" : "Hủy"}
            </Button>
            {dialogMode === "create" && (
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={loading}
                sx={{
                  borderRadius: "12px",
                  background: "linear-gradient(45deg, #667eea, #764ba2)",
                  px: 3,
                }}
              >
                {loading ? <CircularProgress size={24} /> : "Tạo phiếu"}
              </Button>
            )}
          </DialogActions>
        </Dialog>

        {/* --- COMPONENT QR SCANNER (MỚI) --- */}
        <MachineQRScanner
          isOpen={openScanDialog}
          onClose={() => setOpenScanDialog(false)}
          onMachineAdd={handleAddMachineFromScanner}
          selectedMachines={formData.machines}
        />

        {/* Snackbar */}
        <Snackbar
          open={notification.open}
          autoHideDuration={2000}
          onClose={handleCloseNotification}
          anchorOrigin={{ vertical: "top", horizontal: "right" }}
        >
          <Alert
            onClose={handleCloseNotification}
            severity={notification.severity}
            variant="filled"
            sx={{
              width: "100%",
              minWidth: "350px",
              boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
              borderRadius: "12px",
            }}
          >
            <AlertTitle sx={{ fontWeight: "bold", fontSize: "1.1rem" }}>
              {notification.title}
            </AlertTitle>
            {notification.message}
          </Alert>
        </Snackbar>
      </Container>
    </>
  );
};

export default TicketManagementPage;
