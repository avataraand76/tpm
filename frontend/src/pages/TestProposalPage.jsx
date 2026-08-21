// frontend/src/pages/TestProposalPage.jsx

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
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
  Popover,
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
  Switch,
  FormControlLabel,
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
  Route,
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
  ArrowForward,
  ArrowBack,
  SwapHoriz,
} from "@mui/icons-material";
import * as XLSX from "xlsx-js-style";
import ExcelJS from "exceljs";
import NavigationBar from "../components/NavigationBar";
import { api } from "../api/api";
import MachineQRScanner from "../components/MachineQRScanner";
import FileUploadComponent from "../components/FileUploadComponent";
import RfidDialog from "../components/rfidScanner/RfidDialog";
import { mergeMachinesByRfid } from "../components/rfidScanner/rfidMachineUtils";
import { RFID_LOOKUP_LENGTH } from "../components/rfidScanner/rfidCodeUtils";
import { rfidMonoInputSx } from "../components/rfidScanner/rfidDialogTheme";
import { useAuth } from "../hooks/useAuth";

const getInventorySnapshotLocationCount = (scannedResult) => {
  if (!scannedResult || Array.isArray(scannedResult)) return 0;

  const snapshots = scannedResult.location_snapshots;
  if (!snapshots || typeof snapshots !== "object") return 0;

  return Object.values(snapshots).filter((count) => Number(count) > 0).length;
};

// Component con để hiển thị từng vị trí kiểm kê (Accordion + Filter)
const InventoryLocationItem = ({ location, snapshotCount }) => {
  const [filter, setFilter] = useState("all"); // 'all', 'same', 'diff', 'wrong_location', 'wrong_same', 'wrong_diff'

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

  // 3. Thống kê máy sai vị trí
  const wrongLocationMachines = allMachines.filter(
    (m) => m.mislocation === "1"
  );
  const wrongLocationSameDept = wrongLocationMachines.filter(
    (m) => m.misdepartment !== "1"
  );
  const wrongLocationDiffDept = wrongLocationMachines.filter(
    (m) => m.misdepartment === "1"
  );
  const countWrongLocation = wrongLocationMachines.length;
  const countWrongLocationSameDept = wrongLocationSameDept.length;
  const countWrongLocationDiffDept = wrongLocationDiffDept.length;

  // 4. Lọc danh sách hiển thị
  const displayedMachines =
    filter === "all"
      ? allMachines
      : filter === "same"
        ? sameDeptMachines
        : filter === "diff"
          ? diffDeptMachines
          : filter === "wrong_location"
            ? wrongLocationMachines
            : filter === "wrong_same"
              ? wrongLocationSameDept
              : filter === "wrong_diff"
                ? wrongLocationDiffDept
                : allMachines;

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

            {/* Thống kê máy sai vị trí */}
            {countWrongLocation > 0 && (
              <>
                <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
                <Tooltip title="Tổng số máy sai vị trí">
                  <Chip
                    label={`Sai vị trí: ${countWrongLocation}`}
                    size="small"
                    sx={{
                      bgcolor: "#fce4ec",
                      color: "#c2185b",
                      fontWeight: 700,
                      border: "2px solid #f48fb1",
                    }}
                  />
                </Tooltip>

                {countWrongLocationSameDept > 0 && (
                  <Tooltip title="Máy sai vị trí (Cùng đơn vị)">
                    <Chip
                      label={`Cùng ĐV: ${countWrongLocationSameDept}`}
                      size="small"
                      sx={{
                        bgcolor: "#fff9c4",
                        color: "#f57f17",
                        fontWeight: 600,
                        border: "1px solid #fff59d",
                      }}
                    />
                  </Tooltip>
                )}

                {countWrongLocationDiffDept > 0 && (
                  <Tooltip title="Máy sai vị trí (Khác đơn vị)">
                    <Chip
                      label={`Khác ĐV: ${countWrongLocationDiffDept}`}
                      size="small"
                      sx={{
                        bgcolor: "#ffccbc",
                        color: "#bf360c",
                        fontWeight: 600,
                        border: "1px solid #ff8a65",
                      }}
                    />
                  </Tooltip>
                )}
              </>
            )}
          </Stack>
        </Stack>
      </AccordionSummary>

      <AccordionDetails sx={{ bgcolor: "#fafafa", p: 2 }}>
        {/* Bộ lọc */}
        <Stack spacing={1} sx={{ mb: 2 }}>
          {/* Dòng 1: Lọc theo đơn vị */}
          <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
            <Button
              size="small"
              variant={filter === "all" ? "contained" : "outlined"}
              onClick={() => setFilter("all")}
              sx={{
                borderRadius: "8px",
                textTransform: "none",
                borderColor: filter === "all" ? "#1976d2" : "#e0e0e0",
                bgcolor: filter === "all" ? "#1976d2" : "transparent",
                color: filter === "all" ? "#fff" : "#666",
                "&:hover": {
                  bgcolor: filter === "all" ? "#1565c0" : "rgba(0, 0, 0, 0.04)",
                  borderColor: filter === "all" ? "#1565c0" : "#bdbdbd",
                },
              }}
            >
              Tất cả ({countActualTotal})
            </Button>
            <Button
              size="small"
              variant={filter === "same" ? "contained" : "outlined"}
              onClick={() => setFilter("same")}
              sx={{
                borderRadius: "8px",
                textTransform: "none",
                borderColor: filter === "same" ? "#2e7d32" : "#c8e6c9",
                bgcolor: filter === "same" ? "#2e7d32" : "transparent",
                color: filter === "same" ? "#fff" : "#2e7d32",
                "&:hover": {
                  bgcolor:
                    filter === "same" ? "#1b5e20" : "rgba(46, 125, 50, 0.08)",
                  borderColor: filter === "same" ? "#1b5e20" : "#2e7d32",
                },
              }}
            >
              Cùng ĐV ({countSame})
            </Button>
            <Button
              size="small"
              variant={filter === "diff" ? "contained" : "outlined"}
              onClick={() => setFilter("diff")}
              sx={{
                borderRadius: "8px",
                textTransform: "none",
                borderColor: filter === "diff" ? "#ed6c02" : "#ffe0b2",
                bgcolor: filter === "diff" ? "#ed6c02" : "transparent",
                color: filter === "diff" ? "#fff" : "#ed6c02",
                "&:hover": {
                  bgcolor:
                    filter === "diff" ? "#e65100" : "rgba(237, 108, 2, 0.08)",
                  borderColor: filter === "diff" ? "#e65100" : "#ed6c02",
                },
              }}
            >
              Khác ĐV ({countDiff})
            </Button>
          </Stack>

          {/* Dòng 2: Lọc máy sai vị trí */}
          {countWrongLocation > 0 && (
            <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
              <Button
                size="small"
                variant={filter === "wrong_location" ? "contained" : "outlined"}
                onClick={() => setFilter("wrong_location")}
                sx={{
                  borderRadius: "8px",
                  textTransform: "none",
                  borderColor:
                    filter === "wrong_location" ? "#c2185b" : "#f48fb1",
                  bgcolor:
                    filter === "wrong_location" ? "#c2185b" : "transparent",
                  color: filter === "wrong_location" ? "#fff" : "#c2185b",
                  fontWeight: 700,
                  "&:hover": {
                    bgcolor:
                      filter === "wrong_location"
                        ? "#880e4f"
                        : "rgba(194, 24, 91, 0.08)",
                    borderColor:
                      filter === "wrong_location" ? "#880e4f" : "#c2185b",
                  },
                }}
              >
                Sai vị trí ({countWrongLocation})
              </Button>
              {countWrongLocationSameDept > 0 && (
                <Button
                  size="small"
                  variant={filter === "wrong_same" ? "contained" : "outlined"}
                  sx={{
                    borderRadius: "8px",
                    textTransform: "none",
                    borderColor:
                      filter === "wrong_same" ? "#f57f17" : "#fff59d",
                    color: filter === "wrong_same" ? "#fff" : "#f57f17",
                    bgcolor:
                      filter === "wrong_same" ? "#f57f17" : "transparent",
                    "&:hover": {
                      bgcolor:
                        filter === "wrong_same"
                          ? "#e65100"
                          : "rgba(245, 127, 23, 0.08)",
                      borderColor:
                        filter === "wrong_same" ? "#e65100" : "#f57f17",
                    },
                  }}
                  onClick={() => setFilter("wrong_same")}
                >
                  Sai VT - Cùng ĐV ({countWrongLocationSameDept})
                </Button>
              )}
              {countWrongLocationDiffDept > 0 && (
                <Button
                  size="small"
                  variant={filter === "wrong_diff" ? "contained" : "outlined"}
                  sx={{
                    borderRadius: "8px",
                    textTransform: "none",
                    borderColor:
                      filter === "wrong_diff" ? "#bf360c" : "#ff8a65",
                    color: filter === "wrong_diff" ? "#fff" : "#bf360c",
                    bgcolor:
                      filter === "wrong_diff" ? "#bf360c" : "transparent",
                    "&:hover": {
                      bgcolor:
                        filter === "wrong_diff"
                          ? "#870000"
                          : "rgba(191, 54, 12, 0.08)",
                      borderColor:
                        filter === "wrong_diff" ? "#870000" : "#bf360c",
                    },
                  }}
                  onClick={() => setFilter("wrong_diff")}
                >
                  Sai VT - Khác ĐV ({countWrongLocationDiffDept})
                </Button>
              )}
            </Stack>
          )}
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
  "Công suất (W)": "power",
  "Áp suất (MPa)": "pressure",
  "Điện áp (V)": "voltage",
  "Lưu lượng khí nén (lít/phút)": "air_volume",
  "Ghi chú": "note",
};
// Lấy danh sách các cột bắt buộc (sẽ dùng để tô màu)
const requiredHeaders = ["Serial", "Loại máy"];
// Cho phép nhập số thập phân cho các thông số kỹ thuật
// (chỉ giữ chữ số và duy nhất 1 dấu thập phân, chấp nhận cả "," lẫn ".")
const sanitizeDecimalInput = (value) => {
  const cleaned = String(value ?? "")
    .replace(/,/g, ".")
    .replace(/[^0-9.]/g, "");
  const firstDot = cleaned.indexOf(".");
  if (firstDot === -1) return cleaned;
  return (
    cleaned.slice(0, firstDot + 1) +
    cleaned.slice(firstDot + 1).replace(/\./g, "")
  );
};

// Chuyển giá trị thông số kỹ thuật từ Excel/ô nhập -> số thực (double)
const parseDecimalValue = (value) => {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return isNaN(value) ? null : value;
  const cleaned = sanitizeDecimalInput(value);
  if (cleaned === "" || cleaned === ".") return null;
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
};


const TestProposalPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { user, permissions } = useAuth();
  const isAdmin = permissions.includes("admin");
  const canEdit = permissions.includes("edit");

  const phongCoDienId = 14;
  const coDienXuongIds = [10, 30, 24, 31];
  const baoVeId = 11;

  const isPhongCoDien =
    canEdit && !isAdmin && user?.phongban_id === phongCoDienId;
  const isCoDienXuong =
    canEdit && !isAdmin && coDienXuongIds.includes(user?.phongban_id);
  const isBaoVe = canEdit && !isAdmin && Number(user?.phongban_id) === baoVeId;
  const isViewOnly = permissions.includes("view") && !isAdmin && !canEdit;
  const hasImportExportTabs = isAdmin || isPhongCoDien || isViewOnly || isBaoVe;
  const canCreateOrImportMachines = isAdmin || isPhongCoDien;

  // Phân quyền cho Kiểm kê
  const canViewInventoryTab =
    isAdmin || isPhongCoDien || isCoDienXuong || isViewOnly;
  const canCreateInventory = isAdmin || isPhongCoDien;

  // Tab state (bảo vệ mặc định ở Phiếu nhập nhưng vẫn xem được Phiếu xuất)
  const [activeTab, setActiveTab] = useState(
    isBaoVe ? 0 : isCoDienXuong ? 2 : 0
  ); // 0: Import, 1: Export, 2: Internal, 3: Inventory

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

  const getDefaultRecurringMissWeekRange = () => {
    const now = new Date();
    const day = now.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);
    const saturday = new Date(monday);
    saturday.setDate(monday.getDate() + 5);
    const toInput = (d) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${dd}`;
    };
    return { from: toInput(monday), to: toInput(saturday) };
  };

  const defaultRecurringMissWeek = getDefaultRecurringMissWeekRange();
  const [recurringMissFrom, setRecurringMissFrom] = useState(
    defaultRecurringMissWeek.from
  );
  const [recurringMissTo, setRecurringMissTo] = useState(
    defaultRecurringMissWeek.to
  );
  const [recurringMissedMachines, setRecurringMissedMachines] = useState([]);
  const [recurringMissLoading, setRecurringMissLoading] = useState(false);
  const [recurringMissMeta, setRecurringMissMeta] = useState(null);
  const [recurringMissExpanded, setRecurringMissExpanded] = useState(false);
  const [onlyCurrentMissed, setOnlyCurrentMissed] = useState(true);
  const [openRecurringMissRfidDialog, setOpenRecurringMissRfidDialog] =
    useState(false);
  const [rfidReplacePopover, setRfidReplacePopover] = useState(null);
  const [directRfidReplaceMachine, setDirectRfidReplaceMachine] =
    useState(null);
  const [directRfidError, setDirectRfidError] = useState("");
  const [directRfidSaving, setDirectRfidSaving] = useState(false);
  const directRfidInputRef = useRef(null);

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
  const [confirmingExportGate, setConfirmingExportGate] = useState(false);

  // Helper function to format date without timezone issues
  const formatDateTicket = (dateString) => {
    if (!dateString) return "";
    // Nếu dateString đã ở dạng YYYY-MM-DD, trả về luôn
    if (
      typeof dateString === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(dateString)
    ) {
      return dateString;
    }
    // Nếu có timestamp hoặc format khác, parse và format lại
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Form states (for create/view dialog)
  const [formData, setFormData] = useState({
    to_location_uuid: "",
    type: "",
    date: new Date().toISOString().split("T")[0],
    note: "",
    quantity: "",
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
  const [duplicateMachineChoices, setDuplicateMachineChoices] = useState({}); // { uuid_machine: 'current' | 'previous' }
  const [collapsedGroups, setCollapsedGroups] = useState({}); // { groupTitle: true/false }
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
  const [openMissingMachinesDialog, setOpenMissingMachinesDialog] =
    useState(false);
  const [missingMachines, setMissingMachines] = useState([]);
  const [missingMachinesLocation, setMissingMachinesLocation] = useState(null);
  const [confirmingMissingAll, setConfirmingMissingAll] = useState(false);
  // Locations cho toàn bộ phiếu kiểm kê (dùng khi dò tìm RFID nhiều đơn vị)
  const [inventoryAllLocations, setInventoryAllLocations] = useState([]);

  // Batch scan picker: chọn đơn vị + vị trí trước khi mở scan dialog
  const [openBatchScanPicker, setOpenBatchScanPicker] = useState(false);
  const [batchPickerStep, setBatchPickerStep] = useState(1); // 1: chọn đơn vị, 2: chọn vị trí
  const [batchPickerDept, setBatchPickerDept] = useState(null);
  const [batchPickerLocations, setBatchPickerLocations] = useState([]);
  const [batchPickerLocation, setBatchPickerLocation] = useState(null);
  const [batchPickerLoading, setBatchPickerLoading] = useState(false);
  // Cache toàn bộ missing machines của phiếu cho batch scan (tách riêng, không ghi đè missingMachines UI)
  const [batchScanAllMissing, setBatchScanAllMissing] = useState([]);
  // UUID vị trí đã chọn sẵn cho chế độ batch scan (truyền vào RfidSearch)
  const [batchScanPreSelectedLocation, setBatchScanPreSelectedLocation] =
    useState(null);

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
  };

  // Helper functions
  const getStatusInfo = (statusKey) =>
    STATUS_CONFIG[statusKey] || {
      bg: "#9e9e9e22",
      color: "#9e9e9e",
      label: statusKey,
    };

  const areAllMissingMachinesConfirmed = useCallback(() => {
    const details = formData.inventoryDetails || [];
    if (!Array.isArray(details) || details.length === 0) return true;

    // Build global scanned UUIDs across all departments (exclude NOT_FOUND)
    const globalScannedUuids = new Set();
    details.forEach((dept) => {
      try {
        const parsed =
          typeof dept?.scanned_result === "string"
            ? JSON.parse(dept.scanned_result)
            : dept?.scanned_result;
        const locations = Array.isArray(parsed)
          ? parsed
          : parsed?.locations || [];
        locations.forEach((loc) => {
          (loc?.scanned_machine || []).forEach((m) => {
            const u = m?.uuid || m?.uuid_machine;
            if (u && !String(u).startsWith("NOT_FOUND")) {
              globalScannedUuids.add(u);
            }
          });
        });
      } catch {
        // ignore parse errors
      }
    });

    // For every machine in list_before_scan that is still missing (not scanned anywhere),
    // require it to be confirmed not found.
    for (const dept of details) {
      let listBeforeScan = [];
      try {
        listBeforeScan =
          typeof dept?.list_before_scan === "string"
            ? JSON.parse(dept.list_before_scan)
            : dept?.list_before_scan || [];
      } catch {
        listBeforeScan = [];
      }

      if (!Array.isArray(listBeforeScan)) continue;

      for (const loc of listBeforeScan) {
        const machines = Array.isArray(loc?.machines) ? loc.machines : [];
        for (const m of machines) {
          const uuid = m?.uuid_machine;
          if (!uuid) continue;
          if (String(uuid).startsWith("NOT_FOUND")) continue;

          const isMissing = !globalScannedUuids.has(uuid);
          if (isMissing && !m?.not_found_confirmed) {
            return false;
          }
        }
      }
    }

    return true;
  }, [formData.inventoryDetails]);
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
          params.to_department_uuid = locationFilter;
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

  const fetchRecurringMissedStats = useCallback(async () => {
    if (!recurringMissFrom || !recurringMissTo) return;
    setRecurringMissLoading(true);
    try {
      const response = await api.inventory.getRecurringMissed({
        date_from: recurringMissFrom,
        date_to: recurringMissTo,
        min_streak: 3,
        only_current_missed: onlyCurrentMissed,
      });
      setRecurringMissedMachines(response.data || []);
      setRecurringMissMeta(response.meta || null);
    } catch (error) {
      console.error("Error fetching recurring missed machines:", error);
      setRecurringMissedMachines([]);
      setRecurringMissMeta(null);
      showNotification(
        "error",
        "Lỗi",
        error.response?.data?.message ||
          "Không thể tải thống kê máy quét sót liên tiếp"
      );
    } finally {
      setRecurringMissLoading(false);
    }
  }, [recurringMissFrom, recurringMissTo, onlyCurrentMissed, showNotification]);

  const recurringMissRfidReplaceTargets = useMemo(
    () =>
      recurringMissedMachines.filter(
        (m) =>
          m.RFID_machine &&
          String(m.RFID_machine).trim() !== "" &&
          m.serial_machine &&
          String(m.serial_machine).trim() !== ""
      ),
    [recurringMissedMachines]
  );

  const handleRecurringMissRfidReplace = async (
    target,
    newRfid,
    machineRecord
  ) => {
    const machine =
      machineRecord ||
      recurringMissedMachines.find(
        (m) =>
          m.RFID_machine &&
          m.RFID_machine.toUpperCase() === target.targetRfid.toUpperCase()
      );

    if (!machine?.serial_machine) {
      throw new Error("Không tìm thấy serial máy để cập nhật RFID.");
    }

    const result = await api.machines.batchUpdateRfid({
      updates: [{ serial: machine.serial_machine.trim(), rfid: newRfid }],
    });

    const successCount = result?.data?.successCount ?? 0;
    if (!result?.success || successCount < 1) {
      const detail =
        result?.data?.errors?.join("; ") ||
        result?.message ||
        "Không thể cập nhật RFID mới.";
      throw new Error(detail);
    }

    const wasReplaced = machine.rfid_replaced;

    setRecurringMissedMachines((prev) =>
      prev.map((m) =>
        m.uuid_machine === machine.uuid_machine
          ? {
              ...m,
              RFID_machine_current: newRfid,
              rfid_replaced: true,
            }
          : m
      )
    );

    if (!wasReplaced) {
      setRecurringMissMeta((prev) =>
        prev
          ? {
              ...prev,
              rfid_replaced_count: (prev.rfid_replaced_count || 0) + 1,
            }
          : prev
      );
    }

    showNotification(
      "success",
      "Đã cập nhật RFID",
      `${machine.serial_machine}: thẻ cũ ${target.targetRfid} → ${newRfid}`
    );
  };

  const handleOpenDirectRfidReplace = (machine) => {
    if (!machine?.serial_machine) {
      showNotification(
        "warning",
        "Thiếu serial",
        "Máy này không có serial nên không thể cập nhật RFID."
      );
      return;
    }
    setDirectRfidReplaceMachine(machine);
    setDirectRfidError("");
    setRfidReplacePopover(null);
    setTimeout(() => {
      if (directRfidInputRef.current) {
        directRfidInputRef.current.value = "";
        directRfidInputRef.current.focus();
      }
    }, 150);
  };

  const handleCloseDirectRfidReplace = () => {
    if (directRfidSaving) return;
    setDirectRfidReplaceMachine(null);
    setDirectRfidError("");
    if (directRfidInputRef.current) {
      directRfidInputRef.current.value = "";
    }
  };

  const handleConfirmDirectRfidReplace = async () => {
    const newRfid = (directRfidInputRef.current?.value || "")
      .trim()
      .toUpperCase();
    const machine = directRfidReplaceMachine;
    if (!machine || !newRfid) return;

    const oldRfid = String(machine.RFID_machine || "")
      .trim()
      .toUpperCase();
    if (oldRfid && newRfid === oldRfid) {
      setDirectRfidError("RFID mới phải khác RFID trên phiếu kiểm kê.");
      return;
    }

    setDirectRfidSaving(true);
    setDirectRfidError("");
    try {
      await handleRecurringMissRfidReplace(
        {
          targetRfid: oldRfid,
          machineRecord: machine,
          info: {
            serial: machine.serial_machine,
            name: `${machine.type_machine || ""} ${
              machine.attribute_machine || ""
            } - ${machine.model_machine || ""}`.trim(),
          },
        },
        newRfid,
        machine
      );
      setDirectRfidReplaceMachine(null);
      setDirectRfidError("");
      if (directRfidInputRef.current) {
        directRfidInputRef.current.value = "";
      }
    } catch (error) {
      setDirectRfidError(
        error?.response?.data?.message ||
          error?.message ||
          "Không thể cập nhật RFID mới."
      );
    } finally {
      setDirectRfidSaving(false);
    }
  };

  useEffect(() => {
    if (activeTab !== 3) {
      setRfidReplacePopover(null);
      setDirectRfidReplaceMachine(null);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchStatistics();
  }, [fetchStatistics]);

  // Bảo vệ chỉ được ở tab Phiếu nhập/xuất
  useEffect(() => {
    if (isBaoVe && activeTab > 1) setActiveTab(0); // tránh nội bộ/kiểm kê
  }, [isBaoVe, activeTab]);

  useEffect(() => {
    fetchExternalLocations();
  }, [fetchExternalLocations, showNotification]);

  // Fetch all main departments for filter when on transfer tab
  useEffect(() => {
    const fetchAllDepartmentsForFilter = async () => {
      if (activeTab === 2) {
        try {
          const response = await api.departments.getAll();
          const internalDepartments = (response.data || []).filter(
            (dept) =>
              dept.type !== "external" &&
              dept.name_department !== "Đơn vị bên ngoài"
          );
          setAllLocationsForFilter(internalDepartments);
        } catch (error) {
          console.error("Error fetching departments for filter:", error);
          setAllLocationsForFilter([]);
        }
      } else {
        setAllLocationsForFilter([]);
      }
    };
    fetchAllDepartmentsForFilter();
  }, [activeTab]);

  useEffect(() => {
    setScannerApiParams(getMachineFiltersForDialog());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openDialog, dialogType, formData.type, isCoDienXuong]);

  // Set scanner params for inventory dialog
  useEffect(() => {
    if (openInventoryScanDialog && selectedTicket?.uuid_inventory_check) {
      setScannerApiParams({
        ticket_type: "inventory",
        inventory_uuid: selectedTicket.uuid_inventory_check,
      });
    }
  }, [openInventoryScanDialog, selectedTicket]);

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

  const handleConfirmExportGate = async () => {
    if (!selectedTicket?.uuid_machine_export) return;
    if (confirmingExportGate) return;

    setConfirmingExportGate(true);
    try {
      await api.exports.confirm(selectedTicket.uuid_machine_export);

      // Cập nhật trạng thái confirm ngay để ẩn nút
      setSelectedTicket((prev) => (prev ? { ...prev, confirm: 1 } : prev));

      // Refresh danh sách bên ngoài sau khi xác nhận
      if (activeTab === 1) {
        await fetchData();
        await fetchStatistics();
      }

      showNotification("success", "Thành công", "Đã xác nhận ra cổng");
    } catch (error) {
      console.error("Error confirming export gate:", error);
      showNotification(
        "error",
        "Thao tác thất bại",
        error.response?.data?.message || "Lỗi khi xác nhận ra cổng"
      );
    } finally {
      setConfirmingExportGate(false);
      handleCloseDialog();
    }
  };

  const handleOpenDialog = async (mode, type, ticket = null) => {
    // Bảo vệ không được phép tạo phiếu xuất
    if (isBaoVe && mode === "create" && type === "export") {
      showNotification(
        "error",
        "Không đủ quyền",
        "Bảo vệ không thể tạo phiếu xuất."
      );
      return;
    }
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
      quantity: "",
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
          date: formatDateTicket(ticketDetails.check_date),
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

        // Nếu phiếu là draft và user là admin/cơ điện, chuyển sang mode edit
        if (
          ticketDetails.status === "draft" &&
          type === "import" &&
          (isAdmin || isPhongCoDien)
        ) {
          setDialogMode("edit");
        }

        const ticketType =
          ticketDetails.import_type || ticketDetails.export_type || "internal";
        let filter =
          type === "internal"
            ? "internal"
            : getLocationFilterForType(ticketType);

        // Nếu là phiếu draft import và chưa có type, load tất cả locations
        if (
          ticketDetails.status === "draft" &&
          type === "import" &&
          !ticketType
        ) {
          await fetchLocations();
        } else {
          await fetchLocations(filter);
        }

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
          date: formatDateTicket(ticketDate),
          note: ticketDetails.note || "",
          quantity:
            ticketDetails.quantity ??
            (Array.isArray(response.data.details)
              ? response.data.details.length
              : ""),
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
      quantity: "",
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
    const limitNum = Number(formData.quantity);
    const hasQuantityLimit =
      dialogType === "import" &&
      dialogMode === "edit" &&
      selectedTicket?.status === "draft" &&
      Number.isFinite(limitNum) &&
      limitNum > 0;
    if (hasQuantityLimit && formData.machines.length >= limitNum) {
      showNotification(
        "warning",
        "Đã đủ số lượng máy",
        `Phiếu này yêu cầu đúng ${limitNum} máy. Vui lòng xóa bớt máy trước khi thêm.`
      );
      return;
    }
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
  const handleAddMachinesFromRfid = async (machinesToAdd) => {
    if (openInventoryScanDialog) {
      try {
        setLoading(true);

        const response = await api.inventory.getById(
          selectedTicket.uuid_inventory_check
        );
        const ticketDetails = response.data.inventory;
        setSelectedTicket(ticketDetails);
        setFormData((prev) => ({
          ...prev,
          inventoryDetails: response.data.details || [],
        }));

        // Update lại currentDepartment và scannedLocationsList
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

        // SAU KHI REFRESH, BẮT ĐẦU KIỂM TRA TRÙNG
        const validMachines = [];
        const duplicatesInCurrent = [];
        const duplicatesInCurrentDept = [];
        const duplicatesInOtherDept = [];

        // Sử dụng updatedScannedList thay vì scannedLocationsList cũ
        const latestScannedLocations = updatedDept?.scanned_result
          ? Array.isArray(updatedDept.scanned_result)
            ? updatedDept.scanned_result
            : updatedDept.scanned_result?.locations || []
          : [];

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

          // 2. Kiểm tra trùng ở chuyền khác trong ĐƠN VỊ HIỆN TẠI (dùng data vừa refresh)
          const foundInOther = latestScannedLocations.find((loc) =>
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
                loc.scanned_machine?.some(
                  (m) => m.uuid === machine.uuid_machine
                )
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
            `${duplicatesInCurrentDept.length} máy: ${details}. Hãy chọn checkbox để quyết định lưu vào chuyền nào.`
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
      } catch (error) {
        console.error("Error refreshing before check:", error);
        showNotification(
          "error",
          "Lỗi",
          "Không thể làm mới dữ liệu. Vui lòng thử lại."
        );
      } finally {
        setLoading(false);
      }
    } else {
      const limitNum = Number(formData.quantity);
      const hasQuantityLimit =
        dialogType === "import" &&
        dialogMode === "edit" &&
        selectedTicket?.status === "draft" &&
        Number.isFinite(limitNum) &&
        limitNum > 0;
      setFormData((prev) => {
        if (hasQuantityLimit) {
          const remaining = limitNum - prev.machines.length;
          if (remaining <= 0) {
            showNotification(
              "warning",
              "Đã đủ số lượng máy",
              `Phiếu này yêu cầu đúng ${limitNum} máy. Vui lòng xóa bớt máy trước khi thêm.`
            );
            return prev;
          }
          if (machinesToAdd.length > remaining) {
            showNotification(
              "warning",
              "Vượt quá số lượng",
              `Chỉ có thể thêm tối đa ${remaining} máy nữa (tổng đúng ${limitNum}).`
            );
          }
        }
        const newMachinesWithNote = machinesToAdd.map((m) => ({
          ...m,
          note: "",
        }));
        return {
          ...prev,
          machines: hasQuantityLimit
            ? [
                ...prev.machines,
                ...newMachinesWithNote.slice(
                  0,
                  limitNum - prev.machines.length
                ),
              ]
            : [...prev.machines, ...newMachinesWithNote],
        };
      });
    }
  };
  const handleAddMachineFromScanner = async (machine) => {
    if (openInventoryScanDialog) {
      try {
        setLoading(true);

        const response = await api.inventory.getById(
          selectedTicket.uuid_inventory_check
        );
        const ticketDetails = response.data.inventory;
        setSelectedTicket(ticketDetails);
        setFormData((prev) => ({
          ...prev,
          inventoryDetails: response.data.details || [],
        }));

        // Update lại currentDepartment và scannedLocationsList
        const updatedDept = response.data.details.find(
          (d) => d.id_department === currentDepartment.id_department
        );
        let latestScannedLocations = [];
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
          latestScannedLocations = updatedScannedList;
        }

        // SAU KHI REFRESH, KIỂM TRA TRÙNG
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

        // Kiểm tra máy đã quét ở chuyền khác trong ĐƠN VỊ HIỆN TẠI (dùng data vừa refresh)
        const foundInOtherLocation = latestScannedLocations.find((loc) =>
          loc.scanned_machine?.some((m) => m.uuid === machine.uuid_machine)
        );

        // Kiểm tra máy đã quét ở ĐƠN VỊ KHÁC (trong toàn bộ phiếu kiểm kê)
        const foundInOtherDepartment = response.data.details?.find((dept) => {
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
            `Máy "${machine.code_machine}" đã được quét tại "${foundInOtherLocation.location_name}". Hãy chọn checkbox để quyết định lưu vào chuyền nào.`
          );
        }
      } catch (error) {
        console.error("Error refreshing before check single:", error);
        showNotification(
          "error",
          "Lỗi",
          "Không thể làm mới dữ liệu. Vui lòng thử lại."
        );
      } finally {
        setLoading(false);
      }
    } else {
      const limitNum = Number(formData.quantity);
      const hasQuantityLimit =
        dialogType === "import" &&
        dialogMode === "edit" &&
        selectedTicket?.status === "draft" &&
        Number.isFinite(limitNum) &&
        limitNum > 0;
      if (hasQuantityLimit && formData.machines.length >= limitNum) {
        showNotification(
          "warning",
          "Đã đủ số lượng máy",
          `Phiếu này yêu cầu đúng ${limitNum} máy. Vui lòng xóa bớt máy trước khi thêm.`
        );
        return;
      }
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
      // Bảo vệ không được tạo phiếu xuất
      if (isBaoVe && dialogType === "export") {
        showNotification(
          "error",
          "Không đủ quyền",
          "Bảo vệ không thể tạo phiếu xuất."
        );
        setLoading(false);
        return;
      }

      // Nếu là bảo vệ tạo phiếu nhập, validate ngày + số lượng
      if (isBaoVe && dialogType === "import") {
        if (!formData.date) {
          showNotification(
            "error",
            "Lỗi nhập liệu",
            "Vui lòng chọn ngày tạo phiếu."
          );
          setLoading(false);
          return;
        }

        const quantityNum = Number(formData.quantity);
        if (!Number.isFinite(quantityNum) || quantityNum <= 0) {
          showNotification(
            "error",
            "Lỗi nhập liệu",
            "Vui lòng nhập số lượng máy hợp lệ (lớn hơn 0)."
          );
          setLoading(false);
          return;
        }

        // Tạo FormData cho bảo vệ
        const data = new FormData();
        data.append("category", "import");
        data.append("date", formData.date);
        data.append("quantity", String(quantityNum));
        data.append("machines", JSON.stringify([]));
        filesToUpload.forEach((f) => data.append("attachments", f));

        await api.test_proposals.create(data);
        showNotification(
          "success",
          "Thành công",
          "Đã tạo phiếu nháp thành công!."
        );
        handleCloseDialog();
        fetchData();
        setLoading(false);
        return;
      }

      // 1. Validate machines (không áp dụng cho bảo vệ)
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

  // --- Draft Import Handlers ---
  const handleUpdateDraft = async () => {
    setLoading(true);
    try {
      // Validate
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

      // Tạo FormData (gửi loại phiếu, vị trí nhập, ghi chú, file, danh sách máy - KHÔNG gửi date)
      const data = new FormData();
      data.append("to_location_uuid", formData.to_location_uuid || "");
      data.append("import_type", formData.type || "");
      data.append("note", formData.note || "");
      data.append("machines", JSON.stringify(machinesToSend));

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

      filesToUpload.forEach((f) => data.append("attachments", f));

      const uuid = selectedTicket.uuid_machine_import;
      await api.imports.update(uuid, data);

      showNotification("success", "Thành công", "Đã lưu thay đổi phiếu nháp");
      handleCloseDialog();
      fetchData();
    } catch (error) {
      console.error("Error updating draft:", error);
      showNotification(
        "error",
        "Thao tác thất bại",
        error.response?.data?.message || "Lỗi khi cập nhật phiếu"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteDraft = async () => {
    setLoading(true);
    try {
      // Validate đầy đủ
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

      if (!formData.to_location_uuid) {
        showNotification(
          "error",
          "Lỗi nhập liệu",
          "Vui lòng chọn vị trí nhập."
        );
        setLoading(false);
        return;
      }

      if (!formData.type) {
        showNotification("error", "Lỗi nhập liệu", "Vui lòng chọn loại phiếu.");
        setLoading(false);
        return;
      }

      // Trước khi đóng phiếu, lưu lại các thay đổi (loại phiếu, vị trí, ghi chú, file, máy móc)
      const updateData = new FormData();
      updateData.append("to_location_uuid", formData.to_location_uuid);
      updateData.append("import_type", formData.type);
      updateData.append("note", formData.note || "");
      updateData.append("machines", JSON.stringify(machinesToSend));

      if (formData.is_borrowed_or_rented_or_borrowed_out_name)
        updateData.append(
          "is_borrowed_or_rented_or_borrowed_out_name",
          formData.is_borrowed_or_rented_or_borrowed_out_name
        );
      if (formData.is_borrowed_or_rented_or_borrowed_out_date)
        updateData.append(
          "is_borrowed_or_rented_or_borrowed_out_date",
          formData.is_borrowed_or_rented_or_borrowed_out_date
        );
      if (formData.is_borrowed_or_rented_or_borrowed_out_return_date)
        updateData.append(
          "is_borrowed_or_rented_or_borrowed_out_return_date",
          formData.is_borrowed_or_rented_or_borrowed_out_return_date || ""
        );

      filesToUpload.forEach((f) => updateData.append("attachments", f));

      const uuid = selectedTicket.uuid_machine_import;

      // Lưu trước
      await api.imports.update(uuid, updateData);

      // Sau đó đóng phiếu và gửi Fastwork
      await api.imports.complete(uuid);

      showNotification(
        "success",
        "Thành công",
        "Đã đóng phiếu và gửi duyệt thành công!"
      );
      handleCloseDialog();
      fetchData();
    } catch (error) {
      console.error("Error completing draft:", error);
      showNotification(
        "error",
        "Thao tác thất bại",
        error.response?.data?.message || "Lỗi khi đóng phiếu"
      );
    } finally {
      setLoading(false);
    }
  };

  // --- Inventory Handlers ---
  const handleCloseInventoryScan = () => {
    setOpenInventoryScanDialog(false);
    setCurrentDepartment(null);
    setSelectedLocationForScan(null);
    setInventoryScannedList([]);
    setScannedLocationsList([]);
    setDuplicateMachineChoices({});
    setCollapsedGroups({});
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

      // KIỂM TRA LẠI TRÙNG LẶP TRƯỚC KHI LƯU (để tránh race condition)
      const finalCheckResponse = await api.inventory.getById(
        selectedTicket.uuid_inventory_check
      );

      // Parse dữ liệu mới nhất từ server
      const latestDept = finalCheckResponse.data.details.find(
        (d) => d.id_department === currentDepartment.id_department
      );

      let latestScannedLocations = [];
      if (latestDept) {
        try {
          const parsed =
            typeof latestDept.scanned_result === "string"
              ? JSON.parse(latestDept.scanned_result)
              : latestDept.scanned_result;

          latestScannedLocations = Array.isArray(parsed)
            ? parsed
            : parsed?.locations || [];
        } catch {
          latestScannedLocations = [];
        }
      }

      // Kiểm tra xem có máy nào trong danh sách chuẩn bị lưu đã bị quét ở chuyền khác chưa
      const newDuplicates = [];
      inventoryScannedList.forEach((machine) => {
        // Bỏ qua máy đã được đánh dấu trùng từ trước
        if (machine.isDuplicateInCurrentDept) return;

        // Kiểm tra với data mới nhất
        const foundInLatest = latestScannedLocations.find((loc) =>
          loc.scanned_machine?.some((m) => m.uuid === machine.uuid_machine)
        );

        if (foundInLatest) {
          newDuplicates.push({
            machine: machine,
            location: foundInLatest.location_name,
          });
        }
      });

      // Nếu phát hiện máy trùng mới -> Cập nhật state và yêu cầu user chọn
      if (newDuplicates.length > 0) {
        // Cập nhật state với dữ liệu mới nhất
        setSelectedTicket(finalCheckResponse.data.inventory);
        setFormData((prev) => ({
          ...prev,
          inventoryDetails: finalCheckResponse.data.details || [],
        }));
        setScannedLocationsList(latestScannedLocations);
        setCurrentDepartment(latestDept);

        // Cập nhật inventoryScannedList với thông tin trùng lặp
        setInventoryScannedList((prev) =>
          prev.map((machine) => {
            const duplicate = newDuplicates.find(
              (d) => d.machine.uuid_machine === machine.uuid_machine
            );
            if (duplicate) {
              return {
                ...machine,
                isDuplicateInCurrentDept: true,
                duplicateLocationName: duplicate.location,
              };
            }
            return machine;
          })
        );

        // Hiển thị thông báo
        const details = newDuplicates
          .map(
            (d) =>
              `${d.machine.code_machine || d.machine.serial_machine} (tại ${
                d.location
              })`
          )
          .join(", ");

        showNotification(
          "warning",
          "Phát hiện máy trùng",
          `${newDuplicates.length} máy đã được quét ở vị trí khác: ${details}. Vui lòng chọn checkbox để quyết định lưu vào chuyền nào.`
        );

        setLoading(false);
        return; // Dừng lại, không lưu
      }

      // Xử lý các máy trùng lặp
      const machinesToSaveInCurrent = [];
      const machinesToRemoveFromPrevious = [];

      inventoryScannedList.forEach((machine) => {
        if (machine.isDuplicateInCurrentDept) {
          const choice = duplicateMachineChoices[machine.uuid_machine];

          if (choice === "current") {
            // User check "Chuyển sang chuyền mới" -> Lưu vào chuyền hiện tại
            machinesToSaveInCurrent.push(machine);
            // Đánh dấu cần xóa khỏi chuyền cũ
            machinesToRemoveFromPrevious.push({
              machine_uuid: machine.uuid_machine,
              previous_location_uuid: scannedLocationsList.find((loc) =>
                loc.scanned_machine?.some(
                  (m) => m.uuid === machine.uuid_machine
                )
              )?.location_uuid,
            });
          } else {
            // Không check -> Giữ ở chuyền cũ, không thêm vào chuyền hiện tại
            // Không làm gì
          }
        } else {
          // Máy không trùng -> lưu bình thường
          machinesToSaveInCurrent.push(machine);
        }
      });

      // Gọi API lưu với thông tin máy cần xóa
      await api.inventory.scanLocation(selectedTicket.uuid_inventory_check, {
        department_uuid: currentDepartment.uuid_department,
        location_uuid: selectedLocationForScan.uuid_location,
        scanned_machines: machinesToSaveInCurrent,
        machines_to_remove: machinesToRemoveFromPrevious, // Danh sách máy cần xóa khỏi chuyền cũ
      });

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
      setDuplicateMachineChoices({}); // Reset lựa chọn
      setOpenScanDialog(false);
      setOpenRfidDialog(false);

      // Hiển thị notification sau khi đã load xong tất cả dữ liệu
      showNotification(
        "success",
        "Đã lưu",
        `Đã lưu kết quả cho ${selectedLocationForScan.name_location}`
      );
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

    const machinesForSearch = mergeMachinesByRfid([
      ...inventoryScannedList.filter(
        (machine) =>
          isNotFoundMachine(machine) || isPreviouslyScannedMachine(machine)
      ),
      ...(scannedLocationsList || []).flatMap((loc) =>
        Array.isArray(loc.scanned_machine) ? loc.scanned_machine : []
      ),
    ]);

    if (machinesForSearch.length === 0) {
      showNotification(
        "info",
        "Không có RFID",
        "Không có RFID nào đã quét trước đó hoặc không có trong hệ thống để dò tìm."
      );
      return;
    }

    setInventoryRfidSearchTargets(machinesForSearch);
    setOpenInventoryRfidSearchDialog(true);
  };

  const missingMachineEligibleForRfidSearch = (m) =>
    m &&
    m.RFID_machine &&
    String(m.RFID_machine).trim() !== "" &&
    (m.found_at === "Chưa quét" || m.found_at === "Không tìm thấy");

  const handleRfidSearchFromMissingMachines = () => {
    // Đảm bảo luôn mở theo chế độ chọn vị trí (không dính batch scan trước đó)
    setBatchScanPreSelectedLocation(null);
    setBatchScanAllMissing([]);

    const unscannedMachines = missingMachines.filter(
      missingMachineEligibleForRfidSearch
    );

    const rfids = unscannedMachines
      .map((m) => m.RFID_machine)
      .filter((rfid) => rfid && rfid.trim() !== "");

    if (rfids.length === 0) {
      showNotification(
        "info",
        "Không có RFID",
        "Các máy chưa quét không có thông tin RFID để dò tìm."
      );
      return;
    }

    setInventoryRfidSearchTargets(mergeMachinesByRfid(unscannedMachines));
    setOpenInventoryRfidSearchDialog(true);
  };

  // --- BATCH SCAN PICKER ---
  const handleOpenBatchScanPicker = async () => {
    setBatchPickerStep(1);
    setBatchPickerDept(null);
    setBatchPickerLocation(null);
    setBatchPickerLocations([]);
    setOpenBatchScanPicker(true);

    // Luôn fetch toàn bộ missing machines của phiếu để có đủ RFID cho batch scan
    if (!selectedTicket || !formData.inventoryDetails) return;
    try {
      setBatchPickerLoading(true);
      const allPromises = formData.inventoryDetails.map((dept) =>
        api.inventory
          .getMissingMachines(selectedTicket.uuid_inventory_check, {
            department_uuid: dept.uuid_department,
            location_uuid: null,
          })
          .then((res) => ({ dept, data: res.data || [] }))
      );
      const results = await Promise.all(allPromises);
      const allMissing = results.flatMap(({ dept, data }) =>
        data.map((m) => ({ ...m, _dept_uuid: dept.uuid_department }))
      );
      // Lưu vào state riêng, KHÔNG ghi đè missingMachines đang hiển thị trên UI
      setBatchScanAllMissing(allMissing);
    } catch {
      // Không cần thông báo lỗi, giữ nguyên missingMachines hiện tại
    } finally {
      setBatchPickerLoading(false);
    }
  };

  const handleBatchPickerSelectDept = async (dept) => {
    setBatchPickerDept(dept);
    setBatchPickerLocation(null);
    setBatchPickerLocations([]);
    setBatchPickerLoading(true);
    try {
      const res = await api.locations.getAll({
        department_uuid: dept.uuid_department,
      });
      setBatchPickerLocations(res.data || []);
      setBatchPickerStep(2);
    } catch {
      showNotification("error", "Lỗi", "Không thể tải danh sách vị trí");
    } finally {
      setBatchPickerLoading(false);
    }
  };

  const handleBatchPickerConfirm = async () => {
    if (!batchPickerDept || !batchPickerLocation) return;

    // Đóng picker
    setOpenBatchScanPicker(false);

    // Chuẩn bị state cho batch scan
    setCurrentDepartment(batchPickerDept);

    // Parse scanned result cho đơn vị đã chọn (để dùng trong handler lưu)
    let scannedList = [];
    try {
      const parsed =
        typeof batchPickerDept.scanned_result === "string"
          ? JSON.parse(batchPickerDept.scanned_result)
          : batchPickerDept.scanned_result;
      scannedList = Array.isArray(parsed) ? parsed : parsed?.locations || [];
    } catch {
      scannedList = [];
    }
    setScannedLocationsList(scannedList);

    // Lấy toàn bộ RFID của máy chưa quét trên TOÀN BỘ phiếu (từ cache riêng, không dùng missingMachines UI)
    const sourceList =
      batchScanAllMissing.length > 0 ? batchScanAllMissing : missingMachines;
    setInventoryRfidSearchTargets(
      mergeMachinesByRfid(
        sourceList.filter(missingMachineEligibleForRfidSearch)
      )
    );

    // Lưu vị trí đã chọn sẵn
    setBatchScanPreSelectedLocation(batchPickerLocation.uuid_location);

    // Mở RfidSearch ở batch mode (vị trí đã chọn sẵn, tự động lưu khi tìm thấy)
    setOpenInventoryRfidSearchDialog(true);
  };

  // Xử lý khi user tìm thấy máy qua RFID Search và chọn vị trí để lưu vào phiếu kiểm kê
  const handleInventoryMachineFoundFromRfidSearch = async (
    foundTarget,
    locationUuid
  ) => {
    if (!selectedTicket) return;

    // Tìm thông tin máy: ưu tiên tìm trong batchScanAllMissing (đủ toàn phiếu), fallback về missingMachines
    const rfid = foundTarget.targetRfid.toUpperCase();
    const searchList =
      batchScanAllMissing.length > 0 ? batchScanAllMissing : missingMachines;
    const machineData = searchList.find(
      (m) => m.RFID_machine && m.RFID_machine.toUpperCase() === rfid
    );

    if (!machineData) {
      showNotification(
        "error",
        "Không tìm thấy máy",
        "Không tìm thấy thông tin máy tương ứng với RFID vừa quét."
      );
      throw new Error("Machine not found");
    }

    // Xác định đơn vị của máy này: dùng _dept_uuid (đã gắn khi fetch missing machines)
    // Nếu không có thì fallback về currentDepartment
    const deptUuid =
      machineData._dept_uuid || currentDepartment?.uuid_department;
    if (!deptUuid) {
      showNotification(
        "error",
        "Lỗi",
        "Không xác định được đơn vị của máy này."
      );
      throw new Error("Department not found");
    }

    // Lấy thông tin vị trí đã chọn (từ inventoryAllLocations)
    const selectedLoc = inventoryAllLocations.find(
      (l) => l.uuid_location === locationUuid
    );

    // Gọi API lưu máy vào vị trí đã chọn
    await api.inventory.scanLocation(selectedTicket.uuid_inventory_check, {
      department_uuid: deptUuid,
      location_uuid: locationUuid,
      scanned_machines: [machineData],
      machines_to_remove: [],
    });

    // Cập nhật missingMachines: đánh dấu đã tìm thấy
    setMissingMachines((prev) =>
      prev.map((m) =>
        m.RFID_machine && m.RFID_machine.toUpperCase() === rfid
          ? {
              ...m,
              found_at: selectedLoc ? selectedLoc.name_location : "Đã tìm thấy",
            }
          : m
      )
    );

    // Refresh data của phiếu kiểm kê
    try {
      const response = await api.inventory.getById(
        selectedTicket.uuid_inventory_check
      );
      setSelectedTicket(response.data.inventory);
      setFormData((prev) => ({
        ...prev,
        inventoryDetails: response.data.details || [],
      }));

      // Nếu đang mở department detail thì cập nhật luôn
      if (currentDepartment) {
        const updatedDept = response.data.details.find(
          (d) => d.uuid_department === deptUuid
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
          if (
            updatedDept.uuid_department === currentDepartment.uuid_department
          ) {
            setCurrentDepartment(updatedDept);
          }
        }
      }
    } catch (refreshErr) {
      console.error("Lỗi refresh data sau khi lưu máy:", refreshErr);
    }

    showNotification(
      "success",
      "Đã lưu thành công",
      `Máy ${machineData.serial_machine || rfid} đã được lưu vào ${
        selectedLoc?.name_location || "vị trí đã chọn"
      }.`
    );
  };

  // Batch mode: nhận toàn bộ danh sách máy đã quét, lưu 1 lần
  const handleBatchConfirmFromRfidSearch = async (batchList) => {
    if (!selectedTicket || !batchList || batchList.length === 0) return;

    const searchList =
      batchScanAllMissing.length > 0 ? batchScanAllMissing : missingMachines;

    // Nhóm máy theo đơn vị + vị trí để gọi API tối thiểu
    const groupMap = new Map(); // key: `${deptUuid}__${locationUuid}`
    const skipped = [];

    for (const { target, locationUuid } of batchList) {
      const rfid = target.targetRfid.toUpperCase();
      const machineData = searchList.find(
        (m) => m.RFID_machine && m.RFID_machine.toUpperCase() === rfid
      );
      if (!machineData) {
        skipped.push(rfid);
        continue;
      }
      const deptUuid =
        machineData._dept_uuid || currentDepartment?.uuid_department;
      if (!deptUuid) {
        skipped.push(rfid);
        continue;
      }
      const key = `${deptUuid}__${locationUuid}`;
      if (!groupMap.has(key)) {
        groupMap.set(key, { deptUuid, locationUuid, machines: [] });
      }
      groupMap.get(key).machines.push(machineData);
    }

    // Gọi API song song theo từng nhóm
    const groups = Array.from(groupMap.values());
    await Promise.all(
      groups.map(({ deptUuid, locationUuid, machines }) =>
        api.inventory.scanLocation(selectedTicket.uuid_inventory_check, {
          department_uuid: deptUuid,
          location_uuid: locationUuid,
          scanned_machines: machines,
          machines_to_remove: [],
        })
      )
    );

    // Cập nhật missingMachines: đánh dấu tất cả máy đã tìm thấy
    const foundRfids = new Set(
      batchList.map((item) => item.target.targetRfid.toUpperCase())
    );
    setMissingMachines((prev) =>
      prev.map((m) =>
        m.RFID_machine && foundRfids.has(m.RFID_machine.toUpperCase())
          ? { ...m, found_at: "Đã tìm thấy (batch)" }
          : m
      )
    );

    // Refresh data
    try {
      const response = await api.inventory.getById(
        selectedTicket.uuid_inventory_check
      );
      setSelectedTicket(response.data.inventory);
      setFormData((prev) => ({
        ...prev,
        inventoryDetails: response.data.details || [],
      }));
      if (currentDepartment) {
        const deptUuidsInBatch = new Set(groups.map((g) => g.deptUuid));
        for (const deptUuid of deptUuidsInBatch) {
          const updatedDept = response.data.details.find(
            (d) => d.uuid_department === deptUuid
          );
          if (
            updatedDept &&
            updatedDept.uuid_department === currentDepartment.uuid_department
          ) {
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
        }
      }
    } catch (refreshErr) {
      console.error("Lỗi refresh sau batch:", refreshErr);
    }

    const savedCount = batchList.length - skipped.length;
    showNotification(
      "success",
      "Lưu thành công",
      `Đã lưu ${savedCount} máy vào vị trí đã chọn.${
        skipped.length > 0
          ? ` (${skipped.length} máy không tìm thấy thông tin)`
          : ""
      }`
    );

    // Đóng tất cả dialog liên quan và reset batch state
    setOpenInventoryRfidSearchDialog(false);
    setOpenMissingMachinesDialog(false);
    setBatchScanPreSelectedLocation(null);
    setBatchScanAllMissing([]);
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

  const handleRefreshInventoryDepartment = async () => {
    if (!selectedTicket || !currentDepartment) return;

    try {
      setDetailLoading(true);
      const response = await api.inventory.getById(
        selectedTicket.uuid_inventory_check
      );
      const ticketDetails = response.data.inventory;
      setSelectedTicket(ticketDetails);
      setFormData((prev) => ({
        ...prev,
        inventoryDetails: response.data.details || [],
      }));

      // Update lại state local cho department hiện tại
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

      // showNotification(
      //   "success",
      //   "Đã làm mới",
      //   "Dữ liệu đã được cập nhật"
      // );
    } catch (error) {
      console.error("Error refreshing inventory department:", error);
      // showNotification(
      //   "error",
      //   "Làm mới thất bại",
      //   error.response?.data?.message || "Lỗi khi tải dữ liệu"
      // );
    } finally {
      setDetailLoading(false);
    }
  };

  const handleViewMissingMachines = async (
    locationUuid,
    locationName,
    departmentUuid = null
  ) => {
    if (!selectedTicket) return;

    const deptUuid = departmentUuid || currentDepartment?.uuid_department;
    if (!deptUuid) return;

    try {
      // Fetch missing machines và locations của đơn vị này song song
      const [missingRes, locsRes] = await Promise.all([
        api.inventory.getMissingMachines(selectedTicket.uuid_inventory_check, {
          department_uuid: deptUuid,
          location_uuid: locationUuid,
        }),
        api.locations.getAll({ department_uuid: deptUuid }),
      ]);

      // Gắn uuid_department vào mỗi máy để dùng khi lưu
      const taggedMachines = (missingRes.data || []).map((m) => ({
        ...m,
        _dept_uuid: deptUuid,
      }));

      // Tìm tên đơn vị từ inventoryDetails
      const deptInfo = formData.inventoryDetails?.find(
        (d) => d.uuid_department === deptUuid
      );
      const locs = (locsRes.data || []).map((loc) => ({
        ...loc,
        _dept_uuid: deptUuid,
        _dept_name: deptInfo?.name_department || "",
        _id_department: deptInfo?.id_department || deptInfo?.id_phong_ban,
      }));

      setMissingMachines(taggedMachines);
      setMissingMachinesLocation(locationName);
      setInventoryAllLocations(locs);
      setOpenMissingMachinesDialog(true);
    } catch (error) {
      console.error("Error fetching missing machines:", error);
      showNotification(
        "error",
        "Lỗi",
        error.response?.data?.message ||
          "Không thể tải danh sách máy chưa xác định"
      );
    } finally {
      setDetailLoading(false);
    }
  };

  const handleViewAllMissingMachines = async () => {
    if (!selectedTicket || !formData.inventoryDetails) return;

    try {
      setDetailLoading(true);
      const allPromises = (formData.inventoryDetails || []).map((dept) =>
        api.inventory
          .getMissingMachines(selectedTicket.uuid_inventory_check, {
            department_uuid: dept.uuid_department,
            location_uuid: null,
          })
          .then((res) => ({ dept, data: res.data || [] }))
      );

      const results = await Promise.all(allPromises);

      // Gắn uuid_department vào mỗi máy để biết nó thuộc đơn vị nào khi lưu
      const allMissingMachines = results.flatMap(({ dept, data }) =>
        data.map((m) => ({ ...m, _dept_uuid: dept.uuid_department }))
      );

      setMissingMachines(allMissingMachines);
      setMissingMachinesLocation("Toàn bộ phiếu kiểm kê");

      // Load tất cả vị trí của tất cả đơn vị trong phiếu
      const locPromises = (formData.inventoryDetails || []).map((dept) =>
        api.locations
          .getAll({ department_uuid: dept.uuid_department })
          .then((res) =>
            (res.data || []).map((loc) => ({
              ...loc,
              _dept_uuid: dept.uuid_department,
              _dept_name: dept.name_department,
              _id_department: dept.id_department || dept.id_phong_ban,
            }))
          )
          .catch(() => [])
      );
      const locResults = await Promise.all(locPromises);
      // Gộp và loại trùng theo uuid_location
      const allLocs = locResults.flat();
      const uniqueLocs = Array.from(
        new Map(allLocs.map((l) => [l.uuid_location, l])).values()
      );
      setInventoryAllLocations(uniqueLocs);

      setOpenMissingMachinesDialog(true);
    } catch (error) {
      console.error("Error fetching all missing machines:", error);
      showNotification(
        "error",
        "Lỗi",
        error.response?.data?.message ||
          "Không thể tải danh sách máy chưa xác định"
      );
    } finally {
      setDetailLoading(false);
    }
  };

  const handleConfirmAllMissingMachines = async () => {
    if (!selectedTicket) return;
    if (selectedTicket?.status !== "draft") return;

    const targets = (missingMachines || []).filter(
      (m) => m && m.found_at === "Chưa quét" && !m.not_found_confirmed
    );
    if (targets.length === 0) return;

    // Group theo đơn vị vì backend nhận 1 department_uuid/lần
    const groups = new Map(); // deptUuid -> [uuid_machine]
    targets.forEach((m) => {
      const deptUuid = m?._dept_uuid || currentDepartment?.uuid_department;
      if (!deptUuid || !m?.uuid_machine) return;
      if (!groups.has(deptUuid)) groups.set(deptUuid, []);
      groups.get(deptUuid).push(m.uuid_machine);
    });

    if (groups.size === 0) return;

    try {
      setConfirmingMissingAll(true);

      // Gửi lần lượt để dễ debug/thông báo; vẫn đủ nhanh vì số group thường nhỏ
      let totalUpdated = 0;
      for (const [deptUuid, uuids] of groups.entries()) {
        if (!uuids || uuids.length === 0) continue;
        const res = await api.inventory.confirmMissingMachines(
          selectedTicket.uuid_inventory_check,
          { department_uuid: deptUuid, machine_uuids: uuids }
        );
        totalUpdated += Number(res?.updated || 0);
      }

      const confirmedSet = new Set(targets.map((t) => t.uuid_machine));
      setMissingMachines((prev) =>
        (prev || []).map((m) =>
          confirmedSet.has(m?.uuid_machine)
            ? { ...m, not_found_confirmed: true, found_at: "Không tìm thấy" }
            : m
        )
      );

      showNotification(
        "success",
        "Thành công",
        totalUpdated > 0
          ? `Đã xác nhận ${totalUpdated} máy không tìm thấy`
          : "Đã xác nhận máy không tìm thấy"
      );
    } catch (error) {
      console.error("Error confirming all missing machines:", error);
      showNotification(
        "error",
        "Lỗi",
        error.response?.data?.message ||
          "Không thể xác nhận tất cả máy không tìm thấy"
      );
    } finally {
      setConfirmingMissingAll(false);
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

  // Hàm lấy thông số kỹ thuật mặc định dựa trên Loại máy và Đặc tính
  const fetchAndApplyDefaultSpecs = async (typeName, attributeName) => {
    if (!typeName) return;
    try {
      const res = await api.machines.getDefaultSpecs({
        type_machine: typeName,
        attribute_machine: attributeName || "",
      });
      if (res.success && res.data) {
        const specs = res.data;
        setNewMachineData((prev) => ({
          ...prev,
          power:
            prev.power === "" || prev.power === null || prev.power === undefined
              ? (specs.power ?? "")
              : prev.power,
          pressure:
            prev.pressure === "" ||
            prev.pressure === null ||
            prev.pressure === undefined
              ? (specs.pressure ?? "")
              : prev.pressure,
          voltage:
            prev.voltage === "" ||
            prev.voltage === null ||
            prev.voltage === undefined
              ? (specs.voltage ?? "")
              : prev.voltage,
          air_volume:
            prev.air_volume === "" ||
            prev.air_volume === null ||
            prev.air_volume === undefined
              ? (specs.air_volume ?? "")
              : prev.air_volume,
        }));
      }
    } catch (err) {
      console.error("Error fetching default specs:", err);
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

              // 2. Xử lý các trường SỐ (Giá, Chi phí, Công suất, Áp suất, Điện áp, Lưu lượng khí nén)
              if (
                [
                  "price",
                  "repair_cost",
                  "power",
                  "pressure",
                  "voltage",
                  "air_volume",
                  "lifespan",
                ].includes(englishKey)
              ) {
                const isSpecKey = [
                  "power",
                  "pressure",
                  "voltage",
                  "air_volume",
                ].includes(englishKey);

                // Thông số kỹ thuật: cho phép số thập phân (double)
                if (isSpecKey) {
                  newRow[englishKey] = parseDecimalValue(cellValue);
                } else if (typeof cellValue === "string") {
                  const clean = cellValue.replace(/[^0-9]/g, "");
                  const parsed = parseInt(clean, 10);
                  newRow[englishKey] = isNaN(parsed) ? 0 : parsed;
                } else if (typeof cellValue === "number") {
                  newRow[englishKey] = cellValue;
                } else if (cellValue === null || cellValue === undefined) {
                  newRow[englishKey] = 0;
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
      draft: "info",
      pending: "warning",
      pending_confirmation: "warning",
      pending_approval: "warning",
      completed: "success",
      cancelled: "error",
    })[status] || "default";
  const getStatusLabel = (status) =>
    ({
      draft: "Nháp",
      pending: "Chờ duyệt",
      pending_confirmation: "Chờ xác nhận",
      pending_approval: "Chờ duyệt",
      completed: "Đã duyệt",
      cancelled: "Đã hủy",
    })[status] || status;

  const getExportGateConfirmChip = (ticket) => {
    if (!ticket || ticket.status !== "completed") return null;
    const confirmed = ticket.confirm === 1;
    return {
      label: confirmed ? "Đã xác nhận ra cổng" : "Chưa xác nhận ra cổng",
      color: confirmed ? "success" : "warning",
    };
  };
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
    })[type] || type;

  // --- Helper vẽ luồng duyệt chi tiết (Full Name + MaNV) ---
  const renderDetailedFlow = (flow) => {
    if (!flow || flow.length === 0)
      return (
        <Typography variant="caption" color="text.secondary">
          Chưa có cấu hình luồng duyệt
        </Typography>
      );

    // Tách step hệ thống tự động hủy (ma_nv === "SYSTEM") ra khỏi flow bình thường
    const systemStep = flow.find((s) => s.ma_nv === "SYSTEM");
    const normalFlow = flow.filter((s) => s.ma_nv !== "SYSTEM");

    // 1. Gom nhóm theo step_flow
    const groupedSteps = normalFlow.reduce((acc, curr) => {
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
          <Route
            sx={{
              fontSize: 16,
              verticalAlign: "text-top",
              mr: 0.5,
              transform: "rotate(90deg)",
            }}
          />
          Luồng duyệt
        </Typography>

        {sortedStepKeys.map((stepKey, groupIndex) => {
          const group = groupedSteps[stepKey];
          const isLastGroup =
            groupIndex === sortedStepKeys.length - 1 && !systemStep;

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
                              {step.ten_nv || step.display_name || step.ma_nv}
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

        {/* Step hệ thống tự động hủy */}
        {systemStep && (
          <>
            {sortedStepKeys.length > 0 && (
              <Box
                sx={{
                  mx: 0.5,
                  width: 20,
                  height: 2,
                  bgcolor: "#ef9a9a",
                  flexShrink: 0,
                }}
              />
            )}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                px: 2,
                py: 0.5,
                borderRadius: "20px",
                backgroundColor: "#ffebee",
                border: "1.5px dashed #ef5350",
                minWidth: "200px",
              }}
            >
              <Avatar
                sx={{
                  width: 22,
                  height: 22,
                  fontSize: "0.75rem",
                  bgcolor: "#d32f2f",
                  color: "#fff",
                  fontWeight: "bold",
                }}
              >
                <Autorenew sx={{ fontSize: 14 }} />
              </Avatar>
              <Box>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 700,
                    fontSize: "0.85rem",
                    color: "#b71c1c",
                  }}
                >
                  {systemStep.ten_nv}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    display: "block",
                    lineHeight: 1,
                    color: "#d32f2f",
                    fontStyle: "italic",
                    fontWeight: "bold",
                  }}
                >
                  {systemStep.status_text}
                </Typography>
              </Box>
            </Box>
          </>
        )}
      </Box>
    );
  };

  const getTypeChipColors = (type, tab) => {
    if (tab === 0) {
      switch (type) {
        case "purchased":
          return { bgcolor: "#1976d211", color: "#1976d2" };
        case "maintenance_return":
          return { bgcolor: "#ff980011", color: "#ff9800" };
        case "rented":
          return { bgcolor: "#673ab711", color: "#673ab7" };
        case "borrowed":
          return { bgcolor: "#03a9f411", color: "#03a9f4" };
        case "borrowed_out_return":
          return { bgcolor: "#00bcd411", color: "#00bcd4" };
      }
    }
    if (tab === 1) {
      switch (type) {
        case "liquidation":
          return { bgcolor: "#f4433611", color: "#f44336" };
        case "maintenance":
          return { bgcolor: "#ff980011", color: "#ff9800" };
        case "borrowed_out":
          return { bgcolor: "#00bcd411", color: "#00bcd4" };
        case "rented_return":
          return { bgcolor: "#673ab711", color: "#673ab7" };
        case "borrowed_return":
          return { bgcolor: "#03a9f411", color: "#03a9f4" };
      }
    }
    return { bgcolor: "rgba(102, 126, 234, 0.1)", color: "#667eea" };
  };

  // Render Card Content for Tabs 0, 1, 2, 3
  const renderCardContent = () => {
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
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            py: 8,
          }}
        >
          <CircularProgress />
        </Box>
      );
    if (data.length === 0)
      return (
        <Paper
          elevation={0}
          sx={{
            p: 6,
            textAlign: "center",
            borderRadius: "16px",
            bgcolor: "#f8f9fa",
            border: "1px solid rgba(0, 0, 0, 0.06)",
          }}
        >
          <Typography variant="body1" color="text.secondary">
            Không có dữ liệu
          </Typography>
        </Paper>
      );

    // Render Inventory Tab Cards
    if (activeTab === 3) {
      return inventories.map((item) => {
        return (
          <Paper
            key={item.uuid_inventory_check}
            elevation={0}
            onClick={() => handleOpenDialog("view", "inventory", item)}
            sx={{
              p: 2.5,
              borderRadius: "16px",
              border: "1px solid rgba(0, 0, 0, 0.08)",
              bgcolor: "#ffffff",
              transition: "all 0.2s ease-in-out",
              cursor: "pointer",
              "&:hover": {
                transform: "translateY(-2px)",
                boxShadow: "0 8px 24px rgba(102, 126, 234, 0.12)",
                borderColor: "#667eea",
              },
            }}
          >
            {/* Header: Date + Title + Status */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                mb: 1.5,
                flexWrap: "wrap",
                gap: 1,
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  flexWrap: "wrap",
                }}
              >
                <Chip
                  label="Kiểm kê định kỳ"
                  size="small"
                  sx={{
                    bgcolor: "rgba(102, 126, 234, 0.1)",
                    color: "#667eea",
                    fontWeight: 700,
                    borderRadius: "8px",
                  }}
                />
                <Typography
                  variant="body2"
                  sx={{ color: "text.secondary", fontWeight: 500 }}
                >
                  • Ngày tạo: {formatDate(item.check_date)}
                </Typography>
              </Box>
              <Chip
                label={getStatusLabel(item.status)}
                color={getStatusColor(item.status)}
                size="small"
                sx={{ fontWeight: 600 }}
              />
            </Box>

            {/* Body: Details */}
            <Grid container spacing={2} sx={{ mb: 1.5 }}>
              <Grid size={{ xs: 12, md: 8 }}>
                <Typography
                  variant="caption"
                  sx={{ color: "text.secondary", display: "block", mb: 0.5 }}
                >
                  Vị trí kiểm kê
                </Typography>
                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={1.5}
                  flexWrap="wrap"
                >
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {item.completed_department_count || 0} /{" "}
                    {item.department_count || 0} đơn vị
                  </Typography>
                  <Box
                    sx={{
                      width: 140,
                      height: 8,
                      bgcolor: "#e0e0e0",
                      borderRadius: 2,
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
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block", mt: 0.5 }}
                  >
                    {item.department_names}
                  </Typography>
                )}
              </Grid>
              {item.note && (
                <Grid size={{ xs: 12, md: 4 }}>
                  <Typography
                    variant="caption"
                    sx={{ color: "text.secondary", display: "block", mb: 0.5 }}
                  >
                    Ghi chú
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {item.note}
                  </Typography>
                </Grid>
              )}
            </Grid>

            {/* Footer: Approval Flow */}
            <Divider sx={{ my: 1.5, borderColor: "rgba(0, 0, 0, 0.06)" }} />
            <Box sx={{ pt: 0.5 }}>{renderDetailedFlow(item.approval_flow)}</Box>
          </Paper>
        );
      });
    }

    // Render Import/Export/Internal Tab Cards
    return data.map((item) => {
      const uuid =
        item.uuid_machine_import ||
        item.uuid_machine_export ||
        item.uuid_machine_internal_transfer;
      const date = item.import_date || item.export_date || item.transfer_date;
      const type =
        activeTab === 0
          ? item.import_type
          : activeTab === 1
            ? item.export_type
            : "internal";

      return (
        <Paper
          key={uuid}
          elevation={0}
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
            p: 2.5,
            borderRadius: "16px",
            border: "1px solid rgba(0, 0, 0, 0.08)",
            bgcolor: "#ffffff",
            transition: "all 0.2s ease-in-out",
            cursor: "pointer",
            "&:hover": {
              transform: "translateY(-2px)",
              boxShadow: "0 8px 24px rgba(102, 126, 234, 0.12)",
              borderColor: "#667eea",
            },
          }}
        >
          {/* Header */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              mb: 1.5,
              flexWrap: "wrap",
              gap: 1,
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                flexWrap: "wrap",
              }}
            >
              <Chip
                label={
                  activeTab === 2
                    ? "Điều chuyển"
                    : type
                      ? getTypeLabel(type)
                      : "Nháp"
                }
                size="small"
                sx={{
                  ...getTypeChipColors(type, activeTab),
                  fontWeight: 700,
                  borderRadius: "8px",
                }}
              />
              <Typography
                variant="caption"
                sx={{ color: "text.secondary", fontWeight: 500 }}
              >
                • Ngày tạo: {formatDate(date)}
              </Typography>
            </Box>
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              flexWrap="wrap"
            >
              <Chip
                label={getStatusLabel(item.status)}
                color={getStatusColor(item.status)}
                size="small"
                sx={{ fontWeight: 600 }}
              />
              {activeTab === 1 &&
                item.status === "completed" &&
                (() => {
                  const gateChip = getExportGateConfirmChip(item);
                  if (!gateChip) return null;
                  return (
                    <Chip
                      label={gateChip.label}
                      color={gateChip.color}
                      size="small"
                      sx={{ fontWeight: 600 }}
                    />
                  );
                })()}
            </Stack>
          </Box>

          {/* Body */}
          <Grid container spacing={2} sx={{ mb: 1 }}>
            <Grid size={{ xs: 12, sm: 6, md: 5 }}>
              <Typography
                variant="caption"
                sx={{ color: "text.secondary", display: "block" }}
              >
                {activeTab === 0
                  ? "Nhập vào"
                  : activeTab === 1
                    ? "Xuất đến"
                    : "Đến vị trí"}
              </Typography>
              <Typography
                variant="body1"
                sx={{ fontWeight: 600, color: "#2c3e50" }}
              >
                {item.to_location_name || "-"}
              </Typography>
            </Grid>

            <Grid size={{ xs: 6, sm: 3, md: 3 }}>
              <Typography
                variant="caption"
                sx={{ color: "text.secondary", display: "block" }}
              >
                Số lượng máy
              </Typography>
              <Typography
                variant="body1"
                sx={{ fontWeight: 700, color: "#667eea" }}
              >
                {item.quantity_display ??
                  item.quantity ??
                  item.machine_count ??
                  0}{" "}
                máy
              </Typography>
            </Grid>

            <Grid size={{ xs: 6, sm: 3, md: 4 }}>
              <Typography
                variant="caption"
                sx={{ color: "text.secondary", display: "block" }}
              >
                Ghi chú
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: item.note ? "text.primary" : "text.secondary",
                }}
              >
                {item.note || "-"}
              </Typography>
            </Grid>
          </Grid>

          {/* Footer: Approval Flow */}
          <Divider sx={{ my: 1.5, borderColor: "rgba(0, 0, 0, 0.06)" }} />
          <Box sx={{ pt: 0.5 }}>{renderDetailedFlow(item.approval_flow)}</Box>
        </Paper>
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
                  {!isBaoVe && (
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
                  )}
                  {canViewInventoryTab && !isBaoVe && (
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

                  {!isBaoVe && (
                    <Tab
                      icon={<Autorenew />}
                      label="Điều chuyển / Cập nhật vị trí"
                      iconPosition="start"
                    />
                  )}
                  {canViewInventoryTab && !isBaoVe && (
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
                  {(isAdmin ||
                    isPhongCoDien ||
                    (isBaoVe && activeTab === 0)) && (
                    <Button
                      variant="contained"
                      startIcon={<Add />}
                      onClick={() => {
                        handleOpenDialog(
                          "create",
                          activeTab === 0 ? "import" : "export"
                        );
                      }}
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
                          label={`Nháp: ${importStats.byStatus?.draft || 0}`}
                          color="info"
                          sx={{ fontWeight: 600 }}
                        />
                      </Grid>
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

                {activeTab === 3 && (
                  <Accordion
                    expanded={recurringMissExpanded}
                    onChange={(_, expanded) =>
                      setRecurringMissExpanded(expanded)
                    }
                    disableGutters
                    elevation={0}
                    sx={{
                      mt: 2,
                      borderRadius: "12px !important",
                      bgcolor: "#fff8e1",
                      border: "1px solid #ffe082",
                      "&:before": { display: "none" },
                      overflow: "hidden",
                    }}
                  >
                    <AccordionSummary
                      expandIcon={<ExpandMore sx={{ color: "#f57c00" }} />}
                      sx={{
                        minHeight: 48,
                        "& .MuiAccordionSummary-content": { my: 1 },
                      }}
                    >
                      <Typography
                        variant="subtitle2"
                        sx={{ fontWeight: 600, color: "#f57c00" }}
                      >
                        Thống kê máy quét sót/chưa xác định liên tiếp (≥ 3 lần)
                      </Typography>
                      {!recurringMissExpanded &&
                        recurringMissedMachines.length > 0 && (
                          <Chip
                            label={`${recurringMissedMachines.length} máy`}
                            size="small"
                            color="error"
                            sx={{ ml: 1.5, fontWeight: 600 }}
                          />
                        )}
                    </AccordionSummary>
                    <AccordionDetails sx={{ pt: 0, pb: 2, px: 2 }}>
                      <Grid container spacing={2} sx={{ mb: 2 }}>
                        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                          <TextField
                            fullWidth
                            type="date"
                            label="Từ ngày"
                            value={recurringMissFrom}
                            onChange={(e) =>
                              setRecurringMissFrom(e.target.value)
                            }
                            InputLabelProps={{ shrink: true }}
                            sx={{
                              "& .MuiOutlinedInput-root": {
                                borderRadius: "12px",
                              },
                            }}
                          />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                          <TextField
                            fullWidth
                            type="date"
                            label="Đến ngày"
                            value={recurringMissTo}
                            onChange={(e) => setRecurringMissTo(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            sx={{
                              "& .MuiOutlinedInput-root": {
                                borderRadius: "12px",
                              },
                            }}
                          />
                        </Grid>
                        <Grid
                          size={{ xs: 12, md: 4 }}
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 2,
                          }}
                        >
                          {isAdmin && (
                            <FormControlLabel
                              control={
                                <Switch
                                  checked={onlyCurrentMissed}
                                  onChange={(e) =>
                                    setOnlyCurrentMissed(e.target.checked)
                                  }
                                  color="warning"
                                />
                              }
                              label={
                                <Typography
                                  variant="caption"
                                  sx={{ fontWeight: 600, color: "#666" }}
                                >
                                  Chỉ hiện máy còn bị sót
                                </Typography>
                              }
                            />
                          )}
                          <Button
                            variant="contained"
                            onClick={fetchRecurringMissedStats}
                            disabled={recurringMissLoading}
                            sx={{
                              borderRadius: "12px",
                              bgcolor: "#f57c00",
                              "&:hover": { bgcolor: "#ef6c00" },
                            }}
                          >
                            {recurringMissLoading ? (
                              <CircularProgress size={22} color="inherit" />
                            ) : (
                              "Xem thống kê"
                            )}
                          </Button>
                        </Grid>
                      </Grid>
                      {recurringMissMeta && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: "block", mb: 1 }}
                        >
                          {recurringMissMeta.ticket_days_count} ngày có phiếu
                          kiểm kê trong khoảng đã chọn
                          {recurringMissedMachines.length > 0 &&
                            ` · ${recurringMissedMachines.length} máy đạt chuỗi ≥ 3`}
                          {recurringMissMeta?.rfid_replaced_count > 0 &&
                            ` · ${recurringMissMeta.rfid_replaced_count} máy đã thay thẻ RFID`}
                        </Typography>
                      )}
                      {!isViewOnly &&
                        recurringMissRfidReplaceTargets.length > 0 && (
                          <Button
                            variant="outlined"
                            startIcon={<WifiTethering />}
                            onClick={() => setOpenRecurringMissRfidDialog(true)}
                            sx={{
                              mb: 2,
                              borderRadius: "12px",
                              borderColor: "#f57c00",
                              color: "#f57c00",
                              fontWeight: 600,
                              "&:hover": {
                                borderColor: "#ef6c00",
                                bgcolor: "rgba(245, 124, 0, 0.06)",
                              },
                            }}
                          >
                            Dò tìm & cập nhật thẻ RFID (
                            {recurringMissRfidReplaceTargets.length} máy)
                          </Button>
                        )}
                      {recurringMissLoading ? (
                        <Box sx={{ textAlign: "center", py: 3 }}>
                          <CircularProgress size={32} />
                        </Box>
                      ) : recurringMissedMachines.length === 0 ? (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ py: 2, textAlign: "center" }}
                        >
                          Không có máy quét sót/chưa xác định liên tiếp từ 3 lần
                          trở lên trong khoảng ngày đã chọn
                        </Typography>
                      ) : (
                        <TableContainer
                          component={Paper}
                          elevation={0}
                          sx={{ border: "1px solid #ffe082", borderRadius: 2 }}
                        >
                          <Table size="small">
                            <TableHead>
                              <TableRow sx={{ bgcolor: "#fff3e0" }}>
                                <TableCell sx={{ fontWeight: "bold" }}>
                                  STT
                                </TableCell>
                                <TableCell sx={{ fontWeight: "bold" }}>
                                  Tên thiết bị
                                </TableCell>
                                <TableCell sx={{ fontWeight: "bold" }}>
                                  Serial
                                </TableCell>
                                <TableCell sx={{ fontWeight: "bold" }}>
                                  RFID
                                </TableCell>
                                <TableCell sx={{ fontWeight: "bold" }}>
                                  Vị trí ghi nhận
                                </TableCell>
                                <TableCell
                                  align="center"
                                  sx={{ fontWeight: "bold", color: "#d32f2f" }}
                                >
                                  Số lần sót/chưa xác định liên tiếp
                                </TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {recurringMissedMachines.map((machine, index) => (
                                <TableRow
                                  key={machine.uuid_machine}
                                  hover
                                  sx={{
                                    "&:hover": {
                                      bgcolor: "rgba(245, 124, 0, 0.06)",
                                    },
                                  }}
                                >
                                  <TableCell>{index + 1}</TableCell>
                                  <TableCell>
                                    {`${machine.type_machine || ""} ${
                                      machine.attribute_machine || ""
                                    } - ${machine.model_machine || ""}`.trim()}
                                  </TableCell>
                                  <TableCell>
                                    {machine.serial_machine || "-"}
                                  </TableCell>
                                  <TableCell>
                                    <Stack
                                      direction="row"
                                      alignItems="center"
                                      spacing={0.5}
                                      flexWrap="wrap"
                                      useFlexGap
                                    >
                                      <Typography
                                        component="span"
                                        sx={{
                                          fontSize: "0.89rem",
                                        }}
                                      >
                                        {machine.RFID_machine || "-"}
                                      </Typography>
                                      {machine.rfid_replaced && (
                                        <Chip
                                          label="Đã thay thẻ"
                                          size="small"
                                          color="success"
                                          variant="outlined"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setRfidReplacePopover({
                                              anchorEl: e.currentTarget,
                                              machine,
                                            });
                                          }}
                                          sx={{
                                            cursor: "pointer",
                                            fontWeight: 600,
                                            height: 22,
                                          }}
                                        />
                                      )}
                                      {!machine.rfid_replaced && (
                                        <Chip
                                          label="Chưa thay thẻ"
                                          size="small"
                                          color="warning"
                                          variant="outlined"
                                          onClick={
                                            isViewOnly
                                              ? null
                                              : (e) => {
                                                  e.stopPropagation();
                                                  handleOpenDirectRfidReplace(
                                                    machine
                                                  );
                                                }
                                          }
                                          sx={{
                                            cursor: isViewOnly
                                              ? "default"
                                              : "pointer",
                                            fontWeight: 600,
                                            height: 22,
                                          }}
                                        />
                                      )}
                                    </Stack>
                                  </TableCell>
                                  <TableCell>
                                    {machine.previous_location_name || "-"}
                                  </TableCell>
                                  <TableCell align="center">
                                    <Chip
                                      label={machine.consecutive_miss_count}
                                      size="small"
                                      color="error"
                                      sx={{ fontWeight: 700 }}
                                    />
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      )}
                    </AccordionDetails>
                  </Accordion>
                )}

                <Popover
                  open={Boolean(rfidReplacePopover)}
                  anchorEl={rfidReplacePopover?.anchorEl}
                  onClose={() => setRfidReplacePopover(null)}
                  anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
                  transformOrigin={{ vertical: "top", horizontal: "left" }}
                >
                  <Box sx={{ p: 2, maxWidth: 360 }}>
                    <Typography
                      variant="caption"
                      sx={{ fontWeight: 600, mb: 1, color: "#2e7d32" }}
                    >
                      RFID mới
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        wordBreak: "break-all",
                        fontWeight: 600,
                        mb: 1.5,
                      }}
                    >
                      {rfidReplacePopover?.machine?.RFID_machine_current || "-"}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: "block", mb: 0.5 }}
                    >
                      RFID trên phiếu kiểm kê:
                    </Typography>
                    <Typography variant="body2" sx={{ wordBreak: "break-all" }}>
                      {rfidReplacePopover?.machine?.RFID_machine || "-"}
                    </Typography>
                  </Box>
                </Popover>

                <Dialog
                  open={Boolean(directRfidReplaceMachine)}
                  onClose={handleCloseDirectRfidReplace}
                  maxWidth="sm"
                  fullWidth
                  PaperProps={{ sx: { borderRadius: "20px" } }}
                >
                  <DialogTitle
                    sx={{
                      background:
                        "linear-gradient(135deg, #ff9800 0%, #f57c00 100%)",
                      color: "white",
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    <SwapHoriz sx={{ fontSize: 28 }} />
                    <Box>
                      <Typography variant="h6" fontWeight={700}>
                        Cập nhật thẻ RFID mới
                      </Typography>
                      <Typography variant="caption" sx={{ opacity: 0.85 }}>
                        Quét được thẻ cũ — nhập mã thẻ mới gắn cho máy
                      </Typography>
                    </Box>
                  </DialogTitle>
                  <DialogContent sx={{ pt: 3, bgcolor: "#f8f9fc" }}>
                    {directRfidReplaceMachine && (
                      <Stack spacing={2.5} sx={{ pt: 2 }}>
                        <Box
                          sx={{
                            p: 2,
                            bgcolor: "#fff8e1",
                            borderRadius: "14px",
                            border: "1px solid #ffe082",
                          }}
                        >
                          <Typography variant="h6" fontWeight={700}>
                            {`${directRfidReplaceMachine.type_machine || ""} ${
                              directRfidReplaceMachine.attribute_machine || ""
                            } ${
                              directRfidReplaceMachine.model_machine
                                ? `- ${directRfidReplaceMachine.model_machine}`
                                : ""
                            }`.trim() ||
                              directRfidReplaceMachine.serial_machine}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Serial:{" "}
                            {directRfidReplaceMachine.serial_machine || "-"}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            display="block"
                          >
                            RFID cũ trên danh sách
                          </Typography>
                          <Typography
                            variant="body1"
                            sx={{ wordBreak: "break-all" }}
                          >
                            {directRfidReplaceMachine.RFID_machine || "-"}
                          </Typography>
                        </Box>
                        {directRfidReplaceMachine.RFID_machine_current !=
                          null && (
                          <Box>
                            <Typography
                              variant="caption"
                              fontWeight={600}
                              color="#2e7d32"
                              display="block"
                            >
                              RFID hiện trên hệ thống
                            </Typography>
                            <Typography
                              variant="body1"
                              fontWeight={600}
                              sx={{ wordBreak: "break-all" }}
                            >
                              {directRfidReplaceMachine.RFID_machine_current ||
                                "(chưa gán)"}
                            </Typography>
                          </Box>
                        )}
                        <TextField
                          fullWidth
                          autoFocus
                          inputRef={directRfidInputRef}
                          label="RFID mới"
                          placeholder="Quét hoặc nhập mã thẻ mới"
                          onChange={(e) => {
                            e.target.value = e.target.value
                              .slice(0, RFID_LOOKUP_LENGTH)
                              .toUpperCase();
                            if (directRfidError) setDirectRfidError("");
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleConfirmDirectRfidReplace();
                            }
                          }}
                          disabled={directRfidSaving}
                          sx={rfidMonoInputSx()}
                          inputProps={{ maxLength: RFID_LOOKUP_LENGTH }}
                        />
                        {directRfidError ? (
                          <Alert severity="error" sx={{ borderRadius: "12px" }}>
                            {directRfidError}
                          </Alert>
                        ) : null}
                      </Stack>
                    )}
                  </DialogContent>
                  <DialogActions
                    sx={{
                      p: 2,
                      gap: 1,
                      bgcolor: "#f8f9fc",
                      borderTop: "1px solid rgba(0,0,0,0.06)",
                      "& > :not(style) + :not(style)": {
                        marginLeft: {
                          xs: "0px !important",
                          sm: "8px !important",
                        },
                      },
                    }}
                  >
                    <Button
                      variant="outlined"
                      onClick={handleCloseDirectRfidReplace}
                      disabled={directRfidSaving}
                      sx={{ borderRadius: "12px" }}
                    >
                      Bỏ qua
                    </Button>
                    <Button
                      variant="contained"
                      onClick={handleConfirmDirectRfidReplace}
                      disabled={directRfidSaving}
                      startIcon={
                        directRfidSaving ? (
                          <CircularProgress size={18} color="inherit" />
                        ) : (
                          <Save />
                        )
                      }
                      sx={{
                        borderRadius: "12px",
                        bgcolor: "#f57c00",
                        "&:hover": { bgcolor: "#ef6c00" },
                      }}
                    >
                      {directRfidSaving ? "Đang lưu..." : "Xác nhận cập nhật"}
                    </Button>
                  </DialogActions>
                </Dialog>
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
                          <MenuItem key="draft" value="draft">
                            Nháp
                          </MenuItem>,
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
                    label="Đến đơn vị"
                    value={locationFilter}
                    onChange={(e) => setLocationFilter(e.target.value)}
                    sx={{
                      "& .MuiOutlinedInput-root": { borderRadius: "12px" },
                    }}
                  >
                    <MenuItem value="">Tất cả</MenuItem>
                    {allLocationsForFilter.map((department) => (
                      <MenuItem
                        key={department.uuid_department}
                        value={department.uuid_department}
                      >
                        {department.name_department}
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

            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {renderCardContent()}
            </Box>
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
                    (dialogMode === "create" || dialogMode === "edit") &&
                    dialogType === "import" &&
                    ["purchased", "rented", "borrowed"].includes(formData.type);

                  // Form đơn giản cho bảo vệ tạo phiếu nhập
                  const isSecurityCreateImport =
                    isBaoVe &&
                    dialogMode === "create" &&
                    dialogType === "import";

                  return (
                    <>
                      {/* --- FORM ĐƠN GIẢN CHO BẢO VỆ TẠO PHIẾU NHẬP --- */}
                      {isSecurityCreateImport ? (
                        <>
                          <TextField
                            fullWidth
                            type="date"
                            label="Ngày tạo phiếu"
                            value={formData.date}
                            onChange={(e) =>
                              handleFormChange("date", e.target.value)
                            }
                            required
                            InputLabelProps={{ shrink: true }}
                            sx={{
                              "& .MuiOutlinedInput-root": {
                                borderRadius: "12px",
                              },
                            }}
                          />
                          <TextField
                            fullWidth
                            type="number"
                            label="Số lượng máy"
                            value={formData.quantity}
                            onChange={(e) =>
                              handleFormChange("quantity", e.target.value)
                            }
                            required
                            inputProps={{ min: 1, step: 1 }}
                            sx={{
                              "& .MuiOutlinedInput-root": {
                                borderRadius: "12px",
                              },
                            }}
                          />
                          <FileUploadComponent
                            onFilesChange={setFilesToUpload}
                            existingFiles={formData.attached_file}
                            disabled={false}
                            showNotification={showNotification}
                          />
                        </>
                      ) : dialogType === "inventory" ? (
                        <>
                          {/* --- PHẦN RIÊNG CHO PHIẾU KIỂM KÊ (INVENTORY) --- */}
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
                                  <Grid
                                    container
                                    spacing={2}
                                    sx={{
                                      pt: 1,
                                      maxHeight: 420,
                                      overflowY: "auto",
                                      pr: 0.5,
                                    }}
                                  >
                                    {formData.inventoryDetails.map((dept) => {
                                      let scannedArr = [];
                                      let scannedResultData = null;
                                      try {
                                        scannedResultData =
                                          typeof dept.scanned_result ===
                                          "string"
                                            ? JSON.parse(dept.scanned_result)
                                            : dept.scanned_result;
                                        scannedArr = Array.isArray(
                                          scannedResultData
                                        )
                                          ? scannedResultData
                                          : scannedResultData?.locations || [];
                                      } catch {
                                        scannedArr = [];
                                      }
                                      const scannedLocationsCount =
                                        scannedArr.length;
                                      const totalLocationsCount =
                                        getInventorySnapshotLocationCount(
                                          scannedResultData
                                        );
                                      const progressPercent =
                                        totalLocationsCount > 0
                                          ? Math.min(
                                              100,
                                              Math.round(
                                                (scannedLocationsCount /
                                                  totalLocationsCount) *
                                                  100
                                              )
                                            )
                                          : 0;

                                      return (
                                        <Grid
                                          size={{ xs: 12, sm: 6 }}
                                          key={dept.uuid_department}
                                        >
                                          <Paper
                                            elevation={0}
                                            variant="outlined"
                                            sx={{
                                              p: 2,
                                              borderRadius: "14px",
                                              bgcolor: "#fff",
                                              border:
                                                "1px solid rgba(0, 0, 0, 0.08)",
                                              transition:
                                                "all 0.2s ease-in-out",
                                              "&:hover": {
                                                borderColor: "#1976d2",
                                                boxShadow:
                                                  "0 4px 16px rgba(25, 118, 210, 0.1)",
                                              },
                                            }}
                                          >
                                            <Box
                                              sx={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "center",
                                                mb: 1.5,
                                                gap: 1,
                                              }}
                                            >
                                              <Typography
                                                variant="subtitle1"
                                                sx={{
                                                  fontWeight: 700,
                                                  color: "#2c3e50",
                                                }}
                                              >
                                                {dept.name_department}
                                              </Typography>
                                              {scannedArr.length > 0 ? (
                                                <Chip
                                                  label="Đã kiểm"
                                                  color="success"
                                                  size="small"
                                                  sx={{ fontWeight: 600 }}
                                                />
                                              ) : (
                                                <Chip
                                                  label="Chưa kiểm"
                                                  color="default"
                                                  size="small"
                                                  sx={{ fontWeight: 600 }}
                                                />
                                              )}
                                            </Box>

                                            <Box sx={{ mb: 2 }}>
                                              <Box
                                                sx={{
                                                  display: "flex",
                                                  justifyContent:
                                                    "space-between",
                                                  alignItems: "center",
                                                  mb: 0.5,
                                                }}
                                              >
                                                <Typography
                                                  variant="caption"
                                                  sx={{
                                                    color: "text.secondary",
                                                    fontWeight: 500,
                                                  }}
                                                >
                                                  Tiến độ
                                                </Typography>
                                                <Typography
                                                  variant="body2"
                                                  sx={{
                                                    fontWeight: 700,
                                                  }}
                                                >
                                                  {scannedLocationsCount} /{" "}
                                                  {totalLocationsCount}
                                                </Typography>
                                              </Box>
                                              <Box
                                                sx={{
                                                  width: "100%",
                                                  height: 6,
                                                  bgcolor: "#e0e0e0",
                                                  borderRadius: 3,
                                                  overflow: "hidden",
                                                }}
                                              >
                                                <Box
                                                  sx={{
                                                    width: `${progressPercent}%`,
                                                    height: "100%",
                                                    bgcolor:
                                                      progressPercent === 100
                                                        ? "#2e7d32"
                                                        : "#1976d2",
                                                    transition:
                                                      "width 0.3s ease",
                                                  }}
                                                />
                                              </Box>
                                            </Box>

                                            <Box
                                              sx={{
                                                display: "flex",
                                                justifyContent: "flex-end",
                                              }}
                                            >
                                              <Button
                                                size="small"
                                                variant="contained"
                                                color="info"
                                                startIcon={<EditNote />}
                                                onClick={() =>
                                                  handleOpenDepartmentDetail(
                                                    dept
                                                  )
                                                }
                                                sx={{
                                                  borderRadius: "10px",
                                                  textTransform: "none",
                                                  fontWeight: 600,
                                                  px: 2,
                                                }}
                                              >
                                                Chi tiết
                                              </Button>
                                            </Box>
                                          </Paper>
                                        </Grid>
                                      );
                                    })}
                                  </Grid>
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
                                        Thông số trong đợt kiểm kê (
                                        <span style={{ color: "#1565c0" }}>
                                          Sổ sách,{" "}
                                        </span>
                                        <span style={{ color: "#2e7d32" }}>
                                          Số máy hiện diện,{" "}
                                        </span>
                                        <span style={{ color: "#ed6c02" }}>
                                          Số máy khác đơn vị,{" "}
                                        </span>
                                        <span style={{ color: "#d32f2f" }}>
                                          Số máy chưa xác định
                                        </span>
                                        )
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

                                          <TableCell
                                            sx={{
                                              fontWeight: "bold",
                                              color: "#2e7d32",
                                            }}
                                            align="center"
                                          >
                                            Số máy hiện diện (
                                            <span style={{ color: "#ed6c02" }}>
                                              KĐV
                                            </span>
                                            )
                                          </TableCell>

                                          <TableCell
                                            sx={{
                                              fontWeight: "bold",
                                              color: "#d32f2f",
                                            }}
                                            align="center"
                                          >
                                            Số máy chưa xác định
                                          </TableCell>
                                        </TableRow>
                                      </TableHead>
                                      <TableBody>
                                        {(() => {
                                          let totalCheckedLocs = 0;
                                          let grandTotalLocs = 0;
                                          let grandTotalSystem = 0;
                                          let grandTotalScanned = 0;
                                          // let grandTotalCorrectDept = 0;
                                          let grandTotalMisDept = 0;

                                          // Build global scanned uuid set từ TOÀN BỘ inventoryDetails
                                          const globalScannedUuids = new Set();
                                          formData.inventoryDetails.forEach(
                                            (dept) => {
                                              try {
                                                const parsed =
                                                  typeof dept.scanned_result ===
                                                  "string"
                                                    ? JSON.parse(
                                                        dept.scanned_result
                                                      )
                                                    : dept.scanned_result;
                                                const locations = Array.isArray(
                                                  parsed
                                                )
                                                  ? parsed
                                                  : parsed?.locations || [];
                                                locations.forEach((loc) => {
                                                  (
                                                    loc.scanned_machine || []
                                                  ).forEach((m) => {
                                                    const u =
                                                      m.uuid || m.uuid_machine;
                                                    if (
                                                      u &&
                                                      !String(u).startsWith(
                                                        "NOT_FOUND"
                                                      )
                                                    ) {
                                                      globalScannedUuids.add(u);
                                                    }
                                                  });
                                                });
                                              } catch (e) {
                                                console.error(e);
                                              }
                                            }
                                          );

                                          const rows =
                                            formData.inventoryDetails.map(
                                              (dept) => {
                                                let scannedArr = [];
                                                let systemSnapshot = 0;
                                                let listBeforeScan = [];
                                                let scannedResultData = null;

                                                try {
                                                  scannedResultData =
                                                    typeof dept.scanned_result ===
                                                    "string"
                                                      ? JSON.parse(
                                                          dept.scanned_result
                                                        )
                                                      : dept.scanned_result;

                                                  if (
                                                    Array.isArray(
                                                      scannedResultData
                                                    )
                                                  ) {
                                                    scannedArr =
                                                      scannedResultData;
                                                    systemSnapshot = 0;
                                                  } else if (
                                                    scannedResultData &&
                                                    scannedResultData.locations
                                                  ) {
                                                    scannedArr =
                                                      scannedResultData.locations;
                                                    systemSnapshot =
                                                      scannedResultData.snapshot_count ||
                                                      0;
                                                  } else {
                                                    scannedArr = [];
                                                    systemSnapshot = 0;
                                                  }
                                                } catch {
                                                  scannedArr = [];
                                                  systemSnapshot = 0;
                                                }

                                                try {
                                                  listBeforeScan =
                                                    typeof dept.list_before_scan ===
                                                    "string"
                                                      ? JSON.parse(
                                                          dept.list_before_scan
                                                        )
                                                      : dept.list_before_scan ||
                                                        [];
                                                } catch {
                                                  listBeforeScan = [];
                                                }

                                                const checkedCount =
                                                  scannedArr.length;
                                                const totalLocs =
                                                  getInventorySnapshotLocationCount(
                                                    scannedResultData
                                                  );

                                                let totalScanned = 0;
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
                                                        totalScanned++;
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

                                                // Tính missing: UUID trong list_before_scan chưa quét ở BẤT KỲ ĐÂU
                                                const allDeptUuids =
                                                  listBeforeScan.flatMap(
                                                    (loc) =>
                                                      (loc.machines || []).map(
                                                        (m) => m.uuid_machine
                                                      )
                                                  );
                                                const missingCount =
                                                  allDeptUuids.length > 0
                                                    ? allDeptUuids.filter(
                                                        (uuid) =>
                                                          !globalScannedUuids.has(
                                                            uuid
                                                          )
                                                      ).length
                                                    : Math.max(
                                                        0,
                                                        systemSnapshot -
                                                          correctDeptCount
                                                      );

                                                totalCheckedLocs +=
                                                  checkedCount;
                                                grandTotalLocs += totalLocs;
                                                grandTotalSystem +=
                                                  systemSnapshot;
                                                grandTotalScanned +=
                                                  totalScanned;
                                                // grandTotalCorrectDept +=
                                                correctDeptCount;
                                                grandTotalMisDept +=
                                                  misDeptCount;

                                                return {
                                                  id: dept.id_department,
                                                  uuid: dept.uuid_department,
                                                  name: dept.name_department,
                                                  progress: `${checkedCount}/${totalLocs}`,
                                                  isFull:
                                                    checkedCount >= totalLocs &&
                                                    totalLocs > 0,
                                                  system: systemSnapshot,
                                                  scanned: totalScanned,
                                                  correctDept: correctDeptCount,
                                                  misDept: misDeptCount,
                                                  missing: missingCount,
                                                };
                                              }
                                            );

                                          // Tổng missing toàn phiếu: tất cả UUID của mọi đơn vị chưa quét (unique)
                                          const allTicketUuids =
                                            formData.inventoryDetails.flatMap(
                                              (dept) => {
                                                try {
                                                  const lbs =
                                                    typeof dept.list_before_scan ===
                                                    "string"
                                                      ? JSON.parse(
                                                          dept.list_before_scan
                                                        )
                                                      : dept.list_before_scan ||
                                                        [];
                                                  return lbs.flatMap((loc) =>
                                                    (loc.machines || []).map(
                                                      (m) => m.uuid_machine
                                                    )
                                                  );
                                                } catch {
                                                  return [];
                                                }
                                              }
                                            );
                                          const grandTotalMissing = [
                                            ...new Set(allTicketUuids),
                                          ].filter(
                                            (uuid) =>
                                              !globalScannedUuids.has(uuid)
                                          ).length;

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

                                                  <TableCell
                                                    align="center"
                                                    sx={{
                                                      color: "#2e7d32",
                                                      fontWeight: 600,
                                                    }}
                                                  >
                                                    {row.scanned > 0 ? (
                                                      <>
                                                        {new Intl.NumberFormat(
                                                          "en-US"
                                                        ).format(row.scanned)}
                                                        {row.misDept > 0 && (
                                                          <Typography
                                                            component="span"
                                                            sx={{
                                                              fontSize:
                                                                "0.85rem",
                                                              color: "#2e7d32",
                                                              ml: 0.5,
                                                              fontWeight: 600,
                                                            }}
                                                          >
                                                            (
                                                            <span
                                                              style={{
                                                                color:
                                                                  "#ed6c02",
                                                              }}
                                                            >
                                                              KĐV:{" "}
                                                              {new Intl.NumberFormat(
                                                                "en-US"
                                                              ).format(
                                                                row.misDept
                                                              )}
                                                            </span>
                                                            )
                                                          </Typography>
                                                        )}
                                                      </>
                                                    ) : (
                                                      "0"
                                                    )}
                                                  </TableCell>

                                                  <TableCell
                                                    align="center"
                                                    sx={{
                                                      color: "#d32f2f",
                                                      fontWeight: 600,
                                                    }}
                                                  >
                                                    {/* {row.missing > 0 ? (
                                                      <Button
                                                        size="small"
                                                        variant="outlined"
                                                        color="error"
                                                        onClick={() =>
                                                          handleViewMissingMachines(
                                                            null,
                                                            row.name,
                                                            row.uuid
                                                          )
                                                        }
                                                        sx={{
                                                          minWidth: "auto",
                                                          px: 2,
                                                          py: 0.5,
                                                          fontWeight: "bold",
                                                          border: "2px solid",
                                                        }}
                                                      >
                                                        {new Intl.NumberFormat(
                                                          "en-US"
                                                        ).format(row.missing)}
                                                      </Button>
                                                    ) : (
                                                      new Intl.NumberFormat(
                                                        "en-US"
                                                      ).format(row.missing)
                                                    )} */}
                                                    {new Intl.NumberFormat(
                                                      "en-US"
                                                    ).format(row.missing)}
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
                                                  {grandTotalScanned > 0 ? (
                                                    <>
                                                      {new Intl.NumberFormat(
                                                        "en-US"
                                                      ).format(
                                                        grandTotalScanned
                                                      )}
                                                      {grandTotalMisDept >
                                                        0 && (
                                                        <Typography
                                                          component="span"
                                                          sx={{
                                                            fontSize: "0.9rem",
                                                            color: "#2e7d32",
                                                            ml: 0.5,
                                                            fontWeight: 600,
                                                          }}
                                                        >
                                                          (
                                                          <span
                                                            style={{
                                                              color: "#ed6c02",
                                                            }}
                                                          >
                                                            KĐV:{" "}
                                                            {new Intl.NumberFormat(
                                                              "en-US"
                                                            ).format(
                                                              grandTotalMisDept
                                                            )}
                                                          </span>
                                                          )
                                                        </Typography>
                                                      )}
                                                    </>
                                                  ) : (
                                                    "0"
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
                                                  {grandTotalMissing > 0 ? (
                                                    <Button
                                                      size="small"
                                                      variant="outlined"
                                                      color="error"
                                                      onClick={
                                                        handleViewAllMissingMachines
                                                      }
                                                      sx={{
                                                        minWidth: "auto",
                                                        px: 2,
                                                        py: 0.5,
                                                        fontWeight: "bold",
                                                        border: "2px solid",
                                                      }}
                                                    >
                                                      {new Intl.NumberFormat(
                                                        "en-US"
                                                      ).format(
                                                        grandTotalMissing
                                                      )}
                                                    </Button>
                                                  ) : (
                                                    new Intl.NumberFormat(
                                                      "en-US"
                                                    ).format(grandTotalMissing)
                                                  )}
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
                            sx={dialogMode === "view" ? DISABLED_VIEW_SX : {}}
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

                      {/* --- ẨN CÁC FIELD DƯ THỪA KHI LÀ INVENTORY HOẶC BẢO VỆ TẠO PHIẾU --- */}
                      {dialogType !== "inventory" &&
                        !isSecurityCreateImport && (
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
                              disabled={
                                (dialogMode !== "edit" && isFormDisabled) ||
                                dialogMode === "view" ||
                                dialogMode === "edit"
                              }
                              required
                              InputLabelProps={{ shrink: true }}
                              sx={
                                dialogMode === "view" || dialogMode === "edit"
                                  ? DISABLED_VIEW_SX
                                  : {}
                              }
                            />
                            {dialogType === "import" && (
                              <TextField
                                fullWidth
                                type="number"
                                label="Số lượng máy"
                                value={
                                  formData.quantity ??
                                  (Array.isArray(formData.machines)
                                    ? formData.machines.length
                                    : 0)
                                }
                                disabled
                                InputLabelProps={{ shrink: true }}
                                sx={DISABLED_VIEW_SX}
                              />
                            )}
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
                                (dialogMode !== "edit" && isFormDisabled) ||
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
                        (() => {
                          const locName = filteredLocations
                            .find(
                              (l) =>
                                l.uuid_location === formData.to_location_uuid
                            )
                            ?.name_location?.toLowerCase()
                            .replace(/\s+/g, " ")
                            .trim();
                          if (!locName || !locName.includes("kho"))
                            return false;
                          // Ẩn với các kho đặc biệt (mặc định in_use)
                          const HIDDEN_WAREHOUSES = [
                            "kho npl",
                            "kho tp1",
                            "kho tp2",
                          ];
                          return !HIDDEN_WAREHOUSES.includes(locName);
                        })() && (
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

                      {/* --- CHỌN MÁY MÓC (CREATE/EDIT IMPORT/EXPORT/INTERNAL) --- */}
                      {/* ẨN KHI LÀ INVENTORY HOẶC BẢO VỆ TẠO PHIẾU */}
                      {(dialogMode === "create" || dialogMode === "edit") &&
                        dialogType !== "inventory" &&
                        !isSecurityCreateImport && (
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
                      {/* ẨN KHI LÀ INVENTORY (Vì Inventory đã có Ghi chú riêng ở trên) HOẶC BẢO VỆ TẠO PHIẾU */}
                      {dialogType !== "inventory" &&
                        !isSecurityCreateImport && (
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
                              sx={dialogMode === "view" ? DISABLED_VIEW_SX : {}}
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
                                <Route sx={{ transform: "rotate(90deg)" }} />{" "}
                                Luồng duyệt
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
                                  const fullFlow = selectedTicket.approval_flow;

                                  // Tách step hệ thống (ma_nv === "SYSTEM")
                                  const dlgSystemStep = fullFlow.find(
                                    (s) => s.ma_nv === "SYSTEM"
                                  );
                                  const dlgNormalFlow = fullFlow.filter(
                                    (s) => s.ma_nv !== "SYSTEM"
                                  );

                                  // 1. Gom nhóm các bước duyệt theo step_flow
                                  const groupedSteps = dlgNormalFlow.reduce(
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

                                  return (
                                    <>
                                      {sortedStepKeys.map(
                                        (stepKey, groupIndex) => {
                                          const group = groupedSteps[stepKey];
                                          const isLastGroup =
                                            groupIndex ===
                                              sortedStepKeys.length - 1 &&
                                            !dlgSystemStep;

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
                                                    statusLower.includes(
                                                      "đồng ý"
                                                    );
                                                  const isRejected =
                                                    statusLower.includes(
                                                      "hủy"
                                                    ) ||
                                                    statusLower.includes(
                                                      "từ chối"
                                                    );
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
                                                          backgroundColor:
                                                            bgColor,
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
                                                            bgcolor:
                                                              statusColor,
                                                            color: "#fff",
                                                            fontWeight: "bold",
                                                          }}
                                                        >
                                                          {isSkipped
                                                            ? "-"
                                                            : Number(stepKey) +
                                                              1}
                                                        </Avatar>

                                                        <Box>
                                                          <Box
                                                            sx={{
                                                              display: "flex",
                                                              alignItems:
                                                                "center",
                                                              gap: 1,
                                                            }}
                                                          >
                                                            <Typography
                                                              variant="body2"
                                                              sx={{
                                                                fontWeight: 700,
                                                                fontSize:
                                                                  "0.95rem",
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
                                                                  color:
                                                                    "#fd3333",
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
                                                              fontSize:
                                                                "0.8rem",
                                                              mt: 0.5,
                                                              color:
                                                                "text.secondary",
                                                            }}
                                                          >
                                                            {step.ma_nv} •{" "}
                                                            <span
                                                              style={{
                                                                color:
                                                                  statusColor,
                                                                fontStyle:
                                                                  "italic",
                                                                fontWeight:
                                                                  "bold",
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
                                      )}

                                      {/* Step hệ thống tự động hủy */}
                                      {dlgSystemStep && (
                                        <>
                                          {sortedStepKeys.length > 0 && (
                                            <Box
                                              sx={{
                                                mx: 1,
                                                minWidth: 20,
                                                height: 2,
                                                bgcolor: "#ef9a9a",
                                                flexShrink: 0,
                                              }}
                                            />
                                          )}
                                          <Box
                                            sx={{
                                              display: "flex",
                                              alignItems: "center",
                                              gap: 1.5,
                                              px: 2.5,
                                              py: 1,
                                              borderRadius: "24px",
                                              backgroundColor: "#ffebee",
                                              border: "2px dashed #ef5350",
                                              minWidth: "240px",
                                              transition: "transform 0.2s",
                                              "&:hover": {
                                                transform: "translateY(-2px)",
                                              },
                                            }}
                                          >
                                            <Avatar
                                              sx={{
                                                width: 30,
                                                height: 30,
                                                bgcolor: "#d32f2f",
                                                color: "#fff",
                                              }}
                                            >
                                              <Autorenew
                                                sx={{ fontSize: 18 }}
                                              />
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
                                                    color: "#b71c1c",
                                                  }}
                                                >
                                                  {dlgSystemStep.ten_nv}
                                                </Typography>
                                                <Chip
                                                  label="Tự động"
                                                  size="small"
                                                  sx={{
                                                    height: 20,
                                                    fontSize: "0.75rem",
                                                    bgcolor: "#ffcdd2",
                                                    color: "#b71c1c",
                                                    fontWeight: 700,
                                                    border: "1px solid #ef9a9a",
                                                  }}
                                                />
                                              </Box>
                                              <Typography
                                                variant="caption"
                                                sx={{
                                                  display: "block",
                                                  lineHeight: 1.2,
                                                  fontSize: "0.8rem",
                                                  mt: 0.5,
                                                  color: "#d32f2f",
                                                  fontStyle: "italic",
                                                  fontWeight: "bold",
                                                }}
                                              >
                                                {dlgSystemStep.status_text}
                                              </Typography>
                                            </Box>
                                          </Box>
                                        </>
                                      )}
                                    </>
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
              "& > :not(style) + :not(style)": {
                marginLeft: { xs: "0px !important", sm: "8px !important" },
              },
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
                {dialogMode === "edit" ? "Hủy" : "Đóng"}
              </Button>
              {dialogMode === "edit" && dialogType === "import" && (
                <>
                  <Button
                    variant="outlined"
                    onClick={handleUpdateDraft}
                    disabled={loading}
                    startIcon={<Save />}
                    sx={{
                      borderRadius: "12px",
                      px: 3,
                      width: { xs: "100%", sm: "auto" },
                    }}
                  >
                    {loading ? <CircularProgress size={24} /> : "Lưu"}
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleCompleteDraft}
                    disabled={loading}
                    startIcon={<CheckCircleOutline />}
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
                      "Đóng phiếu & Gửi duyệt"
                    )}
                  </Button>
                </>
              )}
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
                  {loading ? (
                    <CircularProgress size={24} />
                  ) : isBaoVe && dialogType === "import" ? (
                    "Tạo Phiếu Nháp"
                  ) : (
                    "Tạo Phiếu"
                  )}
                </Button>
              )}
              {dialogMode === "view" &&
                dialogType === "export" &&
                isBaoVe &&
                selectedTicket?.status === "completed" &&
                selectedTicket?.confirm !== 1 && (
                  <Button
                    variant="contained"
                    onClick={handleConfirmExportGate}
                    disabled={loading || confirmingExportGate}
                    startIcon={<CheckCircleOutline />}
                    sx={{
                      borderRadius: "12px",
                      background: "linear-gradient(45deg, #2e7d32, #4caf50)",
                      px: 3,
                      width: { xs: "100%", sm: "auto" },
                    }}
                  >
                    {confirmingExportGate ? (
                      <CircularProgress size={24} />
                    ) : (
                      "Xác nhận ra cổng"
                    )}
                  </Button>
                )}
              {dialogMode === "view" &&
                dialogType === "inventory" &&
                selectedTicket?.status === "draft" &&
                formData.inventoryDetails?.every((loc) => loc.is_completed) &&
                areAllMissingMachinesConfirmed() &&
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
                    fetchAndApplyDefaultSpecs(
                      typeName,
                      newMachineData.attribute_machine
                    );
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
                    const attrName = newValue ? newValue.name : "";
                    handleCreateMachineInputChange(
                      "attribute_machine",
                      attrName
                    );
                    fetchAndApplyDefaultSpecs(
                      newMachineData.type_machine,
                      attrName
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
                  <Chip label="Thông số kỹ thuật" />
                </Divider>
              </Grid>
              <Grid size={{ xs: 12, sm: 3 }}>
                <TextField
                  fullWidth
                  label="Công suất (W)"
                  value={newMachineData.power?.toString() || ""}
                  onChange={(e) =>
                    handleCreateMachineInputChange(
                      "power",
                      sanitizeDecimalInput(e.target.value)
                    )
                  }
                  inputProps={{ inputMode: "decimal" }}
                  disabled={!canCreateOrImportMachines}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 3 }}>
                <TextField
                  fullWidth
                  label="Áp suất (MPa)"
                  value={newMachineData.pressure?.toString() || ""}
                  onChange={(e) =>
                    handleCreateMachineInputChange(
                      "pressure",
                      sanitizeDecimalInput(e.target.value)
                    )
                  }
                  inputProps={{ inputMode: "decimal" }}
                  disabled={!canCreateOrImportMachines}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 3 }}>
                <TextField
                  fullWidth
                  label="Điện áp (V)"
                  value={newMachineData.voltage?.toString() || ""}
                  onChange={(e) =>
                    handleCreateMachineInputChange(
                      "voltage",
                      sanitizeDecimalInput(e.target.value)
                    )
                  }
                  inputProps={{ inputMode: "decimal" }}
                  disabled={!canCreateOrImportMachines}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 3 }}>
                <TextField
                  fullWidth
                  label="Lưu lượng khí nén (lít/phút)"
                  value={newMachineData.air_volume?.toString() || ""}
                  onChange={(e) =>
                    handleCreateMachineInputChange(
                      "air_volume",
                      sanitizeDecimalInput(e.target.value)
                    )
                  }
                  inputProps={{ inputMode: "decimal" }}
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
              "& > :not(style) + :not(style)": {
                marginLeft: { xs: "0px !important", sm: "8px !important" },
              },
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
              "& > :not(style) + :not(style)": {
                marginLeft: { xs: "0px !important", sm: "8px !important" },
              },
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

        <RfidDialog
          mode="bulk-import"
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

        <RfidDialog
          mode="radar"
          open={openRecurringMissRfidDialog}
          onClose={() => setOpenRecurringMissRfidDialog(false)}
          title="Cập nhật thẻ RFID"
          subtitle="Quét thẻ cũ trong danh sách → nhập mã thẻ mới"
          variant="batch"
          selectedMachines={recurringMissRfidReplaceTargets}
          skipResolveApi
          onReplaceRfid={handleRecurringMissRfidReplace}
        />

        <RfidDialog
          mode="radar"
          open={openInventoryRfidSearchDialog}
          hideScanModeToggle
          onClose={() => {
            setOpenInventoryRfidSearchDialog(false);
            setBatchScanPreSelectedLocation(null);
            setBatchScanAllMissing([]);
          }}
          subtitle={
            batchScanPreSelectedLocation
              ? [
                  currentDepartment?.name_department,
                  inventoryAllLocations.find(
                    (l) => l.uuid_location === batchScanPreSelectedLocation
                  )?.name_location || batchPickerLocation?.name_location,
                ]
                  .filter(Boolean)
                  .join(" — ") || undefined
              : undefined
          }
          selectedMachines={inventoryRfidSearchTargets}
          skipResolveApi
          inventoryLocations={(() => {
            if (isAdmin || isPhongCoDien) return inventoryAllLocations;
            const userDeptId = Number(user?.phongban_id);
            if (Number.isNaN(userDeptId)) return [];

            return (inventoryAllLocations || []).filter((loc) => {
              const dept = (formData.inventoryDetails || []).find(
                (d) => d.uuid_department === loc?._dept_uuid
              );
              return Number(dept?.id_phong_ban) === userDeptId;
            });
          })()}
          onFoundMachineInventory={
            batchScanPreSelectedLocation
              ? null
              : handleInventoryMachineFoundFromRfidSearch
          }
          preSelectedLocationUuid={batchScanPreSelectedLocation}
          onBatchConfirm={
            batchScanPreSelectedLocation
              ? handleBatchConfirmFromRfidSearch
              : null
          }
        />

        {/* Missing Machines Dialog */}
        <Dialog
          open={openMissingMachinesDialog}
          onClose={() => setOpenMissingMachinesDialog(false)}
          maxWidth="md"
          fullWidth
          fullScreen={isMobile}
          PaperProps={{ sx: { borderRadius: isMobile ? 0 : "20px" } }}
        >
          <DialogTitle
            sx={{
              background: "linear-gradient(45deg, #d32f2f, #f44336)",
              color: "white",
              fontWeight: 700,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Box>
              <Typography
                component="span"
                variant={isMobile ? "h6" : "h5"}
                sx={{ fontWeight: 700 }}
              >
                Danh sách máy chưa xác định
              </Typography>
              <Typography variant="caption" sx={{ display: "block", mt: 0.5 }}>
                {missingMachinesLocation === "Toàn bộ phiếu kiểm kê"
                  ? "Tổng công ty"
                  : missingMachinesLocation === "Toàn bộ đơn vị"
                    ? `Đơn vị: ${currentDepartment?.name_department || ""}`
                    : missingMachinesLocation?.includes("Xưởng") ||
                        missingMachinesLocation?.includes("Phòng")
                      ? `Đơn vị: ${missingMachinesLocation}`
                      : `Vị trí: ${missingMachinesLocation || "Chưa xác định"}`}
              </Typography>
            </Box>
            <IconButton
              onClick={() => setOpenMissingMachinesDialog(false)}
              sx={{ color: "white" }}
            >
              <Close />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ mt: 2 }}>
            {missingMachines.length === 0 ? (
              <Box sx={{ textAlign: "center", py: 4 }}>
                <Typography color="text.secondary">
                  Không có máy chưa xác định
                </Typography>
              </Box>
            ) : (
              <TableContainer component={Paper} elevation={0}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: "#f5f5f5" }}>
                      <TableCell sx={{ fontWeight: "bold" }}>STT</TableCell>
                      <TableCell sx={{ fontWeight: "bold" }}>
                        Tên thiết bị
                      </TableCell>
                      <TableCell sx={{ fontWeight: "bold" }}>Serial</TableCell>
                      <TableCell sx={{ fontWeight: "bold" }}>RFID</TableCell>
                      <TableCell sx={{ fontWeight: "bold" }}>
                        Vị trí ghi nhận
                      </TableCell>
                      <TableCell sx={{ fontWeight: "bold" }}>
                        Trạng thái
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {missingMachines.map((machine, index) => (
                      <TableRow key={machine.uuid_machine} hover>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>
                          {`${machine.type_machine || ""} ${
                            machine.attribute_machine || ""
                          } - ${machine.model_machine || ""}`.trim()}
                        </TableCell>
                        <TableCell>{machine.serial_machine || "-"}</TableCell>
                        <TableCell>{machine.RFID_machine || "-"}</TableCell>
                        <TableCell>
                          {machine.previous_location_name || "-"}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={machine.found_at}
                            size="small"
                            color={
                              machine.found_at === "Chưa quét"
                                ? "default"
                                : machine.found_at === "Không tìm thấy"
                                  ? "error"
                                  : "warning"
                            }
                            variant={
                              machine.found_at === "Chưa quét"
                                ? "outlined"
                                : "filled"
                            }
                            sx={{ fontWeight: 600 }}
                          />
                          {/* {machine.not_found_confirmed && (
                            <Chip
                              label="Đã xác nhận"
                              size="small"
                              color="success"
                              variant="filled"
                              sx={{ fontWeight: 700, ml: 1 }}
                            />
                          )} */}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </DialogContent>
          <DialogActions
            sx={{
              p: 2,
              gap: 1,
              ...(isMobile
                ? {
                    display: "flex",
                    flexDirection: "column", // Chuyển sang xếp chồng dọc trên mobile
                    alignItems: "stretch",
                  }
                : {
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                  }),
              "& > :not(style) + :not(style)": {
                marginLeft: { xs: "0px !important", sm: "8px !important" },
              },
            }}
          >
            {(() => {
              const canConfirmAll =
                !isViewOnly &&
                selectedTicket?.status === "draft" &&
                missingMachines.some(
                  (m) => m.found_at === "Chưa quét" && !m.not_found_confirmed
                );
              const canRfidSearch =
                !isViewOnly &&
                selectedTicket?.status === "draft" &&
                missingMachines.some(missingMachineEligibleForRfidSearch);

              const placeholderSx = {
                width: "100%",
                minHeight: 44,
                borderRadius: "8px",
                visibility: "hidden",
              };
              const commonBtnSx = {
                width: "100%",
                minHeight: 44,
                textAlign: "center",
                lineHeight: 1.2,
                whiteSpace: "normal",
                px: 1,
                fontSize: 12,
              };

              // Mobile: luôn render đúng layout 1 + 3 (có placeholder)
              if (isMobile) {
                return (
                  <>
                    {canConfirmAll ? (
                      <Button
                        onClick={handleConfirmAllMissingMachines}
                        variant="contained"
                        disabled={confirmingMissingAll}
                        sx={{
                          ...commonBtnSx,
                          background:
                            "linear-gradient(45deg, #2e7d32, #4caf50)",
                          "&:hover": {
                            background:
                              "linear-gradient(45deg, #1b5e20, #388e3c)",
                          },
                          borderRadius: "8px",
                          fontWeight: 800,
                          gridColumn: "1 / -1",
                        }}
                      >
                        {confirmingMissingAll
                          ? "Đang lưu..."
                          : "Xác nhận không tìm thấy"}
                      </Button>
                    ) : (
                      <Box
                        aria-hidden
                        sx={{ ...placeholderSx, gridColumn: "1 / -1" }}
                      />
                    )}

                    {canRfidSearch ? (
                      <Button
                        onClick={handleOpenBatchScanPicker}
                        variant="contained"
                        sx={{
                          ...commonBtnSx,
                          background:
                            "linear-gradient(45deg, #ff9800, #ff5722)",
                          "&:hover": {
                            background:
                              "linear-gradient(45deg, #f57c00, #e64a19)",
                          },
                          borderRadius: "8px",
                          fontWeight: 700,
                        }}
                      >
                        Dò RFID theo chuyền
                      </Button>
                    ) : (
                      <Box aria-hidden sx={placeholderSx} />
                    )}

                    {canRfidSearch ? (
                      <Button
                        onClick={handleRfidSearchFromMissingMachines}
                        variant="contained"
                        sx={{
                          ...commonBtnSx,
                          bgcolor: "#1976d2",
                          "&:hover": { bgcolor: "#1565c0" },
                          borderRadius: "8px",
                        }}
                      >
                        Dò tìm RFID máy chưa quét (
                        {
                          missingMachines.filter(
                            missingMachineEligibleForRfidSearch
                          ).length
                        }
                        )
                      </Button>
                    ) : (
                      <Box aria-hidden sx={placeholderSx} />
                    )}

                    <Button
                      onClick={() => setOpenMissingMachinesDialog(false)}
                      variant="contained"
                      sx={{
                        ...commonBtnSx,
                        bgcolor: "#d32f2f",
                        "&:hover": { bgcolor: "#b71c1c" },
                      }}
                    >
                      Đóng
                    </Button>
                  </>
                );
              }

              // Desktop: render điều kiện như trước (không cần placeholder)
              return (
                <>
                  {canConfirmAll && (
                    <Button
                      onClick={handleConfirmAllMissingMachines}
                      variant="contained"
                      disabled={confirmingMissingAll}
                      sx={{
                        background: "linear-gradient(45deg, #2e7d32, #4caf50)",
                        "&:hover": {
                          background:
                            "linear-gradient(45deg, #1b5e20, #388e3c)",
                        },
                        borderRadius: "8px",
                        fontWeight: 800,
                      }}
                    >
                      {confirmingMissingAll
                        ? "Đang lưu..."
                        : "Xác nhận không tìm thấy"}
                    </Button>
                  )}

                  {canRfidSearch && (
                    <Button
                      onClick={handleOpenBatchScanPicker}
                      variant="contained"
                      startIcon={<WifiTethering />}
                      sx={{
                        background: "linear-gradient(45deg, #ff9800, #ff5722)",
                        "&:hover": {
                          background:
                            "linear-gradient(45deg, #f57c00, #e64a19)",
                        },
                        borderRadius: "8px",
                        fontWeight: 700,
                      }}
                    >
                      Dò tìm RFID hàng loạt theo chuyền
                    </Button>
                  )}

                  {canRfidSearch && (
                    <Button
                      onClick={handleRfidSearchFromMissingMachines}
                      variant="contained"
                      startIcon={<WifiTethering />}
                      sx={{
                        bgcolor: "#1976d2",
                        "&:hover": { bgcolor: "#1565c0" },
                        borderRadius: "8px",
                      }}
                    >
                      Dò tìm RFID máy chưa quét (
                      {
                        missingMachines.filter(
                          missingMachineEligibleForRfidSearch
                        ).length
                      }
                      )
                    </Button>
                  )}

                  <Button
                    onClick={() => setOpenMissingMachinesDialog(false)}
                    variant="contained"
                    sx={{
                      bgcolor: "#d32f2f",
                      "&:hover": { bgcolor: "#b71c1c" },
                    }}
                  >
                    Đóng
                  </Button>
                </>
              );
            })()}
          </DialogActions>
        </Dialog>

        {/* Batch Scan Picker Dialog: chọn đơn vị + vị trí trước khi quét hàng loạt */}
        <Dialog
          open={openBatchScanPicker}
          onClose={() => setOpenBatchScanPicker(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{ sx: { borderRadius: "20px" } }}
        >
          <DialogTitle
            sx={{
              background: "linear-gradient(45deg, #ff9800, #ff5722)",
              color: "white",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <WifiTethering />
              <Box>
                <Typography variant="h6" fontWeight={700}>
                  Quét hàng loạt vào vị trí
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.85 }}>
                  {batchPickerStep === 1
                    ? "Bước 1/2: Chọn đơn vị"
                    : `Bước 2/2: Chọn vị trí — ${batchPickerDept?.name_department}`}
                </Typography>
              </Box>
            </Box>
            <IconButton
              onClick={() => setOpenBatchScanPicker(false)}
              sx={{ color: "white" }}
            >
              <Close />
            </IconButton>
          </DialogTitle>

          <DialogContent sx={{ pt: 3, pb: 1 }}>
            {batchPickerLoading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                <CircularProgress />
              </Box>
            ) : batchPickerStep === 1 ? (
              /* BƯỚC 1: Chọn đơn vị */
              <Stack spacing={1.5} sx={{ pt: 2, pb: 1 }}>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 1 }}
                >
                  Chọn đơn vị quét máy vào:
                </Typography>
                {(formData.inventoryDetails || [])
                  .filter((dept) => {
                    if (isAdmin || isPhongCoDien) return true;

                    return (
                      Number(dept.id_department) ===
                        Number(user?.phongban_id) ||
                      Number(dept.id_phong_ban) === Number(user?.phongban_id)
                    );
                  })
                  .map((dept) => (
                    <Card
                      key={dept.uuid_department}
                      variant="outlined"
                      onClick={() => handleBatchPickerSelectDept(dept)}
                      sx={{
                        p: 2,
                        cursor: "pointer",
                        borderRadius: "12px",
                        borderColor: "rgba(255,152,0,0.3)",
                        transition: "all 0.2s",
                        "&:hover": {
                          borderColor: "#ff9800",
                          bgcolor: "rgba(255,152,0,0.05)",
                          transform: "translateX(4px)",
                        },
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <Typography fontWeight={600}>
                          {dept.name_department}
                        </Typography>
                        <ArrowForward sx={{ color: "#ff9800", fontSize: 20 }} />
                      </Box>
                    </Card>
                  ))}
              </Stack>
            ) : (
              /* BƯỚC 2: Chọn vị trí */
              <Stack spacing={1.5} sx={{ pt: 2, pb: 1 }}>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 1 }}
                >
                  Chọn vị trí trong{" "}
                  <strong>{batchPickerDept?.name_department}</strong> để quét
                  máy vào:
                </Typography>
                {batchPickerLocations.length === 0 ? (
                  <Alert severity="warning" sx={{ borderRadius: "12px" }}>
                    Đơn vị này chưa có vị trí nào.
                  </Alert>
                ) : (
                  batchPickerLocations.map((loc) => (
                    <Card
                      key={loc.uuid_location}
                      variant="outlined"
                      onClick={() => setBatchPickerLocation(loc)}
                      sx={{
                        p: 2,
                        cursor: "pointer",
                        borderRadius: "12px",
                        borderColor:
                          batchPickerLocation?.uuid_location ===
                          loc.uuid_location
                            ? "#ff9800"
                            : "rgba(0,0,0,0.12)",
                        bgcolor:
                          batchPickerLocation?.uuid_location ===
                          loc.uuid_location
                            ? "rgba(255,152,0,0.08)"
                            : "transparent",
                        transition: "all 0.2s",
                        "&:hover": {
                          borderColor: "#ff9800",
                          bgcolor: "rgba(255,152,0,0.05)",
                        },
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <Typography fontWeight={600}>
                          {loc.name_location}
                        </Typography>
                        {batchPickerLocation?.uuid_location ===
                          loc.uuid_location && (
                          <Chip
                            label="Đã chọn"
                            size="small"
                            color="warning"
                            sx={{ fontWeight: 700 }}
                          />
                        )}
                      </Box>
                    </Card>
                  ))
                )}
              </Stack>
            )}
          </DialogContent>

          <DialogActions
            sx={{
              p: 2,
              gap: 1,
              "& > :not(style) + :not(style)": {
                marginLeft: { xs: "0px !important", sm: "8px !important" },
              },
            }}
          >
            {batchPickerStep === 2 && (
              <Button
                onClick={() => {
                  setBatchPickerStep(1);
                  setBatchPickerLocation(null);
                }}
                variant="outlined"
                color="inherit"
                startIcon={<ArrowBack />}
                sx={{ borderRadius: "10px" }}
              >
                Quay lại
              </Button>
            )}
            <Box sx={{ flex: 1 }} />
            <Button
              onClick={() => setOpenBatchScanPicker(false)}
              variant="outlined"
              color="inherit"
              sx={{ borderRadius: "10px" }}
            >
              Hủy
            </Button>
            {batchPickerStep === 2 && (
              <Button
                onClick={handleBatchPickerConfirm}
                variant="contained"
                disabled={!batchPickerLocation}
                sx={{
                  background: "linear-gradient(45deg, #ff9800, #ff5722)",
                  borderRadius: "10px",
                  fontWeight: 700,
                  px: 3,
                }}
              >
                Bắt đầu quét
              </Button>
            )}
          </DialogActions>
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
                        onChange={(e, val) => {
                          setSelectedLocationForScan(val);
                          setInventoryScannedList([]);
                          setDuplicateMachineChoices({});
                          setCollapsedGroups({});
                        }}
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
                        <Box
                          sx={{
                            mb: 2,
                            maxHeight: 500,
                            overflow: "auto",
                          }}
                        >
                          {(() => {
                            // Phân loại máy thành 4 nhóm
                            const correctLocation = [];
                            const wrongLocation = [];
                            const notFound = [];
                            const alreadyScanned = [];

                            inventoryScannedList.forEach((machine) => {
                              const isMislocation =
                                machine.uuid_location !==
                                selectedLocationForScan?.uuid_location;
                              const isDuplicate =
                                machine.isDuplicateInCurrentDept;
                              const isNotFound =
                                machine.isNotFound === true ||
                                (machine.uuid_machine &&
                                  machine.uuid_machine.startsWith(
                                    "NOT_FOUND_"
                                  ));

                              if (isDuplicate) {
                                alreadyScanned.push(machine);
                              } else if (isNotFound) {
                                notFound.push(machine);
                              } else if (isMislocation) {
                                wrongLocation.push(machine);
                              } else {
                                correctLocation.push(machine);
                              }
                            });

                            const renderMachineGroup = (
                              title,
                              machines,
                              groupColor
                            ) => {
                              if (machines.length === 0) return null;

                              const isCollapsed =
                                collapsedGroups[title] === undefined
                                  ? true
                                  : collapsedGroups[title];

                              return (
                                <Box key={title} sx={{ mb: 3 }}>
                                  <Stack
                                    direction="row"
                                    alignItems="center"
                                    justifyContent="space-between"
                                    sx={{
                                      cursor: "pointer",
                                      mb: 1,
                                      p: 1,
                                      borderRadius: "8px",
                                      "&:hover": {
                                        bgcolor: "rgba(0, 0, 0, 0.04)",
                                      },
                                    }}
                                    onClick={() => {
                                      setCollapsedGroups((prev) => ({
                                        ...prev,
                                        [title]:
                                          prev[title] === undefined
                                            ? false
                                            : !prev[title],
                                      }));
                                    }}
                                  >
                                    <Stack
                                      direction="row"
                                      alignItems="center"
                                      gap={1}
                                    >
                                      <Typography
                                        variant="subtitle1"
                                        sx={{
                                          fontWeight: 600,
                                          color: groupColor,
                                        }}
                                      >
                                        {title}
                                      </Typography>
                                      <Chip
                                        label={machines.length}
                                        size="small"
                                        sx={{
                                          bgcolor: groupColor,
                                          color: "#fff",
                                          fontWeight: 600,
                                        }}
                                      />
                                    </Stack>
                                    <IconButton size="small">
                                      <ExpandMore
                                        sx={{
                                          transform: isCollapsed
                                            ? "rotate(0deg)"
                                            : "rotate(180deg)",
                                          transition: "transform 0.3s",
                                          color: groupColor,
                                        }}
                                      />
                                    </IconButton>
                                  </Stack>

                                  {!isCollapsed && (
                                    <TableContainer
                                      component={Paper}
                                      variant="outlined"
                                      sx={{
                                        borderRadius: "12px",
                                      }}
                                    >
                                      <Table size="small">
                                        <TableHead>
                                          <TableRow>
                                            <TableCell sx={{ fontWeight: 600 }}>
                                              Tên máy
                                            </TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>
                                              Serial
                                            </TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>
                                              RFID
                                            </TableCell>
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
                                              Lưu vào
                                            </TableCell>
                                          </TableRow>
                                        </TableHead>
                                        <TableBody>
                                          {machines.map((machine, index) => {
                                            const isMislocation =
                                              machine.uuid_location !==
                                              selectedLocationForScan?.uuid_location;
                                            const isDuplicate =
                                              machine.isDuplicateInCurrentDept;
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
                                                    machine.attribute_machine ||
                                                    ""
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
                                                <TableCell>
                                                  {machineName}
                                                </TableCell>
                                                <TableCell>
                                                  {machine.serial_machine ||
                                                    "-"}
                                                </TableCell>
                                                <TableCell>
                                                  {machine.RFID_machine || "-"}
                                                </TableCell>
                                                <TableCell>
                                                  {machine.name_location || "-"}
                                                </TableCell>
                                                <TableCell>
                                                  <Stack
                                                    direction="column"
                                                    spacing={0.5}
                                                  >
                                                    {isNotFound ? (
                                                      <Chip
                                                        label="Không tìm thấy trong hệ thống"
                                                        color="info"
                                                        size="small"
                                                      />
                                                    ) : isDuplicate ? (
                                                      <>
                                                        <Chip
                                                          label={`Đã quét tại ${machine.duplicateLocationName}`}
                                                          color="error"
                                                          size="small"
                                                        />
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
                                                  {isDuplicate ? (
                                                    <Typography
                                                      variant="caption"
                                                      sx={{
                                                        color: "#2e7d32",
                                                        fontWeight: 600,
                                                      }}
                                                    >
                                                      <Checkbox
                                                        size="small"
                                                        checked={
                                                          duplicateMachineChoices[
                                                            machine.uuid_machine
                                                          ] === "current"
                                                        }
                                                        onChange={(e) => {
                                                          if (
                                                            e.target.checked
                                                          ) {
                                                            setDuplicateMachineChoices(
                                                              (prev) => ({
                                                                ...prev,
                                                                [machine.uuid_machine]:
                                                                  "current",
                                                              })
                                                            );
                                                          } else {
                                                            setDuplicateMachineChoices(
                                                              (prev) => {
                                                                const newChoices =
                                                                  { ...prev };
                                                                delete newChoices[
                                                                  machine
                                                                    .uuid_machine
                                                                ];
                                                                return newChoices;
                                                              }
                                                            );
                                                          }
                                                        }}
                                                        sx={{
                                                          color: "#2e7d32",
                                                          "&.Mui-checked": {
                                                            color: "#2e7d32",
                                                          },
                                                        }}
                                                      />
                                                      Chuyển sang{" "}
                                                      {
                                                        selectedLocationForScan?.name_location
                                                      }
                                                    </Typography>
                                                  ) : (
                                                    <Typography
                                                      variant="caption"
                                                      color="text.secondary"
                                                    >
                                                      -
                                                    </Typography>
                                                  )}
                                                </TableCell>
                                              </TableRow>
                                            );
                                          })}
                                        </TableBody>
                                      </Table>
                                    </TableContainer>
                                  )}
                                </Box>
                              );
                            };

                            return (
                              <Box>
                                {renderMachineGroup(
                                  "Đúng vị trí",
                                  correctLocation,
                                  "#2e7d32"
                                )}
                                {renderMachineGroup(
                                  "Sai vị trí",
                                  wrongLocation,
                                  "#ed6c02"
                                )}
                                {renderMachineGroup(
                                  "Không tìm thấy trong hệ thống",
                                  notFound,
                                  "#0288d1"
                                )}
                                {renderMachineGroup(
                                  "Đã quét ở vị trí khác",
                                  alreadyScanned,
                                  "#d32f2f"
                                )}
                              </Box>
                            );
                          })()}
                        </Box>
                        <Button
                          onClick={handleInventoryScanComplete}
                          variant="contained"
                          color="success"
                          startIcon={<Save />}
                          disabled={loading}
                          sx={{ borderRadius: "12px" }}
                        >
                          {loading ? (
                            <CircularProgress size={24} />
                          ) : (
                            "Lưu kết quả"
                          )}
                        </Button>
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
                    <Stack
                      direction="row"
                      alignItems="center"
                      justifyContent="space-between"
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
                            Chi tiết từng vị trí trong đơn vị (
                            <span style={{ color: "#1565c0" }}>Sổ sách, </span>
                            <span style={{ color: "#2e7d32" }}>
                              Số máy hiện diện,{" "}
                            </span>
                            <span style={{ color: "#ed6c02" }}>
                              Số máy khác đơn vị,{" "}
                            </span>
                            <span style={{ color: "#d32f2f" }}>
                              Số máy chưa xác định
                            </span>
                            )
                          </Typography>
                        </Box>
                      </Stack>
                      <IconButton
                        onClick={handleRefreshInventoryDepartment}
                        disabled={detailLoading}
                        sx={{
                          color: "#ff5722",
                          "&:hover": {
                            bgcolor: "rgba(255, 87, 34, 0.08)",
                          },
                        }}
                      >
                        {detailLoading ? (
                          <CircularProgress
                            size={24}
                            sx={{ color: "#ff5722" }}
                          />
                        ) : (
                          <Refresh />
                        )}
                      </IconButton>
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
                            Sổ sách (Trước kiểm kê)
                          </TableCell>

                          <TableCell
                            align="center"
                            sx={{
                              fontWeight: "bold",
                              bgcolor: "#eeeeee",
                              color: "#2e7d32",
                            }}
                          >
                            Số máy hiện diện (
                            <span style={{ color: "#ed6c02" }}>KĐV</span>)
                          </TableCell>

                          <TableCell
                            align="center"
                            sx={{
                              fontWeight: "bold",
                              bgcolor: "#eeeeee",
                              color: "#d32f2f",
                            }}
                          >
                            Số máy chưa xác định
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(() => {
                          // 1. Lấy dữ liệu snapshot + scannedData từ currentDepartment
                          let snapshots = {};
                          let scannedData = [];
                          let listBeforeScan = [];

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

                          try {
                            listBeforeScan =
                              typeof currentDepartment.list_before_scan ===
                              "string"
                                ? JSON.parse(currentDepartment.list_before_scan)
                                : currentDepartment.list_before_scan || [];
                          } catch (e) {
                            console.error(e);
                          }

                          // 2. Build global scanned uuid set từ TOÀN BỘ inventoryDetails
                          // Máy nào đã được quét ở bất kỳ đơn vị/vị trí nào trong phiếu đều được tính
                          const globalScannedUuids = new Set();
                          (formData.inventoryDetails || []).forEach((dept) => {
                            try {
                              const parsed =
                                typeof dept.scanned_result === "string"
                                  ? JSON.parse(dept.scanned_result)
                                  : dept.scanned_result;
                              const locations = Array.isArray(parsed)
                                ? parsed
                                : parsed?.locations || [];
                              locations.forEach((loc) => {
                                (loc.scanned_machine || []).forEach((m) => {
                                  const u = m.uuid || m.uuid_machine;
                                  if (u && !String(u).startsWith("NOT_FOUND")) {
                                    globalScannedUuids.add(u);
                                  }
                                });
                              });
                            } catch (e) {
                              console.error(e);
                            }
                          });

                          // 3. Tạo map: uuid_location -> danh sách uuid_machine từ list_before_scan
                          const locationMachinesMap = {};
                          listBeforeScan.forEach((loc) => {
                            locationMachinesMap[loc.location_uuid] = (
                              loc.machines || []
                            ).map((m) => m.uuid_machine);
                          });

                          // 4. Tạo danh sách tất cả các vị trí (chỉ vị trí có máy trong sổ sách)
                          const allLocations =
                            departmentLocations.length > 0
                              ? departmentLocations.filter(
                                  (loc) =>
                                    snapshots[loc.uuid_location] &&
                                    snapshots[loc.uuid_location] > 0
                                )
                              : Object.keys(snapshots)
                                  .filter((uuid) => snapshots[uuid] > 0)
                                  .map((uuid) => ({
                                    uuid_location: uuid,
                                    name_location: "Đang tải...",
                                  }));

                          let grandTotalSystem = 0;
                          let grandTotalScanned = 0;
                          // let grandTotalCorrectDept = 0;
                          let grandTotalMisDept = 0;
                          let totalCheckedCount = 0;

                          const rows = allLocations.map((loc) => {
                            const systemCount =
                              snapshots[loc.uuid_location] || 0;

                            const scannedLoc = scannedData.find(
                              (s) => s.location_uuid === loc.uuid_location
                            );

                            let totalScanned = 0;
                            let correctDeptCount = 0;
                            let misDeptCount = 0;

                            if (scannedLoc && scannedLoc.scanned_machine) {
                              scannedLoc.scanned_machine.forEach((m) => {
                                totalScanned++;
                                if (m.misdepartment === "1") {
                                  misDeptCount++;
                                } else {
                                  correctDeptCount++;
                                }
                              });
                            }

                            const isScanned = !!scannedLoc;

                            // Tính số máy thực sự bị thiếu:
                            // Máy trong list_before_scan của vị trí này mà chưa được quét ở BẤT KỲ ĐÂU trong toàn phiếu
                            const locationMachineUuids =
                              locationMachinesMap[loc.uuid_location] || [];
                            const missingCount =
                              locationMachineUuids.length > 0
                                ? locationMachineUuids.filter(
                                    (uuid) => !globalScannedUuids.has(uuid)
                                  ).length
                                : Math.max(0, systemCount - correctDeptCount);

                            grandTotalSystem += systemCount;
                            if (isScanned) {
                              grandTotalScanned += totalScanned;
                              // grandTotalCorrectDept += correctDeptCount;
                              grandTotalMisDept += misDeptCount;
                              totalCheckedCount++;
                            }

                            return {
                              name: loc.name_location,
                              uuid: loc.uuid_location,
                              system: systemCount,
                              scanned: totalScanned,
                              correctDept: correctDeptCount,
                              misDept: misDeptCount,
                              missing: missingCount,
                              isScanned: isScanned,
                            };
                          });

                          // Tổng máy bị thiếu = tất cả UUID trong list_before_scan của đơn vị này
                          // mà chưa được quét ở bất kỳ đâu trong toàn phiếu (đếm unique, không trùng)
                          const allDeptMachineUuids = listBeforeScan.flatMap(
                            (loc) =>
                              (loc.machines || []).map((m) => m.uuid_machine)
                          );
                          const grandTotalMissing = allDeptMachineUuids.filter(
                            (uuid) => !globalScannedUuids.has(uuid)
                          ).length;

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

                                  <TableCell
                                    align="center"
                                    sx={{ color: "#2e7d32", fontWeight: 600 }}
                                  >
                                    {row.isScanned && row.scanned > 0 ? (
                                      <>
                                        {new Intl.NumberFormat("en-US").format(
                                          row.scanned
                                        )}
                                        {row.misDept > 0 && (
                                          <Typography
                                            component="span"
                                            sx={{
                                              fontSize: "0.85rem",
                                              color: "#2e7d32",
                                              ml: 0.5,
                                              fontWeight: 600,
                                            }}
                                          >
                                            (
                                            <span
                                              style={{
                                                color: "#ed6c02",
                                              }}
                                            >
                                              KĐV:{" "}
                                              {new Intl.NumberFormat(
                                                "en-US"
                                              ).format(row.misDept)}
                                            </span>
                                            )
                                          </Typography>
                                        )}
                                      </>
                                    ) : (
                                      "0"
                                    )}
                                  </TableCell>

                                  <TableCell
                                    align="center"
                                    sx={{
                                      color: "#d32f2f",
                                      fontWeight: 600,
                                    }}
                                  >
                                    {/* {row.missing > 0 ? (
                                      <Button
                                        size="small"
                                        variant="outlined"
                                        color="error"
                                        onClick={() =>
                                          handleViewMissingMachines(
                                            row.uuid,
                                            row.name
                                          )
                                        }
                                        sx={{
                                          minWidth: "auto",
                                          px: 2,
                                          py: 0.5,
                                          fontWeight: "bold",
                                          border: "2px solid",
                                        }}
                                      >
                                        {new Intl.NumberFormat("en-US").format(
                                          row.missing
                                        )}
                                      </Button>
                                    ) : (
                                      new Intl.NumberFormat("en-US").format(
                                        row.missing
                                      )
                                    )} */}
                                    {new Intl.NumberFormat("en-US").format(
                                      row.missing
                                    )}
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
                                  {grandTotalScanned > 0 ? (
                                    <>
                                      {new Intl.NumberFormat("en-US").format(
                                        grandTotalScanned
                                      )}
                                      {grandTotalMisDept > 0 && (
                                        <Typography
                                          component="span"
                                          sx={{
                                            fontSize: "0.9rem",
                                            color: "#2e7d32",
                                            ml: 0.5,
                                            fontWeight: 600,
                                          }}
                                        >
                                          (
                                          <span
                                            style={{
                                              color: "#ed6c02",
                                            }}
                                          >
                                            KĐV:{" "}
                                            {new Intl.NumberFormat(
                                              "en-US"
                                            ).format(grandTotalMisDept)}
                                          </span>
                                          )
                                        </Typography>
                                      )}
                                    </>
                                  ) : (
                                    "0"
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
                                  {grandTotalMissing > 0 ? (
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      color="error"
                                      onClick={() =>
                                        handleViewMissingMachines(
                                          null,
                                          "Toàn bộ đơn vị"
                                        )
                                      }
                                      // onClick={handleViewAllMissingMachines}
                                      sx={{
                                        minWidth: "auto",
                                        px: 2,
                                        py: 0.5,
                                        fontWeight: "bold",
                                        border: "2px solid",
                                      }}
                                    >
                                      {new Intl.NumberFormat("en-US").format(
                                        grandTotalMissing
                                      )}
                                    </Button>
                                  ) : (
                                    new Intl.NumberFormat("en-US").format(
                                      grandTotalMissing
                                    )
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
                      <IconButton
                        onClick={handleRefreshInventoryDepartment}
                        disabled={detailLoading}
                        sx={{
                          color: "#ff5722",
                          "&:hover": {
                            bgcolor: "rgba(255, 87, 34, 0.08)",
                          },
                        }}
                      >
                        {detailLoading ? (
                          <CircularProgress
                            size={24}
                            sx={{ color: "#ff5722" }}
                          />
                        ) : (
                          <Refresh />
                        )}
                      </IconButton>
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
          <DialogActions
            sx={{
              p: 3,
              "& > :not(style) + :not(style)": {
                marginLeft: { xs: "0px !important", sm: "8px !important" },
              },
            }}
          >
            {/* <Button
              onClick={handleCloseInventoryScan}
              variant="outlined"
              sx={{ borderRadius: "12px", px: 3 }}
            >
              Đóng
            </Button> */}
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
          <DialogActions
            sx={{
              p: 3,
              gap: 2,
              "& > :not(style) + :not(style)": {
                marginLeft: { xs: "0px !important", sm: "8px !important" },
              },
            }}
          >
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
