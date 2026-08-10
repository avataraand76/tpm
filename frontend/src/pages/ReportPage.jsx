// frontend/src/pages/ReportPage.jsx

import React, { useState, useEffect, useCallback } from "react";
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
  useTheme,
  useMediaQuery,
} from "@mui/material";
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
} from "@mui/icons-material";
import ExcelJS from "exceljs";
import NavigationBar from "../components/NavigationBar";
import httpConnect from "../api/api"; // Default export is httpConnect axios instance

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
  });

  const fetchReportData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await httpConnect.get("/api/reports/monthly-summary", {
        params: { year: currentYear, month: currentMonth },
      });
      if (response.data?.success) {
        setReportData(response.data.data);
      } else {
        setError(response.data?.message || "Lỗi tải dữ liệu báo cáo");
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

  return (
    <>
      <NavigationBar />
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Page Header */}
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

        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: "12px" }}>
            {error}
          </Alert>
        )}

        {/* Tab Selection */}
        {isMobile ? (
          <Grid container spacing={1} sx={{ mb: 3 }}>
            {[
              {
                label: "Thống kê kiểm kê",
                icon: <Receipt sx={{ fontSize: 20 }} />,
                value: 0,
              },
              {
                label: "Thống kê bảo dưỡng",
                icon: <CalendarMonth sx={{ fontSize: 20 }} />,
                value: 1,
              },
              {
                label: "Thống kê lưu lượng khí nén",
                icon: <Air sx={{ fontSize: 20 }} />,
                value: 2,
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
            {activeTab === 0 && (
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
            {activeTab === 1 && (
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
            {activeTab === 2 && (
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
          </Box>
        )}
      </Container>
    </>
  );
};

export default ReportPage;
