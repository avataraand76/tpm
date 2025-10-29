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
  Autorenew,
  Search,
  FileDownload,
  FileUpload,
  Receipt,
  Delete,
  QrCode2,
  Refresh,
} from "@mui/icons-material";
import NavigationBar from "../components/NavigationBar";
import { api } from "../api/api";
import MachineQRScanner from "../components/MachineQRScanner";

const TicketManagementPage = () => {
  const [activeTab, setActiveTab] = useState(0); // 0: Import, 1: Export, 2: Internal
  const [imports, setImports] = useState([]);
  const [exports, setExports] = useState([]);
  const [transfers, setTransfers] = useState([]); // <<< THÊM STATE MỚI
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [filteredLocations, setFilteredLocations] = useState([]);
  const [locationLoading, setLocationLoading] = useState(false);
  const [externalLocations, setExternalLocations] = useState([]);
  const [externalLocationLoading, setExternalLocationLoading] = useState(false);

  // Dialog states
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState("create"); // create, edit, view
  const [dialogType, setDialogType] = useState("import"); // import, export, internal
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    // from_location_uuid: "", // <<< ĐÃ XÓA
    to_location_uuid: "",
    type: "",
    date: new Date().toISOString().split("T")[0],
    note: "",
    machines: [],
    is_borrowed_or_rented_or_borrowed_out_name: "",
    is_borrowed_or_rented_or_borrowed_out_date: "",
    is_borrowed_or_rented_or_borrowed_out_return_date: "",
  });

  // States cho tìm kiếm máy móc
  const [searchMachineTerm, setSearchMachineTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchPage, setSearchPage] = useState(1);
  const [searchTotalPages, setSearchTotalPages] = useState(1);
  const SEARCH_LIMIT = 5;

  // States cho QR Scanner
  const [openScanDialog, setOpenScanDialog] = useState(false);

  // Snackbar
  const [notification, setNotification] = useState({
    open: false,
    severity: "success",
    title: "",
    message: "",
  });

  // Config trạng thái
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
    completed: { bg: "#2e7d3222", color: "#2e7d32", label: "Đã duyệt" },
    cancelled: { bg: "#f4433622", color: "#f44336", label: "Đã hủy" },
  };

  // Style chung
  const DISABLED_VIEW_SX = {
    "& .MuiInputBase-root.Mui-disabled": {
      backgroundColor: "#fffbe5",
      "& fieldset": {
        borderColor: "#f44336 !important",
      },
      "& .MuiInputBase-input": {
        color: "#f44336",
        WebkitTextFillColor: "#f44336 !important",
        fontWeight: 600,
      },
      "& .MuiFormLabel-root": {
        color: "#f44336 !important",
      },
    },
    "& .MuiOutlinedInput-root.Mui-disabled": {
      backgroundColor: "#fffbe5",
    },
    "& .MuiOutlinedInput-root": {
      borderRadius: "12px",
    },
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

  const fetchLocations = useCallback(
    async (filterType = null) => {
      setLocationLoading(true);
      try {
        const params = {};
        if (filterType) {
          params.filter_type = filterType;
        }
        const response = await api.locations.getAll(params);
        setFilteredLocations(response.data);
      } catch (error) {
        console.error("Error fetching locations:", error);
        showNotification(
          "error",
          "Tải thất bại",
          "Lỗi khi tải danh sách vị trí"
        );
        setFilteredLocations([]);
      } finally {
        setLocationLoading(false);
      }
    },
    [showNotification]
  );

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
      } else if (activeTab === 1) {
        params.export_type = typeFilter;
        const response = await api.exports.getAll(params);
        setExports(response.data);
        setTotalPages(response.pagination.totalPages);
      } else if (activeTab === 2) {
        // <<< START: LOGIC TAB ĐIỀU CHUYỂN
        // Không cần typeFilter cho điều chuyển
        delete params.import_type;
        delete params.export_type;

        const response = await api.internal_transfers.getAll(params);
        setTransfers(response.data);
        setTotalPages(response.pagination.totalPages);
        // <<< END: LOGIC TAB ĐIỀU CHUYỂN
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

  const fetchExternalLocations = useCallback(async () => {
    setExternalLocationLoading(true);
    try {
      const response = await api.locations.getAll({
        filter_type: "external_only",
      });
      setExternalLocations(response.data);
    } catch (error) {
      console.error("Error fetching external locations:", error);
      showNotification(
        "error",
        "Tải thất bại",
        "Lỗi khi tải danh sách đơn vị ngoài"
      );
    } finally {
      setExternalLocationLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchExternalLocations();
  }, [fetchExternalLocations]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    setPage(1);
    setStatusFilter("");
    setTypeFilter("");
  };

  const handleSearchTermChange = (e) => {
    const term = e.target.value;
    setSearchMachineTerm(term);
    searchMachines(term, 1);
  };

  const handleSearchPageChange = (event, value) => {
    setSearchPage(value);
    if (searchMachineTerm && searchMachineTerm.length >= 2) {
      searchMachines(searchMachineTerm, value);
    }
  };

  const getLocationFilterForType = (type) => {
    // Req 1.2 (Đã bị xóa, nhưng logic vẫn dùng cho Nhập/Xuất)
    // if (type === "internal") return "internal"; // Đã xóa

    // Req 2.1, 3.1
    if (
      [
        "purchased",
        "maintenance_return",
        "borrowed_out_return",
        "borrowed",
        "rented",
      ].includes(type)
    ) {
      return "warehouse_only";
    }

    // Req 4.1, 5.1, 6.1
    if (
      [
        "maintenance",
        "liquidation",
        "borrowed_out",
        "borrowed_return",
        "rented_return",
      ].includes(type)
    ) {
      return "external_only";
    }

    return null; // No filter
  };

  const handleOpenDialog = async (mode, type, ticket = null) => {
    setDialogMode(mode);
    setDialogType(type); // type sẽ là 'import', 'export', hoặc 'internal'
    setOpenDialog(true);
    setSearchResults([]);
    setSearchMachineTerm("");
    setSearchPage(1);
    setOpenScanDialog(false);
    setFilteredLocations([]); // Clear locations

    if (mode === "create") {
      setSelectedTicket(null);
      setFormData({
        // from_location_uuid: "", // <<< ĐÃ XÓA
        to_location_uuid: "",
        type: "",
        date: new Date().toISOString().split("T")[0],
        note: "",
        machines: [],
        is_borrowed_or_rented_or_borrowed_out_name: "",
        is_borrowed_or_rented_or_borrowed_out_date: "",
        is_borrowed_or_rented_or_borrowed_out_return_date: "",
      });

      // <<< START: CẬP NHẬT LOGIC TẢI LOCATION >>>
      if (type === "internal") {
        // Req 2: Chỉ tải location nội bộ
        await fetchLocations("internal");
      } else {
        // Tải tất cả locations cho phiếu Nhập/Xuất lúc ban đầu
        await fetchLocations();
      }
      // <<< END: CẬP NHẬT LOGIC TẢI LOCATION >>>
    } else if (mode === "view" && ticket) {
      setSelectedTicket(ticket);
      setDetailLoading(true);
      setFormData({
        // from_location_uuid: "", // <<< ĐÃ XÓA
        to_location_uuid: "",
        type: "",
        date: "",
        note: "",
        machines: [],
        is_borrowed_or_rented_or_borrowed_out_name: "",
        is_borrowed_or_rented_or_borrowed_out_date: "",
        is_borrowed_or_rented_or_borrowed_out_return_date: "",
      });

      try {
        const uuid =
          ticket.uuid_machine_import ||
          ticket.uuid_machine_export ||
          ticket.uuid_machine_internal_transfer; // <<< THÊM uuid_machine_internal_transfer
        let response;
        let ticketDetails;
        let ticketDate;

        if (type === "import") {
          response = await api.imports.getById(uuid);
          ticketDetails = response.data.import;
          ticketDate = ticketDetails.import_date;
        } else if (type === "export") {
          response = await api.exports.getById(uuid);
          ticketDetails = response.data.export;
          ticketDate = ticketDetails.export_date;
        } else if (type === "internal") {
          // <<< START: LOGIC XEM PHIẾU ĐIỀU CHUYỂN
          response = await api.internal_transfers.getById(uuid);
          ticketDetails = response.data.transfer;
          ticketDate = ticketDetails.transfer_date;
          // <<< END
        }

        // Tải location filter dựa trên loại phiếu
        const ticketType =
          ticketDetails.import_type || ticketDetails.export_type || "internal";

        // <<< START: CẬP NHẬT LOGIC FILTER
        let filter = null;
        if (type === "internal") {
          filter = "internal"; // Req 2
        } else {
          filter = getLocationFilterForType(ticketType);
        }
        await fetchLocations(filter);
        // <<< END

        setFormData({
          // from_location_uuid: ticketDetails.from_location_uuid || "", // <<< ĐÃ XÓA
          to_location_uuid: ticketDetails.to_location_uuid || "",
          type: ticketType || "",
          date: ticketDate
            ? new Date(ticketDate).toISOString().split("T")[0]
            : "",
          note: ticketDetails.note || "",
          machines: response.data.details.map((d) => ({
            uuid_machine: d.uuid_machine,
            code_machine: d.code_machine,
            type_machine: d.type_machine,
            model_machine: d.model_machine,
            serial_machine: d.serial_machine,
            current_status: d.current_status,
            name_category: d.name_category,
            name_location: d.name_location,
            note: d.note,
          })),
          is_borrowed_or_rented_or_borrowed_out_name:
            ticketDetails.is_borrowed_or_rented_or_borrowed_out_name || "",
          is_borrowed_or_rented_or_borrowed_out_date:
            ticketDetails.is_borrowed_or_rented_or_borrowed_out_date
              ? new Date(
                  ticketDetails.is_borrowed_or_rented_or_borrowed_out_date
                )
                  .toISOString()
                  .split("T")[0]
              : "",
          is_borrowed_or_rented_or_borrowed_out_return_date:
            ticketDetails.is_borrowed_or_rented_or_borrowed_out_return_date
              ? new Date(
                  ticketDetails.is_borrowed_or_rented_or_borrowed_out_return_date
                )
                  .toISOString()
                  .split("T")[0]
              : "",
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
      // from_location_uuid: "", // <<< ĐÃ XÓA
      to_location_uuid: "",
      type: "",
      date: new Date().toISOString().split("T")[0],
      note: "",
      machines: [],
      is_borrowed_or_rented_or_borrowed_out_name: "",
      is_borrowed_or_rented_or_borrowed_out_date: "",
      is_borrowed_or_rented_or_borrowed_out_return_date: "",
    });
    setOpenScanDialog(false);
  };

  const handleFormChange = (field, value) => {
    // Nếu thay đổi 'type' (và không phải phiếu điều chuyển), tải lại location
    if (field === "type" && dialogType !== "internal") {
      const filter = getLocationFilterForType(value);
      fetchLocations(filter); // Tải lại locations

      setFormData((prev) => ({
        ...prev,
        [field]: value,
        to_location_uuid: "", // Reset vị trí đã chọn
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  const handleSelectMachine = (machine) => {
    const isSelected = formData.machines.some(
      (m) => m.uuid_machine === machine.uuid_machine
    );

    if (isSelected) {
      setFormData((prev) => ({
        ...prev,
        machines: prev.machines.filter(
          (m) => m.uuid_machine !== machine.uuid_machine
        ),
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        machines: [
          ...prev.machines,
          {
            uuid_machine: machine.uuid_machine,
            code_machine: machine.code_machine,
            type_machine: machine.type_machine,
            model_machine: machine.model_machine,
            serial_machine: machine.serial_machine,
            name_location: machine.name_location,
            current_status: machine.current_status,
            note: "",
          },
        ],
      }));
    }
  };

  const handleAddMachineFromScanner = (machine) => {
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

      // <<< START: LOGIC MỚI CHO ĐIỀU CHUYỂN
      if (dialogType === "internal") {
        if (!formData.to_location_uuid) {
          // <<< SỬA VALIDATION
          showNotification(
            "error",
            "Lỗi nhập liệu",
            "Vui lòng chọn vị trí đến." // <<< SỬA VALIDATION
          );
          setLoading(false);
          return;
        }

        const submitData = {
          // from_location_uuid: formData.from_location_uuid, // <<< ĐÃ XÓA
          to_location_uuid: formData.to_location_uuid,
          transfer_date: formData.date,
          note: formData.note,
          machines: machinesToSend,
        };

        await api.internal_transfers.create(submitData);
        showNotification(
          "success",
          "Thành công",
          "Tạo phiếu điều chuyển thành công"
        );
        // <<< END: LOGIC MỚI
      } else {
        // Logic cũ cho Nhập/Xuất
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
          is_borrowed_or_rented_or_borrowed_out_name:
            formData.is_borrowed_or_rented_or_borrowed_out_name || null,
          is_borrowed_or_rented_or_borrowed_out_date:
            formData.is_borrowed_or_rented_or_borrowed_out_date || null,
          is_borrowed_or_rented_or_borrowed_out_return_date:
            formData.is_borrowed_or_rented_or_borrowed_out_return_date || null,
        };

        if (dialogType === "import") {
          submitData.import_type = formData.type;
          submitData.import_date = formData.date;

          await api.imports.create(submitData);
          showNotification(
            "success",
            "Thành công",
            "Tạo phiếu nhập thành công"
          );
        } else {
          submitData.export_type = formData.type;
          submitData.export_date = formData.date;

          await api.exports.create(submitData);
          showNotification(
            "success",
            "Thành công",
            "Tạo phiếu xuất thành công"
          );
        }
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
      } else if (type === "export") {
        // <<< THÊM "else if"
        await api.exports.updateStatus(uuid, status);
      } else if (type === "internal") {
        // <<< THÊM LOGIC MỚI
        await api.internal_transfers.updateStatus(uuid, status);
      }
      showNotification(
        "success",
        "Thành công",
        "Cập nhật trạng thái thành công"
      );
      fetchData();
      handleCloseDialog();
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
    switch (status) {
      case "pending":
        return "Chờ xử lý";
      case "completed":
        return "Đã duyệt";
      case "cancelled":
        return "Đã hủy";
      default:
        return status;
    }
  };

  const getMachineStatusLabel = (status) => {
    return getStatusInfo(status).label;
  };

  const getTypeLabel = (type) => {
    const typeMap = {
      internal: "Điều chuyển nội bộ", // Vẫn giữ lại label này
      // Import types
      borrowed: "Nhập mượn",
      rented: "Nhập thuê",
      purchased: "Nhập mua mới",
      maintenance_return: "Nhập sau bảo trì",
      borrowed_out_return: "Nhập trả (từ cho mượn)",
      // Export types
      maintenance: "Xuất bảo trì",
      borrowed_out: "Xuất cho mượn",
      liquidation: "Xuất thanh lý",
      borrowed_return: "Xuất trả (máy mượn)",
      rented_return: "Xuất trả (máy thuê)",
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
    const data =
      activeTab === 0 ? imports : activeTab === 1 ? exports : transfers; // <<< CẬP NHẬT

    if (loading) {
      return (
        <TableRow>
          <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
            <CircularProgress />
          </TableCell>
        </TableRow>
      );
    }

    if (data.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
            <Typography variant="body1" color="text.secondary">
              Không có dữ liệu
            </Typography>
          </TableCell>
        </TableRow>
      );
    }

    return data.map((item) => {
      // <<< START: CẬP NHẬT LOGIC LẤY DỮ LIỆU >>>
      const uuid =
        item.uuid_machine_import ||
        item.uuid_machine_export ||
        item.uuid_machine_internal_transfer;
      const date = item.import_date || item.export_date || item.transfer_date;
      const type = item.import_type || item.export_type || "internal";
      // <<< END

      return (
        <TableRow
          key={uuid}
          hover
          onClick={() =>
            handleOpenDialog(
              "view",
              // <<< START: CẬP NHẬT LOGIC CLICK >>>
              activeTab === 0
                ? "import"
                : activeTab === 1
                ? "export"
                : "internal",
              // <<< END >>>
              item
            )
          }
          sx={{ cursor: "pointer" }}
        >
          <TableCell>{formatDate(date)}</TableCell>
          <TableCell>{getTypeLabel(type)}</TableCell>

          {/* <<< START: CỘT VỊ TRÍ (ĐÃ SỬA) >>> */}
          {activeTab === 2 ? (
            <>
              {/* <TableCell>{item.from_location_name || "-"}</TableCell> */}{" "}
              {/* <<< ĐÃ XÓA */}
              <TableCell colSpan={2}>
                {item.to_location_name || "-"}
              </TableCell>{" "}
              {/* <<< ĐÃ SỬA */}
            </>
          ) : (
            <TableCell colSpan={2}>
              {item.to_location_name || "Bên ngoài (Xuất/Nhập)"}
            </TableCell>
          )}
          {/* <<< END: CỘT VỊ TRÍ >>> */}

          <TableCell align="center">{item.machine_count || 0}</TableCell>
          <TableCell>
            <Chip
              label={getStatusLabel(item.status)}
              color={getStatusColor(item.status)}
              size="small"
            />
          </TableCell>
          <TableCell>{item.note || "-"}</TableCell>
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
                Tạo và quản lý phiếu nhập xuất, điều chuyển máy móc
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
                {/* <<< START: THÊM TAB MỚI >>> */}
                <Tab
                  icon={<Autorenew />}
                  label="Điều chuyển"
                  iconPosition="start"
                />
                {/* <<< END: THÊM TAB MỚI >>> */}
              </Tabs>

              <Stack direction="row" spacing={2}>
                {/* NÚT TẠO PHIẾU (Cập nhật) */}
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() =>
                    handleOpenDialog(
                      "create",
                      // <<< START: CẬP NHẬT LOGIC NÚT BẤM >>>
                      activeTab === 0
                        ? "import"
                        : activeTab === 1
                        ? "export"
                        : "internal"
                      // <<< END >>>
                    )
                  }
                  sx={{
                    borderRadius: "12px",
                    background: "linear-gradient(45deg, #2e7d32, #4caf50)",
                    px: 4,
                    py: 1.5,
                    "&:hover": {
                      transform: "translateY(-2px)",
                      boxShadow: "0 8px 25px rgba(46, 125, 50, 0.3)",
                    },
                    transition: "all 0.3s ease",
                  }}
                >
                  Tạo phiếu {/* <<< START: CẬP NHẬT LOGIC NÚT BẤM >>> */}
                  {activeTab === 0
                    ? "nhập"
                    : activeTab === 1
                    ? "xuất"
                    : "điều chuyển"}
                  {/* <<< END >>> */}
                </Button>

                {/* NÚT LÀM MỚI */}
                <Button
                  variant="contained"
                  startIcon={<Refresh />}
                  onClick={fetchData}
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
            </Box>

            {/* Filters */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid size={{ xs: 12, md: activeTab === 2 ? 12 : 6 }}>
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
                  <MenuItem value="completed">Đã duyệt</MenuItem>
                  <MenuItem value="cancelled">Đã hủy</MenuItem>
                </TextField>
              </Grid>

              {/* <<< START: ẨN KHI LÀ TAB ĐIỀU CHUYỂN >>> */}
              {activeTab !== 2 && (
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
                            Nhập thuê
                          </MenuItem>,
                          <MenuItem key="borrowed" value="borrowed">
                            Nhập mượn
                          </MenuItem>,
                          <MenuItem
                            key="borrowed_out_return"
                            value="borrowed_out_return"
                          >
                            Nhập trả (từ cho mượn)
                          </MenuItem>,
                          // <<< "internal" ĐÃ BỊ XÓA
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
                          <MenuItem
                            key="borrowed_return"
                            value="borrowed_return"
                          >
                            Xuất trả (máy mượn)
                          </MenuItem>,
                          <MenuItem key="rented_return" value="rented_return">
                            Xuất trả (máy thuê)
                          </MenuItem>,
                          // <<< "internal" ĐÃ BỊ XÓA
                        ]}
                  </TextField>
                </Grid>
              )}
              {/* <<< END: ẨN >>> */}
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

                    {/* <<< START: THAY ĐỔI TIÊU ĐỀ BẢNG (ĐÃ SỬA) >>> */}
                    {activeTab === 2 ? (
                      <>
                        {/* <TableCell sx={{ fontWeight: 600 }}>Từ vị trí</TableCell> */}{" "}
                        {/* <<< ĐÃ XÓA */}
                        <TableCell sx={{ fontWeight: 600 }} colSpan={2}>
                          Đến vị trí
                        </TableCell>{" "}
                        {/* <<< ĐÃ SỬA */}
                      </>
                    ) : (
                      <TableCell sx={{ fontWeight: 600 }} colSpan={2}>
                        {activeTab === 0 ? "Nhập vào" : "Xuất đến"}
                      </TableCell>
                    )}
                    {/* <<< END: THAY ĐỔI TIÊU ĐỀ BẢNG >>> */}

                    <TableCell sx={{ fontWeight: 600 }} align="center">
                      Số lượng máy
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Trạng thái</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Ghi chú</TableCell>
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
          maxWidth="lg"
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
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {dialogMode === "create"
                  ? `Tạo phiếu ${
                      dialogType === "import"
                        ? "nhập"
                        : dialogType === "export"
                        ? "xuất"
                        : "điều chuyển" // <<< CẬP NHẬT
                    }`
                  : "Chi tiết phiếu"}
              </Typography>

              {dialogMode === "view" && selectedTicket && (
                <Chip
                  label={getStatusLabel(selectedTicket.status)}
                  color={getStatusColor(selectedTicket.status)}
                  size="medium"
                />
              )}
            </Box>
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
                {/* <<< START: ẨN KHI LÀ PHIẾU ĐIỀU CHUYỂN >>> */}
                {dialogType !== "internal" && (
                  <TextField
                    fullWidth
                    select
                    label={`Loại ${dialogType === "import" ? "nhập" : "xuất"}`}
                    value={formData.type}
                    onChange={(e) => handleFormChange("type", e.target.value)}
                    disabled={dialogMode === "view"}
                    required
                    sx={DISABLED_VIEW_SX}
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
                            Nhập thuê
                          </MenuItem>,
                          <MenuItem key="borrowed" value="borrowed">
                            Nhập mượn
                          </MenuItem>,
                          <MenuItem
                            key="borrowed_out_return"
                            value="borrowed_out_return"
                          >
                            Nhập trả (từ cho mượn)
                          </MenuItem>,
                          // <<< "internal" ĐÃ BỊ XÓA
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
                          <MenuItem
                            key="borrowed_return"
                            value="borrowed_return"
                          >
                            Xuất trả (máy mượn)
                          </MenuItem>,
                          <MenuItem key="rented_return" value="rented_return">
                            Xuất trả (máy thuê)
                          </MenuItem>,
                          // <<< "internal" ĐÃ BỊ XÓA
                        ]}
                  </TextField>
                )}
                {/* <<< END: ẨN >>> */}

                {["borrowed", "rented", "borrowed_out"].includes(
                  formData.type
                ) && (
                  <Card variant="outlined" sx={{ borderRadius: "12px" }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Thông tin bổ sung
                      </Typography>
                      <Stack spacing={2}>
                        <Autocomplete
                          fullWidth
                          options={externalLocations}
                          loading={externalLocationLoading}
                          getOptionLabel={(option) =>
                            option.name_location || ""
                          }
                          onChange={(event, newValue) => {
                            handleFormChange(
                              "is_borrowed_or_rented_or_borrowed_out_name",
                              newValue ? newValue.name_location : ""
                            );
                          }}
                          value={
                            externalLocations.find(
                              (loc) =>
                                loc.name_location ===
                                formData.is_borrowed_or_rented_or_borrowed_out_name
                            ) || null
                          }
                          disabled={dialogMode === "view"}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="Tên người/đơn vị (mượn/thuê/cho mượn)"
                              required
                              sx={DISABLED_VIEW_SX}
                              InputProps={{
                                ...params.InputProps,
                                endAdornment: (
                                  <>
                                    {externalLocationLoading ? (
                                      <CircularProgress
                                        color="inherit"
                                        size={20}
                                      />
                                    ) : null}
                                    {params.InputProps.endAdornment}
                                  </>
                                ),
                              }}
                            />
                          )}
                          sx={DISABLED_VIEW_SX}
                        />
                        <TextField
                          fullWidth
                          type="date"
                          label="Ngày (mượn/thuê/cho mượn)"
                          value={
                            formData.is_borrowed_or_rented_or_borrowed_out_date
                          }
                          onChange={(e) =>
                            handleFormChange(
                              "is_borrowed_or_rented_or_borrowed_out_date",
                              e.target.value
                            )
                          }
                          disabled={dialogMode === "view"}
                          required
                          InputLabelProps={{ shrink: true }}
                          sx={DISABLED_VIEW_SX}
                        />
                        <TextField
                          fullWidth
                          type="date"
                          label="Ngày dự kiến trả"
                          value={
                            formData.is_borrowed_or_rented_or_borrowed_out_return_date
                          }
                          onChange={(e) =>
                            handleFormChange(
                              "is_borrowed_or_rented_or_borrowed_out_return_date",
                              e.target.value
                            )
                          }
                          disabled={dialogMode === "view"}
                          InputLabelProps={{ shrink: true }}
                          sx={DISABLED_VIEW_SX}
                        />
                      </Stack>
                    </CardContent>
                  </Card>
                )}

                <TextField
                  fullWidth
                  type="date"
                  label={
                    dialogType === "internal" ? "Ngày điều chuyển" : "Ngày"
                  } // <<< CẬP NHẬT
                  value={formData.date}
                  onChange={(e) => handleFormChange("date", e.target.value)}
                  disabled={dialogMode === "view"}
                  required
                  InputLabelProps={{ shrink: true }}
                  sx={DISABLED_VIEW_SX}
                />

                {/* <<< KHỐI "TỪ VỊ TRÍ" ĐÃ BỊ XÓA >>> */}

                <Autocomplete
                  fullWidth
                  options={filteredLocations}
                  getOptionLabel={(option) => option.name_location || ""}
                  onChange={(event, newValue) => {
                    handleFormChange(
                      "to_location_uuid",
                      newValue ? newValue.uuid_location : ""
                    );
                  }}
                  value={
                    filteredLocations.find(
                      (loc) => loc.uuid_location === formData.to_location_uuid
                    ) || null
                  }
                  disabled={dialogMode === "view" || locationLoading}
                  loading={locationLoading}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label={
                        dialogType === "import"
                          ? "Nhập vào"
                          : dialogType === "export"
                          ? "Xuất đến"
                          : "Đến vị trí" // <<< CẬP NHẬT LABEL
                      }
                      required
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          borderRadius: "12px",
                        },
                      }}
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {locationLoading ? (
                              <CircularProgress color="inherit" size={20} />
                            ) : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                  sx={DISABLED_VIEW_SX}
                />

                {/* --- PHẦN TÌM KIẾM VÀ CHỌN MÁY MÓC --- */}
                {dialogMode === "create" && (
                  <Card variant="outlined" sx={{ borderRadius: "12px" }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Chọn máy móc ({formData.machines.length})
                      </Typography>

                      <Button
                        variant="outlined"
                        startIcon={<QrCode2 />}
                        onClick={() => setOpenScanDialog(true)}
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
                                            {machine.type_machine} -{" "}
                                            {machine.model_machine}
                                            <Chip
                                              label={getMachineStatusLabel(
                                                machine.current_status
                                              )}
                                              size="small"
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
                                      {machine.type_machine} -{" "}
                                      {machine.model_machine}
                                      <Chip
                                        label={getMachineStatusLabel(
                                          machine.current_status
                                        )}
                                        size="small"
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

                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Ghi chú"
                  value={formData.note}
                  onChange={(e) => handleFormChange("note", e.target.value)}
                  disabled={dialogMode === "view"}
                  sx={DISABLED_VIEW_SX}
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
                                Loại máy
                              </TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>
                                Model
                              </TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>
                                Serial
                              </TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>
                                Vị trí hiện tại
                              </TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>
                                Loại
                              </TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>
                                Trạng thái
                              </TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>
                                Ghi chú
                              </TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {formData.machines.map((machine, index) => (
                              <TableRow key={machine.uuid_machine || index}>
                                <TableCell>{machine.code_machine}</TableCell>
                                <TableCell>{machine.type_machine}</TableCell>
                                <TableCell>{machine.model_machine}</TableCell>
                                <TableCell>
                                  {machine.serial_machine || "-"}
                                </TableCell>
                                <TableCell>
                                  {machine.name_location || "-"}
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
          <DialogActions sx={{ p: 3, justifyContent: "space-between" }}>
            {/* Cụm bên trái (Duyệt - Hủy) */}
            <Box sx={{ display: "flex", gap: 2 }}>
              {dialogMode === "view" && selectedTicket?.status === "pending" ? (
                <>
                  <Button
                    variant="contained"
                    color="success"
                    onClick={() =>
                      handleUpdateStatus(
                        selectedTicket.uuid_machine_import ||
                          selectedTicket.uuid_machine_export ||
                          selectedTicket.uuid_machine_internal_transfer, // <<< CẬP NHẬT
                        "completed",
                        dialogType
                      )
                    }
                    disabled={loading}
                    sx={{ borderRadius: "12px", px: 3 }}
                  >
                    {loading ? <CircularProgress size={24} /> : "Duyệt phiếu"}
                  </Button>
                  <Button
                    variant="contained"
                    color="error"
                    onClick={() =>
                      handleUpdateStatus(
                        selectedTicket.uuid_machine_import ||
                          selectedTicket.uuid_machine_export ||
                          selectedTicket.uuid_machine_internal_transfer, // <<< CẬP NHẬT
                        "cancelled",
                        dialogType
                      )
                    }
                    disabled={loading}
                    sx={{ borderRadius: "12px", px: 3 }}
                  >
                    {loading ? <CircularProgress size={24} /> : "Hủy phiếu"}
                  </Button>
                </>
              ) : (
                <Box sx={{ width: "1px" }} />
              )}
            </Box>

            {/* Cụm bên phải (Đóng - Tạo) */}
            <Box sx={{ display: "flex", gap: 2 }}>
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
            </Box>
          </DialogActions>
        </Dialog>

        {/* --- COMPONENT QR SCANNER --- */}
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
