// frontend/src/pages/ReportPage.jsx

import React, { useState, useEffect, useCallback } from "react";
import {
  Container,
  Typography,
  Box,
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
} from "@mui/icons-material";
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

  // Aggregated maintenance progress metrics
  const maintTotal = reportData.maintenance?.summary?.total || 0;
  const maintPending = reportData.maintenance?.summary?.pending || 0;
  const maintCompleted = reportData.maintenance?.summary?.completed || 0;
  const maintConfirmed = reportData.maintenance?.summary?.confirmed || 0;
  const maintDoneTotal = maintCompleted + maintConfirmed;

  const pctDone =
    maintTotal > 0 ? Math.round((maintDoneTotal / maintTotal) * 100) : 0;
  // const pctConfirmed =
  //   maintTotal > 0 ? Math.round((maintConfirmed / maintTotal) * 100) : 0;

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
        <Tabs
          value={activeTab}
          onChange={(_, val) => setActiveTab(val)}
          textColor="primary"
          indicatorColor="primary"
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
        </Tabs>

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
                          {[
                            {
                              label: "Tổng số máy",
                              value: maintTotal,
                              bg: "rgba(102,126,234,0.08)",
                              color: "#667eea",
                            },
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
                            // {
                            //   label: "Đã hoàn thành",
                            //   value: maintConfirmed,
                            //   bg: MAINT_STATUS_CONFIG.confirm_completed.bg,
                            //   color:
                            //     MAINT_STATUS_CONFIG.confirm_completed.color,
                            // },
                          ].map((card, idx) => (
                            <Grid size={{ xs: 6, sm: 4 }} key={idx}>
                              <Box
                                sx={{
                                  p: 2.5,
                                  borderRadius: "12px",
                                  bgcolor: card.bg,
                                  textAlign: "center",
                                  boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
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
                          <Grid size={{ xs: 12, md: 12 }}>
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
                                  Tiến độ thực hiện
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

                          {/* <Grid size={{ xs: 12, md: 6 }}>
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
                                  Tiến độ hoàn thành
                                </Typography>
                                <Typography
                                  variant="caption"
                                  fontWeight={700}
                                  sx={{ color: "#2e7d32" }}
                                >
                                  {pctConfirmed}% (
                                  {new Intl.NumberFormat("en-US").format(
                                    maintConfirmed
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
                                    width: `${pctConfirmed}%`,
                                    height: "100%",
                                    background:
                                      "linear-gradient(90deg, #66bb6a 0%, #2e7d32 100%)",
                                    borderRadius: 5,
                                  }}
                                />
                              </Box>
                            </Stack>
                          </Grid> */}
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
                            <TableCell sx={{ fontWeight: 700, pl: 3 }}>
                              <Stack
                                direction="row"
                                spacing={1}
                                alignItems="center"
                              >
                                <Business fontSize="small" color="action" />
                                <Typography
                                  variant="subtitle2"
                                  fontWeight={700}
                                >
                                  Đơn vị
                                </Typography>
                              </Stack>
                            </TableCell>
                            <TableCell sx={{ fontWeight: 700 }} align="center">
                              Tổng số máy
                            </TableCell>
                            <TableCell
                              sx={{
                                fontWeight: 700,
                                color: MAINT_STATUS_CONFIG.pending.color,
                              }}
                              align="center"
                            >
                              Chưa thực hiện
                            </TableCell>
                            <TableCell
                              sx={{
                                fontWeight: 700,
                                color: MAINT_STATUS_CONFIG.completed.color,
                              }}
                              align="center"
                            >
                              Đã thực hiện
                            </TableCell>
                            {/* <TableCell
                              sx={{
                                fontWeight: 700,
                                color:
                                  MAINT_STATUS_CONFIG.confirm_completed.color,
                              }}
                              align="center"
                            >
                              Đã hoàn thành
                            </TableCell> */}
                            <TableCell sx={{ fontWeight: 700 }} align="center">
                              Tiến độ thực hiện
                            </TableCell>
                            {/* <TableCell sx={{ fontWeight: 700 }} align="center">
                              Tiến độ hoàn thành
                            </TableCell> */}
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
                              // const deptConfirmedPct =
                              //   dept.total > 0
                              //     ? Math.round(
                              //         (dept.confirmed / dept.total) * 100
                              //       )
                              //     : 0;
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
                                  {/* <TableCell
                                    align="center"
                                    sx={{
                                      color:
                                        MAINT_STATUS_CONFIG.confirm_completed
                                          .color,
                                      fontWeight: 600,
                                    }}
                                  >
                                    {new Intl.NumberFormat("en-US").format(
                                      dept.confirmed
                                    )}
                                  </TableCell> */}
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
                                      >
                                        {deptPct}%
                                      </Typography>
                                    </Stack>
                                  </TableCell>
                                  {/* <TableCell align="center">
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
                                            width: `${deptConfirmedPct}%`,
                                            height: "100%",
                                            bgcolor:
                                              deptConfirmedPct === 100
                                                ? "#2e7d32"
                                                : "#1976d2",
                                            borderRadius: 3,
                                          }}
                                        />
                                      </Box>
                                      <Typography
                                        variant="body2"
                                        fontWeight={700}
                                      >
                                        {deptConfirmedPct}%
                                      </Typography>
                                    </Stack>
                                  </TableCell> */}
                                </TableRow>
                              );
                            }
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
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
