// frontend/src/components/MachineProfileCard.jsx
//
// Hiển thị "Lý lịch bảo dưỡng thiết bị" của một máy gồm 3 phần:
//   A. LÝ LỊCH THIẾT BỊ
//   B. THÔNG TIN ĐƠN VỊ QUẢN LÝ THIẾT BỊ
//   C. KIỂM TRA THAY DẦU, HOÁ CHẤT, VỆ SINH ĐỊNH KỲ
// Kèm nút Xuất PDF (in qua iframe ẩn).
//
// Component được tái sử dụng cho dialog "Chi tiết máy móc" trong MachineListPage.

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Box,
  Paper,
  Typography,
  Stack,
  Table,
  TableBody,
  TableRow,
  TableCell,
  Checkbox,
  FormControlLabel,
  Chip,
  CircularProgress,
} from "@mui/material";
import { CheckCircle, TaskAlt, HourglassEmpty } from "@mui/icons-material";
import { alpha } from "@mui/material/styles";
import { api } from "../api/api";

// ─────────────────────────────────────────────────────────────────────────────
// Cấu hình hằng số dùng chung
// ─────────────────────────────────────────────────────────────────────────────
const MAINT_STATUS_CONFIG = {
  pending: {
    label: "Chưa thực hiện",
    color: "#e65100",
    bg: "#fff3e0",
    borderColor: "#ffb74d",
    icon: HourglassEmpty,
  },
  completed: {
    label: "Đã thực hiện",
    color: "#1565c0",
    bg: "#e3f2fd",
    borderColor: "#64b5f6",
    icon: TaskAlt,
  },
  confirm_completed: {
    label: "Đã duyệt hoàn thành",
    color: "#2e7d32",
    bg: "#e8f5e9",
    borderColor: "#81c784",
    icon: CheckCircle,
  },
};

const QUARTER_LABELS = {
  1: "Quý 1",
  2: "Quý 2",
  3: "Quý 3",
  4: "Quý 4",
};
const monthToQuarter = (m) => Math.ceil(m / 3);

