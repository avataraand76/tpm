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
  useTheme,
  useMediaQuery,
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
import { useAuth } from "../hooks/useAuth";

const TicketManagementPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { user, permissions } = useAuth();
  const isAdmin = permissions.includes("admin");
  const canEdit = permissions.includes("edit");

  const phongCoDienId = 14;
  const coDienXuongIds = [10, 30, 24, 31];

  const isPhongCoDien =
    canEdit && !isAdmin && user?.phongban_id === phongCoDienId;
  const isCoDienXuong =
    canEdit && !isAdmin && coDienXuongIds.includes(user?.phongban_id);
  const isViewOnly = permissions.includes("view") && !isAdmin && !canEdit;
  const hasImportExportTabs = isAdmin || isPhongCoDien || isViewOnly;

  const [activeTab, setActiveTab] = useState(isCoDienXuong ? 2 : 0); // 0: Import, 1: Export, 2: Internal, 3: Update Location
  const [imports, setImports] = useState([]);
  const [exports, setExports] = useState([]);
  const [transfers, setTransfers] = useState([]);
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
  const [dialogMode, setDialogMode] = useState("create"); // create, view
  const [dialogType, setDialogType] = useState("import"); // import, export, internal
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Form states (for create/view dialog)
  const [formData, setFormData] = useState({
    to_location_uuid: "",
    type: "",
    date: new Date().toISOString().split("T")[0],
    note: "",
    machines: [],
    is_borrowed_or_rented_or_borrowed_out_name: "",
    is_borrowed_or_rented_or_borrowed_out_date: "",
    is_borrowed_or_rented_or_borrowed_out_return_date: "",
  });

  // States for machine search (used in both dialog and update tab)
  const [searchMachineTerm, setSearchMachineTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchPage, setSearchPage] = useState(1);
  const [searchTotalPages, setSearchTotalPages] = useState(1);
  const SEARCH_LIMIT = 5;

  // States for QR Scanner
  const [openScanDialog, setOpenScanDialog] = useState(false);
  const [scannerApiParams, setScannerApiParams] = useState({});

  // Snackbar
  const [notification, setNotification] = useState({
    open: false,
    severity: "success",
    title: "",
    message: "",
  });

  // Config statuses
  const STATUS_CONFIG = {
    available: { bg: "#2e7d3222", color: "#2e7d32", label: "Sẵn sàng" },
    in_use: { bg: "#667eea22", color: "#667eea", label: "Đang sử dụng" },
    maintenance: { bg: "#ff980022", color: "#ff9800", label: "Bảo trì" },
    broken: { bg: "#9e9e9e22", color: "#9e9e9e", label: "Máy hư" },
    rented: { bg: "#673ab722", color: "#673ab7", label: "Đang thuê" },
    rented_return: {
      bg: "#673ab722",
      color: "#673ab7",
      label: "Đã trả (máy thuê)",
    },
    borrowed: { bg: "#03a9f422", color: "#03a9f4", label: "Đang mượn" },
    borrowed_return: {
      bg: "#03a9f422",
      color: "#03a9f4",
      label: "Đã trả (máy mượn)",
    },
    borrowed_out: { bg: "#00bcd422", color: "#00bcd4", label: "Cho mượn" },
    liquidation: { bg: "#f4433622", color: "#f44336", label: "Thanh lý" },
    disabled: { bg: "#9e9e9e22", color: "#9e9e9e", label: "Vô hiệu hóa" },
    pending: { bg: "#ff980022", color: "#ff9800", label: "Chờ xử lý" },
    completed: { bg: "#2e7d3222", color: "#2e7d32", label: "Đã duyệt" },
    cancelled: { bg: "#f4433622", color: "#f44336", label: "Đã hủy" },
  };

  // Common style for disabled/view fields
  const DISABLED_VIEW_SX = {
    "& .MuiInputBase-root.Mui-disabled": {
      backgroundColor: "#fffbe5",
      "& fieldset": { borderColor: "#f44336 !important" },
      "& .MuiInputBase-input": {
        color: "#f44336",
        WebkitTextFillColor: "#f44336 !important",
        fontWeight: 600,
      },
      "& .MuiFormLabel-root": { color: "#f44336 !important" },
    },
    "& .MuiOutlinedInput-root.Mui-disabled": { backgroundColor: "#fffbe5" },
    "& .MuiOutlinedInput-root": { borderRadius: "12px" },
  };

  // Helper functions
  const getStatusInfo = (statusKey) =>
    STATUS_CONFIG[statusKey] || {
      bg: "#9e9e9e22",
      color: "#9e9e9e",
      label: statusKey,
    };
  const showNotification = useCallback(
    (severity, title, message) =>
      setNotification({ open: true, severity, title, message }),
    []
  );
  const formatDate = (dateString) =>
    dateString
      ? new Date(dateString).toLocaleDateString("vi-VN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
      : "-";

  // --- Data Fetching ---
  const fetchLocations = useCallback(
    async (filterType = null, extraParams = {}) => {
      setLocationLoading(true);
      try {
        const params = { ...extraParams };
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

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20, status: statusFilter };
      let response;
      if (activeTab === 0) {
        params.import_type = typeFilter;
        response = await api.imports.getAll(params);
        setImports(response.data);
      } else if (activeTab === 1) {
        params.export_type = typeFilter;
        response = await api.exports.getAll(params);
        setExports(response.data);
      } else if (activeTab === 2) {
        delete params.import_type;
        delete params.export_type;
        response = await api.internal_transfers.getAll(params);
        setTransfers(response.data);
      }
      setTotalPages(response.pagination.totalPages);
    } catch (error) {
      console.error("Error fetching data:", error);
      showNotification("error", "Tải thất bại", "Lỗi khi tải dữ liệu phiếu");
    } finally {
      setLoading(false);
    }
  }, [activeTab, page, statusFilter, typeFilter, showNotification]);

  const searchMachines = useCallback(
    async (searchTerm, pageNumber = 1, filters = {}) => {
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
          ...filters,
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
  useEffect(() => {
    setScannerApiParams(getMachineFiltersForDialog());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openDialog, dialogType, formData.type, isCoDienXuong]); // <<< THÊM isCoDienXuong VÀO DEPENDENCY

  // --- Handlers ---
  const handleTabChange = (event, newValue) => {
    let logicalTabIndex;

    if (hasImportExportTabs) {
      // Admin hoặc Phòng Cơ Điện: Index hiển thị = Index logic
      // 0 -> 0 (Nhập), 1 -> 1 (Xuất), 2 -> 2 (Điều chuyển), 3 -> 3 (Cập nhật)
      logicalTabIndex = newValue;
    } else {
      // Cơ Điện Xưởng: Index hiển thị bị lệch 2
      // 0 -> 2 (Điều chuyển)
      // 1 -> 3 (Cập nhật)
      logicalTabIndex = newValue + 2;
    }

    setActiveTab(logicalTabIndex); // Luôn set state về giá trị logic (0, 1, 2, 3)
    setPage(1);
    setStatusFilter("");
    setTypeFilter("");
  };

  const getMachineFiltersForDialog = () => {
    let filters = {};

    // Chỉ áp dụng filter khi dialog đang mở
    if (openDialog) {
      // Rule (k): Điều chuyển nội bộ
      if (dialogType === "internal") {
        filters.ticket_type = "internal";

        // Yêu cầu 4: Lọc máy cho Cơ Điện Xưởng
        if (isCoDienXuong) {
          filters.filter_by_phongban_id = user.phongban_id;
        }
      }
      // Rules (a-j): Các loại phiếu Nhập/Xuất
      else {
        const currentTicketType = formData.type;
        if (currentTicketType) {
          filters.ticket_type = currentTicketType;
        }
      }
    }

    return filters;
  };

  // Handlers for Search
  const handleSearchTermChange = (e) => {
    const term = e.target.value;
    setSearchMachineTerm(term);
    const filters = getMachineFiltersForDialog();
    searchMachines(term, 1, filters);
  };
  const handleSearchPageChange = (event, value) => {
    setSearchPage(value);
    const filters = getMachineFiltersForDialog();
    if (searchMachineTerm && searchMachineTerm.length >= 2)
      searchMachines(searchMachineTerm, value, filters);
  };

  // Helper for filtering locations in dialog
  const getLocationFilterForType = (type) => {
    if (
      [
        "purchased",
        "maintenance_return",
        "borrowed_out_return",
        "borrowed",
        "rented",
      ].includes(type)
    )
      return "warehouse_only";
    if (
      [
        "maintenance",
        "liquidation",
        "borrowed_out",
        "borrowed_return",
        "rented_return",
      ].includes(type)
    )
      return "external_only";
    return null; // No filter for import/export if type doesn't match
  };

  // Handlers for Dialog (Create/View Ticket)
  const handleOpenDialog = async (mode, type, ticket = null) => {
    setDialogMode(mode);
    setDialogType(type);
    setOpenDialog(true);
    setSearchResults([]);
    setSearchMachineTerm("");
    setSearchPage(1);
    setOpenScanDialog(false);
    setFilteredLocations([]);

    if (mode === "create") {
      setSelectedTicket(null);
      setFormData({
        to_location_uuid: "",
        type: "",
        date: new Date().toISOString().split("T")[0],
        note: "",
        machines: [],
        is_borrowed_or_rented_or_borrowed_out_name: "",
        is_borrowed_or_rented_or_borrowed_out_date: "",
        is_borrowed_or_rented_or_borrowed_out_return_date: "",
      });
      if (type === "internal") {
        // Yêu cầu 2: Luôn lọc bỏ vị trí của phòng ban mình
        await fetchLocations("internal");
      } else {
        await fetchLocations();
      }
    } else if (mode === "view" && ticket) {
      setSelectedTicket(ticket);
      setDetailLoading(true);
      setFormData({
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
          ticket.uuid_machine_internal_transfer;
        let response, ticketDetails, ticketDate;
        if (type === "import") {
          response = await api.imports.getById(uuid);
          ticketDetails = response.data.import;
          ticketDate = ticketDetails.import_date;
        } else if (type === "export") {
          response = await api.exports.getById(uuid);
          ticketDetails = response.data.export;
          ticketDate = ticketDetails.export_date;
        } else if (type === "internal") {
          response = await api.internal_transfers.getById(uuid);
          ticketDetails = response.data.transfer;
          ticketDate = ticketDetails.transfer_date;
        }

        const ticketType =
          ticketDetails.import_type || ticketDetails.export_type || "internal";
        let filter =
          type === "internal"
            ? "internal"
            : getLocationFilterForType(ticketType);

        // Khi xem, không lọc theo quyền, chỉ lọc theo loại phiếu
        await fetchLocations(filter);

        setFormData({
          to_location_uuid: ticketDetails.to_location_uuid || "",
          type: ticketType || "",
          date: ticketDate
            ? new Date(ticketDate).toISOString().split("T")[0]
            : "",
          note: ticketDetails.note || "",
          machines: response.data.details.map((d) => ({ ...d })),
          creator_ma_nv: ticketDetails.creator_ma_nv,
          creator_ten_nv: ticketDetails.creator_ten_nv,
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
    if (field === "type" && dialogType !== "internal") {
      const filter = getLocationFilterForType(value);
      fetchLocations(filter);
      setFormData((prev) => ({
        ...prev,
        [field]: value,
        to_location_uuid: "",
        is_borrowed_or_rented_or_borrowed_out_name: "",
        is_borrowed_or_rented_or_borrowed_out_date: "",
        is_borrowed_or_rented_or_borrowed_out_return_date: "",
      }));

      setSearchMachineTerm("");
      setSearchResults([]);
      setSearchPage(1);
      setSearchTotalPages(1);
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }
  };

  // Handlers for selecting/removing machines in Dialog
  const handleSelectMachine = (machine) => {
    setFormData((prev) => ({
      ...prev,
      machines: prev.machines.some(
        (m) => m.uuid_machine === machine.uuid_machine
      )
        ? prev.machines.filter((m) => m.uuid_machine !== machine.uuid_machine)
        : [...prev.machines, { ...machine, note: "" }],
    }));
  };
  const handleAddMachineFromScanner = (machine) => handleSelectMachine(machine); // Alias for clarity
  const handleRemoveSelectedMachine = (uuid_machine) =>
    setFormData((prev) => ({
      ...prev,
      machines: prev.machines.filter((m) => m.uuid_machine !== uuid_machine),
    }));
  const handleUpdateMachineNote = (uuid_machine, note) =>
    setFormData((prev) => ({
      ...prev,
      machines: prev.machines.map((m) =>
        m.uuid_machine === uuid_machine ? { ...m, note } : m
      ),
    }));

  // Handler for submitting Create Ticket Dialog
  const handleSubmit = async () => {
    setLoading(true);
    try {
      const machinesToSend = formData.machines
        .map((m) => ({ uuid_machine: m.uuid_machine, note: m.note }))
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

      let submitData = { note: formData.note, machines: machinesToSend };
      let successMessage = "";
      let apiCall;

      if (dialogType === "internal") {
        if (!formData.to_location_uuid) {
          showNotification(
            "error",
            "Lỗi nhập liệu",
            "Vui lòng chọn vị trí đến."
          );
          setLoading(false);
          return;
        }
        submitData = {
          ...submitData,
          to_location_uuid: formData.to_location_uuid,
          transfer_date: formData.date,
        };
        apiCall = api.internal_transfers.create(submitData);
        successMessage = "Tạo phiếu điều chuyển thành công";
      } else {
        // Import or Export
        if (!formData.to_location_uuid) {
          showNotification(
            "error",
            "Lỗi nhập liệu",
            "Vui lòng chọn vị trí nhập/xuất."
          );
          setLoading(false);
          return;
        }
        submitData = {
          ...submitData,
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
          apiCall = api.imports.create(submitData);
          successMessage = "Tạo phiếu nhập thành công";
        } else {
          // Export
          submitData.export_type = formData.type;
          submitData.export_date = formData.date;
          apiCall = api.exports.create(submitData);
          successMessage = "Tạo phiếu xuất thành công";
        }
      }
      await apiCall;
      showNotification("success", "Thành công", successMessage);
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

  // Handler for updating ticket status (Approve/Cancel)
  const handleUpdateStatus = async (uuid, status, type) => {
    try {
      if (type === "import") {
        await api.imports.updateStatus(uuid, status);
      } else if (type === "export") {
        await api.exports.updateStatus(uuid, status);
      } else if (type === "internal") {
        // Chỉ xử lý 'cancelled' ở đây
        if (status === "cancelled") {
          await api.internal_transfers.cancel(uuid);
        } else {
          console.warn("Chỉ có thể Hủy phiếu từ hàm này");
          return;
        }
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

  const handleConfirmTicket = async (uuid) => {
    try {
      await api.internal_transfers.confirm(uuid);
      showNotification("success", "Thành công", "Xác nhận phiếu thành công");
      fetchData();
      handleCloseDialog();
    } catch (error) {
      console.error("Error confirming ticket:", error);
      showNotification(
        "error",
        "Thất bại",
        error.response?.data?.message || "Lỗi khi xác nhận phiếu"
      );
    }
  };

  const handleApproveTicket = async (uuid) => {
    try {
      await api.internal_transfers.approve(uuid);
      showNotification("success", "Thành công", "Duyệt phiếu thành công");
      fetchData();
      handleCloseDialog();
    } catch (error) {
      console.error("Error approving ticket:", error);
      showNotification(
        "error",
        "Thất bại",
        error.response?.data?.message || "Lỗi khi duyệt phiếu"
      );
    }
  };

  // Handler for closing notification
  const handleCloseNotification = (event, reason) => {
    if (reason === "clickaway") return;
    setNotification({ ...notification, open: false });
  };

  // --- Render Helpers ---
  const getStatusColor = (status) =>
    ({
      pending: "warning",
      pending_confirmation: "warning",
      pending_approval: "warning",
      completed: "success",
      cancelled: "error",
    }[status] || "default");
  const getStatusLabel = (status) =>
    ({
      pending: "Chờ duyệt",
      pending_confirmation: "Chờ xác nhận",
      pending_approval: "Chờ duyệt",
      completed: "Đã duyệt",
      cancelled: "Đã hủy",
    }[status] || status);
  const getMachineStatusLabel = (status) => getStatusInfo(status).label;
  const getTypeLabel = (type) =>
    ({
      internal: "Điều chuyển",
      borrowed: "Nhập mượn",
      rented: "Nhập thuê",
      purchased: "Nhập mua mới",
      maintenance_return: "Nhập sau bảo trì",
      borrowed_out_return: "Nhập trả (từ cho mượn)",
      maintenance: "Xuất bảo trì",
      borrowed_out: "Xuất cho mượn",
      liquidation: "Xuất thanh lý",
      borrowed_return: "Xuất trả (máy mượn)",
      rented_return: "Xuất trả (máy thuê)",
    }[type] || type);

  // Render Table Content for Tabs 0, 1, 2
  const renderTableContent = () => {
    const data =
      activeTab === 0 ? imports : activeTab === 1 ? exports : transfers;
    if (loading)
      return (
        <TableRow>
          <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
            <CircularProgress />
          </TableCell>
        </TableRow>
      );
    if (data.length === 0)
      return (
        <TableRow>
          <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
            <Typography variant="body1" color="text.secondary">
              Không có dữ liệu
            </Typography>
          </TableCell>
        </TableRow>
      );
    return data.map((item) => {
      const uuid =
        item.uuid_machine_import ||
        item.uuid_machine_export ||
        item.uuid_machine_internal_transfer;
      const date = item.import_date || item.export_date || item.transfer_date;
      const type = item.import_type || item.export_type || "internal";
      return (
        <TableRow
          key={uuid}
          hover
          onClick={() =>
            handleOpenDialog(
              "view",
              activeTab === 0
                ? "import"
                : activeTab === 1
                ? "export"
                : "internal",
              item
            )
          }
          sx={{ cursor: "pointer" }}
        >
          <TableCell>{formatDate(date)}</TableCell>
          <TableCell>{getTypeLabel(type)}</TableCell>
          {activeTab === 2 ? (
            <TableCell colSpan={2}>{item.to_location_name || "-"}</TableCell>
          ) : (
            <TableCell colSpan={2}>{item.to_location_name || "-"}</TableCell>
          )}
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

  // --- JSX ---
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
                Quản lý phiếu
              </Typography>
              <Typography
                variant={isMobile ? "body1" : "h6"}
                color="text.secondary"
              >
                Tạo và quản lý phiếu nhập xuất, điều chuyển máy móc
              </Typography>
            </Box>
          </Stack>
        </Box>

        {/* Main Card */}
        <Card
          elevation={0}
          sx={{ borderRadius: "20px", border: "1px solid rgba(0, 0, 0, 0.05)" }}
        >
          <CardContent sx={{ p: 4 }}>
            {/* Tabs and Actions */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: { xs: "stretch", md: "center" },
                flexDirection: { xs: "column", md: "row" },
                mb: 3,
                gap: 2,
              }}
            >
              <Tabs
                // Ánh xạ state logic (0,1,2,3) về state hiển thị (0,1,2,3 hoặc 0,1)
                value={hasImportExportTabs ? activeTab : activeTab - 2}
                onChange={handleTabChange}
                variant={isMobile ? "scrollable" : "standard"}
                allowScrollButtonsMobile
                sx={{
                  width: { xs: "100%", md: "auto" },
                  "& .MuiTab-root": {
                    fontWeight: 600,
                    fontSize: isMobile ? "0.8rem" : "1rem",
                    minWidth: { xs: 100, md: 140 },
                    borderRadius: "12px",
                    margin: "0 4px",
                    transition: "all 0.3s ease",
                    "&.Mui-selected": {
                      color: "#667eea",
                      background: "rgba(102, 126, 234, 0.1)",
                    },
                  },
                  "& .MuiTabs-indicator": { display: "none" },
                }}
              >
                {hasImportExportTabs && (
                  <Tab
                    icon={<FileDownload />}
                    label="Phiếu nhập"
                    iconPosition="start"
                  />
                )}
                {hasImportExportTabs && (
                  <Tab
                    icon={<FileUpload />}
                    label="Phiếu xuất"
                    iconPosition="start"
                  />
                )}

                <Tab
                  icon={<Autorenew />}
                  label="Điều chuyển / Cập nhật vị trí"
                  iconPosition="start"
                />
              </Tabs>
              {activeTab === 2 ? (
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={2}
                  sx={{ width: { xs: "100%", md: "auto" } }}
                >
                  {(isAdmin || canEdit) && (
                    <Button
                      variant="contained"
                      startIcon={<Add />}
                      onClick={() => handleOpenDialog("create", "internal")}
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
                        width: { xs: "100%", sm: "auto" },
                      }}
                    >
                      Tạo phiếu điều chuyển
                    </Button>
                  )}

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
                      width: { xs: "100%", sm: "auto" },
                    }}
                  >
                    Làm mới
                  </Button>
                </Stack>
              ) : (
                // Nếu là tab Nhập / Xuất
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={2}
                  sx={{ width: { xs: "100%", md: "auto" } }}
                >
                  {(isAdmin || isPhongCoDien) && ( // Chỉ Admin/PCD mới thấy nút tạo
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
                        background: "linear-gradient(45deg, #2e7d32, #4caf50)",
                        px: 4,
                        py: 1.5,
                        "&:hover": {
                          transform: "translateY(-2px)",
                          boxShadow: "0 8px 25px rgba(46, 125, 50, 0.3)",
                        },
                        transition: "all 0.3s ease",
                        width: { xs: "100%", sm: "auto" },
                      }}
                    >
                      Tạo phiếu {activeTab === 0 ? "nhập" : "xuất"}
                    </Button>
                  )}
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
                        /* ... */
                      },
                      width: { xs: "100%", sm: "auto" },
                    }}
                  >
                    Làm mới
                  </Button>
                </Stack>
              )}
            </Box>

            {/* Content for Tabs 0, 1, 2 (Filters, Table, Pagination) */}

            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid size={{ xs: 12, md: activeTab === 2 ? 12 : 6 }}>
                <TextField
                  fullWidth
                  select
                  label="Trạng thái"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  sx={{
                    "& .MuiOutlinedInput-root": { borderRadius: "12px" },
                  }}
                >
                  <MenuItem value="">Tất cả</MenuItem>

                  {activeTab === 2
                    ? // Tab Điều chuyển (Internal)
                      [
                        <MenuItem
                          key="pending_confirmation"
                          value="pending_confirmation"
                        >
                          Chờ xác nhận
                        </MenuItem>,
                        <MenuItem
                          key="pending_approval"
                          value="pending_approval"
                        >
                          Chờ duyệt
                        </MenuItem>,
                        <MenuItem key="completed" value="completed">
                          Đã duyệt
                        </MenuItem>,
                        <MenuItem key="cancelled" value="cancelled">
                          Đã hủy
                        </MenuItem>,
                      ]
                    : // Tab Nhập (Import) hoặc Xuất (Export)
                      [
                        <MenuItem key="pending" value="pending">
                          Chờ duyệt
                        </MenuItem>,
                        <MenuItem key="completed" value="completed">
                          Đã duyệt
                        </MenuItem>,
                        <MenuItem key="cancelled" value="cancelled">
                          Đã hủy
                        </MenuItem>,
                      ]}
                </TextField>
              </Grid>
              {activeTab !== 2 && (
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    select
                    label="Loại phiếu"
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    sx={{
                      "& .MuiOutlinedInput-root": { borderRadius: "12px" },
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
                            Nhập trả (máy cho mượn)
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
                          <MenuItem key="rented_return" value="rented_return">
                            Xuất trả (máy thuê)
                          </MenuItem>,
                          <MenuItem
                            key="borrowed_return"
                            value="borrowed_return"
                          >
                            Xuất trả (máy mượn)
                          </MenuItem>,
                        ]}
                  </TextField>
                </Grid>
              )}
            </Grid>
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
                    <TableCell sx={{ fontWeight: 600, whiteSpace: "nowrap" }}>
                      Ngày Tạo Phiếu
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, whiteSpace: "nowrap" }}>
                      Loại
                    </TableCell>
                    {activeTab === 2 ? (
                      <TableCell
                        sx={{ fontWeight: 600, whiteSpace: "nowrap" }}
                        colSpan={2}
                      >
                        Đến vị trí
                      </TableCell>
                    ) : (
                      <TableCell
                        sx={{ fontWeight: 600, whiteSpace: "nowrap" }}
                        colSpan={2}
                      >
                        {activeTab === 0 ? "Nhập vào" : "Xuất đến"}
                      </TableCell>
                    )}
                    <TableCell
                      sx={{ fontWeight: 600, whiteSpace: "nowrap" }}
                      align="center"
                    >
                      Số lượng máy
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, whiteSpace: "nowrap" }}>
                      Trạng thái
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, whiteSpace: "nowrap" }}>
                      Ghi chú
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>{renderTableContent()}</TableBody>
              </Table>
            </TableContainer>
            <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(e, value) => setPage(value)}
                color="primary"
                sx={{
                  "& .MuiPaginationItem-root": { borderRadius: "8px" },
                }}
              />
            </Box>
          </CardContent>
        </Card>

        {/* Create/View Ticket Dialog */}
        <Dialog
          open={openDialog}
          onClose={handleCloseDialog}
          maxWidth="lg"
          fullScreen
          fullWidth
          PaperProps={{ sx: { borderRadius: "20px" } }}
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
              <Typography
                variant={isMobile ? "h6" : "h5"}
                sx={{ fontWeight: 700 }}
              >
                {dialogMode === "create"
                  ? `Tạo phiếu ${
                      dialogType === "import"
                        ? "nhập"
                        : dialogType === "export"
                        ? "xuất"
                        : "điều chuyển"
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
                {(() => {
                  const isFormDisabled =
                    dialogType !== "internal" && !formData.type;

                  return (
                    <>
                      {dialogType !== "internal" && (
                        <TextField
                          fullWidth
                          select
                          label={`Loại ${
                            dialogType === "import" ? "nhập" : "xuất"
                          }`}
                          value={formData.type}
                          onChange={(e) =>
                            handleFormChange("type", e.target.value)
                          }
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
                                  Nhập trả (máy cho mượn)
                                </MenuItem>,
                              ]
                            : [
                                <MenuItem key="liquidation" value="liquidation">
                                  Xuất thanh lý
                                </MenuItem>,
                                <MenuItem key="maintenance" value="maintenance">
                                  Xuất bảo trì
                                </MenuItem>,
                                <MenuItem
                                  key="borrowed_out"
                                  value="borrowed_out"
                                >
                                  Xuất cho mượn
                                </MenuItem>,
                                <MenuItem
                                  key="rented_return"
                                  value="rented_return"
                                >
                                  Xuất trả (máy thuê)
                                </MenuItem>,
                                <MenuItem
                                  key="borrowed_return"
                                  value="borrowed_return"
                                >
                                  Xuất trả (máy mượn)
                                </MenuItem>,
                              ]}
                        </TextField>
                      )}
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
                                onChange={(event, newValue) =>
                                  handleFormChange(
                                    "is_borrowed_or_rented_or_borrowed_out_name",
                                    newValue ? newValue.name_location : ""
                                  )
                                }
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
                          dialogType === "internal"
                            ? "Ngày điều chuyển"
                            : "Ngày Tạo phiếu"
                        }
                        value={formData.date}
                        onChange={(e) =>
                          handleFormChange("date", e.target.value)
                        }
                        disabled={isFormDisabled || dialogMode === "view"}
                        required
                        InputLabelProps={{ shrink: true }}
                        sx={DISABLED_VIEW_SX}
                      />
                      <Autocomplete
                        fullWidth
                        options={filteredLocations}
                        getOptionLabel={(option) => option.name_location || ""}
                        onChange={(event, newValue) =>
                          handleFormChange(
                            "to_location_uuid",
                            newValue ? newValue.uuid_location : ""
                          )
                        }
                        value={
                          filteredLocations.find(
                            (loc) =>
                              loc.uuid_location === formData.to_location_uuid
                          ) || null
                        }
                        disabled={
                          isFormDisabled ||
                          dialogMode === "view" ||
                          locationLoading
                        }
                        loading={locationLoading}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label={
                              dialogType === "import"
                                ? "Nhập vào"
                                : dialogType === "export"
                                ? "Xuất đến"
                                : "Đến vị trí"
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
                              disabled={isFormDisabled}
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
                              disabled={isFormDisabled}
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
                                        const isSelected =
                                          formData.machines.some(
                                            (m) =>
                                              m.uuid_machine ===
                                              machine.uuid_machine
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
                                                  isSelected
                                                    ? "Đã chọn"
                                                    : "Chọn"
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
                                                  {machine.is_borrowed_or_rented_or_borrowed_out && (
                                                    <Chip
                                                      label={getMachineStatusLabel(
                                                        machine.is_borrowed_or_rented_or_borrowed_out
                                                      )}
                                                      size="small"
                                                      sx={{
                                                        ml: 0.5,
                                                        height: 20,
                                                        fontSize: "0.75rem",
                                                        background:
                                                          getStatusInfo(
                                                            machine.is_borrowed_or_rented_or_borrowed_out
                                                          ).bg,
                                                        color: getStatusInfo(
                                                          machine.is_borrowed_or_rented_or_borrowed_out
                                                        ).color,
                                                        fontWeight: 600,
                                                        borderRadius: "8px",
                                                      }}
                                                    />
                                                  )}
                                                </Typography>
                                                <Typography
                                                  variant="caption"
                                                  color="text.secondary"
                                                >
                                                  Serial:{" "}
                                                  {machine.serial_machine ||
                                                    "N/A"}{" "}
                                                  | Vị trí:{" "}
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
                                            {machine.is_borrowed_or_rented_or_borrowed_out && (
                                              <Chip
                                                label={getMachineStatusLabel(
                                                  machine.is_borrowed_or_rented_or_borrowed_out
                                                )}
                                                size="small"
                                                sx={{
                                                  ml: 0.5,
                                                  height: 20,
                                                  fontSize: "0.75rem",
                                                  background: getStatusInfo(
                                                    machine.is_borrowed_or_rented_or_borrowed_out
                                                  ).bg,
                                                  color: getStatusInfo(
                                                    machine.is_borrowed_or_rented_or_borrowed_out
                                                  ).color,
                                                  fontWeight: 600,
                                                  borderRadius: "8px",
                                                }}
                                              />
                                            )}
                                          </Typography>
                                          <Typography
                                            variant="caption"
                                            color="text.secondary"
                                          >
                                            Serial:{" "}
                                            {machine.serial_machine ||
                                              "Máy mới"}{" "}
                                            | Vị trí hiện tại:{" "}
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
                        onChange={(e) =>
                          handleFormChange("note", e.target.value)
                        }
                        disabled={isFormDisabled || dialogMode === "view"}
                        sx={DISABLED_VIEW_SX}
                      />
                      {dialogMode === "view" &&
                        formData.machines.length > 0 && (
                          <Card
                            variant="outlined"
                            sx={{ borderRadius: "12px" }}
                          >
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
                                      <TableCell
                                        sx={{
                                          fontWeight: 600,
                                          whiteSpace: "nowrap",
                                        }}
                                      >
                                        Mã máy
                                      </TableCell>
                                      <TableCell
                                        sx={{
                                          fontWeight: 600,
                                          whiteSpace: "nowrap",
                                        }}
                                      >
                                        Loại máy
                                      </TableCell>
                                      <TableCell
                                        sx={{
                                          fontWeight: 600,
                                          whiteSpace: "nowrap",
                                        }}
                                      >
                                        Model
                                      </TableCell>
                                      <TableCell
                                        sx={{
                                          fontWeight: 600,
                                          whiteSpace: "nowrap",
                                        }}
                                      >
                                        Serial
                                      </TableCell>
                                      {/* <TableCell
                                        sx={{
                                          fontWeight: 600,
                                          whiteSpace: "nowrap",
                                        }}
                                      >
                                        Vị trí hiện tại
                                      </TableCell>
                                      <TableCell
                                        sx={{
                                          fontWeight: 600,
                                          whiteSpace: "nowrap",
                                        }}
                                      >
                                        Loại
                                      </TableCell>
                                      <TableCell
                                        sx={{
                                          fontWeight: 600,
                                          whiteSpace: "nowrap",
                                        }}
                                      >
                                        Trạng thái (chính)
                                      </TableCell>
                                      <TableCell
                                        sx={{
                                          fontWeight: 600,
                                          whiteSpace: "nowrap",
                                        }}
                                      >
                                        Trạng thái (mượn/thuê)
                                      </TableCell> */}
                                      <TableCell
                                        sx={{
                                          fontWeight: 600,
                                          whiteSpace: "nowrap",
                                        }}
                                      >
                                        Ghi chú
                                      </TableCell>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {formData.machines.map((machine, index) => (
                                      <TableRow
                                        key={machine.uuid_machine || index}
                                      >
                                        <TableCell>
                                          {machine.code_machine}
                                        </TableCell>
                                        <TableCell>
                                          {machine.type_machine}
                                        </TableCell>
                                        <TableCell>
                                          {machine.model_machine}
                                        </TableCell>
                                        <TableCell>
                                          {machine.serial_machine || "-"}
                                        </TableCell>
                                        {/* <TableCell>
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
                                        <TableCell>
                                          {machine.is_borrowed_or_rented_or_borrowed_out ? (
                                            <Chip
                                              label={getMachineStatusLabel(
                                                machine.is_borrowed_or_rented_or_borrowed_out
                                              )}
                                              size="small"
                                              sx={{
                                                background: getStatusInfo(
                                                  machine.is_borrowed_or_rented_or_borrowed_out
                                                ).bg,
                                                color: getStatusInfo(
                                                  machine.is_borrowed_or_rented_or_borrowed_out
                                                ).color,
                                                fontWeight: 600,
                                                borderRadius: "8px",
                                              }}
                                            />
                                          ) : (
                                            "-"
                                          )}
                                        </TableCell> */}
                                        <TableCell>
                                          {machine.note || "-"}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </TableContainer>
                            </CardContent>
                          </Card>
                        )}
                      {dialogMode === "view" && selectedTicket && (
                        <Alert severity="info" sx={{ borderRadius: "12px" }}>
                          <Typography variant="body2">
                            <strong>Người tạo:</strong>{" "}
                            {/* - 'formData.machines' chỉ là một mẹo để kiểm tra xem API getById đã chạy xong chưa.
                              - 'ticketDetails' được lưu trong 'formData' (xem hàm handleOpenDialog).
                            */}
                            {formData.machines.length > 0 &&
                            formData.creator_ma_nv
                              ? `${formData.creator_ma_nv}: ${
                                  formData.creator_ten_nv || "(Không có tên)"
                                }`
                              : selectedTicket.created_by || "Không rõ"}
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
                    </>
                  );
                })()}
              </Stack>
            )}
          </DialogContent>
          <DialogActions
            sx={{
              p: { xs: 2, sm: 3 },
              justifyContent: "space-between",
              flexDirection: { xs: "column-reverse", sm: "row" },
              gap: 2,
            }}
          >
            <Box
              sx={{
                display: "flex",
                gap: 2,
                width: { xs: "100%", sm: "auto" },
                justifyContent: { xs: "stretch", sm: "flex-start" },
              }}
            >
              {dialogMode === "view" &&
              selectedTicket?.status &&
              dialogType === "import" ? (
                // --- LOGIC PHIẾU NHẬP ---
                <>
                  {/* Nút Duyệt (Chỉ Admin) */}
                  {isAdmin && selectedTicket.status === "pending" && (
                    <Button
                      variant="contained"
                      color="success"
                      onClick={() =>
                        handleUpdateStatus(
                          selectedTicket.uuid_machine_import,
                          "completed",
                          "import"
                        )
                      }
                      disabled={loading}
                      sx={{
                        borderRadius: "12px",
                        px: 3,
                        flexGrow: { xs: 1, sm: 0 },
                      }}
                    >
                      {loading ? <CircularProgress size={24} /> : "Duyệt phiếu"}
                    </Button>
                  )}
                  {/* Nút Hủy (Admin hoặc Người tạo) <<< SỬA Ở ĐÂY */}
                  {(isAdmin || user.id === selectedTicket.created_by) &&
                    selectedTicket.status === "pending" && (
                      <Button
                        variant="contained"
                        color="error"
                        onClick={() =>
                          handleUpdateStatus(
                            selectedTicket.uuid_machine_import,
                            "cancelled",
                            "import"
                          )
                        }
                        disabled={loading}
                        sx={{
                          borderRadius: "12px",
                          px: 3,
                          flexGrow: { xs: 1, sm: 0 },
                        }}
                      >
                        {loading ? <CircularProgress size={24} /> : "Hủy phiếu"}
                      </Button>
                    )}
                </>
              ) : dialogMode === "view" &&
                selectedTicket?.status &&
                dialogType === "export" ? (
                // --- LOGIC PHIẾU XUẤT ---
                <>
                  {/* Nút Duyệt (Chỉ Admin) */}
                  {isAdmin && selectedTicket.status === "pending" && (
                    <Button
                      variant="contained"
                      color="success"
                      onClick={() =>
                        handleUpdateStatus(
                          selectedTicket.uuid_machine_export,
                          "completed",
                          "export"
                        )
                      }
                      disabled={loading}
                      sx={{ borderRadius: "12px", px: 3 }}
                    >
                      {loading ? <CircularProgress size={24} /> : "Duyệt phiếu"}
                    </Button>
                  )}
                  {/* Nút Hủy (Admin hoặc Người tạo) <<< SỬA Ở ĐÂY */}
                  {(isAdmin || user.id === selectedTicket.created_by) &&
                    selectedTicket.status === "pending" && (
                      <Button
                        variant="contained"
                        color="error"
                        onClick={() =>
                          handleUpdateStatus(
                            selectedTicket.uuid_machine_export,
                            "cancelled",
                            "export"
                          )
                        }
                        disabled={loading}
                        sx={{ borderRadius: "12px", px: 3 }}
                      >
                        {loading ? <CircularProgress size={24} /> : "Hủy phiếu"}
                      </Button>
                    )}
                </>
              ) : dialogMode === "view" &&
                selectedTicket?.status &&
                dialogType === "internal" ? (
                // --- LOGIC PHIẾU ĐIỀU CHUYỂN (MỚI) ---
                <>
                  {(() => {
                    const ticket = selectedTicket;
                    const uuid = ticket.uuid_machine_internal_transfer;

                    // User 2 (Trưởng BP)
                    const canConfirm =
                      (isAdmin || canEdit) &&
                      ticket.status === "pending_confirmation" &&
                      user.phongban_id === ticket.to_location_phongban_id &&
                      user.id !== ticket.created_by;

                    // User 3 (Admin)
                    const canApprove =
                      ticket.status === "pending_approval" && isAdmin;

                    // User 1 (Creator) hoặc Admin
                    const canCancel =
                      (ticket.status === "pending_confirmation" ||
                        ticket.status === "pending_approval") &&
                      (isAdmin || user.id === ticket.created_by);

                    return (
                      <>
                        {/* Nút Xác nhận (User 2) */}
                        {canConfirm && (
                          <Button
                            variant="contained"
                            color="primary" // Màu khác
                            onClick={() => handleConfirmTicket(uuid)}
                            disabled={loading}
                            sx={{ borderRadius: "12px", px: 3 }}
                          >
                            {loading ? (
                              <CircularProgress size={24} />
                            ) : (
                              "Xác nhận"
                            )}
                          </Button>
                        )}

                        {/* Nút Duyệt (Admin) */}
                        {canApprove && (
                          <Button
                            variant="contained"
                            color="success"
                            onClick={() => handleApproveTicket(uuid)}
                            disabled={loading}
                            sx={{ borderRadius: "12px", px: 3 }}
                          >
                            {loading ? (
                              <CircularProgress size={24} />
                            ) : (
                              "Duyệt phiếu"
                            )}
                          </Button>
                        )}

                        {/* Nút Hủy (Admin hoặc Creator) */}
                        {canCancel && (
                          <Button
                            variant="contained"
                            color="error"
                            onClick={() =>
                              handleUpdateStatus(uuid, "cancelled", "internal")
                            }
                            disabled={loading}
                            sx={{ borderRadius: "12px", px: 3 }}
                          >
                            {loading ? (
                              <CircularProgress size={24} />
                            ) : (
                              "Hủy phiếu"
                            )}
                          </Button>
                        )}
                      </>
                    );
                  })()}
                </>
              ) : (
                <Box sx={{ width: "1px" }} /> // Placeholder
              )}
            </Box>
            <Box
              sx={{
                display: "flex",
                gap: 2,
                width: { xs: "100%", sm: "auto" },
                justifyContent: { xs: "stretch", sm: "flex-end" },
              }}
            >
              <Button
                variant="outlined"
                onClick={handleCloseDialog}
                sx={{ borderRadius: "12px", px: 3, flexGrow: { xs: 1, sm: 0 } }}
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
                    flexGrow: { xs: 1, sm: 0 },
                  }}
                >
                  {loading ? <CircularProgress size={24} /> : "Tạo phiếu"}
                </Button>
              )}
            </Box>
          </DialogActions>
        </Dialog>

        {/* Machine QR Scanner Component */}
        {(() => {
          let scannerTicketLabel = "";
          if (dialogType === "internal") {
            scannerTicketLabel = "Điều chuyển / Cập nhật vị trí";
          } else if (formData.type) {
            scannerTicketLabel = getTypeLabel(formData.type);
          }

          return (
            <MachineQRScanner
              isOpen={openScanDialog}
              onClose={() => setOpenScanDialog(false)}
              onMachineAdd={handleAddMachineFromScanner}
              selectedMachines={formData.machines}
              apiParams={scannerApiParams}
              ticketTypeLabel={scannerTicketLabel}
              showNotification={showNotification}
            />
          );
        })()}

        {/* Snackbar Notification */}
        <Snackbar
          open={notification.open}
          autoHideDuration={2000}
          onClose={handleCloseNotification}
          anchorOrigin={
            isMobile
              ? { vertical: "bottom", horizontal: "center" }
              : { vertical: "top", horizontal: "right" }
          }
        >
          <Alert
            onClose={handleCloseNotification}
            severity={notification.severity}
            variant="filled"
            sx={{
              width: "100%",
              minWidth: { xs: "auto", sm: "350px" },
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
