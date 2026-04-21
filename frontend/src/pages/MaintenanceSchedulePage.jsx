// frontend/src/pages/MaintenanceSchedulePage.jsx

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Chip,
  Button,
  Stack,
  Avatar,
  CircularProgress,
  Alert,
  IconButton,
  Divider,
  Tooltip,
  useTheme,
  useMediaQuery,
  TextField,
  InputAdornment,
  Fab,
  Autocomplete,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  FormControlLabel,
  Paper,
  Table,
  TableBody,
  TableRow,
  TableCell,
} from "@mui/material";
import {
  ChevronLeft,
  ChevronRight,
  Today,
  Refresh,
  Search,
  Close,
  CheckCircle,
  PrecisionManufacturing,
  LocationOn,
  CalendarMonth,
  KeyboardArrowUp,
  Business,
  FilterAlt,
  FilterAltOff,
  Category,
  Straighten,
  Factory,
  LocalShipping,
  TaskAlt,
  HourglassEmpty,
  WifiTethering,
  PictureAsPdf,
} from "@mui/icons-material";
import { alpha } from "@mui/material/styles";
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

const DAY_OF_WEEK = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

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
  broken: { bg: "#9e9e9e22", color: "#9e9e9e", label: "Máy hư" },
};

const MAINT_STATUS_CONFIG = {
  pending: {
    label: "Chưa thực hiện",
    color: "#e65100",
    bg: "#fff3e0",
    borderColor: "#ffcc80",
    icon: HourglassEmpty,
  },
  completed: {
    label: "Đã hoàn thành",
    color: "#2e7d32",
    bg: "#e8f5e9",
    borderColor: "#a5d6a7",
    icon: TaskAlt,
  },
};

// ==================== MaintenanceHistoryDialog Component ====================
const QUARTER_LABELS = {
  1: "Quý 1",
  2: "Quý 2",
  3: "Quý 3",
  4: "Quý 4",
};
const monthToQuarter = (m) => Math.ceil(m / 3);

