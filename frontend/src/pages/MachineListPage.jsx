// frontend/src/pages/MachineListPage.jsx

import React, { useState, useEffect, useRef } from "react";
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
  Snackbar,
  AlertTitle,
  TableSortLabel,
  Menu,
  Checkbox,
  ListItemText,
  List,
  ListItem,
  ListItemIcon,
  Link,
  useTheme,
  useMediaQuery,
  Tooltip,
} from "@mui/material";
import {
  PrecisionManufacturing,
  Search,
  Refresh,
  CheckCircle,
  Build,
  Cancel,
  Close,
  Save,
  QrCode2,
  Print,
  Download,
  Add,
  ReceiptLong,
  SwapHoriz,
  ViewColumn,
  FileUpload,
  CheckCircleOutline,
  ErrorOutline,
  KeyboardArrowDown,
  KeyboardArrowUp,
  HourglassFull,
} from "@mui/icons-material";
import { alpha } from "@mui/material/styles";
import * as XLSX from "xlsx-js-style";
import { QRCodeSVG } from "qrcode.react";
import NavigationBar from "../components/NavigationBar";
import { api } from "../api/api";
import { useAuth } from "../hooks/useAuth"; // <<< 1. THÊM MỚI: IMPORT USEAUTH

// Thêm style cho các trường bị disabled/filled để dễ nhận biết (từ yêu cầu trước)
const DISABLED_VIEW_SX = {
  // Ghi đè cho disabled
  "& .MuiInputBase-root.Mui-disabled": {
    backgroundColor: "#fffbe5 !important", // Nền vàng nhạt
    "& fieldset": {
      borderColor: "#f44336 !important", // Viền đỏ
    },
    "& .MuiInputBase-input": {
      color: "#f44336", // Chữ đỏ
      WebkitTextFillColor: "#f44336 !important", // Ghi đè màu chữ
      fontWeight: 600,
      opacity: 1, // Đảm bảo độ mờ không làm mờ chữ
    },
    "& .MuiFormLabel-root": {
      color: "#f44336 !important", // Nhãn đỏ
    },
  },
  // Ghi đè cho variant="filled" (khi disabled=false)
  "& .MuiFilledInput-root": {
    backgroundColor: "#fffbe5 !important",
    "& input": {
      color: "#f44336",
      fontWeight: 600,
    },
    "& .MuiFormLabel-root": {
      color: "#f44336",
    },
  },
};

// Column configuration for visibility toggle
const columnConfig = {
  code_machine: "Mã máy",
  type_machine: "Loại máy",
  model_machine: "Model",
  manufacturer: "Hãng SX",
  serial_machine: "Serial",
  RFID_machine: "RFID",
  NFC_machine: "NFC",
  name_category: "Phân loại",
  name_location: "Vị trí hiện tại",
  current_status: "Trạng thái (chính)",
  is_borrowed_or_rented_or_borrowed_out: "Trạng thái (mượn/thuê)",
  is_borrowed_or_rented_or_borrowed_out_name: "Đơn vị (mượn/thuê)",
  is_borrowed_or_rented_or_borrowed_out_date: "Ngày (mượn/thuê)",
  is_borrowed_or_rented_or_borrowed_out_return_date: "Ngày trả (mượn/thuê)",
  price: "Giá",
  lifespan: "Tuổi thọ (năm)",
  repair_cost: "Chi phí sửa chữa",
  date_of_use: "Ngày sử dụng",
};

// Initial visibility state
const initialColumnVisibility = {
  code_machine: true,
  type_machine: true,
  model_machine: true,
  manufacturer: true,
  serial_machine: true,
  RFID_machine: false,
  NFC_machine: false,
  name_category: false,
  name_location: true,
  current_status: true,
  is_borrowed_or_rented_or_borrowed_out: true,
  is_borrowed_or_rented_or_borrowed_out_name: true,
  is_borrowed_or_rented_or_borrowed_out_date: true,
  is_borrowed_or_rented_or_borrowed_out_return_date: true,
  price: false,
  lifespan: false,
  repair_cost: false,
  date_of_use: true,
};

const renderMultiSelectValue = (selected) => (
  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
    {selected.slice(0, 3).map(
      (
        value // Chỉ hiện 3 cái đầu
      ) => (
        <Chip key={value} label={value} size="small" />
      )
    )}
    {selected.length > 3 && (
      <Chip label={`+${selected.length - 3}`} size="small" />
    )}
  </Box>
);

const formatNumber = (num) => {
  if (num === null || num === undefined || num === "") return "0";
  return Number(num).toLocaleString("en-US");
};

