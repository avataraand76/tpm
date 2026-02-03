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
  Accordion,
  AccordionSummary,
  AccordionDetails,
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
  FactCheck,
  PlaylistAddCheck,
  Assessment,
  ExpandMore,
  EditNote,
} from "@mui/icons-material";
import * as XLSX from "xlsx-js-style";
import ExcelJS from "exceljs";
import NavigationBar from "../components/NavigationBar";
import { api } from "../api/api";
import MachineQRScanner from "../components/MachineQRScanner";
import FileUploadComponent from "../components/FileUploadComponent";
import RfidScannerDialog from "../components/RfidScannerDialog";
import RfidSearch from "../components/RfidSearch";
import { useAuth } from "../hooks/useAuth";

// Component con để hiển thị từng vị trí kiểm kê (Accordion + Filter)
const InventoryLocationItem = ({
  location,
  snapshotCount,
  canEdit,
  onRemoveMachine,
}) => {
  const [filter, setFilter] = useState("all"); // 'all', 'same', 'diff'

  // 1. Phân loại máy
  const allMachines = location.scanned_machine || [];
  const sameDeptMachines = allMachines.filter((m) => m.misdepartment !== "1");
  const diffDeptMachines = allMachines.filter((m) => m.misdepartment === "1");

  // 2. Tính toán chỉ số
  const countSystem = snapshotCount || 0;
  const countActualTotal = allMachines.length;
  const countSame = sameDeptMachines.length;
  const countDiff = diffDeptMachines.length;
  const countGap = countSystem - countActualTotal; // Chênh lệch = Sổ sách - Tổng thực tế

  // 3. Lọc danh sách hiển thị
  const displayedMachines =
    filter === "all"
      ? allMachines
      : filter === "same"
      ? sameDeptMachines
      : diffDeptMachines;

  return (
    <Accordion
      defaultExpanded
      sx={{
        borderRadius: "12px",
        overflow: "hidden",
        mb: 2,
        border: "1px solid #e0e0e0",
      }}
      elevation={0}
    >
      <AccordionSummary expandIcon={<ExpandMore />}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          alignItems={{ xs: "flex-start", md: "center" }}
          spacing={2}
          sx={{ width: "100%", pr: 2 }}
        >
          {/* Tên vị trí */}
          <Typography
            variant="subtitle1"
            sx={{ fontWeight: 700, minWidth: "200px" }}
          >
            📍 {location.location_name}
          </Typography>

          {/* Các Chips Thống kê */}
          <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
            <Tooltip title="Số lượng trên sổ sách">
              <Chip
                label={`Sổ sách: ${countSystem}`}
                size="small"
                sx={{
                  bgcolor: "#e3f2fd",
                  color: "#1565c0",
                  fontWeight: 600,
                  border: "1px solid #bbdefb",
                }}
              />
            </Tooltip>

            <Tooltip title="Thực tế (Thuộc đơn vị này)">
              <Chip
                label={`Cùng ĐV: ${countSame}`}
                size="small"
                sx={{
                  bgcolor: "#e8f5e9",
                  color: "#2e7d32",
                  fontWeight: 600,
                  border: "1px solid #c8e6c9",
                }}
              />
            </Tooltip>

            <Tooltip title="Thực tế (Thuộc đơn vị khác)">
              <Chip
                label={`Khác ĐV: ${countDiff}`}
                size="small"
                sx={{
                  bgcolor: "#fff3e0",
                  color: "#ed6c02",
                  fontWeight: 600,
                  border: "1px solid #ffe0b2",
                }}
              />
            </Tooltip>

            <Tooltip title="Chênh lệch (Sổ sách - Thực tế)">
              <Chip
                label={`Chênh lệch: ${countGap}`}
                size="small"
                sx={{
                  bgcolor: "#ffebee",
                  color: "#d32f2f",
                  fontWeight: 600,
                  border: "1px solid #ffcdd2",
                }}
              />
            </Tooltip>
          </Stack>
        </Stack>
      </AccordionSummary>

      <AccordionDetails sx={{ bgcolor: "#fafafa", p: 2 }}>
        {/* Bộ lọc */}
        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          <Button
            size="small"
            variant={filter === "all" ? "contained" : "outlined"}
            onClick={() => setFilter("all")}
            sx={{ borderRadius: "8px", textTransform: "none" }}
          >
            Tất cả ({countActualTotal})
          </Button>
          <Button
            size="small"
            variant={filter === "same" ? "contained" : "outlined"}
            color="success"
            onClick={() => setFilter("same")}
            sx={{ borderRadius: "8px", textTransform: "none" }}
          >
            Cùng ĐV ({countSame})
          </Button>
          <Button
            size="small"
            variant={filter === "diff" ? "contained" : "outlined"}
            color="warning"
            onClick={() => setFilter("diff")}
            sx={{ borderRadius: "8px", textTransform: "none" }}
          >
            Khác ĐV ({countDiff})
          </Button>
        </Stack>

        {/* Bảng dữ liệu */}
        <TableContainer
          component={Paper}
          elevation={0}
          sx={{ border: "1px solid #e0e0e0", maxHeight: 300 }}
        >
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Tên máy</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Serial</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Vị trí hiện tại</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Trạng thái</TableCell>
                {canEdit && (
                  <TableCell align="center" sx={{ fontWeight: 600 }}>
                    Xóa
                  </TableCell>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {displayedMachines.length > 0 ? (
                displayedMachines.map((machine, idx) => {
                  const isMisDept = machine.misdepartment === "1";
                  const isMisLoc = machine.mislocation === "1";

                  return (
                    <TableRow key={idx} hover>
                      <TableCell>{machine.name || "-"}</TableCell>
                      <TableCell>{machine.serial || "-"}</TableCell>
                      <TableCell>{machine.current_location || "-"}</TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1}>
                          {isMisDept ? (
                            <Chip
                              label="Khác ĐV"
                              size="small"
                              color="warning"
                              variant="outlined"
                            />
                          ) : (
                            <Chip
                              label="Cùng ĐV"
                              size="small"
                              color="success"
                              variant="outlined"
                            />
                          )}
                          {isMisLoc && (
                            <Chip
                              label="Sai vị trí"
                              size="small"
                              color="error"
                              variant="outlined"
                            />
                          )}
                        </Stack>
                      </TableCell>

                      {canEdit && (
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() =>
                              onRemoveMachine(
                                location.location_uuid,
                                machine.uuid
                              )
                            }
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    align="center"
                    sx={{ py: 2, color: "text.secondary" }}
                  >
                    Không có máy nào trong bộ lọc này
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </AccordionDetails>
    </Accordion>
  );
};

const excelHeaderMapping = {
  // Vietnamese Header : English JSON Key
  "Mã máy": "code_machine",
  Serial: "serial_machine",
  "Loại máy": "type_machine",
  "Đặc tính": "attribute_machine",
  "Model máy": "model_machine",
  "Hãng sản xuất": "manufacturer",
  "Nhà cung cấp": "supplier",
  RFID: "RFID_machine",
  NFC: "NFC_machine",
  "Giá (VNĐ)": "price",
  "Ngày sử dụng (DD/MM/YYYY)": "date_of_use",
  "Tuổi thọ (năm)": "lifespan",
  "Chi phí sửa chữa (VNĐ)": "repair_cost",
  "Công suất": "power",
  "Áp suất": "pressure",
  "Điện áp": "voltage",
  "Ghi chú": "note",
};
// Lấy danh sách các cột bắt buộc (sẽ dùng để tô màu)
const requiredHeaders = ["Serial", "Loại máy"];

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

  // Phân quyền cho Kiểm kê
  const canViewInventoryTab =
    isAdmin || isPhongCoDien || isCoDienXuong || isViewOnly;
  const canCreateInventory = isAdmin || isPhongCoDien;

  // Tab state
  const [activeTab, setActiveTab] = useState(isCoDienXuong ? 2 : 0); // 0: Import, 1: Export, 2: Internal, 3: Inventory

  // Data states
  const [imports, setImports] = useState([]);
  const [exports, setExports] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [inventories, setInventories] = useState([]);

  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [dateFromFilter, setDateFromFilter] = useState("");
  const [dateToFilter, setDateToFilter] = useState("");

  // Statistics states
  const [importStats, setImportStats] = useState(null);
  const [exportStats, setExportStats] = useState(null);
  const [transferStats, setTransferStats] = useState(null);
  const [inventoryStats, setInventoryStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Location Data
  const [filteredLocations, setFilteredLocations] = useState([]);
  const [locationLoading, setLocationLoading] = useState(false);
  const [externalLocations, setExternalLocations] = useState([]);
  const [externalLocationLoading, setExternalLocationLoading] = useState(false);
  const [allLocationsForFilter, setAllLocationsForFilter] = useState([]);

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

  // State for autocomplete options (using objects like MachineListPage)
  const [formMachineTypes, setFormMachineTypes] = useState([]);
  const [formAttributes, setFormAttributes] = useState([]);
  const [formManufacturers, setFormManufacturers] = useState([]);
  const [formSuppliers, setFormSuppliers] = useState([]);

  // Import Excel Dialog State
  const [openImportDialog, setOpenImportDialog] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState(null);
  const [fileName, setFileName] = useState("");
  const searchTimeoutRef = useRef(null);
  const searchInputRef = useRef(null);

  // Inventory Scan Dialog State
  const [openInventoryScanDialog, setOpenInventoryScanDialog] = useState(false);
  const [inventoryScannedList, setInventoryScannedList] = useState([]);
  const [openInventoryRfidSearchDialog, setOpenInventoryRfidSearchDialog] =
    useState(false);
  const [inventoryRfidSearchTargets, setInventoryRfidSearchTargets] = useState(
    []
  );

  // Inventory Department Detail State
  const [currentDepartment, setCurrentDepartment] = useState(null);
  const [selectedLocationForScan, setSelectedLocationForScan] = useState(null);
  const [scannedLocationsList, setScannedLocationsList] = useState([]);
  const [departmentLocations, setDepartmentLocations] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [departmentLoading, setDepartmentLoading] = useState(false);

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
    pending_liquidation: {
      bg: "#ff572222",
      color: "#ff5722",
      label: "Chờ thanh lý",
    },
    disabled: { bg: "#9e9e9e22", color: "#9e9e9e", label: "Chưa sử dụng" },
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

  const fetchDepartments = useCallback(async () => {
    setDepartmentLoading(true);
    try {
      const response = await api.departments.getAll();
      // Lọc bỏ các đơn vị bên ngoài (external)
      const internalDepartments = response.data.filter(
        (dept) =>
          dept.type !== "external" &&
          dept.name_department !== "Đơn vị bên ngoài"
      );
      setDepartments(internalDepartments);
    } catch (error) {
      console.error("Error fetching departments:", error);
      showNotification("error", "Tải thất bại", "Lỗi khi tải danh sách đơn vị");
      setDepartments([]);
    } finally {
      setDepartmentLoading(false);
    }
  }, [showNotification]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20, status: statusFilter };

      // Add date filters
      if (dateFromFilter) {
        params.date_from = dateFromFilter;
      }
      if (dateToFilter) {
        params.date_to = dateToFilter;
      }

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
        if (locationFilter) {
          params.to_location_uuid = locationFilter;
        }
        response = await api.internal_transfers.getAll(params);
        setTransfers(response.data);
      } else if (activeTab === 3) {
        delete params.import_type;
        delete params.export_type;
        response = await api.inventory.getAll(params);
        setInventories(response.data);
      }
      setTotalPages(response.pagination.totalPages);
    } catch (error) {
      console.error("Error fetching data:", error);
      showNotification("error", "Tải thất bại", "Lỗi khi tải dữ liệu phiếu");
    } finally {
      setLoading(false);
    }
  }, [
    activeTab,
    page,
    statusFilter,
    typeFilter,
    locationFilter,
    dateFromFilter,
    dateToFilter,
    showNotification,
  ]);

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

  // Fetch statistics
  const fetchStatistics = useCallback(async () => {
    setStatsLoading(true);
    try {
      if (activeTab === 0) {
        const response = await api.imports.getStats();
        setImportStats(response.data);
      } else if (activeTab === 1) {
        const response = await api.exports.getStats();
        setExportStats(response.data);
      } else if (activeTab === 2) {
        const response = await api.internal_transfers.getStats();
        setTransferStats(response.data);
      } else if (activeTab === 3) {
        const response = await api.inventory.getStats();
        setInventoryStats(response.data);
      }
    } catch (error) {
      console.error("Error fetching statistics:", error);
    } finally {
      setStatsLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchStatistics();
  }, [fetchStatistics]);

  useEffect(() => {
    fetchExternalLocations();
  }, [fetchExternalLocations, showNotification]);

  // Fetch all locations for filter when on transfer tab
  useEffect(() => {
    const fetchAllLocationsForFilter = async () => {
      if (activeTab === 2) {
        try {
          const response = await api.locations.getAll({});
          setAllLocationsForFilter(response.data || []);
        } catch (error) {
          console.error("Error fetching locations for filter:", error);
          setAllLocationsForFilter([]);
        }
      } else {
        setAllLocationsForFilter([]);
      }
    };
    fetchAllLocationsForFilter();
  }, [activeTab]);

  useEffect(() => {
    setScannerApiParams(getMachineFiltersForDialog());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openDialog, dialogType, formData.type, isCoDienXuong]);

  // Set scanner params for inventory dialog
  useEffect(() => {
    if (openInventoryScanDialog) {
      setScannerApiParams({ ticket_type: "inventory" });
    }
  }, [openInventoryScanDialog]);

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
    setLocationFilter("");
    setDateFromFilter("");
    setDateToFilter("");
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
      target_status: "available",
      department_uuids: [],
      inventoryDetails: [],
    };

    if (mode === "create" && type === "inventory") {
      setSelectedTicket(null);
      setFormData(initialFormData);
      await fetchDepartments();
    } else if (mode === "create") {
      setSelectedTicket(null);
      setFormData(initialFormData);
      if (type === "internal") {
        await fetchLocations("internal");
      } else {
        await fetchLocations();
      }
    } else if (mode === "view" && type === "inventory" && ticket) {
      setSelectedTicket(ticket);
      setDetailLoading(true);
      setFormData(initialFormData);
      try {
        const response = await api.inventory.getById(
          ticket.uuid_inventory_check
        );
        const ticketDetails = response.data.inventory;
        setSelectedTicket(ticketDetails);

        setFormData({
          ...initialFormData,
          date: ticketDetails.check_date
            ? new Date(ticketDetails.check_date).toISOString().split("T")[0]
            : "",
          note: ticketDetails.note || "",
          inventoryDetails: response.data.details || [],
        });
      } catch (error) {
        console.error("Error fetching inventory details:", error);
        showNotification(
          "error",
          "Tải thất bại",
          "Lỗi khi tải chi tiết phiếu kiểm kê"
        );
        handleCloseDialog();
      } finally {
        setDetailLoading(false);
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
          target_status: ticketDetails.target_status || "available",
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
    if (openInventoryScanDialog) {
      const validMachines = [];
      const duplicatesInCurrent = [];
      const duplicatesInCurrentDept = [];
      const duplicatesInOtherDept = [];

      machinesToAdd.forEach((machine) => {
        // Lấy tên hiển thị cho máy (để dùng trong thông báo)
        const machineDisplayName = machine.isNotFound
          ? `RFID: ${machine.RFID_machine}`
          : machine.code_machine ||
            machine.serial_machine ||
            "Máy không xác định";

        // 1. Kiểm tra trùng trong danh sách tạm
        const existsInCurrent = inventoryScannedList.some(
          (m) => m.uuid_machine === machine.uuid_machine
        );
        if (existsInCurrent) {
          duplicatesInCurrent.push(machineDisplayName);
          return;
        }

        // 2. Kiểm tra trùng ở chuyền khác trong ĐƠN VỊ HIỆN TẠI
        const foundInOther = scannedLocationsList.find((loc) =>
          loc.scanned_machine?.some((m) => m.uuid === machine.uuid_machine)
        );

        // 3. Kiểm tra trùng ở ĐƠN VỊ KHÁC
        const foundInOtherDept = formData.inventoryDetails?.find((dept) => {
          if (dept.id_department === currentDepartment?.id_department) {
            return false;
          }
          let scannedArr = [];
          try {
            const parsed =
              typeof dept.scanned_result === "string"
                ? JSON.parse(dept.scanned_result)
                : dept.scanned_result;

            if (Array.isArray(parsed)) {
              scannedArr = parsed;
            } else {
              scannedArr = parsed?.locations || [];
            }
          } catch {
            scannedArr = [];
          }
          // Thêm optional chaining (?.) cho an toàn
          return scannedArr?.some((loc) =>
            loc.scanned_machine?.some((m) => m.uuid === machine.uuid_machine)
          );
        });

        if (foundInOtherDept) {
          let locationName = "";
          try {
            const parsed =
              typeof foundInOtherDept.scanned_result === "string"
                ? JSON.parse(foundInOtherDept.scanned_result)
                : foundInOtherDept.scanned_result;

            const scannedArr = Array.isArray(parsed)
              ? parsed
              : parsed?.locations || [];

            const foundLoc = scannedArr.find((loc) =>
              loc.scanned_machine?.some((m) => m.uuid === machine.uuid_machine)
            );
            locationName = foundLoc?.location_name || "không rõ";
          } catch {
            locationName = "không rõ";
          }
          duplicatesInOtherDept.push({
            code: machineDisplayName,
            location: locationName,
            department: foundInOtherDept.name_department,
          });
          return;
        }

        // Thêm thông tin vị trí trùng (nếu có trong cùng đơn vị)
        if (foundInOther) {
          duplicatesInCurrentDept.push({
            code: machineDisplayName,
            location: foundInOther.location_name,
            department: currentDepartment?.name_department,
          });
          validMachines.push({
            ...machine,
            isDuplicateInCurrentDept: true,
            duplicateLocationName: foundInOther.location_name,
          });
        } else {
          validMachines.push(machine);
        }
      });

      // Hiển thị thông báo
      if (duplicatesInCurrent.length > 0) {
        showNotification(
          "warning",
          "Có máy đã được quét ở chuyền này",
          `${
            duplicatesInCurrent.length
          } máy đã có trong danh sách: ${duplicatesInCurrent.join(", ")}`
        );
      }
      if (duplicatesInCurrentDept.length > 0) {
        const details = duplicatesInCurrentDept
          .map((d) => `${d.code} (tại ${d.location})`)
          .join(", ");
        showNotification(
          "warning",
          "Có máy đã được quét ở vị trí khác trong đơn vị này",
          `${duplicatesInCurrentDept.length} máy: ${details}. Bạn không thể lưu kết quả cho đến khi xóa các máy này khỏi danh sách.`
        );
      }
      if (duplicatesInOtherDept.length > 0) {
        const details = duplicatesInOtherDept
          .map((d) => `${d.code} (${d.department} - ${d.location})`)
          .join(", ");
        showNotification(
          "error",
          "Có máy đã được quét ở đơn vị khác",
          `${duplicatesInOtherDept.length} máy: ${details}`
        );
      }
      if (validMachines.length > 0) {
        showNotification(
          "success",
          "Đã thêm máy",
          `Đã thêm ${validMachines.length} máy vào danh sách`
        );
      }

      // Thêm máy hợp lệ (bao gồm cả máy trùng trong cùng đơn vị)
      setInventoryScannedList((prev) => [...prev, ...validMachines]);
    } else {
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
    }
  };
  const handleAddMachineFromScanner = (machine) => {
    if (openInventoryScanDialog) {
      // Kiểm tra máy đã quét trong chuyền hiện tại (danh sách tạm)
      const existsInCurrentList = inventoryScannedList.some(
        (m) => m.uuid_machine === machine.uuid_machine
      );
      if (existsInCurrentList) {
        showNotification(
          "warning",
          "Máy đã có trong danh sách",
          `Máy "${machine.code_machine}" đã được quét ở chuyền này rồi.`
        );
        return;
      }

      // Kiểm tra máy đã quét ở chuyền khác trong ĐƠN VỊ HIỆN TẠI
      const foundInOtherLocation = scannedLocationsList.find((loc) =>
        loc.scanned_machine?.some((m) => m.uuid === machine.uuid_machine)
      );

      // Kiểm tra máy đã quét ở ĐƠN VỊ KHÁC (trong toàn bộ phiếu kiểm kê)
      const foundInOtherDepartment = formData.inventoryDetails?.find((dept) => {
        if (dept.id_department === currentDepartment?.id_department) {
          return false; // Bỏ qua đơn vị hiện tại (đã check ở trên)
        }
        let scannedArr = [];
        try {
          const parsed =
            typeof dept.scanned_result === "string"
              ? JSON.parse(dept.scanned_result)
              : dept.scanned_result;

          if (Array.isArray(parsed)) {
            scannedArr = parsed;
          } else {
            scannedArr = parsed?.locations || [];
          }
        } catch {
          scannedArr = [];
        }
        // Kiểm tra xem có máy nào trùng không
        return scannedArr?.some((loc) =>
          loc.scanned_machine?.some((m) => m.uuid === machine.uuid_machine)
        );
      });

      if (foundInOtherDepartment) {
        // Tìm vị trí cụ thể
        let locationName = "";
        try {
          const parsed =
            typeof foundInOtherDepartment.scanned_result === "string"
              ? JSON.parse(foundInOtherDepartment.scanned_result)
              : foundInOtherDepartment.scanned_result;

          const scannedArr = Array.isArray(parsed)
            ? parsed
            : parsed?.locations || [];

          const foundLoc = scannedArr.find((loc) =>
            loc.scanned_machine?.some((m) => m.uuid === machine.uuid_machine)
          );
          locationName = foundLoc?.location_name || "không rõ";
        } catch {
          locationName = "không rõ";
        }

        showNotification(
          "error",
          "Máy đã được quét ở đơn vị khác",
          `Máy "${machine.code_machine}" đã được quét tại "${locationName}" thuộc đơn vị "${foundInOtherDepartment.name_department}". Vui lòng xóa khỏi đơn vị đó trước.`
        );
        return;
      }

      // Thêm vào danh sách với thông tin vị trí trùng (nếu có)
      const machineWithDuplicateInfo = {
        ...machine,
        isDuplicateInCurrentDept: !!foundInOtherLocation,
        duplicateLocationName: foundInOtherLocation?.location_name || null,
      };

      setInventoryScannedList((prev) => [...prev, machineWithDuplicateInfo]);

      // Hiển thị cảnh báo nếu trùng
      if (foundInOtherLocation) {
        showNotification(
          "warning",
          "Cảnh báo: Máy đã được quét ở vị trí khác",
          `Máy "${machine.code_machine}" đã được quét tại "${foundInOtherLocation.location_name}". Bạn không thể lưu kết quả cho đến khi xóa máy này khỏi danh sách.`
        );
      }
    } else {
      setFormData((prev) => ({
        ...prev,
        machines: [...prev.machines, { ...machine, note: "" }],
      }));
    }
  };
  const handleRemoveSelectedMachine = (uuid_machine) =>
    setFormData((prev) => ({
      ...prev,
      machines: prev.machines.filter((m) => m.uuid_machine !== uuid_machine),
    }));

  const handleRemoveInventoryScannedMachine = async (uuid_machine) => {
    // Xóa khỏi danh sách quét tạm
    const machineToRemove = inventoryScannedList.find(
      (m) => m.uuid_machine === uuid_machine
    );

    setInventoryScannedList((prev) =>
      prev.filter((m) => m.uuid_machine !== uuid_machine)
    );

    // Nếu máy này đã được lưu trong scannedLocationsList (có duplicate), cần xóa cả ở đó
    if (machineToRemove?.isDuplicateInCurrentDept) {
      // Tìm location chứa máy này trong scannedLocationsList
      const locationContainingMachine = scannedLocationsList.find((loc) =>
        loc.scanned_machine?.some((m) => m.uuid === uuid_machine)
      );

      if (locationContainingMachine && currentDepartment && selectedTicket) {
        // Gọi hàm xóa máy khỏi danh sách đã lưu
        await handleRemoveSavedMachine(
          locationContainingMachine.location_uuid,
          uuid_machine
        );
      }
    }
  };

  // Xóa máy khỏi danh sách đã lưu (scannedLocationsList)
  const handleRemoveSavedMachine = async (locationUuid, machineUuid) => {
    if (!currentDepartment || !selectedTicket) return;

    try {
      setLoading(true);

      // Tìm vị trí trong danh sách
      const updatedLocationsList = scannedLocationsList.map((loc) => {
        if (loc.location_uuid === locationUuid) {
          return {
            ...loc,
            scanned_machine: loc.scanned_machine.filter(
              (m) => m.uuid !== machineUuid
            ),
          };
        }
        return loc;
      });

      // Gọi API để cập nhật lại DB
      await api.inventory.updateScannedResult(
        selectedTicket.uuid_inventory_check,
        {
          department_uuid: currentDepartment.uuid_department,
          scanned_result: updatedLocationsList,
        }
      );

      // showNotification(
      //   "success",
      //   "Đã xóa",
      //   "Đã xóa máy khỏi danh sách kiểm kê"
      // );

      // Cập nhật state local
      setScannedLocationsList(updatedLocationsList);

      // Refresh lại data từ server
      const response = await api.inventory.getById(
        selectedTicket.uuid_inventory_check
      );
      const ticketDetails = response.data.inventory;
      setSelectedTicket(ticketDetails);
      setFormData((prev) => ({
        ...prev,
        inventoryDetails: response.data.details || [],
      }));

      // Update lại currentDepartment
      const updatedDept = response.data.details.find(
        (d) => d.id_department === currentDepartment.id_department
      );
      if (updatedDept) {
        let updatedScannedList = [];
        try {
          const parsed =
            typeof updatedDept.scanned_result === "string"
              ? JSON.parse(updatedDept.scanned_result)
              : updatedDept.scanned_result;

          updatedScannedList = Array.isArray(parsed)
            ? parsed
            : parsed?.locations || [];
        } catch {
          updatedScannedList = [];
        }
        setScannedLocationsList(updatedScannedList);
        setCurrentDepartment(updatedDept);
      }

      // ✅ KIỂM TRA LẠI CÁC MÁY TRONG DANH SÁCH TẠM (inventoryScannedList)
      // Nếu máy vừa xóa trùng với máy nào đó trong danh sách tạm, thì bỏ flag duplicate
      if (inventoryScannedList.length > 0) {
        const refreshedList = inventoryScannedList.map((machine) => {
          // Nếu máy này đang bị đánh dấu duplicate
          if (machine.isDuplicateInCurrentDept) {
            // Kiểm tra lại xem nó có còn trùng với vị trí nào khác không
            const stillDuplicate = updatedLocationsList.some((loc) =>
              loc.scanned_machine?.some((m) => m.uuid === machine.uuid_machine)
            );

            if (!stillDuplicate) {
              // Không còn trùng nữa -> bỏ flag
              const {
                isDuplicateInCurrentDept: _isDup,
                duplicateLocationName: _dupLoc,
                ...rest
              } = machine;
              return rest;
            }
          }
          return machine;
        });
        setInventoryScannedList(refreshedList);
      }
    } catch (error) {
      console.error("Error removing machine:", error);
      showNotification(
        "error",
        "Xóa thất bại",
        error.response?.data?.message || "Lỗi khi xóa máy"
      );
    } finally {
      setLoading(false);
    }
  };
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

      // 2b. Validate required export info
      if (dialogType === "export") {
        if (!formData.receiver_name?.trim()) {
          showNotification(
            "error",
            "Lỗi nhập liệu",
            "Vui lòng nhập Họ tên người nhận."
          );
          setLoading(false);
          return;
        }
        if (!formData.vehicle_number?.trim()) {
          showNotification("error", "Lỗi nhập liệu", "Vui lòng nhập Số xe.");
          setLoading(false);
          return;
        }
        if (!formData.department_address?.trim()) {
          showNotification(
            "error",
            "Lỗi nhập liệu",
            "Vui lòng nhập Địa chỉ (Bộ phận)."
          );
          setLoading(false);
          return;
        }
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

      if (dialogType === "internal") {
        data.append("target_status", formData.target_status || "available");
      }

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

  // --- Inventory Handlers ---
  const handleCloseInventoryScan = () => {
    setOpenInventoryScanDialog(false);
    setCurrentDepartment(null);
    setSelectedLocationForScan(null);
    setInventoryScannedList([]);
    setScannedLocationsList([]);
  };

  // Helper: Kiểm tra quyền chỉnh sửa trong đơn vị kiểm kê
  const canEditInventoryDepartment = (dept) => {
    if (!dept) return false;

    // Admin và Phòng Cơ điện có full quyền
    if (isAdmin || isPhongCoDien) return true;
    // Người tạo phiếu có quyền
    if (selectedTicket?.created_by === user?.id) return true;
    // Cơ điện xưởng chỉ có quyền với đơn vị của mình
    // So sánh id_phong_ban (từ bảng tb_department) với phongban_id của user
    if (
      isCoDienXuong &&
      Number(dept.id_phong_ban) === Number(user?.phongban_id)
    )
      return true;
    return false;
  };

  const handleOpenDepartmentDetail = async (dept) => {
    setCurrentDepartment(dept);

    // Parse kết quả đã quét
    let scannedList = [];
    try {
      const parsed =
        typeof dept.scanned_result === "string"
          ? JSON.parse(dept.scanned_result)
          : dept.scanned_result;

      if (Array.isArray(parsed)) {
        scannedList = parsed;
      } else {
        scannedList = parsed?.locations || [];
      }
    } catch {
      scannedList = [];
    }
    setScannedLocationsList(scannedList);

    // Load danh sách vị trí thuộc đơn vị này để user chọn thêm
    setDetailLoading(true);
    try {
      const res = await api.locations.getAll({
        department_uuid: dept.uuid_department,
      });
      setDepartmentLocations(res.data);
    } catch (error) {
      console.error(error);
      showNotification("error", "Tải thất bại", "Lỗi khi tải danh sách vị trí");
    }
    setDetailLoading(false);

    // Mở Dialog UI cho Department
    setOpenInventoryScanDialog(true);
  };

  const handleInventoryScanComplete = async () => {
    if (!currentDepartment || !selectedLocationForScan || !selectedTicket)
      return;

    try {
      setLoading(true);
      await api.inventory.scanLocation(selectedTicket.uuid_inventory_check, {
        department_uuid: currentDepartment.uuid_department,
        location_uuid: selectedLocationForScan.uuid_location,
        scanned_machines: inventoryScannedList,
      });

      showNotification(
        "success",
        "Đã lưu",
        `Đã lưu kết quả cho ${selectedLocationForScan.name_location}`
      );

      // Refresh lại data
      const response = await api.inventory.getById(
        selectedTicket.uuid_inventory_check
      );
      const ticketDetails = response.data.inventory;
      setSelectedTicket(ticketDetails);
      setFormData((prev) => ({
        ...prev,
        inventoryDetails: response.data.details || [],
      }));

      // Update lại state local để UI cập nhật ngay
      const updatedDept = response.data.details.find(
        (d) => d.id_department === currentDepartment.id_department
      );
      if (updatedDept) {
        let updatedScannedList = [];
        try {
          const parsed =
            typeof updatedDept.scanned_result === "string"
              ? JSON.parse(updatedDept.scanned_result)
              : updatedDept.scanned_result;

          updatedScannedList = Array.isArray(parsed)
            ? parsed
            : parsed?.locations || [];
        } catch {
          updatedScannedList = [];
        }
        setScannedLocationsList(updatedScannedList);
        setCurrentDepartment(updatedDept);
      }

      setInventoryScannedList([]);
      setOpenScanDialog(false);
      setOpenRfidDialog(false);
    } catch (error) {
      console.error("Error saving inventory scan:", error);
      showNotification(
        "error",
        "Lưu thất bại",
        error.response?.data?.message || "Lỗi khi lưu kết quả kiểm kê"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOpenInventoryRfidSearch = () => {
    // Hàm kiểm tra máy không có trong hệ thống
    const isNotFoundMachine = (machine) => {
      const isNotFoundFlag = machine.isNotFound === true;
      const isNotFoundUuid =
        typeof machine.uuid_machine === "string" &&
        machine.uuid_machine.startsWith("NOT_FOUND_");
      return isNotFoundFlag || isNotFoundUuid;
    };

    // Hàm kiểm tra máy đã quét trước đó (có duplicateLocationName hoặc isDuplicate)
    const isPreviouslyScannedMachine = (machine) => {
      return (
        machine.isDuplicate === true ||
        (machine.duplicateLocationName &&
          machine.duplicateLocationName.trim() !== "")
      );
    };

    // 1. Từ danh sách tạm hiện tại: Lấy các RFID:
    //    - Không có trong hệ thống (isNotFound)
    //    - Đã quét trước đó (isDuplicate hoặc có duplicateLocationName)
    //    KHÔNG lấy các RFID chỉ sai vị trí nhưng chưa quét trước đó
    const rfidsFromCurrentList = inventoryScannedList
      .filter(
        (machine) =>
          isNotFoundMachine(machine) || isPreviouslyScannedMachine(machine)
      )
      .map((m) => m.RFID_machine)
      .filter((rfid) => rfid && rfid.trim() !== "");

    // 2. Từ các vị trí đã quét trước đó: Lấy TẤT CẢ các RFID (vì đã quét trước đó rồi)
    const rfidsFromScannedLocations = [];
    if (scannedLocationsList && Array.isArray(scannedLocationsList)) {
      scannedLocationsList.forEach((location) => {
        if (
          location.scanned_machine &&
          Array.isArray(location.scanned_machine)
        ) {
          location.scanned_machine.forEach((machine) => {
            if (machine.RFID_machine && machine.RFID_machine.trim() !== "") {
              rfidsFromScannedLocations.push(machine.RFID_machine);
            }
          });
        }
      });
    }

    // 3. Kết hợp và loại bỏ trùng lặp (dùng Set để đảm bảo unique)
    const allRfids = [...rfidsFromCurrentList, ...rfidsFromScannedLocations];
    const uniqueRfids = Array.from(new Set(allRfids));

    if (uniqueRfids.length === 0) {
      showNotification(
        "info",
        "Không có RFID",
        "Không có RFID nào đã quét trước đó hoặc không có trong hệ thống để dò tìm."
      );
      return;
    }

    // 4. Chuyển thành dạng "máy" đơn giản để truyền vào RfidSearch
    const targets = uniqueRfids.map((rfid) => ({
      RFID_machine: rfid,
    }));

    setInventoryRfidSearchTargets(targets);
    setOpenInventoryRfidSearchDialog(true);
  };

  const handleInventorySubmit = async () => {
    if (!selectedTicket) return;

    try {
      setLoading(true);
      await api.inventory.submit(selectedTicket.uuid_inventory_check);
      showNotification(
        "success",
        "Đã gửi duyệt",
        "Phiếu kiểm kê đã được gửi duyệt"
      );
      handleCloseDialog();
      fetchData();
    } catch (error) {
      console.error("Error submitting inventory:", error);
      showNotification(
        "error",
        "Gửi duyệt thất bại",
        error.response?.data?.message || "Lỗi khi gửi duyệt phiếu kiểm kê"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInventory = async () => {
    if (!formData.department_uuids || formData.department_uuids.length === 0) {
      showNotification(
        "error",
        "Lỗi nhập liệu",
        "Vui lòng chọn ít nhất một đơn vị kiểm kê"
      );
      return;
    }

    try {
      setLoading(true);
      await api.inventory.create({
        check_date: formData.date,
        note: formData.note,
        department_uuids: formData.department_uuids,
      });

      showNotification("success", "Thành công", "Đã tạo phiếu kiểm kê");
      handleCloseDialog();
      fetchData();
    } catch (error) {
      console.error("Error creating inventory:", error);
      showNotification(
        "error",
        "Tạo thất bại",
        error.response?.data?.message || "Lỗi khi tạo phiếu kiểm kê"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAddDepartmentsToInventory = async () => {
    if (
      !formData.selectedNewDepartments ||
      formData.selectedNewDepartments.length === 0
    ) {
      showNotification(
        "error",
        "Lỗi nhập liệu",
        "Vui lòng chọn ít nhất một đơn vị để thêm"
      );
      return;
    }

    try {
      setLoading(true);
      await api.inventory.addDepartments(selectedTicket.uuid_inventory_check, {
        department_uuids: formData.selectedNewDepartments,
      });

      showNotification(
        "success",
        "Thành công",
        `Đã thêm ${formData.selectedNewDepartments.length} đơn vị vào phiếu kiểm kê`
      );

      // Refresh lại data
      const response = await api.inventory.getById(
        selectedTicket.uuid_inventory_check
      );
      const ticketDetails = response.data.inventory;
      setSelectedTicket(ticketDetails);
      setFormData((prev) => ({
        ...prev,
        inventoryDetails: response.data.details || [],
        showAddDepartmentDialog: false,
        selectedNewDepartments: [],
        availableDepartments: [],
      }));
    } catch (error) {
      console.error("Error adding departments:", error);
      showNotification(
        "error",
        "Thêm thất bại",
        error.response?.data?.message || "Lỗi khi thêm đơn vị vào phiếu kiểm kê"
      );
    } finally {
      setLoading(false);
    }
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

  const fetchFormData = async () => {
    try {
      const [typesRes, manuRes, suppRes] = await Promise.all([
        api.machines.getMachineTypes(),
        api.machines.getMachineManufacturers(),
        api.machines.getMachineSuppliers(),
      ]);

      if (typesRes.success) setFormMachineTypes(typesRes.data);
      if (manuRes.success) setFormManufacturers(manuRes.data);
      if (suppRes.success) setFormSuppliers(suppRes.data);
    } catch (err) {
      console.error("Error fetching form data:", err);
    }
  };

  // Hàm lấy đặc tính dựa trên Loại máy (Name)
  const fetchAttributesByTypeName = async (typeName) => {
    if (!typeName) {
      setFormAttributes([]);
      return;
    }
    // Tìm UUID của loại máy dựa trên tên
    const selectedType = formMachineTypes.find((t) => t.name === typeName);

    if (selectedType) {
      try {
        const res = await api.machines.getMachineTypeAttributes(
          selectedType.uuid
        );
        if (res.success) {
          setFormAttributes(res.data);
        }
      } catch (err) {
        console.error("Error fetching attributes:", err);
        setFormAttributes([]);
      }
    } else {
      // Nếu nhập tay loại mới hoặc không tìm thấy trong danh mục
      setFormAttributes([]);
    }
  };

  const handleOpenCreateMachineDialog = async () => {
    setNewMachineData({
      code_machine: "",
      serial_machine: "",
      RFID_machine: "",
      NFC_machine: "",
      type_machine: "",
      attribute_machine: "",
      model_machine: "",
      manufacturer: "",
      supplier: "",
      price: "",
      date_of_use: "",
      lifespan: "",
      repair_cost: "",
      power: "",
      pressure: "",
      voltage: "",
      note: "",
      current_status: "available",
      name_category: "Máy móc thiết bị",
    });
    // Fetch form data when opening dialog
    await fetchFormData();
    setFormAttributes([]); // Reset attributes
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

  const handleDownloadSampleExcel = async () => {
    try {
      // 1. Lấy danh sách loại máy, hãng sản xuất, đặc tính và nhà cung cấp từ API ADMIN
      const [
        typeMachineResult,
        manufacturerResult,
        attributeResult,
        supplierResult,
      ] = await Promise.all([
        api.admin.getMachineTypes(),
        api.admin.getMachineManufacturers(),
        api.admin.getMachineAttributes(),
        api.admin.getMachineSuppliers(),
      ]);

      // Đảm bảo có ít nhất 1 dòng để tránh lỗi validation
      const typeMachineList =
        typeMachineResult.success && typeMachineResult.data.length > 0
          ? typeMachineResult.data.map((item) => item.name)
          : ["Máy mẫu"];

      const manufacturerList =
        manufacturerResult.success && manufacturerResult.data.length > 0
          ? manufacturerResult.data.map((item) => item.name)
          : ["Hãng mẫu"];

      const attributeList =
        attributeResult.success && attributeResult.data.length > 0
          ? attributeResult.data.map((item) => item.name)
          : ["Đặc tính mẫu"];

      const supplierList =
        supplierResult.success && supplierResult.data.length > 0
          ? supplierResult.data.map((item) => item.name)
          : ["Nhà cung cấp mẫu"];

      // 2. Tải file Excel mẫu
      const response = await fetch("/Mau_Excel_MayMoc.xlsx");
      if (!response.ok) throw new Error("Không thể tải file Excel mẫu");
      const arrayBuffer = await response.arrayBuffer();

      // 3. Load Workbook
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);

      // --- BƯỚC 4: CẬP NHẬT SHEET "LoaiMayMoc" ---
      let loaiMayMocSheet = workbook.getWorksheet("LoaiMayMoc");
      if (!loaiMayMocSheet) {
        loaiMayMocSheet = workbook.addWorksheet("LoaiMayMoc");
      }

      // Xóa dữ liệu cũ sạch sẽ
      if (loaiMayMocSheet.rowCount > 0) {
        loaiMayMocSheet.spliceRows(1, loaiMayMocSheet.rowCount);
      }

      // Thêm dữ liệu mới vào: cột A = Loại máy, cột B = Đặc tính
      // Đảm bảo có đủ số dòng bằng với số lượng lớn hơn giữa typeMachineList và attributeList
      const maxRows = Math.max(typeMachineList.length, attributeList.length);
      for (let i = 0; i < maxRows; i++) {
        const type = i < typeMachineList.length ? typeMachineList[i] : "";
        const attribute = i < attributeList.length ? attributeList[i] : "";
        loaiMayMocSheet.addRow([type, attribute]);
      }

      // --- BƯỚC 5: CẬP NHẬT SHEET "HangSX" ---
      let hangSXSheet = workbook.getWorksheet("HangSX");
      if (!hangSXSheet) {
        hangSXSheet = workbook.addWorksheet("HangSX");
      }

      // Xóa dữ liệu cũ sạch sẽ
      if (hangSXSheet.rowCount > 0) {
        hangSXSheet.spliceRows(1, hangSXSheet.rowCount);
      }

      // Thêm dữ liệu mới vào
      manufacturerList.forEach((manufacturer) => {
        hangSXSheet.addRow([manufacturer]);
      });

      // --- BƯỚC 6: CẬP NHẬT SHEET "NhaCungCap" ---
      let nhaCungCapSheet = workbook.getWorksheet("NhaCungCap");
      if (!nhaCungCapSheet) {
        nhaCungCapSheet = workbook.addWorksheet("NhaCungCap");
      }

      // Xóa dữ liệu cũ sạch sẽ
      if (nhaCungCapSheet.rowCount > 0) {
        nhaCungCapSheet.spliceRows(1, nhaCungCapSheet.rowCount);
      }

      // Thêm dữ liệu mới vào cột A
      supplierList.forEach((supplier) => {
        nhaCungCapSheet.addRow([supplier]);
      });

      // --- BƯỚC 7 (QUAN TRỌNG): GÁN LẠI VALIDATION CHO SHEET CHÍNH ---
      const mainSheet = workbook.getWorksheet("DanhSachMayMoc");
      if (mainSheet) {
        const startRow = 2;
        const endRow = 1000;

        // 7.1. Validation cho cột B (Loại máy)
        const validationFormulaType = `'LoaiMayMoc'!$A$1:$A$${typeMachineList.length}`;
        for (let i = startRow; i <= endRow; i++) {
          const cell = mainSheet.getCell(`B${i}`);
          cell.dataValidation = {
            type: "list",
            allowBlank: true,
            operator: "equal",
            showErrorMessage: true,
            errorTitle: "Lỗi nhập liệu",
            error: "Vui lòng chọn Loại máy từ danh sách có sẵn.",
            formulae: [validationFormulaType],
          };
        }

        // 7.2. Validation cho cột C (Đặc tính)
        const maxAttributeRow = Math.max(
          typeMachineList.length,
          attributeList.length
        );
        const validationFormulaAttribute = `'LoaiMayMoc'!$B$1:$B$${maxAttributeRow}`;
        for (let i = startRow; i <= endRow; i++) {
          const cell = mainSheet.getCell(`C${i}`);
          cell.dataValidation = {
            type: "list",
            allowBlank: true,
            operator: "equal",
            showErrorMessage: true,
            errorTitle: "Lỗi nhập liệu",
            error: "Vui lòng chọn Đặc tính từ danh sách có sẵn.",
            formulae: [validationFormulaAttribute],
          };
        }

        // 7.3. Validation cho cột E (Hãng sản xuất)
        const validationFormulaManufacturer = `'HangSX'!$A$1:$A$${manufacturerList.length}`;
        for (let i = startRow; i <= endRow; i++) {
          const cell = mainSheet.getCell(`E${i}`);
          cell.dataValidation = {
            type: "list",
            allowBlank: true,
            operator: "equal",
            showErrorMessage: true,
            errorTitle: "Lỗi nhập liệu",
            error: "Vui lòng chọn Hãng sản xuất từ danh sách có sẵn.",
            formulae: [validationFormulaManufacturer],
          };
        }

        // 7.4. Validation cho cột F (Nhà cung cấp)
        const validationFormulaSupplier = `'NhaCungCap'!$A$1:$A$${supplierList.length}`;
        for (let i = startRow; i <= endRow; i++) {
          const cell = mainSheet.getCell(`F${i}`);
          cell.dataValidation = {
            type: "list",
            allowBlank: true,
            operator: "equal",
            showErrorMessage: true,
            errorTitle: "Lỗi nhập liệu",
            error: "Vui lòng chọn Nhà cung cấp từ danh sách có sẵn.",
            formulae: [validationFormulaSupplier],
          };
        }
      }

      // 8. Xuất file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "Mau_Excel_MayMoc.xlsx";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      showNotification(
        "success",
        "Thành công",
        "Đã tải xuống file mẫu mới nhất."
      );
    } catch (error) {
      console.error("Error:", error);
      showNotification("error", "Lỗi", error.message);
    }
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
          newRow.name_category = "Máy móc thiết bị";

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

  // --- Render Helpers ---
  const getStatusColor = (status) =>
    ({
      draft: "primary",
      pending: "warning",
      pending_confirmation: "warning",
      pending_approval: "warning",
      completed: "success",
      cancelled: "error",
    }[status] || "default");
  const getStatusLabel = (status) =>
    ({
      draft: "Nháp (đang kiểm)",
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

  // Render Table Content for Tabs 0, 1, 2, 3
  const renderTableContent = () => {
    const data =
      activeTab === 0
        ? imports
        : activeTab === 1
        ? exports
        : activeTab === 2
        ? transfers
        : inventories;
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

    // Render Inventory Tab
    if (activeTab === 3) {
      return inventories.map((item) => {
        const isHovered = hoveredRowUuid === item.uuid_inventory_check;
        const hoverBackgroundColor = "rgba(0, 0, 0, 0.04)";

        return (
          <React.Fragment key={item.uuid_inventory_check}>
            {/* HÀNG 1: THÔNG TIN CHUNG */}
            <TableRow
              onMouseEnter={() => setHoveredRowUuid(item.uuid_inventory_check)}
              onMouseLeave={() => setHoveredRowUuid(null)}
              onClick={() => handleOpenDialog("view", "inventory", item)}
              sx={{
                cursor: "pointer",
                backgroundColor: isHovered ? hoverBackgroundColor : "inherit",
                "& td": { borderBottom: "none", pb: 0.5 },
              }}
            >
              <TableCell>{formatDate(item.check_date)}</TableCell>
              <TableCell>Kiểm kê định kỳ</TableCell>
              <TableCell colSpan={2}>
                <Stack direction="column" spacing={0.5}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography variant="body2">
                      {item.completed_department_count || 0} /{" "}
                      {item.department_count || 0} đơn vị
                    </Typography>
                    <Box
                      sx={{
                        width: 100,
                        height: 6,
                        bgcolor: "#e0e0e0",
                        borderRadius: 1,
                        overflow: "hidden",
                      }}
                    >
                      <Box
                        sx={{
                          width: `${
                            item.department_count > 0
                              ? ((item.completed_department_count || 0) /
                                  item.department_count) *
                                100
                              : 0
                          }%`,
                          height: "100%",
                          bgcolor: "#2e7d32",
                          transition: "width 0.3s ease",
                        }}
                      />
                    </Box>
                  </Stack>
                  {item.department_names && (
                    <Typography variant="caption" color="text.secondary">
                      {item.department_names}
                    </Typography>
                  )}
                </Stack>
              </TableCell>
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
              onMouseEnter={() => setHoveredRowUuid(item.uuid_inventory_check)}
              onMouseLeave={() => setHoveredRowUuid(null)}
              onClick={() => handleOpenDialog("view", "inventory", item)}
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
    }

    // Render Import/Export/Internal Tabs
    return data.map((item) => {
      const uuid =
        item.uuid_machine_import ||
        item.uuid_machine_export ||
        item.uuid_machine_internal_transfer;
      const date = item.import_date || item.export_date || item.transfer_date;
      const type = item.import_type || item.export_type || "internal";

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
              {/* Mobile: Grid 2x2 buttons */}
              {isMobile ? (
                <Grid container spacing={2} sx={{ width: "100%" }}>
                  {hasImportExportTabs && (
                    <Grid size={{ xs: 6 }} sx={{ display: "flex" }}>
                      <Button
                        fullWidth
                        variant={activeTab === 0 ? "contained" : "outlined"}
                        startIcon={<FileDownload />}
                        onClick={(e) => handleTabChange(e, 0)}
                        sx={{
                          minHeight: "80px",
                          py: 2,
                          borderRadius: "12px",
                          fontWeight: 600,
                          fontSize: "0.9rem",
                          textTransform: "none",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 0.5,
                          "& .MuiButton-startIcon": {
                            margin: 0,
                            marginBottom: "4px",
                          },
                          ...(activeTab === 0
                            ? {
                                background:
                                  "linear-gradient(45deg, #667eea, #764ba2)",
                                color: "white",
                                "&:hover": {
                                  background:
                                    "linear-gradient(45deg, #5568d3, #6a3f8f)",
                                },
                              }
                            : {
                                borderColor: "#667eea",
                                color: "#667eea",
                                "&:hover": {
                                  borderColor: "#5568d3",
                                  background: "rgba(102, 126, 234, 0.05)",
                                },
                              }),
                          transition: "all 0.3s ease",
                        }}
                      >
                        Phiếu nhập
                      </Button>
                    </Grid>
                  )}
                  {hasImportExportTabs && (
                    <Grid size={{ xs: 6 }} sx={{ display: "flex" }}>
                      <Button
                        fullWidth
                        variant={activeTab === 1 ? "contained" : "outlined"}
                        startIcon={<FileUpload />}
                        onClick={(e) => handleTabChange(e, 1)}
                        sx={{
                          minHeight: "80px",
                          py: 2,
                          borderRadius: "12px",
                          fontWeight: 600,
                          fontSize: "0.9rem",
                          textTransform: "none",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 0.5,
                          "& .MuiButton-startIcon": {
                            margin: 0,
                            marginBottom: "4px",
                          },
                          ...(activeTab === 1
                            ? {
                                background:
                                  "linear-gradient(45deg, #667eea, #764ba2)",
                                color: "white",
                                "&:hover": {
                                  background:
                                    "linear-gradient(45deg, #5568d3, #6a3f8f)",
                                },
                              }
                            : {
                                borderColor: "#667eea",
                                color: "#667eea",
                                "&:hover": {
                                  borderColor: "#5568d3",
                                  background: "rgba(102, 126, 234, 0.05)",
                                },
                              }),
                          transition: "all 0.3s ease",
                        }}
                      >
                        Phiếu xuất
                      </Button>
                    </Grid>
                  )}
                  <Grid size={{ xs: 6 }} sx={{ display: "flex" }}>
                    <Button
                      fullWidth
                      variant={activeTab === 2 ? "contained" : "outlined"}
                      startIcon={<Autorenew />}
                      onClick={(e) =>
                        handleTabChange(e, hasImportExportTabs ? 2 : 0)
                      }
                      sx={{
                        minHeight: "80px",
                        py: 2,
                        borderRadius: "12px",
                        fontWeight: 600,
                        fontSize: "0.9rem",
                        textTransform: "none",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 0.5,
                        "& .MuiButton-startIcon": {
                          margin: 0,
                          marginBottom: "4px",
                        },
                        ...(activeTab === 2
                          ? {
                              background:
                                "linear-gradient(45deg, #667eea, #764ba2)",
                              color: "white",
                              "&:hover": {
                                background:
                                  "linear-gradient(45deg, #5568d3, #6a3f8f)",
                              },
                            }
                          : {
                              borderColor: "#667eea",
                              color: "#667eea",
                              "&:hover": {
                                borderColor: "#5568d3",
                                background: "rgba(102, 126, 234, 0.05)",
                              },
                            }),
                        transition: "all 0.3s ease",
                      }}
                    >
                      Điều chuyển
                    </Button>
                  </Grid>
                  {canViewInventoryTab && (
                    <Grid size={{ xs: 6 }} sx={{ display: "flex" }}>
                      <Button
                        fullWidth
                        variant={activeTab === 3 ? "contained" : "outlined"}
                        startIcon={<FactCheck />}
                        onClick={(e) =>
                          handleTabChange(e, hasImportExportTabs ? 3 : 1)
                        }
                        sx={{
                          minHeight: "80px",
                          py: 2,
                          borderRadius: "12px",
                          fontWeight: 600,
                          fontSize: "0.9rem",
                          textTransform: "none",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 0.5,
                          "& .MuiButton-startIcon": {
                            margin: 0,
                            marginBottom: "4px",
                          },
                          ...(activeTab === 3
                            ? {
                                background:
                                  "linear-gradient(45deg, #667eea, #764ba2)",
                                color: "white",
                                "&:hover": {
                                  background:
                                    "linear-gradient(45deg, #5568d3, #6a3f8f)",
                                },
                              }
                            : {
                                borderColor: "#667eea",
                                color: "#667eea",
                                "&:hover": {
                                  borderColor: "#5568d3",
                                  background: "rgba(102, 126, 234, 0.05)",
                                },
                              }),
                          transition: "all 0.3s ease",
                        }}
                      >
                        Kiểm kê
                      </Button>
                    </Grid>
                  )}
                </Grid>
              ) : (
                // Desktop: Tabs
                <Tabs
                  value={hasImportExportTabs ? activeTab : activeTab - 2}
                  onChange={handleTabChange}
                  variant="scrollable"
                  sx={{
                    width: { xs: "100%", md: "auto" },
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
                  {canViewInventoryTab && (
                    <Tab
                      icon={<FactCheck />}
                      label="Kiểm kê"
                      iconPosition="start"
                    />
                  )}
                </Tabs>
              )}

              {activeTab === 3 ? (
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={2}
                  sx={{ width: { xs: "100%", md: "auto" } }}
                >
                  {canCreateInventory && (
                    <Button
                      variant="contained"
                      startIcon={<Add />}
                      onClick={() => handleOpenDialog("create", "inventory")}
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
                      Tạo phiếu kiểm kê
                    </Button>
                  )}
                  <Button
                    variant="contained"
                    startIcon={<Refresh />}
                    onClick={() => {
                      fetchData();
                      fetchStatistics();
                    }}
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
              ) : activeTab === 2 ? (
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
                    onClick={() => {
                      fetchData();
                      fetchStatistics();
                    }}
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
                    onClick={() => {
                      fetchData();
                      fetchStatistics();
                    }}
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
              )}
            </Box>

            {/* Statistics Display */}
            {!statsLoading && (
              <Box sx={{ mb: 3 }}>
                {activeTab === 0 && importStats && (
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: "12px",
                      bgcolor: "#f5f5f5",
                      border: "1px solid #e0e0e0",
                    }}
                  >
                    <Typography
                      variant="subtitle2"
                      sx={{ fontWeight: 600, mb: 1.5, color: "#667eea" }}
                    >
                      Thống kê phiếu nhập
                    </Typography>
                    {/* Hàng 1: Trạng thái */}
                    <Grid container spacing={2} sx={{ mb: 2 }}>
                      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Chip
                          label={`Chờ duyệt: ${
                            importStats.byStatus?.pending || 0
                          }`}
                          color="warning"
                          sx={{ fontWeight: 600 }}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Chip
                          label={`Đã duyệt: ${
                            importStats.byStatus?.completed || 0
                          }`}
                          color="success"
                          sx={{ fontWeight: 600 }}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Chip
                          label={`Đã hủy: ${
                            importStats.byStatus?.cancelled || 0
                          }`}
                          color="error"
                          sx={{ fontWeight: 600 }}
                        />
                      </Grid>
                    </Grid>
                    {/* Hàng 2: Loại phiếu */}
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Chip
                          label={`Nhập mua mới: ${
                            importStats.byType?.purchased || 0
                          }`}
                          sx={{
                            fontWeight: 600,
                            bgcolor: "#1976d211",
                            color: "#1976d2",
                          }}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Chip
                          label={`Sau bảo trì: ${
                            importStats.byType?.maintenance_return || 0
                          }`}
                          sx={{
                            fontWeight: 600,
                            bgcolor: "#ff980011",
                            color: "#ff9800",
                          }}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Chip
                          label={`Nhập thuê máy: ${
                            importStats.byType?.rented || 0
                          }`}
                          sx={{
                            fontWeight: 600,
                            bgcolor: "#673ab711",
                            color: "#673ab7",
                          }}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Chip
                          label={`Nhập mượn máy: ${
                            importStats.byType?.borrowed || 0
                          }`}
                          sx={{
                            fontWeight: 600,
                            bgcolor: "#03a9f411",
                            color: "#03a9f4",
                          }}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Chip
                          label={`Trả (máy cho mượn): ${
                            importStats.byType?.borrowed_out_return || 0
                          }`}
                          sx={{
                            fontWeight: 600,
                            bgcolor: "#00bcd411",
                            color: "#00bcd4",
                          }}
                        />
                      </Grid>
                    </Grid>
                  </Box>
                )}

                {activeTab === 1 && exportStats && (
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: "12px",
                      bgcolor: "#f5f5f5",
                      border: "1px solid #e0e0e0",
                    }}
                  >
                    <Typography
                      variant="subtitle2"
                      sx={{ fontWeight: 600, mb: 1.5, color: "#667eea" }}
                    >
                      Thống kê phiếu xuất
                    </Typography>
                    {/* Hàng 1: Trạng thái */}
                    <Grid container spacing={2} sx={{ mb: 2 }}>
                      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Chip
                          label={`Chờ duyệt: ${
                            exportStats.byStatus?.pending || 0
                          }`}
                          color="warning"
                          sx={{ fontWeight: 600 }}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Chip
                          label={`Đã duyệt: ${
                            exportStats.byStatus?.completed || 0
                          }`}
                          color="success"
                          sx={{ fontWeight: 600 }}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Chip
                          label={`Đã hủy: ${
                            exportStats.byStatus?.cancelled || 0
                          }`}
                          color="error"
                          sx={{ fontWeight: 600 }}
                        />
                      </Grid>
                    </Grid>
                    {/* Hàng 2: Loại phiếu */}
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Chip
                          label={`Xuất thanh lý: ${
                            exportStats.byType?.liquidation || 0
                          }`}
                          sx={{
                            fontWeight: 600,
                            bgcolor: "#f4433611",
                            color: "#f44336",
                          }}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Chip
                          label={`Bảo trì: ${
                            exportStats.byType?.maintenance || 0
                          }`}
                          sx={{
                            fontWeight: 600,
                            bgcolor: "#ff980011",
                            color: "#ff9800",
                          }}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Chip
                          label={`Cho mượn máy: ${
                            exportStats.byType?.borrowed_out || 0
                          }`}
                          sx={{
                            fontWeight: 600,
                            bgcolor: "#00bcd411",
                            color: "#00bcd4",
                          }}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Chip
                          label={`Trả (máy thuê): ${
                            exportStats.byType?.rented_return || 0
                          }`}
                          sx={{
                            fontWeight: 600,
                            bgcolor: "#673ab711",
                            color: "#673ab7",
                          }}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Chip
                          label={`Trả (máy mượn): ${
                            exportStats.byType?.borrowed_return || 0
                          }`}
                          sx={{
                            fontWeight: 600,
                            bgcolor: "#03a9f411",
                            color: "#03a9f4",
                          }}
                        />
                      </Grid>
                    </Grid>
                  </Box>
                )}

                {activeTab === 2 && transferStats && (
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: "12px",
                      bgcolor: "#f5f5f5",
                      border: "1px solid #e0e0e0",
                    }}
                  >
                    <Typography
                      variant="subtitle2"
                      sx={{ fontWeight: 600, mb: 1.5, color: "#667eea" }}
                    >
                      Thống kê phiếu điều chuyển
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Chip
                          label={`Chờ xác nhận: ${
                            transferStats.pending_confirmation || 0
                          }`}
                          color="warning"
                          sx={{ fontWeight: 600 }}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Chip
                          label={`Chờ duyệt: ${
                            transferStats.pending_approval || 0
                          }`}
                          color="warning"
                          sx={{ fontWeight: 600 }}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Chip
                          label={`Đã duyệt: ${transferStats.completed || 0}`}
                          color="success"
                          sx={{ fontWeight: 600 }}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Chip
                          label={`Đã hủy: ${transferStats.cancelled || 0}`}
                          color="error"
                          sx={{ fontWeight: 600 }}
                        />
                      </Grid>
                    </Grid>
                  </Box>
                )}

                {activeTab === 3 && inventoryStats && (
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: "12px",
                      bgcolor: "#f5f5f5",
                      border: "1px solid #e0e0e0",
                    }}
                  >
                    <Typography
                      variant="subtitle2"
                      sx={{ fontWeight: 600, mb: 1.5, color: "#667eea" }}
                    >
                      Thống kê phiếu kiểm kê
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Chip
                          label={`Nháp: ${inventoryStats.draft || 0}`}
                          color="info"
                          sx={{ fontWeight: 600 }}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Chip
                          label={`Chờ duyệt: ${inventoryStats.pending || 0}`}
                          color="warning"
                          sx={{ fontWeight: 600 }}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Chip
                          label={`Đã duyệt: ${inventoryStats.completed || 0}`}
                          color="success"
                          sx={{ fontWeight: 600 }}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Chip
                          label={`Đã hủy: ${inventoryStats.cancelled || 0}`}
                          color="error"
                          sx={{ fontWeight: 600 }}
                        />
                      </Grid>
                    </Grid>
                  </Box>
                )}
              </Box>
            )}

            {/* Content for Tabs 0, 1, 2, 3 (Filters, Table, Pagination) */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid size={{ xs: 12, md: activeTab === 3 ? 12 : 6 }}>
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

                  {activeTab === 3
                    ? [
                        <MenuItem key="draft" value="draft">
                          Nháp (đang kiểm)
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
                    : activeTab === 2
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
              {activeTab === 2 && (
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    select
                    label="Đến vị trí"
                    value={locationFilter}
                    onChange={(e) => setLocationFilter(e.target.value)}
                    sx={{
                      "& .MuiOutlinedInput-root": { borderRadius: "12px" },
                    }}
                  >
                    <MenuItem value="">Tất cả</MenuItem>
                    {allLocationsForFilter.map((location) => (
                      <MenuItem
                        key={location.uuid_location}
                        value={location.uuid_location}
                      >
                        {location.name_location}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
              )}
              {activeTab !== 2 && activeTab !== 3 && (
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
              {/* Date Filter - Hiển thị cho tất cả các tab */}
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  type="date"
                  label="Từ ngày"
                  value={dateFromFilter}
                  onChange={(e) => setDateFromFilter(e.target.value)}
                  InputLabelProps={{
                    shrink: true,
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": { borderRadius: "12px" },
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  type="date"
                  label="Đến ngày"
                  value={dateToFilter}
                  onChange={(e) => setDateToFilter(e.target.value)}
                  InputLabelProps={{
                    shrink: true,
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": { borderRadius: "12px" },
                  }}
                />
              </Grid>
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
                    ) : activeTab === 3 ? (
                      <TableCell
                        sx={{ fontWeight: 600, whiteSpace: "nowrap" }}
                        colSpan={2}
                      >
                        Vị trí kiểm kê
                      </TableCell>
                    ) : (
                      <TableCell
                        sx={{ fontWeight: 600, whiteSpace: "nowrap" }}
                        colSpan={2}
                      >
                        {activeTab === 0 ? "Nhập vào" : "Xuất đến"}
                      </TableCell>
                    )}
                    {activeTab !== 3 ? (
                      <TableCell
                        sx={{ fontWeight: 600, whiteSpace: "nowrap" }}
                        align="center"
                      >
                        Số lượng máy
                      </TableCell>
                    ) : null}
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
          fullScreen={isMobile}
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
                        : dialogType === "inventory"
                        ? "kiểm kê"
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
                      {/* --- PHẦN RIÊNG CHO PHIẾU KIỂM KÊ (INVENTORY) --- */}
                      {dialogType === "inventory" ? (
                        <>
                          <TextField
                            fullWidth
                            type="date"
                            label="Ngày kiểm kê"
                            value={formData.date}
                            onChange={(e) =>
                              handleFormChange("date", e.target.value)
                            }
                            disabled={dialogMode === "view"}
                            required
                            InputLabelProps={{ shrink: true }}
                            sx={DISABLED_VIEW_SX}
                          />

                          {dialogMode === "create" && (
                            <Box>
                              <Stack
                                direction="row"
                                spacing={1}
                                sx={{ mb: 1 }}
                                alignItems="center"
                              >
                                <Button
                                  size="small"
                                  variant="contained"
                                  onClick={() => {
                                    setFormData({
                                      ...formData,
                                      department_uuids: departments.map(
                                        (d) => d.uuid_department
                                      ),
                                    });
                                  }}
                                  sx={{
                                    borderRadius: "8px",
                                    textTransform: "none",
                                  }}
                                >
                                  Chọn tất cả
                                </Button>
                                <Button
                                  size="small"
                                  variant="contained"
                                  onClick={() => {
                                    setFormData({
                                      ...formData,
                                      department_uuids: [],
                                    });
                                  }}
                                  sx={{
                                    borderRadius: "8px",
                                    textTransform: "none",
                                  }}
                                >
                                  Bỏ chọn tất cả
                                </Button>
                              </Stack>
                              <Autocomplete
                                multiple
                                fullWidth
                                options={departments}
                                getOptionLabel={(option) =>
                                  option.name_department || ""
                                }
                                onChange={(event, newValue) => {
                                  setFormData({
                                    ...formData,
                                    department_uuids: newValue.map(
                                      (d) => d.uuid_department
                                    ),
                                  });
                                }}
                                value={departments.filter((dept) =>
                                  formData.department_uuids?.includes(
                                    dept.uuid_department
                                  )
                                )}
                                loading={departmentLoading}
                                disableCloseOnSelect
                                renderInput={(params) => (
                                  <TextField
                                    {...params}
                                    label="Chọn các đơn vị kiểm kê"
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
                                          {departmentLoading ? (
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
                              />
                            </Box>
                          )}

                          {dialogMode === "view" &&
                            formData.inventoryDetails &&
                            formData.inventoryDetails.length > 0 && (
                              <Card
                                variant="outlined"
                                sx={{ borderRadius: "12px", mt: 2 }}
                              >
                                <CardContent>
                                  <Stack
                                    direction="row"
                                    justifyContent="space-between"
                                    alignItems="center"
                                    sx={{ mb: 2 }}
                                  >
                                    <Typography
                                      variant="h6"
                                      sx={{ fontWeight: 600 }}
                                    >
                                      Chi tiết kiểm kê (
                                      {formData.inventoryDetails.length} đơn vị)
                                    </Typography>
                                    {selectedTicket?.status === "draft" &&
                                      (isAdmin ||
                                        isPhongCoDien ||
                                        selectedTicket?.created_by ===
                                          user?.id) && (
                                        <Button
                                          variant="contained"
                                          startIcon={<Add />}
                                          onClick={async () => {
                                            await fetchDepartments();
                                            // Lọc ra các đơn vị chưa có trong phiếu (và không phải external)
                                            const existingDeptIds =
                                              formData.inventoryDetails.map(
                                                (d) => d.id_department
                                              );
                                            const availableDepts =
                                              departments.filter(
                                                (dept) =>
                                                  !existingDeptIds.includes(
                                                    dept.id_department
                                                  ) &&
                                                  dept.type !== "external" &&
                                                  dept.name_department !==
                                                    "Đơn vị bên ngoài"
                                              );

                                            if (availableDepts.length === 0) {
                                              showNotification(
                                                "info",
                                                "Không có đơn vị",
                                                "Tất cả đơn vị đã được thêm vào phiếu kiểm kê này."
                                              );
                                              return;
                                            }

                                            // Mở dialog chọn đơn vị
                                            setFormData((prev) => ({
                                              ...prev,
                                              showAddDepartmentDialog: true,
                                              availableDepartments:
                                                availableDepts,
                                              selectedNewDepartments: [],
                                            }));
                                          }}
                                          sx={{
                                            borderRadius: "12px",
                                            textTransform: "none",
                                          }}
                                        >
                                          Thêm đơn vị
                                        </Button>
                                      )}
                                  </Stack>
                                  <TableContainer sx={{ maxHeight: 400 }}>
                                    <Table size="small" stickyHeader>
                                      <TableHead>
                                        <TableRow>
                                          <TableCell sx={{ fontWeight: 600 }}>
                                            Đơn vị
                                          </TableCell>
                                          <TableCell sx={{ fontWeight: 600 }}>
                                            Trạng thái
                                          </TableCell>
                                          <TableCell sx={{ fontWeight: 600 }}>
                                            Kết quả
                                          </TableCell>
                                          <TableCell
                                            align="center"
                                            sx={{ fontWeight: 600 }}
                                          >
                                            Hành động
                                          </TableCell>
                                        </TableRow>
                                      </TableHead>
                                      <TableBody>
                                        {formData.inventoryDetails.map(
                                          (dept) => {
                                            // Calculate summary stats from dept.scanned_result array
                                            let scannedArr = [];
                                            try {
                                              const parsed =
                                                typeof dept.scanned_result ===
                                                "string"
                                                  ? JSON.parse(
                                                      dept.scanned_result
                                                    )
                                                  : dept.scanned_result;
                                              scannedArr = Array.isArray(parsed)
                                                ? parsed
                                                : parsed?.locations || [];
                                            } catch {
                                              scannedArr = [];
                                            }
                                            const totalMachines =
                                              scannedArr.reduce(
                                                (acc, loc) =>
                                                  acc +
                                                  (loc.scanned_machine
                                                    ?.length || 0),
                                                0
                                              );
                                            const totalMis = scannedArr.reduce(
                                              (acc, loc) =>
                                                acc +
                                                (loc.scanned_machine?.filter(
                                                  (m) => m.mislocation === "1"
                                                ).length || 0),
                                              0
                                            );
                                            const scannedLocationsCount =
                                              scannedArr.length;
                                            const totalLocationsCount =
                                              dept.total_locations || 0;

                                            return (
                                              <TableRow
                                                key={dept.uuid_department}
                                              >
                                                <TableCell
                                                  sx={{ fontWeight: 600 }}
                                                >
                                                  {dept.name_department}
                                                </TableCell>
                                                <TableCell>
                                                  {scannedArr.length > 0 ? (
                                                    <Chip
                                                      label="Đã kiểm"
                                                      color="success"
                                                      size="small"
                                                    />
                                                  ) : (
                                                    <Chip
                                                      label="Chưa kiểm"
                                                      color="default"
                                                      size="small"
                                                    />
                                                  )}
                                                </TableCell>
                                                <TableCell>
                                                  <Stack
                                                    spacing={1}
                                                    alignItems="flex-start"
                                                  >
                                                    {/* Dòng thông tin chính */}
                                                    <Typography
                                                      variant="caption"
                                                      sx={{
                                                        whiteSpace: "nowrap",
                                                      }}
                                                    >
                                                      Đã kiểm:{" "}
                                                      <b>
                                                        {scannedLocationsCount}/
                                                        {totalLocationsCount}
                                                      </b>
                                                    </Typography>

                                                    {/* Các thẻ thông số */}
                                                    <Stack
                                                      direction="row"
                                                      spacing={0.5}
                                                    >
                                                      <Chip
                                                        label={`Máy: ${totalMachines}`}
                                                        // size="small"
                                                        variant="outlined"
                                                        sx={{
                                                          fontSize: "12px",
                                                          height: "20px",
                                                        }}
                                                      />
                                                      <Chip
                                                        label={`Sai vị trí: ${totalMis}`}
                                                        // size="small"
                                                        color={
                                                          totalMis > 0
                                                            ? "error"
                                                            : "default"
                                                        } // Đỏ nếu có lỗi
                                                        sx={{
                                                          fontSize: "12px",
                                                          height: "20px",
                                                        }}
                                                      />
                                                    </Stack>
                                                  </Stack>
                                                </TableCell>
                                                <TableCell align="center">
                                                  <Button
                                                    size="small"
                                                    variant="contained"
                                                    color="info"
                                                    onClick={() =>
                                                      handleOpenDepartmentDetail(
                                                        dept
                                                      )
                                                    }
                                                    sx={{
                                                      borderRadius: "20px",
                                                      textTransform: "none",
                                                    }}
                                                  >
                                                    <EditNote />
                                                  </Button>
                                                </TableCell>
                                              </TableRow>
                                            );
                                          }
                                        )}
                                      </TableBody>
                                    </Table>
                                  </TableContainer>
                                </CardContent>
                              </Card>
                            )}

                          {dialogMode === "view" &&
                            formData.inventoryDetails &&
                            formData.inventoryDetails.length > 0 && (
                              <Card
                                variant="outlined"
                                sx={{
                                  borderRadius: "12px",
                                  mt: 2,
                                  border: "1px solid #e0e0e0",
                                  backgroundColor: "#f8f9fa",
                                }}
                              >
                                <CardContent>
                                  <Stack
                                    direction="row"
                                    alignItems="center"
                                    spacing={2}
                                    sx={{ mb: 2 }}
                                  >
                                    <Avatar
                                      sx={{
                                        width: 40,
                                        height: 40,
                                        background:
                                          "linear-gradient(45deg, #ff9800, #ff5722)",
                                      }}
                                    >
                                      <Assessment sx={{ fontSize: 24 }} />
                                    </Avatar>
                                    <Box>
                                      <Typography
                                        variant="h6"
                                        sx={{
                                          fontWeight: 700,
                                          color: "#ff5722",
                                        }}
                                      >
                                        Thống kê kết quả kiểm kê
                                      </Typography>
                                      <Typography
                                        variant="caption"
                                        color="text.secondary"
                                      >
                                        Thông số trong đợt kiểm kê
                                      </Typography>
                                    </Box>
                                  </Stack>

                                  <TableContainer
                                    component={Paper}
                                    elevation={0}
                                    sx={{
                                      border: "1px solid #e0e0e0",
                                      borderRadius: "8px",
                                    }}
                                  >
                                    <Table size="small">
                                      <TableHead>
                                        <TableRow sx={{ bgcolor: "#eeeeee" }}>
                                          <TableCell
                                            sx={{ fontWeight: "bold" }}
                                          >
                                            Đơn vị
                                          </TableCell>
                                          <TableCell
                                            sx={{ fontWeight: "bold" }}
                                            align="center"
                                          >
                                            Vị trí đã kiểm
                                          </TableCell>
                                          <TableCell
                                            sx={{
                                              fontWeight: "bold",
                                              color: "#1565c0",
                                            }}
                                            align="center"
                                          >
                                            Sổ sách (Trước kiểm kê)
                                          </TableCell>

                                          {/* CỘT MỚI: Cùng ĐV */}
                                          <TableCell
                                            sx={{
                                              fontWeight: "bold",
                                              color: "#2e7d32",
                                            }}
                                            align="center"
                                          >
                                            Thực tế (Cùng ĐV)
                                          </TableCell>

                                          {/* CỘT MỚI: Khác ĐV */}
                                          <TableCell
                                            sx={{
                                              fontWeight: "bold",
                                              color: "#ed6c02",
                                            }}
                                            align="center"
                                          >
                                            Thực tế (Khác ĐV)
                                          </TableCell>

                                          <TableCell
                                            sx={{
                                              fontWeight: "bold",
                                              color: "#d32f2f",
                                            }}
                                            align="center"
                                          >
                                            Chênh lệch
                                          </TableCell>
                                        </TableRow>
                                      </TableHead>
                                      <TableBody>
                                        {(() => {
                                          let totalCheckedLocs = 0;
                                          let grandTotalLocs = 0;
                                          let grandTotalSystem = 0;

                                          // Biến tổng cộng mới
                                          let grandTotalCorrectDept = 0; // Tổng máy đúng đơn vị
                                          let grandTotalMisDept = 0; // Tổng máy khác đơn vị

                                          let grandTotalDiff = 0;

                                          const rows =
                                            formData.inventoryDetails.map(
                                              (dept) => {
                                                let scannedArr = [];
                                                let systemSnapshot = 0;

                                                try {
                                                  const parsed =
                                                    typeof dept.scanned_result ===
                                                    "string"
                                                      ? JSON.parse(
                                                          dept.scanned_result
                                                        )
                                                      : dept.scanned_result;

                                                  if (Array.isArray(parsed)) {
                                                    scannedArr = parsed;
                                                    systemSnapshot =
                                                      dept.total_machines_system ||
                                                      0;
                                                  } else if (
                                                    parsed &&
                                                    parsed.locations
                                                  ) {
                                                    scannedArr =
                                                      parsed.locations;
                                                    systemSnapshot =
                                                      parsed.snapshot_count ||
                                                      0;
                                                  } else {
                                                    scannedArr = [];
                                                    systemSnapshot =
                                                      dept.total_machines_system ||
                                                      0;
                                                  }
                                                } catch {
                                                  scannedArr = [];
                                                  systemSnapshot =
                                                    dept.total_machines_system ||
                                                    0;
                                                }

                                                const checkedCount =
                                                  scannedArr.length;
                                                const totalLocs =
                                                  dept.total_locations || 0;

                                                // --- LOGIC TÍNH TOÁN CŨNG GIỐNG BÊN TRONG ---
                                                let correctDeptCount = 0;
                                                let misDeptCount = 0;

                                                scannedArr.forEach((loc) => {
                                                  if (
                                                    loc.scanned_machine &&
                                                    Array.isArray(
                                                      loc.scanned_machine
                                                    )
                                                  ) {
                                                    loc.scanned_machine.forEach(
                                                      (m) => {
                                                        if (
                                                          m.misdepartment ===
                                                          "1"
                                                        ) {
                                                          misDeptCount++;
                                                        } else {
                                                          correctDeptCount++;
                                                        }
                                                      }
                                                    );
                                                  }
                                                });

                                                const totalScanned =
                                                  correctDeptCount +
                                                  misDeptCount;
                                                const diff =
                                                  systemSnapshot - totalScanned;

                                                totalCheckedLocs +=
                                                  checkedCount;
                                                grandTotalLocs += totalLocs;
                                                grandTotalSystem +=
                                                  systemSnapshot;

                                                // Cộng dồn tổng
                                                grandTotalCorrectDept +=
                                                  correctDeptCount;
                                                grandTotalMisDept +=
                                                  misDeptCount;

                                                grandTotalDiff += diff;

                                                return {
                                                  id: dept.id_department,
                                                  name: dept.name_department,
                                                  progress: `${checkedCount}/${totalLocs}`,
                                                  isFull:
                                                    checkedCount >= totalLocs &&
                                                    totalLocs > 0,
                                                  system: systemSnapshot,
                                                  scanned: totalScanned, // Tổng số quét được
                                                  correctDept: correctDeptCount, // Trong đơn vị
                                                  misDept: misDeptCount, // Khác đơn vị
                                                  diff: diff,
                                                };
                                              }
                                            );

                                          return (
                                            <>
                                              {rows.map((row) => (
                                                <TableRow key={row.id} hover>
                                                  <TableCell
                                                    sx={{
                                                      fontWeight: 600,
                                                      color: "#333",
                                                    }}
                                                  >
                                                    {row.name}
                                                  </TableCell>

                                                  <TableCell
                                                    align="center"
                                                    sx={{
                                                      fontWeight: 600,
                                                      color: row.isFull
                                                        ? "#2e7d32"
                                                        : "#ed6c02",
                                                    }}
                                                  >
                                                    {row.progress}
                                                  </TableCell>

                                                  <TableCell
                                                    align="center"
                                                    sx={{
                                                      fontWeight: 600,
                                                      color: "#1565c0",
                                                    }}
                                                  >
                                                    {new Intl.NumberFormat(
                                                      "en-US"
                                                    ).format(row.system)}
                                                  </TableCell>

                                                  {/* CỘT CÙNG ĐV */}
                                                  <TableCell
                                                    align="center"
                                                    sx={{
                                                      color: "#2e7d32",
                                                      fontWeight: 600,
                                                    }}
                                                  >
                                                    {new Intl.NumberFormat(
                                                      "en-US"
                                                    ).format(row.correctDept)}
                                                  </TableCell>

                                                  {/* CỘT KHÁC ĐV */}
                                                  <TableCell
                                                    align="center"
                                                    sx={{
                                                      color: "#ed6c02",
                                                      fontWeight: 600,
                                                    }}
                                                  >
                                                    {new Intl.NumberFormat(
                                                      "en-US"
                                                    ).format(row.misDept)}
                                                  </TableCell>

                                                  <TableCell
                                                    align="center"
                                                    sx={{
                                                      fontWeight: 600,
                                                      color: "#d32f2f",
                                                    }}
                                                  >
                                                    {new Intl.NumberFormat(
                                                      "en-US"
                                                    ).format(row.diff)}
                                                  </TableCell>
                                                </TableRow>
                                              ))}

                                              {/* --- HÀNG TỔNG CỘNG --- */}
                                              <TableRow
                                                sx={{
                                                  bgcolor: "#e3f2fd",
                                                  borderTop:
                                                    "2px solid #90caf9",
                                                }}
                                              >
                                                <TableCell
                                                  sx={{
                                                    fontWeight: "bold",
                                                    textTransform: "uppercase",
                                                  }}
                                                >
                                                  TỔNG CỘNG
                                                </TableCell>
                                                <TableCell
                                                  align="center"
                                                  sx={{ fontWeight: "bold" }}
                                                >
                                                  {totalCheckedLocs}/
                                                  {grandTotalLocs}
                                                </TableCell>
                                                <TableCell
                                                  align="center"
                                                  sx={{
                                                    fontWeight: "bold",
                                                    color: "#1565c0",
                                                    fontSize: "1rem",
                                                  }}
                                                >
                                                  {new Intl.NumberFormat(
                                                    "en-US"
                                                  ).format(grandTotalSystem)}
                                                </TableCell>

                                                <TableCell
                                                  align="center"
                                                  sx={{
                                                    fontWeight: "bold",
                                                    color: "#2e7d32",
                                                    fontSize: "1rem",
                                                  }}
                                                >
                                                  {new Intl.NumberFormat(
                                                    "en-US"
                                                  ).format(
                                                    grandTotalCorrectDept
                                                  )}
                                                </TableCell>

                                                <TableCell
                                                  align="center"
                                                  sx={{
                                                    fontWeight: "bold",
                                                    color: "#ed6c02",
                                                    fontSize: "1rem",
                                                  }}
                                                >
                                                  {new Intl.NumberFormat(
                                                    "en-US"
                                                  ).format(grandTotalMisDept)}
                                                </TableCell>

                                                <TableCell
                                                  align="center"
                                                  sx={{
                                                    fontWeight: "bold",
                                                    color: "#d32f2f",
                                                    fontSize: "1rem",
                                                  }}
                                                >
                                                  {new Intl.NumberFormat(
                                                    "en-US"
                                                  ).format(grandTotalDiff)}
                                                </TableCell>
                                              </TableRow>
                                            </>
                                          );
                                        })()}
                                      </TableBody>
                                    </Table>
                                  </TableContainer>
                                </CardContent>
                              </Card>
                            )}

                          {/* Bảng máy sai vị trí (chỉ hiển thị trong dialog view) */}
                          {dialogMode === "view" &&
                            formData.inventoryDetails &&
                            formData.inventoryDetails.length > 0 &&
                            (() => {
                              // Tính toán danh sách máy sai vị trí từ phiếu hiện tại
                              const mislocationMachines = [];

                              formData.inventoryDetails.forEach((dept) => {
                                let scannedArr = [];
                                try {
                                  const parsed =
                                    typeof dept.scanned_result === "string"
                                      ? JSON.parse(dept.scanned_result)
                                      : dept.scanned_result;

                                  if (Array.isArray(parsed)) {
                                    scannedArr = parsed;
                                  } else {
                                    // Nếu là object { snapshot_count, locations } thì lấy locations
                                    scannedArr = parsed?.locations || [];
                                  }
                                } catch {
                                  scannedArr = [];
                                }

                                if (Array.isArray(scannedArr)) {
                                  scannedArr.forEach((loc) => {
                                    if (
                                      loc.scanned_machine &&
                                      Array.isArray(loc.scanned_machine)
                                    ) {
                                      loc.scanned_machine.forEach((machine) => {
                                        if (machine.mislocation === "1") {
                                          mislocationMachines.push({
                                            ...machine,
                                            expected_location:
                                              loc.location_name,
                                            department_name:
                                              dept.name_department,
                                          });
                                        }
                                      });
                                    }
                                  });
                                }
                              });

                              if (mislocationMachines.length === 0) {
                                return null;
                              }

                              return (
                                <Card
                                  variant="outlined"
                                  sx={{
                                    borderRadius: "12px",
                                    mt: 2,
                                    border: "2px solid rgba(255, 87, 34, 0.3)",
                                  }}
                                >
                                  <CardContent>
                                    <Stack
                                      direction="row"
                                      alignItems="center"
                                      spacing={2}
                                      sx={{ mb: 2 }}
                                    >
                                      <Avatar
                                        sx={{
                                          width: 40,
                                          height: 40,
                                          background:
                                            "linear-gradient(45deg, #ff9800, #ff5722)",
                                        }}
                                      >
                                        <ErrorOutline sx={{ fontSize: 24 }} />
                                      </Avatar>
                                      <Box>
                                        <Typography
                                          variant="h6"
                                          sx={{
                                            fontWeight: 700,
                                            color: "#ff5722",
                                          }}
                                        >
                                          Máy sai vị trí (
                                          {mislocationMachines.length})
                                        </Typography>
                                        <Typography
                                          variant="caption"
                                          color="text.secondary"
                                        >
                                          Danh sách máy được quét không đúng vị
                                          trí
                                        </Typography>
                                      </Box>
                                    </Stack>

                                    <TableContainer
                                      component={Paper}
                                      elevation={0}
                                      sx={{
                                        borderRadius: "12px",
                                        border:
                                          "1px solid rgba(255, 87, 34, 0.2)",
                                        maxHeight: 400,
                                      }}
                                    >
                                      <Table size="small">
                                        <TableHead>
                                          <TableRow
                                            sx={{
                                              backgroundColor:
                                                "rgba(255, 87, 34, 0.05)",
                                            }}
                                          >
                                            {/* <TableCell
                                              sx={{
                                                fontWeight: 600,
                                                whiteSpace: "nowrap",
                                              }}
                                            >
                                              Mã máy
                                            </TableCell> */}
                                            <TableCell
                                              sx={{
                                                fontWeight: 600,
                                                whiteSpace: "nowrap",
                                              }}
                                            >
                                              Tên máy
                                            </TableCell>
                                            <TableCell
                                              sx={{
                                                fontWeight: 600,
                                                whiteSpace: "nowrap",
                                              }}
                                            >
                                              Serial
                                            </TableCell>
                                            <TableCell
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
                                              Vị trí quét được
                                            </TableCell>
                                            <TableCell
                                              sx={{
                                                fontWeight: 600,
                                                whiteSpace: "nowrap",
                                              }}
                                            >
                                              Đơn vị
                                            </TableCell>
                                          </TableRow>
                                        </TableHead>
                                        <TableBody>
                                          {mislocationMachines.map(
                                            (machine, index) => (
                                              <TableRow
                                                key={index}
                                                sx={{
                                                  backgroundColor:
                                                    "rgba(255, 152, 0, 0.05)",
                                                  "&:hover": {
                                                    backgroundColor:
                                                      "rgba(255, 152, 0, 0.1)",
                                                  },
                                                }}
                                              >
                                                {/* <TableCell
                                                  sx={{ fontWeight: 600 }}
                                                >
                                                  {machine.code || "-"}
                                                </TableCell> */}
                                                <TableCell>
                                                  {machine.name || "-"}
                                                </TableCell>
                                                <TableCell>
                                                  {machine.serial || "-"}
                                                </TableCell>
                                                <TableCell>
                                                  <Chip
                                                    label={
                                                      machine.current_location ||
                                                      "-"
                                                    }
                                                    size="small"
                                                    sx={{
                                                      backgroundColor:
                                                        "#e3f2fd",
                                                      color: "#1976d2",
                                                      fontWeight: 600,
                                                    }}
                                                  />
                                                </TableCell>
                                                <TableCell>
                                                  <Chip
                                                    label={
                                                      machine.expected_location ||
                                                      "-"
                                                    }
                                                    size="small"
                                                    color="warning"
                                                    sx={{ fontWeight: 600 }}
                                                  />
                                                </TableCell>
                                                <TableCell>
                                                  {machine.department_name ||
                                                    "-"}
                                                </TableCell>
                                              </TableRow>
                                            )
                                          )}
                                        </TableBody>
                                      </Table>
                                    </TableContainer>
                                  </CardContent>
                                </Card>
                              );
                            })()}

                          <TextField
                            fullWidth
                            multiline
                            rows={4}
                            label="Ghi chú"
                            value={formData.note}
                            onChange={(e) =>
                              handleFormChange("note", e.target.value)
                            }
                            disabled={dialogMode === "view"}
                            sx={DISABLED_VIEW_SX}
                          />
                        </>
                      ) : (
                        // --- PHẦN SELECT LOẠI PHIẾU (CHO IMPORT/EXPORT) ---
                        dialogType !== "internal" && (
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
                                  <MenuItem
                                    key="liquidation"
                                    value="liquidation"
                                  >
                                    Xuất thanh lý
                                  </MenuItem>,
                                  <MenuItem
                                    key="maintenance"
                                    value="maintenance"
                                  >
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
                        )
                      )}
                      {/* --- CÁC FIELD CHUNG (Mượn/Thuê) --- */}
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
                      {/* --- CÁC FIELD CHUNG (Thông tin xuất) --- */}
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
                                required
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
                                  required
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
                                  required
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

                      {/* --- ẨN CÁC FIELD DƯ THỪA KHI LÀ INVENTORY --- */}
                      {dialogType !== "inventory" && (
                        <>
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
                            getOptionLabel={(option) =>
                              option.name_location || ""
                            }
                            onChange={(event, newValue) =>
                              handleFormChange(
                                "to_location_uuid",
                                newValue ? newValue.uuid_location : ""
                              )
                            }
                            value={
                              filteredLocations.find(
                                (loc) =>
                                  loc.uuid_location ===
                                  formData.to_location_uuid
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
                        </>
                      )}

                      {/* --- LOGIC TRẠNG THÁI (INTERNAL) - Giữ nguyên --- */}
                      {dialogType === "internal" &&
                        formData.to_location_uuid &&
                        filteredLocations
                          .find(
                            (l) => l.uuid_location === formData.to_location_uuid
                          )
                          ?.name_location?.toLowerCase()
                          .includes("kho") && (
                          <Box
                            sx={{
                              mt: 2,
                              p: 2,
                              borderRadius: "12px",
                              border: "1px dashed #bdbdbd",
                              backgroundColor: "#fafafa",
                            }}
                          >
                            <Typography
                              variant="subtitle2"
                              sx={{
                                mb: 1.5,
                                fontWeight: 600,
                                color: "text.secondary",
                              }}
                            >
                              Chọn trạng thái máy:
                            </Typography>

                            <Stack
                              direction={{ xs: "column", sm: "row" }}
                              spacing={2}
                            >
                              {[
                                {
                                  value: "available",
                                  label: "Có thể sử dụng",
                                  color: STATUS_CONFIG.available.color,
                                  bg: STATUS_CONFIG.available.bg,
                                  icon: <CheckCircleOutline />,
                                },
                                {
                                  value: "broken",
                                  label: "Máy hư",
                                  color: STATUS_CONFIG.broken.color,
                                  bg: STATUS_CONFIG.broken.bg,
                                  icon: <ErrorOutline />,
                                },
                                {
                                  value: "pending_liquidation",
                                  label: "Chờ thanh lý",
                                  color:
                                    STATUS_CONFIG.pending_liquidation.color,
                                  bg: STATUS_CONFIG.pending_liquidation.bg,
                                  icon: <Autorenew />,
                                },
                              ].map((option) => {
                                const isSelected =
                                  (formData.target_status || "available") ===
                                  option.value;

                                return (
                                  <Button
                                    key={option.value}
                                    variant={
                                      isSelected ? "contained" : "outlined"
                                    }
                                    startIcon={option.icon}
                                    onClick={() =>
                                      handleFormChange(
                                        "target_status",
                                        option.value
                                      )
                                    }
                                    disabled={dialogMode === "view"}
                                    sx={{
                                      flex: 1,
                                      borderRadius: "10px",
                                      textTransform: "none",
                                      fontWeight: isSelected ? 700 : 500,
                                      transition: "all 0.3s ease",

                                      // --- TRẠNG THÁI ĐƯỢC CHỌN ---
                                      ...(isSelected && {
                                        backgroundColor:
                                          option.color + " !important", // Màu nền đậm
                                        color: "#fff",
                                        boxShadow: `0 4px 12px ${option.color}66`, // Hiệu ứng phát sáng (Glow)
                                        border: `1px solid ${option.color}`,
                                        transform: "translateY(-2px)", // Nhảy lên 1 chút
                                      }),

                                      // --- TRẠNG THÁI KHÔNG CHỌN ---
                                      ...(!isSelected && {
                                        borderColor: "#e0e0e0",
                                        color: "text.secondary",
                                        backgroundColor: "#fff",
                                        "&:hover": {
                                          borderColor: option.color,
                                          color: option.color,
                                          backgroundColor: option.bg,
                                        },
                                      }),

                                      // --- TRẠNG THÁI DISABLED (VIEW MODE) ---
                                      ...(dialogMode === "view" && {
                                        opacity: isSelected ? 1 : 0.5, // Giữ nút đã chọn sáng rõ, nút kia mờ đi
                                        boxShadow: "none",
                                        transform: "none",
                                      }),
                                    }}
                                  >
                                    {option.label}
                                  </Button>
                                );
                              })}
                            </Stack>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{
                                mt: 1,
                                display: "block",
                                fontStyle: "italic",
                              }}
                            >
                              * Các máy trong phiếu sẽ được cập nhật sang trạng
                              thái này sau khi duyệt.
                            </Typography>
                          </Box>
                        )}

                      {/* --- CHỌN MÁY MÓC (CREATE IMPORT/EXPORT/INTERNAL) --- */}
                      {/* ẨN KHI LÀ INVENTORY */}
                      {dialogMode === "create" &&
                        dialogType !== "inventory" && (
                          <Card
                            variant="outlined"
                            sx={{ borderRadius: "12px" }}
                          >
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
                                  {/* <Button
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
                                  </Button> */}
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
                                  {/* <Button
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
                                  </Button> */}
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

                              {dialogType !== "export" && (
                                <>
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
                                          <li>
                                            Nhập thường: Tìm tất cả thông tin
                                          </li>
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
                                            <b>hsx:</b>... (Tìm theo Hãng SX)
                                          </li>
                                          <li>
                                            <b>ncc:</b>... (Tìm theo Nhà cung
                                            cấp)
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
                                              <IconButton
                                                onClick={() => {
                                                  if (searchInputRef.current) {
                                                    searchInputRef.current.value =
                                                      "";
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
                                        sx={{
                                          maxHeight: 300,
                                          overflow: "auto",
                                        }}
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
                                                borrowLabel =
                                                  getMachineStatusLabel(
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
                                                          sx={{
                                                            fontWeight: 600,
                                                          }}
                                                        >
                                                          {machine.code_machine}{" "}
                                                          -{" "}
                                                          {machine.type_machine}{" "}
                                                          {
                                                            machine.attribute_machine
                                                          }{" "}
                                                          -{" "}
                                                          {
                                                            machine.model_machine
                                                          }
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
                                                            background:
                                                              getStatusInfo(
                                                                machine.current_status
                                                              ).bg,
                                                            color:
                                                              getStatusInfo(
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
                                                              fontSize:
                                                                "0.75rem",
                                                              background:
                                                                getStatusInfo(
                                                                  machine.is_borrowed_or_rented_or_borrowed_out
                                                                ).bg,
                                                              color:
                                                                getStatusInfo(
                                                                  machine.is_borrowed_or_rented_or_borrowed_out
                                                                ).color,
                                                              fontWeight: 600,
                                                              borderRadius:
                                                                "8px",
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
                                                    {machine.type_machine}{" "}
                                                    {machine.attribute_machine}{" "}
                                                    - {machine.model_machine}
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

                      {/* --- GHI CHÚ & FILE ĐÍNH KÈM (CHUNG CHO IMPORT/EXPORT) --- */}
                      {/* ẨN KHI LÀ INVENTORY (Vì Inventory đã có Ghi chú riêng ở trên) */}
                      {dialogType !== "inventory" && (
                        <>
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
                        </>
                      )}

                      {/* --- DANH SÁCH MÁY MÓC (VIEW IMPORT/EXPORT/INTERNAL) --- */}
                      {/* ẨN KHI LÀ INVENTORY (Vì Inventory dùng Table Location) */}
                      {dialogMode === "view" &&
                        dialogType !== "inventory" &&
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
                                        Đặc tính
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
                                          {machine.code_machine || "-"}
                                        </TableCell>
                                        <TableCell>
                                          {machine.type_machine || "-"}
                                        </TableCell>
                                        <TableCell>
                                          {machine.attribute_machine || "-"}
                                        </TableCell>
                                        <TableCell>
                                          {machine.model_machine || "-"}
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

                      {/* --- THÔNG TIN NGƯỜI TẠO & LUỒNG DUYỆT (HIỂN THỊ CHUNG) --- */}
                      {/* Giữ lại cho tất cả các loại phiếu để xem trạng thái */}
                      {dialogMode === "view" && selectedTicket && (
                        <Alert severity="info" sx={{ borderRadius: "12px" }}>
                          <Typography variant="body2">
                            <strong>Người tạo:</strong>{" "}
                            {selectedTicket.creator_ma_nv &&
                            selectedTicket.creator_ten_nv
                              ? `${selectedTicket.creator_ma_nv}: ${selectedTicket.creator_ten_nv}`
                              : formData.creator_ma_nv &&
                                formData.creator_ten_nv
                              ? `${formData.creator_ma_nv}: ${formData.creator_ten_nv}`
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
              {dialogMode === "create" && dialogType === "inventory" && (
                <Button
                  variant="contained"
                  onClick={handleCreateInventory}
                  disabled={loading}
                  startIcon={<FactCheck />}
                  sx={{
                    borderRadius: "12px",
                    background: "linear-gradient(45deg, #667eea, #764ba2)",
                    px: 3,
                    width: { xs: "100%", sm: "auto" },
                  }}
                >
                  {loading ? (
                    <CircularProgress size={24} />
                  ) : (
                    "Tạo Phiếu Kiểm Kê"
                  )}
                </Button>
              )}
              {dialogMode === "create" && dialogType !== "inventory" && (
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
              {dialogMode === "view" &&
                dialogType === "inventory" &&
                selectedTicket?.status === "draft" &&
                formData.inventoryDetails?.every((loc) => loc.is_completed) &&
                (isAdmin ||
                  isPhongCoDien ||
                  selectedTicket?.created_by === user?.id) && (
                  <Button
                    variant="contained"
                    onClick={handleInventorySubmit}
                    disabled={loading}
                    startIcon={<PlaylistAddCheck />}
                    sx={{
                      borderRadius: "12px",
                      background: "linear-gradient(45deg, #2e7d32, #4caf50)",
                      px: 3,
                      width: { xs: "100%", sm: "auto" },
                    }}
                  >
                    {loading ? (
                      <CircularProgress size={24} />
                    ) : (
                      "Đóng phiếu & Gửi duyệt"
                    )}
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
              {/* <Grid size={{ xs: 12, sm: 6 }}>
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
              </Grid> */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Phân loại"
                  value="Máy móc thiết bị"
                  disabled={true}
                  sx={DISABLED_VIEW_SX}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <Autocomplete
                  options={formMachineTypes}
                  getOptionLabel={(option) => option.name || ""}
                  value={
                    formMachineTypes.find(
                      (t) => t.name === newMachineData.type_machine
                    ) || null
                  }
                  onChange={(event, newValue) => {
                    const typeName = newValue ? newValue.name : "";
                    handleCreateMachineInputChange("type_machine", typeName);
                    fetchAttributesByTypeName(typeName);
                  }}
                  disabled={!canCreateOrImportMachines}
                  renderInput={(params) => (
                    <TextField {...params} label="Loại máy" required />
                  )}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Autocomplete
                  options={formAttributes}
                  getOptionLabel={(option) => option.name || ""}
                  value={
                    formAttributes.find(
                      (a) => a.name === newMachineData.attribute_machine
                    ) || null
                  }
                  onChange={(event, newValue) => {
                    handleCreateMachineInputChange(
                      "attribute_machine",
                      newValue ? newValue.name : ""
                    );
                  }}
                  disabled={!canCreateOrImportMachines}
                  renderInput={(params) => (
                    <TextField {...params} label="Đặc tính" />
                  )}
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
                    {/* <MenuItem value="in_use">Đang sử dụng</MenuItem>
                    <MenuItem value="maintenance">Bảo trì</MenuItem>
                    <MenuItem value="liquidation">Thanh lý</MenuItem>
                    <MenuItem value="disabled">Chưa sử dụng</MenuItem>
                    <MenuItem value="broken">Máy hư</MenuItem> */}
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <Autocomplete
                  options={formManufacturers}
                  getOptionLabel={(option) => option.name || ""}
                  value={
                    formManufacturers.find(
                      (m) => m.name === newMachineData.manufacturer
                    ) || null
                  }
                  onChange={(event, newValue) => {
                    handleCreateMachineInputChange(
                      "manufacturer",
                      newValue ? newValue.name : ""
                    );
                  }}
                  onBlur={handleGenerateCodeForNewMachine}
                  disabled={!canCreateOrImportMachines}
                  renderInput={(params) => (
                    <TextField {...params} label="Hãng sản xuất" />
                  )}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Autocomplete
                  options={formSuppliers}
                  getOptionLabel={(option) => option.name || ""}
                  value={
                    formSuppliers.find(
                      (s) => s.name === newMachineData.supplier
                    ) || null
                  }
                  onChange={(event, newValue) => {
                    handleCreateMachineInputChange(
                      "supplier",
                      newValue ? newValue.name : ""
                    );
                  }}
                  disabled={!canCreateOrImportMachines}
                  renderInput={(params) => (
                    <TextField {...params} label="Nhà cung cấp" />
                  )}
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <Divider sx={{ my: 2 }}>
                  <Chip label="Thông tin kỹ thuật" />
                </Divider>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth
                  label="Công suất"
                  value={newMachineData.power || ""}
                  onChange={(e) =>
                    handleCreateMachineInputChange("power", e.target.value)
                  }
                  disabled={!canCreateOrImportMachines}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth
                  label="Áp suất"
                  value={newMachineData.pressure || ""}
                  onChange={(e) =>
                    handleCreateMachineInputChange("pressure", e.target.value)
                  }
                  disabled={!canCreateOrImportMachines}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth
                  label="Điện áp"
                  value={newMachineData.voltage || ""}
                  onChange={(e) =>
                    handleCreateMachineInputChange("voltage", e.target.value)
                  }
                  disabled={!canCreateOrImportMachines}
                />
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
                mẫu): <strong>Serial</strong>, <strong>Loại máy</strong>
              </Typography>
              <Typography variant="body2" gutterBottom>
                3. Cột <strong>Ngày sử dụng</strong>: Nhập định dạng{" "}
                <strong>DD/MM/YYYY</strong> (ví dụ: 31/10/2025).
              </Typography>
              <Typography variant="body2">
                4. Hệ thống sẽ kiểm tra trùng lặp <strong>Serial</strong> đã có
                trong CSDL.
              </Typography>

              <Box sx={{ mt: 1 }}>
                <Link
                  component="button"
                  onClick={handleDownloadSampleExcel}
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
                                primary={`${succ.type} ${succ.attribute} - ${succ.model}`}
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
          selectedMachineUuids={
            openInventoryScanDialog
              ? inventoryScannedList.map((m) => m.uuid_machine)
              : formData.machines.map((m) => m.uuid_machine)
          }
          isInventoryMode={openInventoryScanDialog}
        />

        {/* RFID Search dialog cho các RFID không có trong hệ thống (kiểm kê) */}
        <Dialog
          open={openInventoryRfidSearchDialog}
          onClose={() => setOpenInventoryRfidSearchDialog(false)}
          maxWidth="md"
          fullWidth
          fullScreen={isMobile}
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
            <Typography
              component="span"
              variant={isMobile ? "h6" : "h5"}
              sx={{ fontWeight: 700 }}
            >
              Dò tìm thiết bị (RFID)
            </Typography>
            <IconButton
              onClick={() => setOpenInventoryRfidSearchDialog(false)}
              sx={{ color: "white" }}
            >
              <Close />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ p: 0 }}>
            <RfidSearch
              onClose={() => setOpenInventoryRfidSearchDialog(false)}
              selectedMachines={inventoryRfidSearchTargets}
              skipResolveApi
            />
          </DialogContent>
        </Dialog>

        {/* Inventory Department Detail Dialog */}
        <Dialog
          open={openInventoryScanDialog}
          onClose={handleCloseInventoryScan}
          maxWidth="lg"
          fullWidth
          fullScreen={isMobile}
          PaperProps={{ sx: { borderRadius: isMobile ? 0 : "20px" } }}
        >
          <DialogTitle
            sx={{
              background: "linear-gradient(45deg, #ff9800, #ff5722)",
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
                Kiểm kê: {currentDepartment?.name_department}
              </Typography>
            </Box>
            <IconButton
              onClick={handleCloseInventoryScan}
              sx={{ color: "white" }}
            >
              <Close />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ mt: 3 }}>
            <Stack spacing={3}>
              {/* Vùng chọn vị trí để quét mới */}
              {selectedTicket?.status === "draft" &&
                canEditInventoryDepartment(currentDepartment) && (
                  <Card
                    variant="outlined"
                    sx={{ p: 2, bgcolor: "#f5f5f5", borderRadius: "12px" }}
                  >
                    <Typography
                      variant="h6"
                      gutterBottom
                      sx={{ fontWeight: 600 }}
                    >
                      Thêm vị trí kiểm kê
                    </Typography>
                    <Stack
                      direction={isMobile ? "column" : "row"}
                      spacing={2}
                      alignItems="center"
                    >
                      <Autocomplete
                        fullWidth
                        options={departmentLocations}
                        getOptionLabel={(opt) => opt.name_location}
                        onChange={(e, val) => setSelectedLocationForScan(val)}
                        value={selectedLocationForScan}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Chọn vị trí để kiểm"
                            size="small"
                          />
                        )}
                        sx={{ flex: 1 }}
                      />
                      {/* <Button
                        variant="outlined"
                        startIcon={<QrCode2 />}
                        onClick={() => setOpenScanDialog(true)}
                        disabled={!selectedLocationForScan}
                        sx={{ borderRadius: "12px", minWidth: "120px" }}
                      >
                        Quét Mã QR
                      </Button> */}
                      <Button
                        variant="outlined"
                        startIcon={<WifiTethering />}
                        onClick={() => setOpenRfidDialog(true)}
                        disabled={!selectedLocationForScan}
                        sx={{ borderRadius: "12px", minWidth: "120px" }}
                      >
                        Quét RFID/NFC
                      </Button>
                    </Stack>

                    {/* List máy đang quét tạm (chưa lưu) */}
                    {inventoryScannedList.length > 0 && (
                      <Box sx={{ mt: 2 }}>
                        <Stack
                          direction={{ xs: "column", sm: "row" }}
                          spacing={1}
                          alignItems={{ xs: "flex-start", sm: "center" }}
                          justifyContent="space-between"
                          sx={{ mb: 1 }}
                        >
                          <Typography variant="subtitle2">
                            Đang quét: {inventoryScannedList.length} máy tại{" "}
                            {selectedLocationForScan?.name_location}
                          </Typography>
                          <Button
                            variant="text"
                            size="small"
                            onClick={handleOpenInventoryRfidSearch}
                            sx={{
                              textTransform: "none",
                              borderRadius: "999px",
                              px: 2,
                            }}
                          >
                            Dò tìm các RFID trùng/không có trong hệ thống
                          </Button>
                        </Stack>
                        <TableContainer
                          component={Paper}
                          variant="outlined"
                          sx={{
                            borderRadius: "12px",
                            mb: 2,
                            maxHeight: 400,
                            overflow: "auto",
                          }}
                        >
                          <Table size="small" stickyHeader>
                            <TableHead>
                              <TableRow>
                                {/* <TableCell sx={{ fontWeight: 600 }}>
                                  Mã máy
                                </TableCell> */}
                                <TableCell sx={{ fontWeight: 600 }}>
                                  Tên máy
                                </TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>
                                  Serial
                                </TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>
                                  RFID
                                </TableCell>
                                {/* <TableCell sx={{ fontWeight: 600 }}>
                                  NFC
                                </TableCell> */}
                                <TableCell sx={{ fontWeight: 600 }}>
                                  Vị trí hiện tại
                                </TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>
                                  Trạng thái
                                </TableCell>
                                <TableCell
                                  sx={{ fontWeight: 600 }}
                                  align="center"
                                >
                                  Xóa
                                </TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {inventoryScannedList.map((machine, index) => {
                                const isMislocation =
                                  machine.uuid_location !==
                                  selectedLocationForScan?.uuid_location;
                                const isDuplicate =
                                  machine.isDuplicateInCurrentDept;
                                // Kiểm tra máy placeholder: có flag isNotFound hoặc uuid_machine bắt đầu bằng "NOT_FOUND_"
                                const isNotFound =
                                  machine.isNotFound === true ||
                                  (machine.uuid_machine &&
                                    machine.uuid_machine.startsWith(
                                      "NOT_FOUND_"
                                    ));
                                const machineName = isNotFound
                                  ? "Không tìm thấy trong hệ thống"
                                  : machine.type_machine &&
                                    machine.model_machine
                                  ? `${machine.type_machine} ${
                                      machine.attribute_machine || ""
                                    } - ${machine.model_machine}`
                                  : machine.type_machine ||
                                    machine.model_machine ||
                                    "-";
                                return (
                                  <TableRow
                                    key={index}
                                    sx={{
                                      backgroundColor: isDuplicate
                                        ? "#ffebee"
                                        : isMislocation
                                        ? "#fff3e0"
                                        : isNotFound
                                        ? "#e3f2fd"
                                        : "inherit",
                                    }}
                                  >
                                    {/* <TableCell>
                                      {machine.code_machine}
                                    </TableCell> */}
                                    <TableCell>{machineName}</TableCell>
                                    <TableCell>
                                      {machine.serial_machine || "-"}
                                    </TableCell>
                                    <TableCell>
                                      {machine.RFID_machine || "-"}
                                    </TableCell>
                                    {/* <TableCell>
                                      {machine.NFC_machine || "-"}
                                    </TableCell> */}
                                    <TableCell>
                                      {machine.name_location || "-"}
                                    </TableCell>
                                    <TableCell>
                                      <Stack direction="column" spacing={0.5}>
                                        {isNotFound ? (
                                          <Chip
                                            label="Không tìm thấy trong hệ thống"
                                            color="info"
                                            size="small"
                                          />
                                        ) : isDuplicate ? (
                                          <>
                                            <Stack
                                              direction="row"
                                              spacing={0.5}
                                              alignItems="center"
                                            >
                                              <Chip
                                                label={`Đã quét tại ${machine.duplicateLocationName}`}
                                                color="error"
                                                size="small"
                                              />
                                              <Chip
                                                label={`Xóa tại ${machine.duplicateLocationName}`}
                                                color="error"
                                                size="small"
                                                icon={
                                                  <Delete fontSize="small" />
                                                }
                                                onClick={() =>
                                                  handleRemoveInventoryScannedMachine(
                                                    machine.uuid_machine
                                                  )
                                                }
                                                sx={{
                                                  cursor: "pointer",
                                                  "&:hover": {
                                                    backgroundColor: "#d32f2f",
                                                    color: "#fff",
                                                  },
                                                }}
                                              />
                                            </Stack>
                                            {isMislocation && (
                                              <Chip
                                                label="Sai vị trí"
                                                color="warning"
                                                size="small"
                                              />
                                            )}
                                          </>
                                        ) : isMislocation ? (
                                          <Chip
                                            label="Sai vị trí"
                                            color="warning"
                                            size="small"
                                          />
                                        ) : (
                                          <Chip
                                            label="Đúng vị trí"
                                            color="success"
                                            size="small"
                                          />
                                        )}
                                      </Stack>
                                    </TableCell>
                                    <TableCell align="center">
                                      <IconButton
                                        size="small"
                                        color="error"
                                        onClick={() =>
                                          handleRemoveInventoryScannedMachine(
                                            machine.uuid_machine
                                          )
                                        }
                                      >
                                        <Delete fontSize="small" />
                                      </IconButton>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </TableContainer>
                        <Button
                          onClick={handleInventoryScanComplete}
                          variant="contained"
                          color="success"
                          startIcon={<Save />}
                          disabled={
                            loading ||
                            inventoryScannedList.some(
                              (m) => m.isDuplicateInCurrentDept
                            )
                          }
                          sx={{ borderRadius: "12px" }}
                        >
                          {loading ? (
                            <CircularProgress size={24} />
                          ) : (
                            "Lưu kết quả"
                          )}
                        </Button>
                        {inventoryScannedList.some(
                          (m) => m.isDuplicateInCurrentDept
                        ) && (
                          <Alert
                            severity="error"
                            sx={{ mt: 2, borderRadius: "12px" }}
                          >
                            <AlertTitle>Không thể lưu kết quả</AlertTitle>
                            Có máy đã được quét ở vị trí khác trong đơn vị này.
                            Vui lòng xóa các máy có chip đỏ "Đã quét tại..."
                            khỏi danh sách trước khi lưu.
                          </Alert>
                        )}
                      </Box>
                    )}
                  </Card>
                )}

              {currentDepartment && (
                <Card
                  variant="outlined"
                  sx={{
                    borderRadius: "12px",
                    bgcolor: "#fff",
                    border: "1px solid #e0e0e0", // Viền giống bên ngoài
                  }}
                >
                  <Box
                    sx={{
                      p: 2,
                      borderBottom: "1px solid #e0e0e0",
                      bgcolor: "#f8f9fa",
                    }}
                  >
                    <Stack direction="row" alignItems="center" spacing={2}>
                      {/* Avatar icon giống bên ngoài */}
                      <Avatar
                        sx={{
                          width: 40,
                          height: 40,
                          background:
                            "linear-gradient(45deg, #ff9800, #ff5722)",
                        }}
                      >
                        <Assessment sx={{ fontSize: 24 }} />
                      </Avatar>
                      <Box>
                        <Typography
                          variant="h6"
                          sx={{ fontWeight: 700, color: "#ff5722" }}
                        >
                          Thống kê theo vị trí
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Chi tiết từng vị trí trong đơn vị
                        </Typography>
                      </Box>
                    </Stack>
                  </Box>

                  <TableContainer
                    component={Paper}
                    elevation={0}
                    sx={{
                      border: "none",
                      maxHeight: 300,
                    }}
                  >
                    <Table size="small" stickyHeader>
                      <TableHead>
                        {/* HEADER: CHIA RÕ 2 CỘT THỰC TẾ, KHÔNG MERGE */}
                        <TableRow sx={{ bgcolor: "#eeeeee" }}>
                          <TableCell
                            sx={{ fontWeight: "bold", bgcolor: "#eeeeee" }}
                          >
                            Vị trí
                          </TableCell>
                          <TableCell
                            align="center"
                            sx={{ fontWeight: "bold", bgcolor: "#eeeeee" }}
                          >
                            Trạng thái
                          </TableCell>
                          <TableCell
                            align="center"
                            sx={{
                              fontWeight: "bold",
                              bgcolor: "#eeeeee",
                              color: "#1565c0",
                            }}
                          >
                            Sổ sách (Trước kiểm)
                          </TableCell>

                          {/* Cột 1: Thực tế Cùng ĐV */}
                          <TableCell
                            align="center"
                            sx={{
                              fontWeight: "bold",
                              bgcolor: "#eeeeee",
                              color: "#2e7d32",
                            }}
                          >
                            Thực tế (Cùng ĐV)
                          </TableCell>

                          {/* Cột 2: Thực tế Khác ĐV */}
                          <TableCell
                            align="center"
                            sx={{
                              fontWeight: "bold",
                              bgcolor: "#eeeeee",
                              color: "#ed6c02",
                            }}
                          >
                            Thực tế (Khác ĐV)
                          </TableCell>

                          <TableCell
                            align="center"
                            sx={{
                              fontWeight: "bold",
                              bgcolor: "#eeeeee",
                              color: "#d32f2f",
                            }}
                          >
                            Chênh lệch
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(() => {
                          // 1. Lấy dữ liệu snapshot từ currentDepartment
                          let snapshots = {};
                          let scannedData = [];

                          try {
                            const parsed =
                              typeof currentDepartment.scanned_result ===
                              "string"
                                ? JSON.parse(currentDepartment.scanned_result)
                                : currentDepartment.scanned_result;

                            snapshots = parsed?.location_snapshots || {};
                            scannedData = Array.isArray(parsed)
                              ? parsed
                              : parsed?.locations || [];
                          } catch (e) {
                            console.error(e);
                          }

                          // 2. Tạo danh sách tất cả các vị trí
                          const allLocations =
                            departmentLocations.length > 0
                              ? departmentLocations
                              : Object.keys(snapshots).map((uuid) => ({
                                  uuid_location: uuid,
                                  name_location: "Đang tải...",
                                }));

                          // Các biến tổng
                          let grandTotalSystem = 0;
                          let grandTotalCorrect = 0;
                          let grandTotalMisDept = 0;
                          let grandTotalDiff = 0;
                          let totalCheckedCount = 0;

                          const rows = allLocations.map((loc) => {
                            const systemCount =
                              snapshots[loc.uuid_location] || 0;

                            // Tìm trong scannedData
                            const scannedLoc = scannedData.find(
                              (s) => s.location_uuid === loc.uuid_location
                            );

                            // Logic đếm số lượng Correct vs MisDept
                            let correctCount = 0;
                            let misDeptCount = 0;

                            if (scannedLoc && scannedLoc.scanned_machine) {
                              scannedLoc.scanned_machine.forEach((m) => {
                                if (m.misdepartment === "1") {
                                  misDeptCount++;
                                } else {
                                  correctCount++;
                                }
                              });
                            }

                            const totalActual = correctCount + misDeptCount;
                            const isScanned = !!scannedLoc;
                            const diff = systemCount - totalActual;

                            // Cập nhật tổng
                            grandTotalSystem += systemCount;
                            if (isScanned) {
                              grandTotalCorrect += correctCount;
                              grandTotalMisDept += misDeptCount;
                              totalCheckedCount++;
                            }
                            grandTotalDiff += diff;

                            return {
                              name: loc.name_location,
                              system: systemCount,
                              correct: correctCount,
                              misDept: misDeptCount,
                              diff: diff,
                              isScanned: isScanned,
                            };
                          });

                          return (
                            <>
                              {rows.map((row, idx) => (
                                <TableRow key={idx} hover>
                                  <TableCell
                                    sx={{ fontWeight: 600, color: "#333" }}
                                  >
                                    {row.name}
                                  </TableCell>

                                  <TableCell align="center">
                                    {row.isScanned ? (
                                      <Typography
                                        variant="caption"
                                        sx={{
                                          color: "#2e7d32",
                                          fontWeight: "bold",
                                        }}
                                      >
                                        Đã kiểm
                                      </Typography>
                                    ) : (
                                      <Typography
                                        variant="caption"
                                        sx={{
                                          color: "#ed6c02",
                                          fontWeight: "bold",
                                        }}
                                      >
                                        Chưa kiểm
                                      </Typography>
                                    )}
                                  </TableCell>

                                  <TableCell
                                    align="center"
                                    sx={{ color: "#1565c0", fontWeight: 600 }}
                                  >
                                    {new Intl.NumberFormat("en-US").format(
                                      row.system
                                    )}
                                  </TableCell>

                                  {/* CỘT CÙNG ĐV */}
                                  <TableCell
                                    align="center"
                                    sx={{ color: "#2e7d32", fontWeight: 600 }}
                                  >
                                    {row.isScanned
                                      ? new Intl.NumberFormat("en-US").format(
                                          row.correct
                                        )
                                      : "0"}
                                  </TableCell>

                                  {/* CỘT KHÁC ĐV */}
                                  <TableCell
                                    align="center"
                                    sx={{
                                      color: "#ed6c02",
                                      fontWeight: 600,
                                    }}
                                  >
                                    {row.isScanned
                                      ? new Intl.NumberFormat("en-US").format(
                                          row.misDept
                                        )
                                      : "0"}
                                  </TableCell>

                                  <TableCell
                                    align="center"
                                    sx={{
                                      fontWeight: 600,
                                      color: "#d32f2f",
                                    }}
                                  >
                                    {row.isScanned
                                      ? new Intl.NumberFormat("en-US").format(
                                          row.diff
                                        )
                                      : `${new Intl.NumberFormat(
                                          "en-US"
                                        ).format(row.system)}`}
                                  </TableCell>
                                </TableRow>
                              ))}

                              {/* HÀNG TỔNG CỘNG */}
                              <TableRow
                                sx={{
                                  bgcolor: "#e3f2fd",
                                  borderTop: "2px solid #90caf9",
                                }}
                              >
                                <TableCell
                                  sx={{
                                    fontWeight: "bold",
                                    textTransform: "uppercase",
                                  }}
                                >
                                  TỔNG CỘNG
                                </TableCell>
                                <TableCell
                                  align="center"
                                  sx={{ fontWeight: "bold" }}
                                >
                                  {totalCheckedCount}/{rows.length}
                                </TableCell>
                                <TableCell
                                  align="center"
                                  sx={{
                                    fontWeight: "bold",
                                    color: "#1565c0",
                                    fontSize: "1rem",
                                  }}
                                >
                                  {new Intl.NumberFormat("en-US").format(
                                    grandTotalSystem
                                  )}
                                </TableCell>
                                <TableCell
                                  align="center"
                                  sx={{
                                    fontWeight: "bold",
                                    color: "#2e7d32",
                                    fontSize: "1rem",
                                  }}
                                >
                                  {new Intl.NumberFormat("en-US").format(
                                    grandTotalCorrect
                                  )}
                                </TableCell>
                                <TableCell
                                  align="center"
                                  sx={{
                                    fontWeight: "bold",
                                    color: "#ed6c02",
                                    fontSize: "1rem",
                                  }}
                                >
                                  {new Intl.NumberFormat("en-US").format(
                                    grandTotalMisDept
                                  )}
                                </TableCell>
                                <TableCell
                                  align="center"
                                  sx={{
                                    fontWeight: "bold",
                                    color: "#d32f2f",
                                    fontSize: "1rem",
                                  }}
                                >
                                  {new Intl.NumberFormat("en-US").format(
                                    grandTotalDiff
                                  )}
                                </TableCell>
                              </TableRow>
                            </>
                          );
                        })()}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Card>
              )}

              {/* Danh sách các vị trí ĐÃ LƯU trong Đơn vị này */}
              {(() => {
                // 1. Lấy Snapshot Map để biết số lượng sổ sách của từng vị trí
                let locationSnapshots = {};
                try {
                  if (currentDepartment?.scanned_result) {
                    const parsed =
                      typeof currentDepartment.scanned_result === "string"
                        ? JSON.parse(currentDepartment.scanned_result)
                        : currentDepartment.scanned_result;
                    locationSnapshots = parsed?.location_snapshots || {};
                  }
                } catch (e) {
                  console.error(e);
                }

                // 2. Lọc ra các vị trí có máy đã quét
                const locationsWithMachines = scannedLocationsList.filter(
                  (loc) => loc.scanned_machine && loc.scanned_machine.length > 0
                );

                const totalMachines = locationsWithMachines.reduce(
                  (total, loc) => total + (loc.scanned_machine?.length || 0),
                  0
                );

                return (
                  <>
                    <Divider sx={{ my: 3 }} />
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      sx={{ mb: 2 }}
                    >
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        Các vị trí đã kiểm ({locationsWithMachines.length} vị
                        trí - {totalMachines} máy)
                      </Typography>
                    </Stack>

                    {locationsWithMachines.length === 0 ? (
                      <Alert severity="info" sx={{ borderRadius: "12px" }}>
                        Chưa có vị trí nào được kiểm kê trong đơn vị này.
                      </Alert>
                    ) : (
                      <Box>
                        {locationsWithMachines.map((loc, idx) => {
                          // Lấy snapshot count cho vị trí này
                          const snapshotCount =
                            locationSnapshots[loc.location_uuid] || 0;

                          return (
                            <InventoryLocationItem
                              key={idx}
                              location={loc}
                              snapshotCount={snapshotCount}
                              canEdit={
                                selectedTicket?.status === "draft" &&
                                canEditInventoryDepartment(currentDepartment)
                              }
                              onRemoveMachine={handleRemoveSavedMachine}
                            />
                          );
                        })}
                      </Box>
                    )}
                  </>
                );
              })()}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button
              onClick={handleCloseInventoryScan}
              variant="outlined"
              sx={{ borderRadius: "12px", px: 3 }}
            >
              Đóng
            </Button>
          </DialogActions>
        </Dialog>

        {/* Add Department to Inventory Dialog */}
        <Dialog
          open={formData.showAddDepartmentDialog || false}
          onClose={() =>
            setFormData((prev) => ({
              ...prev,
              showAddDepartmentDialog: false,
              selectedNewDepartments: [],
              availableDepartments: [],
            }))
          }
          maxWidth="sm"
          fullWidth
          PaperProps={{ sx: { borderRadius: "20px" } }}
        >
          <DialogTitle
            sx={{
              background: "linear-gradient(45deg, #ff9800, #ff5722)",
              color: "white",
              fontWeight: 700,
            }}
          >
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
            >
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Thêm đơn vị vào phiếu kiểm kê
              </Typography>
              <IconButton
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    showAddDepartmentDialog: false,
                    selectedNewDepartments: [],
                    availableDepartments: [],
                  }))
                }
                sx={{ color: "white" }}
              >
                <Close />
              </IconButton>
            </Stack>
          </DialogTitle>
          <DialogContent sx={{ mt: 3 }}>
            <Stack spacing={2}>
              <Alert severity="info" sx={{ borderRadius: "12px" }}>
                Chọn các đơn vị bạn muốn thêm vào phiếu kiểm kê này.
              </Alert>
              <Stack
                direction="row"
                spacing={1}
                sx={{ mb: 1 }}
                alignItems="center"
              >
                <Button
                  size="small"
                  variant="contained"
                  onClick={() => {
                    setFormData((prev) => ({
                      ...prev,
                      selectedNewDepartments: (
                        prev.availableDepartments || []
                      ).map((d) => d.uuid_department),
                    }));
                  }}
                  sx={{
                    borderRadius: "8px",
                    textTransform: "none",
                  }}
                >
                  Chọn tất cả
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  onClick={() => {
                    setFormData((prev) => ({
                      ...prev,
                      selectedNewDepartments: [],
                    }));
                  }}
                  sx={{
                    borderRadius: "8px",
                    textTransform: "none",
                  }}
                >
                  Bỏ chọn tất cả
                </Button>
              </Stack>
              <Autocomplete
                multiple
                fullWidth
                options={formData.availableDepartments || []}
                getOptionLabel={(option) => option.name_department || ""}
                onChange={(event, newValue) => {
                  setFormData((prev) => ({
                    ...prev,
                    selectedNewDepartments: newValue.map(
                      (d) => d.uuid_department
                    ),
                  }));
                }}
                value={
                  (formData.availableDepartments || []).filter((dept) =>
                    (formData.selectedNewDepartments || []).includes(
                      dept.uuid_department
                    )
                  ) || []
                }
                loading={departmentLoading}
                disableCloseOnSelect
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Chọn đơn vị"
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: "12px",
                      },
                    }}
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {departmentLoading ? (
                            <CircularProgress color="inherit" size={20} />
                          ) : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 3, gap: 2 }}>
            <Button
              variant="outlined"
              onClick={() =>
                setFormData((prev) => ({
                  ...prev,
                  showAddDepartmentDialog: false,
                  selectedNewDepartments: [],
                  availableDepartments: [],
                }))
              }
              sx={{ borderRadius: "12px" }}
            >
              Hủy
            </Button>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={handleAddDepartmentsToInventory}
              disabled={
                loading ||
                !formData.selectedNewDepartments ||
                formData.selectedNewDepartments.length === 0
              }
              sx={{
                borderRadius: "12px",
                background: "linear-gradient(45deg, #ff9800, #ff5722)",
              }}
            >
              {loading ? <CircularProgress size={24} /> : "Thêm đơn vị"}
            </Button>
          </DialogActions>
        </Dialog>

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
            onClick={handleCloseNotification}
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
