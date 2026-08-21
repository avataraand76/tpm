// frontend/src/pages/ReportPage.jsx

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useLayoutEffect,
} from "react";
import {
  Container,
  Typography,
  Box,
  Button,
  Grid,
  Card,
  CardContent,
  Stack,
  Avatar,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import {
  Assessment,
  ExpandMore,
  Receipt,
  CalendarMonth,
  ChevronLeft,
  ChevronRight,
  Refresh,
  TaskAlt,
  HourglassEmpty,
  CheckCircle,
  Business,
  FileDownload,
  Air,
  Speed,
  PrecisionManufacturing,
  LocationOn,
  WarningAmber,
  Dashboard,
  FactCheck,
  OpenInNew,
  Fullscreen,
  KeyboardArrowUp,
  KeyboardArrowDown,
  Close,
} from "@mui/icons-material";
import { useLocation } from "react-router-dom";
import ExcelJS from "exceljs";
import NavigationBar from "../components/NavigationBar";
import { api } from "../api/api";

const MONTH_NAMES = [
  "Tháng 1",
  "Tháng 2",
  "Tháng 3",
  "Tháng 4",
  "Tháng 5",
  "Tháng 6",
  "Tháng 7",
  "Tháng 8",
  "Tháng 9",
  "Tháng 10",
  "Tháng 11",
  "Tháng 12",
];

const MAINT_STATUS_CONFIG = {
  pending: {
    label: "Chưa thực hiện",
    color: "#e65100",
    bg: "#fff3e0",
    icon: HourglassEmpty,
  },
  completed: {
    label: "Đã thực hiện",
    color: "#1565c0",
    bg: "#e3f2fd",
    icon: TaskAlt,
  },
  confirm_completed: {
    label: "Đã hoàn thành",
    color: "#2e7d32",
    bg: "#e8f5e9",
    icon: CheckCircle,
  },
};

// Cấu hình bảng trạng thái chi tiết (đồng bộ với trang Danh sách máy móc)
const MATRIX_COLUMNS = [
  { key: "internal", label: "Máy nội bộ" },
  { key: "borrowed", label: "Máy mượn" },
  { key: "rented", label: "Máy thuê" },
];

const MATRIX_ROWS = [
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

const MATRIX_SUB_ROWS = [
  { key: "maintenance", label: "Bảo trì", color: "#00bcd4", bg: "#e0f7fa" },
  { key: "broken", label: "Máy hư", color: "#00bcd4", bg: "#e0f7fa" },
  { key: "disabled", label: "Cho mượn", color: "#00bcd4", bg: "#e0f7fa" },
];

const MATRIX_MERGED_STATUSES = ["maintenance", "broken", "disabled"];

// Donut tiến độ bảo dưỡng tháng — chỉ 2 trạng thái,
// màu lấy từ MAINT_STATUS_CONFIG của tab Thống kê bảo dưỡng
const MAINT_DONE_COLOR = MAINT_STATUS_CONFIG.completed.color;
const MAINT_PENDING_COLOR = MAINT_STATUS_CONFIG.pending.color;
// Thanh "Tiến độ đến hiện tại" dùng màu vàng để tách khỏi cam "chưa thực hiện"
const MAINT_TODAY_COLOR = "#f59e0b";

const MO_MAINT_SEGMENTS = [
  { key: "done", label: "Đã thực hiện", color: MAINT_DONE_COLOR },
  { key: "pending", label: "Chưa thực hiện", color: MAINT_PENDING_COLOR },
];

// Các phần của biểu đồ donut cơ cấu trạng thái máy (màu sáng trên nền tối)
const MO_DONUT_SEGMENTS = [
  { key: "in_use", label: "Đang sử dụng", color: "#1976d2" },
  { key: "available", label: "Có thể sử dụng", color: "#2e7d32" },
  { key: "not_in_use", label: "Chưa sử dụng", color: "#ed6c02" },
  { key: "pending_liquidation", label: "Chờ thanh lý", color: "#ff5722" },
];

const formatCount = (value) =>
  new Intl.NumberFormat("en-US").format(Number(value) || 0);

// Style hàng tiêu đề & hàng tổng cộng dùng chung cho các bảng của tab Dashboard,
// lấy đúng theo bảng của tab Thống kê kiểm kê / Thống kê bảo dưỡng.
// Màu nền phải đặt trên từng ô vì stickyHeader của MUI ghi đè nền của TableRow.
const TABLE_HEAD_BG = "#f5f6f8";
const TABLE_HEAD_CELL = { top: 0, fontWeight: 700, bgcolor: TABLE_HEAD_BG };

// Gộp máy "cho mượn" vào cột nội bộ và tạo hàng gộp "Chưa sử dụng"
// (xử lý giống StatusMatrixTable của trang Danh sách máy móc)
const buildMatrixData = (matrix) => {
  const data = {};
  Object.keys(matrix || {}).forEach((statusKey) => {
    const row = { ...(matrix[statusKey] || {}) };
    row.internal = (row.internal || 0) + (row.borrowed_out || 0);
    row.borrowed_out = 0;
    data[statusKey] = row;
  });

  data.not_in_use = {};
  MATRIX_COLUMNS.forEach((col) => {
    data.not_in_use[col.key] = MATRIX_MERGED_STATUSES.reduce(
      (sum, status) => sum + (data[status]?.[col.key] || 0),
      0
    );
  });

  return data;
};

const matrixRowTotal = (rowData) =>
  MATRIX_COLUMNS.reduce((sum, col) => sum + (rowData?.[col.key] || 0), 0);

const matrixColTotal = (data, colKey) =>
  MATRIX_ROWS.reduce((sum, row) => sum + (data?.[row.key]?.[colKey] || 0), 0);

// Bảng màu gradient dùng chung, đồng bộ với các card ở tab Lưu lượng khí nén
const GRADIENTS = {
  navy: {
    bg: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
    shadow: "0 10px 30px rgba(15,23,42,0.3)",
    accent: "#38bdf8",
  },
  indigo: {
    bg: "linear-gradient(135deg, #3f51b5 0%, #5c6bc0 100%)",
    shadow: "0 6px 20px rgba(63,81,181,0.25)",
    accent: "#818cf8",
  },
  teal: {
    bg: "linear-gradient(135deg, #00897b 0%, #26a69a 100%)",
    shadow: "0 6px 20px rgba(0,137,123,0.25)",
    accent: "#2dd4bf",
  },
  violet: {
    bg: "linear-gradient(135deg, #5e35b1 0%, #7e57c2 100%)",
    shadow: "0 6px 20px rgba(94,53,177,0.25)",
    accent: "#a78bfa",
  },
  // 4 gradient dưới đây lấy đúng màu trạng thái của MATRIX_ROWS
  // (in_use #1976d2, available #2e7d32, not_in_use #ed6c02, pending_liquidation #ff5722)
  statusInUse: {
    bg: "linear-gradient(135deg, #1565c0 0%, #42a5f5 100%)",
    shadow: "0 6px 20px rgba(25,118,210,0.25)",
    accent: "#64b5f6",
  },
  statusAvailable: {
    bg: "linear-gradient(135deg, #1b5e20 0%, #4caf50 100%)",
    shadow: "0 6px 20px rgba(46,125,50,0.25)",
    accent: "#81c784",
  },
  statusNotInUse: {
    bg: "linear-gradient(135deg, #e65100 0%, #ffa726 100%)",
    shadow: "0 6px 20px rgba(237,108,2,0.25)",
    accent: "#ffb74d",
  },
  statusPendingLiquidation: {
    bg: "linear-gradient(135deg, #bf360c 0%, #ff7043 100%)",
    shadow: "0 6px 20px rgba(255,87,34,0.25)",
    accent: "#ff8a65",
  },
};

// Panel chuẩn: header gradient + icon, thân panel sáng hoặc tối
const PanelCard = ({
  title,
  subtitle,
  icon,
  gradient = "indigo",
  action,
  dark,
  children,
  sx,
}) => {
  const theme = GRADIENTS[gradient] || GRADIENTS.indigo;
  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: "18px",
        border: dark
          ? "1px solid rgba(255,255,255,0.08)"
          : "1px solid rgba(0,0,0,0.06)",
        background: dark ? theme.bg : "#fff",
        boxShadow: dark ? theme.shadow : "0 2px 10px rgba(15,23,42,0.04)",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        ...sx,
      }}
    >
      <Box
        sx={{
          px: 2.5,
          py: 1.5,
          background: theme.bg,
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Avatar
            sx={{
              bgcolor: "rgba(255,255,255,0.2)",
              width: 34,
              height: 34,
            }}
          >
            {React.cloneElement(icon, { sx: { fontSize: 19, color: "#fff" } })}
          </Avatar>
          <Box>
            <Typography
              variant="h6"
              fontWeight={700}
              sx={{ textTransform: "uppercase", letterSpacing: 0.3 }}
            >
              {title}
            </Typography>
            {subtitle && (
              <Typography
                variant="caption"
                sx={{ display: "block", opacity: 0.8, lineHeight: 1.3 }}
              >
                {subtitle}
              </Typography>
            )}
          </Box>
        </Stack>
        {action}
      </Box>
      <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
        {children}
      </Box>
    </Card>
  );
};

// Biểu đồ donut vẽ bằng SVG (không dùng thư viện ngoài)
const DonutChart = ({ segments, total, centerLabel, size = 190, dark }) => {
  const thickness = Math.round(size * 0.16);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  let consumed = 0;

  return (
    <Box
      sx={{ position: "relative", width: size, height: size, flexShrink: 0 }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: "rotate(-90deg)" }}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={dark ? "rgba(255,255,255,0.08)" : "#eef2f6"}
          strokeWidth={thickness}
        />
        {segments
          .filter((s) => s.value > 0)
          .map((s) => {
            const length = total > 0 ? (s.value / total) * circumference : 0;
            const dashOffset = -consumed;
            consumed += length;
            return (
              <circle
                key={s.key}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={s.color}
                strokeWidth={thickness}
                strokeDasharray={`${length} ${circumference - length}`}
                strokeDashoffset={dashOffset}
              />
            );
          })}
      </svg>
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Typography
          variant="h4"
          fontWeight={700}
          sx={{ color: dark ? "#f8fafc" : "#1e293b" }}
        >
          {formatCount(total)}
        </Typography>
        <Typography
          variant="caption"
          fontWeight={600}
          sx={{ color: dark ? "#94a3b8" : "text.secondary" }}
        >
          {centerLabel}
        </Typography>
      </Box>
    </Box>
  );
};

// Bảng trạng thái chi tiết (bản chỉ đọc của StatusMatrixTable ở trang Danh sách máy móc)
/**
 * Cột "Máy nội bộ" của ma trận đã gộp cả máy cho mượn (xem buildMatrixData),
 * nên lọc chi tiết theo cột phải lọc đúng bộ nguồn máy tương ứng.
 */
const MATRIX_COLUMN_SOURCES = {
  internal: ["internal", "borrowed_out"],
  borrowed: ["borrowed"],
  rented: ["rented"],
};

/** Dòng gộp "Chưa sử dụng" đại diện cho cả 3 trạng thái con của nó */
const matrixStatusKeysOf = (row) =>
  row.key === "not_in_use" ? MATRIX_MERGED_STATUSES : [row.key];

const MATRIX_ALL_STATUS_KEYS = MATRIX_ROWS.flatMap(matrixStatusKeysOf);
const MATRIX_ALL_SOURCE_KEYS = MATRIX_COLUMNS.flatMap(
  (col) => MATRIX_COLUMN_SOURCES[col.key] || [col.key]
);

/**
 * Style hover/bấm cho một ô số của ma trận — dùng đúng cách của StatusMatrixTable
 * bên trang Danh sách máy móc: viền inset 2px + nền đậm hơn theo màu trạng thái,
 * chứ không phải gạch chân chữ.
 *
 * Ô bằng 0 thì không có gì để xem nên cố ý KHÔNG hover và không bấm được:
 * ô nào sáng lên khi trỏ vào là ô đó mở được chi tiết.
 */
const matrixCellSx = (color, { clickable, bgcolor }) => ({
  cursor: clickable ? "pointer" : "default",
  bgcolor,
  ...(clickable && {
    "&:hover": {
      bgcolor: alpha(color, 0.25),
      color: color,
      boxShadow: `inset 0 0 0 2px ${color}`,
    },
  }),
});

/**
 * Dialog chi tiết khi bấm vào một ô của bảng "Trạng thái chi tiết":
 * những máy trong ô đó đang nằm ở đơn vị / vị trí nào.
 *
 * Không gọi API riêng — `breakdown` đã về cùng lượt fetch của bảng, ở đây chỉ lọc
 * theo (statusKeys x sourceKeys) của ô rồi gộp Đơn vị -> Vị trí. Nhờ vậy mọi loại ô
 * (ô lá, dòng gộp, cột Tổng, dòng Tổng) đều mở được ngay, không thêm tải cho server.
 */
const MachineStatusDrilldownDialog = ({
  open,
  onClose,
  title,
  color = "#1976d2",
  breakdown,
  statusKeys,
  sourceKeys,
}) => {
  const isMobile = useMediaQuery(useTheme().breakpoints.down("sm"));
  // Mặc định thu gọn hết để thấy ngay bức tranh theo đơn vị,
  // muốn xem vị trí cụ thể thì bấm mở từng đơn vị.
  const [expanded, setExpanded] = useState(() => new Set());

  const toggleDept = (id) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const { groups, total, locationCount } = useMemo(() => {
    const statusSet = new Set(statusKeys);
    const sourceSet = new Set(sourceKeys);
    const byDept = new Map();

    (breakdown || []).forEach((item) => {
      if (!statusSet.has(item.status) || !sourceSet.has(item.source)) return;

      if (!byDept.has(item.id_department)) {
        byDept.set(item.id_department, {
          id: item.id_department,
          name: item.name_department,
          total: 0,
          locations: new Map(),
        });
      }
      const dept = byDept.get(item.id_department);
      dept.total += item.count;
      // Cùng đơn vị + vị trí có thể đến từ nhiều trạng thái/nguồn khác nhau nên phải cộng dồn
      const loc = dept.locations.get(item.id_location) || {
        id: item.id_location,
        name: item.name_location,
        count: 0,
      };
      loc.count += item.count;
      dept.locations.set(item.id_location, loc);
    });

    const list = [...byDept.values()]
      .map((dept) => ({
        ...dept,
        locations: [...dept.locations.values()].sort(
          (a, b) => b.count - a.count
        ),
      }))
      .sort((a, b) => b.total - a.total);

    return {
      groups: list,
      total: list.reduce((sum, g) => sum + g.total, 0),
      locationCount: list.reduce((sum, g) => sum + g.locations.length, 0),
    };
  }, [breakdown, statusKeys, sourceKeys]);

  const share = (value) => (total > 0 ? (value / total) * 100 : 0);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{ sx: { borderRadius: isMobile ? 0 : "20px" } }}
    >
      <DialogTitle sx={{ bgcolor: alpha(color, 0.09), py: 1.5 }}>
        <Stack
          direction="row"
          alignItems="flex-start"
          justifyContent="space-between"
          spacing={1}
        >
          <Box sx={{ minWidth: 0 }}>
            <Stack direction="row" alignItems="center" spacing={1.2}>
              <Box
                sx={{
                  width: 11,
                  height: 11,
                  borderRadius: "50%",
                  bgcolor: color,
                  flexShrink: 0,
                }}
              />
              <Typography
                variant={isMobile ? "subtitle1" : "h6"}
                fontWeight={800}
                sx={{ color: "#1e293b", lineHeight: 1.3 }}
              >
                {title}
              </Typography>
            </Stack>
            <Typography
              variant="caption"
              sx={{ display: "block", mt: 0.3, color: "#64748b" }}
            >
              <b style={{ color }}>{formatCount(total)} máy</b> ·{" "}
              {groups.length} đơn vị · {locationCount} vị trí
            </Typography>
          </Box>
          <IconButton
            onClick={onClose}
            size="small"
            sx={{ color: "#64748b", flexShrink: 0 }}
          >
            <Close />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 0 }}>
        {groups.length === 0 ? (
          <Typography
            variant="body2"
            sx={{ py: 6, textAlign: "center", color: "text.secondary" }}
          >
            Không có máy nào trong mục này.
          </Typography>
        ) : (
          <TableContainer
            component={Paper}
            elevation={0}
            sx={{ borderRadius: 0, maxHeight: "60vh", overflowX: "auto" }}
          >
            <Table size="medium" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ ...TABLE_HEAD_CELL, pl: 3 }}>
                    Đơn vị / Vị trí
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{ ...TABLE_HEAD_CELL, whiteSpace: "nowrap" }}
                  >
                    Số máy
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{ ...TABLE_HEAD_CELL, whiteSpace: "nowrap" }}
                  >
                    Tỷ trọng
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {groups.map((group) => {
                  const isExpanded = expanded.has(group.id);
                  return (
                    <React.Fragment key={group.id}>
                      <TableRow
                        hover
                        onClick={() => toggleDept(group.id)}
                        sx={{ cursor: "pointer", userSelect: "none" }}
                      >
                        <TableCell sx={{ fontWeight: 600, pl: 3 }}>
                          <Stack
                            direction="row"
                            alignItems="center"
                            spacing={0.8}
                          >
                            <Box
                              component="span"
                              sx={{
                                display: "inline-flex",
                                color: "text.secondary",
                              }}
                            >
                              {isExpanded ? (
                                <KeyboardArrowUp fontSize="small" />
                              ) : (
                                <KeyboardArrowDown fontSize="small" />
                              )}
                            </Box>
                            <span>{group.name}</span>
                            <Typography
                              component="span"
                              variant="body2"
                              sx={{ color: "text.secondary" }}
                            >
                              ({group.locations.length} vị trí)
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell
                          align="center"
                          sx={{ fontWeight: 600, color }}
                        >
                          {formatCount(group.total)}
                        </TableCell>
                        <TableCell align="center">
                          <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                            justifyContent="center"
                          >
                            <Box
                              sx={{
                                width: 60,
                                height: 6,
                                bgcolor: "#eee",
                                borderRadius: 3,
                                overflow: "hidden",
                              }}
                            >
                              <Box
                                sx={{
                                  width: `${share(group.total)}%`,
                                  height: "100%",
                                  bgcolor: color,
                                  borderRadius: 3,
                                }}
                              />
                            </Box>
                            <Typography variant="body2" fontWeight={700}>
                              {share(group.total).toFixed(1)}%
                            </Typography>
                          </Stack>
                        </TableCell>
                      </TableRow>

                      {isExpanded &&
                        group.locations.map((loc) => (
                          <TableRow key={loc.id} sx={{ bgcolor: "#fafbfc" }}>
                            <TableCell sx={{ pl: 6, fontWeight: 600 }}>
                              {loc.name}
                            </TableCell>
                            <TableCell
                              align="center"
                              sx={{ fontWeight: 600, color: "text.secondary" }}
                            >
                              {formatCount(loc.count)}
                            </TableCell>
                            <TableCell
                              align="center"
                              sx={{ fontWeight: 600, color: "text.secondary" }}
                            >
                              {share(loc.count).toFixed(1)}%
                            </TableCell>
                          </TableRow>
                        ))}
                    </React.Fragment>
                  );
                })}

                {/* Hàng tổng cộng */}
                <TableRow sx={{ bgcolor: TABLE_HEAD_BG }}>
                  <TableCell sx={{ fontWeight: "bold", pl: 3 }}>
                    TỔNG CỘNG
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: "bold", color }}>
                    {formatCount(total)}
                  </TableCell>
                  <TableCell align="center"></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>
    </Dialog>
  );
};

