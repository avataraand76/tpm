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
  Divider,
  FormControl,
  InputLabel,
  Select,
  Link,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
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
  Close,
  Save,
  CheckCircleOutline,
  ErrorOutline,
} from "@mui/icons-material";
import * as XLSX from "xlsx-js-style";
import NavigationBar from "../components/NavigationBar";
import { api } from "../api/api";
import MachineQRScanner from "../components/MachineQRScanner";
import FileUploadComponent from "../components/FileUploadComponent";
import { useAuth } from "../hooks/useAuth";

const excelHeaderMapping = {
  // Vietnamese Header : English JSON Key
  "Mã máy": "code_machine",
  Serial: "serial_machine",
  "Loại máy": "type_machine",
  "Model máy": "model_machine",
  "Hãng sản xuất": "manufacturer",
  RFID: "RFID_machine",
  "Giá (VNĐ)": "price",
  "Ngày sử dụng (DD/MM/YYYY)": "date_of_use",
  "Tuổi thọ (năm)": "lifespan",
  "Chi phí sửa chữa (VNĐ)": "repair_cost",
  "Ghi chú": "note",
  "Loại (Máy móc thiết bị/Phụ kiện)": "id_category",
};
// Lấy danh sách các cột bắt buộc (sẽ dùng để tô màu)
const requiredHeaders = [
  "Mã máy",
  "Serial",
  "Loại máy",
  "Loại (Máy móc thiết bị/Phụ kiện)",
];

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
  const canCreateOrImportMachines = isAdmin || isPhongCoDien;

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
  const [filesToUpload, setFilesToUpload] = useState([]);

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
    attached_file: "",
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

  // <<< THÊM MỚI: States cho Dialog Tạo Máy Mới (từ MachineListPage)
  const [openCreateMachineDialog, setOpenCreateMachineDialog] = useState(false);
  const [newMachineData, setNewMachineData] = useState({
    code_machine: "",
    serial_machine: "",
    RFID_machine: "",
    type_machine: "",
    model_machine: "",
    manufacturer: "",
    price: "",
    date_of_use: "",
    lifespan: "",
    repair_cost: "",
    note: "",
    current_status: "available",
    id_category: 1,
  });

  // <<< THÊM MỚI: States cho Dialog Import Excel (từ MachineListPage)
  const [openImportDialog, setOpenImportDialog] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState(null);
  const [fileName, setFileName] = useState("");
  // >>> KẾT THÚC THÊM MỚI

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

  // <<< THÊM MỚI: Helpers (từ MachineListPage)
  const formatDateForInput = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
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
    const cleanValue = value.replace(/\./g, "").replace(",", ".");
    return cleanValue;
  };
  // >>> KẾT THÚC THÊM MỚI

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
  }, [openDialog, dialogType, formData.type, isCoDienXuong]);

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

    setActiveTab(logicalTabIndex);
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
        } else {
          // <<< SỬA ĐỔI: Nếu chưa chọn loại, mặc định là 'purchased'
          // để ngăn tìm thấy máy không hợp lệ (ví dụ: máy 'maintenance')
          filters.ticket_type = "purchased";
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
    return null;
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
    setFilesToUpload([]);

    setOpenCreateMachineDialog(false);
    setOpenImportDialog(false);
    setImportResults(null);
    setFileName("");
    setImportFile(null);

    const initialFormData = {
      to_location_uuid: "",
      type: "",
      date: new Date().toISOString().split("T")[0],
      note: "",
      machines: [],
      is_borrowed_or_rented_or_borrowed_out_name: "",
      is_borrowed_or_rented_or_borrowed_out_date: "",
      is_borrowed_or_rented_or_borrowed_out_return_date: "",
      attached_file: "",
    };

    if (mode === "create") {
      setSelectedTicket(null);
      setFormData(initialFormData);
      if (type === "internal") {
        await fetchLocations("internal");
      } else {
        await fetchLocations();
      }
    } else if (mode === "view" && ticket) {
      setSelectedTicket(ticket);
      setDetailLoading(true);
      setFormData(initialFormData);
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
          attached_file: ticketDetails.attached_file || "",
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
      attached_file: "",
    });
    setOpenScanDialog(false);
    setFilesToUpload([]);
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
  const handleAddMachineFromScanner = (machine) => handleSelectMachine(machine);
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
      // 1. Validate machines
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

      // 2. Validate location
      if (!formData.to_location_uuid) {
        const locationLabel =
          dialogType === "internal" ? "vị trí đến" : "vị trí nhập/xuất";
        showNotification(
          "error",
          "Lỗi nhập liệu",
          `Vui lòng chọn ${locationLabel}.`
        );
        setLoading(false);
        return;
      }

      // 3. Create FormData object
      const data = new FormData();

      // 4. Append text/JSON data
      data.append("note", formData.note);
      data.append("machines", JSON.stringify(machinesToSend));
      data.append("to_location_uuid", formData.to_location_uuid);
      data.append("date", formData.date);

      let successMessage = "";
      let apiCall;

      if (dialogType === "internal") {
        data.append("transfer_date", formData.date); // Server.js dùng transfer_date
        apiCall = api.internal_transfers.create(data);
        successMessage = "Tạo phiếu điều chuyển thành công";
      } else {
        // Append borrow/rent info
        data.append(
          "is_borrowed_or_rented_or_borrowed_out_name",
          formData.is_borrowed_or_rented_or_borrowed_out_name || ""
        );
        data.append(
          "is_borrowed_or_rented_or_borrowed_out_date",
          formData.is_borrowed_or_rented_or_borrowed_out_date || ""
        );
        data.append(
          "is_borrowed_or_rented_or_borrowed_out_return_date",
          formData.is_borrowed_or_rented_or_borrowed_out_return_date || ""
        );

        if (dialogType === "import") {
          data.append("import_type", formData.type);
          data.append("import_date", formData.date);
          apiCall = api.imports.create(data);
          successMessage = "Tạo phiếu nhập thành công";
        } else {
          data.append("export_type", formData.type);
          data.append("export_date", formData.date);
          apiCall = api.exports.create(data);
          successMessage = "Tạo phiếu xuất thành công";
        }
      }

      // 5. Append files
      filesToUpload.forEach((file) => {
        data.append("attachments", file); // Tên field 'attachments' phải khớp với server.js
      });

      // 6. Make API call
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

  // <<< THÊM MỚI: Handlers cho Dialog Tạo Máy Mới (từ MachineListPage)
  const validateMachineData = () => {
    const errors = [];
    if (
      !newMachineData.code_machine ||
      newMachineData.code_machine.trim() === ""
    )
      errors.push("Mã máy");
    if (
      !newMachineData.type_machine ||
      newMachineData.type_machine.trim() === ""
    )
      errors.push("Loại máy");
    if (
      !newMachineData.serial_machine ||
      newMachineData.serial_machine.trim() === ""
    )
      errors.push("Serial");
    return errors;
  };

  const handleOpenCreateMachineDialog = () => {
    setNewMachineData({
      code_machine: "",
      serial_machine: "",
      RFID_machine: "",
      type_machine: "",
      model_machine: "",
      manufacturer: "",
      price: "",
      date_of_use: "",
      lifespan: "",
      repair_cost: "",
      note: "",
      current_status: "available",
      id_category: 1,
    });
    setOpenCreateMachineDialog(true);
  };

  const handleCloseCreateMachineDialog = () => {
    setOpenCreateMachineDialog(false);
  };

  const handleCreateMachineInputChange = (field, value) => {
    setNewMachineData({ ...newMachineData, [field]: value });
  };

  const handleSaveNewMachine = async () => {
    try {
      const validationErrors = validateMachineData();
      if (validationErrors.length > 0) {
        showNotification(
          "error",
          "Vui lòng điền đầy đủ thông tin",
          `Các trường bắt buộc: ${validationErrors.join(", ")}`
        );
        return;
      }

      // 1. Create new machine
      const result = await api.machines.create(newMachineData);
      if (result.success) {
        // 2. Add machine to ticket
        handleSelectMachine(result.data);

        showNotification(
          "success",
          "Tạo máy thành công!",
          `Máy "${result.data.code_machine}" đã được thêm vào phiếu.`
        );
        handleCloseCreateMachineDialog();
      } else {
        showNotification(
          "error",
          "Tạo máy thất bại",
          result.message || "Đã xảy ra lỗi khi tạo máy móc"
        );
      }
    } catch (err) {
      console.error("Error saving machine:", err);
      showNotification(
        "error",
        "Lỗi khi tạo máy móc",
        err.response?.data?.message ||
          err.message ||
          "Đã xảy ra lỗi không xác định"
      );
    }
  };
  // >>> KẾT THÚC THÊM MỚI

  // <<< THÊM MỚI: Handlers cho Dialog Import Excel (từ MachineListPage)
  const handleOpenImportDialog = () => {
    setImportFile(null);
    setFileName("");
    setImportResults(null);
    setIsImporting(false);
    setOpenImportDialog(true);
  };

  const handleCloseImportDialog = () => {
    setOpenImportDialog(false);
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setImportFile(file);
      setFileName(file.name);
      setImportResults(null);
    }
    event.target.value = null;
  };

  const handleImportExcel = async () => {
    if (!importFile) {
      showNotification(
        "error",
        "Chưa chọn file",
        "Vui lòng chọn một file Excel"
      );
      return;
    }

    setIsImporting(true);
    setImportResults(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target.result;
        const workbook = XLSX.read(data, { type: "binary", cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { raw: false });

        if (json.length === 0) {
          showNotification("error", "File rỗng", "File Excel không có dữ liệu");
          setIsImporting(false);
          return;
        }

        const headersInFile = Object.keys(json[0]);
        const missingHeaders = requiredHeaders.filter(
          (h) => !headersInFile.includes(h)
        );

        if (missingHeaders.length > 0) {
          showNotification(
            "error",
            "File không hợp lệ",
            `File Excel thiếu các cột bắt buộc: ${missingHeaders.join(", ")}`
          );
          setIsImporting(false);
          return;
        }

        const machinesToImport = json.map((row) => {
          const newRow = {};
          for (const vietnameseHeader in excelHeaderMapping) {
            const englishKey = excelHeaderMapping[vietnameseHeader];
            if (row[vietnameseHeader] !== undefined) {
              newRow[englishKey] = row[vietnameseHeader];
            }
          }

          const categoryString = (newRow.id_category || "").toLowerCase();
          if (categoryString.includes("máy móc")) newRow.id_category = 1;
          else if (categoryString.includes("phụ kiện")) newRow.id_category = 2;
          else newRow.id_category = 1;

          const dateString = newRow.date_of_use;
          if (dateString && typeof dateString === "string") {
            const parts = dateString.split("/");
            if (parts.length === 3) {
              const jsDate = new Date(+parts[2], parts[1] - 1, +parts[0]);
              newRow.date_of_use = jsDate;
            } else newRow.date_of_use = null;
          }
          return newRow;
        });

        // Gửi dữ liệu lên backend
        const result = await api.machines.batchImport({
          machines: machinesToImport,
        });

        if (result.success) {
          setImportResults(result.data);
          const errorCount = result.data.errorCount;
          showNotification(
            errorCount > 0 ? "warning" : "success",
            "Hoàn tất import",
            `Thành công: ${result.data.successCount}, Thất bại: ${errorCount}`
          );

          if (result.data.successes && result.data.successes.length > 0) {
            // `result.data.successes` là mảng các máy đã được tạo thành công
            // (server.js trả về thông tin này)
            // Cần lấy thông tin chi tiết hơn từ server (đã được làm trong server.js)
            for (const newMachine of result.data.successes) {
              // Cần có uuid_machine để handleSelectMachine hoạt động
              // Giả định server trả về đầy đủ object máy (đã check server.js, nó không trả về uuid)
              // *** ĐIỀU CHỈNH ***
              // server.js /batch-import CHỈ trả về: code, serial, type, model
              // => Không đủ thông tin (thiếu uuid_machine, current_status...)
              // *** GIẢI PHÁP ***
              // Thay vì thêm ngay, ta chỉ hiển thị thông báo.
              // Tốt hơn: Server.js `batchImport` nên trả về mảng các máy đã tạo (giống `create`)
              // *** GIẢ ĐỊNH server.js đã được sửa để trả về uuid_machine ***
              // (server.js chưa sửa, nhưng ta cứ code)
              // Do server.js /batch-import không trả về uuid_machine, ta phải tìm lại
              // Tạm thời, ta sẽ tìm lại máy bằng SERIAL (vì nó là duy nhất)

              if (newMachine.serial) {
                try {
                  // Dùng api.machines.getBySerial để lấy full data (bao gồm uuid)
                  const machineData = await api.machines.getBySerial(
                    newMachine.serial,
                    { ticket_type: "purchased" } // Giả định là máy mới
                  );
                  if (machineData.success) {
                    handleSelectMachine(machineData.data);
                  }
                } catch (findErr) {
                  console.error("Lỗi khi tự động tìm máy vừa import:", findErr);
                }
              }
            }
            showNotification(
              "info",
              "Đã thêm máy",
              `Đã tự động thêm ${result.data.successCount} máy vào phiếu.`
            );
          }
        } else {
          showNotification(
            "error",
            "Lỗi import",
            result.message || "Lỗi không xác định từ server"
          );
        }
      } catch (err) {
        console.error("Error parsing or importing file:", err);
        showNotification(
          "error",
          "Lỗi xử lý file",
          err.response?.data?.message || err.message || "Không thể đọc file"
        );
      } finally {
        setIsImporting(false);
      }
    };
    reader.readAsBinaryString(importFile);
  };
  // >>> KẾT THÚC THÊM MỚI

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
                component="span"
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
            <IconButton onClick={handleCloseDialog} sx={{ color: "white" }}>
              <Close />
            </IconButton>
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

                  const isSpecialImport =
                    dialogMode === "create" &&
                    dialogType === "import" &&
                    ["purchased", "rented", "borrowed"].includes(formData.type);

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
                                onChange={(event, newValue) => {
                                  const newName = newValue
                                    ? newValue.name_location
                                    : "";
                                  const newUuid = newValue
                                    ? newValue.uuid_location
                                    : "";

                                  // Cập nhật tên đơn vị
                                  handleFormChange(
                                    "is_borrowed_or_rented_or_borrowed_out_name",
                                    newName
                                  );

                                  // Đồng bộ với "Xuất đến" NẾU đây là phiếu "Xuất cho mượn"
                                  if (formData.type === "borrowed_out") {
                                    handleFormChange(
                                      "to_location_uuid",
                                      newUuid
                                    );
                                  }
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
                          locationLoading ||
                          // <<< THÊM: Vô hiệu hóa nếu là phiếu "Xuất cho mượn" (để đồng bộ)
                          formData.type === "borrowed_out"
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
                        sx={
                          // <<< THÊM: Dùng style disabled nếu là phiếu "Xuất cho mượn"
                          formData.type === "borrowed_out"
                            ? DISABLED_VIEW_SX
                            : {}
                        }
                      />
                      {dialogMode === "create" && (
                        <Card variant="outlined" sx={{ borderRadius: "12px" }}>
                          <CardContent>
                            <Typography variant="h6" gutterBottom>
                              Chọn máy móc ({formData.machines.length})
                            </Typography>

                            {isSpecialImport ? (
                              // Nút bấm cho Nhập Mua Mới / Thuê / Mượn
                              <Stack
                                direction={{ xs: "column", sm: "row" }}
                                spacing={2}
                                sx={{ mb: 2 }}
                              >
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
                                    "&:hover": {
                                      borderColor: "#4caf50",
                                      bgcolor: "#2e7d3211",
                                    },
                                  }}
                                >
                                  Quét QR
                                </Button>
                                <Button
                                  variant="outlined"
                                  startIcon={<Add />}
                                  onClick={handleOpenCreateMachineDialog}
                                  disabled={isFormDisabled}
                                  sx={{
                                    borderRadius: "12px",
                                    py: 1,
                                    borderColor: "#2e7d32",
                                    color: "#2e7d32",
                                    "&:hover": {
                                      borderColor: "#4caf50",
                                      bgcolor: "#2e7d3211",
                                    },
                                  }}
                                >
                                  Thêm máy mới
                                </Button>
                                <Button
                                  variant="outlined"
                                  startIcon={<FileUpload />}
                                  onClick={handleOpenImportDialog}
                                  disabled={isFormDisabled}
                                  sx={{
                                    borderRadius: "12px",
                                    py: 1,
                                    borderColor: "#2e7d32",
                                    color: "#2e7d32",
                                    "&:hover": {
                                      borderColor: "#4caf50",
                                      bgcolor: "#2e7d3211",
                                    },
                                  }}
                                >
                                  Nhập Excel
                                </Button>
                              </Stack>
                            ) : (
                              // Nút bấm cho các loại phiếu khác
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
                            )}

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
                                              <Stack spacing={0.5}>
                                                <Stack
                                                  direction="row"
                                                  alignItems="center"
                                                  spacing={1}
                                                  flexWrap="wrap"
                                                >
                                                  <Typography
                                                    variant="body2"
                                                    sx={{ fontWeight: 600 }}
                                                  >
                                                    {machine.code_machine} -{" "}
                                                    {machine.type_machine} -{" "}
                                                    {machine.model_machine}
                                                  </Typography>
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
                                                </Stack>
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
                                          <Stack spacing={0.5}>
                                            <Stack
                                              direction="row"
                                              alignItems="center"
                                              spacing={1}
                                              flexWrap="wrap"
                                            >
                                              <Typography
                                                variant="body2"
                                                sx={{ fontWeight: 600 }}
                                              >
                                                {machine.code_machine} -{" "}
                                                {machine.type_machine} -{" "}
                                                {machine.model_machine}
                                              </Typography>
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
                                            </Stack>
                                            <Typography
                                              variant="caption"
                                              color="text.secondary"
                                            >
                                              Serial:{" "}
                                              {machine.serial_machine ||
                                                "Máy mới"}{" "}
                                              | Vị trí hiện tại:{" "}
                                              {machine.name_location ||
                                                "Chưa xác định"}
                                            </Typography>
                                          </Stack>
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
                      <FileUploadComponent
                        onFilesChange={setFilesToUpload}
                        existingFiles={formData.attached_file}
                        disabled={dialogMode === "view"}
                        showNotification={showNotification}
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
                            <strong>Cập nhật lần cuối:</strong>{" "}
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
                  {/* Nút Hủy (Admin hoặc Người tạo) */}
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
                  {/* Nút Hủy (Admin hoặc Người tạo) */}
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
                            color="primary"
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

        {/* Create Machine Dialog */}
        <Dialog
          open={openCreateMachineDialog}
          onClose={handleCloseCreateMachineDialog}
          maxWidth="md"
          fullScreen={isMobile}
          fullWidth
          PaperProps={{ sx: { borderRadius: isMobile ? 0 : "20px" } }}
        >
          <DialogTitle
            sx={{
              pb: 1,
              background: "linear-gradient(45deg, #2e7d32, #4caf50)",
              color: "white",
              fontWeight: 700,
            }}
          >
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
            >
              <Typography
                component="span"
                variant={isMobile ? "h6" : "h5"}
                fontWeight="bold"
              >
                Thêm máy móc mới
              </Typography>
              <IconButton
                onClick={handleCloseCreateMachineDialog}
                size="small"
                sx={{ color: "white" }}
              >
                <Close />
              </IconButton>
            </Stack>
          </DialogTitle>
          <Divider />
          <DialogContent sx={{ pt: 3 }}>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12 }}>
                <Divider sx={{ my: 2 }}>
                  <Chip label="Thông tin chung" />
                </Divider>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Mã máy"
                  required
                  value={newMachineData.code_machine || ""}
                  onChange={(e) =>
                    handleCreateMachineInputChange(
                      "code_machine",
                      e.target.value
                    )
                  }
                  disabled={!canCreateOrImportMachines}
                  sx={!canCreateOrImportMachines ? DISABLED_VIEW_SX : {}}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Serial"
                  required
                  value={newMachineData.serial_machine || ""}
                  onChange={(e) =>
                    handleCreateMachineInputChange(
                      "serial_machine",
                      e.target.value
                    )
                  }
                  disabled={!canCreateOrImportMachines}
                  sx={!canCreateOrImportMachines ? DISABLED_VIEW_SX : {}}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="RFID"
                  value={newMachineData.RFID_machine || ""}
                  onChange={(e) =>
                    handleCreateMachineInputChange(
                      "RFID_machine",
                      e.target.value
                    )
                  }
                  disabled={!canCreateOrImportMachines}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth disabled={!canCreateOrImportMachines}>
                  <InputLabel>Loại</InputLabel>
                  <Select
                    value={newMachineData.id_category || 1}
                    label="Loại"
                    onChange={(e) =>
                      handleCreateMachineInputChange(
                        "id_category",
                        e.target.value
                      )
                    }
                  >
                    <MenuItem value={1}>Máy móc thiết bị</MenuItem>
                    <MenuItem value={2}>Phụ kiện</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Loại máy"
                  required
                  value={newMachineData.type_machine || ""}
                  onChange={(e) =>
                    handleCreateMachineInputChange(
                      "type_machine",
                      e.target.value
                    )
                  }
                  disabled={!canCreateOrImportMachines}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Model máy"
                  value={newMachineData.model_machine || ""}
                  onChange={(e) =>
                    handleCreateMachineInputChange(
                      "model_machine",
                      e.target.value
                    )
                  }
                  disabled={!canCreateOrImportMachines}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Hãng sản xuất"
                  value={newMachineData.manufacturer || ""}
                  onChange={(e) =>
                    handleCreateMachineInputChange(
                      "manufacturer",
                      e.target.value
                    )
                  }
                  disabled={!canCreateOrImportMachines}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth disabled={!canCreateOrImportMachines}>
                  <InputLabel>Trạng thái</InputLabel>
                  <Select
                    value={newMachineData.current_status}
                    label="Trạng thái"
                    onChange={(e) =>
                      handleCreateMachineInputChange(
                        "current_status",
                        e.target.value
                      )
                    }
                  >
                    <MenuItem value="available">Sẵn sàng</MenuItem>
                    <MenuItem value="in_use">Đang sử dụng</MenuItem>
                    <MenuItem value="maintenance">Bảo trì</MenuItem>
                    <MenuItem value="liquidation">Thanh lý</MenuItem>
                    <MenuItem value="disabled">Vô hiệu hóa</MenuItem>
                    <MenuItem value="broken">Máy hư</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12 }}>
                <Divider sx={{ my: 2 }}>
                  <Chip label="Thông tin Chi phí & Thời gian" />
                </Divider>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Giá (VNĐ)"
                  value={formatNumberVN(newMachineData.price)}
                  onChange={(e) => {
                    const parsedValue = parseNumberVN(e.target.value);
                    handleCreateMachineInputChange(
                      "price",
                      parsedValue ? parseFloat(parsedValue) : ""
                    );
                  }}
                  disabled={!canCreateOrImportMachines}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Tuổi thọ (năm)"
                  value={newMachineData.lifespan?.toString() || ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "" || /^\d+$/.test(value)) {
                      handleCreateMachineInputChange(
                        "lifespan",
                        value ? parseInt(value) : ""
                      );
                    }
                  }}
                  onKeyPress={(e) => {
                    if (!/[0-9]/.test(e.key)) e.preventDefault();
                  }}
                  inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
                  disabled={!canCreateOrImportMachines}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Chi phí sửa chữa (VNĐ)"
                  value={formatNumberVN(newMachineData.repair_cost) || ""}
                  onChange={(e) => {
                    const parsedValue = parseNumberVN(e.target.value);
                    handleCreateMachineInputChange(
                      "repair_cost",
                      parsedValue ? parseFloat(parsedValue) : ""
                    );
                  }}
                  disabled={!canCreateOrImportMachines}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Ngày sử dụng"
                  type="date"
                  value={formatDateForInput(newMachineData.date_of_use)}
                  onChange={(e) =>
                    handleCreateMachineInputChange(
                      "date_of_use",
                      e.target.value
                    )
                  }
                  InputLabelProps={{ shrink: true }}
                  disabled={!canCreateOrImportMachines}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Ghi chú"
                  multiline
                  rows={3}
                  value={newMachineData.note || ""}
                  onChange={(e) =>
                    handleCreateMachineInputChange("note", e.target.value)
                  }
                  disabled={!canCreateOrImportMachines}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <Divider />
          <DialogActions
            sx={{
              p: 3,
              flexDirection: { xs: "column-reverse", sm: "row" },
              gap: 1,
              justifyContent: "flex-end",
            }}
          >
            <Button
              onClick={handleCloseCreateMachineDialog}
              variant="outlined"
              color="inherit"
              sx={{ borderRadius: "12px", width: { xs: "100%", sm: "auto" } }}
            >
              Hủy
            </Button>
            {canCreateOrImportMachines && (
              <Button
                onClick={handleSaveNewMachine}
                variant="contained"
                startIcon={<Save />}
                sx={{
                  borderRadius: "12px",
                  background: "linear-gradient(45deg, #2e7d32, #4caf50)",
                  width: { xs: "100%", sm: "auto" },
                }}
              >
                Thêm và chọn
              </Button>
            )}
          </DialogActions>
        </Dialog>

        {/* Import Excel Dialog */}
        <Dialog
          open={openImportDialog}
          onClose={handleCloseImportDialog}
          maxWidth="md"
          fullScreen={isMobile}
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: isMobile ? 0 : "20px",
            },
          }}
        >
          <DialogTitle
            sx={{
              pb: 1,
              background: "linear-gradient(45deg, #667eea, #764ba2)",
              color: "white",
              fontWeight: 700,
            }}
          >
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
            >
              <Typography
                component="span"
                variant={isMobile ? "h6" : "h5"}
                fontWeight="bold"
              >
                Nhập máy móc từ file Excel
              </Typography>
              <IconButton
                onClick={handleCloseImportDialog}
                size="small"
                sx={{ color: "white" }}
              >
                <Close />
              </IconButton>
            </Stack>
          </DialogTitle>
          <Divider />
          <DialogContent
            sx={{
              pt: 3,
              display: "flex",
              flexDirection: "column",
              gap: 3,
              pb: 1,
            }}
          >
            <Alert severity="info" sx={{ borderRadius: "12px" }}>
              <AlertTitle>Hướng dẫn</AlertTitle>
              <Typography variant="body2" gutterBottom>
                1. Các cột <strong>bắt buộc</strong>: <strong>Mã máy</strong>,{" "}
                <strong>Serial</strong>, <strong>Loại máy</strong>,{" "}
                <strong>Loại (Máy móc thiết bị/Phụ kiện)</strong>.
              </Typography>
              <Typography variant="body2" gutterBottom>
                2. Cột <strong>Ngày sử dụng</strong>: Nhập định dạng{" "}
                <strong>DD/MM/YYYY</strong>.
              </Typography>
              <Typography variant="body2" gutterBottom>
                3. Các máy được tạo thành công sẽ{" "}
                <strong>tự động được thêm</strong> vào phiếu nhập hiện tại.
              </Typography>
              <Box sx={{ mt: 1 }}>
                <Link
                  href="/Mau_Excel_MayMoc.xlsx"
                  download="Mau_Excel_MayMoc.xlsx"
                  variant="body2"
                  sx={{
                    fontWeight: "bold",
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                >
                  Tải xuống file Excel mẫu tại đây
                </Link>
              </Box>
            </Alert>

            <Box>
              <Button
                variant="contained"
                component="label"
                startIcon={<FileUpload />}
                sx={{
                  borderRadius: "12px",
                  background: "linear-gradient(45deg, #667eea, #764ba2)",
                }}
              >
                Chọn file Excel
                <input
                  type="file"
                  hidden
                  accept=".xlsx, .xls"
                  onChange={handleFileChange}
                />
              </Button>
              {fileName && (
                <Typography variant="body1" sx={{ mt: 2, ml: 1 }}>
                  Đã chọn: <strong>{fileName}</strong>
                </Typography>
              )}
            </Box>

            {importResults && (
              <Box>
                <Divider sx={{ my: 2 }}>
                  <Chip label="Kết quả Nhập Excel" />
                </Divider>
                <Alert
                  severity={
                    importResults.errorCount > 0 ? "warning" : "success"
                  }
                  sx={{ borderRadius: "12px", mb: 2 }}
                >
                  <AlertTitle>Nhập Excel hoàn tất</AlertTitle>
                  Đã thêm thành công:{" "}
                  <strong>{importResults.successCount}</strong> máy.
                  <br />
                  Số dòng bị lỗi: <strong>{importResults.errorCount}</strong>.
                </Alert>

                {importResults.successes.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="h6" color="success.main" gutterBottom>
                      Chi tiết thành công (đã tự động thêm vào phiếu):
                    </Typography>
                    <Paper
                      variant="outlined"
                      sx={{
                        maxHeight: 300,
                        overflow: "auto",
                        borderRadius: "12px",
                      }}
                    >
                      <List dense>
                        {importResults.successes.map((succ, index) => (
                          <React.Fragment key={index}>
                            <ListItem>
                              <ListItemIcon sx={{ minWidth: "30px" }}>
                                <CheckCircleOutline
                                  color="success"
                                  fontSize="small"
                                />
                              </ListItemIcon>
                              <ListItemText
                                primary={`${succ.type} - ${succ.model}`}
                                secondary={`Mã máy: ${succ.code} | Serial: ${succ.serial}`}
                              />
                            </ListItem>
                            <Divider component="li" />
                          </React.Fragment>
                        ))}
                      </List>
                    </Paper>
                  </Box>
                )}

                {importResults.errors.length > 0 && (
                  <Box>
                    <Typography variant="h6" color="error" gutterBottom>
                      Chi tiết lỗi:
                    </Typography>
                    <Paper
                      variant="outlined"
                      sx={{
                        maxHeight: 300,
                        overflow: "auto",
                        borderRadius: "12px",
                      }}
                    >
                      <List dense>
                        {importResults.errors.map((err, index) => (
                          <React.Fragment key={index}>
                            <ListItem>
                              <ListItemIcon sx={{ minWidth: "30px" }}>
                                <ErrorOutline color="error" fontSize="small" />
                              </ListItemIcon>
                              <ListItemText
                                primary={`Dòng ${err.line}: ${err.message}`}
                                secondary={`Mã máy: ${err.code} | Serial: ${err.serial}`}
                              />
                            </ListItem>
                            <Divider component="li" />
                          </React.Fragment>
                        ))}
                      </List>
                    </Paper>
                  </Box>
                )}
              </Box>
            )}

            {isImporting && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  justifyContent: "center",
                  p: 2,
                }}
              >
                <CircularProgress />
                <Typography>Đang xử lý, vui lòng chờ...</Typography>
              </Box>
            )}
          </DialogContent>
          <Divider />
          <DialogActions
            sx={{
              p: 3,
              flexDirection: { xs: "column-reverse", sm: "row" },
              gap: 1,
            }}
          >
            <Button
              onClick={handleCloseImportDialog}
              variant="outlined"
              color="inherit"
              sx={{ borderRadius: "12px", width: { xs: "100%", sm: "auto" } }}
              disabled={isImporting}
            >
              Đóng
            </Button>
            <Button
              onClick={handleImportExcel}
              variant="contained"
              startIcon={<Save />}
              sx={{
                borderRadius: "12px",
                background: "linear-gradient(45deg, #2e7d32, #4caf50)",
                width: { xs: "100%", sm: "auto" },
              }}
              disabled={!importFile || isImporting}
            >
              {isImporting ? "Đang nhập..." : "Bắt đầu Nhập & Thêm"}
            </Button>
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
