// frontend/src/pages/TestProposalPage.jsx

import React, { useState, useEffect, useCallback, useRef } from "react";
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
  WifiTethering,
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
import RfidScannerDialog from "../components/RfidScannerDialog";
import { useAuth } from "../hooks/useAuth";

const excelHeaderMapping = {
  // Vietnamese Header : English JSON Key
  "Mã máy": "code_machine",
  Serial: "serial_machine",
  "Loại máy": "type_machine",
  "Model máy": "model_machine",
  "Hãng sản xuất": "manufacturer",
  RFID: "RFID_machine",
  NFC: "NFC_machine",
  "Giá (VNĐ)": "price",
  "Ngày sử dụng (DD/MM/YYYY)": "date_of_use",
  "Tuổi thọ (năm)": "lifespan",
  "Chi phí sửa chữa (VNĐ)": "repair_cost",
  "Ghi chú": "note",
  "Phân loại (Máy móc thiết bị/Phụ kiện)": "name_category",
};
// Lấy danh sách các cột bắt buộc (sẽ dùng để tô màu)
const requiredHeaders = [
  "Mã máy",
  "Serial",
  "Loại máy",
  "Phân loại (Máy móc thiết bị/Phụ kiện)",
];

const TestProposalPage = () => {
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

  // Tab state
  const [activeTab, setActiveTab] = useState(isCoDienXuong ? 2 : 0); // 0: Import, 1: Export, 2: Internal

  // Data states
  const [imports, setImports] = useState([]);
  const [exports, setExports] = useState([]);
  const [transfers, setTransfers] = useState([]);

  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  // Location Data
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
  const [hoveredRowUuid, setHoveredRowUuid] = useState(null);

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
    receiver_name: "",
    vehicle_number: "",
    department_address: "",
  });

  // States for machine search
  const [searchMachineTerm, setSearchMachineTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchPage, setSearchPage] = useState(1);
  const [searchTotalPages, setSearchTotalPages] = useState(1);
  const SEARCH_LIMIT = 5;

  // States for QR/RFID Scanner
  const [openScanDialog, setOpenScanDialog] = useState(false);
  const [openRfidDialog, setOpenRfidDialog] = useState(false);
  const [scannerApiParams, setScannerApiParams] = useState({});

  // Snackbar
  const [notification, setNotification] = useState({
    open: false,
    severity: "success",
    title: "",
    message: "",
  });

  const [categoryOptions, setCategoryOptions] = useState([]);

  // Create Machine Dialog State
  const [openCreateMachineDialog, setOpenCreateMachineDialog] = useState(false);
  const [newMachineData, setNewMachineData] = useState({
    code_machine: "",
    serial_machine: "",
    RFID_machine: "",
    NFC_machine: "",
    type_machine: "",
    model_machine: "",
    manufacturer: "",
    price: "",
    date_of_use: "",
    lifespan: "",
    repair_cost: "",
    note: "",
    current_status: "available",
    name_category: "",
  });

  // Import Excel Dialog State
  const [openImportDialog, setOpenImportDialog] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState(null);
  const [fileName, setFileName] = useState("");
  const searchTimeoutRef = useRef(null);
  const searchInputRef = useRef(null);

  // Config statuses
  const STATUS_CONFIG = {
    available: { bg: "#2e7d3222", color: "#2e7d32", label: "Có thể sử dụng" },
    in_use: { bg: "#667eea22", color: "#667eea", label: "Đang sử dụng" },
    maintenance: { bg: "#ff980022", color: "#ff9800", label: "Bảo trì" },
    broken: { bg: "#9e9e9e22", color: "#9e9e9e", label: "Máy hư" },
    rented: { bg: "#673ab722", color: "#673ab7", label: "Máy thuê" },
    rented_return: {
      bg: "#673ab722",
      color: "#673ab7",
      label: "Đã trả (máy thuê)",
    },
    borrowed: { bg: "#03a9f422", color: "#03a9f4", label: "Máy mượn" },
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
    const fetchCategories = async () => {
      try {
        const catRes = await api.categories.getAll();
        if (catRes.success) {
          setCategoryOptions(catRes.data);
        }
      } catch (err) {
        console.error("Error fetching categories:", err);
        showNotification(
          "error",
          "Lỗi tải Phân loại",
          "Không thể tải danh sách phân loại."
        );
      }
    };
    fetchCategories();
  }, [fetchExternalLocations, showNotification]);

  useEffect(() => {
    setScannerApiParams(getMachineFiltersForDialog());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openDialog, dialogType, formData.type, isCoDienXuong]);

  // --- Handlers ---
  const handleTabChange = (event, newValue) => {
    let logicalTabIndex;
    if (hasImportExportTabs) {
      logicalTabIndex = newValue;
    } else {
      logicalTabIndex = newValue + 2;
    }
    setActiveTab(logicalTabIndex);
    setPage(1);
    setStatusFilter("");
    setTypeFilter("");
  };

  const getMachineFiltersForDialog = () => {
    let filters = {};
    if (openDialog) {
      if (dialogType === "internal") {
        filters.ticket_type = "internal";
        if (isCoDienXuong) {
          filters.filter_by_phongban_id = user.phongban_id;
        }
      } else {
        const currentTicketType = formData.type;
        if (currentTicketType) {
          filters.ticket_type = currentTicketType;
        } else {
          filters.ticket_type = "purchased";
        }
      }
    }
    return filters;
  };

  // Handlers for Search
  const handleSearchChange = (event) => {
    const value = event.target.value;

    // Xóa timer cũ nếu người dùng đang gõ tiếp
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Đặt timer mới: Chỉ gọi API sau khi dừng gõ 800ms
    searchTimeoutRef.current = setTimeout(() => {
      setSearchMachineTerm(value); // Cập nhật state để dùng cho pagination sau này
      const filters = getMachineFiltersForDialog();
      searchMachines(value, 1, filters); // Gọi API
    }, 800);
  };

  const handleSearchPageChange = (event, value) => {
    setSearchPage(value);
    const filters = getMachineFiltersForDialog();
    if (searchMachineTerm && searchMachineTerm.length >= 2)
      searchMachines(searchMachineTerm, value, filters);
  };

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

  const handleOpenDialog = async (mode, type, ticket = null) => {
    setDialogMode(mode);
    setDialogType(type);
    setOpenDialog(true);
    setSearchResults([]);
    setSearchMachineTerm("");
    setSearchPage(1);
    if (searchInputRef.current) {
      searchInputRef.current.value = "";
    }
    setOpenScanDialog(false);
    setOpenRfidDialog(false);
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
        setSelectedTicket(ticketDetails);

        const ticketType =
          ticketDetails.import_type || ticketDetails.export_type || "internal";
        let filter =
          type === "internal"
            ? "internal"
            : getLocationFilterForType(ticketType);

        await fetchLocations(filter);

        let expansionData = [];
        try {
          if (typeof ticketDetails.expansion_field === "string") {
            expansionData = JSON.parse(ticketDetails.expansion_field);
          } else if (Array.isArray(ticketDetails.expansion_field)) {
            expansionData = ticketDetails.expansion_field;
          }
        } catch (e) {
          console.error("Error parsing expansion field:", e);
        }

        // Helper để lấy giá trị từ mảng expansion: [{ "Key": "Value" }]
        const getExpansionValue = (keyName) => {
          if (!expansionData || expansionData.length === 0) return "";
          // Tìm object có key chứa keyName (case-insensitive, có thể có dấu :)
          const foundItem = expansionData.find((item) => {
            const key = Object.keys(item)[0];
            return key.toLowerCase().includes(keyName.toLowerCase());
          });
          if (foundItem) {
            const key = Object.keys(foundItem)[0];
            return foundItem[key] || "";
          }
          return "";
        };

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
          receiver_name: getExpansionValue("Họ tên người nhận") || "",
          vehicle_number: getExpansionValue("Số xe") || "",
          department_address: getExpansionValue("Địa chỉ") || "",
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
    setOpenRfidDialog(false);
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
      if (searchInputRef.current) {
        searchInputRef.current.value = "";
      }
      setSearchTotalPages(1);
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }
  };

  const handleSelectMachine = (machine) => {
    const isSelected = formData.machines.some(
      (m) => m.uuid_machine === machine.uuid_machine
    );
    if (isSelected) {
      showNotification(
        "warning",
        "Máy đã có trong danh sách",
        `Máy "${machine.code_machine}" (${machine.serial_machine}) đã được thêm vào phiếu.`
      );
    } else {
      setFormData((prev) => ({
        ...prev,
        machines: [...prev.machines, { ...machine, note: "" }],
      }));
    }
  };
  const handleAddMachinesFromRfid = (machinesToAdd) => {
    setFormData((prev) => {
      const newMachinesWithNote = machinesToAdd.map((m) => ({
        ...m,
        note: "",
      }));
      return {
        ...prev,
        machines: [...prev.machines, ...newMachinesWithNote],
      };
    });
  };
  const handleAddMachineFromScanner = (machine) => {
    setFormData((prev) => ({
      ...prev,
      machines: [...prev.machines, { ...machine, note: "" }],
    }));
  };
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
        .map((m) => ({
          uuid_machine: m.uuid_machine,
          note: m.note,
          type_machine: m.type_machine,
          model_machine: m.model_machine,
          serial_machine: m.serial_machine,
          code_machine: m.code_machine,
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
      const catStr = dialogType; // 'import', 'export', 'internal'

      // 4. Append required fields for Test Proposal API
      data.append("category", catStr);
      data.append("type", formData.type);
      data.append("date", formData.date);
      data.append("note", formData.note);
      data.append("to_location_uuid", formData.to_location_uuid);
      data.append("machines", JSON.stringify(machinesToSend));

      // Append extra fields for borrow/rent
      if (formData.is_borrowed_or_rented_or_borrowed_out_name)
        data.append(
          "is_borrowed_or_rented_or_borrowed_out_name",
          formData.is_borrowed_or_rented_or_borrowed_out_name
        );
      if (formData.is_borrowed_or_rented_or_borrowed_out_date)
        data.append(
          "is_borrowed_or_rented_or_borrowed_out_date",
          formData.is_borrowed_or_rented_or_borrowed_out_date
        );
      if (formData.is_borrowed_or_rented_or_borrowed_out_return_date)
        data.append(
          "is_borrowed_or_rented_or_borrowed_out_return_date",
          formData.is_borrowed_or_rented_or_borrowed_out_return_date || ""
        );

      if (dialogType === "export") {
        data.append("receiver_name", formData.receiver_name || "");
        data.append("vehicle_number", formData.vehicle_number || "");
        data.append("department_address", formData.department_address || "");
      }

      // 5. Append files
      filesToUpload.forEach((f) => data.append("attachments", f));

      // 6. Make API call
      // const res = await api.test_proposals.create(data);
      await api.test_proposals.create(data);

      showNotification(
        "success",
        "Thành công",
        // `Đã tạo phiếu! ID Local: ${res.data.local_uuid}`
        `Đã tạo phiếu thành công!`
      );
      handleCloseDialog();
      fetchData(); // Reload (dù không có dữ liệu nhưng để reset form)
    } catch (error) {
      console.error("Error creating test proposal:", error);
      showNotification(
        "error",
        "Thao tác thất bại",
        error.response?.data?.message || "Lỗi khi tạo phiếu"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCloseNotification = (event, reason) => {
    if (reason === "clickaway") return;
    setNotification({ ...notification, open: false });
  };

  // --- Create Machine Logic ---
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
    if (
      !newMachineData.name_category ||
      newMachineData.name_category.trim() === ""
    )
      errors.push("Phân loại");
    return errors;
  };

  const handleOpenCreateMachineDialog = () => {
    setNewMachineData({
      code_machine: "",
      serial_machine: "",
      RFID_machine: "",
      NFC_machine: "",
      type_machine: "",
      model_machine: "",
      manufacturer: "",
      price: "",
      date_of_use: "",
      lifespan: "",
      repair_cost: "",
      note: "",
      current_status: "available",
      name_category: "",
    });
    setOpenCreateMachineDialog(true);
  };

  const handleCloseCreateMachineDialog = () => {
    setOpenCreateMachineDialog(false);
  };

  const handleCreateMachineInputChange = (field, value) => {
    setNewMachineData({ ...newMachineData, [field]: value });
  };

  const handleGenerateCodeForNewMachine = async () => {
    if (newMachineData.manufacturer) {
      try {
        const result = await api.machines.getNextCode(
          newMachineData.manufacturer
        );
        if (result.success && result.data.nextCode) {
          setNewMachineData((prev) => ({
            ...prev,
            code_machine: result.data.nextCode,
          }));
        }
      } catch (err) {
        console.error("Failed to auto-generate code", err);
      }
    }
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
      const result = await api.machines.create(newMachineData);
      if (result.success) {
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

  // --- Import Excel Logic ---
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
            let cellValue = row[vietnameseHeader];

            if (cellValue !== undefined) {
              // 1. Xử lý dữ liệu chuỗi (cắt khoảng trắng thừa)
              if (typeof cellValue === "string") {
                cellValue = cellValue.trim();
              }

              // 2. Xử lý các trường SỐ (Giá, Chi phí)
              if (["price", "repair_cost"].includes(englishKey)) {
                if (typeof cellValue === "string") {
                  const clean = cellValue.replace(/[^0-9]/g, "");
                  const parsed = parseInt(clean, 10);
                  newRow[englishKey] = isNaN(parsed) ? 0 : parsed;
                } else if (typeof cellValue === "number") {
                  newRow[englishKey] = cellValue;
                }
              }
              // 3. Giữ nguyên các trường khác
              else {
                newRow[englishKey] = cellValue;
              }
            }
          }

          // 4. Xử lý riêng Date
          const dateString = newRow.date_of_use;
          if (dateString) {
            if (typeof dateString === "string") {
              const parts = dateString.split("/");
              if (parts.length === 3) {
                newRow.date_of_use = new Date(
                  +parts[2],
                  parts[1] - 1,
                  +parts[0]
                );
              } else {
                newRow.date_of_use = null;
              }
            } else if (dateString instanceof Date) {
              newRow.date_of_use = dateString;
            }
          }

          return newRow;
        });

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
            let addedCount = 0;
            for (const newMachine of result.data.successes) {
              if (newMachine.serial) {
                try {
                  const machineData = await api.machines.getBySerial(
                    newMachine.serial,
                    { ticket_type: "purchased" }
                  );
                  if (machineData.success) {
                    handleSelectMachine(machineData.data);
                    addedCount++;
                  }
                } catch (findErr) {
                  console.error("Lỗi tìm máy:", findErr);
                }
              }
            }
            if (addedCount > 0)
              showNotification(
                "info",
                "Đã thêm máy",
                `Đã tự động thêm ${addedCount} máy vào phiếu.`
              );
          }
        } else {
          showNotification(
            "error",
            "Lỗi import",
            result.message || "Lỗi không xác định"
          );
        }
      } catch (err) {
        console.error("Error parsing file:", err);
        showNotification("error", "Lỗi xử lý file", err.message);
      } finally {
        setIsImporting(false);
      }
    };
    reader.readAsBinaryString(importFile);
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
      borrowed_out_return: "Nhập trả (máy cho mượn)",
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

      // --- Helper vẽ luồng duyệt chi tiết (Full Name + MaNV) ---
      const renderDetailedFlow = (flow) => {
        if (!flow || flow.length === 0)
          return (
            <Typography variant="caption" color="text.secondary">
              Chưa có cấu hình luồng duyệt
            </Typography>
          );

        // 1. Gom nhóm theo step_flow
        const groupedSteps = flow.reduce((acc, curr) => {
          const step = curr.step_flow ?? 0;
          if (!acc[step]) acc[step] = [];
          acc[step].push(curr);
          return acc;
        }, {});

        // Lấy danh sách các bước và sắp xếp tăng dần
        const sortedStepKeys = Object.keys(groupedSteps).sort(
          (a, b) => Number(a) - Number(b)
        );

        return (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              flexWrap: "nowrap",
              gap: 2,
              py: 1,
              overflowX: "auto",
            }}
          >
            <Typography
              variant="body2"
              sx={{ fontWeight: 700, mr: 1, whiteSpace: "nowrap" }}
            >
              <WifiTethering
                sx={{ fontSize: 16, verticalAlign: "text-top", mr: 0.5 }}
              />
              Luồng duyệt
            </Typography>

            {sortedStepKeys.map((stepKey, groupIndex) => {
              const group = groupedSteps[stepKey];
              const isLastGroup = groupIndex === sortedStepKeys.length - 1;

              return (
                <React.Fragment key={stepKey}>
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 1,
                      justifyContent: "center",
                    }}
                  >
                    {group.map((step, idx) => {
                      // Logic màu sắc
                      const statusText = step.status_text || "Đang chờ duyệt";
                      const statusLower = statusText.toLowerCase();

                      const isApproved =
                        statusLower.includes("đã duyệt") ||
                        statusLower.includes("đồng ý");
                      const isRejected =
                        statusLower.includes("hủy") ||
                        statusLower.includes("từ chối");
                      const isForwarded = step.is_forward === 1;

                      const isSkipped = statusLower.includes("đồng cấp");

                      let statusColor = "#ff9800";
                      let bgColor = "#fff3e0";
                      let borderColor = "#ffcc80";
                      let opacity = 1;

                      if (isApproved) {
                        statusColor = "#2e7d32";
                        bgColor = "#e8f5e9";
                        borderColor = "#a5d6a7";
                      } else if (isRejected) {
                        statusColor = "#d32f2f";
                        bgColor = "#ffebee";
                        borderColor = "#ef9a9a";
                      } else if (isSkipped) {
                        statusColor = "#9e9e9e";
                        bgColor = "#f5f5f5";
                        borderColor = "#e0e0e0";
                        opacity = 0.7;
                      }

                      return (
                        <Box
                          key={idx}
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            opacity: opacity,
                          }}
                        >
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1.5,
                              px: 2,
                              py: 0.5,
                              borderRadius: "20px",
                              backgroundColor: bgColor,
                              border: `1px solid ${
                                step.isFinalFlow ? "#FFD700" : borderColor
                              }`,
                              boxShadow: step.isFinalFlow
                                ? "0 0 5px rgba(255, 215, 0, 0.5)"
                                : "none",
                              minWidth: "200px",
                            }}
                          >
                            <Avatar
                              sx={{
                                width: 22,
                                height: 22,
                                fontSize: "0.7rem",
                                bgcolor: statusColor,
                                color: "#fff",
                                fontWeight: "bold",
                              }}
                            >
                              {isSkipped ? "-" : Number(stepKey) + 1}
                            </Avatar>
                            <Box>
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 1,
                                }}
                              >
                                <Typography
                                  variant="body2"
                                  sx={{
                                    fontWeight: 600,
                                    fontSize: "0.85rem",
                                    color: isSkipped
                                      ? "text.secondary"
                                      : "text.primary",
                                  }}
                                >
                                  {step.ten_nv}
                                </Typography>
                                {isForwarded && (
                                  <Chip
                                    label="Chuyển tiếp"
                                    size="small"
                                    variant="outlined"
                                    sx={{
                                      height: 16,
                                      fontSize: "0.8rem",
                                      borderColor: "#9e9e9e",
                                      color: "#fd3333",
                                      backgroundColor: "#ffffff80",
                                    }}
                                  />
                                )}
                              </Box>

                              <Typography
                                variant="caption"
                                sx={{
                                  display: "block",
                                  lineHeight: 1,
                                  color: "text.secondary",
                                }}
                              >
                                {step.ma_nv} •{" "}
                                <span
                                  style={{
                                    color: statusColor,
                                    fontStyle: "italic",
                                    fontWeight: "bold",
                                  }}
                                >
                                  {statusText}
                                </span>
                              </Typography>
                            </Box>
                          </Box>
                        </Box>
                      );
                    })}
                  </Box>
                  {!isLastGroup && (
                    <Box
                      sx={{
                        mx: 0.5,
                        width: 20,
                        height: 2,
                        bgcolor: "#bdbdbd",
                        flexShrink: 0,
                      }}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </Box>
        );
      };

      const isHovered = hoveredRowUuid === uuid;
      const hoverBackgroundColor = "rgba(0, 0, 0, 0.04)";
      return (
        <React.Fragment key={uuid}>
          {/* HÀNG 1: THÔNG TIN CHUNG */}
          <TableRow
            onMouseEnter={() => setHoveredRowUuid(uuid)}
            onMouseLeave={() => setHoveredRowUuid(null)}
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
            sx={{
              cursor: "pointer",
              backgroundColor: isHovered ? hoverBackgroundColor : "inherit",
              "& td": { borderBottom: "none", pb: 0.5 },
            }}
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

          {/* HÀNG 2: LUỒNG DUYỆT CHI TIẾT */}
          <TableRow
            onMouseEnter={() => setHoveredRowUuid(uuid)}
            onMouseLeave={() => setHoveredRowUuid(null)}
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
            sx={{
              cursor: "pointer",
              backgroundColor: isHovered
                ? hoverBackgroundColor
                : "rgba(249, 250, 251, 0.4)",
            }}
          >
            <TableCell colSpan={7} sx={{ pt: 0.5, pb: 2 }}>
              {renderDetailedFlow(item.approval_flow)}
            </TableCell>
          </TableRow>
        </React.Fragment>
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
                    ? [
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
                    : [
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

        {/* Dialog Create/View Ticket */}
        <Dialog
          open={openDialog}
          onClose={handleCloseDialog}
          maxWidth="lg"
          fullScreen
          fullWidth
          PaperProps={{ sx: { borderRadius: isMobile ? 0 : "20px" } }}
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
                              Thông tin đơn vị (mượn/thuê/cho mượn)
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

                                  handleFormChange(
                                    "is_borrowed_or_rented_or_borrowed_out_name",
                                    newName
                                  );

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
                      {dialogType === "export" && (
                        <Card
                          variant="outlined"
                          sx={{ borderRadius: "12px", mb: 2 }}
                        >
                          <CardContent>
                            <Typography variant="h6" gutterBottom>
                              Thông tin bổ sung
                            </Typography>
                            <Stack spacing={2}>
                              <TextField
                                fullWidth
                                label="Họ tên người nhận"
                                value={formData.receiver_name}
                                onChange={(e) =>
                                  handleFormChange(
                                    "receiver_name",
                                    e.target.value
                                  )
                                }
                                disabled={dialogMode === "view"}
                                sx={DISABLED_VIEW_SX}
                              />

                              <Stack
                                direction={{ xs: "column", sm: "row" }}
                                spacing={2}
                              >
                                <TextField
                                  fullWidth
                                  label="Số xe"
                                  value={formData.vehicle_number}
                                  onChange={(e) =>
                                    handleFormChange(
                                      "vehicle_number",
                                      e.target.value
                                    )
                                  }
                                  disabled={dialogMode === "view"}
                                  sx={DISABLED_VIEW_SX}
                                />
                                <TextField
                                  fullWidth
                                  label="Địa chỉ (Bộ phận)"
                                  value={formData.department_address}
                                  onChange={(e) =>
                                    handleFormChange(
                                      "department_address",
                                      e.target.value
                                    )
                                  }
                                  disabled={dialogMode === "view"}
                                  sx={DISABLED_VIEW_SX}
                                />
                              </Stack>
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
                          formData.type === "borrowed_out" ||
                          dialogMode === "view"
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
                                  Quét Mã QR
                                </Button>
                                <Button
                                  variant="outlined"
                                  startIcon={<WifiTethering />}
                                  onClick={() => setOpenRfidDialog(true)}
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
                                  Quét RFID/NFC
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
                              <Stack
                                direction={{ xs: "column", sm: "row" }}
                                spacing={2}
                                sx={{ mb: 2, flexWrap: "wrap" }}
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
                                  Quét Mã QR
                                </Button>
                                <Button
                                  variant="outlined"
                                  startIcon={<WifiTethering />}
                                  onClick={() => setOpenRfidDialog(true)}
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
                                  Quét RFID/NFC
                                </Button>
                              </Stack>
                            )}

                            <Tooltip
                              arrow
                              placement="top-start"
                              title={
                                <Box sx={{ p: 1 }}>
                                  <Typography
                                    variant="subtitle2"
                                    fontWeight="bold"
                                    sx={{ mb: 1 }}
                                  >
                                    Mẹo tìm kiếm nâng cao:
                                  </Typography>
                                  <ul
                                    style={{
                                      margin: 0,
                                      paddingLeft: "1.2rem",
                                      fontSize: "0.85rem",
                                      lineHeight: "1.5",
                                    }}
                                  >
                                    <li>Nhập thường: Tìm tất cả thông tin</li>
                                    <li>
                                      <b>loai:</b>... (Tìm theo Loại)
                                    </li>
                                    <li>
                                      <b>model:</b>... (Tìm theo Model)
                                    </li>
                                    <li>
                                      <b>rfid:</b>... (Tìm theo RFID)
                                    </li>
                                    <li>
                                      <b>nfc:</b>... (Tìm theo NFC)
                                    </li>
                                    <li>
                                      <b>seri:</b>... (Tìm theo Serial)
                                    </li>
                                    <li>
                                      <b>hang:</b>... (Tìm theo Hãng SX)
                                    </li>
                                    <li>
                                      <b>ma:</b>... (Tìm theo Mã máy)
                                    </li>
                                  </ul>
                                </Box>
                              }
                            >
                              <TextField
                                fullWidth
                                placeholder="Tìm kiếm máy"
                                defaultValue=""
                                inputRef={searchInputRef}
                                onChange={handleSearchChange}
                                disabled={isFormDisabled}
                                sx={{
                                  mb: 2,
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
                                  endAdornment: (
                                    <InputAdornment position="end">
                                      {searchLoading ? (
                                        <CircularProgress size={20} />
                                      ) : (
                                        /* Nút Xóa Input */
                                        <IconButton
                                          onClick={() => {
                                            if (searchInputRef.current) {
                                              searchInputRef.current.value = "";
                                              searchInputRef.current.focus();
                                            }
                                            setSearchMachineTerm("");
                                            setSearchResults([]); // Xóa kết quả tìm kiếm
                                          }}
                                          edge="end"
                                          size="small"
                                          sx={{ color: "text.secondary" }}
                                        >
                                          <Close fontSize="small" />
                                        </IconButton>
                                      )}
                                    </InputAdornment>
                                  ),
                                }}
                              />
                            </Tooltip>
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
                                        let borrowLabel = "";
                                        if (
                                          machine.is_borrowed_or_rented_or_borrowed_out
                                        ) {
                                          borrowLabel = getMachineStatusLabel(
                                            machine.is_borrowed_or_rented_or_borrowed_out
                                          );
                                          if (
                                            machine.is_borrowed_or_rented_or_borrowed_out ===
                                            "borrowed"
                                          ) {
                                            borrowLabel =
                                              machine.is_borrowed_or_rented_or_borrowed_out_return_date
                                                ? "Máy mượn ngắn hạn"
                                                : "Máy mượn dài hạn";
                                          }
                                        }
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
                                                      label={borrowLabel}
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
                                  Danh sách máy sẽ thêm (
                                  {formData.machines.length} máy):{" "}
                                </Typography>
                                <Stack spacing={2}>
                                  {formData.machines.map((machine) => {
                                    let borrowLabel = "";
                                    if (
                                      machine.is_borrowed_or_rented_or_borrowed_out
                                    ) {
                                      borrowLabel = getMachineStatusLabel(
                                        machine.is_borrowed_or_rented_or_borrowed_out
                                      );
                                      if (
                                        machine.is_borrowed_or_rented_or_borrowed_out ===
                                        "borrowed"
                                      ) {
                                        borrowLabel =
                                          machine.is_borrowed_or_rented_or_borrowed_out_return_date
                                            ? "Máy mượn ngắn hạn"
                                            : "Máy mượn dài hạn";
                                      }
                                    }
                                    return (
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
                                                    label={borrowLabel}
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
                                    );
                                  })}
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
                                        Phân loại
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
                      {dialogMode === "view" &&
                        selectedTicket?.approval_flow &&
                        selectedTicket.approval_flow.length > 0 && (
                          <Card
                            variant="outlined"
                            sx={{ borderRadius: "12px", mt: 2, mb: 2 }}
                          >
                            <CardContent>
                              <Typography
                                variant="h6"
                                gutterBottom
                                sx={{
                                  fontWeight: 600,
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 1,
                                }}
                              >
                                <WifiTethering
                                  sx={{ transform: "rotate(90deg)" }}
                                />{" "}
                                Quy trình duyệt
                              </Typography>

                              {/* Container chính: Scroll ngang nếu quá dài */}
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  flexWrap: "nowrap", // Không xuống dòng để giữ flow ngang
                                  gap: 2,
                                  mt: 2,
                                  overflowX: "auto",
                                  pb: 1, // Padding bottom để scrollbar không che content
                                }}
                              >
                                {(() => {
                                  // 1. Gom nhóm các bước duyệt theo step_flow
                                  const groupedSteps =
                                    selectedTicket.approval_flow.reduce(
                                      (acc, curr) => {
                                        const step = curr.step_flow ?? 0;
                                        if (!acc[step]) acc[step] = [];
                                        acc[step].push(curr);
                                        return acc;
                                      },
                                      {}
                                    );

                                  // 2. Sắp xếp key để hiển thị theo thứ tự: Cấp 1 -> Cấp 2...
                                  const sortedStepKeys = Object.keys(
                                    groupedSteps
                                  ).sort((a, b) => Number(a) - Number(b));

                                  return sortedStepKeys.map(
                                    (stepKey, groupIndex) => {
                                      const group = groupedSteps[stepKey];
                                      const isLastGroup =
                                        groupIndex ===
                                        sortedStepKeys.length - 1;

                                      return (
                                        <React.Fragment key={stepKey}>
                                          {/* Cột chứa các người duyệt trong cùng 1 cấp (xếp dọc) */}
                                          <Box
                                            sx={{
                                              display: "flex",
                                              flexDirection: "column",
                                              gap: 1.5,
                                              justifyContent: "center",
                                            }}
                                          >
                                            {group.map((step, index) => {
                                              // --- LOGIC MÀU SẮC & TRẠNG THÁI ---
                                              const statusText =
                                                step.status_text ||
                                                "Đang chờ duyệt";
                                              const statusLower =
                                                statusText.toLowerCase();

                                              const isApproved =
                                                statusLower.includes(
                                                  "đã duyệt"
                                                ) ||
                                                statusLower.includes("đồng ý");
                                              const isRejected =
                                                statusLower.includes("hủy") ||
                                                statusLower.includes("từ chối");
                                              const isForwarded =
                                                step.is_forward === 1;
                                              const isSkipped =
                                                statusLower.includes(
                                                  "đồng cấp"
                                                );

                                              // Màu mặc định (Chờ duyệt - Cam)
                                              let statusColor = "#ff9800";
                                              let bgColor = "#fff3e0";
                                              let borderColor = "#ffcc80";
                                              let opacity = 1;

                                              if (isApproved) {
                                                // Xanh lá
                                                statusColor = "#2e7d32";
                                                bgColor = "#e8f5e9";
                                                borderColor = "#a5d6a7";
                                              } else if (isRejected) {
                                                // Đỏ
                                                statusColor = "#d32f2f";
                                                bgColor = "#ffebee";
                                                borderColor = "#ef9a9a";
                                              } else if (isSkipped) {
                                                // Xám (Đồng cấp đã duyệt)
                                                statusColor = "#757575";
                                                bgColor = "#f5f5f5";
                                                borderColor = "#e0e0e0";
                                                opacity = 0.7;
                                              }

                                              return (
                                                <Box
                                                  key={index}
                                                  sx={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    opacity: opacity,
                                                  }}
                                                >
                                                  <Box
                                                    sx={{
                                                      display: "flex",
                                                      alignItems: "center",
                                                      gap: 1.5,
                                                      px: 2.5,
                                                      py: 1,
                                                      borderRadius: "24px",
                                                      backgroundColor: bgColor,
                                                      border: `1px solid ${
                                                        step.isFinalFlow
                                                          ? "#FFD700"
                                                          : borderColor
                                                      }`,
                                                      boxShadow:
                                                        step.isFinalFlow &&
                                                        !isSkipped
                                                          ? "0 0 8px rgba(255, 215, 0, 0.6)"
                                                          : "none",
                                                      minWidth: "240px",
                                                      transition:
                                                        "transform 0.2s",
                                                      "&:hover": {
                                                        transform: isSkipped
                                                          ? "none"
                                                          : "translateY(-2px)",
                                                      },
                                                    }}
                                                  >
                                                    <Avatar
                                                      sx={{
                                                        width: 30,
                                                        height: 30,
                                                        fontSize: "0.9rem",
                                                        bgcolor: statusColor,
                                                        color: "#fff",
                                                        fontWeight: "bold",
                                                      }}
                                                    >
                                                      {isSkipped
                                                        ? "-"
                                                        : Number(stepKey) + 1}
                                                    </Avatar>

                                                    <Box>
                                                      <Box
                                                        sx={{
                                                          display: "flex",
                                                          alignItems: "center",
                                                          gap: 1,
                                                        }}
                                                      >
                                                        <Typography
                                                          variant="body2"
                                                          sx={{
                                                            fontWeight: 700,
                                                            fontSize: "0.95rem",
                                                            color: isSkipped
                                                              ? "text.secondary"
                                                              : "text.primary",
                                                          }}
                                                        >
                                                          {step.ten_nv}
                                                        </Typography>
                                                        {isForwarded && (
                                                          <Chip
                                                            label="Chuyển tiếp"
                                                            size="small"
                                                            variant="outlined"
                                                            sx={{
                                                              height: 20,
                                                              fontSize:
                                                                "0.8rem",
                                                              borderColor:
                                                                "#9e9e9e",
                                                              color: "#fd3333",
                                                              backgroundColor:
                                                                "#ffffff80",
                                                            }}
                                                          />
                                                        )}
                                                      </Box>

                                                      <Typography
                                                        variant="caption"
                                                        sx={{
                                                          display: "block",
                                                          lineHeight: 1.2,
                                                          fontSize: "0.8rem",
                                                          mt: 0.5,
                                                          color:
                                                            "text.secondary",
                                                        }}
                                                      >
                                                        {step.ma_nv} •{" "}
                                                        <span
                                                          style={{
                                                            color: statusColor,
                                                            fontStyle: "italic",
                                                            fontWeight: "bold",
                                                          }}
                                                        >
                                                          {statusText}
                                                        </span>
                                                      </Typography>
                                                    </Box>
                                                  </Box>
                                                </Box>
                                              );
                                            })}
                                          </Box>

                                          {/* Mũi tên nối giữa các cấp (trừ cấp cuối) */}
                                          {!isLastGroup && (
                                            <Box
                                              sx={{
                                                mx: 1,
                                                minWidth: 20,
                                                height: 2,
                                                bgcolor: "#bdbdbd",
                                                flexShrink: 0,
                                              }}
                                            />
                                          )}
                                        </React.Fragment>
                                      );
                                    }
                                  );
                                })()}
                              </Box>
                            </CardContent>
                          </Card>
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
            <Box sx={{ width: "1px" }} />{" "}
            {/* Placeholder - no action buttons for view mode */}
            <Box
              sx={{
                display: "flex",
                gap: 2,
                width: { xs: "100%", sm: "auto" },
                justifyContent: { xs: "stretch", sm: "flex-end" },
                flexDirection: { xs: "column-reverse", sm: "row" },
              }}
            >
              <Button
                variant="outlined"
                onClick={handleCloseDialog}
                sx={{
                  borderRadius: "12px",
                  px: 3,
                  width: { xs: "100%", sm: "auto" },
                }}
              >
                Đóng
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
                    width: { xs: "100%", sm: "auto" },
                  }}
                >
                  {loading ? <CircularProgress size={24} /> : "Tạo Phiếu"}
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
                  // THÊM MỚI: Nút refresh
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <Tooltip title="Tự động tạo mã theo Hãng SX">
                          <IconButton
                            onClick={handleGenerateCodeForNewMachine}
                            edge="end"
                          >
                            <Refresh />
                          </IconButton>
                        </Tooltip>
                      </InputAdornment>
                    ),
                  }}
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
                <TextField
                  fullWidth
                  label="NFC"
                  value={newMachineData.NFC_machine || ""}
                  onChange={(e) =>
                    handleCreateMachineInputChange(
                      "NFC_machine",
                      e.target.value
                    )
                  }
                  disabled={!canCreateOrImportMachines}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl
                  fullWidth
                  disabled={!canCreateOrImportMachines}
                  required
                >
                  <InputLabel>Phân loại</InputLabel>
                  <Select
                    name="name_category"
                    value={newMachineData.name_category || ""}
                    label="Phân loại"
                    onChange={(e) =>
                      handleCreateMachineInputChange(
                        "name_category",
                        e.target.value
                      )
                    }
                  >
                    {categoryOptions.map((category) => (
                      <MenuItem
                        key={category.name_category}
                        value={category.name_category}
                      >
                        {category.name_category}
                      </MenuItem>
                    ))}
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
                  // THÊM MỚI: Sự kiện onBlur
                  onBlur={handleGenerateCodeForNewMachine}
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
                    <MenuItem value="available">Có thể sử dụng</MenuItem>
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
              Đóng
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
                1. Chuẩn bị file Excel (.xlsx hoặc .xls) với các cột dữ liệu
                theo đúng tên cột.
              </Typography>
              <Typography variant="body2" gutterBottom>
                2. Các cột <strong>bắt buộc</strong> (được tô vàng trong file
                mẫu): <strong>Mã máy</strong>, <strong>Serial</strong>,{" "}
                <strong>Loại máy</strong>,{" "}
                <strong>Phân loại (Máy móc thiết bị/Phụ kiện)</strong>.
              </Typography>
              <Typography variant="body2" gutterBottom>
                3. Cột <strong>Phân loại</strong>: Nhập "
                <strong>Máy móc thiết bị</strong>" hoặc "
                <strong>Phụ kiện</strong>".
              </Typography>
              <Typography variant="body2" gutterBottom>
                4. Cột <strong>Ngày sử dụng</strong>: Nhập định dạng{" "}
                <strong>DD/MM/YYYY</strong> (ví dụ: 31/10/2025).
              </Typography>
              <Typography variant="body2">
                5. Hệ thống sẽ kiểm tra trùng lặp <strong>Mã máy</strong> và{" "}
                <strong>Serial</strong> đã có trong CSDL.
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

        <RfidScannerDialog
          open={openRfidDialog}
          onClose={() => setOpenRfidDialog(false)}
          onAddMachines={handleAddMachinesFromRfid}
          apiParams={scannerApiParams}
          showNotification={showNotification}
          selectedMachineUuids={formData.machines.map((m) => m.uuid_machine)}
        />

        {/* Snackbar Notification */}
        <Snackbar
          open={notification.open}
          autoHideDuration={5000}
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

export default TestProposalPage;
