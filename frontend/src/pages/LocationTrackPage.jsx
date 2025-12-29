// frontend/src/pages/LocationTrackPage.jsx

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Container,
  Typography,
  Box,
  Card,
  Stack,
  Avatar,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert,
  Pagination,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  CardContent,
  useTheme,
  useMediaQuery,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  IconButton,
} from "@mui/material";
import {
  LocationOn,
  ArrowForward,
  Business,
  MeetingRoom,
  Refresh,
  KeyboardArrowDown,
  KeyboardArrowUp,
} from "@mui/icons-material";
import { alpha } from "@mui/material/styles";
import NavigationBar from "../components/NavigationBar";
import { api } from "../api/api";

const renderMultiSelectValue = (selected) => (
  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
    {selected.slice(0, 3).map((value) => (
      <Chip key={value} label={value} size="small" />
    ))}
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

  // 1. Cấu hình cột
  const columns = [
    { key: "internal", label: "Máy nội bộ" },
    { key: "borrowed", label: "Máy mượn" },
    { key: "rented", label: "Máy thuê" },
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
  ];

  // 3. Cấu hình hàng con: ĐỒNG BỘ MÀU CAM CHO TẤT CẢ
  const subRowConfig = [
    { key: "maintenance", label: "Bảo trì", color: "#00bcd4", bg: "#e0f7fa" },
    { key: "broken", label: "Máy hư", color: "#00bcd4", bg: "#e0f7fa" },
    { key: "disabled", label: "Cho mượn", color: "#00bcd4", bg: "#e0f7fa" },
  ];

  // 4. Xử lý dữ liệu (Giữ nguyên logic cũ của bạn)
  const processData = () => {
    if (!data) return {};
    const newData = JSON.parse(JSON.stringify(data));
    Object.keys(newData).forEach((statusKey) => {
      const row = newData[statusKey];
      if (row) {
        const borrowedOutCount = row["borrowed_out"] || 0;
        row["internal"] = (row["internal"] || 0) + borrowedOutCount;
        row["borrowed_out"] = 0;
      }
    });
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

  // --- Logic Active (Giữ nguyên) ---
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
        ? borrow_status.includes("internal")
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

  // --- CẤU HÌNH MÀU TÍM CHO TỔNG (Giống MachineListPage) ---
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

            {/* --- CẬP NHẬT HÀNG TỔNG (MÀU TÍM) --- */}
            <TableRow sx={{ backgroundColor: "#fafafa" }}>
              {(() => {
                const active = isRowActive("ALL");
                return (
                  <TableCell
                    className="cell-first-col"
                    sx={{
                      cursor: "default",
                      fontWeight: "bold !important",
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
                  backgroundColor: `${alpha(TOTAL_ROW_COLOR, 0.15)} !important`,
                  color: `${TOTAL_ROW_COLOR} !important`,
                  fontWeight: "bold",
                  fontSize: "1.1rem !important",
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

const LocationTrackPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [departments, setDepartments] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [loadingDepartments, setLoadingDepartments] = useState(false);

  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [machinesAtLocation, setMachinesAtLocation] = useState([]);
  const [loadingLocations, setLoadingLocations] = useState(false); // Đổi tên từ loadingLocations
  const [loadingMachines, setLoadingMachines] = useState(false);
  const [locationStats, setLocationStats] = useState({
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

  // BỔ SUNG STATES CHO PHÂN TRANG
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;
  const [typeStats, setTypeStats] = useState([]);
  const [isMachineTypeStatsExpanded, setIsMachineTypeStatsExpanded] =
    useState(false);

  // History Dialog States
  const [openHistoryDialog, setOpenHistoryDialog] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const filterCardRef = useRef(null);
  // State for filter dropdown data
  const [typeOptions, setTypeOptions] = useState([]);
  const [modelOptions, setModelOptions] = useState([]);
  const [manufacturerOptions, setManufacturerOptions] = useState([]);

  const [matrixData, setMatrixData] = useState({});
  const [matrixLoading, setMatrixLoading] = useState(false);

  // State for selected filter values
  const [filters, setFilters] = useState({
    type_machines: [],
    model_machines: [],
    manufacturers: [],
    name_locations: [], // Dùng khi xem theo Đơn vị
    current_status: [], // Dùng cho cả 2
    borrow_status: [], // Dùng cho cả 2
  });

  // ĐỊNH NGHĨA CONFIG TRẠNG THÁI (ĐỒNG BỘ VỚI TicketManagementPage.jsx)
  const STATUS_CONFIG = {
    available: { bg: "#2e7d3222", color: "#2e7d32", label: "Có thể sử dụng" },
    in_use: { bg: "#667eea22", color: "#667eea", label: "Đang sử dụng" },
    maintenance: { bg: "#ff980022", color: "#ff9800", label: "Bảo trì" },
    rented: { bg: "#673ab722", color: "#673ab7", label: "Máy thuê" },
    rented_return: {
      bg: "#673ab722",
      color: "#673ab7",
      label: "Đã trả (Máy Thuê)",
    },
    borrowed: { bg: "#03a9f422", color: "#03a9f4", label: "Máy mượn" },
    borrowed_return: {
      bg: "#03a9f422",
      color: "#03a9f4",
      label: "Đã trả (Máy Mượn)",
    },
    borrowed_out: { bg: "#00bcd422", color: "#00bcd4", label: "Cho mượn" },
    liquidation: { bg: "#f4433622", color: "#f44336", label: "Thanh lý" },
    pending_liquidation: {
      bg: "#ff572222",
      color: "#ff5722",
      label: "Chờ thanh lý",
    },
    disabled: { bg: "#9e9e9e22", color: "#9e9e9e", label: "Chưa sử dụng" },
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

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // --- Fetch Data ---

  // <<< BẮT ĐẦU SỬA ĐỔI HÀM TẢI DỮ LIỆU >>>
  // SỬA HÀM NÀY: Tải Vị trí dựa trên Đơn vị
  const fetchLocations = useCallback(async (departmentUuid) => {
    // Chỉ tải vị trí khi có departmentUuid
    if (!departmentUuid) {
      setLocations([]);
      return;
    }
    setLoadingLocations(true);
    try {
      // Truyền department_uuid làm param
      const response = await api.locations.getAll({
        department_uuid: departmentUuid,
      });
      setLocations(response.data);
    } catch (error) {
      console.error("Error fetching locations:", error);
      setLocations([]);
    } finally {
      setLoadingLocations(false);
    }
  }, []);

  // THÊM HÀM NÀY: Tải Đơn vị
  const fetchDepartments = useCallback(async () => {
    setLoadingDepartments(true);
    try {
      const response = await api.departments.getAll();
      setDepartments(response.data);
    } catch (error) {
      console.error("Error fetching departments:", error);
    } finally {
      setLoadingDepartments(false);
    }
  }, []);
  // <<< KẾT THÚC SỬA ĐỔI HÀM TẢI DỮ LIỆU >>>

  // CẬP NHẬT: Chấp nhận page, limit và gọi API với params
  const fetchMachinesAtLocation = useCallback(
    async (locationUuid, pageNumber = 1, limitNumber = limit) => {
      setLoadingMachines(true);
      setMachinesAtLocation([]);
      setPage(pageNumber);

      try {
        const { borrow_status, ...filtersForLocation } = filters; // Bỏ qua 'name_locations' khi đã chọn vị trí

        const params = {
          page: pageNumber,
          limit: limitNumber,
          ...filtersForLocation,
        };

        // Map borrow_status sang tên param của backend
        if (borrow_status && borrow_status.length > 0) {
          params.is_borrowed_or_rented_or_borrowed_out = borrow_status;
        }
        // Giả định api.tracking.getMachinesByLocation đã được cập nhật để chấp nhận params
        const response = await api.tracking.getMachinesByLocation(
          locationUuid,
          params
        );
        setMachinesAtLocation(response.data);
        setLocationStats(response.stats);
        setTotalPages(response.pagination.totalPages);
      } catch (error) {
        console.error("Error fetching machines at location:", error);
        setMachinesAtLocation([]);
        setLocationStats({
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
        });
        setTotalPages(1);
      } finally {
        setLoadingMachines(false);
      }
    },
    [limit, filters]
  );

  const fetchMachineHistory = useCallback(async (machineUuid) => {
    setLoadingHistory(true);
    setHistoryData([]);
    try {
      const response = await api.tracking.getMachineHistory(machineUuid);
      setHistoryData(response.data.history);
      setSelectedMachine(response.data.machine);
    } catch (error) {
      console.error("Error fetching machine history:", error);
      setHistoryData([]);
      setSelectedMachine(null);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  const fetchMachineTypeStats = useCallback(async (locationUuid) => {
    // Không cần kiểm tra locationUuid vì nó sẽ được gọi trong useEffect
    try {
      const response = await api.tracking.getMachineStatsByTypeAtLocation(
        locationUuid
      );
      if (response.success) {
        setTypeStats(response.data);
      } else {
        setTypeStats([]);
      }
    } catch (error) {
      console.error("Error fetching machine type stats:", error);
      setTypeStats([]);
    }
  }, []);

  const fetchMachinesAtDepartment = useCallback(
    async (departmentUuid, pageNumber = 1, limitNumber = limit) => {
      setLoadingMachines(true);
      setMachinesAtLocation([]);
      setPage(pageNumber);

      try {
        const params = {
          page: pageNumber,
          limit: limitNumber,
          ...filters,
        };

        // Map borrow_status sang tên param của backend
        if (filters.borrow_status && filters.borrow_status.length > 0) {
          params.is_borrowed_or_rented_or_borrowed_out = filters.borrow_status;
        }
        delete params.borrow_status; // Xóa key cũ
        const response = await api.tracking.getMachinesByDepartment(
          departmentUuid,
          params
        );
        setMachinesAtLocation(response.data);
        setLocationStats(response.stats);
        setTotalPages(response.pagination.totalPages);
      } catch (error) {
        console.error("Error fetching machines at department:", error);
        setMachinesAtLocation([]);
        setLocationStats({
          /* ... (reset stats) ... */
        });
        setTotalPages(1);
      } finally {
        setLoadingMachines(false);
      }
    },
    [limit, filters]
  );

  const fetchDepartmentTypeStats = useCallback(async (departmentUuid) => {
    try {
      const response = await api.tracking.getMachineStatsByTypeAtDepartment(
        departmentUuid
      );
      if (response.success) {
        setTypeStats(response.data);
      } else {
        setTypeStats([]);
      }
    } catch (error) {
      console.error("Error fetching machine type stats for department:", error);
      setTypeStats([]);
    }
  }, []);

  const fetchFilterOptions = useCallback(async () => {
    let params = {};
    if (selectedLocation) {
      params.location_uuid = selectedLocation.uuid_location;
    } else if (selectedDepartment) {
      params.department_uuid = selectedDepartment.uuid_department;
    } else {
      // Nếu không chọn gì, xóa các tùy chọn và không gọi API
      setTypeOptions([]);
      setModelOptions([]);
      setManufacturerOptions([]);
      return;
    }
    try {
      // Tải song song các tùy chọn chung
      const [typeRes, modelRes, manuRes] = await Promise.all([
        api.machines.getDistinctValues({ field: "type_machine", ...params }),
        api.machines.getDistinctValues({ field: "model_machine", ...params }),
        api.machines.getDistinctValues({ field: "manufacturer", ...params }),
      ]);
      if (typeRes.success) setTypeOptions(typeRes.data);
      if (modelRes.success) setModelOptions(modelRes.data);
      if (manuRes.success) setManufacturerOptions(manuRes.data);
    } catch (err) {
      console.error("Error fetching filter options:", err);
    }
  }, [selectedDepartment, selectedLocation]);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  useEffect(() => {
    fetchFilterOptions();
  }, [fetchFilterOptions]);

  // THÊM useEffect NÀY: Tải Vị trí khi Đơn vị thay đổi
  useEffect(() => {
    if (selectedDepartment) {
      fetchLocations(selectedDepartment.uuid_department);
    } else {
      fetchLocations(null); // Xóa danh sách vị trí nếu không chọn đơn vị
    }
  }, [selectedDepartment, fetchLocations]);

  // useEffect để tự động tải lại máy móc khi `selectedLocation` hoặc `page` thay đổi
  useEffect(() => {
    if (selectedLocation) {
      // ƯU TIÊN 1: Tải theo VỊ TRÍ
      fetchMachinesAtLocation(selectedLocation.uuid_location, page, limit);
      fetchMachineTypeStats(selectedLocation.uuid_location);
    } else if (selectedDepartment) {
      // ƯU TIÊN 2: Tải theo ĐƠN VỊ
      fetchMachinesAtDepartment(
        selectedDepartment.uuid_department,
        page,
        limit
      );
      fetchDepartmentTypeStats(selectedDepartment.uuid_department);
    } else {
      // ƯU TIÊN 3: Reset mọi thứ
      setMachinesAtLocation([]);
      setLocationStats({
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
      });
      setTotalPages(1);
      setPage(1);
      setTypeStats([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDepartment, selectedLocation, page, limit, filters]);

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
    setPage(1); // Reset về trang 1 khi lọc
  };

  const handleDepartmentChange = (department) => {
    setSelectedDepartment(department);
    // Reset vị trí và máy móc khi đổi đơn vị
    setSelectedLocation(null);
    setMachinesAtLocation([]);
    setPage(1);
    setFilters({
      type_machines: [],
      model_machines: [],
      manufacturers: [],
      name_locations: [],
      current_status: [],
      borrow_status: [],
    });
  };

  const handleLocationChange = (location) => {
    setSelectedLocation(location);
    // Reset phân trang và danh sách khi thay đổi vị trí
    setPage(1);
    setFilters((prev) => ({
      ...prev,
      type_machines: [],
      model_machines: [],
      manufacturers: [],
      name_locations: [],
    }));
  };

  const handlePageChange = (event, value) => {
    // Chỉ cập nhật state page, useEffect sẽ tự động gọi fetchMachinesAtLocation
    setPage(value);
  };

  const handleOpenHistoryDialog = (machine) => {
    fetchMachineHistory(machine.uuid_machine);
    setOpenHistoryDialog(true);
  };

  const handleCloseHistoryDialog = () => {
    setOpenHistoryDialog(false);
    setSelectedMachine(null);
    setHistoryData([]);
  };

  /**
   * Hàm mới: Xử lý khi nhấp vào thẻ thống kê
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

    // Cuộn xuống bảng
    if (filterCardRef.current) {
      filterCardRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  /**
   * Hàm mới: Kiểm tra xem thẻ có đang được chọn (active) hay không
   */
  const isStatusFilterActive = (current = [], borrow = []) => {
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

  const fetchMatrixStats = useCallback(async (locationUuid, departmentUuid) => {
    setMatrixLoading(true);
    try {
      let result = { success: false, data: {} };
      if (locationUuid) {
        // Gọi API ma trận cho Location
        result = await api.tracking.getMatrixStatsByLocation(locationUuid);
      } else if (departmentUuid) {
        // Gọi API ma trận cho Department
        result = await api.tracking.getMatrixStatsByDepartment(departmentUuid);
      } else {
        // Reset nếu không có gì chọn
        setMatrixData({});
        setMatrixLoading(false);
        return;
      }

      if (result.success) {
        setMatrixData(result.data);
      } else {
        setMatrixData({});
      }
    } catch (err) {
      console.error("Error fetching matrix stats:", err);
      setMatrixData({});
    } finally {
      setMatrixLoading(false);
    }
  }, []);

  // 4. THÊM HÀM handleMatrixClick (Tương tự MachineListPage)
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
    if (filterCardRef.current) {
      const ref = filterCardRef.current;
      ref.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  // 5. CẬP NHẬT useEffect (Gọi thêm fetchMatrixStats)
  useEffect(() => {
    if (selectedLocation) {
      // ƯU TIÊN 1: VỊ TRÍ
      fetchMachinesAtLocation(selectedLocation.uuid_location, page, limit);
      fetchMachineTypeStats(selectedLocation.uuid_location);
      fetchMatrixStats(selectedLocation.uuid_location, null); // <<< GỌI MATRIX
    } else if (selectedDepartment) {
      // ƯU TIÊN 2: ĐƠN VỊ
      fetchMachinesAtDepartment(
        selectedDepartment.uuid_department,
        page,
        limit
      );
      fetchDepartmentTypeStats(selectedDepartment.uuid_department);
      fetchMatrixStats(null, selectedDepartment.uuid_department); // <<< GỌI MATRIX
    } else {
      // RESET
      setMachinesAtLocation([]);
      setLocationStats({
        /* reset values */
      });
      setTotalPages(1);
      setPage(1);
      setTypeStats([]);
      setMatrixData({}); // <<< RESET MATRIX
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDepartment, selectedLocation, page, limit, filters]);

  // 6. CẬP NHẬT hàm handleRefresh
  const handleRefresh = () => {
    fetchDepartments();
    if (selectedDepartment) fetchLocations(selectedDepartment.uuid_department);

    if (selectedLocation) {
      setPage(1);
      fetchMachinesAtLocation(selectedLocation.uuid_location, 1, limit);
      fetchMachineTypeStats(selectedLocation.uuid_location);
      fetchMatrixStats(selectedLocation.uuid_location, null); // Refresh Matrix
    } else if (selectedDepartment) {
      setPage(1);
      fetchMachinesAtDepartment(selectedDepartment.uuid_department, 1, limit);
      fetchDepartmentTypeStats(selectedDepartment.uuid_department);
      fetchMatrixStats(null, selectedDepartment.uuid_department); // Refresh Matrix
    } else {
      // Reset logic...
      setMatrixData({});
    }
  };

  // --- Render Functions ---
  const renderMachineTable = () => {
    if (loadingMachines) {
      return (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: 200,
          }}
        >
          <CircularProgress />
        </Box>
      );
    }

    if (!selectedDepartment) {
      return (
        <Alert severity="info" sx={{ borderRadius: "12px", mt: 1 }}>
          <Typography variant="body1" sx={{ fontWeight: 500 }}>
            Vui lòng chọn một Đơn vị ở bước 1.
          </Typography>
        </Alert>
      );
    }

    const stats = locationStats;
    const displayTotal =
      (stats.total || 0) -
      (stats.liquidation || 0) -
      (stats.borrowed_return || 0) -
      (stats.rented_return || 0);
    const renderStatsCards = () => (
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {/* Tổng số máy (Thẻ Lớn) */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card
            elevation={0}
            onClick={() => handleStatusFilterClick([], [])}
            sx={{
              borderRadius: "20px",
              background:
                "linear-gradient(135deg, #667eea22 0%, #764ba222 100%)",
              border: "1px solid rgba(0, 0, 0, 0.05)",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              ...(isStatusFilterActive([], []) ? activeCardSx : inactiveCardSx),
            }}
          >
            <CardContent sx={{ textAlign: "center", p: 3 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Tổng số máy
              </Typography>
              <Typography
                variant={isMobile ? "h4" : "h3"}
                fontWeight="bold"
                color="#667eea"
              >
                {formatNumber(displayTotal || 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Các thẻ nhỏ */}
        <Grid size={{ xs: 12, sm: 6, md: 9 }}>
          <Grid container spacing={2}>
            {/* --- HÀNG 1 --- */}
            {/* 1. Có thể sử dụng */}
            <Grid size={{ xs: 6 }}>
              <Card
                elevation={0}
                onClick={() => handleStatusFilterClick(["available"], [])}
                sx={{
                  borderRadius: "20px",
                  background: "#2e7d3211",
                  ...(isStatusFilterActive(["available"], [])
                    ? activeCardSx
                    : inactiveCardSx),
                }}
              >
                <CardContent sx={{ textAlign: "center", p: 2 }}>
                  <Typography
                    variant={isMobile ? "h6" : "h5"}
                    fontWeight="bold"
                    color="#2e7d32"
                  >
                    {formatNumber(stats.available || 0)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
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
                  ...(isStatusFilterActive(["in_use"], [])
                    ? activeCardSx
                    : inactiveCardSx),
                }}
              >
                <CardContent sx={{ textAlign: "center", p: 2 }}>
                  <Typography
                    variant={isMobile ? "h6" : "h5"}
                    fontWeight="bold"
                    color="#1976d2"
                  >
                    {formatNumber(stats.in_use || 0)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Đang sử dụng
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            {/* <Grid size={{ xs: 6, md: 2.4 }}>
              <Card
                elevation={0}
                onClick={() => handleStatusFilterClick(["maintenance"], [])}
                sx={{
                  borderRadius: "20px",
                  background: "#ff980011",
                  ...(isStatusFilterActive(["maintenance"], [])
                    ? activeCardSx
                    : inactiveCardSx),
                }}
              >
                <CardContent sx={{ textAlign: "center", p: 2 }}>
                  <Typography
                    variant={isMobile ? "h6" : "h5"}
                    fontWeight="bold"
                    color="#ff9800"
                  >
                    {stats.maintenance || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Bảo trì
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 6, md: 2.4 }}>
              <Card
                elevation={0}
                onClick={() => handleStatusFilterClick(["liquidation"], [])}
                sx={{
                  borderRadius: "20px",
                  background: "#f4433611",
                  ...(isStatusFilterActive(["liquidation"], [])
                    ? activeCardSx
                    : inactiveCardSx),
                }}
              >
                <CardContent sx={{ textAlign: "center", p: 2 }}>
                  <Typography
                    variant={isMobile ? "h6" : "h5"}
                    fontWeight="bold"
                    color="#f44336"
                  >
                    {stats.liquidation || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Thanh lý
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 6, md: 2.4 }}>
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
                <CardContent sx={{ textAlign: "center", p: 2 }}>
                  <Typography
                    variant={isMobile ? "h6" : "h5"}
                    fontWeight="bold"
                    color="#9e9e9e"
                  > */}
            {/* {stats.disabled || 0}/ */}
            {/* {stats.broken || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary"> */}
            {/* Chưa sử dụng/ */}
            {/* Máy hư
                  </Typography>
                </CardContent>
              </Card>
            </Grid> */}

            {/* --- HÀNG 2 --- */}
            {/* 3. Chưa sử dụng (Bảo trì + Hư + Chưa sử dụng/Cho mượn) */}
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
                  background: "#ff980011",
                  ...(isStatusFilterActive(
                    ["maintenance", "broken", "disabled"],
                    []
                  )
                    ? activeCardSx
                    : inactiveCardSx),
                }}
              >
                <CardContent sx={{ textAlign: "center", p: 2 }}>
                  <Typography
                    variant={isMobile ? "h6" : "h5"}
                    fontWeight="bold"
                    color="#ed6c02"
                  >
                    {/* Tổng hợp số lượng */}
                    {formatNumber(
                      (Number(stats.maintenance) || 0) +
                        (Number(stats.broken) || 0) +
                        (Number(stats.borrowed_out) || 0)
                    )}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
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
                  ...(isStatusFilterActive(["pending_liquidation"], [])
                    ? activeCardSx
                    : inactiveCardSx),
                }}
              >
                <CardContent sx={{ textAlign: "center", p: 2 }}>
                  <Typography
                    variant={isMobile ? "h6" : "h5"}
                    fontWeight="bold"
                    color="#ff5722"
                  >
                    {formatNumber(stats.pending_liquidation || 0)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Chờ thanh lý
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            {/* <Grid size={{ xs: 6, md: 2.4 }}>
              <Card
                elevation={0}
                onClick={() => handleStatusFilterClick([], ["rented"])}
                sx={{
                  borderRadius: "20px",
                  background: "#673ab711",
                  ...(isStatusFilterActive([], ["rented"])
                    ? activeCardSx
                    : inactiveCardSx),
                }}
              >
                <CardContent sx={{ textAlign: "center", p: 2 }}>
                  <Typography
                    variant={isMobile ? "h6" : "h5"}
                    fontWeight="bold"
                    color="#673ab7"
                  >
                    {stats.rented || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Thuê
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 6, md: 2.4 }}>
              <Card
                elevation={0}
                onClick={() =>
                  handleStatusFilterClick(["disabled"], ["rented_return"])
                }
                sx={{
                  borderRadius: "20px",
                  background: "#673ab711",
                  ...(isStatusFilterActive(["disabled"], ["rented_return"])
                    ? activeCardSx
                    : inactiveCardSx),
                }}
              >
                <CardContent sx={{ textAlign: "center", p: 2 }}>
                  <Typography
                    variant={isMobile ? "h6" : "h5"}
                    fontWeight="bold"
                    color="#673ab7"
                  >
                    {stats.rented_return || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Đã trả (Thuê)
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 6, md: 2.4 }}>
              <Card
                elevation={0}
                onClick={() => handleStatusFilterClick([], ["borrowed"])}
                sx={{
                  borderRadius: "20px",
                  background: "#03a9f411",
                  ...(isStatusFilterActive([], ["borrowed"])
                    ? activeCardSx
                    : inactiveCardSx),
                }}
              >
                <CardContent sx={{ textAlign: "center", p: 2 }}>
                  <Typography
                    variant={isMobile ? "h6" : "h5"}
                    fontWeight="bold"
                    color="#03a9f4"
                  >
                    {stats.borrowed || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Mượn
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 6, md: 2.4 }}>
              <Card
                elevation={0}
                onClick={() =>
                  handleStatusFilterClick(["disabled"], ["borrowed_return"])
                }
                sx={{
                  borderRadius: "20px",
                  background: "#03a9f411",
                  ...(isStatusFilterActive(["disabled"], ["borrowed_return"])
                    ? activeCardSx
                    : inactiveCardSx),
                }}
              >
                <CardContent sx={{ textAlign: "center", p: 2 }}>
                  <Typography
                    variant={isMobile ? "h6" : "h5"}
                    fontWeight="bold"
                    color="#03a9f4"
                  >
                    {stats.borrowed_return || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Đã trả (Mượn)
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 6, md: 2.4 }}>
              <Card
                elevation={0}
                onClick={() =>
                  handleStatusFilterClick(["disabled"], ["borrowed_out"])
                }
                sx={{
                  borderRadius: "20px",
                  background: "#00bcd411",
                  ...(isStatusFilterActive(["disabled"], ["borrowed_out"])
                    ? activeCardSx
                    : inactiveCardSx),
                }}
              >
                <CardContent sx={{ textAlign: "center", p: 2 }}>
                  <Typography
                    variant={isMobile ? "h6" : "h5"}
                    fontWeight="bold"
                    color="#00bcd4"
                  >
                    {stats.borrowed_out || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Cho mượn
                  </Typography>
                </CardContent>
              </Card>
            </Grid> */}
          </Grid>
        </Grid>
      </Grid>
    );

    // Tách `locationOptions` ra khỏi return
    const locationOptions = locations.map((loc) => loc.name_location);

    // Bọc toàn bộ return trong <React.Fragment>
    return (
      <>
        {/* 1. Luôn hiển thị Stats Cards */}
        {renderStatsCards()}

        <Grid size={12} sx={{ mt: 1, mb: 3 }}>
          <StatusMatrixTable
            data={matrixData}
            loading={matrixLoading}
            onCellClick={handleMatrixClick}
            activeFilters={filters}
          />
        </Grid>

        {/* 2. Luôn hiển thị Thống kê loại máy (nếu có) */}
        {typeStats.length > 0 && (
          <Grid size={12} sx={{ mt: 3, mb: 3 }}>
            <Card
              elevation={0}
              sx={{
                borderRadius: "20px",
                background: "#f5f5f5",
                border: "1px solid rgba(0, 0, 0, 0.05)",
              }}
            >
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Thống kê theo loại máy
                </Typography>
                <List dense sx={{ pt: 0, pb: 1, width: "100%" }}>
                  {typeStats
                    .slice(0, isMachineTypeStatsExpanded ? typeStats.length : 4)
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
                                  mr: 1,
                                }}
                              >
                                {typeStat.type_machine}:
                              </Typography>
                              <Typography
                                component="span"
                                variant="body1"
                                fontWeight="bold"
                                color="#333"
                                sx={{ flexShrink: 0 }}
                              >
                                {typeStat.count} máy
                              </Typography>
                            </Box>
                          }
                        />
                      </ListItem>
                    ))}
                </List>
                {typeStats.length > 4 && (
                  <Box sx={{ textAlign: "center", mt: 1 }}>
                    <Button
                      onClick={() =>
                        setIsMachineTypeStatsExpanded(
                          !isMachineTypeStatsExpanded
                        )
                      }
                      size="small"
                      sx={{ borderRadius: "12px" }}
                    >
                      {isMachineTypeStatsExpanded ? "Thu gọn" : "Xem thêm"}
                    </Button>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* 3. Luôn hiển thị Card "Bộ lọc chi tiết" */}
        <Card
          ref={filterCardRef} // Đổi ref về đây
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
                    disabled={typeOptions.length === 0}
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
                    disabled={modelOptions.length === 0}
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
                    disabled={manufacturerOptions.length === 0}
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
              {!selectedLocation && (
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Vị trí (trong Đơn vị)</InputLabel>
                    <Select
                      multiple
                      name="name_locations"
                      value={filters.name_locations}
                      onChange={handleFilterChange}
                      label="Vị trí (trong Đơn vị)"
                      renderValue={renderMultiSelectValue}
                      sx={{ borderRadius: "12px" }}
                      disabled={locationOptions.length === 0}
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
              )}
            </Grid>
          </CardContent>
        </Card>

        {/* 4. Hiển thị Bảng hoặc Thông báo "Không có máy" */}
        {machinesAtLocation.length === 0 && !loadingMachines ? (
          <Typography
            variant="body1"
            color="text.secondary"
            align="center"
            sx={{ mt: 3 }}
          >
            {selectedLocation
              ? "Không có máy móc nào tại vị trí này."
              : "Không có máy móc nào tại đơn vị này."}
          </Typography>
        ) : (
          <>
            {/* Table */}
            <TableContainer
              component={Paper}
              elevation={1}
              sx={{
                borderRadius: "12px",
                border: "1px solid rgba(0, 0, 0, 0.05)",
                mb: 2,
              }}
            >
              <Table size="small">
                <TableHead>
                  <TableRow
                    sx={{ backgroundColor: "rgba(102, 126, 234, 0.05)" }}
                  >
                    <TableCell sx={{ fontWeight: 600, whiteSpace: "nowrap" }}>
                      Mã máy
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, whiteSpace: "nowrap" }}>
                      Loại máy
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, whiteSpace: "nowrap" }}>
                      Model
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, whiteSpace: "nowrap" }}>
                      Serial
                    </TableCell>
                    {!selectedLocation && (
                      <TableCell sx={{ fontWeight: 600, whiteSpace: "nowrap" }}>
                        Vị trí
                      </TableCell>
                    )}
                    <TableCell sx={{ fontWeight: 600, whiteSpace: "nowrap" }}>
                      Trạng thái (chính)
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, whiteSpace: "nowrap" }}>
                      Trạng thái (mượn/thuê)
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {machinesAtLocation.map((machine) => {
                    const statusInfo = getStatusInfo(machine.current_status);
                    let borrowStatusInfo = null;
                    if (machine.is_borrowed_or_rented_or_borrowed_out) {
                      // 1. Lấy thông tin màu sắc/label gốc từ cấu hình
                      borrowStatusInfo = getStatusInfo(
                        machine.is_borrowed_or_rented_or_borrowed_out
                      );

                      // 2. Kiểm tra nếu là trạng thái "borrowed" (Mượn)
                      if (
                        machine.is_borrowed_or_rented_or_borrowed_out ===
                        "borrowed"
                      ) {
                        if (
                          machine.is_borrowed_or_rented_or_borrowed_out_return_date
                        ) {
                          // Có ngày trả -> Mượn ngắn hạn
                          borrowStatusInfo = {
                            ...borrowStatusInfo,
                            label: "Máy mượn ngắn hạn",
                          };
                        } else {
                          // Không có ngày trả -> Mượn dài hạn
                          borrowStatusInfo = {
                            ...borrowStatusInfo,
                            label: "Máy mượn dài hạn",
                          };
                        }
                      }
                    }
                    return (
                      <TableRow
                        key={machine.uuid_machine}
                        hover
                        onClick={() => handleOpenHistoryDialog(machine)}
                        sx={{ cursor: "pointer" }}
                      >
                        <TableCell sx={{ fontWeight: 600 }}>
                          {machine.code_machine}
                        </TableCell>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>
                          {machine.type_machine || "-"}
                        </TableCell>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>
                          {machine.model_machine || "-"}
                        </TableCell>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>
                          {machine.serial_machine || "-"}
                        </TableCell>
                        {!selectedLocation && (
                          <TableCell sx={{ whiteSpace: "nowrap" }}>
                            {machine.name_location || "-"}
                          </TableCell>
                        )}
                        <TableCell>
                          <Chip
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
                        <TableCell>
                          {borrowStatusInfo ? (
                            <Chip
                              label={borrowStatusInfo.label}
                              size="small"
                              sx={{
                                background: borrowStatusInfo.bg,
                                color: borrowStatusInfo.color,
                                fontWeight: 600,
                                borderRadius: "8px",
                              }}
                            />
                          ) : (
                            "-"
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Pagination */}
            {totalPages > 1 && (
              <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={handlePageChange}
                  color="primary"
                  sx={{
                    "& .MuiPaginationItem-root": {
                      borderRadius: "8px",
                    },
                  }}
                />
              </Box>
            )}
          </>
        )}
      </>
    );
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
              <LocationOn sx={{ fontSize: 30 }} />
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
                Theo dõi vị trí
              </Typography>
              <Typography
                variant={isMobile ? "body1" : "h6"}
                color="text.secondary"
              >
                Kiểm tra máy móc tại một vị trí và xem lịch sử điều chuyển
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
            p: { xs: 2, sm: 4 },
          }}
        >
          <Grid container spacing={isMobile ? 2 : 4}>
            {/* HÀNG 1: CHỌN ĐƠN VỊ (NÚT) */}
            <Grid size={{ xs: 12 }}>
              <Box>
                <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
                  1. Chọn Đơn vị
                </Typography>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    display: "flex",
                    flexDirection: "row", // Xếp các nút theo hàng ngang
                    flexWrap: "wrap", // Tự động xuống hàng nếu hết chỗ
                    gap: 1.5, // Khoảng cách giữa các nút
                    borderRadius: "12px",
                    minHeight: "80px", // Chiều cao tối thiểu để chứa loading
                    alignItems: "flex-start",
                    border: "1px solid rgba(0, 0, 0, 0.1)",
                  }}
                >
                  {loadingDepartments ? (
                    <Box
                      sx={{
                        width: "100%",
                        display: "flex",
                        justifyContent: "center",
                        p: 1,
                      }}
                    >
                      <CircularProgress size={30} />
                    </Box>
                  ) : (
                    departments.map((dept) => (
                      <Button
                        key={dept.uuid_department}
                        // Thay đổi style dựa trên việc có được chọn hay không
                        variant={
                          selectedDepartment?.uuid_department ===
                          dept.uuid_department
                            ? "contained"
                            : "outlined"
                        }
                        onClick={() => handleDepartmentChange(dept)}
                        startIcon={<Business />}
                        sx={{
                          borderRadius: "8px",
                          textTransform: "none", // Không viết hoa
                          fontWeight: 600,
                        }}
                      >
                        {dept.name_department} ({dept.machine_count || 0})
                      </Button>
                    ))
                  )}
                </Paper>
              </Box>
            </Grid>

            {/* HÀNG 2, CỘT 1: CHỌN VỊ TRÍ (DANH SÁCH) */}
            <Grid size={{ xs: 12, md: 3 }}>
              <Box>
                <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
                  2. Chọn Vị trí
                </Typography>
                <Paper
                  variant="outlined"
                  sx={{
                    borderRadius: "12px",
                    minHeight: 200, // Chiều cao tối thiểu
                    overflow: "auto",
                    p: 1, // Padding cho List
                    border: "1px solid rgba(0, 0, 0, 0.1)",
                  }}
                >
                  {!selectedDepartment ? (
                    // Hiển thị khi chưa chọn đơn vị
                    <Alert severity="info" sx={{ m: 1, borderRadius: "8px" }}>
                      Vui lòng chọn đơn vị ở bước 1.
                    </Alert>
                  ) : loadingLocations ? (
                    // Hiển thị khi đang tải
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "center",
                        p: 3,
                      }}
                    >
                      <CircularProgress />
                    </Box>
                  ) : locations.length === 0 ? (
                    // Hiển thị khi không có vị trí
                    <Alert
                      severity="warning"
                      sx={{ m: 1, borderRadius: "8px" }}
                    >
                      Không có vị trí nào trong đơn vị này.
                    </Alert>
                  ) : (
                    // Hiển thị danh sách vị trí
                    <List dense>
                      {locations.map((loc) => {
                        const isSelected =
                          selectedLocation?.uuid_location === loc.uuid_location;

                        return (
                          <ListItemButton
                            key={loc.uuid_location}
                            selected={isSelected}
                            onClick={() => handleLocationChange(loc)}
                            sx={{
                              borderRadius: "8px",
                              mb: 0.5,
                              // Ghi đè style khi được chọn
                              "&.Mui-selected": {
                                backgroundColor: "rgba(102, 126, 234, 0.15)", // Nền tím nhạt
                                "&:hover": {
                                  backgroundColor: "rgba(102, 126, 234, 0.2)", // Đậm hơn khi hover
                                },
                              },
                            }}
                          >
                            <ListItemIcon
                              sx={{
                                minWidth: 32,
                                color: isSelected
                                  ? "primary.main" // Màu tím cho icon
                                  : "inherit",
                              }}
                            >
                              <MeetingRoom fontSize="small" />
                            </ListItemIcon>
                            <ListItemText
                              primary={`${loc.name_location} (${
                                loc.machine_count || 0
                              })`}
                              primaryTypographyProps={{
                                fontWeight: isSelected ? 700 : 500,
                                color: isSelected ? "primary.main" : "inherit",
                              }}
                            />
                          </ListItemButton>
                        );
                      })}
                    </List>
                  )}
                </Paper>
              </Box>
            </Grid>

            {/* HÀNG 2, CỘT 2: DANH SÁCH MÁY */}
            <Grid size={{ xs: 12, md: 9 }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: { xs: "flex-start", sm: "center" },
                  justifyContent: "space-between",
                  flexDirection: { xs: "column", sm: "row" },
                  mb: 2,
                  gap: 2,
                }}
              >
                {/* Tiêu đề và Chip */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <Typography variant="h5" sx={{ fontWeight: 600 }}>
                    3. Máy móc thiết bị tại{" "}
                    {selectedLocation
                      ? selectedLocation.name_location
                      : selectedDepartment
                      ? selectedDepartment.name_department
                      : "..."}
                  </Typography>
                </Box>

                {/* NÚT LÀM MỚI (CHUYỂN VỀ ĐÂY) */}
                <Button
                  variant="contained"
                  startIcon={<Refresh />}
                  onClick={handleRefresh}
                  sx={{
                    width: { xs: "100%", sm: "auto" },
                    borderRadius: "12px",
                    background: "linear-gradient(45deg, #667eea, #764ba2)",
                    px: 3,
                    py: 1, // Giảm padding cho nút nhỏ hơn
                    transition: "all 0.3s ease",
                    // Style khi bị vô hiệu hóa
                    "&.Mui-disabled": {
                      background: "#e0e0e0",
                    },
                  }}
                >
                  Làm mới
                </Button>
              </Box>

              {renderMachineTable()}
            </Grid>
          </Grid>
        </Card>

        {/* --- History Dialog --- */}
        <Dialog
          open={openHistoryDialog}
          onClose={handleCloseHistoryDialog}
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
              background: "linear-gradient(45deg, #2e7d32, #66bb6a)",
              color: "white",
              fontWeight: 700,
            }}
          >
            <Typography
              component="span"
              variant={isMobile ? "h6" : "h5"}
              sx={{ fontWeight: 700 }}
            >
              Lịch sử di chuyển: {selectedMachine?.code_machine} -{" "}
              {selectedMachine?.type_machine} - {selectedMachine?.model_machine}
            </Typography>
          </DialogTitle>
          <DialogContent sx={{ mt: 3 }}>
            {loadingHistory ? (
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
              <Stack spacing={2}>
                <TableContainer component={Paper} elevation={1}>
                  <Table size="small">
                    <TableHead>
                      <TableRow
                        sx={{ backgroundColor: "rgba(102, 126, 234, 0.05)" }}
                      >
                        <TableCell
                          sx={{ fontWeight: 600, whiteSpace: "nowrap" }}
                        >
                          Ngày
                        </TableCell>
                        <TableCell
                          sx={{ fontWeight: 600, whiteSpace: "nowrap" }}
                        >
                          Từ vị trí
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600 }}></TableCell>
                        <TableCell
                          sx={{ fontWeight: 600, whiteSpace: "nowrap" }}
                        >
                          Đến vị trí
                        </TableCell>
                        <TableCell
                          sx={{ fontWeight: 600, whiteSpace: "nowrap" }}
                        >
                          Người thực hiện
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {historyData.length > 0 ? (
                        historyData.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell sx={{ whiteSpace: "nowrap" }}>
                              {formatDate(item.move_date)}
                            </TableCell>
                            <TableCell>
                              {item.from_location_name || "-"}
                            </TableCell>
                            <TableCell align="center">
                              <ArrowForward color="primary" fontSize="small" />
                            </TableCell>
                            <TableCell>
                              {item.to_location_name || "-"}
                            </TableCell>
                            <TableCell sx={{ whiteSpace: "nowrap" }}>
                              {item.ma_nv
                                ? `${item.ma_nv}: ${item.ten_nv || "--"}`
                                : item.created_by || "--"}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} align="center">
                            Không có lịch sử di chuyển
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Stack>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button
              variant="outlined"
              onClick={handleCloseHistoryDialog}
              sx={{ borderRadius: "12px" }}
            >
              Đóng
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </>
  );
};

export default LocationTrackPage;
