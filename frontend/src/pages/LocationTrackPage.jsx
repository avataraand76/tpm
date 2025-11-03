// frontend/src/pages/LocationTrackPage.jsx

import React, { useState, useEffect, useCallback } from "react";
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
  ListItemButton,
  ListItemIcon,
  ListItemText,
  CardContent,
} from "@mui/material";
import {
  LocationOn,
  ArrowForward,
  Business,
  MeetingRoom,
  Refresh,
} from "@mui/icons-material";
import NavigationBar from "../components/NavigationBar";
import { api } from "../api/api";

const LocationTrackPage = () => {
  // <<< BẮT ĐẦU THÊM MỚI STATE CHO ĐƠN VỊ >>>
  const [departments, setDepartments] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  // <<< KẾT THÚC THÊM MỚI STATE CHO ĐƠN VỊ >>>

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
  });

  // BỔ SUNG STATES CHO PHÂN TRANG
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;

  // History Dialog States
  const [openHistoryDialog, setOpenHistoryDialog] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // ĐỊNH NGHĨA CONFIG TRẠNG THÁI (ĐỒNG BỘ VỚI TicketManagementPage.jsx)
  const STATUS_CONFIG = {
    available: { bg: "#2e7d3222", color: "#2e7d32", label: "Sẵn sàng" },
    in_use: { bg: "#667eea22", color: "#667eea", label: "Đang sử dụng" },
    maintenance: { bg: "#ff980022", color: "#ff9800", label: "Bảo trì" },
    rented: { bg: "#673ab722", color: "#673ab7", label: "Đang thuê" },
    borrowed: { bg: "#03a9f422", color: "#03a9f4", label: "Đang mượn" },
    borrowed_out: { bg: "#00bcd422", color: "#00bcd4", label: "Cho mượn" },
    liquidation: { bg: "#f4433622", color: "#f44336", label: "Thanh lý" },
    disabled: { bg: "#9e9e9e22", color: "#9e9e9e", label: "Vô hiệu hóa" },
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
        const params = { page: pageNumber, limit: limitNumber };
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
    [limit]
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

  // <<< BẮT ĐẦU SỬA ĐỔI useEffect >>>
  useEffect(() => {
    // fetchLocations(); // <-- XÓA DÒNG NÀY
    fetchDepartments(); // <-- THAY BẰNG DÒNG NÀY
  }, [fetchDepartments]); // <-- CẬP NHẬT DEPENDENCY

  // THÊM useEffect NÀY: Tải Vị trí khi Đơn vị thay đổi
  useEffect(() => {
    if (selectedDepartment) {
      fetchLocations(selectedDepartment.uuid_department);
    } else {
      fetchLocations(null); // Xóa danh sách vị trí nếu không chọn đơn vị
    }
  }, [selectedDepartment, fetchLocations]);
  // <<< KẾT THÚC SỬA ĐỔI useEffect >>>

  // useEffect để tự động tải lại máy móc khi `selectedLocation` hoặc `page` thay đổi
  useEffect(() => {
    if (selectedLocation) {
      // Chỉ gọi API khi selectedLocation có giá trị (tránh gọi API lúc khởi tạo)
      fetchMachinesAtLocation(selectedLocation.uuid_location, page, limit);
    } else {
      // Reset khi không có vị trí nào được chọn
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
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLocation, page, limit]); // Bỏ fetchMachinesAtLocation khỏi dependency

  // --- Handlers ---

  // <<< BẮT ĐẦU SỬA ĐỔI HANDLERS >>>
  // THÊM HANDLER NÀY
  const handleDepartmentChange = (department) => {
    setSelectedDepartment(department);
    // Reset vị trí và máy móc khi đổi đơn vị
    setSelectedLocation(null);
    setMachinesAtLocation([]);
    setPage(1);
  };

  // SỬA HANDLER NÀY (nhận object thay vì event)
  const handleLocationChange = (location) => {
    setSelectedLocation(location);
    // Reset phân trang và danh sách khi thay đổi vị trí
    setPage(1);
  };
  // <<< KẾT THÚC SỬA ĐỔI HANDLERS >>>

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

  const handleRefresh = () => {
    // 1. Tải lại danh sách Đơn vị
    fetchDepartments();

    // 2. Nếu đang chọn 1 vị trí, tải lại danh sách máy của vị trí đó
    if (selectedLocation) {
      setPage(1); // Quay về trang 1
      fetchMachinesAtLocation(selectedLocation.uuid_location, 1, limit);
    } else {
      // Nếu không, chỉ cần reset danh sách máy
      setMachinesAtLocation([]);
      setTotalPages(1);
      setPage(1);
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

    if (!selectedLocation) {
      // Sửa điều kiện
      return (
        <Alert severity="info" sx={{ borderRadius: "12px", mt: 1 }}>
          <Typography variant="body1" sx={{ fontWeight: 500 }}>
            Vui lòng chọn một vị trí để xem danh sách máy móc.
          </Typography>
        </Alert>
      );
    }
    const stats = locationStats;
    const renderStatsCards = () => (
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {/* Tổng số máy (Thẻ Lớn) */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card
            elevation={0}
            sx={{
              borderRadius: "20px",
              background:
                "linear-gradient(135deg, #667eea22 0%, #764ba222 100%)",
              border: "1px solid rgba(0, 0, 0, 0.05)",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            <CardContent sx={{ textAlign: "center", p: 3 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Tổng số máy (tại vị trí)
              </Typography>
              <Typography variant="h3" fontWeight="bold" color="#667eea">
                {stats.total || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Các thẻ nhỏ */}
        <Grid size={{ xs: 12, sm: 6, md: 9 }}>
          <Grid container spacing={2}>
            {/* Hàng 1 */}
            <Grid size={{ xs: 4, md: 2.4 }}>
              <Card
                elevation={0}
                sx={{ borderRadius: "20px", background: "#2e7d3211" }}
              >
                <CardContent sx={{ textAlign: "center", p: 2 }}>
                  <Typography variant="h5" fontWeight="bold" color="#2e7d32">
                    {stats.available || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Sẵn sàng
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 4, md: 2.4 }}>
              <Card
                elevation={0}
                sx={{ borderRadius: "20px", background: "#1976d211" }}
              >
                <CardContent sx={{ textAlign: "center", p: 2 }}>
                  <Typography variant="h5" fontWeight="bold" color="#1976d2">
                    {stats.in_use || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Đang sử dụng
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 4, md: 2.4 }}>
              <Card
                elevation={0}
                sx={{ borderRadius: "20px", background: "#ff980011" }}
              >
                <CardContent sx={{ textAlign: "center", p: 2 }}>
                  <Typography variant="h5" fontWeight="bold" color="#ff9800">
                    {stats.maintenance || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Bảo trì
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 4, md: 2.4 }}>
              <Card
                elevation={0}
                sx={{ borderRadius: "20px", background: "#f4433611" }}
              >
                <CardContent sx={{ textAlign: "center", p: 2 }}>
                  <Typography variant="h5" fontWeight="bold" color="#f44336">
                    {stats.liquidation || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Thanh lý
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 4, md: 2.4 }}>
              <Card
                elevation={0}
                sx={{ borderRadius: "20px", background: "#9e9e9e11" }}
              >
                <CardContent sx={{ textAlign: "center", p: 2 }}>
                  <Typography variant="h5" fontWeight="bold" color="#9e9e9e">
                    {stats.disabled || 0}/{stats.broken || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Vô hiệu/Hư
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            {/* Hàng 2 */}
            <Grid size={{ xs: 4, md: 2.4 }}>
              <Card
                elevation={0}
                sx={{ borderRadius: "20px", background: "#673ab711" }}
              >
                <CardContent sx={{ textAlign: "center", p: 2 }}>
                  <Typography variant="h5" fontWeight="bold" color="#673ab7">
                    {stats.rented || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Thuê
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 4, md: 2.4 }}>
              <Card
                elevation={0}
                sx={{ borderRadius: "20px", background: "#673ab711" }}
              >
                <CardContent sx={{ textAlign: "center", p: 2 }}>
                  <Typography variant="h5" fontWeight="bold" color="#673ab7">
                    {stats.rented_return || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Đã trả (Thuê)
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 4, md: 2.4 }}>
              <Card
                elevation={0}
                sx={{ borderRadius: "20px", background: "#03a9f411" }}
              >
                <CardContent sx={{ textAlign: "center", p: 2 }}>
                  <Typography variant="h5" fontWeight="bold" color="#03a9f4">
                    {stats.borrowed || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Mượn
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 4, md: 2.4 }}>
              <Card
                elevation={0}
                sx={{ borderRadius: "20px", background: "#03a9f411" }}
              >
                <CardContent sx={{ textAlign: "center", p: 2 }}>
                  <Typography variant="h5" fontWeight="bold" color="#03a9f4">
                    {stats.borrowed_return || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Đã trả (Mượn)
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 4, md: 2.4 }}>
              <Card
                elevation={0}
                sx={{ borderRadius: "20px", background: "#00bcd411" }}
              >
                <CardContent sx={{ textAlign: "center", p: 2 }}>
                  <Typography variant="h5" fontWeight="bold" color="#00bcd4">
                    {stats.borrowed_out || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Cho mượn
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    );

    if (machinesAtLocation.length === 0 && !loadingMachines) {
      return (
        <Typography
          variant="body1"
          color="text.secondary"
          align="center"
          sx={{ mt: 3 }}
        >
          Không có máy móc nào tại vị trí này.
        </Typography>
      );
    }

    return (
      <>
        {renderStatsCards()}
        <TableContainer
          component={Paper}
          elevation={1}
          sx={{
            borderRadius: "12px",
            border: "1px solid rgba(0, 0, 0, 0.05)",
            mb: 2, // Thêm margin bottom cho phân trang
          }}
        >
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: "rgba(102, 126, 234, 0.05)" }}>
                <TableCell sx={{ fontWeight: 600 }}>Mã máy</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Loại máy</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Model</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Serial</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>
                  Trạng thái (chính)
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>
                  Trạng thái (mượn/thuê)
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {machinesAtLocation.map((machine) => {
                const statusInfo = getStatusInfo(machine.current_status);
                const borrowStatusInfo =
                  machine.is_borrowed_or_rented_or_borrowed_out
                    ? getStatusInfo(
                        machine.is_borrowed_or_rented_or_borrowed_out
                      )
                    : null;
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
                    <TableCell>{machine.type_machine || "-"}</TableCell>
                    <TableCell>{machine.model_machine || "-"}</TableCell>
                    <TableCell>{machine.serial_machine || "-"}</TableCell>
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

        {/* PHÂN TRANG */}
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
                variant="h3"
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
              <Typography variant="h6" color="text.secondary">
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
            p: 4,
          }}
        >
          <Grid container spacing={4}>
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
                  alignItems: "center",
                  justifyContent: "space-between",
                  mb: 2,
                }}
              >
                {/* Tiêu đề và Chip */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <Typography variant="h5" sx={{ fontWeight: 600 }}>
                    3. Máy móc thiết bị tại{" "}
                    {selectedLocation ? selectedLocation.name_location : "..."}
                  </Typography>
                </Box>

                {/* NÚT LÀM MỚI (CHUYỂN VỀ ĐÂY) */}
                <Button
                  variant="contained"
                  startIcon={<Refresh />}
                  onClick={handleRefresh}
                  disabled={!selectedLocation} // Chỉ cho phép làm mới khi đã chọn vị trí
                  sx={{
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
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: "20px",
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
            Lịch sử di chuyển - {selectedMachine?.code_machine} -{" "}
            {selectedMachine?.type_machine} - {selectedMachine?.model_machine}
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
                        <TableCell sx={{ fontWeight: 600 }}>Ngày</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>
                          Từ vị trí
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600 }}></TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>
                          Đến vị trí
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>
                          Người tạo
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {historyData.length > 0 ? (
                        historyData.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>{formatDate(item.move_date)}</TableCell>
                            <TableCell>
                              {item.from_location_name || "-"}
                            </TableCell>
                            <TableCell align="center">
                              <ArrowForward color="primary" fontSize="small" />
                            </TableCell>
                            <TableCell>
                              {item.to_location_name || "-"}
                            </TableCell>
                            <TableCell>{item.created_by || "System"}</TableCell>
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
