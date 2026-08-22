// frontend/src/pages/LocationTrackPage.jsx

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Alert,
  alpha,
  ArrowForward,
  Autocomplete,
  autoGrid,
  Avatar,
  borders,
  Box,
  Business,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  colors,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  fontSizes,
  getStatusInfo as statusInfo,
  gradients,
  Grid,
  hexA,
  IconButton,
  KeyboardArrowDown,
  KeyboardArrowUp,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  LocationOn,
  muiColors,
  PageHeader,
  Pagination,
  Paper,
  radii,
  Refresh,
  shadows,
  Stack,
  STAT_COLORS,
  StatCard,
  Switch,
  sx as preset,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useResponsive,
} from "../ui";
import NavigationBar from "../components/NavigationBar";
import { api } from "../api/api";

const formatNumber = (num) => {
  if (num === null || num === undefined || num === "") return "0";
  return Number(num).toLocaleString("en-US");
};

const StatusMatrixTable = ({ data, loading, onCellClick, activeFilters }) => {
  const { theme } = useResponsive();
  const [openNotInUse, setOpenNotInUse] = useState(false);

  // 1. Cấu hình cột
  const columns = [
    { key: "internal", label: "Máy nội bộ" },
    { key: "borrowed", label: "Máy mượn" },
    { key: "rented", label: "Máy thuê" },
  ];

  // 2. Cấu hình hàng chính
  // Màu lấy từ theme/statusTokens.js (color = chữ, pastel = nền ô)
  const row = (key, label, extra) => ({
    key,
    label,
    color: STAT_COLORS[key].color,
    bg: STAT_COLORS[key].pastel,
    ...extra,
  });

  const rowConfig = [
    row("available", "Có thể sử dụng"),
    row("in_use", "Đang sử dụng"),
    row("not_in_use", "Chưa sử dụng", { hasChildren: true }),
    row("pending_liquidation", "Chờ thanh lý"),
  ];

  // 3. Cấu hình hàng con: ĐỒNG BỘ MÀU CAM CHO TẤT CẢ
  const subRowConfig = [
    row("maintenance", "Bảo trì"),
    row("broken", "Máy hư"),
    row("disabled", "Cho mượn"),
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
  const TOTAL_COL_COLOR = colors.brand.main;
  const TOTAL_COL_BG = colors.brand.wash;
  const TOTAL_ROW_COLOR = colors.brand.main;
  const TOTAL_ROW_BG = colors.brand.wash;

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
            bgcolor: rowActive ? row.bg : colors.white,
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
                color: hasDataCell || cellSelected ? row.color : colors.grey[300],
                fontWeight: hasDataCell || cellSelected ? "bold" : "normal",
                boxShadow: cellSelected
                  ? `inset 0 0 0 2px ${row.color}`
                  : "none",
                "&:hover": {
                  bgcolor:
                    hasDataCell || cellSelected
                      ? alpha(row.color, 0.25)
                      : colors.grey[100],
                  boxShadow: `inset 0 0 0 2px ${row.color}`,
                  color: hasDataCell || cellSelected ? row.color : colors.grey[600],
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
                color: hasDataRow || cellSelected ? row.color : colors.grey[400],
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
        ...preset.softCard,
        overflow: "hidden",
        height: "100%",
        transition: "all 0.2s ease",
        "&:hover": { boxShadow: shadows.hover },
      }}
    >
      <Box sx={{ p: 2, borderBottom: borders.subtle }}>
        <Typography variant="h6" fontWeight="bold">
          Trạng thái chi tiết
        </Typography>
      </Box>
      <TableContainer>
        <Table
          size="small"
          sx={{
            "& .MuiTableCell-root": {
              borderBottom: `1px solid ${alpha(colors.grey[300], 0.4)}`,
              textAlign: "center",
              fontSize: fontSizes.px14_4,
              transition: "all 0.2s ease-in-out",
              position: "relative",
            },
            "& .MuiTableCell-head": {
              backgroundColor: colors.grey[50],
              fontWeight: 700,
              color: colors.grey[600],
              py: 2,
            },
            "& .cell-first-col": {
              textAlign: "left",
              fontWeight: 600,
              position: "sticky",
              left: 0,
              zIndex: 1,
              borderRight: borders.subtle,
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
                      bgcolor: active ? colors.grey[100] : "inherit",
                      boxShadow: active
                        ? `inset 0 -3px 0 0 ${theme.palette.primary.main}`
                        : "none",
                      "&:hover": {
                        color: theme.palette.primary.main,
                        bgcolor: colors.grey[100],
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
                        : `${colors.grey[50]} !important`,
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
            <TableRow sx={{ backgroundColor: colors.grey[50] }}>
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
                        : `${colors.grey[50]} !important`,
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
                          : colors.grey[400],
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
                  fontSize: `${fontSizes.px17_6} !important`,
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
  const { dialogFullScreen } = useResponsive();
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
  const tableCardRef = useRef(null);
  // State for filter dropdown data
  const [typeOptions, setTypeOptions] = useState([]);
  const [attributeOptions, setAttributeOptions] = useState([]);
  const [modelOptions, setModelOptions] = useState([]);
  const [manufacturerOptions, setManufacturerOptions] = useState([]);
  const [supplierOptions, setSupplierOptions] = useState([]);

  const [matrixData, setMatrixData] = useState({});
  const [matrixLoading, setMatrixLoading] = useState(false);

  // State for selected filter values
  const [filters, setFilters] = useState({
    type_machines: [],
    attribute_machines: [],
    model_machines: [],
    manufacturers: [],
    suppliers: [],
    name_locations: [], // Dùng khi xem theo Đơn vị
    current_status: [], // Dùng cho cả 2
    borrow_status: [], // Dùng cho cả 2
    has_air_volume: false,
  });

  // Màu + nhãn trạng thái lấy từ theme/statusTokens.js (nguồn duy nhất).
  // Trang này có fallback riêng: giữ nguyên - trả về màu xám kèm chính tên
  // trạng thái, thay vì dấu "-" như MachineListPage.
  const getStatusInfo = (statusKey) =>
    statusInfo(statusKey, {
      fallback: (k) => ({ bg: hexA(colors.grey[500], "22"), color: colors.grey[500], label: k }),
    });

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
      const response =
        await api.tracking.getMachineStatsByTypeAtLocation(locationUuid);
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
      const response =
        await api.tracking.getMachineStatsByTypeAtDepartment(departmentUuid);
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

  const fetchFilterOptions = useCallback(
    async (currentFilters = {}) => {
      // 1. Xác định Context (Đơn vị hoặc Vị trí đang chọn)
      let contextParams = {};
      if (selectedLocation) {
        contextParams.location_uuid = selectedLocation.uuid_location;
      } else if (selectedDepartment) {
        contextParams.department_uuid = selectedDepartment.uuid_department;
      } else {
        // Nếu chưa chọn gì cả, reset options và thoát
        setTypeOptions([]);
        setAttributeOptions([]);
        setModelOptions([]);
        setManufacturerOptions([]);
        setSupplierOptions([]);
        return;
      }

      // 2. Hàm helper tạo params gồm: Field cần lấy + Context + Các Filters hiện tại
      const makeParams = (field) => ({
        field,
        ...contextParams, // Spread context (location/department uuid)
        type_machines: currentFilters.type_machines || [],
        attribute_machines: currentFilters.attribute_machines || [],
        model_machines: currentFilters.model_machines || [],
        manufacturers: currentFilters.manufacturers || [],
        suppliers: currentFilters.suppliers || [],
        name_locations: currentFilters.name_locations || [],
        has_air_volume: currentFilters.has_air_volume || false,
      });

      try {
        // 3. Gọi API song song
        const [typeRes, attrRes, modelRes, manuRes, supplierRes] =
          await Promise.all([
            api.machines.getDistinctValues(makeParams("type_machine")),
            api.machines.getDistinctValues(makeParams("attribute_machine")),
            api.machines.getDistinctValues(makeParams("model_machine")),
            api.machines.getDistinctValues(makeParams("manufacturer")),
            api.machines.getDistinctValues(makeParams("supplier")),
            // Nếu đang xem theo Department, có thể cần cập nhật list LocationFilter options
            // api.machines.getDistinctValues(makeParams("name_location")),
          ]);

        if (typeRes.success) setTypeOptions(typeRes.data);
        if (attrRes.success) setAttributeOptions(attrRes.data);
        if (modelRes.success) setModelOptions(modelRes.data);
        if (manuRes.success) setManufacturerOptions(manuRes.data);
        if (supplierRes.success) setSupplierOptions(supplierRes.data);
      } catch (err) {
        console.error("Error fetching filter options:", err);
      }
    },
    [selectedDepartment, selectedLocation]
  );

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  useEffect(() => {
    // Chỉ chạy nếu đã chọn Department hoặc Location
    if (selectedDepartment || selectedLocation) {
      fetchFilterOptions(filters);
    }
  }, [selectedDepartment, selectedLocation, filters, fetchFilterOptions]);

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
      // ƯU TIÊN 1: VỊ TRÍ
      fetchMachinesAtLocation(selectedLocation.uuid_location, page, limit);
      fetchMachineTypeStats(selectedLocation.uuid_location);
      fetchMatrixStats(selectedLocation.uuid_location, null);
    } else if (selectedDepartment) {
      // ƯU TIÊN 2: ĐƠN VỊ
      fetchMachinesAtDepartment(
        selectedDepartment.uuid_department,
        page,
        limit
      );
      fetchDepartmentTypeStats(selectedDepartment.uuid_department);
      fetchMatrixStats(null, selectedDepartment.uuid_department);
    } else {
      // RESET
      setMachinesAtLocation([]);
      setLocationStats({});
      setTotalPages(1);
      setPage(1);
      setTypeStats([]);
      setMatrixData({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDepartment, selectedLocation, page, limit, filters]);

  // Handler cho Autocomplete filters
  const handleAutocompleteFilterChange = (filterName) => (event, newValue) => {
    setFilters((prev) => ({
      ...prev,
      [filterName]: newValue || [],
    }));
    setPage(1); // Reset về trang 1 khi lọc

    // Cuộn tới bảng kết quả
    if (tableCardRef.current) {
      setTimeout(() => {
        tableCardRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100); // Delay nhỏ để đảm bảo state đã cập nhật
    }
  };

  const handleSwitchFilterChange = (filterName) => (event) => {
    setFilters((prev) => ({
      ...prev,
      [filterName]: event.target.checked,
    }));
    setPage(1);

    if (tableCardRef.current) {
      setTimeout(() => {
        tableCardRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);
    }
  };

  const handleDepartmentChange = (department) => {
    setSelectedDepartment(department);
    // Reset vị trí và máy móc khi đổi đơn vị
    setSelectedLocation(null);
    setMachinesAtLocation([]);
    setPage(1);
    setFilters({
      type_machines: [],
      attribute_machines: [],
      model_machines: [],
      manufacturers: [],
      suppliers: [],
      name_locations: [],
      current_status: [],
      borrow_status: [],
      has_air_volume: false,
    });
  };

  const handleLocationChange = (location) => {
    setSelectedLocation(location);
    // Reset phân trang và danh sách khi thay đổi vị trí
    setPage(1);
    setFilters((prev) => ({
      ...prev,
      type_machines: [],
      attribute_machines: [],
      model_machines: [],
      manufacturers: [],
      suppliers: [],
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
      attribute_machines: prev.attribute_machines,
      model_machines: prev.model_machines,
      manufacturers: prev.manufacturers,
      suppliers: prev.suppliers,
      name_locations: prev.name_locations,
      // Cập nhật bộ lọc trạng thái
      current_status: currentStatus,
      borrow_status: borrowStatus,
    }));
    setPage(1); // Quay về trang 1 khi lọc

    // Cuộn tới bảng kết quả
    if (tableCardRef.current) {
      setTimeout(() => {
        tableCardRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100); // Delay nhỏ để đảm bảo state đã cập nhật
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

    // Cuộn tới bảng kết quả
    if (tableCardRef.current) {
      setTimeout(() => {
        tableCardRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100); // Delay nhỏ để đảm bảo state đã cập nhật
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
        <Alert severity="info" sx={{ borderRadius: `${radii.md}px`, mt: 1 }}>
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
    // -----------------------------------------------------------------------
    // CÁC THẺ SỐ LIỆU khai báo bằng DỮ LIỆU thay vì JSX.
    // Trước đây 12 thẻ chiếm 400 dòng JSX (8 thẻ trong số đó bị comment lại).
    // Bật/tắt một thẻ giờ chỉ là đổi `enabled`.
    // -----------------------------------------------------------------------
    const statCards = [
      {
        enabled: true,
        label: "Có thể sử dụng",
        value: stats.available || 0,
        key: "available",
        statuses: ["available"],
        borrow: [],
      },
      {
        enabled: true,
        label: "Đang sử dụng",
        value: stats.in_use || 0,
        key: "in_use",
        statuses: ["in_use"],
        borrow: [],
      },
      {
        enabled: true,
        label: "Chưa sử dụng",
        // Gộp: Bảo trì + Máy hư + Cho mượn
        value:
          (Number(stats.maintenance) || 0) +
          (Number(stats.broken) || 0) +
          (Number(stats.borrowed_out) || 0),
        key: "not_in_use",
        statuses: ["maintenance", "broken", "disabled"],
        borrow: [],
      },
      {
        enabled: true,
        label: "Chờ thanh lý",
        value: stats.pending_liquidation || 0,
        key: "pending_liquidation",
        statuses: ["pending_liquidation"],
        borrow: [],
      },

      // --- Các thẻ đang TẮT (trước đây là 8 khối JSX bị comment) ---
      {
        enabled: false,
        label: "Bảo trì",
        value: stats.maintenance || 0,
        color: colors.orange.main,
        background: hexA(colors.orange.main, "11"),
        statuses: ["maintenance"],
        borrow: [],
      },
      {
        enabled: false,
        label: "Thanh lý",
        value: stats.liquidation || 0,
        color: colors.red.main,
        background: hexA(colors.red.main, "11"),
        statuses: ["liquidation"],
        borrow: [],
      },
      {
        enabled: false,
        label: "Máy hư",
        value: stats.broken || 0,
        color: colors.grey[500],
        background: hexA(colors.grey[500], "11"),
        statuses: ["broken"],
        borrow: [],
      },
      {
        enabled: false,
        label: "Thuê",
        value: stats.rented || 0,
        color: colors.purple.main,
        background: hexA(colors.purple.main, "11"),
        statuses: [],
        borrow: ["rented"],
      },
      {
        enabled: false,
        label: "Đã trả (Máy thuê)",
        value: stats.rented_return || 0,
        color: colors.purple.main,
        background: hexA(colors.purple.main, "11"),
        statuses: ["disabled"],
        borrow: ["rented_return"],
      },
      {
        enabled: false,
        label: "Mượn",
        value: stats.borrowed || 0,
        color: colors.blue.sky,
        background: hexA(colors.blue.sky, "11"),
        statuses: [],
        borrow: ["borrowed"],
      },
      {
        enabled: false,
        label: "Đã trả (Máy mượn)",
        value: stats.borrowed_return || 0,
        color: colors.blue.sky,
        background: hexA(colors.blue.sky, "11"),
        statuses: ["disabled"],
        borrow: ["borrowed_return"],
      },
      {
        enabled: false,
        label: "Cho mượn",
        value: stats.borrowed_out || 0,
        color: colors.cyan.main,
        background: hexA(colors.cyan.main, "11"),
        statuses: ["disabled"],
        borrow: ["borrowed_out"],
      },
    ];

    const renderStatsCards = () => (
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {/* Thẻ tổng - cột riêng vì bố cục lệch (3/9) */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            size="heroMd"
            label="Tổng số máy"
            value={formatNumber(displayTotal || 0)}
            color={STAT_COLORS.total.color}
            background={gradients.brandWash2}
            active={isStatusFilterActive([], [])}
            onClick={() => handleStatusFilterClick([], [])}
          />
        </Grid>

        {/* Các thẻ trạng thái - lưới tự tính số cột.
            Đổi số 2 cuối trong autoGrid(110, 2, 2) thành 3 là 3 thẻ mỗi hàng. */}
        <Grid size={{ xs: 12, sm: 6, md: 9 }}>
          <Box sx={autoGrid(110, 2, 2)}>
            {statCards
              .filter((card) => card.enabled)
              .map((card) => (
                <StatCard
                  key={card.label}
                  size="sm"
                  label={card.label}
                  value={formatNumber(card.value)}
                  color={card.color ?? STAT_COLORS[card.key].color}
                  background={card.background ?? STAT_COLORS[card.key].soft}
                  active={isStatusFilterActive(card.statuses, card.borrow)}
                  onClick={() =>
                    handleStatusFilterClick(card.statuses, card.borrow)
                  }
                />
              ))}
          </Box>
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
              sx={{ ...preset.softCard, background: colors.grey[100] }}
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
                          borderBottom: borders.dashed,
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
                                color={colors.grey[800]}
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
          sx={{ ...preset.softCard, mb: 3 }}
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
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Autocomplete
                  multiple
                  size="small"
                  options={typeOptions}
                  value={filters.type_machines}
                  onChange={handleAutocompleteFilterChange("type_machines")}
                  disableCloseOnSelect
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip
                        {...getTagProps({ index })}
                        key={option}
                        label={option}
                        size="small"
                      />
                    ))
                  }
                  renderInput={(params) => (
                    <TextField {...params} label="Loại máy" />
                  )}
                  ListboxProps={{
                    style: { maxHeight: 300 },
                  }}
                />
              </Grid>

              {/* Filter: Đặc tính */}
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Autocomplete
                  multiple
                  size="small"
                  options={attributeOptions}
                  value={filters.attribute_machines}
                  onChange={handleAutocompleteFilterChange(
                    "attribute_machines"
                  )}
                  disableCloseOnSelect
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip
                        {...getTagProps({ index })}
                        key={option}
                        label={option}
                        size="small"
                      />
                    ))
                  }
                  renderInput={(params) => (
                    <TextField {...params} label="Đặc tính" />
                  )}
                  ListboxProps={{
                    style: { maxHeight: 300 },
                  }}
                />
              </Grid>

              {/* Filter: Model */}
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Autocomplete
                  multiple
                  size="small"
                  options={modelOptions}
                  value={filters.model_machines}
                  onChange={handleAutocompleteFilterChange("model_machines")}
                  disableCloseOnSelect
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip
                        {...getTagProps({ index })}
                        key={option}
                        label={option}
                        size="small"
                      />
                    ))
                  }
                  renderInput={(params) => (
                    <TextField {...params} label="Model" />
                  )}
                  ListboxProps={{
                    style: { maxHeight: 300 },
                  }}
                />
              </Grid>

              {/* Filter: Hãng SX */}
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Autocomplete
                  multiple
                  size="small"
                  options={manufacturerOptions}
                  value={filters.manufacturers}
                  onChange={handleAutocompleteFilterChange("manufacturers")}
                  disableCloseOnSelect
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip
                        {...getTagProps({ index })}
                        key={option}
                        label={option}
                        size="small"
                      />
                    ))
                  }
                  renderInput={(params) => (
                    <TextField {...params} label="Hãng SX" />
                  )}
                  ListboxProps={{
                    style: { maxHeight: 300 },
                  }}
                />
              </Grid>

              {/* Filter: Nhà cung cấp */}
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Autocomplete
                  multiple
                  size="small"
                  options={supplierOptions}
                  value={filters.suppliers}
                  onChange={handleAutocompleteFilterChange("suppliers")}
                  disableCloseOnSelect
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip
                        {...getTagProps({ index })}
                        key={option}
                        label={option}
                        size="small"
                      />
                    ))
                  }
                  renderInput={(params) => (
                    <TextField {...params} label="Nhà cung cấp" />
                  )}
                  ListboxProps={{
                    style: { maxHeight: 300 },
                  }}
                />
              </Grid>

              {/* Filter: Vị trí */}
              {!selectedLocation && (
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <Autocomplete
                    multiple
                    size="small"
                    options={locationOptions}
                    value={filters.name_locations}
                    onChange={handleAutocompleteFilterChange("name_locations")}
                    disableCloseOnSelect
                    renderTags={(value, getTagProps) =>
                      value.map((option, index) => (
                        <Chip
                          {...getTagProps({ index })}
                          key={option}
                          label={option}
                          size="small"
                        />
                      ))
                    }
                    renderInput={(params) => (
                      <TextField {...params} label="Vị trí (trong ĐV)" />
                    )}
                    ListboxProps={{
                      style: { maxHeight: 300 },
                    }}
                  />
                </Grid>
              )}

              {/* Filter: Sử dụng khí nén */}
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Box
                  onClick={() =>
                    setFilters((prev) => ({
                      ...prev,
                      has_air_volume: !prev.has_air_volume,
                    }))
                  }
                  sx={{
                    height: "40px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    px: 1.5,
                    borderRadius: `${radii.md}px`,
                    border: "1px solid",
                    borderColor: alpha(colors.black, 0.23),
                    backgroundColor: "transparent",
                    cursor: "pointer",
                    userSelect: "none",
                    boxSizing: "border-box",
                    transition: "all 0.2s ease-in-out",
                    "&:hover": {
                      borderColor: alpha(colors.black, 0.87),
                    },
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      fontSize: fontSizes.px16,
                      color: "text.secondary",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    Máy sử dụng khí nén
                  </Typography>
                  <Switch
                    checked={filters.has_air_volume}
                    onChange={handleSwitchFilterChange("has_air_volume")}
                    onClick={(e) => e.stopPropagation()}
                    color="primary"
                    size="small"
                    sx={{ ml: 0.5 }}
                  />
                </Box>
              </Grid>
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
              ref={tableCardRef}
              component={Paper}
              variant="outlined"
              sx={{
                borderRadius: `${radii.md}px`,
                border: borders.subtle,
                mb: 2,
              }}
            >
              <Table size="small">
                <TableHead>
                  <TableRow
                    sx={{ backgroundColor: alpha(colors.brand.main, 0.05) }}
                  >
                    {/* <TableCell sx={{ fontWeight: 600, whiteSpace: "nowrap" }}>
                      Mã máy
                    </TableCell> */}
                    <TableCell sx={{ fontWeight: 600, whiteSpace: "nowrap" }}>
                      Loại máy
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, whiteSpace: "nowrap" }}>
                      Đặc tính
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
                        {/* <TableCell sx={{ fontWeight: 600 }}>
                          {machine.code_machine}
                        </TableCell> */}
                        <TableCell sx={{ whiteSpace: "nowrap" }}>
                          {machine.type_machine || "-"}
                        </TableCell>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>
                          {machine.attribute_machine || "-"}
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
                              borderRadius: `${radii.sm}px`,
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
                                borderRadius: `${radii.sm}px`,
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
                      borderRadius: `${radii.sm}px`,
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
        <PageHeader
          icon={<LocationOn />}
          title="Theo dõi vị trí"
          subtitle="Kiểm tra máy móc tại một vị trí và xem lịch sử điều chuyển"
          titleSx={{ textTransform: "uppercase" }}
          sx={{ mb: 4 }}
        />

        {/* Main Card */}
        <Card elevation={0} sx={{ ...preset.softCard, p: { xs: 2, sm: 4 } }}>
          <Grid container spacing={{ xs: 2, sm: 4 }}>
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
                    minHeight: "80px", // Chiều cao tối thiểu để chứa loading
                    alignItems: "flex-start",
                    border: `1px solid ${alpha(colors.black, 0.1)}`,
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
                          borderRadius: `${radii.sm}px`,
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
                    minHeight: 200, // Chiều cao tối thiểu
                    overflow: "auto",
                    p: 1, // Padding cho List
                    border: `1px solid ${alpha(colors.black, 0.1)}`,
                  }}
                >
                  {!selectedDepartment ? (
                    // Hiển thị khi chưa chọn đơn vị
                    <Alert severity="info" sx={{ m: 1, borderRadius: `${radii.sm}px` }}>
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
                      sx={{ m: 1, borderRadius: `${radii.sm}px` }}
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
                              borderRadius: `${radii.sm}px`,
                              mb: 0.5,
                              // Ghi đè style khi được chọn
                              "&.Mui-selected": {
                                backgroundColor: alpha(colors.brand.main, 0.15), // Nền tím nhạt
                                "&:hover": {
                                  backgroundColor: alpha(colors.brand.main, 0.2), // Đậm hơn khi hover
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
                              <LocationOn fontSize="small" />
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
                    background: gradients.brand,
                    px: 3,
                    py: 1, // Giảm padding cho nút nhỏ hơn
                    transition: "all 0.3s ease",
                    // Style khi bị vô hiệu hóa
                    "&.Mui-disabled": {
                      background: colors.grey[300],
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
          fullScreen={dialogFullScreen}
          fullWidth
          PaperProps={{ sx: preset.dialogPaper(dialogFullScreen) }}
        >
          <DialogTitle
            sx={{
              background: `linear-gradient(45deg, ${colors.green.main}, ${muiColors.green[400]})`,
              color: "white",
              fontWeight: 700,
            }}
          >
            <Typography component="span" variant="h5" sx={{ fontWeight: 700 }}>
              Lịch sử điều chuyển: {selectedMachine?.type_machine}{" "}
              {selectedMachine?.attribute_machine} -{" "}
              {selectedMachine?.model_machine}
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
                        sx={{ backgroundColor: alpha(colors.brand.main, 0.05) }}
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
          <DialogActions
            sx={{
              p: 3,
              "& > :not(style) + :not(style)": {
                marginLeft: { xs: "0px !important", sm: "8px !important" },
              },
            }}
          >
            <Button variant="outlined" onClick={handleCloseHistoryDialog}>
              Đóng
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </>
  );
};

export default LocationTrackPage;