const MaintenanceHistoryDialog = ({
  open,
  onClose,
  machine,
  onStatusChange,
}) => {
  const [isNew, setIsNew] = useState(true);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [historyRows, setHistoryRows] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchHistory = useCallback(async (id_machine) => {
    if (!id_machine) return;
    setHistoryLoading(true);
    try {
      const res = await api.maintenance.getMachineHistory(id_machine);
      if (res.success) setHistoryRows(res.data || []);
    } catch {
      setHistoryRows([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && machine) {
      setIsNew(true);
      fetchHistory(machine.id_machine);
    }
  }, [open, machine, fetchHistory]);

  const handleToggleStatus = async () => {
    if (!machine) return;
    const newStatus = machine.status === "completed" ? "pending" : "completed";
    setStatusUpdating(true);
    try {
      const result = await api.maintenance.updateScheduleStatus(
        machine.uuid_maintenance_schedule_detail,
        newStatus
      );
      onStatusChange &&
        onStatusChange(
          machine.uuid_maintenance_schedule_detail,
          newStatus,
          result
        );
      // Làm mới bảng lịch sử section C
      await fetchHistory(machine.id_machine);
    } catch (e) {
      void e;
    } finally {
      setStatusUpdating(false);
    }
  };

  if (!machine) return null;

  let contentList = [];
  try {
    if (machine.maintenance_content_detail) {
      const parsed =
        typeof machine.maintenance_content_detail === "string"
          ? JSON.parse(machine.maintenance_content_detail)
          : machine.maintenance_content_detail;
      contentList = Array.isArray(parsed) ? parsed : [];
    }
  } catch (e) {
    void e;
  }

  const labelSx = {
    fontWeight: 700,
    fontSize: "0.82rem",
    color: "#444",
    minWidth: 160,
    flexShrink: 0,
  };
  const valueSx = { fontSize: "0.82rem", color: "#1a1a2e" };

  const InfoRow = ({ label, value }) => {
    if (!value && value !== 0) return null;
    return (
      <TableRow sx={{ "&:last-child td": { border: 0 } }}>
        <TableCell
          sx={{
            ...labelSx,
            py: 0.6,
            px: 1.5,
            borderRight: "1px solid #e0e0e0",
            bgcolor: "#fafafa",
            width: "40%",
          }}
        >
          {label}
        </TableCell>
        <TableCell sx={{ ...valueSx, py: 0.6, px: 1.5 }}>{value}</TableCell>
      </TableRow>
    );
  };

  const handleExportPdf = () => {
    if (!machine) return;
    const esc = (v) => {
      if (v === null || v === undefined || v === "") return "—";
      return String(v)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    };

    const formattedPrice = machine.price
      ? Number(machine.price).toLocaleString("en-US") + " ₫"
      : "";

    // Section A rows
    const sectionA_info = [
      ["Tên thiết bị", machine.type_machine],
      ["Ký hiệu (Model)", machine.model_machine],
      ["Số máy (Serial)", machine.serial_machine],
      ["Công dụng", machine.attribute_machine],
      ["Nơi chế tạo / Hãng SX", machine.manufacturer],
    ]
      .filter(([, v]) => v || v === 0)
      .map(([l, v]) => `<tr><th>${esc(l)}</th><td>${esc(v)}</td></tr>`)
      .join("");

    const sectionA_spec = [
      ["Công suất (KW/HP)", machine.power],
      ["Áp suất", machine.pressure],
      ["Điện áp", machine.voltage],
      ["Đơn giá gốc (VNĐ)", formattedPrice],
    ]
      .filter(([, v]) => v || v === 0)
      .map(([l, v]) => `<tr><th>${esc(l)}</th><td>${esc(v)}</td></tr>`)
      .join("");

    const specEmpty =
      !machine.power && !machine.pressure && !machine.voltage && !machine.price;

    const contentRows =
      contentList.length > 0
        ? contentList
            .map(
              (item, i) => `
              <tr>
                <td style="text-align:center;width:38px">${i + 1}</td>
                <td>${esc(item.name)}</td>
                <td style="text-align:center;width:90px">
                  ${item.is_check ? "☑" : "☐"}
                </td>
              </tr>`
            )
            .join("")
        : `<tr><td colspan="3" style="text-align:center;font-style:italic;color:#888">Chưa có nội dung bảo dưỡng</td></tr>`;

    // Section C rows — group by year with rowSpan
    let sectionC_html = "";
    if (historyLoading) {
      sectionC_html = `<tr><td colspan="5" style="text-align:center;padding:16px">Đang tải...</td></tr>`;
    } else if (historyRows.length === 0) {
      sectionC_html = `<tr><td colspan="5" style="text-align:center;font-style:italic;color:#888;padding:16px">Chưa có dữ liệu lịch bảo dưỡng</td></tr>`;
    } else {
      const yearGroups = {};
      historyRows.forEach((r) => {
        if (!yearGroups[r.year]) yearGroups[r.year] = [];
        yearGroups[r.year].push(r);
      });
      sectionC_html = historyRows
        .map((row) => {
          const sc =
            MAINT_STATUS_CONFIG[row.status] || MAINT_STATUS_CONFIG.pending;
          const quarter = monthToQuarter(row.month);
          const yearGroup = yearGroups[row.year];
          const isFirstInYear = yearGroup[0] === row;
          const yearCell = isFirstInYear
            ? `<td rowspan="${yearGroup.length}" class="year-cell">${esc(row.year)}</td>`
            : "";
          const updater = row.updater_ten_nv
            ? row.updater_ma_nv
              ? `${row.updater_ma_nv}: ${row.updater_ten_nv}`
              : row.updater_ten_nv
            : "—";
          return `
            <tr>
              ${yearCell}
              <td>${esc(QUARTER_LABELS[quarter])}</td>
              <td>
                <span class="chip" style="background:${sc.bg};color:${sc.color};border:1px solid ${sc.borderColor}">
                  ${esc(sc.label)}
                </span>
              </td>
              <td>${esc(row.updated_at || "—")}</td>
              <td>${esc(updater)}</td>
            </tr>`;
        })
        .join("");
    }

    const html = `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8" />
<title>Lý lịch bảo dưỡng - ${esc(machine.type_machine || "")} ${esc(machine.attribute_machine || "")} - ${esc(machine.serial_machine || "")}</title>
<style>
  @page { size: A4; margin: 14mm 12mm; }
  * { box-sizing: border-box; }
  body {
    font-family: "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif;
    color: #1a1a2e;
    font-size: 12px;
    margin: 0;
    padding: 0;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .page-header {
    background: linear-gradient(135deg,#667eea 0%,#764ba2 100%);
    color: #fff;
    padding: 14px 18px;
    border-radius: 10px;
    margin-bottom: 14px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
  }
  .page-header h1 { margin: 0; font-size: 18px; font-weight: 700; }
  .page-header .sub { font-size: 11px; opacity: 0.9; margin-top: 2px; }
  .status-chip {
    display:inline-block; padding: 3px 10px; border-radius: 12px;
    font-size: 10.5px; font-weight: 700; white-space: nowrap;
  }
  .section {
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    overflow: hidden;
    margin-bottom: 12px;
    page-break-inside: avoid;
  }
  .section-title {
    padding: 7px 12px;
    color: #fff;
    font-weight: 700;
    font-size: 13px;
    letter-spacing: 0.03em;
  }
  .section-title.a { background: linear-gradient(90deg,#667eea,#764ba2); }
  .section-title.b { background: linear-gradient(90deg,#546e7a,#78909c); }
  .section-title.c { background: linear-gradient(90deg,#00897b,#26a69a); }
  .section-body { padding: 10px 12px; }
  .sub-title {
    display:inline-block;
    background: linear-gradient(90deg,#667eea,#764ba2);
    color: #fff;
    padding: 3px 9px;
    border-radius: 5px;
    font-size: 11px;
    font-weight: 700;
    margin: 8px 0 6px 0;
  }
  table { width: 100%; border-collapse: collapse; font-size: 11.5px; }
  table.info th, table.info td {
    border: 1px solid #e0e0e0;
    padding: 5px 9px;
    text-align: left;
    vertical-align: top;
  }
  table.info th {
    background: #fafafa;
    width: 35%;
    font-weight: 600;
    color: #444;
  }
  table.grid th, table.grid td {
    border: 1px solid #e0e0e0;
    padding: 5px 8px;
    text-align: left;
    vertical-align: middle;
  }
  table.grid thead th {
    background: #f5f5f5;
    font-weight: 700;
    color: #555;
    text-align: center;
  }
  .year-cell {
    text-align: center;
    vertical-align: middle;
    font-weight: 700;
    background: #f8f8f8;
  }
  .chip {
    display:inline-block;
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 10.5px;
    font-weight: 700;
    white-space: nowrap;
  }
  .cycle-row { display:flex; gap: 10px; margin: 4px 0 8px 0; }
  .cycle-box {
    flex: 1;
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    padding: 6px 10px;
    text-align: center;
  }
  .cycle-box .label { font-size: 10.5px; color: #666; }
  .cycle-box .value { font-size: 13px; font-weight: 700; margin-top: 2px; }
  .cycle-box.a .value { color: #667eea; }
  .cycle-box.b .value { color: #764ba2; }
  .note-box {
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    padding: 7px 10px;
    white-space: pre-wrap;
    font-size: 11.5px;
  }
  .checkbox-row { display:flex; gap: 24px; padding: 4px 2px 2px 2px; font-size: 11.5px; }
  .checkbox-row .item { display:flex; align-items:center; gap: 6px; }
  .box-empty {
    border: 1px dashed #bdbdbd;
    border-radius: 8px;
    padding: 18px;
    text-align: center;
    color: #999;
    font-style: italic;
  }
  .footer {
    margin-top: 14px;
    font-size: 10px;
    color: #888;
    text-align: right;
  }
  @media print {
    .no-print { display: none !important; }
  }
  .toolbar {
    position: fixed;
    top: 10px; right: 10px;
    display: flex; gap: 8px;
    z-index: 9999;
  }
  .toolbar button {
    background: #667eea; color: #fff;
    border: none; padding: 8px 16px;
    border-radius: 6px; font-weight: 600;
    cursor: pointer; font-size: 13px;
  }
  .toolbar button.secondary { background: #9e9e9e; }
</style>
</head>
<body>
  <div class="toolbar no-print">
    <button onclick="window.print()">In / Lưu PDF</button>
    <button class="secondary" onclick="window.close()">Đóng</button>
  </div>

  <div class="page-header">
    <div>
      <h1>Lý Lịch Bảo Dưỡng Thiết Bị</h1>
      <div class="sub">${machine.type_machine} ${machine.attribute_machine ? machine.attribute_machine : ""}
      ${machine.model_machine ? `· ${machine.model_machine}` : ""}</div>
    </div>
    
  </div>

  <!-- SECTION A -->
  <div class="section">
    <div class="section-title a">A. LÝ LỊCH THIẾT BỊ</div>
    <div class="section-body">
      <div class="sub-title">1. Thông tin cơ bản</div>
      <table class="info">
        <tbody>${sectionA_info || `<tr><td colspan="2" style="text-align:center;color:#888">—</td></tr>`}</tbody>
      </table>

      <div class="sub-title">2. Tình trạng thiết bị</div>
      <div class="checkbox-row">
        <div class="item">${isNew ? "☑" : "☐"} <span${isNew ? ' style="font-weight:700"' : ""}>Mới 100%</span></div>
        <div class="item">${!isNew ? "☑" : "☐"} <span${!isNew ? ' style="font-weight:700"' : ""}>Đã qua sử dụng</span></div>
      </div>

      <div class="sub-title">3. Thông số kỹ thuật thiết bị</div>
      ${
        specEmpty
          ? `<div style="color:#999;font-style:italic;font-size:11.5px;padding:4px 2px">Chưa có thông số kỹ thuật</div>`
          : `<table class="info"><tbody>${sectionA_spec}</tbody></table>`
      }

      <div class="sub-title">4. Quy ước về bảo dưỡng thiết bị</div>
      <div style="padding-left:4px">
        <div style="font-weight:700;font-size:11.5px;color:#555;margin-bottom:4px">a. Lịch xích sửa chữa</div>
        <div style="padding-left:8px">
          <div style="font-size:10.5px;color:#666;font-weight:600;margin-bottom:3px">Chu kỳ sửa chữa:</div>
          <div class="cycle-row">
            <div class="cycle-box a">
              <div class="label">Xem xét bảo dưỡng</div>
              <div class="value">3 tháng</div>
            </div>
            <div class="cycle-box b">
              <div class="label">Bảo trì định kỳ</div>
              <div class="value">5 năm</div>
            </div>
          </div>
          ${
            machine.note
              ? `<div style="font-size:10.5px;color:#666;font-weight:600;margin:4px 0 3px 0">Các lưu ý khác:</div>
                 <div class="note-box">${esc(machine.note)}</div>`
              : ""
          }
        </div>

        <div style="font-weight:700;font-size:11.5px;color:#555;margin:10px 0 4px 0">b. Nội dung xem xét bảo dưỡng</div>
        <table class="grid" style="margin-left:4px;width:calc(100% - 4px)">
          <thead>
            <tr>
              <th style="width:38px">STT</th>
              <th>Nội dung</th>
              <th style="width:90px">Đã kiểm</th>
            </tr>
          </thead>
          <tbody>${contentRows}</tbody>
        </table>
      </div>
    </div>
  </div>

  <!-- SECTION B -->
  <div class="section">
    <div class="section-title b">B. THÔNG TIN ĐƠN VỊ QUẢN LÝ THIẾT BỊ</div>
    <div class="section-body">
      <table class="info">
        <tbody>
          <tr>
            <th>Đơn vị quản lý thiết bị</th>
            <td>CÔNG TY TNHH MAY VIỆT LONG HƯNG</td>
          </tr>
          <tr>
            <th>Ngày bắt đầu sử dụng</th>
            <td>${esc(machine.date_of_use)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- SECTION C -->
  <div class="section">
    <div class="section-title c">C. KIỂM TRA THAY DẦU, HOÁ CHẤT, VỆ SINH ĐỊNH KỲ</div>
    <div class="section-body">
      <table class="grid">
        <thead>
          <tr>
            <th style="width:70px">Năm</th>
            <th style="width:70px">Quý</th>
            <th>Trạng thái</th>
            <th style="width:140px">Ngày cập nhật</th>
            <th>Người cập nhật</th>
          </tr>
        </thead>
        <tbody>${sectionC_html}</tbody>
      </table>
    </div>
  </div>

</body>
</html>`;

    // Tên file PDF mong muốn (trình duyệt lấy từ document.title của trang cha
    // khi in iframe, nên cần tạm đổi title của trang cha)
    const pdfTitle =
      `Lý lịch bảo dưỡng_${machine.type_machine || ""}${machine.attribute_machine ? machine.attribute_machine : ""}_${machine.serial_machine || ""}`
        .replace(/\s+/g, " ")
        .trim();

    // 1. Tạo một iframe ẩn
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "none";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();

    // 2. Đợi nội dung load xong và gọi lệnh in
    iframe.contentWindow.onload = () => {
      // Lưu lại title gốc rồi đổi tạm để tên file PDF đúng theo mong muốn
      const originalTitle = document.title;
      document.title = pdfTitle;
      // Đảm bảo title của iframe cũng khớp (một số trình duyệt đọc cái này)
      try {
        iframe.contentDocument.title = pdfTitle;
      } catch (e) {
        void e;
      }

      iframe.contentWindow.focus();
      iframe.contentWindow.print();

      // 3. Khôi phục title trang cha + xóa iframe
      const cleanup = () => {
        document.title = originalTitle;
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
      };

      // Chrome/Edge bắn sự kiện afterprint trên iframe window
      iframe.contentWindow.onafterprint = cleanup;
      // Dự phòng: đảm bảo title được khôi phục dù trình duyệt không bắn afterprint
      setTimeout(cleanup, 2000);
    };
  };

  const SectionTitle = ({ children }) => (
    <Box
      sx={{ bgcolor: "linear-gradient(90deg,#667eea,#764ba2)", mb: 1, mt: 2 }}
    >
      <Typography
        variant="subtitle2"
        fontWeight={700}
        sx={{
          background: "linear-gradient(90deg,#667eea,#764ba2)",
          color: "#fff",
          px: 1.5,
          py: 0.5,
          borderRadius: "6px",
          fontSize: "0.8rem",
          display: "inline-block",
        }}
      >
        {children}
      </Typography>
    </Box>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { borderRadius: "16px", maxHeight: "90vh" } }}
    >
      <DialogTitle
        sx={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "#fff",
          py: 2,
          px: 3,
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
        >
          <Box>
            <Stack
              direction="row"
              alignItems="center"
              spacing={1.5}
              sx={{ flexWrap: "wrap", gap: 0.75 }}
            >
              <Typography
                variant="h6"
                fontWeight={700}
                sx={{ lineHeight: 1.3 }}
              >
                Lý Lịch Bảo Dưỡng Thiết Bị
              </Typography>
              {(() => {
                const sc =
                  MAINT_STATUS_CONFIG[machine.status] ||
                  MAINT_STATUS_CONFIG.pending;
                const Icon = sc.icon;
                return (
                  <Chip
                    icon={
                      <Icon
                        sx={{
                          fontSize: "14px !important",
                          color: `${sc.color} !important`,
                        }}
                      />
                    }
                    label={sc.label}
                    size="small"
                    sx={{
                      bgcolor: sc.bg,
                      color: sc.color,
                      border: `1px solid ${sc.borderColor}`,
                      fontWeight: 700,
                      fontSize: "0.72rem",
                    }}
                  />
                );
              })()}
            </Stack>
            <Typography variant="caption" sx={{ opacity: 0.85 }}>
              {machine.type_machine} {machine.attribute_machine}
              {machine.model_machine ? `· ${machine.model_machine}` : ""}
            </Typography>
          </Box>
          <IconButton onClick={onClose} sx={{ color: "#fff" }}>
            <Close />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ p: 3, bgcolor: "#f8f9fc" }}>
        {/* ── Section A: Lý lịch thiết bị ── */}
        <Paper
          elevation={0}
          sx={{
            border: "1px solid #e0e0e0",
            borderRadius: "12px",
            overflow: "hidden",
            mb: 2,
            mt: 2,
          }}
        >
          <Box
            sx={{
              background: "linear-gradient(90deg,#667eea,#764ba2)",
              px: 2,
              py: 1,
            }}
          >
            <Typography
              variant="subtitle1"
              fontWeight={700}
              sx={{ color: "#fff", letterSpacing: "0.03em" }}
            >
              A. LÝ LỊCH THIẾT BỊ
            </Typography>
          </Box>

          <Box sx={{ p: 2 }}>
            {/* 1. Tên & định danh */}
            <SectionTitle>1. Thông tin cơ bản</SectionTitle>
            <Table
              size="small"
              sx={{
                border: "1px solid #e0e0e0",
                borderRadius: "8px",
                overflow: "hidden",
                mb: 1,
              }}
            >
              <TableBody>
                <InfoRow label="Tên thiết bị" value={machine.type_machine} />
                <InfoRow
                  label="Ký hiệu (Model)"
                  value={machine.model_machine}
                />
                <InfoRow
                  label="Số máy (Serial)"
                  value={machine.serial_machine}
                />
                <InfoRow label="Công dụng" value={machine.attribute_machine} />
                <InfoRow
                  label="Nơi chế tạo / Hãng SX"
                  value={machine.manufacturer}
                />
              </TableBody>
            </Table>

            {/* 5. Tình trạng thiết bị */}
            <SectionTitle>2. Tình trạng thiết bị</SectionTitle>
            <Box sx={{ px: 1, py: 0.5, mb: 1 }}>
              <Stack direction="row" spacing={3}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={isNew}
                      onChange={() => setIsNew(true)}
                      sx={{
                        color: "#667eea",
                        "&.Mui-checked": { color: "#667eea" },
                      }}
                    />
                  }
                  label={
                    <Typography
                      sx={{
                        fontSize: "0.85rem",
                        fontWeight: isNew ? 700 : 400,
                      }}
                    >
                      Mới 100%
                    </Typography>
                  }
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={!isNew}
                      onChange={() => setIsNew(false)}
                      sx={{
                        color: "#764ba2",
                        "&.Mui-checked": { color: "#764ba2" },
                      }}
                    />
                  }
                  label={
                    <Typography
                      sx={{
                        fontSize: "0.85rem",
                        fontWeight: !isNew ? 700 : 400,
                      }}
                    >
                      Đã qua sử dụng
                    </Typography>
                  }
                />
              </Stack>
            </Box>

            {/* 6. Thông số kỹ thuật */}
            <SectionTitle>3. Thông số kỹ thuật thiết bị</SectionTitle>
            <Table
              size="small"
              sx={{
                border: "1px solid #e0e0e0",
                borderRadius: "8px",
                overflow: "hidden",
                mb: 1,
              }}
            >
              <TableBody>
                <InfoRow label="Công suất (KW/HP)" value={machine.power} />
                <InfoRow label="Áp suất" value={machine.pressure} />
                <InfoRow label="Điện áp" value={machine.voltage} />
                <InfoRow
                  label="Đơn giá gốc (VNĐ)"
                  value={
                    machine.price
                      ? Number(machine.price).toLocaleString("en-US") + " ₫"
                      : null
                  }
                />
              </TableBody>
            </Table>
            {!machine.power &&
              !machine.pressure &&
              !machine.voltage &&
              !machine.price && (
                <Typography
                  variant="caption"
                  color="text.disabled"
                  sx={{ pl: 1 }}
                >
                  Chưa có thông số kỹ thuật
                </Typography>
              )}

            {/* 7. Quy ước bảo dưỡng */}
            <SectionTitle>4. Quy ước về bảo dưỡng thiết bị</SectionTitle>

            {/* 7a. Lịch xích sửa chữa */}
            <Box sx={{ pl: 1, mb: 1.5 }}>
              <Typography
                variant="body2"
                fontWeight={700}
                sx={{ mb: 0.75, fontSize: "0.8rem", color: "#555" }}
              >
                a. Lịch xích sửa chữa
              </Typography>
              <Box sx={{ pl: 1 }}>
                <Typography
                  variant="caption"
                  fontWeight={600}
                  color="text.secondary"
                  sx={{ display: "block", mb: 0.5 }}
                >
                  Chu kỳ sửa chữa:
                </Typography>
                <Stack direction="row" spacing={2} sx={{ pl: 1, mb: 1 }}>
                  <Paper
                    variant="outlined"
                    sx={{
                      px: 1.5,
                      py: 0.75,
                      borderRadius: "8px",
                      flex: 1,
                      textAlign: "center",
                    }}
                  >
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: "block" }}
                    >
                      Xem xét bảo dưỡng
                    </Typography>
                    <Typography
                      variant="body2"
                      fontWeight={700}
                      color="#667eea"
                    >
                      3 tháng
                    </Typography>
                  </Paper>
                  <Paper
                    variant="outlined"
                    sx={{
                      px: 1.5,
                      py: 0.75,
                      borderRadius: "8px",
                      flex: 1,
                      textAlign: "center",
                    }}
                  >
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: "block" }}
                    >
                      Bảo trì định kỳ
                    </Typography>
                    <Typography
                      variant="body2"
                      fontWeight={700}
                      color="#764ba2"
                    >
                      5 năm
                    </Typography>
                  </Paper>
                </Stack>

                {machine.note && (
                  <Box sx={{ pl: 1 }}>
                    <Typography
                      variant="caption"
                      fontWeight={600}
                      color="text.secondary"
                      sx={{ display: "block", mb: 0.5 }}
                    >
                      Các lưu ý khác:
                    </Typography>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 1.25,
                        borderRadius: "8px",
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{ fontSize: "0.82rem", whiteSpace: "pre-wrap" }}
                      >
                        {machine.note}
                      </Typography>
                    </Paper>
                  </Box>
                )}
              </Box>
            </Box>

            {/* 7b. Nội dung xem xét bảo dưỡng */}
            <Box sx={{ pl: 1 }}>
              <Typography
                variant="body2"
                fontWeight={700}
                sx={{ mb: 0.75, fontSize: "0.8rem", color: "#555" }}
              >
                b. Nội dung xem xét bảo dưỡng
              </Typography>
              {contentList.length > 0 ? (
                <Stack spacing={0.5} sx={{ pl: 1 }}>
                  {contentList.map((item, idx) => (
                    <Stack
                      key={idx}
                      direction="row"
                      spacing={1}
                      alignItems="flex-start"
                    >
                      <CheckCircle
                        sx={{
                          fontSize: 14,
                          mt: 0.25,
                          color: item.is_check ? "#2e7d32" : "#bdbdbd",
                          flexShrink: 0,
                        }}
                      />
                      <Typography
                        variant="body2"
                        sx={{
                          fontSize: "0.82rem",
                          color: item.is_check ? "#2e7d32" : "text.primary",
                          textDecoration: item.is_check
                            ? "line-through"
                            : "none",
                        }}
                      >
                        {item.name}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              ) : (
                <Typography
                  variant="caption"
                  color="text.disabled"
                  sx={{ pl: 1 }}
                >
                  Chưa có nội dung bảo dưỡng
                </Typography>
              )}
            </Box>
          </Box>
        </Paper>

        {/* ── Section B: Thông tin đơn vị quản lý thiết bị ── */}
        <Paper
          elevation={0}
          sx={{
            border: "1px solid #e0e0e0",
            borderRadius: "12px",
            overflow: "hidden",
            mb: 2,
          }}
        >
          <Box
            sx={{
              background: "linear-gradient(90deg,#546e7a,#78909c)",
              px: 2,
              py: 1,
            }}
          >
            <Typography
              variant="subtitle1"
              fontWeight={700}
              sx={{ color: "#fff", letterSpacing: "0.03em" }}
            >
              B. THÔNG TIN ĐƠN VỊ QUẢN LÝ THIẾT BỊ
            </Typography>
          </Box>

          <Box sx={{ p: 2 }}>
            <Table
              size="small"
              sx={{
                border: "1px solid #e0e0e0",
                borderRadius: "8px",
                overflow: "hidden",
              }}
            >
              <TableBody>
                <InfoRow
                  label="Đơn vị quản lý thiết bị"
                  value="CÔNG TY TNHH MAY VIỆT LONG HƯNG"
                />
                <InfoRow
                  label="Ngày bắt đầu sử dụng"
                  value={machine.date_of_use}
                />
              </TableBody>
            </Table>
          </Box>
        </Paper>

        {/* ── Section C: Bảng tổng hợp lịch bảo dưỡng ── */}
        <Paper
          elevation={0}
          sx={{
            border: "1px solid #e0e0e0",
            borderRadius: "12px",
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              background: "linear-gradient(90deg,#00897b,#26a69a)",
              px: 2,
              py: 1,
            }}
          >
            <Typography
              variant="subtitle1"
              fontWeight={700}
              sx={{ color: "#fff", letterSpacing: "0.03em" }}
            >
              C. KIỂM TRA THAY DẦU, HOÁ CHẤT, VỆ SINH ĐỊNH KỲ
            </Typography>
          </Box>

          {historyLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
              <CircularProgress size={28} sx={{ color: "#00897b" }} />
            </Box>
          ) : historyRows.length === 0 ? (
            <Box sx={{ py: 3, textAlign: "center" }}>
              <Typography
                variant="caption"
                color="text.disabled"
                fontStyle="italic"
              >
                Chưa có dữ liệu lịch bảo dưỡng
              </Typography>
            </Box>
          ) : (
            <Box sx={{ overflowX: "auto" }}>
              <Table size="small">
                <TableBody>
                  {/* Header row */}
                  <TableRow sx={{ bgcolor: "#f5f5f5" }}>
                    {[
                      "Năm",
                      "Quý",
                      "Trạng thái",
                      "Ngày cập nhật",
                      "Người cập nhật",
                    ].map((col) => (
                      <TableCell
                        key={col}
                        sx={{
                          fontWeight: 700,
                          fontSize: "0.78rem",
                          color: "#555",
                          borderBottom: "2px solid #e0e0e0",
                          py: 0.75,
                          px: 1.5,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {col}
                      </TableCell>
                    ))}
                  </TableRow>

                  {/* Data rows grouped by year */}
                  {(() => {
                    // Group by year for row-span rendering
                    const yearGroups = {};
                    historyRows.forEach((r) => {
                      if (!yearGroups[r.year]) yearGroups[r.year] = [];
                      yearGroups[r.year].push(r);
                    });

                    return historyRows.map((row, idx) => {
                      const isCurrentRecord =
                        row.uuid_maintenance_schedule_detail ===
                        machine?.uuid_maintenance_schedule_detail;
                      const sc =
                        MAINT_STATUS_CONFIG[row.status] ||
                        MAINT_STATUS_CONFIG.pending;
                      const Icon = sc.icon;
                      const quarter = monthToQuarter(row.month);
                      const yearGroup = yearGroups[row.year];
                      const isFirstInYear = yearGroup[0] === row;

                      return (
                        <TableRow
                          key={row.uuid_maintenance_schedule_detail}
                          sx={{
                            bgcolor: isCurrentRecord
                              ? alpha(sc.color, 0.06)
                              : idx % 2 === 0
                                ? "#fff"
                                : "#fafafa",
                          }}
                        >
                          {/* Năm — rowSpan cho nhóm cùng năm */}
                          {isFirstInYear && (
                            <TableCell
                              rowSpan={yearGroup.length}
                              sx={{
                                fontWeight: 700,
                                fontSize: "0.82rem",
                                color: "#1a1a2e",
                                verticalAlign: "middle",
                                textAlign: "center",
                                px: 1.5,
                                borderRight: "1px solid #e0e0e0",
                                bgcolor: "#f8f8f8",
                              }}
                            >
                              {row.year}
                            </TableCell>
                          )}

                          {/* Quý */}
                          <TableCell
                            sx={{
                              px: 1.5,
                              py: 0.75,
                              fontSize: "0.8rem",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {QUARTER_LABELS[quarter]}
                          </TableCell>

                          {/* Trạng thái */}
                          <TableCell sx={{ px: 1.5, py: 0.75 }}>
                            <Chip
                              icon={
                                <Icon
                                  sx={{
                                    fontSize: "12px !important",
                                    color: `${sc.color} !important`,
                                  }}
                                />
                              }
                              label={sc.label}
                              size="small"
                              sx={{
                                bgcolor: sc.bg,
                                color: sc.color,
                                border: `1px solid ${sc.borderColor}`,
                                fontWeight: 700,
                                fontSize: "0.7rem",
                                height: 20,
                                "& .MuiChip-label": { px: 0.75 },
                                "& .MuiChip-icon": { ml: 0.5 },
                              }}
                            />
                          </TableCell>

                          {/* Ngày cập nhật */}
                          <TableCell
                            sx={{
                              px: 1.5,
                              py: 0.75,
                              fontSize: "0.78rem",
                              color: "text.secondary",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {row.updated_at || "—"}
                          </TableCell>

                          {/* Người cập nhật */}
                          <TableCell
                            sx={{
                              px: 1.5,
                              py: 0.75,
                              fontSize: "0.78rem",
                              color: "text.secondary",
                            }}
                          >
                            {row.updater_ten_nv
                              ? row.updater_ma_nv
                                ? `${row.updater_ma_nv}: ${row.updater_ten_nv}`
                                : row.updater_ten_nv
                              : "—"}
                          </TableCell>
                        </TableRow>
                      );
                    });
                  })()}
                </TableBody>
              </Table>
            </Box>
          )}
        </Paper>
      </DialogContent>

      <DialogActions
        sx={{
          px: 3,
          py: 2,
          borderTop: "1px solid #e0e0e0",
          justifyContent: "space-between",
        }}
      >
        {/* Status toggle */}
        {(() => {
          const isCompleted = machine.status === "completed";
          return (
            <Button
              variant="outlined"
              startIcon={
                statusUpdating ? (
                  <CircularProgress size={14} />
                ) : isCompleted ? (
                  <HourglassEmpty />
                ) : (
                  <TaskAlt />
                )
              }
              onClick={handleToggleStatus}
              disabled={statusUpdating}
              sx={{
                borderRadius: "10px",
                borderColor: isCompleted ? "#e65100" : "#2e7d32",
                color: isCompleted ? "#e65100" : "#2e7d32",
                "&:hover": {
                  borderColor: isCompleted ? "#bf360c" : "#1b5e20",
                  bgcolor: isCompleted ? "#fff3e0" : "#e8f5e9",
                },
                fontWeight: 600,
              }}
            >
              {isCompleted ? "Đánh dấu chưa thực hiện" : "Đánh dấu hoàn thành"}
            </Button>
          );
        })()}
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<PictureAsPdf />}
            onClick={handleExportPdf}
            sx={{
              borderRadius: "10px",
              borderColor: "#c62828",
              color: "#c62828",
              "&:hover": {
                borderColor: "#8e0000",
                bgcolor: "#ffebee",
              },
              fontWeight: 600,
            }}
          >
            Xuất PDF
          </Button>
          <Button
            onClick={onClose}
            variant="contained"
            sx={{
              borderRadius: "10px",
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              px: 3,
            }}
          >
            Đóng
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
};

// ==================== MachineCard Component ====================
const MachineCard = React.memo(({ machine, onClick }) => {
  const statusCfg = STATUS_CONFIG[machine.current_status] || {
    label: machine.current_status || "N/A",
    color: "#757575",
    bg: "#f5f5f5",
  };
  const maintStatusCfg =
    MAINT_STATUS_CONFIG[machine.status] || MAINT_STATUS_CONFIG.pending;
  const MaintIcon = maintStatusCfg.icon;

  let contentList = [];
  try {
    if (machine.maintenance_content_detail) {
      const parsed =
        typeof machine.maintenance_content_detail === "string"
          ? JSON.parse(machine.maintenance_content_detail)
          : machine.maintenance_content_detail;
      contentList = Array.isArray(parsed) ? parsed : [];
    }
  } catch (e) {
    void e;
  }

  return (
    <Card
      elevation={1}
      onClick={onClick}
      sx={{
        borderRadius: "16px",
        border: `1px solid ${machine.status === "completed" ? "#a5d6a7" : "rgba(0,0,0,0.08)"}`,
        borderLeft: `4px solid ${maintStatusCfg.color}`,
        transition: "all 0.2s ease",
        height: "100%",
        cursor: "pointer",
        bgcolor: machine.status === "completed" ? "#f9fff9" : "#fff",
        "&:hover": {
          boxShadow: "0 4px 20px rgba(102,126,234,0.2)",
          transform: "translateY(-2px)",
          borderColor: `${maintStatusCfg.color}66`,
          borderLeftColor: maintStatusCfg.color,
        },
      }}
    >
      <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
        {/* Header */}
        <Stack
          direction="row"
          alignItems="flex-start"
          justifyContent="space-between"
          spacing={1}
          sx={{ mb: 1 }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="subtitle2"
              fontWeight={700}
              sx={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                fontSize: "0.85rem",
                color: "#1a1a2e",
              }}
            >
              {machine.type_machine}
            </Typography>
            <Typography
              variant="subtitle2"
              fontWeight={700}
              sx={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                fontSize: "0.85rem",
                color: "#1a1a2e",
              }}
            >
              {machine.attribute_machine}
            </Typography>
            {machine.model_machine && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  display: "block",
                }}
              >
                {machine.model_machine}
              </Typography>
            )}
          </Box>
          <Chip
            label={statusCfg.label}
            size="small"
            sx={{
              fontSize: "0.65rem",
              height: 20,
              bgcolor: statusCfg.bg,
              color: statusCfg.color,
              fontWeight: 600,
              flexShrink: 0,
            }}
          />
        </Stack>

        <Divider sx={{ mb: 1 }} />

        {/* Info rows */}
        <Stack spacing={0.5}>
          {machine.serial_machine && (
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ minWidth: 45, flexShrink: 0 }}
              >
                Serial:
              </Typography>
              <Typography
                variant="caption"
                fontWeight={600}
                sx={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {machine.serial_machine}
              </Typography>
            </Stack>
          )}
          {machine.name_location && (
            <Stack direction="row" spacing={0.5} alignItems="center">
              <LocationOn
                sx={{ fontSize: 12, color: "text.secondary", flexShrink: 0 }}
              />
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {machine.name_location}
                {machine.name_department ? ` · ${machine.name_department}` : ""}
              </Typography>
            </Stack>
          )}
          {machine.manufacturer && (
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ minWidth: 45, flexShrink: 0 }}
              >
                Hãng:
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {machine.manufacturer}
              </Typography>
            </Stack>
          )}
        </Stack>

        {/* Maintenance content */}
        {contentList.length > 0 && (
          <Box sx={{ mt: 1 }}>
            <Divider sx={{ mb: 0.75 }} />
            <Typography
              variant="caption"
              color="text.secondary"
              fontWeight={600}
              sx={{ display: "block", mb: 0.5 }}
            >
              Nội dung bảo dưỡng:
            </Typography>
            <Stack spacing={0.3}>
              {contentList.slice(0, 3).map((item, idx) => (
                <Stack
                  key={idx}
                  direction="row"
                  spacing={0.5}
                  alignItems="center"
                >
                  <CheckCircle
                    sx={{
                      fontSize: 11,
                      color: item.is_check ? "#2e7d32" : "#bdbdbd",
                      flexShrink: 0,
                    }}
                  />
                  <Typography
                    variant="caption"
                    sx={{
                      color: item.is_check ? "#2e7d32" : "text.secondary",
                      textDecoration: item.is_check ? "line-through" : "none",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      fontSize: "0.7rem",
                    }}
                  >
                    {item.name}
                  </Typography>
                </Stack>
              ))}
              {contentList.length > 3 && (
                <Typography
                  variant="caption"
                  color="primary"
                  sx={{ fontSize: "0.7rem" }}
                >
                  +{contentList.length - 3} nội dung khác
                </Typography>
              )}
            </Stack>
          </Box>
        )}

        {/* Date badge + maintenance status */}
        <Box sx={{ mt: 1, pt: 0.75, borderTop: "1px dashed #e0e0e0" }}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
          >
            <Typography
              variant="caption"
              sx={{ color: "#667eea", fontWeight: 700, fontSize: "0.75rem" }}
            >
              Ngày {machine.day}/{machine.month}/{machine.year}
            </Typography>
            <Chip
              icon={
                <MaintIcon
                  sx={{
                    fontSize: "11px !important",
                    color: `${maintStatusCfg.color} !important`,
                  }}
                />
              }
              label={maintStatusCfg.label}
              size="small"
              sx={{
                height: 18,
                fontSize: "0.62rem",
                fontWeight: 700,
                bgcolor: maintStatusCfg.bg,
                color: maintStatusCfg.color,
                border: `1px solid ${maintStatusCfg.borderColor}`,
                "& .MuiChip-label": { px: 0.75 },
                "& .MuiChip-icon": { ml: 0.5 },
              }}
            />
          </Stack>
        </Box>
      </CardContent>
    </Card>
  );
});

