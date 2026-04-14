// frontend/src/pages/MaintenanceSchedulePage.jsx

import React, { useState, useEffect, useCallback } from "react";
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

// ==================== MachineCard Component ====================
const MachineCard = ({ machine }) => {
  const statusCfg = STATUS_CONFIG[machine.current_status] || {
    label: machine.current_status || "N/A",
    color: "#757575",
    bg: "#f5f5f5",
  };

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
      sx={{
        borderRadius: "16px",
        border: "1px solid rgba(0,0,0,0.08)",
        transition: "all 0.2s ease",
        height: "100%",
        "&:hover": {
          boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
          transform: "translateY(-2px)",
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

        {/* Date badge */}
        <Box sx={{ mt: 1, pt: 0.75, borderTop: "1px dashed #e0e0e0" }}>
          <Typography
            variant="caption"
            sx={{ color: "#667eea", fontWeight: 700, fontSize: "0.75rem" }}
          >
            Ngày {machine.day}/{machine.month}/{machine.year}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

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
}) => {
  const grouped = {};
  machines.forEach((m) => {
    if (!grouped[m.day]) grouped[m.day] = [];
    grouped[m.day].push(m);
  });

  const sortedDays = Object.keys(grouped)
    .map(Number)
    .sort((a, b) => a - b);

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
              {dayMachines.map((machine, idx) => (
                <Grid
                  key={machine.id_maintenance_schedule_detail || idx}
                  size={{ xs: 12, sm: 6, md: 4, lg: 3 }}
                >
                  <MachineCard machine={machine} />
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

  // ── Scroll-to-top FAB ──
  const [showScrollTop, setShowScrollTop] = useState(false);
  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 500);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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
    filterSupplier;

  const clearFilters = () => {
    resetAllFilters();
    setSearchTerm("");
  };

  // ── Apply all filters → passed to CalendarCard ──
  const deptLocationFiltered = scheduleData.filter((item) => {
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

  // ── Full filtered list for machine cards (+ day + search) ──
  const filteredMachines = deptLocationFiltered.filter((item) => {
    if (selectedDay && item.day !== selectedDay) return false;
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

  // ── Stats (based on filtered data) ──
  const totalMachines = deptLocationFiltered.length;
  const todayMachines = deptLocationFiltered.filter(
    (i) =>
      i.day === vnToday.getDate() &&
      currentMonth === vnToday.getMonth() + 1 &&
      currentYear === vnToday.getFullYear()
  ).length;
  const activeDays = new Set(deptLocationFiltered.map((i) => i.day)).size;

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
          <Grid size={{ xs: 12, md: 4, lg: 3 }}>
            <Card
              elevation={0}
              sx={{
                borderRadius: "20px",
                border: "1px solid rgba(0,0,0,0.08)",
                background: "#fff",
                position: "sticky",
                top: 80,
                maxHeight: "calc(100vh - 150px)",
                display: "flex",
                flexDirection: "column",
              }}
            >
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
                    scheduleData={deptLocationFiltered}
                    selectedDay={selectedDay}
                    onDayClick={handleDayClick}
                  />
                )}

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
                    Thống kê tháng này{hasActiveFilter ? " (đã lọc)" : ""}
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
                        color: "#764ba2",
                        bg: "rgba(118,75,162,0.08)",
                      },
                      {
                        label: "Ngày BD",
                        value: activeDays,
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
                            sx={{ fontSize: "0.65rem" }}
                          >
                            {s.label}
                          </Typography>
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
                  direction={{ xs: "column", sm: "row" }}
                  alignItems={{ xs: "flex-start", sm: "center" }}
                  justifyContent="space-between"
                  spacing={1.5}
                  sx={{ mb: 1.5 }}
                >
                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    <Avatar
                      sx={{
                        width: 38,
                        height: 38,
                        background: "linear-gradient(45deg, #667eea, #764ba2)",
                      }}
                    >
                      <PrecisionManufacturing sx={{ fontSize: 20 }} />
                    </Avatar>
                    <Box>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography variant="h6" fontWeight={700}>
                          {selectedDay
                            ? `Ngày ${selectedDay}/${currentMonth}/${currentYear}`
                            : `${MONTH_NAMES[currentMonth - 1]} ${currentYear}`}
                        </Typography>
                        <Chip
                          label={`${filteredMachines.length} máy`}
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

                  {/* Search */}
                  <TextField
                    placeholder="Tìm kiếm máy móc..."
                    size="small"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    sx={{
                      minWidth: 220,
                      "& .MuiOutlinedInput-root": { borderRadius: "12px" },
                    }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Search fontSize="small" />
                        </InputAdornment>
                      ),
                      endAdornment: searchTerm ? (
                        <InputAdornment position="end">
                          <IconButton
                            size="small"
                            onClick={() => setSearchTerm("")}
                            edge="end"
                          >
                            <Close fontSize="small" />
                          </IconButton>
                        </InputAdornment>
                      ) : null,
                    }}
                  />
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
                ) : filteredMachines.length === 0 ? (
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
                    {filteredMachines.map((machine, idx) => (
                      <Grid
                        key={machine.id_maintenance_schedule_detail || idx}
                        size={{ xs: 12, sm: 6, md: 4, lg: 3 }}
                      >
                        <MachineCard machine={machine} />
                      </Grid>
                    ))}
                  </Grid>
                ) : (
                  <GroupedByDay
                    machines={filteredMachines}
                    onDaySelect={handleDayClick}
                    currentYear={currentYear}
                    currentMonth={currentMonth}
                    vnToday={vnToday}
                  />
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>

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