// Format ngày về DD/MM/YYYY. Hỗ trợ chuỗi ISO ("2018-05-30T17:00:00.000Z"),
// chuỗi DD/MM/YYYY (giữ nguyên), hoặc Date.
const formatDate = (v) => {
  if (!v) return "";
  // Đã ở định dạng DD/MM/YYYY → giữ nguyên
  if (typeof v === "string" && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(v)) return v;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────
const SectionTitle = ({ children }) => (
  <Box sx={{ mb: 1, mt: 2 }}>
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

const InfoRow = ({ label, value }) => {
  if (!value && value !== 0) return null;
  return (
    <TableRow sx={{ "&:last-child td": { border: 0 } }}>
      <TableCell
        sx={{
          fontWeight: 700,
          fontSize: "0.82rem",
          color: "#444",
          py: 0.6,
          px: 1.5,
          borderRight: "1px solid #e0e0e0",
          bgcolor: "#fafafa",
          width: "40%",
        }}
      >
        {label}
      </TableCell>
      <TableCell
        sx={{ fontSize: "0.82rem", color: "#1a1a2e", py: 0.6, px: 1.5 }}
      >
        {value}
      </TableCell>
    </TableRow>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Component chính
// ─────────────────────────────────────────────────────────────────────────────
// Props:
//   - machine: object dữ liệu máy (từ GET /api/machines/:uuid)
//   - onRegisterExport?: (exportFn|null) => void
//       Component sẽ truyền hàm xuất PDF lên parent để parent đặt nút "Xuất PDF"
//       ở footer (gần nút Đóng). Khi unmount sẽ gọi onRegisterExport(null).
const MachineProfileCard = ({ machine, onRegisterExport }) => {
  const [isNew, setIsNew] = useState(true);
  const [historyRows, setHistoryRows] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchHistory = useCallback(async (id_machine) => {
    if (!id_machine) {
      setHistoryRows([]);
      return;
    }
    setHistoryLoading(true);
    try {
      const res = await api.maintenance.getMachineHistory(id_machine);
      if (res.success) setHistoryRows(res.data || []);
      else setHistoryRows([]);
    } catch {
      setHistoryRows([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (machine?.id_machine) {
      setIsNew(true);
      fetchHistory(machine.id_machine);
    } else {
      setHistoryRows([]);
    }
  }, [machine?.id_machine, fetchHistory]);

  // Danh sách nội dung bảo dưỡng — ưu tiên field đã được BE parse sẵn
  const contentList = useMemo(() => {
    if (!machine) return [];
    // Field do BE trả về (đã parse JSON)
    if (Array.isArray(machine.maintenance_content_list)) {
      return machine.maintenance_content_list;
    }
    // Fallback: parse maintenance_content thủ công nếu cần
    const raw = machine.maintenance_content;
    if (!raw) return [];
    try {
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (Array.isArray(parsed)) {
        return parsed
          .filter((it) => it && (it.name || it.id))
          .map((it) => ({
            id: it.id ?? null,
            name: it.name ?? "",
            is_check: !!it.is_check,
          }));
      }
      if (parsed && typeof parsed === "object") {
        return Object.entries(parsed)
          .filter(([, v]) => v && v.name)
          .map(([id, v]) => ({ id, name: v.name, is_check: !!v.is_check }));
      }
    } catch {
      /* ignore */
    }
    return [];
  }, [machine]);

  // Gather and sort all breakdown history records across all periods
  const allBreakdowns = useMemo(() => {
    const list = [];
    historyRows.forEach((row) => {
      if (row.maintenance_breakdown_detail) {
        const parsed =
          typeof row.maintenance_breakdown_detail === "string"
            ? JSON.parse(row.maintenance_breakdown_detail)
            : row.maintenance_breakdown_detail;
        if (Array.isArray(parsed)) {
          parsed.forEach((item) => {
            list.push({
              ...item,
              year: row.year,
              month: row.month,
            });
          });
        }
      }
    });
    return list.sort((a, b) => {
      const ad = a.noted_at ? new Date(a.noted_at).getTime() : 0;
      const bd = b.noted_at ? new Date(b.noted_at).getTime() : 0;
      return ad - bd;
    });
  }, [historyRows]);

  // ───────────────────────────────────────────────────────────────────────────
  // Xuất PDF (in qua iframe ẩn)
  // ───────────────────────────────────────────────────────────────────────────
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
              </tr>`
            )
            .join("")
        : `<tr><td colspan="2" style="text-align:center;font-style:italic;color:#888">Chưa có nội dung bảo dưỡng</td></tr>`;

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
          const displayLabel =
            row.status === "confirm_completed" ? "Đã thực hiện" : sc.label;
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
                  ${esc(displayLabel)}
                </span>
              </td>
              <td>${esc(row.updated_at || "—")}</td>
              <td>${esc(updater)}</td>
            </tr>`;
        })
        .join("");
    }

    const sectionE_html =
      allBreakdowns.length > 0
        ? allBreakdowns
            .map(
              (item, i) => `
            <tr>
              <td style="text-align:center;width:38px">${i + 1}</td>
              <td style="font-weight:700;color:#7b1fa2">${esc(item.name)}</td>
              <td>${esc(item.note)}</td>
              <td>${esc(item.noted_at || "—")}</td>
              <td>${esc(item.noted_by_name || item.noted_by || "—")}</td>
            </tr>`
            )
            .join("")
        : `<tr><td colspan="5" style="text-align:center;font-style:italic;color:#888;padding:12px">Chưa ghi nhận lịch sử sửa chữa</td></tr>`;

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
  .section-title.e { background: linear-gradient(90deg,#7b1fa2,#9c27b0); }
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
      <div class="sub">${esc(machine.type_machine)} ${machine.attribute_machine ? esc(machine.attribute_machine) : ""}
      ${machine.model_machine ? `· ${esc(machine.model_machine)}` : ""}</div>
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
            <td>${esc(formatDate(machine.date_of_use))}</td>
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

  <!-- SECTION E -->
  <div class="section">
    <div class="section-title e">D. LỊCH SỬ SỬA CHỮA MÁY MÓC THIẾT BỊ</div>
    <div class="section-body">
      <table class="grid">
        <thead>
          <tr>
            <th style="width:38px">STT</th>
            <th>Tên lỗi</th>
            <th>Chi tiết sửa chữa</th>
            <th style="width:140px">Ngày ghi nhận</th>
            <th>Người ghi nhận</th>
          </tr>
        </thead>
        <tbody>${sectionE_html}</tbody>
      </table>
    </div>
  </div>

</body>
</html>`;

    const pdfTitle =
      `Lý lịch bảo dưỡng_${machine.type_machine || ""}${machine.attribute_machine ? machine.attribute_machine : ""}_${machine.serial_machine || ""}`
        .replace(/\s+/g, " ")
        .trim();

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

    iframe.contentWindow.onload = () => {
      const originalTitle = document.title;
      document.title = pdfTitle;
      try {
        iframe.contentDocument.title = pdfTitle;
      } catch (e) {
        void e;
      }
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      const cleanup = () => {
        document.title = originalTitle;
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      };
      iframe.contentWindow.onafterprint = cleanup;
      setTimeout(cleanup, 2000);
    };
  };

  // Đăng ký hàm xuất PDF với parent để parent đặt nút ở footer dialog.
  // Phụ thuộc vào `machine`, `historyRows`, `historyLoading`, `contentList`, `isNew`
  // (đều là các biến closure trong handleExportPdf) — đăng ký lại mỗi khi
  // các giá trị này thay đổi để hàm luôn cập nhật.
  useEffect(() => {
    if (typeof onRegisterExport !== "function") return undefined;
    onRegisterExport(handleExportPdf);
    return () => onRegisterExport(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [machine, historyRows, historyLoading, contentList, isNew]);

  if (!machine) return null;

  return (
    <Box
      sx={{ bgcolor: "#f8f9fc", borderRadius: "12px", p: { xs: 1.5, sm: 2 } }}
    >
      {/* ── Section A: Lý lịch thiết bị ── */}
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
          {/* 1. Thông tin cơ bản */}
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
              <InfoRow label="Ký hiệu (Model)" value={machine.model_machine} />
              <InfoRow label="Số máy (Serial)" value={machine.serial_machine} />
              <InfoRow label="Công dụng" value={machine.attribute_machine} />
              <InfoRow
                label="Nơi chế tạo / Hãng SX"
                value={machine.manufacturer}
              />
            </TableBody>
          </Table>

          {/* 2. Tình trạng thiết bị */}
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

          {/* 3. Thông số kỹ thuật */}
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

          {/* 4. Quy ước bảo dưỡng */}
          <SectionTitle>4. Quy ước về bảo dưỡng thiết bị</SectionTitle>

          {/* 4a. Lịch xích sửa chữa */}
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
                  <Typography variant="body2" fontWeight={700} color="#667eea">
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
                  <Typography variant="body2" fontWeight={700} color="#764ba2">
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
                    sx={{ p: 1.25, borderRadius: "8px" }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        fontSize: "0.82rem",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {machine.note}
                    </Typography>
                  </Paper>
                </Box>
              )}
            </Box>
          </Box>

          {/* 4b. Nội dung xem xét bảo dưỡng */}
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
                    key={item.id ?? idx}
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
                        textDecoration: item.is_check ? "line-through" : "none",
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
                value={formatDate(machine.date_of_use)}
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

                {(() => {
                  const yearGroups = {};
                  historyRows.forEach((r) => {
                    if (!yearGroups[r.year]) yearGroups[r.year] = [];
                    yearGroups[r.year].push(r);
                  });

                  return historyRows.map((row, idx) => {
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
                          bgcolor:
                            idx % 2 === 0 ? "#fff" : alpha("#000", 0.015),
                        }}
                      >
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
                            label={
                              row.status === "confirm_completed"
                                ? "Đã hoàn thành"
                                : sc.label
                            }
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

      {/* ── Section E: Lịch sử sửa chữa máy móc thiết bị ── */}
      <Paper
        elevation={0}
        sx={{
          border: "1px solid #e0e0e0",
          borderRadius: "12px",
          overflow: "hidden",
          mt: 2,
        }}
      >
        <Box
          sx={{
            background: "linear-gradient(90deg,#7b1fa2,#9c27b0)",
            px: 2,
            py: 1,
          }}
        >
          <Typography
            variant="subtitle1"
            fontWeight={700}
            sx={{ color: "#fff", letterSpacing: "0.03em" }}
          >
            D. LỊCH SỬ SỬA CHỮA MÁY MÓC THIẾT BỊ
          </Typography>
        </Box>

        {historyLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
            <CircularProgress size={28} sx={{ color: "#7b1fa2" }} />
          </Box>
        ) : allBreakdowns.length === 0 ? (
          <Box sx={{ py: 3, textAlign: "center" }}>
            <Typography
              variant="caption"
              color="text.disabled"
              fontStyle="italic"
            >
              Chưa ghi nhận lịch sử sửa chữa
            </Typography>
          </Box>
        ) : (
          <Box sx={{ overflowX: "auto" }}>
            <Table size="small">
              <TableBody>
                <TableRow sx={{ bgcolor: "#f5f5f5" }}>
                  {[
                    "STT",
                    "Tên lỗi",
                    "Chi tiết sửa chữa",
                    "Ngày ghi nhận",
                    "Người ghi nhận",
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

                {allBreakdowns.map((item, idx) => (
                  <TableRow
                    key={idx}
                    sx={{
                      bgcolor: idx % 2 === 0 ? "#fff" : alpha("#000", 0.015),
                    }}
                  >
                    <TableCell
                      sx={{
                        px: 1.5,
                        py: 0.75,
                        fontSize: "0.8rem",
                        width: 50,
                        textAlign: "center",
                      }}
                    >
                      {idx + 1}
                    </TableCell>
                    <TableCell
                      sx={{
                        px: 1.5,
                        py: 0.75,
                        fontSize: "0.8rem",
                        fontWeight: 700,
                        color: "#7b1fa2",
                      }}
                    >
                      {item.name}
                    </TableCell>
                    <TableCell sx={{ px: 1.5, py: 0.75, fontSize: "0.8rem" }}>
                      {item.note || "—"}
                    </TableCell>
                    <TableCell
                      sx={{
                        px: 1.5,
                        py: 0.75,
                        fontSize: "0.78rem",
                        color: "text.secondary",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.noted_at || "—"}
                    </TableCell>
                    <TableCell
                      sx={{
                        px: 1.5,
                        py: 0.75,
                        fontSize: "0.78rem",
                        color: "text.secondary",
                      }}
                    >
                      {item.noted_by_name || item.noted_by || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default MachineProfileCard;