// ==================== CalendarCard Component ====================
const CalendarCard = ({
  year,
  month,
  scheduleData,
  selectedDay,
  onDayClick,
}) => {
  // Build day-count map from (already department/location filtered) data
  const dayCountMap = {};
  scheduleData.forEach((item) => {
    dayCountMap[item.day] = (dayCountMap[item.day] || 0) + 1;
  });

  const daysInMonth = new Date(year, month, 0).getDate();
  const rawFirstDay = new Date(year, month - 1, 1).getDay();
  const firstDayOfWeek = (rawFirstDay + 6) % 7; // Mon=0 … Sun=6

  const today = new Date();
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth() + 1;
  const todayDay = today.getDate();

  const cells = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const isToday = (d) =>
    d === todayDay && month === todayMonth && year === todayYear;

  const getCountColor = (count) => {
    if (!count) return null;
    if (count >= 10) return "#d32f2f";
    if (count >= 5) return "#f57c00";
    return "#667eea";
  };

  return (
    <Box>
      {/* Day-of-week headers */}
      <Grid container columns={7} sx={{ mb: 0.5 }}>
        {DAY_OF_WEEK.map((d, i) => (
          <Grid key={d} size={1}>
            <Box
              sx={{
                textAlign: "center",
                py: 0.5,
                color: i === 6 ? "#e53935" : "text.secondary",
                fontWeight: 600,
                fontSize: "0.78rem",
              }}
            >
              {d}
            </Box>
          </Grid>
        ))}
      </Grid>

      {/* Day cells */}
      <Grid container columns={7} spacing={0.5}>
        {cells.map((day, idx) => {
          if (!day)
            return (
              <Grid key={`empty-${idx}`} size={1}>
                <Box sx={{ aspectRatio: "1", minHeight: 40 }} />
              </Grid>
            );

          const count = dayCountMap[day] || 0;
          const isSelected = selectedDay === day;
          const isSunday = (firstDayOfWeek + day - 1) % 7 === 6;
          const countColor = getCountColor(count);

          return (
            <Grid key={day} size={1}>
              <Box
                onClick={() => onDayClick(day)}
                sx={{
                  aspectRatio: "1",
                  minHeight: 40,
                  borderRadius: "10px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: count > 0 ? "pointer" : "default",
                  border: isSelected
                    ? "2px solid #667eea"
                    : isToday(day)
                      ? "2px solid #764ba2"
                      : "1px solid transparent",
                  bgcolor: isSelected
                    ? "rgba(102,126,234,0.12)"
                    : count > 0
                      ? alpha(countColor, 0.07)
                      : "transparent",
                  transition: "all 0.15s ease",
                  "&:hover":
                    count > 0
                      ? {
                          bgcolor: alpha(countColor, 0.15),
                          border: `2px solid ${countColor}`,
                          transform: "scale(1.05)",
                        }
                      : {},
                }}
              >
                <Typography
                  variant="body2"
                  fontWeight={isToday(day) || isSelected ? 700 : 400}
                  sx={{
                    fontSize: "0.8rem",
                    color: isSelected
                      ? "#667eea"
                      : isToday(day)
                        ? "#764ba2"
                        : isSunday
                          ? "#e53935"
                          : "text.primary",
                    lineHeight: 1.2,
                  }}
                >
                  {day}
                </Typography>
                {count > 0 && (
                  <Typography
                    variant="caption"
                    sx={{
                      fontSize: "0.6rem",
                      fontWeight: 700,
                      color: countColor,
                      lineHeight: 1,
                    }}
                  >
                    {count}
                  </Typography>
                )}
              </Box>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
};

// ==================== GroupedByDay Component ====================
const GroupedByDay = ({
  machines,
  onDaySelect,
  currentYear,
  currentMonth,
  vnToday,
  onCardClick,
}) => {
  const grouped = useMemo(() => {
    const res = {};
    machines.forEach((m) => {
      if (!res[m.day]) res[m.day] = [];
      res[m.day].push(m);
    });
    return res;
  }, [machines]);

  const sortedDays = useMemo(
    () =>
      Object.keys(grouped)
        .map(Number)
        .sort((a, b) => a - b),
    [grouped]
  );

  const isToday = (day) =>
    day === vnToday.getDate() &&
    currentMonth === vnToday.getMonth() + 1 &&
    currentYear === vnToday.getFullYear();

  const isPast = (day) => {
    const d = new Date(currentYear, currentMonth - 1, day);
    d.setHours(23, 59, 59);
    return d < vnToday;
  };

  return (
    <Stack spacing={3}>
      {sortedDays.map((day) => {
        const dayMachines = grouped[day];
        const isT = isToday(day);
        const isP = isPast(day);

        return (
          <Box key={day}>
            <Stack
              direction="row"
              alignItems="center"
              spacing={1.5}
              sx={{ mb: 1.5 }}
            >
              <Box
                onClick={() => onDaySelect(day)}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 40,
                  height: 40,
                  borderRadius: "12px",
                  background: isT
                    ? "linear-gradient(45deg, #667eea, #764ba2)"
                    : isP
                      ? "#f5f5f5"
                      : "rgba(102,126,234,0.1)",
                  cursor: "pointer",
                  flexShrink: 0,
                  transition: "all 0.15s ease",
                  "&:hover": {
                    transform: "scale(1.08)",
                    boxShadow: "0 2px 8px rgba(102,126,234,0.3)",
                  },
                }}
              >
                <Typography
                  variant="body2"
                  fontWeight={700}
                  sx={{ color: isT ? "#fff" : isP ? "#9e9e9e" : "#667eea" }}
                >
                  {day}
                </Typography>
              </Box>

              <Box sx={{ flex: 1 }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Typography
                    variant="subtitle2"
                    fontWeight={700}
                    sx={{
                      color: isT ? "#667eea" : isP ? "#9e9e9e" : "inherit",
                    }}
                  >
                    Ngày {day}/{currentMonth}/{currentYear}
                  </Typography>
                  {isT && (
                    <Chip
                      label="Hôm nay"
                      size="small"
                      sx={{
                        height: 18,
                        fontSize: "0.65rem",
                        bgcolor: "rgba(102,126,234,0.12)",
                        color: "#667eea",
                        fontWeight: 700,
                      }}
                    />
                  )}
                  {isP && !isT && (
                    <Chip
                      label="Đã qua"
                      size="small"
                      sx={{
                        height: 18,
                        fontSize: "0.65rem",
                        bgcolor: "#f5f5f5",
                        color: "#9e9e9e",
                      }}
                    />
                  )}
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  {dayMachines.length} máy cần bảo dưỡng
                </Typography>
              </Box>

              <Divider sx={{ flex: 1 }} />
            </Stack>

            <Grid container spacing={2} sx={{ pl: 1 }}>
              {grouped[day].map((machine, idx) => (
                <Grid
                  key={machine.uuid_maintenance_schedule_detail || idx}
                  size={{ xs: 12, sm: 6, md: 4, lg: 3 }}
                >
                  <MachineCard
                    machine={machine}
                    onClick={() => onCardClick && onCardClick(machine)}
                  />
                </Grid>
              ))}
            </Grid>
          </Box>
        );
      })}
    </Stack>
  );
};

// ==================== Filter helpers ====================
const FILTER_INPUT_SX = {
  "& .MuiOutlinedInput-root": { borderRadius: "10px", fontSize: "0.82rem" },
};

const FilterSelect = ({ value, onChange, options, placeholder, icon }) => (
  <Autocomplete
    value={value}
    onChange={onChange}
    options={options}
    size="small"
    renderInput={(params) => (
      <TextField
        {...params}
        placeholder={placeholder}
        sx={FILTER_INPUT_SX}
        InputProps={{
          ...params.InputProps,
          startAdornment: (
            <>
              {icon}
              {params.InputProps.startAdornment}
            </>
          ),
        }}
      />
    )}
    renderOption={(props, option) => (
      <Box component="li" {...props} sx={{ fontSize: "0.82rem" }}>
        {option}
      </Box>
    )}
    noOptionsText="Không có dữ liệu"
  />
);

const FilterGroup = ({ label, children }) => (
  <Box sx={{ mb: 1.5 }}>
    <Typography
      variant="caption"
      color="text.disabled"
      sx={{
        display: "block",
        mb: 0.5,
        fontSize: "0.7rem",
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.04em",
      }}
    >
      {label}
    </Typography>
    <Stack spacing={0.75}>{children}</Stack>
  </Box>
);

// ==================== Main Page ====================
const MaintenanceSchedulePage = () => {
  const isMobile = useMediaQuery(useTheme().breakpoints.down("sm"));

  const today = new Date();
  const vnToday = new Date(
    today.toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" })
  );

  // ── Data & month state ──
  const [currentYear, setCurrentYear] = useState(vnToday.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(vnToday.getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState(null);
  const [scheduleData, setScheduleData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ── Filter state ──
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDepartment, setFilterDepartment] = useState(null);
  const [filterLocation, setFilterLocation] = useState(null);
  const [filterType, setFilterType] = useState(null);
  const [filterAttribute, setFilterAttribute] = useState(null);
  const [filterModel, setFilterModel] = useState(null);
  const [filterManufacturer, setFilterManufacturer] = useState(null);
  const [filterSupplier, setFilterSupplier] = useState(null);
  const [filterStatus, setFilterStatus] = useState(null); // null | 'pending' | 'completed'

  // ── Maintenance history dialog ──
  const [historyDialogMachine, setHistoryDialogMachine] = useState(null);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);

  // ── Mobile calendar drawer ──
  const [calendarDrawerOpen, setCalendarDrawerOpen] = useState(false);

  // ── RFID lookup ──
  const [rfidDialogOpen, setRfidDialogOpen] = useState(false);
  const [rfidInput, setRfidInput] = useState("");
  const [rfidLoading, setRfidLoading] = useState(false);
  const [rfidError, setRfidError] = useState(null);
  const [rfidWarning, setRfidWarning] = useState(null);

  const handleOpenRfidDialog = () => {
    setRfidDialogOpen(true);
    setRfidInput("");
    setRfidError(null);
    setRfidWarning(null);
  };

  const handleCloseRfidDialog = () => {
    setRfidDialogOpen(false);
    setRfidInput("");
    setRfidError(null);
    setRfidWarning(null);
  };

  const handleCardClick = (machine) => {
    setHistoryDialogMachine(machine);
    setHistoryDialogOpen(true);
  };

  const handleCloseHistoryDialog = () => {
    setHistoryDialogOpen(false);
  };

  const RFID_LENGTH = 24;

  const handleRfidLookup = async (overrideCode) => {
    const code = (overrideCode ?? rfidInput).trim();
    if (!code || rfidLoading) return;
    setRfidLoading(true);
    setRfidError(null);
    setRfidWarning(null);
    try {
      const res = await api.maintenance.getMachineByRfid(code);
      if (res.success && res.data) {
        setHistoryDialogMachine(res.data);
        setHistoryDialogOpen(true);
        setRfidDialogOpen(false);
        setRfidInput("");
      } else {
        setRfidError(res.message || "Không tìm thấy máy");
      }
    } catch (err) {
      const data = err?.response?.data;
      // Phân biệt: chưa có lịch / chưa có nội dung → cảnh báo (warning)
      // Còn lại (không tìm thấy máy, lỗi server) → lỗi (error)
      if (data?.code === "NO_SCHEDULE" || data?.code === "NO_CONTENT") {
        setRfidWarning({
          code: data.code,
          message: data.message,
          machine: data.machine,
        });
      } else {
        setRfidError(data?.message || `Không tìm thấy máy với mã "${code}"`);
      }
    } finally {
      setRfidLoading(false);
    }
  };

  const handleStatusChange = (uuid, newStatus, result) => {
    const patch = {
      status: newStatus,
      ...(result?.maintenance_content_detail
        ? { maintenance_content_detail: result.maintenance_content_detail }
        : {}),
    };
    setScheduleData((prev) =>
      prev.map((item) =>
        item.uuid_maintenance_schedule_detail === uuid
          ? { ...item, ...patch }
          : item
      )
    );
    setHistoryDialogMachine((prev) =>
      prev && prev.uuid_maintenance_schedule_detail === uuid
        ? { ...prev, ...patch }
        : prev
    );
  };

  // ── Scroll-to-top FAB ──
  const [showScrollTop, setShowScrollTop] = useState(false);
  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 500);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // ── Lock body scroll + close on Esc when mobile calendar drawer is open ──
  useEffect(() => {
    if (!isMobile || !calendarDrawerOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleEsc = (e) => {
      if (e.key === "Escape") setCalendarDrawerOpen(false);
    };
    window.addEventListener("keydown", handleEsc);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleEsc);
    };
  }, [isMobile, calendarDrawerOpen]);

  // Auto-close the mobile drawer if viewport resizes back to desktop
  useEffect(() => {
    if (!isMobile && calendarDrawerOpen) setCalendarDrawerOpen(false);
  }, [isMobile, calendarDrawerOpen]);

  // ── Fetch ──
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.maintenance.getScheduleDetail({
        year: currentYear,
        month: currentMonth,
      });
      if (res.success) {
        setScheduleData(res.data || []);
      } else {
        setError(res.message || "Lỗi tải dữ liệu");
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Không thể kết nối đến server");
    } finally {
      setLoading(false);
    }
  }, [currentYear, currentMonth]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const resetAllFilters = () => {
    setFilterDepartment(null);
    setFilterLocation(null);
    setFilterType(null);
    setFilterAttribute(null);
    setFilterModel(null);
    setFilterManufacturer(null);
    setFilterSupplier(null);
    setFilterStatus(null);
  };

  // Reset filters + day when month changes
  const handlePrevMonth = () => {
    setSelectedDay(null);
    resetAllFilters();
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    setSelectedDay(null);
    resetAllFilters();
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleGoToday = () => {
    setSelectedDay(vnToday.getDate());
    setCurrentYear(vnToday.getFullYear());
    setCurrentMonth(vnToday.getMonth() + 1);
  };

  const handleDayClick = (day) => {
    setSelectedDay((prev) => (prev === day ? null : day));
  };

  // ── Derive unique options (cascading) ──
  const allDepartments = [
    ...new Set(scheduleData.map((i) => i.name_department).filter(Boolean)),
  ].sort();

  const allLocations = [
    ...new Set(
      scheduleData
        .filter(
          (i) => !filterDepartment || i.name_department === filterDepartment
        )
        .map((i) => i.name_location)
        .filter(Boolean)
    ),
  ].sort();

  const allTypes = [
    ...new Set(scheduleData.map((i) => i.type_machine).filter(Boolean)),
  ].sort();

  const allAttributes = [
    ...new Set(
      scheduleData
        .filter((i) => !filterType || i.type_machine === filterType)
        .map((i) => i.attribute_machine)
        .filter(Boolean)
    ),
  ].sort();

  const allModels = [
    ...new Set(
      scheduleData
        .filter((i) => !filterType || i.type_machine === filterType)
        .filter(
          (i) => !filterAttribute || i.attribute_machine === filterAttribute
        )
        .map((i) => i.model_machine)
        .filter(Boolean)
    ),
  ].sort();

  const allManufacturers = [
    ...new Set(scheduleData.map((i) => i.manufacturer).filter(Boolean)),
  ].sort();

  const allSuppliers = [
    ...new Set(scheduleData.map((i) => i.supplier).filter(Boolean)),
  ].sort();

  // Cascade resets
  const handleDepartmentChange = (_, value) => {
    setFilterDepartment(value);
    setFilterLocation(null);
  };

  const handleTypeChange = (_, value) => {
    setFilterType(value);
    setFilterAttribute(null);
    setFilterModel(null);
  };

  const handleAttributeChange = (_, value) => {
    setFilterAttribute(value);
    setFilterModel(null);
  };

  const hasActiveFilter =
    filterDepartment ||
    filterLocation ||
    filterType ||
    filterAttribute ||
    filterModel ||
    filterManufacturer ||
    filterSupplier ||
    filterStatus;

  const clearFilters = () => {
    resetAllFilters();
    setSearchTerm("");
  };

  // ── Apply all filters → passed to CalendarCard ──
  const deptLocationFiltered = useMemo(() => {
    return scheduleData.filter((item) => {
      if (filterDepartment && item.name_department !== filterDepartment)
        return false;
      if (filterLocation && item.name_location !== filterLocation) return false;
      if (filterType && item.type_machine !== filterType) return false;
      if (filterAttribute && item.attribute_machine !== filterAttribute)
        return false;
      if (filterModel && item.model_machine !== filterModel) return false;
      if (filterManufacturer && item.manufacturer !== filterManufacturer)
        return false;
      if (filterSupplier && item.supplier !== filterSupplier) return false;
      return true;
    });
  }, [
    scheduleData,
    filterDepartment,
    filterLocation,
    filterType,
    filterAttribute,
    filterModel,
    filterManufacturer,
    filterSupplier,
  ]);

  // ── Số máy hiển thị trên lịch = chỉ tính pending (còn phải làm) ──
  const calendarCountData = deptLocationFiltered.filter(
    (i) => i.status !== "completed"
  );

  // ── Full filtered list for machine cards (+ day + search + status) ──
  const filteredMachines = useMemo(() => {
    return deptLocationFiltered.filter((item) => {
      if (selectedDay && item.day !== selectedDay) return false;
      if (filterStatus && item.status !== filterStatus) return false;
      if (!searchTerm) return true;
      const q = searchTerm.toLowerCase();
      return (
        (item.type_machine || "").toLowerCase().includes(q) ||
        (item.attribute_machine || "").toLowerCase().includes(q) ||
        (item.model_machine || "").toLowerCase().includes(q) ||
        (item.serial_machine || "").toLowerCase().includes(q) ||
        (item.name_location || "").toLowerCase().includes(q) ||
        (item.name_department || "").toLowerCase().includes(q) ||
        (item.manufacturer || "").toLowerCase().includes(q) ||
        (item.supplier || "").toLowerCase().includes(q)
      );
    });
  }, [deptLocationFiltered, selectedDay, filterStatus, searchTerm]);

  // Thêm state quản lý số lượng hiển thị
  const PAGE_SIZE = 40;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Reset visibleCount khi bất kỳ filter / tháng / ngày nào thay đổi
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [
    searchTerm,
    filterDepartment,
    filterLocation,
    filterType,
    filterAttribute,
    filterModel,
    filterManufacturer,
    filterSupplier,
    filterStatus,
    currentMonth,
    currentYear,
    selectedDay,
  ]);

  // Logic xử lý khi cuộn trang — CHỈ tăng, không bao giờ giảm
  useEffect(() => {
    const totalLen = filteredMachines.length;
    const handleScroll = () => {
      // Đã hiển thị hết rồi thì không cần load thêm
      if (
        window.innerHeight + window.scrollY >=
        document.body.offsetHeight - 500
      ) {
        setVisibleCount((prev) => {
          if (prev >= totalLen) return prev;
          return Math.min(prev + PAGE_SIZE, totalLen);
        });
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [filteredMachines.length]);

  // Cắt danh sách để hiển thị
  const displayedMachines = useMemo(() => {
    return filteredMachines.slice(0, visibleCount);
  }, [filteredMachines, visibleCount]);

  // ── Stats (based on filtered data) ──
  const totalMachines = deptLocationFiltered.length;
  // Hôm nay: chỉ tính pending (chưa hoàn thành)
  const todayMachines = deptLocationFiltered.filter(
    (i) =>
      i.status !== "completed" &&
      i.day === vnToday.getDate() &&
      currentMonth === vnToday.getMonth() + 1 &&
      currentYear === vnToday.getFullYear()
  ).length;
  const completedMachines = deptLocationFiltered.filter(
    (i) => i.status === "completed"
  ).length;

  return (
    <>
      <NavigationBar />
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* ── Page Header ── */}
        <Box sx={{ mb: 6 }}>
          <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
            <Avatar
              sx={{
                width: 60,
                height: 60,
                background: "linear-gradient(45deg, #667eea, #764ba2)",
              }}
            >
              <CalendarMonth sx={{ fontSize: 30 }} />
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
                Lịch Bảo Dưỡng
              </Typography>
              <Typography
                variant={isMobile ? "body1" : "h6"}
                color="text.secondary"
              >
                Lịch bảo dưỡng định kỳ máy móc thiết bị
              </Typography>
            </Box>
          </Stack>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: "12px" }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* ── LEFT: Calendar + Stats ── */}
          <Grid
            size={{ xs: 12, md: 4, lg: 3 }}
            onClick={(e) => {
              if (isMobile && e.target === e.currentTarget) {
                setCalendarDrawerOpen(false);
              }
            }}
            sx={{
              display: {
                xs: calendarDrawerOpen ? "flex" : "none",
                md: "block",
              },
              alignItems: { xs: "flex-end", md: "stretch" },
              justifyContent: { xs: "center", md: "flex-start" },
              position: { xs: "fixed", md: "relative" },
              top: { xs: 0, md: "auto" },
              left: { xs: 0, md: "auto" },
              right: { xs: 0, md: "auto" },
              bottom: { xs: 0, md: "auto" },
              zIndex: { xs: 1300, md: "auto" },
              bgcolor: {
                xs: "rgba(0,0,0,0.5)",
                md: "transparent",
              },
              backdropFilter: { xs: "blur(2px)", md: "none" },
            }}
          >
            <Card
              elevation={0}
              sx={{
                borderRadius: {
                  xs: "20px 20px 0 0",
                  md: "20px",
                },
                border: "1px solid rgba(0,0,0,0.08)",
                background: "#fff",
                position: { xs: "relative", md: "sticky" },
                top: { xs: "auto", md: 80 },
                width: { xs: "100%", md: "auto" },
                maxHeight: {
                  xs: "90vh",
                  md: "calc(100vh - 150px)",
                },
                display: "flex",
                flexDirection: "column",
                boxShadow: {
                  xs: "0 -8px 30px rgba(0,0,0,0.15)",
                  md: "none",
                },
              }}
            >
              {/* Mobile drawer header */}
              {isMobile && (
                <Box
                  sx={{
                    position: "sticky",
                    top: 0,
                    zIndex: 2,
                    bgcolor: "#fff",
                    borderBottom: "1px solid rgba(0,0,0,0.06)",
                    borderRadius: "20px 20px 0 0",
                    px: 2,
                    py: 1,
                  }}
                >
                  {/* Drag handle */}
                  <Box
                    sx={{
                      width: 40,
                      height: 4,
                      bgcolor: "rgba(0,0,0,0.2)",
                      borderRadius: 2,
                      mx: "auto",
                      mb: 1,
                    }}
                  />
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <CalendarMonth sx={{ fontSize: 20, color: "#667eea" }} />
                      <Typography variant="subtitle1" fontWeight={700}>
                        Lịch & Bộ lọc
                      </Typography>
                    </Stack>
                    <IconButton
                      size="small"
                      onClick={() => setCalendarDrawerOpen(false)}
                      sx={{ color: "text.secondary" }}
                    >
                      <Close fontSize="small" />
                    </IconButton>
                  </Stack>
                </Box>
              )}
              <CardContent
                sx={{
                  p: 2.5,
                  overflowY: "auto",
                  flex: 1,
                  "&:last-child": { pb: 2.5 },
                  scrollbarWidth: "thin",
                }}
              >
                {/* Month navigation */}
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  sx={{ mb: 2 }}
                >
                  <IconButton
                    onClick={handlePrevMonth}
                    size="small"
                    sx={{
                      bgcolor: "rgba(102,126,234,0.08)",
                      "&:hover": { bgcolor: "rgba(102,126,234,0.18)" },
                    }}
                  >
                    <ChevronLeft />
                  </IconButton>
                  <Box sx={{ textAlign: "center" }}>
                    <Typography variant="h6" fontWeight={700}>
                      {MONTH_NAMES[currentMonth - 1]}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {currentYear}
                    </Typography>
                  </Box>
                  <IconButton
                    onClick={handleNextMonth}
                    size="small"
                    sx={{
                      bgcolor: "rgba(102,126,234,0.08)",
                      "&:hover": { bgcolor: "rgba(102,126,234,0.18)" },
                    }}
                  >
                    <ChevronRight />
                  </IconButton>
                </Stack>

                {/* Calendar grid */}
                {loading ? (
                  <Box
                    sx={{ display: "flex", justifyContent: "center", py: 4 }}
                  >
                    <CircularProgress size={32} />
                  </Box>
                ) : (
                  <CalendarCard
                    year={currentYear}
                    month={currentMonth}
                    scheduleData={calendarCountData}
                    selectedDay={selectedDay}
                    onDayClick={handleDayClick}
                  />
                )}

                {/* ── Search (tháng hiện tại) ── */}
                <Box sx={{ mt: 2, pt: 1.5, borderTop: "1px dashed #e0e0e0" }}>
                  <Stack direction="row" alignItems="center" sx={{ mb: 1 }}>
                    <Search
                      sx={{
                        fontSize: 14,
                        color: searchTerm ? "#667eea" : "text.disabled",
                        mr: 0.5,
                      }}
                    />
                    <Typography
                      variant="caption"
                      fontWeight={600}
                      sx={{
                        color: searchTerm ? "#667eea" : "text.secondary",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                        fontSize: "0.7rem",
                      }}
                    >
                      Tìm kiếm máy
                    </Typography>
                  </Stack>
                  <TextField
                    fullWidth
                    placeholder="Tên, serial..."
                    size="small"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: "10px",
                        fontSize: "0.82rem",
                      },
                    }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Search sx={{ fontSize: 16 }} />
                        </InputAdornment>
                      ),
                      endAdornment: searchTerm ? (
                        <InputAdornment position="end">
                          <IconButton
                            size="small"
                            onClick={() => setSearchTerm("")}
                            edge="end"
                          >
                            <Close sx={{ fontSize: 14 }} />
                          </IconButton>
                        </InputAdornment>
                      ) : null,
                    }}
                  />
                </Box>

                {/* ── RFID Lookup Button ── */}
                <Box sx={{ mt: 2, pt: 1.5, borderTop: "1px dashed #e0e0e0" }}>
                  <Button
                    fullWidth
                    variant="contained"
                    size="small"
                    onClick={handleOpenRfidDialog}
                    startIcon={<WifiTethering sx={{ fontSize: 18 }} />}
                    sx={{
                      borderRadius: "10px",
                      textTransform: "none",
                      fontWeight: 600,
                      fontSize: "0.78rem",
                      py: 1,
                      background:
                        "linear-gradient(45deg, #00897b 0%, #26a69a 100%)",
                      boxShadow: "0 3px 10px rgba(0,137,123,0.25)",
                      "&:hover": {
                        background:
                          "linear-gradient(45deg, #00796b 0%, #00897b 100%)",
                        boxShadow: "0 5px 14px rgba(0,137,123,0.35)",
                      },
                    }}
                  >
                    Quét RFID
                  </Button>
                </Box>

                {/* ── Filters ── */}
                <Box sx={{ mt: 2, pt: 1.5, borderTop: "1px dashed #e0e0e0" }}>
                  {/* Header */}
                  <Stack direction="row" alignItems="center" sx={{ mb: 1.5 }}>
                    <FilterAlt
                      sx={{
                        fontSize: 14,
                        color: hasActiveFilter ? "#667eea" : "text.disabled",
                        mr: 0.5,
                      }}
                    />
                    <Typography
                      variant="caption"
                      fontWeight={600}
                      sx={{
                        color: hasActiveFilter ? "#667eea" : "text.secondary",
                        flex: 1,
                      }}
                    >
                      Bộ lọc
                    </Typography>
                    {hasActiveFilter && (
                      <Tooltip title="Xóa tất cả bộ lọc">
                        <IconButton
                          size="small"
                          onClick={clearFilters}
                          sx={{ color: "#667eea", p: 0.25 }}
                        >
                          <FilterAltOff sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Stack>

                  {/* Group 1: Đơn vị / Vị trí */}
                  <FilterGroup label="Đơn vị / Vị trí">
                    <FilterSelect
                      value={filterDepartment}
                      onChange={handleDepartmentChange}
                      options={allDepartments}
                      placeholder="Tất cả đơn vị"
                      icon={
                        <Business
                          sx={{
                            fontSize: 15,
                            color: "text.secondary",
                            ml: 0.5,
                            mr: 0.25,
                          }}
                        />
                      }
                    />
                    <FilterSelect
                      value={filterLocation}
                      onChange={(_, v) => setFilterLocation(v)}
                      options={allLocations}
                      placeholder="Tất cả vị trí"
                      icon={
                        <LocationOn
                          sx={{
                            fontSize: 15,
                            color: "text.secondary",
                            ml: 0.5,
                            mr: 0.25,
                          }}
                        />
                      }
                    />
                  </FilterGroup>

                  {/* Group 2: Loại / Đặc tính / Model */}
                  <FilterGroup label="Loại máy">
                    <FilterSelect
                      value={filterType}
                      onChange={handleTypeChange}
                      options={allTypes}
                      placeholder="Tất cả loại"
                      icon={
                        <PrecisionManufacturing
                          sx={{
                            fontSize: 15,
                            color: "text.secondary",
                            ml: 0.5,
                            mr: 0.25,
                          }}
                        />
                      }
                    />
                    <FilterSelect
                      value={filterAttribute}
                      onChange={handleAttributeChange}
                      options={allAttributes}
                      placeholder="Tất cả đặc tính"
                      icon={
                        <Category
                          sx={{
                            fontSize: 15,
                            color: "text.secondary",
                            ml: 0.5,
                            mr: 0.25,
                          }}
                        />
                      }
                    />
                    <FilterSelect
                      value={filterModel}
                      onChange={(_, v) => setFilterModel(v)}
                      options={allModels}
                      placeholder="Tất cả model"
                      icon={
                        <Straighten
                          sx={{
                            fontSize: 15,
                            color: "text.secondary",
                            ml: 0.5,
                            mr: 0.25,
                          }}
                        />
                      }
                    />
                  </FilterGroup>

                  {/* Group 3: Hãng / NCC */}
                  <FilterGroup label="Hãng sản xuất / Nhà cung cấp">
                    <FilterSelect
                      value={filterManufacturer}
                      onChange={(_, v) => setFilterManufacturer(v)}
                      options={allManufacturers}
                      placeholder="Tất cả hãng SX"
                      icon={
                        <Factory
                          sx={{
                            fontSize: 15,
                            color: "text.secondary",
                            ml: 0.5,
                            mr: 0.25,
                          }}
                        />
                      }
                    />
                    <FilterSelect
                      value={filterSupplier}
                      onChange={(_, v) => setFilterSupplier(v)}
                      options={allSuppliers}
                      placeholder="Tất cả NCC"
                      icon={
                        <LocalShipping
                          sx={{
                            fontSize: 15,
                            color: "text.secondary",
                            ml: 0.5,
                            mr: 0.25,
                          }}
                        />
                      }
                    />
                  </FilterGroup>

                  {/* Group 4: Trạng thái */}
                  <FilterGroup label="Trạng thái">
                    <Stack direction="row" spacing={0.75}>
                      {[
                        { value: null, label: "Tất cả" },
                        {
                          value: "pending",
                          label: "Chưa thực hiện",
                          color: MAINT_STATUS_CONFIG.pending.color,
                          bg: MAINT_STATUS_CONFIG.pending.bg,
                          border: MAINT_STATUS_CONFIG.pending.borderColor,
                        },
                        {
                          value: "completed",
                          label: "Hoàn thành",
                          color: MAINT_STATUS_CONFIG.completed.color,
                          bg: MAINT_STATUS_CONFIG.completed.bg,
                          border: MAINT_STATUS_CONFIG.completed.borderColor,
                        },
                      ].map((opt) => {
                        const isActive = filterStatus === opt.value;
                        return (
                          <Box
                            key={String(opt.value)}
                            onClick={() => setFilterStatus(opt.value)}
                            sx={{
                              flex: 1,
                              textAlign: "center",
                              py: 0.6,
                              px: 0.5,
                              borderRadius: "8px",
                              border: `1px solid ${isActive ? opt.border || "#667eea" : "#e0e0e0"}`,
                              bgcolor: isActive
                                ? opt.bg || "rgba(102,126,234,0.1)"
                                : "transparent",
                              color: isActive
                                ? opt.color || "#667eea"
                                : "text.secondary",
                              fontWeight: isActive ? 700 : 400,
                              fontSize: "0.72rem",
                              cursor: "pointer",
                              transition: "all 0.15s ease",
                              "&:hover": {
                                bgcolor: opt.bg || "rgba(102,126,234,0.08)",
                                borderColor: opt.border || "#667eea",
                              },
                            }}
                          >
                            {opt.label}
                          </Box>
                        );
                      })}
                    </Stack>
                  </FilterGroup>

                  {/* Active filter chips */}
                  {hasActiveFilter && (
                    <Stack
                      direction="row"
                      spacing={0.5}
                      sx={{ mt: 1 }}
                      flexWrap="wrap"
                      useFlexGap
                    >
                      {[
                        {
                          val: filterDepartment,
                          icon: <Business />,
                          color: "#667eea",
                          onDel: () => {
                            setFilterDepartment(null);
                            setFilterLocation(null);
                          },
                        },
                        {
                          val: filterLocation,
                          icon: <LocationOn />,
                          color: "#764ba2",
                          onDel: () => setFilterLocation(null),
                        },
                        {
                          val: filterType,
                          icon: <PrecisionManufacturing />,
                          color: "#2e7d32",
                          onDel: () => {
                            setFilterType(null);
                            setFilterAttribute(null);
                            setFilterModel(null);
                          },
                        },
                        {
                          val: filterAttribute,
                          icon: <Category />,
                          color: "#00897b",
                          onDel: () => {
                            setFilterAttribute(null);
                            setFilterModel(null);
                          },
                        },
                        {
                          val: filterModel,
                          icon: <Straighten />,
                          color: "#1565c0",
                          onDel: () => setFilterModel(null),
                        },
                        {
                          val: filterManufacturer,
                          icon: <Factory />,
                          color: "#e65100",
                          onDel: () => setFilterManufacturer(null),
                        },
                        {
                          val: filterSupplier,
                          icon: <LocalShipping />,
                          color: "#6a1b9a",
                          onDel: () => setFilterSupplier(null),
                        },
                      ]
                        .filter((f) => !!f.val)
                        .map((f) => (
                          <Chip
                            key={f.val}
                            label={f.val}
                            size="small"
                            onDelete={f.onDel}
                            icon={React.cloneElement(f.icon, {
                              sx: { fontSize: "13px !important" },
                            })}
                            sx={{
                              bgcolor: alpha(f.color, 0.1),
                              color: f.color,
                              fontWeight: 600,
                              fontSize: "0.68rem",
                              "& .MuiChip-deleteIcon": { color: f.color },
                            }}
                          />
                        ))}
                    </Stack>
                  )}
                </Box>

                {/* Action buttons */}
                <Stack spacing={1} sx={{ mt: 2 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<Today fontSize="small" />}
                    onClick={handleGoToday}
                    fullWidth
                    sx={{
                      borderRadius: "10px",
                      borderColor: "#764ba2",
                      color: "#764ba2",
                      "&:hover": {
                        borderColor: "#667eea",
                        bgcolor: "rgba(102,126,234,0.06)",
                      },
                    }}
                  >
                    Hôm nay
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<Refresh fontSize="small" />}
                    onClick={() => {
                      setSelectedDay(null);
                      fetchData();
                    }}
                    fullWidth
                    sx={{
                      borderRadius: "10px",
                      borderColor: "#667eea",
                      color: "#667eea",
                      "&:hover": { bgcolor: "rgba(102,126,234,0.06)" },
                    }}
                  >
                    Tải lại
                  </Button>
                </Stack>

                {/* Month stats */}
                <Box sx={{ mt: 2, pt: 1.5, borderTop: "1px dashed #e0e0e0" }}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    fontWeight={600}
                    sx={{ display: "block", mb: 1 }}
                  >
                    Thống kê tháng này:
                  </Typography>
                  <Grid container spacing={1}>
                    {[
                      {
                        label: "Tổng",
                        value: totalMachines,
                        color: "#667eea",
                        bg: "rgba(102,126,234,0.08)",
                      },
                      {
                        label: "Hôm nay",
                        value: todayMachines,
                        sublabel: "còn lại",
                        color: "#764ba2",
                        bg: "rgba(118,75,162,0.08)",
                      },
                      {
                        label: "Hoàn thành",
                        value: completedMachines,
                        color: "#2e7d32",
                        bg: "#e8f5e9",
                      },
                    ].map((s) => (
                      <Grid key={s.label} size={4}>
                        <Box
                          sx={{
                            textAlign: "center",
                            p: 0.75,
                            borderRadius: "10px",
                            bgcolor: s.bg,
                          }}
                        >
                          <Typography
                            variant="body1"
                            fontWeight={700}
                            sx={{ color: s.color, lineHeight: 1.2 }}
                          >
                            {s.value}
                          </Typography>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ fontSize: "0.62rem", lineHeight: 1.1 }}
                          >
                            {s.label}
                          </Typography>
                          {s.sublabel && (
                            <Typography
                              variant="caption"
                              sx={{
                                fontSize: "0.58rem",
                                color: "text.secondary",
                                display: "block",
                                lineHeight: 1,
                              }}
                            >
                              {s.sublabel}
                            </Typography>
                          )}
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* ── RIGHT: Machine Cards ── */}
          <Grid size={{ xs: 12, md: 8, lg: 9 }}>
            <Card
              elevation={0}
              sx={{
                borderRadius: "20px",
                border: "1px solid rgba(0,0,0,0.08)",
                background: "#fff",
              }}
            >
              <CardContent sx={{ p: 2.5 }}>
                {/* ── Top bar: title + count + day deselect ── */}
                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={1.5}
                  sx={{ mb: 1.5 }}
                >
                  <Avatar
                    sx={{
                      width: 38,
                      height: 38,
                      background: "linear-gradient(45deg, #667eea, #764ba2)",
                    }}
                  >
                    <PrecisionManufacturing sx={{ fontSize: 20 }} />
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack
                      direction="row"
                      alignItems="center"
                      spacing={1}
                      sx={{ flexWrap: "wrap", gap: 0.5 }}
                    >
                      <Typography variant="h6" fontWeight={700}>
                        {selectedDay
                          ? `Ngày ${selectedDay}/${currentMonth}/${currentYear}`
                          : `${MONTH_NAMES[currentMonth - 1]} ${currentYear}`}
                      </Typography>
                      <Chip
                        label={`${displayedMachines.length} máy`}
                        size="small"
                        sx={{
                          bgcolor: "rgba(102,126,234,0.1)",
                          color: "#667eea",
                          fontWeight: 700,
                          fontSize: "0.72rem",
                        }}
                      />
                      {selectedDay && (
                        <Tooltip title="Bỏ chọn ngày">
                          <IconButton
                            size="small"
                            onClick={() => setSelectedDay(null)}
                            sx={{ color: "text.secondary" }}
                          >
                            <Close fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                      {selectedDay
                        ? "Danh sách máy bảo dưỡng trong ngày"
                        : "Click vào ngày trên lịch để lọc"}
                    </Typography>
                  </Box>
                </Stack>

                <Divider sx={{ mb: 2 }} />

                {/* ── Machine list content ── */}
                {loading ? (
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
                ) : displayedMachines.length === 0 ? (
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      minHeight: 300,
                    }}
                  >
                    <PrecisionManufacturing
                      sx={{ fontSize: 64, opacity: 0.2, mb: 2 }}
                    />
                    <Typography variant="h6" color="text.secondary">
                      {selectedDay
                        ? `Không có máy bảo dưỡng ngày ${selectedDay}/${currentMonth}`
                        : `Không có lịch bảo dưỡng trong ${MONTH_NAMES[currentMonth - 1]}`}
                    </Typography>
                    <Typography variant="body2" color="text.disabled" mt={0.5}>
                      {searchTerm || hasActiveFilter
                        ? "Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm"
                        : "Lịch bảo dưỡng sẽ được tạo tự động"}
                    </Typography>
                    {hasActiveFilter && (
                      <Button
                        size="small"
                        startIcon={<FilterAltOff fontSize="small" />}
                        onClick={clearFilters}
                        sx={{ mt: 1.5, borderRadius: "10px", color: "#667eea" }}
                      >
                        Xóa bộ lọc
                      </Button>
                    )}
                  </Box>
                ) : selectedDay ? (
                  <Grid container spacing={2}>
                    {displayedMachines.map((machine, idx) => (
                      <Grid
                        key={machine.uuid_maintenance_schedule_detail || idx}
                        size={{ xs: 12, sm: 6, md: 4, lg: 3 }}
                      >
                        <MachineCard
                          machine={machine}
                          onClick={() => handleCardClick(machine)}
                        />
                      </Grid>
                    ))}
                  </Grid>
                ) : (
                  <GroupedByDay
                    machines={displayedMachines}
                    onDaySelect={handleDayClick}
                    currentYear={currentYear}
                    currentMonth={currentMonth}
                    vnToday={vnToday}
                    onCardClick={handleCardClick}
                  />
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>

      {/* ── Maintenance History Dialog ── */}
      <MaintenanceHistoryDialog
        open={historyDialogOpen}
        onClose={handleCloseHistoryDialog}
        machine={historyDialogMachine}
        onStatusChange={handleStatusChange}
      />

      {/* ── RFID Lookup Dialog ── */}
      <Dialog
        open={rfidDialogOpen}
        onClose={rfidLoading ? undefined : handleCloseRfidDialog}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: "16px" } }}
      >
        <DialogTitle
          sx={{
            background: "linear-gradient(135deg, #00897b 0%, #26a69a 100%)",
            color: "#fff",
            py: 2,
            px: 3,
          }}
        >
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
          >
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Avatar
                sx={{
                  width: 36,
                  height: 36,
                  bgcolor: "rgba(255,255,255,0.2)",
                }}
              >
                <WifiTethering sx={{ fontSize: 20, color: "#fff" }} />
              </Avatar>
              <Box>
                <Typography
                  variant="h6"
                  fontWeight={700}
                  sx={{ lineHeight: 1.2 }}
                >
                  Quét RFID
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.9 }}>
                  Tra cứu lý lịch bảo dưỡng thiết bị
                </Typography>
              </Box>
            </Stack>
            <IconButton
              onClick={handleCloseRfidDialog}
              disabled={rfidLoading}
              sx={{ color: "#fff" }}
            >
              <Close />
            </IconButton>
          </Stack>
        </DialogTitle>

        <DialogContent sx={{ p: 3, bgcolor: "#f8f9fc" }}>
          <TextField
            fullWidth
            autoFocus
            placeholder={`Quét mã RFID để tra cứu`}
            value={rfidInput}
            onChange={(e) => {
              const next = e.target.value.slice(0, RFID_LENGTH);
              setRfidInput(next);
              if (rfidError) setRfidError(null);
              if (rfidWarning) setRfidWarning(null);
              // Tự động submit khi đủ 24 ký tự
              if (next.trim().length === RFID_LENGTH && !rfidLoading) {
                handleRfidLookup(next);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleRfidLookup();
              }
            }}
            disabled={rfidLoading}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: "12px",
                bgcolor: "#fff",
                fontFamily:
                  "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                letterSpacing: "0.04em",
              },
              mt: 2,
            }}
            inputProps={{
              maxLength: RFID_LENGTH,
              spellCheck: false,
              autoCapitalize: "off",
              autoCorrect: "off",
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <WifiTethering sx={{ fontSize: 20, color: "#00897b" }} />
                </InputAdornment>
              ),
              endAdornment: rfidInput ? (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={() => {
                      setRfidInput("");
                      setRfidError(null);
                      setRfidWarning(null);
                    }}
                    edge="end"
                    disabled={rfidLoading}
                  >
                    <Close fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ) : null,
            }}
          />

          {rfidError && (
            <Alert
              severity="error"
              onClose={() => setRfidError(null)}
              sx={{
                mt: 2,
                borderRadius: "12px",
                fontSize: "0.82rem",
              }}
            >
              {rfidError}
            </Alert>
          )}

          {rfidWarning && (
            <Alert
              severity="warning"
              icon={<HourglassEmpty fontSize="inherit" />}
              onClose={() => setRfidWarning(null)}
              sx={{
                mt: 2,
                borderRadius: "12px",
                fontSize: "0.82rem",
                "& .MuiAlert-message": { width: "100%" },
              }}
            >
              <Typography variant="body2" fontWeight={700} sx={{ mb: 0.5 }}>
                {rfidWarning.code === "NO_SCHEDULE"
                  ? "Chưa có lịch bảo dưỡng"
                  : "Chưa có nội dung bảo dưỡng"}
              </Typography>
              <Typography variant="caption" sx={{ display: "block" }}>
                {rfidWarning.message}
              </Typography>
              {rfidWarning.machine && (
                <Box
                  sx={{
                    mt: 1,
                    p: 1,
                    bgcolor: "rgba(255,152,0,0.08)",
                    borderRadius: "8px",
                    border: "1px dashed rgba(255,152,0,0.4)",
                  }}
                >
                  <Typography
                    variant="caption"
                    fontWeight={600}
                    sx={{ display: "block", color: "#e65100" }}
                  >
                    {rfidWarning.machine.type_machine}{" "}
                    {rfidWarning.machine.attribute_machine}
                  </Typography>
                  {rfidWarning.machine.serial_machine && (
                    <Typography
                      variant="caption"
                      sx={{ display: "block", color: "#bf360c" }}
                    >
                      Serial: {rfidWarning.machine.serial_machine}
                    </Typography>
                  )}
                  {rfidWarning.machine.model_machine && (
                    <Typography
                      variant="caption"
                      sx={{ display: "block", color: "#bf360c" }}
                    >
                      Model: {rfidWarning.machine.model_machine}
                    </Typography>
                  )}
                </Box>
              )}
              <Typography
                variant="caption"
                sx={{
                  display: "block",
                  mt: 1,
                  fontStyle: "italic",
                  color: "text.secondary",
                }}
              >
                Vui lòng liên hệ bộ phận cơ điện để bổ sung{" "}
                {rfidWarning.code === "NO_SCHEDULE"
                  ? "lịch bảo dưỡng"
                  : "nội dung bảo dưỡng"}{" "}
                cho thiết bị này.
              </Typography>
            </Alert>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2.5, bgcolor: "#f8f9fc" }}>
          <Button
            onClick={handleCloseRfidDialog}
            disabled={rfidLoading}
            sx={{
              borderRadius: "10px",
              textTransform: "none",
              fontWeight: 600,
              color: "text.secondary",
            }}
          >
            Đóng
          </Button>
          <Button
            variant="contained"
            onClick={handleRfidLookup}
            disabled={!rfidInput.trim() || rfidLoading}
            startIcon={
              rfidLoading ? (
                <CircularProgress size={16} sx={{ color: "#fff" }} />
              ) : (
                <WifiTethering sx={{ fontSize: 18 }} />
              )
            }
            sx={{
              borderRadius: "10px",
              textTransform: "none",
              fontWeight: 600,
              px: 2.5,
              background: "linear-gradient(45deg, #00897b 0%, #26a69a 100%)",
              boxShadow: "0 3px 10px rgba(0,137,123,0.3)",
              "&:hover": {
                background: "linear-gradient(45deg, #00796b 0%, #00897b 100%)",
                boxShadow: "0 5px 14px rgba(0,137,123,0.4)",
              },
              "&.Mui-disabled": {
                background: "#e0e0e0",
                color: "#9e9e9e",
              },
            }}
          >
            {rfidLoading ? "Đang tra cứu..." : "Xem lý lịch bảo dưỡng"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── FAB: Open calendar drawer (mobile only) ── */}
      <Fab
        aria-label="Mở lịch & bộ lọc"
        onClick={() => setCalendarDrawerOpen(true)}
        sx={{
          display: { xs: "flex", md: "none" },
          position: "fixed",
          bottom: showScrollTop ? 96 : 24,
          right: 24,
          zIndex: 1000,
          background: "linear-gradient(45deg, #00897b, #26a69a)",
          color: "#fff",
          "&:hover": {
            background: "linear-gradient(45deg, #00796b, #00897b)",
            transform: "scale(1.1)",
          },
          transition: "all 0.3s ease",
          boxShadow: "0 8px 25px rgba(0,137,123,0.4)",
        }}
      >
        <CalendarMonth />
      </Fab>

      {/* ── FAB: Scroll to top ── */}
      {showScrollTop && (
        <Fab
          aria-label="Lên đầu trang"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          sx={{
            position: "fixed",
            bottom: 24,
            right: 24,
            zIndex: 1000,
            background: "linear-gradient(45deg, #667eea, #764ba2)",
            color: "#fff",
            "&:hover": {
              background: "linear-gradient(45deg, #764ba2, #667eea)",
              transform: "scale(1.1)",
            },
            transition: "all 0.3s ease",
            boxShadow: "0 8px 25px rgba(102,126,234,0.4)",
          }}
        >
          <KeyboardArrowUp />
        </Fab>
      )}
    </>
  );
};

export default MaintenanceSchedulePage;