const StatusMatrixTable = ({ data, loading, onCellClick, activeFilters }) => {
  const theme = useTheme();
  const [openNotInUse, setOpenNotInUse] = useState(false);

  // 1. Cấu hình cột: ẨN cột "Cho mượn" (borrowed_out)
  const columns = [
    { key: "internal", label: "Máy nội bộ" },
    { key: "borrowed", label: "Máy mượn" },
    { key: "rented", label: "Máy thuê" },
    // { key: "borrowed_out", label: "Cho mượn" }, // Đã ẩn
  ];

  // 2. Cấu hình hàng chính
  const rowConfig = [
    {
      key: "available",
      label: "Có thể sử dụng",
      color: "#2e7d32",
      bg: "#e8f5e9",
    },
    { key: "in_use", label: "Đang sử dụng", color: "#1976d2", bg: "#e3f2fd" },
    {
      key: "not_in_use",
      label: "Chưa sử dụng",
      color: "#ed6c02",
      bg: "#fff3e0",
      hasChildren: true,
    },
    {
      key: "pending_liquidation",
      label: "Chờ thanh lý",
      color: "#ff5722",
      bg: "#fbe9e7",
    },
    // { key: "liquidation", label: "Thanh lý", color: "#d32f2f", bg: "#ffebee" },
  ];

  // 3. Cấu hình hàng con: ĐỔI TÊN "Vô hiệu hóa" thành "Cho mượn"
  const subRowConfig = [
    { key: "maintenance", label: "Bảo trì", color: "#00bcd4", bg: "#e0f7fa" },
    { key: "broken", label: "Máy hư", color: "#00bcd4", bg: "#e0f7fa" },
    { key: "disabled", label: "Cho mượn", color: "#00bcd4", bg: "#e0f7fa" },
  ];

  // 4. Xử lý dữ liệu: Cộng 'borrowed_out' vào 'internal'
  const processData = () => {
    if (!data) return {};

    // Deep copy data để tránh sửa đổi props gốc
    const newData = JSON.parse(JSON.stringify(data));

    // Bước 1: Duyệt qua tất cả các trạng thái có trong data
    Object.keys(newData).forEach((statusKey) => {
      const row = newData[statusKey];
      if (row) {
        // Lấy số lượng máy cho mượn
        const borrowedOutCount = row["borrowed_out"] || 0;
        // Cộng dồn vào cột nội bộ
        row["internal"] = (row["internal"] || 0) + borrowedOutCount;
        // (Tùy chọn) Reset cột borrowed_out về 0 để tránh tính toán sai nếu dùng lại
        row["borrowed_out"] = 0;
      }
    });

    // Bước 2: Tạo dữ liệu gộp cho hàng "Chưa sử dụng" (not_in_use)
    newData["not_in_use"] = {};
    const mergedStatuses = ["maintenance", "broken", "disabled"];

    columns.forEach((col) => {
      let sum = 0;
      mergedStatuses.forEach((status) => {
        if (newData[status]) {
          sum += newData[status][col.key] || 0;
        }
      });
      newData["not_in_use"][col.key] = sum;
    });

    return newData;
  };

  const processedData = processData();

  // --- Logic kiểm tra Active ---
  const isSelected = (rowKey, colKey) => {
    if (!activeFilters) return false;
    const { current_status, borrow_status } = activeFilters;
    let isRowMatch = false;

    if (rowKey === "ALL") {
      isRowMatch =
        current_status.length === 0 || current_status.includes("ALL");
    } else if (rowKey === "not_in_use") {
      const mergedStatuses = ["maintenance", "broken", "disabled"];
      isRowMatch =
        mergedStatuses.every((s) => current_status.includes(s)) &&
        current_status.length === mergedStatuses.length;
    } else {
      isRowMatch =
        current_status.includes(rowKey) && current_status.length === 1;
    }

    const isColMatch =
      colKey === "ALL"
        ? borrow_status.length === 0 || borrow_status.includes("ALL")
        : colKey === "internal"
        ? borrow_status.includes("internal") // Khi click Nội bộ, logic active vẫn giữ nguyên
        : borrow_status.includes(colKey);

    return isRowMatch && isColMatch;
  };

  const isRowActive = (rowKey) => {
    if (!activeFilters) return false;
    if (rowKey === "ALL")
      return (
        activeFilters.current_status.length === 0 ||
        activeFilters.current_status.includes("ALL")
      );
    if (rowKey === "not_in_use") {
      const mergedStatuses = ["maintenance", "broken", "disabled"];
      return mergedStatuses.every((s) =>
        activeFilters.current_status.includes(s)
      );
    }
    return activeFilters.current_status.includes(rowKey);
  };

  const isColActive = (colKey) => {
    if (!activeFilters) return false;
    if (colKey === "ALL")
      return (
        activeFilters.borrow_status.length === 0 ||
        activeFilters.borrow_status.includes("ALL")
      );
    return colKey === "internal"
      ? activeFilters.borrow_status.includes("internal")
      : activeFilters.borrow_status.includes(colKey);
  };

  // --- Tính toán tổng ---
  const calculateRowTotal = (rowData) => {
    if (!rowData) return 0;
    return columns.reduce((sum, col) => sum + (rowData[col.key] || 0), 0);
  };

  const calculateColTotal = (colKey) => {
    if (!processedData) return 0;
    return rowConfig.reduce((sum, row) => {
      if (row.key === "liquidation") return sum;
      return sum + (processedData[row.key]?.[colKey] || 0);
    }, 0);
  };

  const calculateGrandTotal = () => {
    if (!processedData) return 0;
    let total = 0;
    rowConfig.forEach((row) => {
      if (row.key === "liquidation") return;
      total += calculateRowTotal(processedData[row.key]);
    });
    return total;
  };

  const TOTAL_COL_COLOR = "#667eea";
  const TOTAL_COL_BG = "#ede7f6";
  const TOTAL_ROW_COLOR = "#667eea";
  const TOTAL_ROW_BG = "#ede7f6";

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  // Helper render Row
  const renderRow = (row, isSubRow = false) => {
    const rowData = processedData[row.key] || {};
    const rowTotal = calculateRowTotal(rowData);
    const hasDataRow = rowTotal > 0;
    const rowActive = isRowActive(row.key);

    return (
      <TableRow key={row.key} sx={{ "& > *": { borderBottom: "unset" } }}>
        <TableCell
          className="cell-first-col"
          sx={{
            cursor: "default",
            color: row.color,
            bgcolor: rowActive ? row.bg : "#fff",
            boxShadow: rowActive ? `inset 3px 0 0 0 ${row.color}` : "none",
            pl: isSubRow ? 4 : 2,
            "&:hover": {
              bgcolor: row.bg,
              color: row.color,
              boxShadow: `inset 3px 0 0 0 ${row.color}`,
            },
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center" }}>
            {row.hasChildren && (
              <IconButton
                aria-label="expand row"
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenNotInUse(!openNotInUse);
                }}
                sx={{ mr: 0.5, p: 0 }}
              >
                {openNotInUse ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
              </IconButton>
            )}
            <Box component="span" sx={{ flexGrow: 1, fontWeight: 600 }}>
              {row.label}
            </Box>
          </Box>
        </TableCell>

        {columns.map((col) => {
          const value = rowData[col.key] || 0;
          const hasDataCell = value > 0;
          const cellSelected = isSelected(row.key, col.key);
          return (
            <TableCell
              key={col.key}
              onClick={() => onCellClick(row.key, col.key)}
              sx={{
                cursor: "pointer",
                bgcolor: cellSelected
                  ? alpha(row.color, 0.2)
                  : hasDataCell
                  ? row.bg
                  : "transparent",
                color: hasDataCell || cellSelected ? row.color : "#e0e0e0",
                fontWeight: hasDataCell || cellSelected ? "bold" : "normal",
                boxShadow: cellSelected
                  ? `inset 0 0 0 2px ${row.color}`
                  : "none",
                "&:hover": {
                  bgcolor:
                    hasDataCell || cellSelected
                      ? alpha(row.color, 0.25)
                      : "#f5f5f5",
                  boxShadow: `inset 0 0 0 2px ${row.color}`,
                  color: hasDataCell || cellSelected ? row.color : "#757575",
                },
              }}
            >
              {value ? formatNumber(value) : "-"}
            </TableCell>
          );
        })}

        {(() => {
          const cellSelected = isSelected(row.key, "ALL");
          return (
            <TableCell
              onClick={() => onCellClick(row.key, "ALL")}
              sx={{
                cursor: "pointer",
                fontWeight: "bold",
                color: hasDataRow || cellSelected ? row.color : "#bdbdbd",
                backgroundColor: cellSelected
                  ? alpha(row.color, 0.2)
                  : hasDataRow
                  ? alpha(row.color, 0.08)
                  : "transparent",
                boxShadow: cellSelected
                  ? `inset 0 0 0 2px ${row.color}`
                  : "none",
                "&:hover": {
                  bgcolor: alpha(row.color, 0.2),
                  boxShadow: `inset 0 0 0 2px ${row.color}`,
                },
              }}
            >
              {rowTotal ? formatNumber(rowTotal) : "-"}
            </TableCell>
          );
        })()}
      </TableRow>
    );
  };

  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: "20px",
        border: "1px solid rgba(0, 0, 0, 0.05)",
        overflow: "hidden",
        height: "100%",
        transition: "all 0.2s ease",
        "&:hover": { boxShadow: "0 4px 12px rgba(0,0,0,0.05)" },
      }}
    >
      <Box sx={{ p: 2, borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
        <Typography variant="h6" fontWeight="bold">
          Trạng thái chi tiết
        </Typography>
      </Box>
      <TableContainer>
        <Table
          size="small"
          sx={{
            "& .MuiTableCell-root": {
              borderBottom: "1px solid rgba(224, 224, 224, 0.4)",
              textAlign: "center",
              fontSize: "0.9rem",
              transition: "all 0.2s ease-in-out",
              position: "relative",
            },
            "& .MuiTableCell-head": {
              backgroundColor: "#f9fafb",
              fontWeight: 700,
              color: "#637381",
              py: 2,
            },
            "& .cell-first-col": {
              textAlign: "left",
              fontWeight: 600,
              position: "sticky",
              left: 0,
              zIndex: 1,
              borderRight: "1px solid rgba(0,0,0,0.05)",
            },
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell className="cell-first-col" sx={{ minWidth: 180 }}>
                Trạng thái chính
              </TableCell>
              {columns.map((col) => {
                const active = isColActive(col.key);
                return (
                  <TableCell
                    key={col.key}
                    sx={{
                      cursor: "default",
                      color: active ? theme.palette.primary.main : "inherit",
                      bgcolor: active ? "#f0f4f8" : "inherit",
                      boxShadow: active
                        ? `inset 0 -3px 0 0 ${theme.palette.primary.main}`
                        : "none",
                      "&:hover": {
                        color: theme.palette.primary.main,
                        bgcolor: "#f0f4f8",
                        boxShadow: `inset 0 -3px 0 0 ${theme.palette.primary.main}`,
                      },
                    }}
                  >
                    {col.label}
                  </TableCell>
                );
              })}
              {(() => {
                const active = isColActive("ALL");
                return (
                  <TableCell
                    sx={{
                      cursor: "default",
                      fontWeight: "bold !important",
                      // Cập nhật màu TÍM cho header TỔNG
                      color: active
                        ? `${TOTAL_COL_COLOR} !important`
                        : `${TOTAL_COL_COLOR} !important`,
                      backgroundColor: active
                        ? `${TOTAL_COL_BG} !important`
                        : "#f9fafb !important",
                      boxShadow: active
                        ? `inset 0 -3px 0 0 ${TOTAL_COL_COLOR}`
                        : "none",
                      "&:hover": {
                        backgroundColor: TOTAL_COL_BG + " !important",
                        boxShadow: `inset 0 -3px 0 0 ${TOTAL_COL_COLOR}`,
                      },
                    }}
                  >
                    Tổng
                  </TableCell>
                );
              })()}
            </TableRow>
          </TableHead>
          <TableBody>
            {rowConfig.map((row) => (
              <React.Fragment key={row.key}>
                {renderRow(row)}
                {row.key === "not_in_use" &&
                  openNotInUse &&
                  subRowConfig.map((subRow) => renderRow(subRow, true))}
              </React.Fragment>
            ))}

            {/* --- CẬP NHẬT HÀNG TỔNG DƯỚI CÙNG --- */}
            <TableRow sx={{ backgroundColor: "#fafafa" }}>
              {(() => {
                const active = isRowActive("ALL");
                return (
                  <TableCell
                    className="cell-first-col"
                    sx={{
                      cursor: "default",
                      fontWeight: "bold !important",
                      // Cập nhật màu TÍM
                      color: active
                        ? `${TOTAL_ROW_COLOR} !important`
                        : `${TOTAL_ROW_COLOR} !important`,
                      backgroundColor: active
                        ? `${TOTAL_ROW_BG} !important`
                        : "#fafafa !important",
                      boxShadow: active
                        ? `inset 3px 0 0 0 ${TOTAL_ROW_COLOR}`
                        : "none",
                      "&:hover": {
                        backgroundColor: TOTAL_ROW_BG + " !important",
                        boxShadow: `inset 3px 0 0 0 ${TOTAL_ROW_COLOR}`,
                      },
                    }}
                  >
                    Tổng
                  </TableCell>
                );
              })()}

              {/* CÁC Ô TỔNG CỘT */}
              {columns.map((col) => {
                const colTotal = calculateColTotal(col.key);
                const cellSelected = isSelected("ALL", col.key);
                return (
                  <TableCell
                    key={col.key}
                    onClick={() => onCellClick("ALL", col.key)}
                    sx={{
                      cursor: "pointer",
                      fontWeight: "bold",
                      // Cập nhật màu TÍM
                      color:
                        colTotal > 0 || cellSelected
                          ? TOTAL_ROW_COLOR
                          : "#bdbdbd",
                      bgcolor: cellSelected ? TOTAL_ROW_BG : "transparent",
                      boxShadow: cellSelected
                        ? `inset 0 0 0 2px ${TOTAL_ROW_COLOR}`
                        : "none",
                      "&:hover": {
                        bgcolor: TOTAL_ROW_BG,
                        color: TOTAL_ROW_COLOR,
                        boxShadow: `inset 0 0 0 2px ${TOTAL_ROW_COLOR}`,
                      },
                    }}
                  >
                    {colTotal ? formatNumber(colTotal) : "-"}
                  </TableCell>
                );
              })}

              {/* --- Ô GRAND TOTAL (GÓC DƯỚI PHẢI) --- */}
              <TableCell
                onClick={() => onCellClick("ALL", "ALL")}
                sx={{
                  // Cập nhật nền Tím nhạt và chữ Tím đậm
                  backgroundColor: `${alpha(TOTAL_ROW_COLOR, 0.15)} !important`,
                  color: `${TOTAL_ROW_COLOR} !important`,
                  fontWeight: "bold",
                  fontSize: "1.1rem !important", // Tăng kích thước chữ một chút
                  cursor: "pointer",
                  boxShadow: isSelected("ALL", "ALL")
                    ? `inset 0 0 0 2px ${TOTAL_ROW_COLOR}`
                    : "none",
                  "&:hover": {
                    filter: "brightness(0.95)",
                    boxShadow: `inset 0 0 0 2px ${TOTAL_ROW_COLOR}`,
                  },
                }}
              >
                {calculateGrandTotal()
                  ? formatNumber(calculateGrandTotal())
                  : "-"}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  );
};

const MachineListPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  // <<< 2. THÊM MỚI: LẤY QUYỀN USER
  const { user, permissions } = useAuth(); // Lấy cả user
  const isAdmin = permissions.includes("admin");
  const canEdit = permissions.includes("edit"); // (Giữ lại để dùng cho logic chung)

  // Định nghĩa vai trò chi tiết
  const phongCoDienId = 14;
  // const coDienXuongIds = [10, 30, 24, 31];

  const isPhongCoDien =
    canEdit && !isAdmin && user?.phongban_id === phongCoDienId;
  // const isCoDienXuong =
  //   canEdit && !isAdmin && coDienXuongIds.includes(user?.phongban_id);

  // Biến kiểm tra quyền TẠO/NHẬP
  const canCreateOrImport = isAdmin || isPhongCoDien;

  const [machines, setMachines] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    available: 0,
    in_use: 0,
    maintenance: 0,
    broken: 0,
    borrowed_out: 0,
    liquidation: 0,
    disabled: 0,
    rented: 0,
    borrowed: 0,
    borrowed_return: 0,
    rented_return: 0,
    pending_liquidation: 0,
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
  const [typeStats, setTypeStats] = useState([]);
  const [isTypeStatsExpanded, setIsTypeStatsExpanded] = useState(false);

  // Dialog states
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [editedData, setEditedData] = useState({});
  const [isCreateMode, setIsCreateMode] = useState(false);

  // QR Code states
  const [showQRCode, setShowQRCode] = useState(false);

  // Notification states
  const [notification, setNotification] = useState({
    open: false,
    severity: "success", // 'success', 'error', 'warning', 'info'
    title: "",
    message: "",
  });

  // State for sorting
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  // State for column visibility
  const [columnVisibility, setColumnVisibility] = useState(
    initialColumnVisibility
  );
  const [columnMenuAnchor, setColumnMenuAnchor] = useState(null);
  const [machineHistory, setMachineHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState(null);
  const [fileName, setFileName] = useState("");
  const tableCardRef = useRef(null);
  const searchInputRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  // State for filter dropdown data
  const [typeOptions, setTypeOptions] = useState([]);
  const [modelOptions, setModelOptions] = useState([]);
  const [manufacturerOptions, setManufacturerOptions] = useState([]);
  const [locationOptions, setLocationOptions] = useState([]);
  const [categoryOptions, setCategoryOptions] = useState([]);

  // State for selected filter values
  const [filters, setFilters] = useState({
    type_machines: [],
    model_machines: [],
    manufacturers: [],
    name_locations: [],
    current_status: [],
    borrow_status: [],
  });

  // State cho matrix
  const [matrixData, setMatrixData] = useState({});
  const [matrixLoading, setMatrixLoading] = useState(false);

  const fetchMachines = async (searchQuery = "") => {
    try {
      setLoading(true);
      setError(null);

      const apiParams = {
        page: page,
        limit: rowsPerPage,
        search: searchQuery,
      };

      // Thêm các bộ lọc vào params NẾU chúng có giá trị
      Object.keys(filters).forEach((key) => {
        if (filters[key] && filters[key].length > 0) {
          if (key === "borrow_status") {
            apiParams["is_borrowed_or_rented_or_borrowed_out"] = filters[key];
          } else {
            apiParams[key] = filters[key];
          }
        }
      });

      const result = await api.machines.getAll(apiParams);

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

  const fetchTypeStats = async () => {
    try {
      const result = await api.machines.getStatsByType();
      if (result.success) {
        setTypeStats(result.data); // result.data là một mảng
      }
    } catch (err) {
      console.error("Error fetching stats by type:", err);
    }
  };

  const fetchFilterOptions = async () => {
    try {
      const [typeRes, modelRes, manuRes, locRes, catRes] = await Promise.all([
        api.machines.getDistinctValues({ field: "type_machine" }),
        api.machines.getDistinctValues({ field: "model_machine" }),
        api.machines.getDistinctValues({ field: "manufacturer" }),
        api.machines.getDistinctValues({ field: "name_location" }),
        api.categories.getAll(),
      ]);
      if (typeRes.success) setTypeOptions(typeRes.data);
      if (modelRes.success) setModelOptions(modelRes.data);
      if (manuRes.success) setManufacturerOptions(manuRes.data);
      if (locRes.success) setLocationOptions(locRes.data);
      if (catRes.success) setCategoryOptions(catRes.data);
    } catch (err) {
      console.error("Error fetching filter options:", err);
      // Hiển thị thông báo lỗi cho người dùng (tùy chọn)
      showNotification(
        "error",
        "Lỗi tải bộ lọc",
        "Không thể tải danh sách cho bộ lọc chi tiết."
      );
    }
  };

  const fetchMatrixStats = async () => {
    try {
      setMatrixLoading(true);
      const result = await api.machines.getMatrixStats();
      if (result.success) {
        setMatrixData(result.data);
      }
    } catch (err) {
      console.error("Error fetching matrix stats:", err);
    } finally {
      setMatrixLoading(false);
    }
  };
  const handleMatrixClick = (statusKey, sourceKey) => {
    let newStatusFilter = [];
    let newBorrowFilter = [];

    // 1. Xử lý STATUS (Dòng)
    if (statusKey === "ALL") {
      newStatusFilter = [];
    } else if (statusKey === "not_in_use") {
      // Khi chọn "Chưa sử dụng", lấy cả 3 trạng thái con (bao gồm disabled/Cho mượn)
      newStatusFilter = ["maintenance", "broken", "disabled"];
    } else {
      newStatusFilter = [statusKey];
    }

    // 2. Xử lý SOURCE (Cột)
    if (sourceKey === "ALL") {
      newBorrowFilter = [];
    } else if (sourceKey === "internal") {
      // <<< CẬP NHẬT: Khi chọn "Nội bộ", lấy cả máy Nội bộ VÀ máy Cho mượn (borrowed_out)
      // Backend sẽ xử lý mảng này: 'internal' -> NULL, 'borrowed_out' -> 'borrowed_out'
      newBorrowFilter = ["internal", "borrowed_out"];
    } else {
      newBorrowFilter = [sourceKey];
    }

    // 3. Cập nhật State Filters
    setFilters((prev) => ({
      ...prev,
      current_status: newStatusFilter,
      borrow_status: newBorrowFilter,
    }));

    setPage(1);
    if (tableCardRef.current) {
      const ref = tableCardRef.current;
      ref.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  useEffect(() => {
    // Tải danh sách máy và các thống kê
    fetchMachines(searchTerm);
    fetchStats();
    fetchTypeStats();
    fetchMatrixStats();

    fetchFilterOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchMachines(searchTerm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, rowsPerPage]);

  useEffect(() => {
    fetchMachines(searchTerm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, filters]);

  const handleSearchChange = (event) => {
    const value = event.target.value;

    // 1. Xóa timer cũ nếu người dùng đang gõ tiếp
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // 2. Đặt timer mới: Chỉ cập nhật State (gây re-render) sau khi dừng gõ 800ms
    searchTimeoutRef.current = setTimeout(() => {
      setSearchTerm(value);
      setPage(1); // Reset về trang 1 khi tìm kiếm
    }, 800);
  };

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
    // useEffect [searchTerm, filters] sẽ tự động kích hoạt refetch
  };

  const handlePageChange = (event, newPage) => {
    setPage(newPage);
    if (tableCardRef.current) {
      tableCardRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  const handleRowsPerPageChange = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(1); // Reset to first page when changing rows per page
  };

  const handleGenerateCode = async () => {
    // Chỉ chạy khi đang ở chế độ Tạo mới và có nhập Hãng SX
    if (isCreateMode && editedData.manufacturer) {
      try {
        // Gọi API lấy mã tiếp theo
        const result = await api.machines.getNextCode(editedData.manufacturer);
        if (result.success && result.data.nextCode) {
          setEditedData((prev) => ({
            ...prev,
            code_machine: result.data.nextCode,
          }));
        }
      } catch (err) {
        console.error("Failed to auto-generate code", err);
      }
    }
  };

  const handleOpenDialog = async (uuid) => {
    try {
      setMachineHistory([]); // Đặt lại lịch sử
      setHistoryLoading(true);

      const result = await api.machines.getById(uuid);
      if (result.success) {
        setSelectedMachine(result.data);
        setEditedData(result.data);
        setIsCreateMode(false);
        setOpenDialog(true);
        try {
          const historyResult = await api.tracking.getMachineHistory(uuid);
          if (historyResult.success) {
            setMachineHistory(historyResult.data.history);
          } else {
            console.error("Failed to fetch history:", historyResult.message);
            setMachineHistory([]);
          }
        } catch (historyErr) {
          console.error("Error fetching machine history:", historyErr);
          setMachineHistory([]);
        } finally {
          setHistoryLoading(false); // Dừng tải lịch sử
        }
      }
    } catch (err) {
      console.error("Error fetching machine details:", err);
      setHistoryLoading(false);
    }
  };

  const handleOpenCreateDialog = () => {
    setSelectedMachine(null);
    setEditedData({
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
      id_category: "", // Default category
      // Các trường is_borrowed... không cần khởi tạo vì form tạo mới không có
    });
    setIsCreateMode(true);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedMachine(null);
    setEditedData({});
    setIsCreateMode(false);
    setShowQRCode(false);
    setMachineHistory([]);
    setHistoryLoading(false);
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
                editedData.name_category === "Máy móc thiết bị"
                  ? "MAY"
                  : "PHUKIEN"
              }-${editedData.serial_machine || ""}</div>
              <div class="name">${editedData.type_machine || ""} - ${
      editedData.model_machine || ""
    }</div> 
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

  const showNotification = (severity, title, message) => {
    setNotification({
      open: true,
      severity,
      title,
      message,
    });
  };

  const handleCloseNotification = (event, reason) => {
    if (reason === "clickaway") {
      return;
    }
    setNotification({ ...notification, open: false });
  };

  const validateMachineData = () => {
    const errors = [];

    if (!editedData.code_machine || editedData.code_machine.trim() === "") {
      errors.push("Mã máy");
    }
    if (!editedData.type_machine || editedData.type_machine.trim() === "") {
      errors.push("Loại máy");
    }
    // if (!editedData.model_machine || editedData.model_machine.trim() === "") {
    //   errors.push("Model máy");
    // }
    if (!editedData.serial_machine || editedData.serial_machine.trim() === "") {
      errors.push("Serial");
    }
    // MARK: E^E^E^E^E^E^E^E
    // if (!editedData.RFID_machine || editedData.RFID_machine.trim() === "") {
    //   errors.push("RFID");
    // }
    // if (!editedData.date_of_use || editedData.date_of_use.trim() === "") {
    //   errors.push("Ngày sử dụng");
    // }

    return errors;
  };

  const handleSave = async () => {
    try {
      // Validate required fields
      const validationErrors = validateMachineData();
      if (validationErrors.length > 0) {
        showNotification(
          "error",
          "Vui lòng điền đầy đủ thông tin",
          `Các trường bắt buộc: ${validationErrors.join(", ")}`
        );
        return;
      }

      if (isCreateMode) {
        // Create new machine
        const result = await api.machines.create(editedData);
        if (result.success) {
          // Refresh the list
          fetchMachines(searchTerm);
          fetchStats();
          showNotification(
            "success",
            "Tạo máy móc thành công!",
            `Máy móc "${editedData.code_machine}" đã được thêm vào hệ thống`
          );
          handleCloseDialog();
        } else {
          showNotification(
            "error",
            "Tạo máy móc thất bại",
            result.message || "Đã xảy ra lỗi khi tạo máy móc"
          );
        }
      } else {
        // Update existing machine
        const result = await api.machines.update(
          selectedMachine.uuid_machine,
          editedData
        );
        if (result.success) {
          // 1. Lấy dữ liệu máy đã được cập nhật từ kết quả API
          const updatedMachine = result.data;

          // 2. Cập nhật state 'machines' (danh sách trong bảng)
          //    bằng cách thay thế máy cũ bằng máy mới.
          //    Việc này KHÔNG gây tải lại (loading) và giữ nguyên vị trí cuộn.
          setMachines((prevMachines) =>
            prevMachines.map(
              (machine) =>
                machine.uuid_machine === updatedMachine.uuid_machine
                  ? updatedMachine // Thay thế máy đã sửa
                  : machine // Giữ nguyên các máy khác
            )
          );

          // 3. Tải lại Stats (việc này nhanh và không ảnh hưởng đến bảng)
          fetchStats();
          // Update selected machine with new data
          setSelectedMachine(result.data);
          setEditedData(result.data);
          showNotification(
            "success",
            "Cập nhật thành công!",
            `Thông tin máy móc "${editedData.code_machine}" đã được cập nhật`
          );
          handleCloseDialog();
        } else {
          showNotification(
            "error",
            "Cập nhật thất bại",
            result.message || "Đã xảy ra lỗi khi cập nhật máy móc"
          );
        }
      }
    } catch (err) {
      console.error("Error saving machine:", err);

      // Parse error message for more details
      let errorMessage = "Đã xảy ra lỗi không xác định";

      if (err.response) {
        // Server responded with error
        errorMessage = err.response.data?.message || err.response.statusText;

        // Check for specific errors
        if (err.response.status === 400) {
          errorMessage = err.response.data?.message || "Dữ liệu không hợp lệ";
        } else if (err.response.status === 401) {
          errorMessage = "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại";
        } else if (err.response.status === 403) {
          errorMessage = "Bạn không có quyền thực hiện thao tác này";
        } else if (err.response.status === 404) {
          errorMessage = "Không tìm thấy máy móc";
        } else if (err.response.status >= 500) {
          errorMessage = "Lỗi máy chủ. Vui lòng thử lại sau";
        }
      } else if (err.request) {
        // Request was made but no response
        errorMessage =
          "Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng";
      }

      showNotification(
        "error",
        isCreateMode ? "Lỗi khi tạo máy móc" : "Lỗi khi cập nhật máy móc",
        errorMessage
      );
    }
  };

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
  };
  // Lấy danh sách các cột bắt buộc (sẽ dùng để tô màu)
  const requiredHeaders = ["Serial", "Loại máy"];

  const handleOpenImportDialog = () => {
    setImportFile(null);
    setFileName("");
    setImportResults(null);
    setIsImporting(false);
    setImportDialogOpen(true);
  };

  const handleCloseImportDialog = () => {
    setImportDialogOpen(false);
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setImportFile(file);
      setFileName(file.name);
      setImportResults(null); // Reset kết quả khi chọn file mới
    }
    // Reset giá trị của input để có thể chọn lại cùng 1 file
    event.target.value = null;
  };

  const handleExportExcel = async () => {
    try {
      // 1. Hiển thị loading (bạn có thể tạo state exportLoading riêng nếu muốn)
      setLoading(true);

      // 2. Chuẩn bị params giống hệt lúc fetch danh sách, nhưng bỏ phân trang (limit lớn)
      const apiParams = {
        page: 1,
        limit: 1000000, // Lấy số lượng lớn để đảm bảo hết dữ liệu
        search: searchTerm,
      };

      // Map các bộ lọc hiện tại vào params
      Object.keys(filters).forEach((key) => {
        if (filters[key] && filters[key].length > 0) {
          if (key === "borrow_status") {
            apiParams["is_borrowed_or_rented_or_borrowed_out"] = filters[key];
          } else {
            apiParams[key] = filters[key];
          }
        }
      });

      // 3. Gọi API lấy dữ liệu
      const result = await api.machines.getAll(apiParams);

      if (result.success && result.data.length > 0) {
        // 4. Format dữ liệu cho Excel
        const excelData = result.data.map((item, index) => {
          // Logic lấy tên trạng thái chính
          const statusInfo = getStatusColor(item.current_status);

          // Logic lấy tên trạng thái mượn/thuê (giống hiển thị trên bảng)
          let borrowStatusText = "";
          if (item.is_borrowed_or_rented_or_borrowed_out) {
            if (item.is_borrowed_or_rented_or_borrowed_out === "borrowed") {
              if (item.is_borrowed_or_rented_or_borrowed_out_return_date) {
                borrowStatusText = "Máy mượn ngắn hạn";
              } else {
                borrowStatusText = "Máy mượn dài hạn";
              }
            } else if (
              item.is_borrowed_or_rented_or_borrowed_out === "rented"
            ) {
              borrowStatusText = "Máy thuê";
            } else if (
              item.is_borrowed_or_rented_or_borrowed_out === "borrowed_out"
            ) {
              borrowStatusText = "Cho mượn";
            } else {
              // Các trạng thái trả về
              const bInfo = getStatusColor(
                item.is_borrowed_or_rented_or_borrowed_out
              );
              borrowStatusText = bInfo.label;
            }
          }

          return {
            STT: index + 1,
            "Mã máy": item.code_machine || "",
            "Loại máy": item.type_machine || "",
            Model: item.model_machine || "",
            "Hãng SX": item.manufacturer || "",
            Serial: item.serial_machine || "",
            RFID: item.RFID_machine || "",
            NFC: item.NFC_machine || "",
            // "Phân loại": item.name_category || "",
            "Vị trí hiện tại": item.name_location || "",
            "Trạng thái (chính)": statusInfo.label || "",
            "Trạng thái (mượn/thuê)": borrowStatusText,
            "Đơn vị (mượn/thuê)":
              item.is_borrowed_or_rented_or_borrowed_out_name || "",
            "Ngày (mượn/thuê)": formatDate(
              item.is_borrowed_or_rented_or_borrowed_out_date
            ),
            "Ngày trả (mượn/thuê)": formatDate(
              item.is_borrowed_or_rented_or_borrowed_out_return_date
            ),
            "Giá (VNĐ)": item.price || 0,
            "Tuổi thọ (năm)": item.lifespan || "",
            "Chi phí sửa chữa": item.repair_cost || 0,
            "Ngày sử dụng": formatDate(item.date_of_use),
            "Ghi chú": item.note || "",
          };
        });

        // 5. Tạo Worksheet và Workbook
        const worksheet = XLSX.utils.json_to_sheet(excelData);

        // (Tùy chọn) Auto-width cho các cột
        const wscols = Object.keys(excelData[0]).map(() => ({ wch: 20 }));
        worksheet["!cols"] = wscols;

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "DanhSachMay");

        // 6. Xuất file
        XLSX.writeFile(
          workbook,
          `DanhSachMayMoc_${new Date().toISOString().slice(0, 10)}.xlsx`
        );

        showNotification(
          "success",
          "Xuất Excel thành công",
          `Đã xuất ${excelData.length} dòng dữ liệu.`
        );
      } else {
        showNotification(
          "warning",
          "Không có dữ liệu",
          "Bộ lọc hiện tại không tìm thấy máy nào để xuất."
        );
      }
    } catch (err) {
      console.error("Export Error:", err);
      showNotification(
        "error",
        "Lỗi xuất Excel",
        "Đã xảy ra lỗi trong quá trình xuất file."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
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

    // Tạo map dịch ngược (English Key -> Vietnamese Header)
    const reverseMapping = {};
    for (const key in excelHeaderMapping) {
      reverseMapping[excelHeaderMapping[key]] = key;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target.result;
        const workbook = XLSX.read(data, { type: "binary", cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Đọc file, sử dụng `raw: false` để lấy giá trị string đã format (ví dụ: ngày tháng)
        const json = XLSX.utils.sheet_to_json(worksheet, { raw: false });

        if (json.length === 0) {
          showNotification("error", "File rỗng", "File Excel không có dữ liệu");
          setIsImporting(false);
          return;
        }

        // Kiểm tra header (bằng tiếng Việt)
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

        // --- Chuyển đổi dữ liệu sang định dạng backend ---
        const machinesToImport = json.map((row) => {
          const newRow = {};
          newRow.name_category = "Máy móc thiết bị";

          // Dịch từ Tiếng Việt -> Tiếng Anh
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

        // Gửi dữ liệu đã chuyển đổi lên backend
        const result = await api.machines.batchImport({
          machines: machinesToImport,
        });

        if (result.success) {
          setImportResults(result.data);
          // Thông báo thành công sẽ hiển thị số lỗi từ backend
          const errorCount = result.data.errorCount;
          showNotification(
            errorCount > 0 ? "warning" : "success",
            "Hoàn tất import",
            `Thành công: ${result.data.successCount}, Thất bại: ${errorCount}`
          );
          // Tải lại danh sách máy
          fetchMachines(searchTerm);
          fetchStats();
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

  const getStatusColor = (status) => {
    const statusColors = {
      available: { bg: "#2e7d3222", color: "#2e7d32", label: "Có thể sử dụng" },
      in_use: { bg: "#667eea22", color: "#667eea", label: "Đang sử dụng" },
      maintenance: { bg: "#ff980022", color: "#ff9800", label: "Bảo trì" },
      rented: { bg: "#673ab722", color: "#673ab7", label: "Máy thuê" },
      borrowed: { bg: "#03a9f422", color: "#03a9f4", label: "Máy mượn" },
      borrowed_out: { bg: "#00bcd422", color: "#00bcd4", label: "Cho mượn" },
      liquidation: { bg: "#f4433622", color: "#f44336", label: "Thanh lý" },
      pending_liquidation: {
        bg: "#ff572222",
        color: "#ff5722",
        label: "Chờ thanh lý",
      },
      disabled: { bg: "#9e9e9e22", color: "#9e9e9e", label: "Vô hiệu hóa" },
      broken: { bg: "#9e9e9e22", color: "#9e9e9e", label: "Máy hư" },
      borrowed_return: {
        bg: "#03a9f422",
        color: "#03a9f4",
        label: "Đã trả (Máy Mượn)",
      },
      rented_return: {
        bg: "#673ab722",
        color: "#673ab7",
        label: "Đã trả (Máy Thuê)",
      },
    };
    return statusColors[status] || { bg: "#f0f0f0", color: "#555", label: "-" };
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "available":
        return <CheckCircle />;
      case "in_use":
        return <Build />;
      case "maintenance":
        return <Build />;
      case "rented":
        return <ReceiptLong />;
      case "borrowed":
        return <SwapHoriz />;
      case "borrowed_out":
        return <SwapHoriz />;
      case "liquidation":
        return <Cancel />;
      case "pending_liquidation":
        return <HourglassFull />;
      case "disabled":
        return <Cancel />;
      case "broken":
        return <Cancel />;
      case "rented_return":
        return <ReceiptLong />;
      case "borrowed_return":
        return <SwapHoriz />;
      default:
        return <CheckCircle />;
    }
  };

  const formatCurrency = (value) => {
    if (!value) return "-";
    return new Intl.NumberFormat("en-US").format(value) + " ₫";
  };

  const formatNumberVN = (value) => {
    if (!value && value !== 0) return "";
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const parseNumberVN = (value) => {
    if (!value) return "";
    const cleanValue = value.replace(/,/g, "");
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

  // Sorting logic
  const handleSortRequest = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    } else if (sortConfig.key === key && sortConfig.direction === "desc") {
      key = null; // Clear sort
      direction = "asc";
    }
    setSortConfig({ key, direction });
  };

  const sortedMachines = React.useMemo(() => {
    let sortableMachines = [...machines];
    if (sortConfig.key) {
      sortableMachines.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];

        // Handle nulls/undefined to sort them at the end
        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return 1;
        if (bVal == null) return -1;

        let compare = 0;
        // Check for specific data types
        if (["price", "lifespan", "repair_cost"].includes(sortConfig.key)) {
          compare = aVal - bVal;
        } else if (
          [
            "date_of_use",
            "is_borrowed_or_rented_or_borrowed_out_date",
            "is_borrowed_or_rented_or_borrowed_out_return_date",
          ].includes(sortConfig.key)
        ) {
          compare = new Date(aVal) - new Date(bVal);
        } else {
          // Default to string comparison
          compare = aVal.toString().localeCompare(bVal.toString());
        }

        return sortConfig.direction === "asc" ? compare : -compare;
      });
    }
    return sortableMachines;
  }, [machines, sortConfig]);

  // Column visibility logic
  const handleColumnMenuOpen = (event) => {
    setColumnMenuAnchor(event.currentTarget);
  };

  const handleColumnMenuClose = () => {
    setColumnMenuAnchor(null);
  };

  const handleColumnToggle = (columnKey) => {
    setColumnVisibility((prev) => ({
      ...prev,
      [columnKey]: !prev[columnKey],
    }));
  };

  const visibleColumnCount =
    1 + Object.values(columnVisibility).filter((v) => v).length;

  /**
   * Hàm mới: Xử lý khi nhấp vào thẻ thống kê
   * @param {string[]} [currentStatus=[]] - Mảng các trạng thái chính (ví dụ: ['available'])
   * @param {string[]} [borrowStatus=[]] - Mảng các trạng thái mượn/thuê (ví dụ: ['borrowed'])
   */
  const handleStatusFilterClick = (currentStatus = [], borrowStatus = []) => {
    setFilters((prev) => ({
      ...prev,
      // Giữ nguyên các bộ lọc dropdown
      type_machines: prev.type_machines,
      model_machines: prev.model_machines,
      manufacturers: prev.manufacturers,
      name_locations: prev.name_locations,
      // Cập nhật bộ lọc trạng thái
      current_status: currentStatus,
      borrow_status: borrowStatus,
    }));
    setPage(1); // Quay về trang 1 khi lọc
    // useEffect [searchTerm, filters] sẽ tự động gọi fetchMachines

    if (tableCardRef.current) {
      tableCardRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start", // Cuộn lên đầu của element
      });
    }
  };

  /**
   * Hàm mới: Kiểm tra xem thẻ có đang được chọn (active) hay không
   */
  const isStatusFilterActive = (current = [], borrow = []) => {
    // Helper để so sánh 2 mảng (không quan tâm thứ tự)
    const arraysEqual = (a, b) => {
      if (a.length !== b.length) return false;
      const sortedA = [...a].sort();
      const sortedB = [...b].sort();
      return sortedA.every((val, index) => val === sortedB[index]);
    };

    return (
      arraysEqual(filters.current_status, current) &&
      arraysEqual(filters.borrow_status, borrow)
    );
  };

  // Định nghĩa style cho thẻ active/inactive
  const activeCardSx = {
    cursor: "pointer",
    border: `3px solid ${theme.palette.primary.main}`, // Viền màu tím
    boxShadow: "0 8px 25px rgba(102, 126, 234, 0.3)", // Đổ bóng
    transform: "translateY(-4px)", // Nâng lên
    transition: "all 0.2s ease",
  };
  const inactiveCardSx = {
    cursor: "pointer",
    border: "1px solid rgba(0, 0, 0, 0.05)",
    transition: "all 0.2s ease",
    "&:hover": {
      transform: "translateY(-2px)",
      boxShadow: "0 4px 12px rgba(0,0,0,0.05)", // Bóng mờ khi hover
    },
  };
  const displayTotal =
    (stats.total || 0) -
    (stats.liquidation || 0) -
    (stats.borrowed_return || 0) -
    (stats.rented_return || 0);
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
                Danh sách Máy móc thiết bị
              </Typography>
              <Typography
                variant={isMobile ? "body1" : "h6"}
                color="text.secondary"
              >
                Quản lý thông tin máy móc thiết bị
              </Typography>
            </Box>
          </Stack>
        </Box>

        {/* Statistics Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {/* Cột chính cho thẻ "Hero" */}
          <Grid size={{ xs: 12, md: 5, lg: 4 }}>
            <Card
              elevation={0}
              onClick={() => handleStatusFilterClick([], [])}
              sx={{
                borderRadius: "20px",
                background:
                  "linear-gradient(135deg, #667eea22 0%, #764ba222 100%)",
                border: "1px solid rgba(0, 0, 0, 0.05)",
                height: "100%", // Kéo dài thẻ để cân đối
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                ...(isStatusFilterActive([], [])
                  ? activeCardSx
                  : inactiveCardSx),
              }}
            >
              <CardContent sx={{ textAlign: "center", p: 4 }}>
                <Typography
                  variant="body1"
                  color="text.secondary"
                  sx={{ mb: 1, textTransform: "uppercase" }}
                >
                  Tổng số máy
                </Typography>
                <Typography
                  variant={isMobile ? "h2" : "h1"}
                  fontWeight="bold"
                  color="#667eea"
                >
                  {formatNumber(displayTotal || 0)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Cột phụ cho các thẻ còn lại */}
          <Grid size={{ xs: 12, md: 7, lg: 8 }}>
            <Grid container spacing={3}>
              {/* --- HÀNG 1 --- */}
              {/* 1. Có thể sử dụng */}
              <Grid size={{ xs: 6 }}>
                <Card
                  elevation={0}
                  onClick={() => handleStatusFilterClick(["available"], [])}
                  sx={{
                    borderRadius: "20px",
                    background: "#2e7d3211",
                    border: "1px solid rgba(0, 0, 0, 0.05)",
                    ...(isStatusFilterActive(["available"], [])
                      ? activeCardSx
                      : inactiveCardSx),
                  }}
                >
                  <CardContent sx={{ textAlign: "center", py: 3 }}>
                    <Typography
                      variant={isMobile ? "h5" : "h4"}
                      fontWeight="bold"
                      color="#2e7d32"
                    >
                      {formatNumber(stats.available || 0)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Có thể sử dụng
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              {/* 2. Đang sử dụng */}
              <Grid size={{ xs: 6 }}>
                <Card
                  elevation={0}
                  onClick={() => handleStatusFilterClick(["in_use"], [])}
                  sx={{
                    borderRadius: "20px",
                    background: "#1976d211",
                    border: "1px solid rgba(0, 0, 0, 0.05)",
                    ...(isStatusFilterActive(["in_use"], [])
                      ? activeCardSx
                      : inactiveCardSx),
                  }}
                >
                  <CardContent sx={{ textAlign: "center", py: 3 }}>
                    <Typography
                      variant={isMobile ? "h5" : "h4"}
                      fontWeight="bold"
                      color="#1976d2"
                    >
                      {formatNumber(stats.in_use || 0)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Đang sử dụng
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              {/* Bảo trì */}
              {/* <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
                <Card
                  elevation={0}
                  onClick={() => handleStatusFilterClick(["maintenance"], [])}
                  sx={{
                    borderRadius: "20px",
                    background: "#ff980011",
                    border: "1px solid rgba(0, 0, 0, 0.05)",
                    ...(isStatusFilterActive(["maintenance"], [])
                      ? activeCardSx
                      : inactiveCardSx),
                  }}
                >
                  <CardContent sx={{ textAlign: "center", py: 3 }}>
                    <Typography
                      variant={isMobile ? "h5" : "h4"}
                      fontWeight="bold"
                      color="#ff9800"
                    >
                      {stats.maintenance || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Bảo trì
                    </Typography>
                  </CardContent>
                </Card>
              </Grid> */}
              {/* Thanh lý */}
              {/* <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
                <Card
                  elevation={0}
                  onClick={() => handleStatusFilterClick(["liquidation"], [])}
                  sx={{
                    borderRadius: "20px",
                    background: "#f4433611",
                    border: "1px solid rgba(0, 0, 0, 0.05)",
                    ...(isStatusFilterActive(["liquidation"], [])
                      ? activeCardSx
                      : inactiveCardSx),
                  }}
                >
                  <CardContent sx={{ textAlign: "center", py: 3 }}>
                    <Typography
                      variant={isMobile ? "h5" : "h4"}
                      fontWeight="bold"
                      color="#f44336"
                    >
                      {stats.liquidation || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Thanh lý
                    </Typography>
                  </CardContent>
                </Card>
              </Grid> */}
              {/* Vô hiệu hóa / Bị hỏng */}
              {/* <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
                <Card
                  elevation={0}
                  onClick={() =>
                    handleStatusFilterClick(
                      [
                        // "disabled",
                        "broken",
                      ],
                      []
                    )
                  }
                  sx={{
                    borderRadius: "20px",
                    background: "#9e9e9e11",
                    border: "1px solid rgba(0, 0, 0, 0.05)",
                    ...(isStatusFilterActive(
                      [
                        // "disabled",
                        "broken",
                      ],
                      []
                    )
                      ? activeCardSx
                      : inactiveCardSx),
                  }}
                >
                  <CardContent sx={{ textAlign: "center", py: 3 }}>
                    <Typography
                      variant={isMobile ? "h5" : "h4"}
                      fontWeight="bold"
                      color="#9e9e9e"
                    > */}
              {/* {stats.disabled || 0}/ */}
              {/* {stats.broken || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary"> */}
              {/* Vô hiệu hóa/ */}
              {/* Máy hư
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>             */}

              {/* --- HÀNG 2 --- */}
              {/* 3. Chưa sử dụng (Gộp: Bảo trì + Máy hư + Vô hiệu hóa/Cho mượn) */}
              <Grid size={{ xs: 6 }}>
                <Card
                  elevation={0}
                  onClick={() =>
                    handleStatusFilterClick(
                      ["maintenance", "broken", "disabled"],
                      []
                    )
                  }
                  sx={{
                    borderRadius: "20px",
                    background: "#ff980011", // Màu cam nhạt
                    border: "1px solid rgba(0, 0, 0, 0.05)",
                    ...(isStatusFilterActive(
                      ["maintenance", "broken", "disabled"],
                      []
                    )
                      ? activeCardSx
                      : inactiveCardSx),
                  }}
                >
                  <CardContent sx={{ textAlign: "center", py: 3 }}>
                    <Typography
                      variant={isMobile ? "h5" : "h4"}
                      fontWeight="bold"
                      color="#ed6c02" // Màu cam đậm
                    >
                      {/* Tổng hợp số lượng các trạng thái con */}
                      {formatNumber(
                        (Number(stats.maintenance) || 0) +
                          (Number(stats.broken) || 0) +
                          (Number(stats.borrowed_out) || 0)
                      )}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Chưa sử dụng
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              {/* 4. Chờ thanh lý */}
              <Grid size={{ xs: 6 }}>
                <Card
                  elevation={0}
                  onClick={() =>
                    handleStatusFilterClick(["pending_liquidation"], [])
                  }
                  sx={{
                    borderRadius: "20px",
                    background: "#ff572211",
                    border: "1px solid rgba(0, 0, 0, 0.05)",
                    ...(isStatusFilterActive(["pending_liquidation"], [])
                      ? activeCardSx
                      : inactiveCardSx),
                  }}
                >
                  <CardContent sx={{ textAlign: "center", py: 3 }}>
                    <Typography
                      variant={isMobile ? "h5" : "h4"}
                      fontWeight="bold"
                      color="#ff5722"
                    >
                      {formatNumber(stats.pending_liquidation || 0)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Chờ thanh lý
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              {/* Thuê */}
              {/* <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
                <Card
                  elevation={0}
                  onClick={() => handleStatusFilterClick([], ["rented"])}
                  sx={{
                    borderRadius: "20px",
                    background: "#673ab711",
                    border: "1px solid rgba(0, 0, 0, 0.05)",
                    ...(isStatusFilterActive([], ["rented"])
                      ? activeCardSx
                      : inactiveCardSx),
                  }}
                >
                  <CardContent sx={{ textAlign: "center", py: 3 }}>
                    <Typography
                      variant={isMobile ? "h5" : "h4"}
                      fontWeight="bold"
                      color="#673ab7"
                    >
                      {stats.rented || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Thuê
                    </Typography>
                  </CardContent>
                </Card>
              </Grid> */}
              {/* Đã trả (Máy thuê) */}
              {/* <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
                <Card
                  elevation={0}
                  onClick={() =>
                    handleStatusFilterClick(["disabled"], ["rented_return"])
                  }
                  sx={{
                    borderRadius: "20px",
                    background: "#673ab711", // Màu tím thuê
                    border: "1px solid rgba(0, 0, 0, 0.05)",
                    ...(isStatusFilterActive(["disabled"], ["rented_return"])
                      ? activeCardSx
                      : inactiveCardSx),
                  }}
                >
                  <CardContent sx={{ textAlign: "center", py: 3 }}>
                    <Typography
                      variant={isMobile ? "h5" : "h4"}
                      fontWeight="bold"
                      color="#673ab7"
                    >
                      {stats.rented_return || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Đã trả (Máy thuê)
                    </Typography>
                  </CardContent>
                </Card>
              </Grid> */}
              {/* Mượn */}
              {/* <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
                <Card
                  elevation={0}
                  onClick={() => handleStatusFilterClick([], ["borrowed"])}
                  sx={{
                    borderRadius: "20px",
                    background: "#03a9f411",
                    border: "1px solid rgba(0, 0, 0, 0.05)",
                    ...(isStatusFilterActive([], ["borrowed"])
                      ? activeCardSx
                      : inactiveCardSx),
                  }}
                >
                  <CardContent sx={{ textAlign: "center", py: 3 }}>
                    <Typography
                      variant={isMobile ? "h5" : "h4"}
                      fontWeight="bold"
                      color="#03a9f4"
                    >
                      {stats.borrowed || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Mượn
                    </Typography>
                  </CardContent>
                </Card>
              </Grid> */}
              {/* Đã trả (Máy mượn) */}
              {/* <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
                <Card
                  elevation={0}
                  onClick={() =>
                    handleStatusFilterClick(["disabled"], ["borrowed_return"])
                  }
                  sx={{
                    borderRadius: "20px",
                    background: "#03a9f411", // Màu xanh mượn
                    border: "1px solid rgba(0, 0, 0, 0.05)",
                    ...(isStatusFilterActive(["disabled"], ["borrowed_return"])
                      ? activeCardSx
                      : inactiveCardSx),
                  }}
                >
                  <CardContent sx={{ textAlign: "center", py: 3 }}>
                    <Typography
                      variant={isMobile ? "h5" : "h4"}
                      fontWeight="bold"
                      color="#03a9f4"
                    >
                      {stats.borrowed_return || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Đã trả (Máy mượn)
                    </Typography>
                  </CardContent>
                </Card>
              </Grid> */}
              {/* Cho mượn (ĐÃ CHUYỂN LÊN) */}
              {/* <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
                <Card
                  elevation={0}
                  onClick={() =>
                    handleStatusFilterClick(["disabled"], ["borrowed_out"])
                  }
                  sx={{
                    borderRadius: "20px",
                    background: "#00bcd411",
                    border: "1px solid rgba(0, 0, 0, 0.05)",
                    ...(isStatusFilterActive(["disabled"], ["borrowed_out"])
                      ? activeCardSx
                      : inactiveCardSx),
                  }}
                >
                  <CardContent sx={{ textAlign: "center", py: 3 }}>
                    <Typography
                      variant={isMobile ? "h5" : "h4"}
                      fontWeight="bold"
                      color="#00bcd4"
                    >
                      {stats.borrowed_out || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Cho mượn
                    </Typography>
                  </CardContent>
                </Card>
              </Grid> */}
            </Grid>
          </Grid>

          <Grid size={12} sx={{ mt: 1 }}>
            <StatusMatrixTable
              data={matrixData}
              loading={matrixLoading}
              onCellClick={handleMatrixClick}
              activeFilters={filters}
            />
          </Grid>

          {typeStats.length > 0 && (
            <Grid size={12} sx={{ mt: 3 }}>
              {" "}
              {/* Tăng mt để tách biệt khỏi hàng trên */}
              <Card
                elevation={0}
                sx={{
                  borderRadius: "20px",
                  background: "#f5f5f5", // Màu xám nhạt
                  border: "1px solid rgba(0, 0, 0, 0.05)",
                }}
              >
                <CardContent>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    Thống kê theo loại máy
                  </Typography>

                  {/* Danh sách các loại máy */}
                  <List dense sx={{ pt: 0, pb: 1, width: "100%" }}>
                    {typeStats
                      .slice(0, isTypeStatsExpanded ? typeStats.length : 4) // Chỉ hiển thị 4 mục đầu tiên khi thu gọn
                      .map((typeStat) => (
                        <ListItem
                          key={typeStat.type_machine}
                          disableGutters
                          sx={{
                            borderBottom: "1px dashed #e0e0e0",
                            py: 0.5,
                          }}
                        >
                          <ListItemText
                            primary={
                              <Box
                                sx={{ display: "flex", alignItems: "baseline" }}
                              >
                                <Typography
                                  component="span"
                                  variant="body1"
                                  sx={{
                                    whiteSpace: "nowrap",
                                    // textTransform: "uppercase",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    mr: 1, // Thêm khoảng cách
                                  }}
                                >
                                  {/* Thêm dấu hai chấm (:) */}
                                  {typeStat.type_machine}:
                                </Typography>
                                <Typography
                                  component="span"
                                  variant="body1"
                                  fontWeight="bold"
                                  color="#333"
                                  sx={{ flexShrink: 0 }} // Đảm bảo số lượng không bị cắt
                                >
                                  {typeStat.count} máy
                                </Typography>
                              </Box>
                            }
                          />
                        </ListItem>
                      ))}
                  </List>

                  {/* Nút Expand/Collapse */}
                  {typeStats.length > 4 && ( // Chỉ hiển thị nút nếu có nhiều hơn 4 mục
                    <Box sx={{ textAlign: "center", mt: 1 }}>
                      <Button
                        onClick={() =>
                          setIsTypeStatsExpanded(!isTypeStatsExpanded)
                        }
                        size="small"
                        sx={{ borderRadius: "12px" }}
                      >
                        {isTypeStatsExpanded ? "Thu gọn" : "Xem thêm"}
                      </Button>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* {typeStats.length > 0 && (
            <Grid size={12} sx={{ mt: 1 }}>
              <Divider>
                <Chip label="Thống kê theo loại máy" />
              </Divider>
            </Grid>
          )}

          {typeStats.map((typeStat) => (
            <Grid size={{ xs: 6, sm: 4, md: 3 }} key={typeStat.type_machine}>
              <Card
                elevation={0}
                sx={{
                  borderRadius: "20px",
                  background: "#f5f5f5", // Màu xám nhạt
                  border: "1px solid rgba(0, 0, 0, 0.05)",
                  height: "100%", // Đảm bảo các thẻ cao bằng nhau
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                }}
              >
                <CardContent sx={{ textAlign: "center", py: 3 }}>
                  <Typography variant="h4" fontWeight="bold" color="#333">
                    {typeStat.count}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      // Style để tránh text quá dài
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      px: 1, // Thêm padding để không bị sát viền
                    }}
                  >
                    {typeStat.type_machine}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))} */}
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
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={2}
                sx={{ flexGrow: 1, width: { xs: "100%", sm: "auto" } }}
              >
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
                    placeholder="Tìm kiếm máy móc..."
                    variant="outlined"
                    size="medium"
                    defaultValue=""
                    inputRef={searchInputRef}
                    onChange={handleSearchChange}
                    sx={{
                      width: "100%",
                      maxWidth: { sm: 400 },
                      "& .MuiOutlinedInput-root": {
                        borderRadius: "12px",
                        paddingRight: 1,
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
                          <IconButton
                            onClick={() => {
                              if (searchInputRef.current) {
                                searchInputRef.current.value = "";
                                searchInputRef.current.focus();
                              }
                              setSearchTerm("");
                              setPage(1);
                            }}
                            edge="end"
                            size="small"
                            sx={{ color: "text.secondary" }}
                          >
                            <Close fontSize="small" />
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Tooltip>
                <FormControl
                  sx={{ minWidth: 120, width: { xs: "100%", sm: 120 } }}
                >
                  <InputLabel>Số dòng</InputLabel>
                  <Select
                    value={rowsPerPage}
                    label="Số dòng"
                    onChange={handleRowsPerPageChange}
                    sx={{
                      borderRadius: "12px",
                    }}
                  >
                    <MenuItem value={5}>5</MenuItem>
                    <MenuItem value={10}>10</MenuItem>
                    <MenuItem value={20}>20</MenuItem>
                    <MenuItem value={50}>50</MenuItem>
                    <MenuItem value={100}>100</MenuItem>
                    <MenuItem value={200}>200</MenuItem>
                    <MenuItem value={500}>500</MenuItem>
                  </Select>
                </FormControl>
              </Stack>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={2}
                flexWrap="wrap"
                sx={{ width: { xs: "100%", sm: "auto" } }}
              >
                {/* <<< 3. THAY ĐỔI: ẨN NÚT "NHẬP EXCEL" VÀ "THÊM MÁY" CHO VIEW ONLY >>> */}
                {canCreateOrImport && (
                  <Button
                    variant="outlined"
                    startIcon={<FileUpload />}
                    onClick={handleOpenImportDialog}
                    sx={{
                      borderRadius: "12px",
                      color: "#2e7d32",
                      borderColor: "#2e7d32",
                      px: 3,
                      py: 1.5,
                      width: { xs: "100%", sm: "auto" },
                    }}
                  >
                    Nhập Excel
                  </Button>
                )}
                {canCreateOrImport && (
                  <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={handleOpenCreateDialog}
                    sx={{
                      borderRadius: "12px",
                      background: "linear-gradient(45deg, #2e7d32, #4caf50)",
                      px: 3,
                      py: 1.5,
                      "&:hover": {
                        transform: "translateY(-2px)",
                        boxShadow: "0 8px 25px rgba(46, 125, 50, 0.3)",
                      },
                      transition: "all 0.3s ease",
                      width: { xs: "100%", sm: "auto" },
                    }}
                  >
                    Thêm máy
                  </Button>
                )}

                <Button
                  variant="outlined"
                  startIcon={<Download />} // Import Download icon từ @mui/icons-material
                  onClick={handleExportExcel}
                  sx={{
                    borderRadius: "12px",
                    px: 3,
                    py: 1.5,
                    color: "#1976d2", // Màu xanh dương hoặc màu tùy chọn
                    borderColor: "#1976d2",
                    width: { xs: "100%", sm: "auto" },
                    "&:hover": {
                      borderColor: "#1565c0",
                      bgcolor: "rgba(25, 118, 210, 0.04)",
                    },
                  }}
                >
                  Xuất Excel DS Máy
                </Button>

                {/* Column Visibility Button */}
                <Button
                  variant="outlined"
                  startIcon={<ViewColumn />}
                  onClick={handleColumnMenuOpen}
                  sx={{
                    borderRadius: "12px",
                    px: 3,
                    py: 1.5,
                    color: "#667eea",
                    borderColor: "#667eea",
                    width: { xs: "100%", sm: "auto" },
                  }}
                >
                  Cột
                </Button>

                <Button
                  variant="contained"
                  startIcon={<Refresh />}
                  onClick={() => {
                    fetchMachines(searchTerm);
                    fetchStats();
                    fetchTypeStats();
                    fetchFilterOptions();
                    fetchMatrixStats();
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
            </Stack>
          </CardContent>
        </Card>

        <Card
          elevation={0}
          sx={{
            mb: 3,
            borderRadius: "20px",
            border: "1px solid rgba(0, 0, 0, 0.05)",
          }}
        >
          <CardContent sx={{ p: 3, "&:last-child": { pb: 3 } }}>
            <Typography
              variant="h6"
              gutterBottom
              sx={{ fontWeight: 600, mb: 2 }}
            >
              Bộ lọc chi tiết
            </Typography>
            <Grid container spacing={2}>
              {/* Filter: Loại máy */}
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Loại máy</InputLabel>
                  <Select
                    multiple
                    name="type_machines"
                    value={filters.type_machines}
                    onChange={handleFilterChange}
                    label="Loại máy"
                    renderValue={renderMultiSelectValue}
                    sx={{ borderRadius: "12px" }}
                  >
                    {typeOptions.map((name) => (
                      <MenuItem key={name} value={name}>
                        <Checkbox
                          checked={filters.type_machines.indexOf(name) > -1}
                        />
                        <ListItemText primary={name} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              {/* Filter: Model */}
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Model</InputLabel>
                  <Select
                    multiple
                    name="model_machines"
                    value={filters.model_machines}
                    onChange={handleFilterChange}
                    label="Model"
                    renderValue={renderMultiSelectValue}
                    sx={{ borderRadius: "12px" }}
                  >
                    {modelOptions.map((name) => (
                      <MenuItem key={name} value={name}>
                        <Checkbox
                          checked={filters.model_machines.indexOf(name) > -1}
                        />
                        <ListItemText primary={name} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              {/* Filter: Hãng SX */}
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Hãng SX</InputLabel>
                  <Select
                    multiple
                    name="manufacturers"
                    value={filters.manufacturers}
                    onChange={handleFilterChange}
                    label="Hãng SX"
                    renderValue={renderMultiSelectValue}
                    sx={{ borderRadius: "12px" }}
                  >
                    {manufacturerOptions.map((name) => (
                      <MenuItem key={name} value={name}>
                        <Checkbox
                          checked={filters.manufacturers.indexOf(name) > -1}
                        />
                        <ListItemText primary={name} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              {/* Filter: Vị trí */}
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Vị trí hiện tại</InputLabel>
                  <Select
                    multiple
                    name="name_locations"
                    value={filters.name_locations}
                    onChange={handleFilterChange}
                    label="Vị trí hiện tại"
                    renderValue={renderMultiSelectValue}
                    sx={{ borderRadius: "12px" }}
                  >
                    {locationOptions.map((name) => (
                      <MenuItem key={name} value={name}>
                        <Checkbox
                          checked={filters.name_locations.indexOf(name) > -1}
                        />
                        <ListItemText primary={name} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Column Visibility Menu */}
        <Menu
          anchorEl={columnMenuAnchor}
          open={Boolean(columnMenuAnchor)}
          onClose={handleColumnMenuClose}
        >
          {Object.entries(columnConfig).map(([key, name]) => (
            <MenuItem key={key} onClick={() => handleColumnToggle(key)}>
              <Checkbox checked={columnVisibility[key]} />
              <ListItemText primary={name} />
            </MenuItem>
          ))}
        </Menu>

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
            ref={tableCardRef}
            elevation={0}
            sx={{
              borderRadius: "20px",
              border: "1px solid rgba(0, 0, 0, 0.05)",
            }}
          >
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow
                    sx={{ backgroundColor: "rgba(102, 126, 234, 0.05)" }}
                  >
                    <TableCell
                      sx={{
                        fontWeight: 600,
                        fontSize: "0.95rem",
                        whiteSpace: "nowrap",
                      }}
                    >
                      STT
                    </TableCell>

                    {/* Added sort labels and visibility checks */}
                    {columnVisibility.code_machine && (
                      <TableCell
                        sx={{
                          fontWeight: 600,
                          fontSize: "0.95rem",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <TableSortLabel
                          active={sortConfig.key === "code_machine"}
                          direction={
                            sortConfig.key === "code_machine"
                              ? sortConfig.direction
                              : "asc"
                          }
                          onClick={() => handleSortRequest("code_machine")}
                        >
                          Mã máy
                        </TableSortLabel>
                      </TableCell>
                    )}
                    {columnVisibility.type_machine && (
                      <TableCell
                        sx={{
                          fontWeight: 600,
                          fontSize: "0.95rem",
                          minWidth: "150px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <TableSortLabel
                          active={sortConfig.key === "type_machine"}
                          direction={
                            sortConfig.key === "type_machine"
                              ? sortConfig.direction
                              : "asc"
                          }
                          onClick={() => handleSortRequest("type_machine")}
                        >
                          Loại máy
                        </TableSortLabel>
                      </TableCell>
                    )}
                    {columnVisibility.model_machine && (
                      <TableCell
                        sx={{
                          fontWeight: 600,
                          fontSize: "0.95rem",
                          minWidth: "200px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <TableSortLabel
                          active={sortConfig.key === "model_machine"}
                          direction={
                            sortConfig.key === "model_machine"
                              ? sortConfig.direction
                              : "asc"
                          }
                          onClick={() => handleSortRequest("model_machine")}
                        >
                          Model
                        </TableSortLabel>
                      </TableCell>
                    )}
                    {columnVisibility.manufacturer && (
                      <TableCell
                        sx={{
                          fontWeight: 600,
                          fontSize: "0.95rem",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <TableSortLabel
                          active={sortConfig.key === "manufacturer"}
                          direction={
                            sortConfig.key === "manufacturer"
                              ? sortConfig.direction
                              : "asc"
                          }
                          onClick={() => handleSortRequest("manufacturer")}
                        >
                          Hãng SX
                        </TableSortLabel>
                      </TableCell>
                    )}
                    {columnVisibility.serial_machine && (
                      <TableCell
                        sx={{
                          fontWeight: 600,
                          fontSize: "0.95rem",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <TableSortLabel
                          active={sortConfig.key === "serial_machine"}
                          direction={
                            sortConfig.key === "serial_machine"
                              ? sortConfig.direction
                              : "asc"
                          }
                          onClick={() => handleSortRequest("serial_machine")}
                        >
                          Serial
                        </TableSortLabel>
                      </TableCell>
                    )}
                    {columnVisibility.RFID_machine && (
                      <TableCell
                        sx={{
                          fontWeight: 600,
                          fontSize: "0.95rem",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <TableSortLabel
                          active={sortConfig.key === "RFID_machine"}
                          direction={
                            sortConfig.key === "RFID_machine"
                              ? sortConfig.direction
                              : "asc"
                          }
                          onClick={() => handleSortRequest("RFID_machine")}
                        >
                          RFID
                        </TableSortLabel>
                      </TableCell>
                    )}
                    {columnVisibility.NFC_machine && (
                      <TableCell
                        sx={{
                          fontWeight: 600,
                          fontSize: "0.95rem",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <TableSortLabel
                          active={sortConfig.key === "NFC_machine"}
                          direction={
                            sortConfig.key === "NFC_machine"
                              ? sortConfig.direction
                              : "asc"
                          }
                          onClick={() => handleSortRequest("NFC_machine")}
                        >
                          NFC
                        </TableSortLabel>
                      </TableCell>
                    )}
                    {columnVisibility.name_category && (
                      <TableCell
                        sx={{
                          fontWeight: 600,
                          fontSize: "0.95rem",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <TableSortLabel
                          active={sortConfig.key === "name_category"}
                          direction={
                            sortConfig.key === "name_category"
                              ? sortConfig.direction
                              : "asc"
                          }
                          onClick={() => handleSortRequest("name_category")}
                        >
                          Phân loại
                        </TableSortLabel>
                      </TableCell>
                    )}
                    {columnVisibility.name_location && (
                      <TableCell
                        sx={{
                          fontWeight: 600,
                          fontSize: "0.95rem",
                          minWidth: "150px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <TableSortLabel
                          active={sortConfig.key === "name_location"}
                          direction={
                            sortConfig.key === "name_location"
                              ? sortConfig.direction
                              : "asc"
                          }
                          onClick={() => handleSortRequest("name_location")}
                        >
                          Vị trí hiện tại
                        </TableSortLabel>
                      </TableCell>
                    )}
                    {columnVisibility.current_status && (
                      <TableCell
                        sx={{
                          fontWeight: 600,
                          fontSize: "0.95rem",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <TableSortLabel
                          active={sortConfig.key === "current_status"}
                          direction={
                            sortConfig.key === "current_status"
                              ? sortConfig.direction
                              : "asc"
                          }
                          onClick={() => handleSortRequest("current_status")}
                        >
                          Trạng thái (chính)
                        </TableSortLabel>
                      </TableCell>
                    )}
                    {columnVisibility.is_borrowed_or_rented_or_borrowed_out && (
                      <TableCell
                        sx={{
                          fontWeight: 600,
                          fontSize: "0.95rem",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <TableSortLabel
                          active={
                            sortConfig.key ===
                            "is_borrowed_or_rented_or_borrowed_out"
                          }
                          direction={
                            sortConfig.key ===
                            "is_borrowed_or_rented_or_borrowed_out"
                              ? sortConfig.direction
                              : "asc"
                          }
                          onClick={() =>
                            handleSortRequest(
                              "is_borrowed_or_rented_or_borrowed_out"
                            )
                          }
                        >
                          Trạng thái (mượn/thuê)
                        </TableSortLabel>
                      </TableCell>
                    )}
                    {columnVisibility.is_borrowed_or_rented_or_borrowed_out_name && (
                      <TableCell
                        sx={{
                          fontWeight: 600,
                          fontSize: "0.95rem",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <TableSortLabel
                          active={
                            sortConfig.key ===
                            "is_borrowed_or_rented_or_borrowed_out_name"
                          }
                          direction={
                            sortConfig.key ===
                            "is_borrowed_or_rented_or_borrowed_out_name"
                              ? sortConfig.direction
                              : "asc"
                          }
                          onClick={() =>
                            handleSortRequest(
                              "is_borrowed_or_rented_or_borrowed_out_name"
                            )
                          }
                        >
                          Đơn vị (mượn/thuê)
                        </TableSortLabel>
                      </TableCell>
                    )}
                    {columnVisibility.is_borrowed_or_rented_or_borrowed_out_date && (
                      <TableCell
                        sx={{
                          fontWeight: 600,
                          fontSize: "0.95rem",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <TableSortLabel
                          active={
                            sortConfig.key ===
                            "is_borrowed_or_rented_or_borrowed_out_date"
                          }
                          direction={
                            sortConfig.key ===
                            "is_borrowed_or_rented_or_borrowed_out_date"
                              ? sortConfig.direction
                              : "asc"
                          }
                          onClick={() =>
                            handleSortRequest(
                              "is_borrowed_or_rented_or_borrowed_out_date"
                            )
                          }
                        >
                          Ngày (mượn/thuê)
                        </TableSortLabel>
                      </TableCell>
                    )}
                    {columnVisibility.is_borrowed_or_rented_or_borrowed_out_return_date && (
                      <TableCell
                        sx={{
                          fontWeight: 600,
                          fontSize: "0.95rem",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <TableSortLabel
                          active={
                            sortConfig.key ===
                            "is_borrowed_or_rented_or_borrowed_out_return_date"
                          }
                          direction={
                            sortConfig.key ===
                            "is_borrowed_or_rented_or_borrowed_out_return_date"
                              ? sortConfig.direction
                              : "asc"
                          }
                          onClick={() =>
                            handleSortRequest(
                              "is_borrowed_or_rented_or_borrowed_out_return_date"
                            )
                          }
                        >
                          Ngày trả (mượn/thuê)
                        </TableSortLabel>
                      </TableCell>
                    )}
                    {columnVisibility.price && (
                      <TableCell
                        sx={{
                          fontWeight: 600,
                          fontSize: "0.95rem",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <TableSortLabel
                          active={sortConfig.key === "price"}
                          direction={
                            sortConfig.key === "price"
                              ? sortConfig.direction
                              : "asc"
                          }
                          onClick={() => handleSortRequest("price")}
                        >
                          Giá
                        </TableSortLabel>
                      </TableCell>
                    )}
                    {columnVisibility.lifespan && (
                      <TableCell
                        sx={{
                          fontWeight: 600,
                          fontSize: "0.95rem",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <TableSortLabel
                          active={sortConfig.key === "lifespan"}
                          direction={
                            sortConfig.key === "lifespan"
                              ? sortConfig.direction
                              : "asc"
                          }
                          onClick={() => handleSortRequest("lifespan")}
                        >
                          Tuổi thọ (năm)
                        </TableSortLabel>
                      </TableCell>
                    )}
                    {columnVisibility.repair_cost && (
                      <TableCell
                        sx={{
                          fontWeight: 600,
                          fontSize: "0.95rem",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <TableSortLabel
                          active={sortConfig.key === "repair_cost"}
                          direction={
                            sortConfig.key === "repair_cost"
                              ? sortConfig.direction
                              : "asc"
                          }
                          onClick={() => handleSortRequest("repair_cost")}
                        >
                          Chi phí sửa chữa
                        </TableSortLabel>
                      </TableCell>
                    )}
                    {columnVisibility.date_of_use && (
                      <TableCell
                        sx={{
                          fontWeight: 600,
                          fontSize: "0.95rem",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <TableSortLabel
                          active={sortConfig.key === "date_of_use"}
                          direction={
                            sortConfig.key === "date_of_use"
                              ? sortConfig.direction
                              : "asc"
                          }
                          onClick={() => handleSortRequest("date_of_use")}
                        >
                          Ngày sử dụng
                        </TableSortLabel>
                      </TableCell>
                    )}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {machines.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={visibleColumnCount}
                        align="center"
                        sx={{ py: 4 }}
                      >
                        <Typography color="text.secondary">
                          Không tìm thấy máy móc nào
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    /* Map over sortedMachines */
                    sortedMachines.map((machine, index) => {
                      const mainStatusInfo = getStatusColor(
                        machine.current_status
                      );
                      return (
                        <TableRow
                          key={machine.uuid_machine}
                          hover
                          // <<< CHANGED: Added onClick and cursor >>>
                          onClick={() => handleOpenDialog(machine.uuid_machine)}
                          sx={{
                            cursor: "pointer", // Make row look clickable
                            "&:hover": {
                              bgcolor: "rgba(102, 126, 234, 0.03)", // Màu hover nhẹ
                            },
                            transition: "all 0.2s ease",
                          }}
                          // <<< END OF CHANGE >>>
                        >
                          <TableCell>
                            {(page - 1) * rowsPerPage + index + 1}
                          </TableCell>

                          {/* Added visibility checks */}
                          {columnVisibility.code_machine && (
                            <TableCell
                              sx={{ fontWeight: 500, whiteSpace: "nowrap" }}
                            >
                              {machine.code_machine || "-"}
                            </TableCell>
                          )}
                          {columnVisibility.type_machine && (
                            <TableCell sx={{ whiteSpace: "nowrap" }}>
                              {machine.type_machine || "-"}
                            </TableCell>
                          )}
                          {columnVisibility.model_machine && (
                            <TableCell
                              sx={{ fontWeight: 500, whiteSpace: "nowrap" }}
                            >
                              {machine.model_machine || "-"}
                            </TableCell>
                          )}
                          {columnVisibility.manufacturer && (
                            <TableCell sx={{ whiteSpace: "nowrap" }}>
                              {machine.manufacturer || "-"}
                            </TableCell>
                          )}
                          {columnVisibility.serial_machine && (
                            <TableCell sx={{ whiteSpace: "nowrap" }}>
                              {machine.serial_machine || "-"}
                            </TableCell>
                          )}
                          {columnVisibility.RFID_machine && (
                            <TableCell sx={{ whiteSpace: "nowrap" }}>
                              {machine.RFID_machine || "-"}
                            </TableCell>
                          )}
                          {columnVisibility.NFC_machine && (
                            <TableCell sx={{ whiteSpace: "nowrap" }}>
                              {machine.NFC_machine || "-"}
                            </TableCell>
                          )}
                          {columnVisibility.name_category && (
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
                          )}
                          {columnVisibility.name_location && (
                            <TableCell
                              sx={{ fontWeight: 500, whiteSpace: "nowrap" }}
                            >
                              {machine.name_location || "-"}
                            </TableCell>
                          )}
                          {columnVisibility.current_status && (
                            <TableCell>
                              <Chip
                                icon={getStatusIcon(machine.current_status)}
                                label={mainStatusInfo.label}
                                size="small"
                                sx={{
                                  background: mainStatusInfo.bg,
                                  color: mainStatusInfo.color,
                                  fontWeight: 600,
                                  borderRadius: "8px",
                                  textTransform: "uppercase",
                                }}
                              />
                            </TableCell>
                          )}
                          {columnVisibility.is_borrowed_or_rented_or_borrowed_out && (
                            <TableCell>
                              {machine.is_borrowed_or_rented_or_borrowed_out
                                ? (() => {
                                    let borrowStatusInfo = getStatusColor(
                                      machine.is_borrowed_or_rented_or_borrowed_out
                                    );

                                    if (
                                      machine.is_borrowed_or_rented_or_borrowed_out ===
                                      "borrowed"
                                    ) {
                                      if (
                                        machine.is_borrowed_or_rented_or_borrowed_out_return_date
                                      ) {
                                        borrowStatusInfo = {
                                          ...borrowStatusInfo,
                                          label: "Máy mượn ngắn hạn",
                                        };
                                      } else {
                                        borrowStatusInfo = {
                                          ...borrowStatusInfo,
                                          label: "Máy mượn dài hạn",
                                        };
                                      }
                                    }
                                    // if (
                                    //   machine.is_borrowed_or_rented_or_borrowed_out ===
                                    //   "borrowed_out"
                                    // ) {
                                    //   if (
                                    //     machine.is_borrowed_or_rented_or_borrowed_out_return_date
                                    //   ) {
                                    //     borrowStatusInfo = {
                                    //       ...borrowStatusInfo,
                                    //       label: "Máy cho mượn ngắn hạn",
                                    //     };
                                    //   } else {
                                    //     borrowStatusInfo = {
                                    //       ...borrowStatusInfo,
                                    //       label: "Máy cho mượn dài hạn",
                                    //     };
                                    //   }
                                    // }
                                    return (
                                      <Chip
                                        icon={getStatusIcon(
                                          machine.is_borrowed_or_rented_or_borrowed_out
                                        )}
                                        label={borrowStatusInfo.label}
                                        size="small"
                                        sx={{
                                          background: borrowStatusInfo.bg,
                                          color: borrowStatusInfo.color,
                                          fontWeight: 600,
                                          borderRadius: "8px",
                                          textTransform: "uppercase",
                                        }}
                                      />
                                    );
                                  })()
                                : "-"}
                            </TableCell>
                          )}
                          {columnVisibility.is_borrowed_or_rented_or_borrowed_out_name && (
                            <TableCell sx={{ whiteSpace: "nowrap" }}>
                              {machine.is_borrowed_or_rented_or_borrowed_out_name ||
                                "-"}
                            </TableCell>
                          )}
                          {columnVisibility.is_borrowed_or_rented_or_borrowed_out_date && (
                            <TableCell sx={{ whiteSpace: "nowrap" }}>
                              {formatDate(
                                machine.is_borrowed_or_rented_or_borrowed_out_date
                              )}
                            </TableCell>
                          )}
                          {columnVisibility.is_borrowed_or_rented_or_borrowed_out_return_date && (
                            <TableCell sx={{ whiteSpace: "nowrap" }}>
                              {formatDate(
                                machine.is_borrowed_or_rented_or_borrowed_out_return_date
                              )}
                            </TableCell>
                          )}
                          {columnVisibility.price && (
                            <TableCell sx={{ whiteSpace: "nowrap" }}>
                              {formatCurrency(machine.price)}
                            </TableCell>
                          )}
                          {columnVisibility.lifespan && (
                            <TableCell sx={{ whiteSpace: "nowrap" }}>
                              {machine.lifespan || "-"}
                            </TableCell>
                          )}
                          {columnVisibility.repair_cost && (
                            <TableCell sx={{ whiteSpace: "nowrap" }}>
                              {formatCurrency(machine.repair_cost)}
                            </TableCell>
                          )}
                          {columnVisibility.date_of_use && (
                            <TableCell sx={{ whiteSpace: "nowrap" }}>
                              {formatDate(machine.date_of_use)}
                            </TableCell>
                          )}
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
                  flexDirection: { xs: "column", sm: "row" },
                  gap: 2,
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
                  size={isMobile ? "small" : "large"}
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
          fullScreen={isMobile}
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: isMobile ? 0 : "20px",
            },
          }}
        >
          {/* Cập nhật style DialogTitle để giống TicketManagementPage */}
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
              <Typography variant={isMobile ? "h6" : "h5"} fontWeight="bold">
                {isCreateMode ? "Thêm máy móc mới" : "Chi tiết máy móc"}
              </Typography>
              <IconButton
                onClick={handleCloseDialog}
                size="small"
                sx={{ color: "white" }}
              >
                <Close />
              </IconButton>
            </Stack>
          </DialogTitle>
          <Divider />
          <DialogContent sx={{ pt: 3 }}>
            {(selectedMachine || isCreateMode) && (
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
                        <Stack
                          direction={{ xs: "column", sm: "row" }}
                          spacing={3}
                          alignItems="center"
                        >
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
                              value={`${
                                editedData.name_category === "Máy móc thiết bị"
                                  ? "MAY"
                                  : "PHUKIEN"
                              }-${editedData.serial_machine}`}
                              size={150}
                              level="H"
                              includeMargin={true}
                            />
                          </Box>

                          {/* QR Code Info */}
                          <Box sx={{ flex: 1 }}>
                            {/* <Box sx={{ textAlign: "left", display: "", mb: 2 }}>
                              <Typography variant="h6" fontWeight="bold">
                                {editedData.code_machine}
                              </Typography>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                Serial:{" "}
                                {editedData.id_category === 1
                                  ? "MAY"
                                  : "PHUKIEN"}
                                -{editedData.serial_machine}
                              </Typography>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                {editedData.type_machine} -{" "}
                                {editedData.model_machine}
                              </Typography>
                            </Box> */}
                            <Typography
                              variant={isMobile ? "subtitle1" : "h6"}
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
                              direction={{ xs: "column", sm: "row" }}
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
                                  width: { xs: "100%", sm: "auto" },
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
                                  width: { xs: "100%", sm: "auto" },
                                }}
                              >
                                Tải xuống
                              </Button>
                              <Button
                                variant="outlined"
                                onClick={() => setShowQRCode(false)}
                                sx={{
                                  borderRadius: "12px",
                                  width: { xs: "100%", sm: "auto" },
                                }}
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
                    value={editedData.code_machine || ""}
                    onChange={(e) =>
                      handleInputChange("code_machine", e.target.value)
                    }
                    disabled={!canCreateOrImport || !isCreateMode}
                    sx={
                      !(isAdmin || canEdit) || !isCreateMode
                        ? DISABLED_VIEW_SX
                        : {}
                    }
                    // THÊM: Nút refresh nhỏ ở cuối ô để tạo lại mã nếu cần
                    InputProps={{
                      endAdornment: isCreateMode && (
                        <InputAdornment position="end">
                          <Tooltip title="Tự động tạo mã theo Hãng SX">
                            <IconButton onClick={handleGenerateCode} edge="end">
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
                    value={editedData.serial_machine || ""}
                    onChange={(e) =>
                      handleInputChange("serial_machine", e.target.value)
                    }
                    disabled={!canCreateOrImport || !isCreateMode} // Bị khóa nếu là view-only và cơ điện xưởng HOẶC là chế độ xem chi tiết
                    sx={
                      !(isAdmin || canEdit) || !isCreateMode
                        ? DISABLED_VIEW_SX
                        : {}
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
                    disabled={!canCreateOrImport} // Bị khóa nếu là view-only và cơ điện xưởng
                    sx={DISABLED_VIEW_SX}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="NFC"
                    value={editedData.NFC_machine || ""}
                    onChange={(e) =>
                      handleInputChange("NFC_machine", e.target.value)
                    }
                    disabled={!canCreateOrImport}
                    sx={DISABLED_VIEW_SX}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  {isCreateMode ? (
                    <FormControl
                      fullWidth
                      disabled={!canCreateOrImport}
                      required
                    >
                      <InputLabel>Phân loại</InputLabel>
                      <Select
                        name="name_category"
                        value={editedData.name_category || ""}
                        label="Phân loại"
                        onChange={(e) =>
                          handleInputChange("name_category", e.target.value)
                        }
                      >
                        {categoryOptions.map((category) => (
                          <MenuItem
                            key={category.name_category}
                            value={category.name_category} // Value là TÊN
                          >
                            {category.name_category}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  ) : (
                    <TextField
                      fullWidth
                      label="Phân loại"
                      value={editedData.name_category || ""}
                      disabled={true}
                      sx={DISABLED_VIEW_SX} // Luôn bị khóa
                    />
                  )}
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Loại máy"
                    required
                    value={editedData.type_machine || ""}
                    onChange={(e) =>
                      handleInputChange("type_machine", e.target.value)
                    }
                    disabled={!canCreateOrImport} // Bị khóa nếu là view-only và cơ điện xưởng
                    sx={DISABLED_VIEW_SX}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Model máy"
                    value={editedData.model_machine || ""}
                    onChange={(e) =>
                      handleInputChange("model_machine", e.target.value)
                    }
                    disabled={!canCreateOrImport} // Bị khóa nếu là view-only và cơ điện xưởng
                    sx={DISABLED_VIEW_SX}
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
                    // THÊM: Sự kiện onBlur để tự động gọi API khi nhập xong
                    onBlur={handleGenerateCode}
                    disabled={!canCreateOrImport}
                    sx={DISABLED_VIEW_SX}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl
                    fullWidth
                    disabled={!canCreateOrImport} // Bị khóa nếu là view-only và cơ điện xưởng
                    sx={DISABLED_VIEW_SX}
                  >
                    <InputLabel>Trạng thái</InputLabel>
                    <Select
                      value={editedData.current_status}
                      label="Trạng thái"
                      onChange={(e) =>
                        handleInputChange("current_status", e.target.value)
                      }
                    >
                      <MenuItem value="available">Có thể sử dụng</MenuItem>
                      <MenuItem value="in_use">Đang sử dụng</MenuItem>
                      <MenuItem value="maintenance">Bảo trì</MenuItem>
                      <MenuItem value="liquidation">Thanh lý</MenuItem>
                      <MenuItem value="pending_liquidation">
                        Chờ thanh lý
                      </MenuItem>
                      <MenuItem value="disabled">Vô hiệu hóa</MenuItem>
                      <MenuItem value="broken">Máy hư</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                {!isCreateMode && (
                  <>
                    <Grid size={{ xs: 12 }}>
                      <Divider sx={{ my: 2 }}>
                        <Chip label="Lịch sử vị trí" />
                      </Divider>
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <TextField
                        fullWidth
                        label="Vị trí hiện tại"
                        value={editedData.name_location || "Chưa có vị trí"}
                        disabled
                        sx={DISABLED_VIEW_SX}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      {historyLoading ? (
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "center",
                            my: 3,
                          }}
                        >
                          <CircularProgress />
                        </Box>
                      ) : machineHistory.length === 0 ? (
                        <Typography
                          align="center"
                          color="text.secondary"
                          sx={{ my: 2 }}
                        >
                          Không có lịch sử di chuyển.
                        </Typography>
                      ) : (
                        <TableContainer
                          component={Paper}
                          elevation={0}
                          variant="outlined"
                          sx={{ borderRadius: "12px", maxHeight: 300 }}
                        >
                          <Table stickyHeader size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell sx={{ fontWeight: "bold" }}>
                                  Ngày di chuyển
                                </TableCell>
                                <TableCell sx={{ fontWeight: "bold" }}>
                                  Từ vị trí
                                </TableCell>
                                <TableCell sx={{ fontWeight: "bold" }}>
                                  Đến vị trí
                                </TableCell>
                                <TableCell sx={{ fontWeight: "bold" }}>
                                  Người thực hiện
                                </TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {machineHistory.map((entry, index) => (
                                <TableRow key={index}>
                                  <TableCell>
                                    {formatDate(entry.move_date)}
                                  </TableCell>
                                  <TableCell>
                                    {entry.from_location_name || "-"}
                                  </TableCell>
                                  <TableCell>
                                    {entry.to_location_name || "-"}
                                  </TableCell>
                                  <TableCell sx={{ whiteSpace: "nowrap" }}>
                                    {entry.ma_nv
                                      ? `${entry.ma_nv}: ${
                                          entry.ten_nv || "--"
                                        }`
                                      : entry.created_by || "--"}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      )}
                    </Grid>
                  </>
                )}

                {/* Thêm thông tin Mượn/Thuê (chỉ đọc) */}
                {!isCreateMode && (
                  <>
                    <Grid size={{ xs: 12 }}>
                      <Divider sx={{ my: 2 }}>
                        <Chip label="Thông tin Mượn / Thuê / Cho mượn" />
                      </Divider>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        fullWidth
                        value={(() => {
                          if (
                            editedData.is_borrowed_or_rented_or_borrowed_out ===
                            "borrowed"
                          )
                            return "Mượn";
                          if (
                            editedData.is_borrowed_or_rented_or_borrowed_out ===
                            "rented"
                          )
                            return "Thuê";
                          if (
                            editedData.is_borrowed_or_rented_or_borrowed_out ===
                            "borrowed_out"
                          )
                            return "Cho mượn";
                          return "NULL";
                        })()}
                        label="Trạng thái Mượn/Thuê"
                        disabled
                        sx={DISABLED_VIEW_SX}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        fullWidth
                        label="Đơn vị (mượn/thuê)"
                        value={
                          editedData.is_borrowed_or_rented_or_borrowed_out_name ||
                          "NULL"
                        }
                        disabled
                        sx={DISABLED_VIEW_SX}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        fullWidth
                        label="Ngày (mượn/thuê)"
                        type="date"
                        value={formatDateForInput(
                          editedData.is_borrowed_or_rented_or_borrowed_out_date
                        )}
                        disabled
                        sx={DISABLED_VIEW_SX}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        fullWidth
                        label="Ngày trả (dự kiến)"
                        type="date"
                        value={formatDateForInput(
                          editedData.is_borrowed_or_rented_or_borrowed_out_return_date
                        )}
                        onChange={(e) =>
                          handleInputChange(
                            "is_borrowed_or_rented_or_borrowed_out_return_date",
                            e.target.value || null // Gửi null nếu ngày bị xóa
                          )
                        }
                        InputLabelProps={{ shrink: true }}
                        disabled={!canCreateOrImport} // Bị khóa nếu là view-only và cơ điện xưởng
                        sx={DISABLED_VIEW_SX}
                      />
                    </Grid>
                  </>
                )}

                <Grid size={{ xs: 12 }}>
                  <Divider sx={{ my: 2 }}>
                    <Chip label="Thông tin Chi phí & Thời gian" />
                  </Divider>
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
                    disabled={!canCreateOrImport} // Bị khóa nếu là view-only và cơ điện xưởng
                    sx={DISABLED_VIEW_SX}
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
                    disabled={!canCreateOrImport} // Bị khóa nếu là view-only và cơ điện xưởng
                    sx={DISABLED_VIEW_SX}
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
                    disabled={!canCreateOrImport} // Bị khóa nếu là view-only và cơ điện xưởng
                    sx={DISABLED_VIEW_SX}
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
                    disabled={!canCreateOrImport} // Bị khóa nếu là view-only và cơ điện xưởng
                    sx={DISABLED_VIEW_SX}
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
                    disabled={!canCreateOrImport} // Bị khóa nếu là view-only và cơ điện xưởng
                    sx={DISABLED_VIEW_SX}
                  />
                </Grid>

                {!isCreateMode && selectedMachine && (
                  <Grid size={{ xs: 12 }}>
                    <Alert severity="info" sx={{ borderRadius: "12px" }}>
                      <Typography variant="body2">
                        <strong>Người tạo:</strong>{" "}
                        {editedData.creator_ma_nv
                          ? `${editedData.creator_ma_nv}: ${
                              editedData.creator_ten_nv || "--"
                            }`
                          : selectedMachine.created_by || "--"}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Tạo lúc:</strong>{" "}
                        {new Date(selectedMachine.created_at).toLocaleString(
                          "vi-VN"
                        )}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Người cập nhật:</strong>{" "}
                        {editedData.updater_ma_nv
                          ? `${editedData.updater_ma_nv}: ${
                              editedData.updater_ten_nv || "--"
                            }`
                          : selectedMachine.updated_by || "--"}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Cập nhật lần cuối:</strong>{" "}
                        {new Date(selectedMachine.updated_at).toLocaleString(
                          "vi-VN"
                        )}
                      </Typography>
                    </Alert>
                  </Grid>
                )}
              </Grid>
            )}
          </DialogContent>
          <Divider />
          <DialogActions
            sx={{
              p: 3,
              flexDirection: { xs: "column-reverse", sm: "row" },
              gap: 1,
              justifyContent: "flex-end", // Căn phải
            }}
          >
            <Button
              onClick={handleCloseDialog}
              variant="outlined"
              color="inherit"
              sx={{ borderRadius: "12px", width: { xs: "100%", sm: "auto" } }}
            >
              {/* <<< 4. THAY ĐỔI: ĐỔI TÊN NÚT CHO VIEW-ONLY >>> */}
              Đóng
            </Button>

            {/* <<< 5. THAY ĐỔI: ẨN NÚT LƯU CHO VIEW-ONLY VÀ CƠ ĐIỆN XƯỞNG >>> */}
            {canCreateOrImport && (
              <Button
                onClick={handleSave}
                variant="contained"
                startIcon={<Save />}
                sx={{
                  borderRadius: "12px",
                  background: "linear-gradient(45deg, #667eea, #764ba2)",
                  width: { xs: "100%", sm: "auto" },
                }}
              >
                {isCreateMode ? "Thêm thiết bị mới" : "Lưu thay đổi"}
              </Button>
            )}
          </DialogActions>
        </Dialog>

        <Dialog
          open={importDialogOpen}
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
              <Typography variant={isMobile ? "h6" : "h5"} fontWeight="bold">
                Nhập máy móc từ file Excel
              </Typography>
            </Stack>
          </DialogTitle>
          <Divider />
          <DialogContent
            sx={{
              pt: 3,
              display: "flex",
              flexDirection: "column",
              gap: 3,
              pb: 1, // Giảm padding bottom
            }}
          >
            {/* Hướng dẫn */}
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

            {/* Chọn file */}
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

            {/* Kết quả */}
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
                      Chi tiết thành công:
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
              onClick={handleImport}
              variant="contained"
              startIcon={<Save />}
              sx={{
                borderRadius: "12px",
                background: "linear-gradient(45deg, #2e7d32, #4caf50)",
                width: { xs: "100%", sm: "auto" },
              }}
              disabled={!importFile || isImporting}
            >
              {isImporting ? "Đang nhập Excel..." : "Bắt đầu Nhập Excel"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Notification Snackbar */}
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

export default MachineListPage;