const MachineStatusMatrix = ({ data, breakdown = [] }) => {
  const HEAD_HOVER_COLOR = useTheme().palette.primary.main;
  const [openNotInUse, setOpenNotInUse] = useState(false);
  /** Ô đang mở drill-down; null = không mở */
  const [drill, setDrill] = useState(null);
  const openDrill = (statusKeys, sourceKeys, title, color) =>
    setDrill({ statusKeys, sourceKeys, title, color });

  const TOTAL_COLOR = "#667eea";
  const TOTAL_BG = "#ede7f6";

  const grandTotal = MATRIX_ROWS.reduce(
    (sum, row) => sum + matrixRowTotal(data[row.key]),
    0
  );

  const renderRow = (row, isSubRow = false) => {
    const rowData = data[row.key] || {};
    const rowTotal = matrixRowTotal(rowData);
    const hasDataRow = rowTotal > 0;

    return (
      <TableRow key={row.key} sx={{ "& > *": { borderBottom: "unset" } }}>
        <TableCell
          className="cell-first-col"
          sx={{
            color: row.color,
            bgcolor: "#fff",
            pl: isSubRow ? 4 : 2,
            "&:hover": {
              bgcolor: row.bg,
              boxShadow: `inset 3px 0 0 0 ${row.color}`,
            },
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center" }}>
            {row.hasChildren && (
              <IconButton
                aria-label="expand row"
                size="small"
                onClick={() => setOpenNotInUse((prev) => !prev)}
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

        {MATRIX_COLUMNS.map((col) => {
          const value = rowData[col.key] || 0;
          const label = `${col.label} · ${row.label}`;
          return (
            <TableCell
              key={col.key}
              title={value > 0 ? `Xem đơn vị / vị trí — ${label}` : undefined}
              onClick={
                value > 0
                  ? () =>
                      openDrill(
                        matrixStatusKeysOf(row),
                        MATRIX_COLUMN_SOURCES[col.key] || [col.key],
                        label,
                        row.color
                      )
                  : undefined
              }
              sx={{
                color: value > 0 ? row.color : "#e0e0e0",
                fontWeight: value > 0 ? 700 : 400,
                ...matrixCellSx(row.color, {
                  clickable: value > 0,
                  bgcolor: value > 0 ? row.bg : "transparent",
                }),
              }}
            >
              {value ? formatCount(value) : "-"}
            </TableCell>
          );
        })}

        <TableCell
          title={
            hasDataRow
              ? `Xem đơn vị / vị trí — Toàn bộ máy · ${row.label}`
              : undefined
          }
          onClick={
            hasDataRow
              ? () =>
                  openDrill(
                    matrixStatusKeysOf(row),
                    MATRIX_ALL_SOURCE_KEYS,
                    `Toàn bộ máy · ${row.label}`,
                    row.color
                  )
              : undefined
          }
          sx={{
            fontWeight: 700,
            color: hasDataRow ? row.color : "#bdbdbd",
            ...matrixCellSx(row.color, {
              clickable: hasDataRow,
              bgcolor: hasDataRow ? alpha(row.color, 0.08) : "transparent",
            }),
          }}
        >
          {rowTotal ? formatCount(rowTotal) : "-"}
        </TableCell>
      </TableRow>
    );
  };

  return (
    <>
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
              {MATRIX_COLUMNS.map((col) => (
                <TableCell
                  key={col.key}
                  sx={{
                    "&:hover": {
                      color: HEAD_HOVER_COLOR,
                      bgcolor: "#f0f4f8",
                      boxShadow: `inset 0 -3px 0 0 ${HEAD_HOVER_COLOR}`,
                    },
                  }}
                >
                  {col.label}
                </TableCell>
              ))}
              <TableCell
                sx={{
                  fontWeight: "700 !important",
                  color: `${TOTAL_COLOR} !important`,
                  backgroundColor: `${TOTAL_BG} !important`,
                  "&:hover": {
                    boxShadow: `inset 0 -3px 0 0 ${TOTAL_COLOR}`,
                  },
                }}
              >
                Tổng
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {MATRIX_ROWS.map((row) => (
              <React.Fragment key={row.key}>
                {renderRow(row)}
                {row.key === "not_in_use" &&
                  openNotInUse &&
                  MATRIX_SUB_ROWS.map((subRow) => renderRow(subRow, true))}
              </React.Fragment>
            ))}

            <TableRow sx={{ backgroundColor: "#fafafa" }}>
              <TableCell
                className="cell-first-col"
                sx={{
                  fontWeight: "700 !important",
                  color: `${TOTAL_COLOR} !important`,
                  backgroundColor: "#fafafa !important",
                  "&:hover": {
                    backgroundColor: `${TOTAL_BG} !important`,
                    boxShadow: `inset 3px 0 0 0 ${TOTAL_COLOR}`,
                  },
                }}
              >
                Tổng
              </TableCell>
              {MATRIX_COLUMNS.map((col) => {
                const colTotal = matrixColTotal(data, col.key);
                return (
                  <TableCell
                    key={col.key}
                    title={
                      colTotal > 0
                        ? `Xem đơn vị / vị trí — ${col.label}`
                        : undefined
                    }
                    onClick={
                      colTotal > 0
                        ? () =>
                            openDrill(
                              MATRIX_ALL_STATUS_KEYS,
                              MATRIX_COLUMN_SOURCES[col.key] || [col.key],
                              col.label,
                              TOTAL_COLOR
                            )
                        : undefined
                    }
                    sx={{
                      fontWeight: 700,
                      color: colTotal > 0 ? TOTAL_COLOR : "#bdbdbd",
                      ...matrixCellSx(TOTAL_COLOR, {
                        clickable: colTotal > 0,
                        bgcolor: "transparent",
                      }),
                    }}
                  >
                    {colTotal ? formatCount(colTotal) : "-"}
                  </TableCell>
                );
              })}
              <TableCell
                title={
                  grandTotal > 0
                    ? "Xem đơn vị / vị trí — Toàn bộ máy"
                    : undefined
                }
                onClick={
                  grandTotal > 0
                    ? () =>
                        openDrill(
                          MATRIX_ALL_STATUS_KEYS,
                          MATRIX_ALL_SOURCE_KEYS,
                          "Toàn bộ máy",
                          TOTAL_COLOR
                        )
                    : undefined
                }
                sx={{
                  backgroundColor: `${alpha(TOTAL_COLOR, 0.15)} !important`,
                  color: `${TOTAL_COLOR} !important`,
                  fontWeight: 700,
                  fontSize: "1.05rem !important",
                  cursor: grandTotal > 0 ? "pointer" : "default",
                  ...(grandTotal > 0 && {
                    "&:hover": {
                      filter: "brightness(0.95)",
                      boxShadow: `inset 0 0 0 2px ${TOTAL_COLOR}`,
                    },
                  }),
                }}
              >
                {grandTotal ? formatCount(grandTotal) : "-"}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      {/* key theo ô được bấm: mỗi ô mở ra một dialog mới, không giữ lại trạng thái
          đóng/mở của đơn vị ở ô trước (danh sách đơn vị mỗi ô mỗi khác) */}
      <MachineStatusDrilldownDialog
        key={
          drill
            ? `${drill.statusKeys.join(",")}|${drill.sourceKeys.join(",")}`
            : "closed"
        }
        open={Boolean(drill)}
        onClose={() => setDrill(null)}
        title={drill?.title}
        color={drill?.color}
        breakdown={breakdown}
        statusKeys={drill?.statusKeys ?? []}
        sourceKeys={drill?.sourceKeys ?? []}
      />
    </>
  );
};

// ===== Kiểm kê theo ngày: biểu đồ + bảng ma trận (port từ tab Kiểm kê của erpdashboard) =====

/** Chỉ 4 xưởng may lên bảng/biểu đồ kiểm kê: id_department 2..5 = Xưởng 1..4 */
const INV_WORKSHOP_IDS = [2, 3, 4, 5];

/**
 * Màu 4 xưởng. Lấy đúng ý nghĩa màu của erpdashboard nhưng đổi sang tông đậm hơn
 * cho nền trắng của TPM — màu neon của dashboard tối đọc không nổi trên giấy trắng.
 */
const INV_WORKSHOP_COLORS = {
  2: "#059669",
  3: "#d97706",
  4: "#db2777",
  5: "#dc2626",
};

/** Màu thứ 7, đồng bộ với gradient navy accent của trang */
const INV_SATURDAY_COLOR = "#0284c7";

/** 2 chỉ tiêu sai lệch được vẽ biểu đồ — sổ sách/hiện diện đi ngang nên vẽ không nói lên gì */
const INV_TREND_METRICS = [
  { key: "misDept", title: "Số máy khác đơn vị" },
  { key: "missing", title: "Số máy chưa xác định" },
];

/** Tuần theo NGÀY: 1-7 → 1, 8-14 → 2, 15-21 → 3, 22-hết tháng → 4 (tháng nào cũng 4 tuần) */
const INV_WEEK_COUNT = 4;
const invWeekOfMonth = (day) => Math.min(Math.ceil(day / 7), INV_WEEK_COUNT);

const INV_WEEKDAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

/**
 * Gom `reportData.inventory` (danh sách phiếu) thành các dòng theo NGÀY.
 * Một ngày có thể có nhiều phiếu phủ các đơn vị khác nhau nên phải cộng dồn theo đơn vị.
 *
 * Quy ước số liệu giữ đúng như báo cáo kiểm kê:
 *   - presentBook = scanned_count - mis_dept_count (máy quét được và đúng đơn vị)
 *   - misDept     = mis_dept_count
 *   - missing     = missing_count
 */
const buildInventoryDays = (tickets) => {
  const byDate = new Map();

  (tickets || []).forEach((ticket) => {
    const d = new Date(ticket.check_date);
    const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

    const keptDepts = (ticket.departments || []).filter((dept) =>
      INV_WORKSHOP_IDS.includes(dept.id_department)
    );
    if (keptDepts.length === 0) return;

    if (!byDate.has(dateKey)) {
      byDate.set(dateKey, {
        dateKey,
        day: d.getDate(),
        month: d.getMonth() + 1,
        week: invWeekOfMonth(d.getDate()),
        isSaturday: d.getDay() === 6,
        weekdayLabel: INV_WEEKDAYS[d.getDay()],
        byDepartment: {},
      });
    }
    const row = byDate.get(dateKey);

    keptDepts.forEach((dept) => {
      const cur =
        row.byDepartment[dept.id_department] ||
        (row.byDepartment[dept.id_department] = {
          presentBook: 0,
          misDept: 0,
          missing: 0,
        });
      cur.presentBook += (dept.scanned_count || 0) - (dept.mis_dept_count || 0);
      cur.misDept += dept.mis_dept_count || 0;
      cur.missing += dept.missing_count || 0;
    });
  });

  // Mới nhất lên trước cho bảng; biểu đồ sẽ tự đảo lại theo thời gian
  return [...byDate.values()].sort((a, b) =>
    b.dateKey.localeCompare(a.dateKey)
  );
};

/** Danh sách 4 xưởng thực có trong dữ liệu, giữ thứ tự id */
const buildInventoryWorkshops = (tickets) => {
  const map = new Map();
  (tickets || []).forEach((ticket) =>
    (ticket.departments || []).forEach((dept) => {
      if (INV_WORKSHOP_IDS.includes(dept.id_department)) {
        map.set(dept.id_department, {
          id: dept.id_department,
          name: dept.name_department,
        });
      }
    })
  );
  return [...map.values()].sort((a, b) => a.id - b.id);
};

/** Làm tròn trần trục Y lên mốc "đẹp" để lưới không ra số lẻ */
const invNiceMax = (value) => {
  if (value <= 4) return 4;
  if (value <= 8) return 8;
  if (value <= 12) return 12;
  if (value <= 20) return 20;
  return Math.ceil(value / 10) * 10;
};

/**
 * Đo bề ngang thật của khung chứa để vẽ SVG theo đúng pixel (viewBox = kích thước thật).
 * Nếu để SVG tự co giãn theo viewBox cố định thì chữ và nét cũng bị co theo:
 * card hẹp là chữ trục còn ~7px, đọc không nổi.
 */
const useMeasuredWidth = () => {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const update = () => setWidth(el.clientWidth);
    update();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", update);
      return () => window.removeEventListener("resize", update);
    }
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return [ref, width];
};

/**
 * Tạo đường cong mềm mại (Smooth Cubic Bezier SVG path) từ mảng điểm [{x, y}]
 */
const createSmoothPath = (pts) => {
  if (!pts || pts.length === 0) return "";
  if (pts.length === 1) return `M ${pts[0].x},${pts[0].y}`;
  if (pts.length === 2)
    return `M ${pts[0].x},${pts[0].y} L ${pts[1].x},${pts[1].y}`;

  const smoothing = 0.18; // Độ uốn cong tự nhiên

  const line = (a, b) => {
    const lengthX = b.x - a.x;
    const lengthY = b.y - a.y;
    return {
      length: Math.sqrt(lengthX * lengthX + lengthY * lengthY),
      angle: Math.atan2(lengthY, lengthX),
    };
  };

  const controlPoint = (current, previous, next, reverse) => {
    const p = previous || current;
    const n = next || current;
    const l = line(p, n);
    const angle = l.angle + (reverse ? Math.PI : 0);
    const length = l.length * smoothing;
    const x = current.x + Math.cos(angle) * length;
    const y = current.y + Math.sin(angle) * length;
    return { x, y };
  };

  return pts.reduce((acc, point, i, a) => {
    if (i === 0) return `M ${point.x},${point.y}`;
    const cps = controlPoint(a[i - 1], a[i - 2], point, false);
    const cpe = controlPoint(point, a[i - 1], a[i + 1], true);
    return `${acc} C ${cps.x.toFixed(2)},${cps.y.toFixed(2)} ${cpe.x.toFixed(2)},${cpe.y.toFixed(2)} ${point.x.toFixed(2)},${point.y.toFixed(2)}`;
  }, "");
};

/**
 * Biểu đồ đường nhiều series, vẽ bằng SVG thuần — cùng cách làm với DonutChart ở trên,
 * không thêm thư viện chart nào vào project.
 *
 * `points`: [{ label, isSaturday, values: { [workshopId]: number|null } }]
 * Giá trị null = đơn vị không kiểm kê hôm đó → đường NGẮT tại đó, không nối liền
 * (nối liền sẽ vẽ ra một xu hướng không có thật).
 *
 * `onSelect(workshopId)`: bấm vào đường / điểm / tên xưởng ở chú giải sẽ gọi hàm này.
 * Hover chỉ làm nổi tạm thời, còn `focusedId` là xưởng đang được chọn thật.
 */
const InventoryLineChart = ({
  title,
  points,
  workshops,
  focusedId,
  onSelect,
  height = 210,
}) => {
  /** Xưởng đang trỏ chuột vào — để thấy trước mình sắp bấm vào đường nào */
  const [hoverId, setHoverId] = useState(null);
  /** Chỉ số điểm (ngày) đang hover để hiện Tooltip & đường gióng dọc */
  const [hoverPointIdx, setHoverPointIdx] = useState(null);

  // Hover thắng focus: trong dialog, trỏ vào đường khác sẽ soi thử đường đó
  // để thấy trước kết quả khi bấm, rời chuột thì quay lại xưởng đang xem.
  const activeId = hoverId ?? focusedId;

  // Vẽ 1:1 theo pixel: chiều cao cố định, bề ngang lấy từ khung chứa
  // nên chữ trục luôn đúng cỡ dù card rộng hay hẹp, thường hay standalone.
  const [wrapRef, measuredWidth] = useMeasuredWidth();
  const W = Math.max(320, measuredWidth || 640);
  const H = height;
  const padL = 40;
  const padR = 16;
  const padT = 16;
  const padB = 46;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const maxValue = Math.max(
    0,
    ...points.flatMap((p) => workshops.map((w) => p.values[w.id] ?? 0))
  );
  const yMax = invNiceMax(maxValue);
  const yTicks = [0, yMax / 4, yMax / 2, (yMax * 3) / 4, yMax];

  const xAt = (i) =>
    points.length <= 1
      ? padL + plotW / 2
      : padL + (i * plotW) / (points.length - 1);
  const yAt = (v) => padT + plotH - (v / yMax) * plotH;

  const handleMouseMove = (e) => {
    if (!points || points.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    if (mouseX < padL - 12 || mouseX > W - padR + 12) {
      setHoverPointIdx(null);
      return;
    }
    let closestIdx = 0;
    let minDiff = Infinity;
    points.forEach((_, i) => {
      const diff = Math.abs(xAt(i) - mouseX);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = i;
      }
    });
    setHoverPointIdx(closestIdx);
  };

  const handleMouseLeave = () => {
    setHoverPointIdx(null);
  };

  /**
   * Cắt mỗi xưởng thành từng đoạn liên tục, bỏ qua điểm null để đường ngắt đúng chỗ.
   * Tính một lần rồi dùng cho cả lớp vẽ và lớp bắt chuột.
   */
  const series = workshops.map((w) => {
    const segments = [];
    let current = [];
    points.forEach((p, i) => {
      const v = p.values[w.id];
      if (v === null || v === undefined) {
        if (current.length) segments.push(current);
        current = [];
      } else {
        current.push({ x: xAt(i), y: yAt(v) });
      }
    });
    if (current.length) segments.push(current);
    return { w, segments };
  });

  // Đường đang focus vẽ sau cùng để nằm đè lên các đường khác
  const drawOrder = activeId
    ? [
        ...series.filter((s) => s.w.id !== activeId),
        ...series.filter((s) => s.w.id === activeId),
      ]
    : series;

  const hoverProps = (id) =>
    onSelect
      ? {
          style: { cursor: "pointer" },
          onMouseEnter: () => setHoverId(id),
          onMouseLeave: () => setHoverId(null),
          onClick: () => onSelect(id),
        }
      : {};

  return (
    <Box ref={wrapRef}>
      <Typography
        variant="subtitle2"
        fontWeight={700}
        sx={{ mb: 0.5, color: "#334155" }}
      >
        {title}
      </Typography>

      {points.length === 0 ? (
        <Box
          sx={{
            height: H,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "1px dashed rgba(0,0,0,0.12)",
            borderRadius: "12px",
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Không có phiếu kiểm kê trong khoảng này
          </Typography>
        </Box>
      ) : (
        <Box
          sx={{ position: "relative" }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <svg
            width={W}
            height={H}
            viewBox={`0 0 ${W} ${H}`}
            style={{ width: "100%", height: H, display: "block" }}
          >
            {/* Lưới ngang + nhãn trục Y */}
            {yTicks.map((t) => (
              <g key={t}>
                <line
                  x1={padL}
                  x2={W - padR}
                  y1={yAt(t)}
                  y2={yAt(t)}
                  stroke="#e2e8f0"
                  strokeDasharray="3 3"
                />
                <text
                  x={padL - 8}
                  y={yAt(t) + 4}
                  textAnchor="end"
                  fontSize={12}
                  fontWeight={400}
                  fill="#1e293b"
                >
                  {t}
                </text>
              </g>
            ))}

            {/* Vạch dọc đánh dấu thứ 7 — vẽ trước các đường để nằm dưới */}
            {points.map((p, i) =>
              p.isSaturday ? (
                <line
                  key={`sat-${p.label}`}
                  x1={xAt(i)}
                  x2={xAt(i)}
                  y1={padT}
                  y2={padT + plotH}
                  stroke={INV_SATURDAY_COLOR}
                  strokeOpacity={0.45}
                  strokeDasharray="4 3"
                />
              ) : null
            )}

            {/* Nhãn trục X — xoay 45° cho mọi chế độ để trục không nhảy kiểu khi đổi tuần */}
            {points.map((p, i) => (
              <text
                key={`x-${p.label}`}
                transform={`translate(${xAt(i)},${padT + plotH + 14}) rotate(-45)`}
                textAnchor="end"
                fontSize={12}
                fontWeight={p.isSaturday ? 700 : 400}
                fill={p.isSaturday ? INV_SATURDAY_COLOR : "#1e293b"}
              >
                {p.label}
              </text>
            ))}

            {/* Đường gióng dọc khi hover vào điểm/ngày */}
            {hoverPointIdx !== null && (
              <line
                x1={xAt(hoverPointIdx)}
                x2={xAt(hoverPointIdx)}
                y1={padT}
                y2={padT + plotH}
                stroke="#64748b"
                strokeWidth={1.5}
                strokeDasharray="4 3"
              />
            )}

            {/* Các đường + điểm */}
            {drawOrder.map(({ w, segments }) => {
              const isFocused = activeId === w.id;
              const dimmed = activeId && !isFocused;
              const color = INV_WORKSHOP_COLORS[w.id] || "#475569";

              return (
                <g
                  key={w.id}
                  opacity={dimmed ? 0.25 : 1}
                  style={{ transition: "opacity .2s" }}
                >
                  {segments.map((seg, si) =>
                    seg.length > 1 ? (
                      <path
                        key={si}
                        d={createSmoothPath(seg)}
                        fill="none"
                        stroke={color}
                        strokeWidth={isFocused ? 3.4 : 2}
                        strokeLinejoin="round"
                        strokeLinecap="round"
                      />
                    ) : null
                  )}
                  {!dimmed &&
                    points.map((p, i) => {
                      const v = p.values[w.id];
                      if (v === null || v === undefined) return null;
                      return (
                        <circle
                          key={`${w.id}-${i}`}
                          cx={xAt(i)}
                          cy={yAt(v)}
                          r={isFocused ? 4.5 : 3}
                          fill="#fff"
                          stroke={color}
                          strokeWidth={2}
                          {...hoverProps(w.id)}
                        >
                          <title>{`${p.label} · ${w.name}: ${v}`}</title>
                        </circle>
                      );
                    })}
                </g>
              );
            })}

            {/* Điểm tròn nổi bật tại cột ngày được hover */}
            {hoverPointIdx !== null &&
              workshops.map((w) => {
                const v = points[hoverPointIdx]?.values[w.id];
                if (v === null || v === undefined) return null;
                const color = INV_WORKSHOP_COLORS[w.id] || "#475569";
                return (
                  <circle
                    key={`hover-pt-${w.id}`}
                    cx={xAt(hoverPointIdx)}
                    cy={yAt(v)}
                    r={5.5}
                    fill={color}
                    stroke="#fff"
                    strokeWidth={2.5}
                  />
                );
              })}

            {/* Lớp bắt chuột: đường trong suốt dày hơn để không phải bấm chính xác vào nét mảnh.
                Vẽ sau cùng nên nằm trên tất cả, và luôn phủ đủ 4 xưởng. */}
            {onSelect &&
              series.map(({ w, segments }) =>
                segments.map((seg, si) =>
                  seg.length > 1 ? (
                    <path
                      key={`hit-${w.id}-${si}`}
                      d={createSmoothPath(seg)}
                      fill="none"
                      stroke="transparent"
                      strokeWidth={14}
                      strokeLinecap="round"
                      pointerEvents="stroke"
                      {...hoverProps(w.id)}
                    />
                  ) : null
                )
              )}
          </svg>

          {/* Tooltip hiển thị thông số chi tiết của các xưởng tại ngày đang hover */}
          {hoverPointIdx !== null && points[hoverPointIdx] && (
            <Box
              sx={{
                position: "absolute",
                top: padT + 2,
                left:
                  xAt(hoverPointIdx) + 14 + 145 > W - padR
                    ? Math.max(padL, xAt(hoverPointIdx) - 150)
                    : xAt(hoverPointIdx) + 14,
                width: 140,
                bgcolor: "#fff",
                color: "#000",
                px: 1.4,
                py: 1.1,
                borderRadius: "10px",
                boxShadow: "0 10px 25px rgba(0,0,0,0.45)",
                border: "1px solid rgba(255,255,255,0.15)",
                pointerEvents: "none",
                zIndex: 10,
                backdropFilter: "blur(4px)",
                transition: "left 0.1s ease-out",
              }}
            >
              <Typography
                variant="subtitle2"
                fontWeight={800}
                sx={{
                  color: "#000",
                  fontSize: "0.82rem",
                  borderBottom: "1px dashed #94a3b8",
                  pb: 0.4,
                  mb: 0.8,
                  textAlign: "center",
                }}
              >
                {points[hoverPointIdx].label}
              </Typography>
              <Stack spacing={0.4}>
                {workshops.map((w) => {
                  const val = points[hoverPointIdx].values[w.id];
                  const color = INV_WORKSHOP_COLORS[w.id] || "#94a3b8";
                  return (
                    <Stack
                      key={w.id}
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <Typography
                        variant="caption"
                        fontWeight={700}
                        sx={{ color: color, fontSize: "0.76rem" }}
                      >
                        {w.name}:
                      </Typography>
                      <Typography
                        variant="caption"
                        fontWeight={800}
                        sx={{ color: "#000", fontSize: "0.78rem" }}
                      >
                        {val ?? "-"}
                      </Typography>
                    </Stack>
                  );
                })}
              </Stack>
            </Box>
          )}
        </Box>
      )}

      {/* Chú giải — bấm để mở chi tiết xưởng đó, hover để soi trước */}
      <Stack
        direction="row"
        spacing={1.5}
        justifyContent="center"
        flexWrap="wrap"
        useFlexGap
        sx={{ mt: 0.5 }}
      >
        {workshops.map((w) => {
          const isFocused = activeId === w.id;
          const dimmed = activeId && !isFocused;
          return (
            <Box
              key={w.id}
              {...hoverProps(w.id)}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.6,
                opacity: dimmed ? 0.45 : 1,
                transition: "opacity .2s",
                "&:hover": { opacity: 0.8 },
              }}
            >
              <Box
                sx={{
                  width: isFocused ? 11 : 9,
                  height: isFocused ? 11 : 9,
                  borderRadius: "50%",
                  bgcolor: INV_WORKSHOP_COLORS[w.id] || "#475569",
                }}
              />
              <Typography
                variant="caption"
                fontWeight={isFocused ? 800 : 600}
                sx={{ color: isFocused ? "#0f172a" : "#64748b" }}
              >
                {w.name}
              </Typography>
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
};

/** Nút chọn tuần dùng trong dialog (nền trắng) — nút trên header card có style riêng cho nền teal */
const InvWeekButtons = ({ value, onChange, isEnabled }) => (
  <Stack direction="row" spacing={0.6} flexWrap="wrap" useFlexGap>
    {[null, ...Array.from({ length: INV_WEEK_COUNT }, (_, i) => i + 1)].map(
      (week) => {
        const isActive = value === week;
        const disabled = week !== null && !isEnabled(week);
        return (
          <Button
            key={week ?? "all"}
            size="small"
            disabled={disabled}
            onClick={() => onChange(week)}
            variant={isActive ? "contained" : "outlined"}
            sx={{
              minWidth: 0,
              px: 1.4,
              py: 0.2,
              borderRadius: "8px",
              textTransform: "none",
              fontSize: "0.72rem",
              fontWeight: 700,
              ...(isActive
                ? { bgcolor: "#00897b", "&:hover": { bgcolor: "#00796b" } }
                : { color: "#475569", borderColor: "rgba(0,0,0,0.15)" }),
            }}
          >
            {week === null ? "Cả tháng" : `Tuần ${week}`}
          </Button>
        );
      }
    )}
  </Stack>
);

/**
 * Dialog chi tiết 1 xưởng, mở khi bấm vào đường của xưởng đó trên biểu đồ.
 * Biểu đồ trong dialog vẫn vẽ cả 4 xưởng nhưng focus vào xưởng đang xem để còn so sánh được;
 * bấm sang đường/tên xưởng khác thì đổi luôn xưởng đang xem.
 * Bảng bên dưới chỉ là số liệu của xưởng đó.
 *
 * Cố ý không dùng hook để render có điều kiện thoải mái; dữ liệu tối đa 31 dòng nên tính trực tiếp.
 */
const InventoryWorkshopDialog = ({
  workshop,
  workshops,
  days,
  chartPoints,
  week,
  onWeekChange,
  onSelect,
  onClose,
  isMobile,
}) => {
  const color = workshop
    ? INV_WORKSHOP_COLORS[workshop.id] || "#475569"
    : "#475569";

  // Chỉ những ngày xưởng này thực sự kiểm kê, và theo đúng tuần đang chọn trên biểu đồ
  const rows = workshop
    ? days.filter(
        (d) => d.byDepartment[workshop.id] && (week === null || d.week === week)
      )
    : [];

  return (
    <Dialog
      open={!!workshop}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{ sx: { borderRadius: isMobile ? 0 : "20px" } }}
    >
      {workshop && (
        <>
          <DialogTitle
            sx={{ background: GRADIENTS.teal.bg, color: "#fff", py: 1.5 }}
          >
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              spacing={1}
            >
              <Stack direction="row" alignItems="center" spacing={1.2}>
                <Box
                  sx={{
                    width: 13,
                    height: 13,
                    borderRadius: "50%",
                    bgcolor: color,
                    boxShadow: "0 0 0 3px rgba(255,255,255,0.35)",
                    flexShrink: 0,
                  }}
                />
                <Box>
                  <Typography
                    variant={isMobile ? "subtitle1" : "h6"}
                    fontWeight={800}
                    lineHeight={1.3}
                  >
                    Kết quả kiểm kê · {workshop.name}
                  </Typography>
                </Box>
              </Stack>
              <IconButton
                onClick={onClose}
                size="small"
                sx={{ color: "#fff", flexShrink: 0 }}
              >
                <Close />
              </IconButton>
            </Stack>
          </DialogTitle>

          <DialogContent dividers sx={{ p: 0 }}>
            <Box sx={{ px: 2.5, pt: 2 }}>
              <InvWeekButtons
                value={week}
                onChange={onWeekChange}
                isEnabled={(w) =>
                  days.some((d) => d.week === w && d.byDepartment[workshop.id])
                }
              />
            </Box>

            <Box sx={{ p: 2.5, pb: 1.5 }}>
              <Grid container spacing={2.5}>
                {INV_TREND_METRICS.map((metric) => (
                  <Grid size={{ xs: 12, md: 6 }} key={metric.key}>
                    <InventoryLineChart
                      title={metric.title}
                      points={chartPoints[metric.key]}
                      workshops={workshops}
                      focusedId={workshop.id}
                      onSelect={onSelect}
                    />
                  </Grid>
                ))}
              </Grid>
            </Box>

            <Divider />

            <Box sx={{ px: 2.5, pt: 2, pb: 1 }}>
              <Typography
                variant="subtitle2"
                fontWeight={700}
                sx={{ color: "#334155" }}
              >
                Bảng chi tiết theo ngày · {workshop.name}
              </Typography>
            </Box>

            <TableContainer
              component={Paper}
              elevation={0}
              sx={{ borderRadius: 0, maxHeight: 380, overflowX: "auto" }}
            >
              <Table size="medium" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell
                      sx={{ ...TABLE_HEAD_CELL, pl: 3, whiteSpace: "nowrap" }}
                    >
                      Ngày kiểm kê
                    </TableCell>
                    <TableCell
                      align="center"
                      sx={{ ...TABLE_HEAD_CELL, color: "#2e7d32" }}
                    >
                      Sổ sách
                    </TableCell>
                    <TableCell
                      align="center"
                      sx={{ ...TABLE_HEAD_CELL, color: "#ed6c02" }}
                    >
                      KĐV
                    </TableCell>
                    <TableCell
                      align="center"
                      sx={{ ...TABLE_HEAD_CELL, color: "#d32f2f" }}
                    >
                      Chưa XĐ
                    </TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {rows.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        align="center"
                        sx={{ py: 4, color: "text.secondary" }}
                      >
                        {workshop.name} không có phiếu kiểm kê trong khoảng đã
                        chọn
                      </TableCell>
                    </TableRow>
                  )}

                  {rows.map((row) => {
                    const c = row.byDepartment[workshop.id];
                    return (
                      <TableRow
                        key={row.dateKey}
                        hover
                        sx={{
                          bgcolor: row.isSaturday
                            ? alpha(INV_SATURDAY_COLOR, 0.07)
                            : "transparent",
                        }}
                      >
                        <TableCell
                          sx={{
                            fontWeight: 600,
                            pl: 3,
                            whiteSpace: "nowrap",
                            color: row.isSaturday
                              ? INV_SATURDAY_COLOR
                              : "inherit",
                            borderLeft: row.isSaturday
                              ? `3px solid ${INV_SATURDAY_COLOR}`
                              : "3px solid transparent",
                          }}
                        >
                          {row.weekdayLabel} {String(row.day).padStart(2, "0")}/
                          {String(row.month).padStart(2, "0")}
                        </TableCell>
                        <TableCell
                          align="center"
                          sx={{ fontWeight: 600, color: "#2e7d32" }}
                        >
                          {formatCount(c.presentBook)}
                        </TableCell>
                        <TableCell
                          align="center"
                          sx={{
                            fontWeight: 600,
                            color: c.misDept > 0 ? "#ed6c02" : "text.disabled",
                          }}
                        >
                          {formatCount(c.misDept)}
                        </TableCell>
                        <TableCell
                          align="center"
                          sx={{
                            fontWeight: 600,
                            color: c.missing > 0 ? "#d32f2f" : "text.disabled",
                          }}
                        >
                          {formatCount(c.missing)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </DialogContent>
        </>
      )}
    </Dialog>
  );
};

const ReportPage = () => {
  const isMobile = useMediaQuery(useTheme().breakpoints.down("sm"));
  const vnToday = new Date();
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
  // Chế độ standalone: mở riêng ở tab mới, chỉ có nội dung dashboard
  const isStandalone = useLocation().pathname === "/reports/machine-overview";
  const [currentYear, setCurrentYear] = useState(vnToday.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(vnToday.getMonth() + 1);
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [reportData, setReportData] = useState({
    inventory: [],
    maintenance: {
      summary: { total: 0, pending: 0, completed: 0, confirmed: 0 },
      departments: [],
    },
    air_consumption: {
      summary: {
        total_machines: 0,
        total_volume: 0,
        avg_volume: 0,
        max_volume: 0,
        min_volume: 0,
      },
      by_type: [],
      by_department: [],
      by_location: [],
      by_department_type: [],
    },
    machine_overview: {
      summary: {
        total: 0,
        active_total: 0,
        by_status: {},
        by_source: {},
        maintenance: {},
      },
      matrix: {},
      breakdown: [],
      departments: [],
    },
  });

  // ===== Kiểm kê theo ngày (dùng chung dữ liệu /api/reports/monthly-summary) =====
  /** null = gộp cả tháng theo tuần; 1-4 = giãn ra từng ngày của tuần đó */
  const [invWeek, setInvWeek] = useState(null);
  /** Xưởng đang mở dialog chi tiết (bấm vào đường trên biểu đồ); null = không mở */
  const [invFocus, setInvFocus] = useState(null);

  /** Dòng theo ngày (mới nhất trước) cho bảng */
  const invDays = useMemo(
    () => buildInventoryDays(reportData.inventory),
    [reportData.inventory]
  );

  /** 4 xưởng thực có trong dữ liệu, giữ thứ tự id */
  const invWorkshops = useMemo(
    () => buildInventoryWorkshops(reportData.inventory),
    [reportData.inventory]
  );

  /**
   * Điểm vẽ biểu đồ cho từng chỉ tiêu.
   * `invWeek === null` → gộp cả tháng thành 4 điểm Tuần 1-4 (cộng dồn số máy lệch).
   * Chọn 1 tuần → giãn ra từng ngày của tuần đó.
   * Trục thời gian luôn tăng dần, ngược với bảng (bảng đọc mới→cũ).
   */
  const invChartPoints = useMemo(() => {
    const ascending = [...invDays].sort((a, b) =>
      a.dateKey.localeCompare(b.dateKey)
    );

    const pointFrom = (label, isSaturday, rows, metricKey) => {
      const values = {};
      invWorkshops.forEach((w) => {
        const counts = rows.map((r) => r.byDepartment[w.id]).filter(Boolean);
        // Không có ngày nào kiểm → null để đường ngắt, khác với "kiểm và bằng 0"
        values[w.id] = counts.length
          ? counts.reduce((sum, c) => sum + c[metricKey], 0)
          : null;
      });
      return { label, isSaturday, values };
    };

    const result = {};
    INV_TREND_METRICS.forEach((metric) => {
      result[metric.key] =
        invWeek === null
          ? Array.from({ length: INV_WEEK_COUNT }, (_, i) => i + 1).map((w) =>
              pointFrom(
                `Tuần ${w}`,
                false,
                ascending.filter((r) => r.week === w),
                metric.key
              )
            )
          : ascending
              .filter((r) => r.week === invWeek)
              .map((r) =>
                pointFrom(
                  `${String(r.day).padStart(2, "0")}/${String(r.month).padStart(2, "0")}`,
                  r.isSaturday,
                  [r],
                  metric.key
                )
              );
    });
    return result;
  }, [invDays, invWorkshops, invWeek]);

  const fetchReportData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.reports.getMonthlySummary(
        currentYear,
        currentMonth
      );
      if (res?.success) {
        setReportData(res.data);
      } else {
        setError(res?.message || "Lỗi tải dữ liệu báo cáo");
      }
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || "Không thể kết nối đến server");
    } finally {
      setLoading(false);
    }
  }, [currentYear, currentMonth]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleExportExcel = async () => {
    try {
      if (!reportData.inventory || reportData.inventory.length === 0) {
        setError("Không có dữ liệu kiểm kê để xuất");
        return;
      }

      const workbook = new ExcelJS.Workbook();

      reportData.inventory.forEach((ticket) => {
        // Parse date for sheet name: KK_D_M_YYYY
        const ticketDate = new Date(ticket.check_date);
        const day = ticketDate.getDate();
        const month = ticketDate.getMonth() + 1;
        const year = ticketDate.getFullYear();
        const sheetName = `KK_${day}_${month}_${year}`;

        // Ensure unique sheet name in workbook
        let uniqueSheetName = sheetName;
        let counter = 1;
        while (workbook.getWorksheet(uniqueSheetName)) {
          uniqueSheetName = `${sheetName}_${counter}`;
          counter++;
        }

        const sheet = workbook.addWorksheet(uniqueSheetName, {
          views: [{ showGridLines: true }],
        });

        // Set column widths
        sheet.columns = [
          { key: "department", width: 30 },
          { key: "locations", width: 20 },
          { key: "system", width: 25 },
          { key: "scanned", width: 25 },
          { key: "misDept", width: 25 },
          { key: "missing", width: 25 },
        ];

        // 1. Add Title Rows
        sheet.addRow([]); // empty row 1

        const titleRow = sheet.addRow(["BÁO CÁO THỐNG KÊ CHI TIẾT KIỂM KÊ"]);
        titleRow.height = 30;
        sheet.mergeCells(`A2:F2`);
        titleRow.getCell(1).font = {
          name: "Segoe UI",
          size: 16,
          bold: true,
          color: { argb: "FF1E293B" },
        };
        titleRow.getCell(1).alignment = {
          horizontal: "center",
          vertical: "middle",
        };

        const checkDateStr = ticketDate.toLocaleDateString("vi-VN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
        const subtitleRow = sheet.addRow([`Ngày kiểm kê: ${checkDateStr}`]);
        subtitleRow.height = 20;
        sheet.mergeCells(`A3:F3`);
        subtitleRow.getCell(1).font = {
          name: "Segoe UI",
          size: 11,
          italic: true,
          color: { argb: "FF1E293B" },
        };
        subtitleRow.getCell(1).alignment = {
          horizontal: "center",
          vertical: "middle",
        };

        if (ticket.note) {
          const noteRow = sheet.addRow([`Ghi chú: ${ticket.note}`]);
          noteRow.height = 20;
          sheet.mergeCells(`A4:F4`);
          noteRow.getCell(1).font = {
            name: "Segoe UI",
            size: 11,
            italic: true,
            color: { argb: "FF1E293B" },
          };
          noteRow.getCell(1).alignment = {
            horizontal: "center",
            vertical: "middle",
          };
        } else {
          sheet.addRow([]); // empty row 4
        }

        sheet.addRow([]); // empty row 5

        // 2. Add Table Headers
        const headerRow = sheet.addRow([
          "Đơn vị",
          "Vị trí đã kiểm",
          "Sổ sách (Trước kiểm kê)",
          "Số máy hiện diện",
          "Số máy khác đơn vị",
          "Số máy chưa xác định",
        ]);
        headerRow.height = 30;

        headerRow.eachCell((cell, colNumber) => {
          let cellColor = "FF1E293B";
          if (colNumber === 3) cellColor = "ff1565c0";
          else if (colNumber === 4) cellColor = "ff2e7d32";
          else if (colNumber === 5) cellColor = "ffed6c02";
          else if (colNumber === 6) cellColor = "ffd32f2f";

          cell.font = {
            name: "Segoe UI",
            size: 11,
            bold: true,
            color: { argb: cellColor },
          };
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF1F5F9" },
          };
          cell.alignment = {
            horizontal: "center",
            vertical: "middle",
            wrapText: true,
          };
          cell.border = {
            top: { style: "thin", color: { argb: "FFCBD5E1" } },
            left: { style: "thin", color: { argb: "FFCBD5E1" } },
            bottom: { style: "medium", color: { argb: "FF475569" } },
            right: { style: "thin", color: { argb: "FFCBD5E1" } },
          };
        });

        // 3. Add Data Rows
        let totalSystem = 0;
        let totalScanned = 0;
        let totalMisDept = 0;
        let totalMissing = 0;
        let totalLocsChecked = 0;
        let totalLocsSnapshot = 0;

        ticket.departments.forEach((dept, index) => {
          totalSystem += dept.system_count;
          totalScanned += dept.scanned_count;
          totalMisDept += dept.mis_dept_count;
          totalMissing += dept.missing_count;
          totalLocsChecked += dept.checked_locations;
          totalLocsSnapshot += dept.total_locations;

          const dataRow = sheet.addRow([
            dept.name_department,
            `${dept.checked_locations}/${dept.total_locations}`,
            dept.system_count,
            dept.scanned_count,
            dept.mis_dept_count,
            dept.missing_count,
          ]);
          dataRow.height = 24;

          // Striped rows (alternating colors)
          const bgColor = index % 2 === 0 ? "FFFFFFFF" : "FFF8FAFC";

          dataRow.eachCell((cell, colNumber) => {
            let cellColor = "FF000000";
            if (colNumber === 3) cellColor = "ff1565c0";
            else if (colNumber === 4) cellColor = "ff2e7d32";
            else if (colNumber === 5) cellColor = "ffed6c02";
            else if (colNumber === 6) cellColor = "ffd32f2f";

            cell.font = {
              name: "Segoe UI",
              size: 11,
              color: { argb: cellColor },
            };
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: bgColor },
            };
            cell.border = {
              top: { style: "thin", color: { argb: "FFE2E8F0" } },
              left: { style: "thin", color: { argb: "FFE2E8F0" } },
              bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
              right: { style: "thin", color: { argb: "FFE2E8F0" } },
            };

            if (colNumber === 1) {
              cell.alignment = {
                horizontal: "left",
                vertical: "middle",
                indent: 1,
              };
            } else {
              cell.alignment = { horizontal: "center", vertical: "middle" };
            }

            // Number formatting for numeric columns
            if (colNumber >= 3) {
              cell.numFmt = "#,##0";
            }
          });
        });

        // 4. Add Total Row
        const totalRow = sheet.addRow([
          "TỔNG CỘNG",
          `${totalLocsChecked}/${totalLocsSnapshot}`,
          totalSystem,
          totalScanned,
          totalMisDept,
          totalMissing,
        ]);
        totalRow.height = 26;

        totalRow.eachCell((cell, colNumber) => {
          let cellColor = "FF1E293B";
          if (colNumber === 3) cellColor = "ff1565c0";
          else if (colNumber === 4) cellColor = "ff2e7d32";
          else if (colNumber === 5) cellColor = "ffed6c02";
          else if (colNumber === 6) cellColor = "ffd32f2f";

          cell.font = {
            name: "Segoe UI",
            size: 11,
            bold: true,
            color: { argb: cellColor },
          };
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF1F5F9" }, // Slate 100
          };
          cell.border = {
            top: { style: "medium", color: { argb: "FF94A3B8" } },
            left: { style: "thin", color: { argb: "FFE2E8F0" } },
            bottom: { style: "double", color: { argb: "FF94A3B8" } },
            right: { style: "thin", color: { argb: "FFE2E8F0" } },
          };

          if (colNumber === 1) {
            cell.alignment = {
              horizontal: "left",
              vertical: "middle",
              indent: 1,
            };
          } else {
            cell.alignment = { horizontal: "center", vertical: "middle" };
          }

          if (colNumber >= 3) {
            cell.numFmt = "#,##0";
          }
        });
      });

      // Write to buffer and download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      // Pad single digit months
      const formattedMonth = String(currentMonth).padStart(2, "0");
      link.download = `Bao_cao_kiem_ke_thang_${formattedMonth}_${currentYear}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export Excel error:", err);
      setError("Có lỗi xảy ra khi xuất file Excel");
    }
  };

  // Aggregated maintenance progress metrics
  const maintTotal = reportData.maintenance?.summary?.total || 0;
  const maintPending = reportData.maintenance?.summary?.pending || 0;
  const maintCompleted = reportData.maintenance?.summary?.completed || 0;
  const maintConfirmed = reportData.maintenance?.summary?.confirmed || 0;
  const maintDoneTotal = maintCompleted + maintConfirmed;
  const maintTotalToday = reportData.maintenance?.summary?.totalToday || 0;
  const maintDoneToday = reportData.maintenance?.summary?.doneToday || 0;

  const pctDone =
    maintTotal > 0 ? Math.round((maintDoneTotal / maintTotal) * 100) : 0;
  const pctDoneToday =
    maintTotalToday > 0
      ? Math.round((maintDoneToday / maintTotalToday) * 100)
      : 0;
  // API chỉ đếm totalToday/doneToday khi đang xem tháng hiện tại;
  // xem tháng cũ thì không có "hôm nay" nên bỏ nhãn ngày.
  const maintTodayLabel =
    currentYear === vnToday.getFullYear() &&
    currentMonth === vnToday.getMonth() + 1
      ? `${String(vnToday.getDate()).padStart(2, "0")}/${String(currentMonth).padStart(2, "0")}`
      : null;

  // Tổng quan máy móc — tính từ ma trận trạng thái x nguồn máy
  const machineOverview = reportData.machine_overview || {};
  const moMatrix = buildMatrixData(machineOverview.matrix || {});
  const moRowTotal = (key) => matrixRowTotal(moMatrix[key]);
  // Tổng số máy đang quản lý: không tính máy thanh lý và máy đã trả
  const moDisplayTotal = MATRIX_ROWS.reduce(
    (sum, row) => sum + moRowTotal(row.key),
    0
  );

  return (
    <>
      {!isStandalone && <NavigationBar />}
      {/* Standalone chạy full width, xem trong trang giữ khung xl như cũ */}
      <Container
        maxWidth={isStandalone ? false : "xl"}
        sx={{
          py: isStandalone ? 2.5 : 4,
          ...(isStandalone && { px: { xs: 2, sm: 2.5, md: 3 } }),
        }}
      >
        {/* Header rút gọn cho chế độ standalone */}
        {isStandalone && (
          <Paper
            elevation={0}
            sx={{
              mb: 2.5,
              px: 3,
              py: 1.8,
              borderRadius: "18px",
              background: "linear-gradient(90deg, #0f172a 0%, #1e293b 100%)",
              color: "#fff",
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              alignItems: { xs: "flex-start", sm: "center" },
              justifyContent: "space-between",
              gap: 1.5,
            }}
          >
            <Stack direction="row" spacing={1.8} alignItems="center">
              <Avatar
                sx={{
                  bgcolor: "rgba(56,189,248,0.2)",
                  color: "#38bdf8",
                  width: 44,
                  height: 44,
                }}
              >
                <Dashboard />
              </Avatar>
              <Box>
                <Typography
                  variant="h6"
                  fontWeight={700}
                  sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}
                >
                  Dashboard tổng quan TPM
                </Typography>
              </Box>
            </Stack>

            <Stack direction="row" spacing={1} alignItems="center">
              <Paper
                elevation={0}
                sx={{
                  p: 0.5,
                  display: "flex",
                  alignItems: "center",
                  borderRadius: "12px",
                  border: "1px solid rgba(0,0,0,0.08)",
                  bgcolor: "#fff",
                }}
              >
                <IconButton
                  onClick={handlePrevMonth}
                  size="small"
                  sx={{ color: "#764ba2" }}
                >
                  <ChevronLeft fontSize="large" />
                </IconButton>
                <Box sx={{ px: 1.5, textAlign: "center", minWidth: 108 }}>
                  <Typography variant="body2" fontWeight={700}>
                    {MONTH_NAMES[currentMonth - 1]}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Năm {currentYear}
                  </Typography>
                </Box>
                <IconButton
                  onClick={handleNextMonth}
                  size="small"
                  sx={{ color: "#764ba2" }}
                >
                  <ChevronRight fontSize="large" />
                </IconButton>
                <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
                <IconButton
                  onClick={fetchReportData}
                  sx={{ color: "#667eea", bgcolor: "rgba(255,255,255,0.08)" }}
                >
                  <Refresh />
                </IconButton>
                <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
                <IconButton
                  onClick={() =>
                    document.fullscreenElement
                      ? document.exitFullscreen()
                      : document.documentElement.requestFullscreen()
                  }
                  sx={{ color: "#667eea", bgcolor: "rgba(255,255,255,0.08)" }}
                >
                  <Fullscreen />
                </IconButton>
              </Paper>
            </Stack>
          </Paper>
        )}

        {/* Page Header */}
        {!isStandalone && (
          <Box sx={{ mb: 4 }}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              justifyContent="space-between"
              alignItems={{ xs: "flex-start", sm: "center" }}
              spacing={2}
            >
              <Stack
                direction="row"
                alignItems="center"
                spacing={2}
                sx={{ mb: 2 }}
              >
                <Avatar
                  sx={{
                    width: 60,
                    height: 60,
                    background: "linear-gradient(45deg, #667eea, #764ba2)",
                  }}
                >
                  <Assessment sx={{ fontSize: 30 }} />
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
                    BÁO CÁO TỔNG HỢP
                  </Typography>
                  <Typography
                    variant={isMobile ? "body1" : "h6"}
                    color="text.secondary"
                  >
                    Thống kê kết quả kiểm kê và tiến độ bảo dưỡng hàng tháng
                  </Typography>
                </Box>
              </Stack>

              {/* Month selector widget */}
              <Paper
                elevation={0}
                sx={{
                  p: 0.5,
                  display: "flex",
                  alignItems: "center",
                  borderRadius: "12px",
                  border: "1px solid rgba(0,0,0,0.08)",
                  bgcolor: "#fff",
                }}
              >
                <IconButton
                  onClick={handlePrevMonth}
                  size="small"
                  sx={{ color: "#764ba2" }}
                >
                  <ChevronLeft />
                </IconButton>
                <Box sx={{ px: 2, textAlign: "center", minWidth: 120 }}>
                  <Typography variant="subtitle2" fontWeight={700}>
                    {MONTH_NAMES[currentMonth - 1]}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Năm {currentYear}
                  </Typography>
                </Box>
                <IconButton
                  onClick={handleNextMonth}
                  size="small"
                  sx={{ color: "#764ba2" }}
                >
                  <ChevronRight />
                </IconButton>
                <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
                <IconButton
                  onClick={fetchReportData}
                  size="small"
                  sx={{ color: "#667eea" }}
                >
                  <Refresh />
                </IconButton>
              </Paper>
            </Stack>
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: "12px" }}>
            {error}
          </Alert>
        )}

        {/* Tab Selection */}
        {isStandalone ? null : isMobile ? (
          <Grid container spacing={1} sx={{ mb: 3 }}>
            {[
              {
                label: "Dashboard tổng quan",
                icon: <Dashboard sx={{ fontSize: 20 }} />,
                value: 0,
              },
              {
                label: "Thống kê kiểm kê",
                icon: <Receipt sx={{ fontSize: 20 }} />,
                value: 1,
              },
              {
                label: "Thống kê bảo dưỡng",
                icon: <CalendarMonth sx={{ fontSize: 20 }} />,
                value: 2,
              },
              {
                label: "Thống kê lưu lượng khí nén",
                icon: <Air sx={{ fontSize: 20 }} />,
                value: 3,
              },
            ].map((tab) => {
              const isActive = activeTab === tab.value;
              return (
                <Grid size={{ xs: 12 }} key={tab.value}>
                  <Button
                    fullWidth
                    variant={isActive ? "contained" : "outlined"}
                    onClick={() => setActiveTab(tab.value)}
                    startIcon={tab.icon}
                    sx={{
                      justifyContent: "flex-start",
                      py: 1.2,
                      px: 2,
                      borderRadius: "12px",
                      fontWeight: isActive ? 700 : 600,
                      textTransform: "none",
                      fontSize: "0.95rem",
                      background: isActive
                        ? "linear-gradient(45deg, #667eea, #764ba2)"
                        : "#fff",
                      color: isActive ? "#fff" : "#475569",
                      borderColor: isActive
                        ? "transparent"
                        : "rgba(0,0,0,0.12)",
                      boxShadow: isActive
                        ? "0 4px 14px rgba(102,126,234,0.35)"
                        : "none",
                      "&:hover": {
                        background: isActive
                          ? "linear-gradient(45deg, #5a67d8, #6b46c1)"
                          : "#f8fafc",
                      },
                    }}
                  >
                    {tab.label}
                  </Button>
                </Grid>
              );
            })}
          </Grid>
        ) : (
          <Tabs
            value={activeTab}
            onChange={(_, val) => setActiveTab(val)}
            textColor="primary"
            indicatorColor="primary"
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            sx={{
              mb: 3,
              "& .MuiTab-root": {
                fontWeight: 600,
                fontSize: "1rem",
                textTransform: "none",
              },
            }}
          >
            <Tab
              icon={<Dashboard sx={{ mr: 1 }} />}
              iconPosition="start"
              label="Dashboard tổng quan"
            />
            <Tab
              icon={<Receipt sx={{ mr: 1 }} />}
              iconPosition="start"
              label="Thống kê kiểm kê"
            />
            <Tab
              icon={<CalendarMonth sx={{ mr: 1 }} />}
              iconPosition="start"
              label="Thống kê bảo dưỡng"
            />
            <Tab
              icon={<Air sx={{ mr: 1 }} />}
              iconPosition="start"
              label="Thống kê lưu lượng khí nén"
            />
          </Tabs>
        )}

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress size={48} sx={{ color: "#667eea" }} />
          </Box>
        ) : (
          <Box>
            {/* TAB 1: INVENTORY REPORT */}
            {activeTab === 1 && (
              <Box>
                {reportData.inventory.length === 0 ? (
                  <Paper
                    elevation={0}
                    sx={{
                      p: 6,
                      textAlign: "center",
                      borderRadius: "16px",
                      border: "1px dashed rgba(0,0,0,0.12)",
                    }}
                  >
                    <Receipt
                      sx={{ fontSize: 48, color: "text.disabled", mb: 1.5 }}
                    />
                    <Typography variant="body1" color="text.secondary">
                      Không có phiếu kiểm kê nào được tạo trong{" "}
                      {MONTH_NAMES[currentMonth - 1]} / {currentYear}
                    </Typography>
                  </Paper>
                ) : (
                  <Stack spacing={2.5}>
                    <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                      <Button
                        variant="contained"
                        startIcon={<FileDownload />}
                        onClick={handleExportExcel}
                        sx={{
                          background:
                            "linear-gradient(45deg, #2e7d32, #4caf50)",
                          boxShadow: "0 4px 12px rgba(46,125,50,0.2)",
                          borderRadius: "10px",
                          textTransform: "none",
                          fontWeight: 600,
                          px: 3,
                          py: 1,
                          "&:hover": {
                            background:
                              "linear-gradient(45deg, #1b5e20, #388e3c)",
                          },
                        }}
                      >
                        Xuất Excel báo cáo tháng
                      </Button>
                    </Box>
                    {reportData.inventory.map((ticket) => {
                      // Total sum statistics for this ticket
                      let totalSystem = 0;
                      let totalScanned = 0;
                      let totalMisDept = 0;
                      let totalMissing = 0;
                      let totalLocsChecked = 0;
                      let totalLocsSnapshot = 0;

                      ticket.departments.forEach((dept) => {
                        totalSystem += dept.system_count;
                        totalScanned += dept.scanned_count;
                        totalMisDept += dept.mis_dept_count;
                        totalMissing += dept.missing_count;
                        totalLocsChecked += dept.checked_locations;
                        totalLocsSnapshot += dept.total_locations;
                      });

                      const checkDateStr = new Date(
                        ticket.check_date
                      ).toLocaleDateString("vi-VN", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      });

                      return (
                        <Accordion
                          key={ticket.uuid_inventory_check}
                          elevation={0}
                          sx={{
                            borderRadius: "16px !important",
                            border: "1px solid rgba(0,0,0,0.08)",
                            overflow: "hidden",
                            "&:before": { display: "none" },
                            boxShadow: "0 4px 12px rgba(0,0,0,0.03)",
                          }}
                        >
                          <AccordionSummary
                            expandIcon={<ExpandMore />}
                            sx={{
                              bgcolor: "#fcfdff",
                              borderBottom: "1px solid rgba(0,0,0,0.04)",
                              px: 3,
                              py: 1,
                            }}
                          >
                            <Grid
                              container
                              spacing={2}
                              alignItems="center"
                              sx={{ width: "100%" }}
                            >
                              <Grid size={{ xs: 12, sm: 4.5, md: 4.5 }}>
                                <Stack
                                  direction="row"
                                  spacing={1.5}
                                  alignItems="center"
                                >
                                  <Avatar
                                    sx={{
                                      bgcolor: "#e3f2fd",
                                      color: "#1565c0",
                                      width: 40,
                                      height: 40,
                                    }}
                                  >
                                    <Receipt fontSize="small" />
                                  </Avatar>
                                  <Box>
                                    <Typography
                                      variant="subtitle1"
                                      fontWeight={700}
                                    >
                                      Kiểm kê ngày {checkDateStr}
                                    </Typography>
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                    >
                                      {ticket.note}
                                    </Typography>
                                  </Box>
                                </Stack>
                              </Grid>
                              <Grid
                                size={{ xs: 4, sm: 1.5, md: 1 }}
                                textAlign="center"
                              >
                                <Chip
                                  label={getStatusLabel(ticket.status)}
                                  color={getStatusColor(ticket.status)}
                                  size="small"
                                  sx={{ fontWeight: 600 }}
                                />
                              </Grid>
                              <Grid size={{ xs: 8, sm: 6, md: 6.5 }}>
                                <Stack
                                  direction="row"
                                  spacing={2}
                                  justifyContent={{
                                    xs: "flex-start",
                                    sm: "flex-end",
                                  }}
                                  useFlexGap
                                  flexWrap="wrap"
                                >
                                  <Chip
                                    label={`Vị trí: ${new Intl.NumberFormat("en-US").format(totalLocsChecked)}/${new Intl.NumberFormat("en-US").format(totalLocsSnapshot)}`}
                                    variant="outlined"
                                    size="small"
                                    sx={{
                                      fontWeight: 600,
                                      borderColor: "#e0e0e0",
                                    }}
                                  />
                                  <Chip
                                    label={`Sổ sách: ${new Intl.NumberFormat("en-US").format(totalSystem)}`}
                                    size="small"
                                    sx={{
                                      bgcolor: "#e3f2fd",
                                      color: "#1565c0",
                                      fontWeight: 600,
                                    }}
                                  />
                                  <Chip
                                    label={
                                      <span>
                                        Hiện diện:{" "}
                                        {new Intl.NumberFormat("en-US").format(
                                          totalScanned
                                        )}
                                        {totalMisDept > 0 && (
                                          <>
                                            {" "}
                                            (
                                            <span style={{ color: "#ed6c02" }}>
                                              Khác đơn vị:{" "}
                                              {new Intl.NumberFormat(
                                                "en-US"
                                              ).format(totalMisDept)}
                                            </span>
                                            )
                                          </>
                                        )}
                                      </span>
                                    }
                                    size="small"
                                    sx={{
                                      bgcolor: "#e8f5e9",
                                      color: "#2e7d32",
                                      fontWeight: 600,
                                    }}
                                  />
                                  <Chip
                                    label={`Chưa xác định: ${new Intl.NumberFormat("en-US").format(totalMissing)}`}
                                    size="small"
                                    sx={{
                                      bgcolor: "#ffebee",
                                      color: "#d32f2f",
                                      fontWeight: 600,
                                    }}
                                  />
                                </Stack>
                              </Grid>
                            </Grid>
                          </AccordionSummary>

                          <AccordionDetails sx={{ p: 0 }}>
                            <TableContainer
                              component={Paper}
                              elevation={0}
                              sx={{ borderRadius: 0, overflowX: "auto" }}
                            >
                              <Table size="medium">
                                <TableHead>
                                  <TableRow sx={{ bgcolor: "#f5f6f8" }}>
                                    <TableCell sx={{ fontWeight: 700, pl: 3 }}>
                                      Đơn vị
                                    </TableCell>
                                    <TableCell
                                      sx={{ fontWeight: 700 }}
                                      align="center"
                                    >
                                      Vị trí đã kiểm
                                    </TableCell>
                                    <TableCell
                                      sx={{ fontWeight: 700, color: "#1565c0" }}
                                      align="center"
                                    >
                                      Sổ sách (Trước kiểm kê)
                                    </TableCell>
                                    <TableCell
                                      sx={{ fontWeight: 700, color: "#2e7d32" }}
                                      align="center"
                                    >
                                      Số máy hiện diện (
                                      <span style={{ color: "#ed6c02" }}>
                                        KĐV
                                      </span>
                                      )
                                    </TableCell>
                                    <TableCell
                                      sx={{ fontWeight: 700, color: "#d32f2f" }}
                                      align="center"
                                    >
                                      Số máy chưa xác định
                                    </TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {ticket.departments.map((dept) => (
                                    <TableRow key={dept.id_department} hover>
                                      <TableCell
                                        sx={{ fontWeight: 600, pl: 3 }}
                                      >
                                        {dept.name_department}
                                      </TableCell>
                                      <TableCell align="center">
                                        <Typography
                                          variant="body2"
                                          fontWeight={600}
                                        >
                                          {new Intl.NumberFormat(
                                            "en-US"
                                          ).format(dept.checked_locations)}
                                          /
                                          {new Intl.NumberFormat(
                                            "en-US"
                                          ).format(dept.total_locations)}
                                        </Typography>
                                      </TableCell>
                                      <TableCell
                                        align="center"
                                        sx={{
                                          color: "#1565c0",
                                          fontWeight: 600,
                                        }}
                                      >
                                        {new Intl.NumberFormat("en-US").format(
                                          dept.system_count
                                        )}
                                      </TableCell>
                                      <TableCell align="center">
                                        <Typography
                                          variant="body2"
                                          fontWeight={600}
                                          sx={{ color: "#2e7d32" }}
                                        >
                                          {new Intl.NumberFormat(
                                            "en-US"
                                          ).format(dept.scanned_count)}
                                          {dept.mis_dept_count > 0 && (
                                            <>
                                              {" "}
                                              (
                                              <span
                                                style={{ color: "#ed6c02" }}
                                              >
                                                KĐV:{" "}
                                                {new Intl.NumberFormat(
                                                  "en-US"
                                                ).format(dept.mis_dept_count)}
                                              </span>
                                              )
                                            </>
                                          )}
                                        </Typography>
                                      </TableCell>
                                      <TableCell
                                        align="center"
                                        sx={{
                                          color: "#d32f2f",
                                          fontWeight: 600,
                                        }}
                                      >
                                        {new Intl.NumberFormat("en-US").format(
                                          dept.missing_count
                                        )}
                                      </TableCell>
                                    </TableRow>
                                  ))}

                                  {/* Hàng tổng cộng */}
                                  <TableRow sx={{ bgcolor: "#f5f6f8" }}>
                                    <TableCell
                                      sx={{ fontWeight: "bold", pl: 3 }}
                                    >
                                      TỔNG CỘNG
                                    </TableCell>
                                    <TableCell align="center">
                                      <Typography
                                        variant="body2"
                                        fontWeight="bold"
                                      >
                                        {new Intl.NumberFormat("en-US").format(
                                          totalLocsChecked
                                        )}
                                        /
                                        {new Intl.NumberFormat("en-US").format(
                                          totalLocsSnapshot
                                        )}
                                      </Typography>
                                    </TableCell>
                                    <TableCell
                                      align="center"
                                      sx={{
                                        color: "#1565c0",
                                        fontWeight: "bold",
                                      }}
                                    >
                                      {new Intl.NumberFormat("en-US").format(
                                        totalSystem
                                      )}
                                    </TableCell>
                                    <TableCell align="center">
                                      <Typography
                                        variant="body2"
                                        fontWeight="bold"
                                        sx={{ color: "#2e7d32" }}
                                      >
                                        {new Intl.NumberFormat("en-US").format(
                                          totalScanned
                                        )}
                                        {totalMisDept > 0 && (
                                          <>
                                            {" "}
                                            (
                                            <span style={{ color: "#ed6c02" }}>
                                              KĐV:{" "}
                                              {new Intl.NumberFormat(
                                                "en-US"
                                              ).format(totalMisDept)}
                                            </span>
                                            )
                                          </>
                                        )}
                                      </Typography>
                                    </TableCell>
                                    <TableCell
                                      align="center"
                                      sx={{
                                        color: "#d32f2f",
                                        fontWeight: "bold",
                                      }}
                                    >
                                      {new Intl.NumberFormat("en-US").format(
                                        totalMissing
                                      )}
                                    </TableCell>
                                  </TableRow>
                                </TableBody>
                              </Table>
                            </TableContainer>
                          </AccordionDetails>
                        </Accordion>
                      );
                    })}
                  </Stack>
                )}
              </Box>
            )}

            {/* TAB 2: MAINTENANCE REPORT */}
            {activeTab === 2 && (
              <Box>
                {maintTotal === 0 ? (
                  <Paper
                    elevation={0}
                    sx={{
                      p: 6,
                      textAlign: "center",
                      borderRadius: "16px",
                      border: "1px dashed rgba(0,0,0,0.12)",
                    }}
                  >
                    <CalendarMonth
                      sx={{ fontSize: 48, color: "text.disabled", mb: 1.5 }}
                    />
                    <Typography variant="body1" color="text.secondary">
                      Không có lịch bảo dưỡng nào trong{" "}
                      {MONTH_NAMES[currentMonth - 1]} / {currentYear}
                    </Typography>
                  </Paper>
                ) : (
                  <Stack spacing={3} sx={{ width: "100%" }}>
                    <Card
                      elevation={0}
                      sx={{
                        borderRadius: "16px",
                        border: "1px solid rgba(0,0,0,0.08)",
                        width: "100%",
                      }}
                    >
                      <CardContent sx={{ p: 3 }}>
                        <Typography
                          variant="subtitle1"
                          fontWeight={700}
                          sx={{ mb: 3 }}
                        >
                          Tổng quan bảo dưỡng
                        </Typography>
                        <Grid container spacing={2.5}>
                          {/* Hàng 1: Tổng số máy */}
                          <Grid size={{ xs: 12 }}>
                            <Box
                              sx={{
                                p: 2.5,
                                borderRadius: "12px",
                                bgcolor: "rgba(102,126,234,0.08)",
                                textAlign: "center",
                                boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
                                maxWidth: "100%",
                                mx: "auto",
                              }}
                            >
                              <Typography
                                variant="h4"
                                fontWeight={800}
                                sx={{ color: "#667eea", mb: 0.5 }}
                              >
                                {new Intl.NumberFormat("en-US").format(
                                  maintTotal
                                )}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                fontWeight={700}
                                sx={{ fontSize: "0.8rem" }}
                              >
                                Tổng số máy
                              </Typography>
                            </Box>
                          </Grid>

                          {/* Hàng 2: Chưa thực hiện, Đã thực hiện, Đã thực hiện hôm nay */}
                          {[
                            {
                              label: "Chưa thực hiện",
                              value: maintPending,
                              bg: MAINT_STATUS_CONFIG.pending.bg,
                              color: MAINT_STATUS_CONFIG.pending.color,
                            },
                            {
                              label: "Đã thực hiện",
                              value: maintDoneTotal,
                              bg: MAINT_STATUS_CONFIG.completed.bg,
                              color: MAINT_STATUS_CONFIG.completed.color,
                            },
                            {
                              label: "Đã thực hiện hôm nay",
                              value: maintDoneToday,
                              bg: "rgba(237, 108, 2, 0.08)",
                              color: "#ed6c02",
                              total: maintTotalToday,
                            },
                          ].map((card, idx) => (
                            <Grid size={{ xs: 12, sm: 4 }} key={idx}>
                              <Box
                                sx={{
                                  p: 2.5,
                                  borderRadius: "12px",
                                  bgcolor: card.bg,
                                  textAlign: "center",
                                  boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
                                  height: "100%",
                                }}
                              >
                                <Typography
                                  variant="h4"
                                  fontWeight={800}
                                  sx={{ color: card.color, mb: 0.5 }}
                                >
                                  {new Intl.NumberFormat("en-US").format(
                                    card.value
                                  )}
                                  {card.total !== undefined &&
                                    card.total > 0 && (
                                      <span
                                        style={{
                                          fontSize: "1.2rem",
                                          color: "#666",
                                          fontWeight: "normal",
                                        }}
                                      >
                                        {" "}
                                        /{" "}
                                        {new Intl.NumberFormat("en-US").format(
                                          card.total
                                        )}
                                      </span>
                                    )}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  fontWeight={700}
                                  sx={{ fontSize: "0.8rem" }}
                                >
                                  {card.label}
                                </Typography>
                              </Box>
                            </Grid>
                          ))}
                        </Grid>

                        <Divider sx={{ my: 3 }} />

                        {/* Progress bars side-by-side */}
                        <Grid container spacing={4}>
                          <Grid size={{ xs: 12, md: 6 }}>
                            <Stack spacing={1} sx={{ width: "100%" }}>
                              <Stack
                                direction="row"
                                justifyContent="space-between"
                                alignItems="center"
                                sx={{ width: "100%" }}
                              >
                                <Typography
                                  variant="caption"
                                  fontWeight={600}
                                  color="text.secondary"
                                >
                                  Tiến độ thực hiện tổng
                                </Typography>
                                <Typography
                                  variant="caption"
                                  fontWeight={700}
                                  sx={{ color: "#1565c0" }}
                                >
                                  {pctDone}% (
                                  {new Intl.NumberFormat("en-US").format(
                                    maintDoneTotal
                                  )}
                                  /
                                  {new Intl.NumberFormat("en-US").format(
                                    maintTotal
                                  )}
                                  )
                                </Typography>
                              </Stack>
                              <Box
                                sx={{
                                  width: "100%",
                                  height: 10,
                                  bgcolor: "#eee",
                                  borderRadius: 5,
                                  overflow: "hidden",
                                }}
                              >
                                <Box
                                  sx={{
                                    width: `${pctDone}%`,
                                    height: "100%",
                                    background:
                                      "linear-gradient(90deg, #64b5f6 0%, #1565c0 100%)",
                                    borderRadius: 5,
                                  }}
                                />
                              </Box>
                            </Stack>
                          </Grid>

                          <Grid size={{ xs: 12, md: 6 }}>
                            <Stack spacing={1} sx={{ width: "100%" }}>
                              <Stack
                                direction="row"
                                justifyContent="space-between"
                                alignItems="center"
                                sx={{ width: "100%" }}
                              >
                                <Typography
                                  variant="caption"
                                  fontWeight={600}
                                  color="text.secondary"
                                >
                                  Tiến độ đến hiện tại
                                </Typography>
                                <Typography
                                  variant="caption"
                                  fontWeight={700}
                                  sx={{ color: "#ed6c02" }}
                                >
                                  {pctDoneToday}% (
                                  {new Intl.NumberFormat("en-US").format(
                                    maintDoneToday
                                  )}
                                  /
                                  {new Intl.NumberFormat("en-US").format(
                                    maintTotalToday
                                  )}
                                  )
                                </Typography>
                              </Stack>
                              <Box
                                sx={{
                                  width: "100%",
                                  height: 10,
                                  bgcolor: "#eee",
                                  borderRadius: 5,
                                  overflow: "hidden",
                                }}
                              >
                                <Box
                                  sx={{
                                    width: `${pctDoneToday}%`,
                                    height: "100%",
                                    background:
                                      "linear-gradient(90deg, #ffb74d 0%, #ed6c02 100%)",
                                    borderRadius: 5,
                                  }}
                                />
                              </Box>
                            </Stack>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>

                    <TableContainer
                      component={Paper}
                      elevation={0}
                      sx={{
                        borderRadius: "16px",
                        border: "1px solid rgba(0,0,0,0.08)",
                        overflowX: "auto",
                        width: "100%",
                      }}
                    >
                      <Table size="medium">
                        <TableHead>
                          <TableRow sx={{ bgcolor: "#f5f6f8" }}>
                            <TableCell
                              sx={{ fontWeight: 700, pl: 3, width: "15%" }}
                            >
                              <Stack
                                direction="row"
                                spacing={1}
                                alignItems="center"
                              >
                                <Typography
                                  variant="subtitle2"
                                  fontWeight={700}
                                >
                                  Đơn vị
                                </Typography>
                              </Stack>
                            </TableCell>
                            <TableCell
                              sx={{ fontWeight: 700, width: "11%" }}
                              align="center"
                            >
                              Tổng số máy
                            </TableCell>
                            <TableCell
                              sx={{
                                fontWeight: 700,
                                color: MAINT_STATUS_CONFIG.pending.color,
                                width: "11%",
                              }}
                              align="center"
                            >
                              Chưa thực hiện
                            </TableCell>
                            <TableCell
                              sx={{
                                fontWeight: 700,
                                color: MAINT_STATUS_CONFIG.completed.color,
                                width: "11%",
                              }}
                              align="center"
                            >
                              Đã thực hiện
                            </TableCell>
                            <TableCell
                              sx={{ fontWeight: 700, width: "15%" }}
                              align="center"
                            >
                              Tiến độ thực hiện tổng
                            </TableCell>
                            <TableCell
                              sx={{
                                fontWeight: 700,
                                color: "#ed6c02",
                                width: "15%",
                              }}
                              align="center"
                            >
                              Đã thực hiện hôm nay
                            </TableCell>
                            <TableCell
                              sx={{
                                fontWeight: 700,
                                color: "#ed6c02",
                                width: "15%",
                              }}
                              align="center"
                            >
                              Tiến độ đến hiện tại
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {reportData.maintenance.departments.map(
                            (dept, idx) => {
                              const deptDone = dept.completed + dept.confirmed;
                              const deptPct =
                                dept.total > 0
                                  ? Math.round((deptDone / dept.total) * 100)
                                  : 0;
                              const deptDoneToday = dept.doneToday || 0;
                              const deptTotalToday = dept.totalToday || 0;
                              const deptPctToday =
                                deptTotalToday > 0
                                  ? Math.round(
                                      (deptDoneToday / deptTotalToday) * 100
                                    )
                                  : 0;
                              return (
                                <TableRow key={idx} hover>
                                  <TableCell sx={{ fontWeight: 600, pl: 3 }}>
                                    {dept.name_department}
                                  </TableCell>
                                  <TableCell
                                    align="center"
                                    sx={{ fontWeight: 700 }}
                                  >
                                    {new Intl.NumberFormat("en-US").format(
                                      dept.total
                                    )}
                                  </TableCell>
                                  <TableCell
                                    align="center"
                                    sx={{
                                      color: MAINT_STATUS_CONFIG.pending.color,
                                      fontWeight: 600,
                                    }}
                                  >
                                    {new Intl.NumberFormat("en-US").format(
                                      dept.pending
                                    )}
                                  </TableCell>
                                  <TableCell
                                    align="center"
                                    sx={{
                                      color:
                                        MAINT_STATUS_CONFIG.completed.color,
                                      fontWeight: 600,
                                    }}
                                  >
                                    {new Intl.NumberFormat("en-US").format(
                                      dept.completed + dept.confirmed
                                    )}
                                  </TableCell>
                                  <TableCell align="center">
                                    <Stack
                                      direction="row"
                                      spacing={1}
                                      alignItems="center"
                                      justifyContent="center"
                                    >
                                      <Box
                                        sx={{
                                          width: 60,
                                          height: 6,
                                          bgcolor: "#eee",
                                          borderRadius: 3,
                                          overflow: "hidden",
                                        }}
                                      >
                                        <Box
                                          sx={{
                                            width: `${deptPct}%`,
                                            height: "100%",
                                            bgcolor:
                                              deptPct === 100
                                                ? "#2e7d32"
                                                : "#1976d2",
                                            borderRadius: 3,
                                          }}
                                        />
                                      </Box>
                                      <Typography
                                        variant="body2"
                                        fontWeight={700}
                                        sx={{
                                          color:
                                            deptPct === 100
                                              ? "#2e7d32"
                                              : "inherit",
                                        }}
                                      >
                                        {deptPct}%
                                      </Typography>
                                    </Stack>
                                  </TableCell>
                                  <TableCell
                                    align="center"
                                    sx={{
                                      color: "#ed6c02",
                                      fontWeight: 600,
                                    }}
                                  >
                                    {deptTotalToday > 0 ? (
                                      <>
                                        {new Intl.NumberFormat("en-US").format(
                                          deptDoneToday
                                        )}
                                        <span
                                          style={{
                                            fontSize: "0.8rem",
                                            color: "#666",
                                            fontWeight: "normal",
                                          }}
                                        >
                                          {" "}
                                          /{" "}
                                          {new Intl.NumberFormat(
                                            "en-US"
                                          ).format(deptTotalToday)}
                                        </span>
                                      </>
                                    ) : (
                                      "-"
                                    )}
                                  </TableCell>
                                  <TableCell align="center">
                                    {deptTotalToday > 0 ? (
                                      <Stack
                                        direction="row"
                                        spacing={1}
                                        alignItems="center"
                                        justifyContent="center"
                                      >
                                        <Box
                                          sx={{
                                            width: 60,
                                            height: 6,
                                            bgcolor: "#eee",
                                            borderRadius: 3,
                                            overflow: "hidden",
                                          }}
                                        >
                                          <Box
                                            sx={{
                                              width: `${deptPctToday}%`,
                                              height: "100%",
                                              bgcolor:
                                                deptPctToday === 100
                                                  ? "#2e7d32"
                                                  : "#ed6c02",
                                              borderRadius: 3,
                                            }}
                                          />
                                        </Box>
                                        <Typography
                                          variant="body2"
                                          fontWeight={700}
                                          sx={{
                                            color:
                                              deptPctToday === 100
                                                ? "#2e7d32"
                                                : "#ed6c02",
                                          }}
                                        >
                                          {deptPctToday}%
                                        </Typography>
                                      </Stack>
                                    ) : (
                                      "-"
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            }
                          )}

                          {(() => {
                            let totalMaintCount = 0;
                            let totalMaintPending = 0;
                            let totalMaintDone = 0;
                            let totalMaintDoneToday = 0;
                            let totalMaintTotalToday = 0;

                            reportData.maintenance.departments.forEach(
                              (dept) => {
                                totalMaintCount += dept.total;
                                totalMaintPending += dept.pending;
                                totalMaintDone +=
                                  dept.completed + dept.confirmed;
                                totalMaintDoneToday += dept.doneToday || 0;
                                totalMaintTotalToday += dept.totalToday || 0;
                              }
                            );

                            const totalMaintPct =
                              totalMaintCount > 0
                                ? Math.round(
                                    (totalMaintDone / totalMaintCount) * 100
                                  )
                                : 0;

                            const totalMaintPctToday =
                              totalMaintTotalToday > 0
                                ? Math.round(
                                    (totalMaintDoneToday /
                                      totalMaintTotalToday) *
                                      100
                                  )
                                : 0;

                            return (
                              <TableRow sx={{ bgcolor: "#f5f6f8" }}>
                                <TableCell sx={{ fontWeight: "bold", pl: 3 }}>
                                  TỔNG CỘNG
                                </TableCell>
                                <TableCell
                                  align="center"
                                  sx={{ fontWeight: "bold" }}
                                >
                                  {new Intl.NumberFormat("en-US").format(
                                    totalMaintCount
                                  )}
                                </TableCell>
                                <TableCell
                                  align="center"
                                  sx={{
                                    fontWeight: "bold",
                                    color: MAINT_STATUS_CONFIG.pending.color,
                                  }}
                                >
                                  {new Intl.NumberFormat("en-US").format(
                                    totalMaintPending
                                  )}
                                </TableCell>
                                <TableCell
                                  align="center"
                                  sx={{
                                    fontWeight: "bold",
                                    color: MAINT_STATUS_CONFIG.completed.color,
                                  }}
                                >
                                  {new Intl.NumberFormat("en-US").format(
                                    totalMaintDone
                                  )}
                                </TableCell>
                                <TableCell align="center">
                                  <Stack
                                    direction="row"
                                    spacing={1}
                                    alignItems="center"
                                    justifyContent="center"
                                  >
                                    <Box
                                      sx={{
                                        width: 60,
                                        height: 6,
                                        bgcolor: "#eee",
                                        borderRadius: 3,
                                        overflow: "hidden",
                                      }}
                                    >
                                      <Box
                                        sx={{
                                          width: `${totalMaintPct}%`,
                                          height: "100%",
                                          bgcolor:
                                            totalMaintPct === 100
                                              ? "#2e7d32"
                                              : "#1976d2",
                                          borderRadius: 3,
                                        }}
                                      />
                                    </Box>
                                    <Typography
                                      variant="body2"
                                      fontWeight="bold"
                                      sx={{
                                        color:
                                          totalMaintPct === 100
                                            ? "#2e7d32"
                                            : "inherit",
                                      }}
                                    >
                                      {totalMaintPct}%
                                    </Typography>
                                  </Stack>
                                </TableCell>
                                <TableCell
                                  align="center"
                                  sx={{
                                    fontWeight: "bold",
                                    color: "#ed6c02",
                                  }}
                                >
                                  {totalMaintTotalToday > 0 ? (
                                    <>
                                      {new Intl.NumberFormat("en-US").format(
                                        totalMaintDoneToday
                                      )}
                                      <span
                                        style={{
                                          fontSize: "0.8rem",
                                          color: "#666",
                                          fontWeight: "normal",
                                        }}
                                      >
                                        {" "}
                                        /{" "}
                                        {new Intl.NumberFormat("en-US").format(
                                          totalMaintTotalToday
                                        )}
                                      </span>
                                    </>
                                  ) : (
                                    "-"
                                  )}
                                </TableCell>
                                <TableCell align="center">
                                  {totalMaintTotalToday > 0 ? (
                                    <Stack
                                      direction="row"
                                      spacing={1}
                                      alignItems="center"
                                      justifyContent="center"
                                    >
                                      <Box
                                        sx={{
                                          width: 60,
                                          height: 6,
                                          bgcolor: "#eee",
                                          borderRadius: 3,
                                          overflow: "hidden",
                                        }}
                                      >
                                        <Box
                                          sx={{
                                            width: `${totalMaintPctToday}%`,
                                            height: "100%",
                                            bgcolor:
                                              totalMaintPctToday === 100
                                                ? "#2e7d32"
                                                : "#ed6c02",
                                            borderRadius: 3,
                                          }}
                                        />
                                      </Box>
                                      <Typography
                                        variant="body2"
                                        fontWeight="bold"
                                        sx={{
                                          color:
                                            totalMaintPctToday === 100
                                              ? "#2e7d32"
                                              : "#ed6c02",
                                        }}
                                      >
                                        {totalMaintPctToday}%
                                      </Typography>
                                    </Stack>
                                  ) : (
                                    "-"
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })()}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Stack>
                )}
              </Box>
            )}

            {/* TAB 3: COMPRESSED AIR CONSUMPTION REPORT */}
            {activeTab === 3 && (
              <Box>
                {!reportData.air_consumption ||
                reportData.air_consumption.summary.total_machines === 0 ? (
                  <Paper
                    elevation={0}
                    sx={{
                      p: 6,
                      textAlign: "center",
                      borderRadius: "16px",
                      border: "1px dashed rgba(0,0,0,0.12)",
                    }}
                  >
                    <Air
                      sx={{ fontSize: 48, color: "text.disabled", mb: 1.5 }}
                    />
                    <Typography variant="body1" color="text.secondary">
                      Không có máy móc nào khai báo dữ liệu sử dụng khí nén
                    </Typography>
                  </Paper>
                ) : (
                  <Stack spacing={2.5}>
                    {/* HERO CARDS SECTION FOR AIR CONSUMPTION REPORT */}
                    <Grid container spacing={2.5} sx={{ mb: 3 }}>
                      {/* COLUMN 1: HERO CARD - CÔNG SUẤT MÁY BƠM KHÍ NÉN */}
                      <Grid size={{ xs: 12, md: 5 }}>
                        <Paper
                          elevation={0}
                          sx={{
                            p: 3,
                            borderRadius: "20px",
                            background:
                              "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
                            color: "#fff",
                            boxShadow: "0 10px 30px rgba(15,23,42,0.3)",
                            height: "100%",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between",
                            boxSizing: "border-box",
                            border: "1px solid rgba(255,255,255,0.1)",
                          }}
                        >
                          <Box>
                            <Stack
                              direction="row"
                              justifyContent="space-between"
                              alignItems="center"
                              sx={{ mb: 2 }}
                            >
                              <Stack
                                direction="row"
                                spacing={1.5}
                                alignItems="center"
                              >
                                <Avatar
                                  sx={{
                                    bgcolor: "rgba(56,189,248,0.2)",
                                    color: "#38bdf8",
                                    width: 44,
                                    height: 44,
                                  }}
                                >
                                  <Speed sx={{ fontSize: 26 }} />
                                </Avatar>
                                <Box>
                                  <Typography
                                    variant="h6"
                                    sx={{
                                      color: "#f8fafc",
                                      textTransform: "uppercase",
                                      fontWeight: 700,
                                      letterSpacing: 0.8,
                                    }}
                                  >
                                    CÔNG SUẤT MÁY BƠM KHÍ NÉN
                                  </Typography>
                                </Box>
                              </Stack>
                            </Stack>

                            <Box
                              sx={{
                                my: 2,
                                p: 2,
                                borderRadius: "14px",
                                bgcolor: "rgba(255,255,255,0.05)",
                                border: "1px solid rgba(255,255,255,0.08)",
                              }}
                            >
                              <Typography
                                variant="caption"
                                sx={{ color: "#cbd5e1", fontWeight: 600 }}
                              >
                                TỔNG CÔNG SUẤT MÁY NÉN KHÍ
                              </Typography>
                              <Typography
                                variant="h3"
                                fontWeight={900}
                                sx={{ color: "#38bdf8", my: 0.5 }}
                              >
                                20,000
                                <Typography
                                  component="span"
                                  variant="subtitle1"
                                  sx={{
                                    ml: 1,
                                    color: "#94a3b8",
                                    fontWeight: 600,
                                  }}
                                >
                                  lít/phút
                                </Typography>
                              </Typography>
                            </Box>

                            <Stack spacing={1.5}>
                              <Box
                                sx={{
                                  p: 1.8,
                                  borderRadius: "12px",
                                  bgcolor: "rgba(255,255,255,0.04)",
                                  border: "1px solid rgba(255,255,255,0.06)",
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                }}
                              >
                                <Box>
                                  <Typography
                                    variant="body2"
                                    fontWeight={700}
                                    sx={{ color: "#f1f5f9" }}
                                  >
                                    Máy bơm khí nén 1
                                  </Typography>
                                </Box>
                                <Typography
                                  variant="subtitle1"
                                  fontWeight={800}
                                  sx={{ color: "#38bdf8" }}
                                >
                                  10,500{" "}
                                  <Typography
                                    component="span"
                                    variant="caption"
                                    sx={{ color: "#94a3b8" }}
                                  >
                                    lít/phút
                                  </Typography>
                                </Typography>
                              </Box>

                              <Box
                                sx={{
                                  p: 1.8,
                                  borderRadius: "12px",
                                  bgcolor: "rgba(255,255,255,0.04)",
                                  border: "1px solid rgba(255,255,255,0.06)",
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                }}
                              >
                                <Box>
                                  <Typography
                                    variant="body2"
                                    fontWeight={700}
                                    sx={{ color: "#f1f5f9" }}
                                  >
                                    Máy bơm khí nén 2
                                  </Typography>
                                </Box>
                                <Typography
                                  variant="subtitle1"
                                  fontWeight={800}
                                  sx={{ color: "#38bdf8" }}
                                >
                                  9,500{" "}
                                  <Typography
                                    component="span"
                                    variant="caption"
                                    sx={{ color: "#94a3b8" }}
                                  >
                                    lít/phút
                                  </Typography>
                                </Typography>
                              </Box>
                            </Stack>
                          </Box>
                        </Paper>
                      </Grid>

                      {/* COLUMN 2: STACKED RIGHT CARDS */}
                      <Grid size={{ xs: 12, md: 7 }}>
                        <Stack
                          spacing={2}
                          sx={{
                            height: "100%",
                            display: "flex",
                            flexDirection: "column",
                          }}
                        >
                          {/* ROW 1 OF RIGHT COLUMN: TỔNG LƯU LƯỢNG SỬ DỤNG + % SỬ DỤNG KHÍ NÉN */}
                          {(() => {
                            const totalPumpSupply = 20000;
                            const totalUsedFlow =
                              reportData.air_consumption.summary.total_volume ||
                              0;
                            const allUsedFlow =
                              reportData.air_consumption.summary
                                .all_total_volume || 0;
                            const usagePct =
                              totalPumpSupply > 0
                                ? (totalUsedFlow / totalPumpSupply) * 100
                                : 0;

                            return (
                              <Paper
                                elevation={0}
                                sx={{
                                  p: 2.5,
                                  borderRadius: "18px",
                                  background:
                                    "linear-gradient(135deg, #f57c00 0%, #ff9800 100%)",
                                  color: "#fff",
                                  boxShadow: "0 6px 20px rgba(245,124,0,0.25)",
                                  flex: 1,
                                  display: "flex",
                                  alignItems: "center",
                                  boxSizing: "border-box",
                                }}
                              >
                                <Grid
                                  container
                                  spacing={2}
                                  alignItems="center"
                                  sx={{ width: "100%" }}
                                >
                                  {/* Left part: Tổng lưu lượng sử dụng */}
                                  <Grid size={{ xs: 12, sm: 7 }}>
                                    <Stack
                                      direction="row"
                                      spacing={1}
                                      alignItems="center"
                                      sx={{ mb: 0.5 }}
                                    >
                                      <Avatar
                                        sx={{
                                          bgcolor: "rgba(255,255,255,0.2)",
                                          width: 40,
                                          height: 40,
                                        }}
                                      >
                                        <Air
                                          sx={{ fontSize: 26, color: "#fff" }}
                                        />
                                      </Avatar>
                                      <Typography
                                        variant="caption"
                                        sx={{
                                          opacity: 0.9,
                                          textTransform: "uppercase",
                                          fontWeight: 700,
                                          letterSpacing: 0.5,
                                        }}
                                      >
                                        LƯU LƯỢNG KHÍ NÉN THỰC TẾ
                                      </Typography>
                                    </Stack>
                                    <Box
                                      sx={{
                                        display: "inline-flex",
                                        alignItems: "stretch",
                                        my: 0.5,
                                      }}
                                    >
                                      {/* TOP-LEFT: NUMERATOR */}
                                      <Box
                                        sx={{
                                          alignSelf: "flex-start",
                                          textAlign: "left",
                                        }}
                                      >
                                        <Typography
                                          variant="h3"
                                          fontWeight={900}
                                          sx={{ lineHeight: 1 }}
                                        >
                                          {new Intl.NumberFormat("en-US", {
                                            maximumFractionDigits: 1,
                                          }).format(totalUsedFlow)}
                                        </Typography>
                                        <Typography
                                          variant="caption"
                                          sx={{
                                            opacity: 0.9,
                                            fontWeight: 700,
                                            display: "block",
                                            mt: 0.3,
                                          }}
                                        >
                                          lít/phút
                                        </Typography>
                                      </Box>

                                      {/* CONTINUOUS SINGLE DIAGONAL SLASH SVG */}
                                      {allUsedFlow > 0 && (
                                        <>
                                          <Box
                                            sx={{
                                              display: "flex",
                                              alignItems: "center",
                                              px: 1,
                                              alignSelf: "stretch",
                                            }}
                                          >
                                            <svg
                                              width="26"
                                              height="54"
                                              viewBox="0 0 26 54"
                                              fill="none"
                                              xmlns="http://www.w3.org/2000/svg"
                                              style={{ display: "block" }}
                                            >
                                              <line
                                                x1="22"
                                                y1="3"
                                                x2="4"
                                                y2="51"
                                                stroke="white"
                                                strokeWidth="3.5"
                                                strokeLinecap="round"
                                                opacity="0.85"
                                              />
                                            </svg>
                                          </Box>

                                          {/* BOTTOM-RIGHT: DENOMINATOR */}
                                          <Box
                                            sx={{
                                              alignSelf: "flex-end",
                                              textAlign: "left",
                                            }}
                                          >
                                            <Typography
                                              variant="h4"
                                              fontWeight={800}
                                              sx={{ lineHeight: 1 }}
                                            >
                                              {new Intl.NumberFormat("en-US", {
                                                maximumFractionDigits: 1,
                                              }).format(allUsedFlow)}
                                            </Typography>
                                            <Typography
                                              variant="caption"
                                              sx={{
                                                opacity: 0.85,
                                                fontWeight: 700,
                                                display: "block",
                                                mt: 0.3,
                                              }}
                                            >
                                              tổng công suất
                                            </Typography>
                                          </Box>
                                        </>
                                      )}
                                    </Box>
                                    {/* <Typography
                                      variant="caption"
                                      sx={{
                                        display: "block",
                                        opacity: 0.85,
                                        mt: 0.5,
                                      }}
                                    >
                                      Công suất tiêu thụ thực tế
                                    </Typography> */}
                                  </Grid>

                                  {/* Right part: % Sử dụng khí nén */}
                                  <Grid size={{ xs: 12, sm: 5 }}>
                                    {(() => {
                                      const isWarning = usagePct >= 80;
                                      return (
                                        <Box
                                          sx={{
                                            p: 1.5,
                                            borderRadius: "14px",
                                            bgcolor: isWarning
                                              ? "#fef08a"
                                              : "rgba(255,255,255,0.18)",
                                            backdropFilter: "blur(6px)",
                                            textAlign: "right",
                                            border: isWarning
                                              ? "2px solid #dc2626"
                                              : "1px solid rgba(255,255,255,0.25)",
                                            boxShadow: isWarning
                                              ? "0 4px 14px rgba(220,38,38,0.3)"
                                              : "none",
                                            transition: "all 0.3s ease",
                                          }}
                                        >
                                          <Typography
                                            variant="caption"
                                            sx={{
                                              fontWeight: 700,
                                              opacity: 0.95,
                                              textTransform: "uppercase",
                                              display: "block",
                                              color: isWarning
                                                ? "#dc2626"
                                                : "inherit",
                                            }}
                                          >
                                            % MỨC SỬ DỤNG CÔNG SUẤT
                                          </Typography>

                                          <Box
                                            sx={{
                                              display: "flex",
                                              alignItems: "center",
                                              justifyContent: "flex-end",
                                              gap: 0.8,
                                              my: 0.3,
                                            }}
                                          >
                                            {isWarning && (
                                              <WarningAmber
                                                sx={{
                                                  color: "#dc2626",
                                                  fontSize: "1.8rem",
                                                  filter:
                                                    "drop-shadow(0px 1px 2px rgba(220,38,38,0.3))",
                                                }}
                                              />
                                            )}
                                            <Typography
                                              variant="h4"
                                              fontWeight={900}
                                              sx={{
                                                color: isWarning
                                                  ? "#dc2626"
                                                  : "inherit",
                                              }}
                                            >
                                              {usagePct.toFixed(1)}%
                                            </Typography>
                                          </Box>

                                          <Box
                                            sx={{
                                              width: "100%",
                                              height: 5,
                                              bgcolor: isWarning
                                                ? "rgba(220, 38, 38, 0.2)"
                                                : "rgba(255,255,255,0.3)",
                                              borderRadius: 3,
                                              overflow: "hidden",
                                              my: 0.6,
                                            }}
                                          >
                                            <Box
                                              sx={{
                                                width: `${Math.min(
                                                  100,
                                                  usagePct
                                                )}%`,
                                                height: "100%",
                                                bgcolor: isWarning
                                                  ? "#dc2626"
                                                  : "#fff",
                                                borderRadius: 3,
                                              }}
                                            />
                                          </Box>
                                          <Typography
                                            variant="caption"
                                            sx={{
                                              opacity: 0.9,
                                              fontSize: "0.72rem",
                                              color: isWarning
                                                ? "#dc2626"
                                                : "inherit",
                                            }}
                                          >
                                            {new Intl.NumberFormat("en-US", {
                                              maximumFractionDigits: 0,
                                            }).format(totalUsedFlow)}{" "}
                                            / 20,000 lít/phút
                                          </Typography>
                                        </Box>
                                      );
                                    })()}
                                  </Grid>
                                </Grid>
                              </Paper>
                            );
                          })()}

                          {/* ROW 2 OF RIGHT COLUMN: MÁY SỬ DỤNG KHÍ NÉN (2A) & LƯU LƯỢNG TB / MÁY (2B) */}
                          <Grid container spacing={2} sx={{ flex: 1 }}>
                            {/* Card 2A: Số máy dùng khí nén */}
                            <Grid size={{ xs: 12, sm: 6 }}>
                              <Paper
                                elevation={0}
                                sx={{
                                  p: 2.5,
                                  borderRadius: "18px",
                                  background:
                                    "linear-gradient(135deg, #3f51b5 0%, #5c6bc0 100%)",
                                  color: "#fff",
                                  boxShadow: "0 6px 20px rgba(63,81,181,0.25)",
                                  height: "100%",
                                  display: "flex",
                                  alignItems: "center",
                                  boxSizing: "border-box",
                                }}
                              >
                                <Box sx={{ width: "100%" }}>
                                  <Stack
                                    direction="row"
                                    spacing={1}
                                    alignItems="center"
                                    sx={{ mb: 0.5 }}
                                  >
                                    <Avatar
                                      sx={{
                                        bgcolor: "rgba(255,255,255,0.2)",
                                        width: 40,
                                        height: 40,
                                      }}
                                    >
                                      <PrecisionManufacturing
                                        sx={{ fontSize: 26, color: "#fff" }}
                                      />
                                    </Avatar>
                                    <Typography
                                      variant="caption"
                                      sx={{
                                        opacity: 0.9,
                                        textTransform: "uppercase",
                                        fontWeight: 700,
                                        letterSpacing: 0.5,
                                      }}
                                    >
                                      SỐ MÁY ĐANG SỬ DỤNG KHÍ NÉN
                                    </Typography>
                                  </Stack>
                                  <Box
                                    sx={{
                                      display: "inline-flex",
                                      alignItems: "stretch",
                                      my: 0.5,
                                    }}
                                  >
                                    {/* TOP-LEFT: NUMERATOR */}
                                    <Box
                                      sx={{
                                        alignSelf: "flex-start",
                                        textAlign: "left",
                                      }}
                                    >
                                      <Typography
                                        variant="h3"
                                        fontWeight={900}
                                        sx={{ lineHeight: 1 }}
                                      >
                                        {new Intl.NumberFormat("en-US").format(
                                          reportData.air_consumption.summary
                                            .total_machines || 0
                                        )}
                                      </Typography>
                                      <Typography
                                        variant="caption"
                                        sx={{
                                          opacity: 0.9,
                                          fontWeight: 700,
                                          display: "block",
                                          mt: 0.3,
                                        }}
                                      >
                                        máy
                                      </Typography>
                                    </Box>

                                    {/* CONTINUOUS SINGLE DIAGONAL SLASH SVG */}
                                    {reportData.air_consumption.summary
                                      .all_total_machines > 0 && (
                                      <>
                                        <Box
                                          sx={{
                                            display: "flex",
                                            alignItems: "center",
                                            px: 1,
                                            alignSelf: "stretch",
                                          }}
                                        >
                                          <svg
                                            width="24"
                                            height="50"
                                            viewBox="0 0 24 50"
                                            fill="none"
                                            xmlns="http://www.w3.org/2000/svg"
                                            style={{ display: "block" }}
                                          >
                                            <line
                                              x1="20"
                                              y1="3"
                                              x2="4"
                                              y2="47"
                                              stroke="white"
                                              strokeWidth="3.5"
                                              strokeLinecap="round"
                                              opacity="0.85"
                                            />
                                          </svg>
                                        </Box>

                                        {/* BOTTOM-RIGHT: DENOMINATOR */}
                                        <Box
                                          sx={{
                                            alignSelf: "flex-end",
                                            textAlign: "left",
                                          }}
                                        >
                                          <Typography
                                            variant="h4"
                                            fontWeight={800}
                                            sx={{ lineHeight: 1 }}
                                          >
                                            {new Intl.NumberFormat(
                                              "en-US"
                                            ).format(
                                              reportData.air_consumption.summary
                                                .all_total_machines
                                            )}
                                          </Typography>
                                          <Typography
                                            variant="caption"
                                            sx={{
                                              opacity: 0.85,
                                              fontWeight: 700,
                                              display: "block",
                                              mt: 0.3,
                                            }}
                                          >
                                            tổng số máy
                                          </Typography>
                                        </Box>
                                      </>
                                    )}
                                  </Box>
                                  {/* <Typography
                                    variant="caption"
                                    sx={{
                                      display: "block",
                                      opacity: 0.85,
                                      mt: 0.5,
                                    }}
                                  >
                                    Tổng số MMTB sử dụng khí nén
                                  </Typography> */}
                                </Box>
                              </Paper>
                            </Grid>

                            {/* Card 2B: Lưu lượng trung bình / máy */}
                            <Grid size={{ xs: 12, sm: 6 }}>
                              <Paper
                                elevation={0}
                                sx={{
                                  p: 2.5,
                                  borderRadius: "18px",
                                  background:
                                    "linear-gradient(135deg, #00897b 0%, #26a69a 100%)",
                                  color: "#fff",
                                  boxShadow: "0 6px 20px rgba(0,137,123,0.25)",
                                  height: "100%",
                                  display: "flex",
                                  alignItems: "center",
                                  boxSizing: "border-box",
                                }}
                              >
                                <Box sx={{ width: "100%" }}>
                                  <Stack
                                    direction="row"
                                    spacing={1}
                                    alignItems="center"
                                    sx={{ mb: 0.5 }}
                                  >
                                    <Avatar
                                      sx={{
                                        bgcolor: "rgba(255,255,255,0.2)",
                                        width: 40,
                                        height: 40,
                                      }}
                                    >
                                      <Speed
                                        sx={{ fontSize: 26, color: "#fff" }}
                                      />
                                    </Avatar>
                                    <Typography
                                      variant="caption"
                                      sx={{
                                        opacity: 0.9,
                                        textTransform: "uppercase",
                                        fontWeight: 700,
                                        letterSpacing: 0.5,
                                      }}
                                    >
                                      LƯU LƯỢNG TB / MÁY
                                    </Typography>
                                  </Stack>
                                  <Typography
                                    variant="h4"
                                    fontWeight={800}
                                    sx={{ my: 0.3 }}
                                  >
                                    {new Intl.NumberFormat("en-US", {
                                      maximumFractionDigits: 1,
                                    }).format(
                                      reportData.air_consumption.summary
                                        .avg_volume
                                    )}
                                    <Typography
                                      component="span"
                                      variant="subtitle2"
                                      sx={{ ml: 0.8, opacity: 0.9 }}
                                    >
                                      lít/phút
                                    </Typography>
                                  </Typography>
                                  {/* <Typography
                                    variant="caption"
                                    sx={{
                                      display: "block",
                                      opacity: 0.85,
                                      mt: 0.3,
                                    }}
                                  >
                                    Mức sử dụng bình quân
                                  </Typography> */}
                                </Box>
                              </Paper>
                            </Grid>
                          </Grid>
                        </Stack>
                      </Grid>
                    </Grid>

                    {/* 3-Level Hierarchical Tree: Department -> Location -> Machine Type */}
                    <Box sx={{ mt: 1 }}>
                      {!reportData.air_consumption.hierarchy ||
                      reportData.air_consumption.hierarchy.length === 0 ? (
                        <Paper
                          elevation={0}
                          sx={{
                            p: 4,
                            textAlign: "center",
                            borderRadius: "16px",
                            border: "1px dashed rgba(0,0,0,0.12)",
                          }}
                        >
                          <Typography color="text.secondary">
                            Chưa có dữ liệu phân bổ theo đơn vị và vị trí
                          </Typography>
                        </Paper>
                      ) : (
                        <Stack spacing={2} sx={{ width: "100%" }}>
                          {reportData.air_consumption.hierarchy.map(
                            (dept, deptIdx) => {
                              return (
                                <Accordion
                                  key={dept.id_department || deptIdx}
                                  elevation={0}
                                  sx={{
                                    borderRadius: "16px !important",
                                    border: "1px solid rgba(0,0,0,0.08)",
                                    overflow: "hidden",
                                    boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
                                    "&:before": { display: "none" },
                                  }}
                                >
                                  {/* LEVEL 1 HEADER: DEPARTMENT */}
                                  <AccordionSummary
                                    expandIcon={<ExpandMore />}
                                    sx={{
                                      bgcolor: "#f8fafc",
                                      px: 3,
                                      py: 1.5,
                                      borderBottom:
                                        "1px solid rgba(0,0,0,0.04)",
                                    }}
                                  >
                                    <Grid
                                      container
                                      spacing={2}
                                      alignItems="center"
                                      sx={{ width: "100%" }}
                                    >
                                      {/* Dept Name */}
                                      <Grid size={{ xs: 6, sm: 6 }}>
                                        <Stack
                                          direction="row"
                                          spacing={1.5}
                                          alignItems="center"
                                        >
                                          <Avatar
                                            sx={{
                                              bgcolor: "#e3f2fd",
                                              color: "#0288d1",
                                              width: 42,
                                              height: 42,
                                              fontWeight: 700,
                                            }}
                                          >
                                            <Business fontSize="small" />
                                          </Avatar>
                                          <Box>
                                            <Typography
                                              variant="subtitle1"
                                              fontWeight={700}
                                              sx={{ color: "#0f172a" }}
                                            >
                                              {dept.name_department}
                                            </Typography>
                                            <Typography
                                              variant="caption"
                                              color="text.secondary"
                                              fontWeight={600}
                                            >
                                              {dept.machine_count} máy
                                            </Typography>
                                          </Box>
                                        </Stack>
                                      </Grid>

                                      {/* Total Flow */}
                                      <Grid
                                        size={{ xs: 6, sm: 6 }}
                                        textAlign="right"
                                      >
                                        <Typography
                                          variant="caption"
                                          color="text.secondary"
                                          display="block"
                                          fontWeight={600}
                                        >
                                          TỔNG LƯU LƯỢNG SỬ DỤNG KHÍ NÉN
                                        </Typography>
                                        <Typography
                                          variant="subtitle1"
                                          fontWeight={800}
                                          sx={{ color: "#0288d1" }}
                                        >
                                          {new Intl.NumberFormat("en-US", {
                                            maximumFractionDigits: 1,
                                          }).format(dept.total_volume)}{" "}
                                          lít/phút
                                        </Typography>
                                      </Grid>
                                    </Grid>
                                  </AccordionSummary>

                                  {/* LEVEL 1 DETAILS: LOCATIONS UNDER DEPARTMENT */}
                                  <AccordionDetails
                                    sx={{ p: 2, bgcolor: "#f1f5f9" }}
                                  >
                                    <Stack spacing={1.5}>
                                      {dept.locations.map((loc, locIdx) => {
                                        return (
                                          <Accordion
                                            key={loc.id_location || locIdx}
                                            elevation={0}
                                            sx={{
                                              borderRadius: "12px !important",
                                              border:
                                                "1px solid rgba(0,0,0,0.06)",
                                              bgcolor: "#ffffff",
                                              overflow: "hidden",
                                              "&:before": { display: "none" },
                                            }}
                                          >
                                            {/* LEVEL 2 HEADER: LOCATION */}
                                            <AccordionSummary
                                              expandIcon={<ExpandMore />}
                                              sx={{
                                                px: 2.5,
                                                py: 1,
                                                bgcolor: "#fafafa",
                                              }}
                                            >
                                              <Grid
                                                container
                                                spacing={2}
                                                alignItems="center"
                                                sx={{ width: "100%" }}
                                              >
                                                {/* Location Name */}
                                                <Grid size={{ xs: 6, sm: 6 }}>
                                                  <Stack
                                                    direction="row"
                                                    spacing={1.5}
                                                    alignItems="center"
                                                  >
                                                    <Avatar
                                                      sx={{
                                                        bgcolor: "#e0f2f1",
                                                        color: "#00897b",
                                                        width: 34,
                                                        height: 34,
                                                      }}
                                                    >
                                                      <LocationOn fontSize="small" />
                                                    </Avatar>
                                                    <Box>
                                                      <Typography
                                                        variant="subtitle2"
                                                        fontWeight={700}
                                                        sx={{
                                                          color: "#334155",
                                                        }}
                                                      >
                                                        {loc.name_location}
                                                      </Typography>
                                                      <Typography
                                                        variant="caption"
                                                        color="text.secondary"
                                                      >
                                                        {loc.machine_count} máy
                                                      </Typography>
                                                    </Box>
                                                  </Stack>
                                                </Grid>

                                                {/* Location Total Flow */}
                                                <Grid
                                                  size={{ xs: 6, sm: 6 }}
                                                  textAlign="right"
                                                >
                                                  <Typography
                                                    variant="body2"
                                                    color="text.secondary"
                                                    display="block"
                                                  >
                                                    Lưu lượng sử dụng khí nén
                                                  </Typography>
                                                  <Typography
                                                    variant="body2"
                                                    fontWeight={700}
                                                    sx={{ color: "#00897b" }}
                                                  >
                                                    {new Intl.NumberFormat(
                                                      "en-US",
                                                      {
                                                        maximumFractionDigits: 1,
                                                      }
                                                    ).format(
                                                      loc.total_volume
                                                    )}{" "}
                                                    lít/phút
                                                  </Typography>
                                                </Grid>
                                              </Grid>
                                            </AccordionSummary>

                                            {/* LEVEL 3 DETAILS: MACHINE TYPES TABLE */}
                                            <AccordionDetails sx={{ p: 0 }}>
                                              <TableContainer
                                                component={Paper}
                                                elevation={0}
                                                sx={{ borderRadius: 0 }}
                                              >
                                                <Table size="small">
                                                  <TableHead>
                                                    <TableRow
                                                      sx={{
                                                        bgcolor: "#f8fafc",
                                                      }}
                                                    >
                                                      <TableCell
                                                        sx={{
                                                          fontWeight: 700,
                                                          width: "50px",
                                                          pl: 3,
                                                        }}
                                                        align="center"
                                                      >
                                                        STT
                                                      </TableCell>
                                                      <TableCell
                                                        sx={{ fontWeight: 700 }}
                                                      >
                                                        Loại máy
                                                      </TableCell>
                                                      <TableCell
                                                        align="center"
                                                        sx={{ fontWeight: 700 }}
                                                      >
                                                        Số máy
                                                      </TableCell>

                                                      <TableCell
                                                        align="center"
                                                        sx={{
                                                          fontWeight: 700,
                                                          color: "#00897b",
                                                        }}
                                                      >
                                                        Lưu lượng (lít/phút)
                                                      </TableCell>
                                                      <TableCell
                                                        align="center"
                                                        sx={{
                                                          fontWeight: 700,
                                                          color: "#00897b",
                                                        }}
                                                      >
                                                        Tổng lưu lượng
                                                        (lít/phút)
                                                      </TableCell>
                                                    </TableRow>
                                                  </TableHead>
                                                  <TableBody>
                                                    {loc.types.map(
                                                      (typeItem, typeIdx) => {
                                                        return (
                                                          <TableRow
                                                            key={
                                                              typeItem.type_machine ||
                                                              typeIdx
                                                            }
                                                            hover
                                                          >
                                                            <TableCell
                                                              align="center"
                                                              sx={{
                                                                pl: 3,
                                                                fontWeight: 600,
                                                                color:
                                                                  "text.secondary",
                                                              }}
                                                            >
                                                              {typeIdx + 1}
                                                            </TableCell>
                                                            <TableCell
                                                              sx={{
                                                                fontWeight: 700,
                                                                color:
                                                                  "#1e293b",
                                                              }}
                                                            >
                                                              {
                                                                typeItem.type_machine
                                                              }
                                                            </TableCell>
                                                            <TableCell
                                                              align="center"
                                                              sx={{
                                                                fontWeight: 600,
                                                              }}
                                                            >
                                                              {`${typeItem.machine_count} máy`}
                                                            </TableCell>
                                                            <TableCell
                                                              align="center"
                                                              sx={{
                                                                fontWeight: 600,
                                                                color:
                                                                  "#00897b",
                                                              }}
                                                            >
                                                              {new Intl.NumberFormat(
                                                                "en-US",
                                                                {
                                                                  maximumFractionDigits: 1,
                                                                }
                                                              ).format(
                                                                typeItem.avg_volume
                                                              )}{" "}
                                                              lít/phút
                                                            </TableCell>
                                                            <TableCell
                                                              align="center"
                                                              sx={{
                                                                fontWeight: 700,
                                                                color:
                                                                  "#00897b",
                                                              }}
                                                            >
                                                              {new Intl.NumberFormat(
                                                                "en-US",
                                                                {
                                                                  maximumFractionDigits: 1,
                                                                }
                                                              ).format(
                                                                typeItem.total_volume
                                                              )}{" "}
                                                              lít/phút
                                                            </TableCell>
                                                          </TableRow>
                                                        );
                                                      }
                                                    )}
                                                  </TableBody>
                                                </Table>
                                              </TableContainer>
                                            </AccordionDetails>
                                          </Accordion>
                                        );
                                      })}
                                    </Stack>
                                  </AccordionDetails>
                                </Accordion>
                              );
                            }
                          )}
                        </Stack>
                      )}
                    </Box>
                  </Stack>
                )}
              </Box>
            )}

            {/* TAB 4: MACHINE OVERVIEW REPORT */}
            {activeTab === 0 && (
              <Box>
                {moDisplayTotal === 0 ? (
                  <Paper
                    elevation={0}
                    sx={{
                      p: 6,
                      textAlign: "center",
                      borderRadius: "16px",
                      border: "1px dashed rgba(0,0,0,0.12)",
                    }}
                  >
                    <Dashboard
                      sx={{ fontSize: 48, color: "text.disabled", mb: 1.5 }}
                    />
                    <Typography variant="body1" color="text.secondary">
                      Chưa có dữ liệu máy móc để thống kê
                    </Typography>
                  </Paper>
                ) : (
                  <Stack spacing={2.5}>
                    {/* Nút mở dashboard ở tab mới (full màn hình, không nav bar) */}
                    {!isStandalone && (
                      <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                        <Button
                          variant="contained"
                          startIcon={<OpenInNew />}
                          onClick={() =>
                            window.open(
                              "/reports/machine-overview",
                              "_blank",
                              "noopener"
                            )
                          }
                          sx={{
                            background:
                              "linear-gradient(90deg, #0f172a, #1e293b)",
                            boxShadow: "0 4px 14px rgba(15,23,42,0.25)",
                            borderRadius: "10px",
                            textTransform: "none",
                            fontWeight: 600,
                            px: 2.5,
                            py: 1,
                            "&:hover": {
                              background:
                                "linear-gradient(90deg, #1e293b, #334155)",
                            },
                          }}
                        >
                          Mở dashboard ở tab mới
                        </Button>
                      </Box>
                    )}

                    {/* BAND 1: DONUT CƠ CẤU + BẢNG TRẠNG THÁI CHI TIẾT */}
                    <Grid container spacing={2.5}>
                      <Grid size={{ xs: 12, md: 5, xl: 4 }}>
                        <PanelCard
                          title="Biểu đồ trạng thái máy"
                          icon={<PrecisionManufacturing />}
                          gradient="navy"
                          dark
                        >
                          <Box
                            sx={{
                              p: 2.5,
                              flexGrow: 1,
                              display: "flex",
                              flexDirection: {
                                xs: "column",
                                sm: "row",
                                md: "column",
                                lg: "row",
                              },
                              alignItems: "center",
                              gap: 2.5,
                            }}
                          >
                            <DonutChart
                              dark
                              segments={MO_DONUT_SEGMENTS.map((seg) => ({
                                ...seg,
                                value: moRowTotal(seg.key),
                              }))}
                              total={moDisplayTotal}
                              centerLabel="Tổng số máy"
                              size={isMobile ? 160 : 180}
                            />
                            <Stack
                              spacing={1.2}
                              sx={{ flexGrow: 1, width: "100%" }}
                            >
                              {MO_DONUT_SEGMENTS.map((seg) => {
                                const value = moRowTotal(seg.key);
                                const pct =
                                  moDisplayTotal > 0
                                    ? (value / moDisplayTotal) * 100
                                    : 0;
                                return (
                                  <Box
                                    key={seg.key}
                                    sx={{
                                      px: 1.5,
                                      py: 1.1,
                                      borderRadius: "12px",
                                      bgcolor: "rgba(255,255,255,0.04)",
                                      border:
                                        "1px solid rgba(255,255,255,0.06)",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 1.2,
                                    }}
                                  >
                                    <Box
                                      sx={{
                                        width: 10,
                                        height: 10,
                                        borderRadius: "50%",
                                        bgcolor: seg.color,
                                        flexShrink: 0,
                                      }}
                                    />
                                    <Typography
                                      variant="body2"
                                      sx={{ flexGrow: 1, color: "#e2e8f0" }}
                                    >
                                      {seg.label}
                                    </Typography>
                                    <Typography
                                      variant="body2"
                                      fontWeight={700}
                                      sx={{ color: seg.color }}
                                    >
                                      {formatCount(value)}
                                    </Typography>
                                    <Typography
                                      variant="caption"
                                      sx={{
                                        minWidth: 40,
                                        textAlign: "right",
                                        color: "#94a3b8",
                                      }}
                                    >
                                      {Math.round(pct)}%
                                    </Typography>
                                  </Box>
                                );
                              })}
                            </Stack>
                          </Box>
                        </PanelCard>
                      </Grid>

                      <Grid size={{ xs: 12, md: 7, xl: 8 }}>
                        <PanelCard
                          title="Trạng thái chi tiết"
                          icon={<Dashboard />}
                          gradient="indigo"
                        >
                          <MachineStatusMatrix
                            data={moMatrix}
                            breakdown={machineOverview.breakdown || []}
                          />
                        </PanelCard>
                      </Grid>
                    </Grid>

                    {/* BAND 2: DANH SÁCH MÁY + TIẾN ĐỘ BẢO DƯỠNG */}
                    <Grid container spacing={2.5}>
                      <Grid size={{ xs: 12, lg: 7 }}>
                        <PanelCard
                          title="Kết quả kiểm kê"
                          icon={<FactCheck />}
                          gradient="teal"
                          action={
                            <Stack
                              direction="row"
                              spacing={0.5}
                              sx={{
                                bgcolor: "rgba(255,255,255,0.15)",
                                borderRadius: "10px",
                                p: 0.4,
                              }}
                            >
                              {[
                                null,
                                ...Array.from(
                                  { length: INV_WEEK_COUNT },
                                  (_, i) => i + 1
                                ),
                              ].map((week) => {
                                const isActive = invWeek === week;
                                const noData =
                                  week !== null &&
                                  !invDays.some((d) => d.week === week);
                                return (
                                  <Button
                                    key={week ?? "all"}
                                    size="small"
                                    disabled={noData}
                                    onClick={() => setInvWeek(week)}
                                    sx={{
                                      minWidth: 0,
                                      px: 1.2,
                                      py: 0.3,
                                      borderRadius: "8px",
                                      textTransform: "none",
                                      fontSize: "0.72rem",
                                      fontWeight: 700,
                                      lineHeight: 1.6,
                                      color: isActive ? "#00796b" : "#fff",
                                      bgcolor: isActive
                                        ? "#fff"
                                        : "transparent",
                                      "&.Mui-disabled": {
                                        color: "rgba(255,255,255,0.35)",
                                      },
                                      "&:hover": {
                                        bgcolor: isActive
                                          ? "#fff"
                                          : "rgba(255,255,255,0.2)",
                                      },
                                    }}
                                  >
                                    {week === null
                                      ? "Cả tháng"
                                      : `Tuần ${week}`}
                                  </Button>
                                );
                              })}
                            </Stack>
                          }
                        >
                          {/* Hai biểu đồ sai lệch, dùng chung bộ chọn tuần.
                              Bảng chi tiết không hiện sẵn — bấm vào 1 đường sẽ mở dialog của xưởng đó. */}
                          {/* Bỏ bảng nên thân card ngắn hơn card bảo dưỡng bên cạnh;
                              cho khối biểu đồ giãn và căn giữa để không hở một khoảng trống dưới đáy */}
                          <Box
                            sx={{
                              p: 2.5,
                              pb: 1.5,
                              flexGrow: 1,
                              display: "flex",
                              flexDirection: "column",
                              justifyContent: "center",
                            }}
                          >
                            {/* Xếp 2 hàng: nằm cạnh nhau thì mỗi biểu đồ chỉ còn
                                ~460px nên trục và đường đều bị bóp nhỏ */}
                            <Grid container spacing={2} sx={{ width: "100%" }}>
                              {INV_TREND_METRICS.map((metric) => (
                                <Grid size={{ xs: 12 }} key={metric.key}>
                                  <InventoryLineChart
                                    title={metric.title}
                                    points={invChartPoints[metric.key]}
                                    workshops={invWorkshops}
                                    onSelect={setInvFocus}
                                    height={190}
                                  />
                                </Grid>
                              ))}
                            </Grid>
                          </Box>
                        </PanelCard>

                        {/* Chi tiết 1 xưởng — mở khi bấm vào đường của xưởng đó ở biểu đồ trên */}
                        <InventoryWorkshopDialog
                          workshop={
                            invWorkshops.find((w) => w.id === invFocus) || null
                          }
                          workshops={invWorkshops}
                          days={invDays}
                          chartPoints={invChartPoints}
                          week={invWeek}
                          onWeekChange={setInvWeek}
                          onSelect={setInvFocus}
                          onClose={() => setInvFocus(null)}
                          isMobile={isMobile}
                          periodLabel={`${MONTH_NAMES[currentMonth - 1]} / ${currentYear}`}
                        />
                      </Grid>

                      <Grid size={{ xs: 12, lg: 5 }}>
                        <PanelCard
                          title="Tiến độ bảo dưỡng"
                          icon={<CalendarMonth />}
                          gradient="navy"
                          dark
                        >
                          {maintTotal === 0 ? (
                            <Box
                              sx={{
                                p: 4,
                                flexGrow: 1,
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <CalendarMonth
                                sx={{
                                  fontSize: 42,
                                  color: "rgba(255,255,255,0.25)",
                                  mb: 1,
                                }}
                              />
                              <Typography
                                variant="body2"
                                sx={{ color: "#94a3b8", textAlign: "center" }}
                              >
                                Không có lịch bảo dưỡng trong{" "}
                                {MONTH_NAMES[currentMonth - 1].toLowerCase()} /{" "}
                                {currentYear}
                              </Typography>
                            </Box>
                          ) : (
                            <Box
                              sx={{
                                p: 2.5,
                                flexGrow: 1,
                                display: "flex",
                                flexDirection: "column",
                                gap: 2.5,
                              }}
                            >
                              {/* TRÊN: donut bên trái, chú thích 2 trạng thái bên phải.
                                  Trước đây donut + chú thích + thanh tiến độ xếp dọc chung
                                  trong một cột 215px nên thanh tiến độ bị hẹp. */}
                              <Box
                                sx={{
                                  display: "flex",
                                  flexDirection: { xs: "column", sm: "row" },
                                  alignItems: "center",
                                  gap: 2.5,
                                }}
                              >
                                <Box sx={{ flexShrink: 0 }}>
                                  <DonutChart
                                    dark
                                    segments={MO_MAINT_SEGMENTS.map((seg) => ({
                                      ...seg,
                                      value:
                                        seg.key === "done"
                                          ? maintDoneTotal
                                          : maintPending,
                                    }))}
                                    total={maintTotal}
                                    centerLabel="Tổng số máy"
                                    size={isMobile ? 160 : 175}
                                  />
                                </Box>

                                <Stack
                                  spacing={1}
                                  sx={{
                                    flexGrow: 1,
                                    width: "100%",
                                    minWidth: 0,
                                  }}
                                >
                                  {MO_MAINT_SEGMENTS.map((seg) => {
                                    const value =
                                      seg.key === "done"
                                        ? maintDoneTotal
                                        : maintPending;
                                    const pct =
                                      maintTotal > 0
                                        ? Math.round((value / maintTotal) * 100)
                                        : 0;
                                    return (
                                      <Box
                                        key={seg.key}
                                        sx={{
                                          flexGrow: 1,
                                          minWidth: 0,
                                          px: 1.5,
                                          py: 1,
                                          borderRadius: "12px",
                                          bgcolor: "rgba(255,255,255,0.04)",
                                          border:
                                            "1px solid rgba(255,255,255,0.06)",
                                          display: "flex",
                                          alignItems: "center",
                                          gap: 1,
                                        }}
                                      >
                                        <Box
                                          sx={{
                                            width: 10,
                                            height: 10,
                                            borderRadius: "50%",
                                            bgcolor: seg.color,
                                            flexShrink: 0,
                                          }}
                                        />
                                        <Typography
                                          variant="body2"
                                          sx={{
                                            flexGrow: 1,
                                            color: "#e2e8f0",
                                            whiteSpace: "nowrap",
                                          }}
                                        >
                                          {seg.label}
                                        </Typography>
                                        <Typography
                                          variant="body2"
                                          fontWeight={700}
                                          sx={{ color: seg.color }}
                                        >
                                          {formatCount(value)}
                                        </Typography>
                                        <Typography
                                          variant="caption"
                                          sx={{
                                            minWidth: 38,
                                            textAlign: "right",
                                            color: "#94a3b8",
                                          }}
                                        >
                                          {pct}%
                                        </Typography>
                                      </Box>
                                    );
                                  })}
                                </Stack>
                              </Box>

                              {/* 2 thanh tiến độ trải hết bề ngang card (nằm trong cột phải
                                  cạnh donut thì bị hẹp). "Đến hiện tại" chỉ tính lịch đúng ngày
                                  hôm nay — giống totalToday/doneToday của API, không phải luỹ kế. */}
                              <Stack spacing={1.5}>
                                {[
                                  {
                                    key: "month",
                                    label: "Tiến độ thực hiện tháng",
                                    done: maintDoneTotal,
                                    total: maintTotal,
                                    pct: pctDone,
                                    color: MAINT_DONE_COLOR,
                                  },
                                  {
                                    key: "today",
                                    label: maintTodayLabel
                                      ? `Tiến độ đến hiện tại (ngày ${maintTodayLabel})`
                                      : "Tiến độ đến hiện tại",
                                    done: maintDoneToday,
                                    total: maintTotalToday,
                                    pct: pctDoneToday,
                                    color: MAINT_TODAY_COLOR,
                                  },
                                ].map((bar) => {
                                  const full = bar.total > 0 && bar.pct >= 100;
                                  return (
                                    <Box key={bar.key}>
                                      <Stack
                                        direction="row"
                                        justifyContent="space-between"
                                        alignItems="center"
                                        spacing={1}
                                        sx={{ mb: 0.5 }}
                                      >
                                        <Typography
                                          variant="caption"
                                          fontWeight={600}
                                          sx={{ color: "#94a3b8" }}
                                        >
                                          {bar.label}
                                        </Typography>
                                        <Typography
                                          variant="caption"
                                          fontWeight={700}
                                          sx={{
                                            whiteSpace: "nowrap",
                                            color:
                                              bar.total === 0
                                                ? "#64748b"
                                                : full
                                                  ? "#4caf50"
                                                  : bar.color,
                                          }}
                                        >
                                          {bar.total > 0
                                            ? `${bar.pct}% (${formatCount(bar.done)}/${formatCount(bar.total)})`
                                            : "Không có lịch"}
                                        </Typography>
                                      </Stack>
                                      <Box
                                        sx={{
                                          width: "100%",
                                          height: 8,
                                          bgcolor: "rgba(255,255,255,0.08)",
                                          borderRadius: 4,
                                          overflow: "hidden",
                                        }}
                                      >
                                        <Box
                                          sx={{
                                            width: `${Math.min(100, bar.pct)}%`,
                                            height: "100%",
                                            bgcolor: full
                                              ? "#4caf50"
                                              : bar.color,
                                            borderRadius: 4,
                                          }}
                                        />
                                      </Box>
                                    </Box>
                                  );
                                })}
                              </Stack>

                              {/* DƯỚI: tiến độ theo từng đơn vị.
                                  Không cắt chiều cao nữa (trước để maxHeight 330 nên sinh scrollbar);
                                  card rộng thì xếp 2 cột để danh sách không đẩy card dài ra. */}
                              <Box sx={{ flexGrow: 1 }}>
                                <Typography
                                  variant="caption"
                                  fontWeight={700}
                                  sx={{
                                    display: "block",
                                    mb: 1,
                                    color: "#94a3b8",
                                    textTransform: "uppercase",
                                    letterSpacing: 0.4,
                                  }}
                                >
                                  Theo đơn vị
                                </Typography>

                                <Grid container spacing={1}>
                                  {(reportData.maintenance?.departments || [])
                                    .map((dept) => {
                                      const done =
                                        (dept.completed || 0) +
                                        (dept.confirmed || 0);
                                      const total = dept.total || 0;
                                      return {
                                        ...dept,
                                        done,
                                        total,
                                        pct:
                                          total > 0
                                            ? Math.round((done / total) * 100)
                                            : 0,
                                      };
                                    })
                                    .map((dept) => {
                                      const full = dept.pct === 100;
                                      return (
                                        <Grid
                                          size={{
                                            xs: 12,
                                            sm: 6,
                                            lg: 12,
                                            xl: 6,
                                          }}
                                          key={dept.name_department}
                                        >
                                          <Box
                                            sx={{
                                              px: 1.5,
                                              py: 1,
                                              borderRadius: "12px",
                                              bgcolor: "rgba(255,255,255,0.04)",
                                              border:
                                                "1px solid rgba(255,255,255,0.06)",
                                            }}
                                          >
                                            <Stack
                                              direction="row"
                                              alignItems="center"
                                              spacing={1}
                                              sx={{ mb: 0.6 }}
                                            >
                                              <Typography
                                                variant="body2"
                                                fontWeight={600}
                                                sx={{
                                                  flexGrow: 1,
                                                  minWidth: 0,
                                                  color: "#e2e8f0",
                                                  overflow: "hidden",
                                                  textOverflow: "ellipsis",
                                                  whiteSpace: "nowrap",
                                                }}
                                                title={dept.name_department}
                                              >
                                                {dept.name_department}
                                              </Typography>
                                              <Typography
                                                variant="body2"
                                                fontWeight={700}
                                                sx={{
                                                  whiteSpace: "nowrap",
                                                  color: full
                                                    ? "#4caf50"
                                                    : MAINT_DONE_COLOR,
                                                }}
                                              >
                                                {formatCount(dept.done)}
                                                <Typography
                                                  component="span"
                                                  variant="caption"
                                                  sx={{ color: "#64748b" }}
                                                >
                                                  {" "}
                                                  / {formatCount(dept.total)}
                                                </Typography>
                                              </Typography>
                                              <Typography
                                                variant="caption"
                                                fontWeight={700}
                                                sx={{
                                                  minWidth: 38,
                                                  textAlign: "right",
                                                  color: full
                                                    ? "#4caf50"
                                                    : "#94a3b8",
                                                }}
                                              >
                                                {dept.pct}%
                                              </Typography>
                                            </Stack>
                                            <Box
                                              sx={{
                                                width: "100%",
                                                height: 6,
                                                bgcolor:
                                                  "rgba(255,255,255,0.08)",
                                                borderRadius: 3,
                                                overflow: "hidden",
                                              }}
                                            >
                                              <Box
                                                sx={{
                                                  width: `${Math.min(100, dept.pct)}%`,
                                                  height: "100%",
                                                  bgcolor: full
                                                    ? "#4caf50"
                                                    : MAINT_DONE_COLOR,
                                                  borderRadius: 3,
                                                }}
                                              />
                                            </Box>
                                          </Box>
                                        </Grid>
                                      );
                                    })}
                                </Grid>

                                {(reportData.maintenance?.departments || [])
                                  .length === 0 && (
                                  <Typography
                                    variant="body2"
                                    sx={{
                                      color: "#64748b",
                                      textAlign: "center",
                                      py: 3,
                                    }}
                                  >
                                    Chưa có dữ liệu theo đơn vị
                                  </Typography>
                                )}
                              </Box>
                            </Box>
                          )}
                        </PanelCard>
                      </Grid>
                    </Grid>
                  </Stack>
                )}
              </Box>
            )}
          </Box>
        )}
      </Container>
    </>
  );
};

export default ReportPage;
