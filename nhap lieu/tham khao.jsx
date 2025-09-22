import React, { useState } from "react";
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  TextField,
  Button,
  Chip,
  Stack,
  Avatar,
  IconButton,
  Divider,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Switch,
  FormControlLabel,
  Tooltip,
  Badge,
} from "@mui/material";
import {
  Palette as PaletteIcon,
  Add as AddIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ColorLens as ColorLensIcon,
  Science as ScienceIcon,
  Inventory as InventoryIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
} from "@mui/icons-material";

const ColorPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedColors, setSelectedColors] = useState([]);

  // Mock data cho màu sắc
  const colors = [
    {
      id: 1,
      name: "Xanh Dương Hoàng Gia",
      code: "RAL 5002",
      hex: "#1E3A8A",
      category: "blue",
      stock: 85,
      unit: "kg",
      status: "available",
      lastUpdated: "2024-01-15",
      supplier: "AkzoNobel",
      price: 450000,
      description: "Màu xanh dương cổ điển, phù hợp cho sơn ngoại thất",
    },
    {
      id: 2,
      name: "Đỏ Tươi",
      code: "RAL 3020",
      hex: "#DC2626",
      category: "red",
      stock: 23,
      unit: "L",
      status: "low",
      lastUpdated: "2024-01-14",
      supplier: "Nippon Paint",
      price: 380000,
      description: "Màu đỏ tươi sáng, thường dùng cho biển báo",
    },
    {
      id: 3,
      name: "Vàng Chanh",
      code: "RAL 1018",
      hex: "#F59E0B",
      category: "yellow",
      stock: 156,
      unit: "kg",
      status: "available",
      lastUpdated: "2024-01-13",
      supplier: "Jotun",
      price: 420000,
      description: "Màu vàng chanh tươi mát, dùng cho nội thất",
    },
    {
      id: 4,
      name: "Xanh Lá Rừng",
      code: "RAL 6029",
      hex: "#059669",
      category: "green",
      stock: 0,
      unit: "L",
      status: "out_of_stock",
      lastUpdated: "2024-01-12",
      supplier: "Dulux",
      price: 395000,
      description: "Màu xanh lá đậm, phù hợp cho không gian tự nhiên",
    },
    {
      id: 5,
      name: "Tím Lavender",
      code: "RAL 4003",
      hex: "#8B5CF6",
      category: "purple",
      stock: 67,
      unit: "kg",
      status: "available",
      lastUpdated: "2024-01-11",
      supplier: "Berger",
      price: 510000,
      description: "Màu tím nhẹ nhàng, thích hợp cho phòng ngủ",
    },
    {
      id: 6,
      name: "Cam Sunset",
      code: "RAL 2004",
      hex: "#F97316",
      category: "orange",
      stock: 34,
      unit: "L",
      status: "low",
      lastUpdated: "2024-01-10",
      supplier: "Asian Paints",
      price: 365000,
      description: "Màu cam ấm áp như hoàng hôn",
    },
  ];

  const categories = [
    { value: "all", label: "Tất cả", count: colors.length },
    {
      value: "blue",
      label: "Xanh dương",
      count: colors.filter((c) => c.category === "blue").length,
    },
    {
      value: "red",
      label: "Đỏ",
      count: colors.filter((c) => c.category === "red").length,
    },
    {
      value: "yellow",
      label: "Vàng",
      count: colors.filter((c) => c.category === "yellow").length,
    },
    {
      value: "green",
      label: "Xanh lá",
      count: colors.filter((c) => c.category === "green").length,
    },
    {
      value: "purple",
      label: "Tím",
      count: colors.filter((c) => c.category === "purple").length,
    },
    {
      value: "orange",
      label: "Cam",
      count: colors.filter((c) => c.category === "orange").length,
    },
  ];

  const getStatusInfo = (status) => {
    switch (status) {
      case "available":
        return { label: "Có sẵn", color: "success", icon: <CheckCircleIcon /> };
      case "low":
        return { label: "Sắp hết", color: "warning", icon: <WarningIcon /> };
      case "out_of_stock":
        return { label: "Hết hàng", color: "error", icon: <ScheduleIcon /> };
      default:
        return {
          label: "Không xác định",
          color: "default",
          icon: <ScheduleIcon />,
        };
    }
  };

  const filteredColors = colors.filter((color) => {
    const matchesSearch =
      color.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      color.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      filterCategory === "all" || color.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const stats = [
    {
      label: "Tổng màu sắc",
      value: colors.length,
      icon: <PaletteIcon />,
      color: "#667eea",
      trend: "+5%",
    },
    {
      label: "Có sẵn",
      value: colors.filter((c) => c.status === "available").length,
      icon: <CheckCircleIcon />,
      color: "#10B981",
      trend: "Stable",
    },
    {
      label: "Sắp hết",
      value: colors.filter((c) => c.status === "low").length,
      icon: <WarningIcon />,
      color: "#F59E0B",
      trend: "+2",
    },
    {
      label: "Hết hàng",
      value: colors.filter((c) => c.status === "out_of_stock").length,
      icon: <ScheduleIcon />,
      color: "#EF4444",
      trend: "-1",
    },
  ];

  return (
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
            <PaletteIcon sx={{ fontSize: 30 }} />
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
              }}
            >
              🎨 Phòng Màu
            </Typography>
            <Typography variant="h6" color="text.secondary">
              Quản lý và theo dõi tồn kho màu sắc
            </Typography>
          </Box>
        </Stack>
      </Box>

      {/* Statistics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {stats.map((stat, index) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
            <Card
              elevation={0}
              sx={{
                p: 3,
                height: "100%",
                background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
                border: "1px solid rgba(0, 0, 0, 0.05)",
                borderRadius: "20px",
                transition: "all 0.3s ease",
                "&:hover": {
                  transform: "translateY(-4px)",
                  boxShadow: "0 12px 24px rgba(0, 0, 0, 0.1)",
                },
              }}
            >
              <Stack spacing={2} alignItems="center" textAlign="center">
                <Avatar
                  sx={{
                    width: 50,
                    height: 50,
                    background: `linear-gradient(45deg, ${stat.color}, ${stat.color}aa)`,
                  }}
                >
                  {stat.icon}
                </Avatar>
                <Typography variant="h4" fontWeight="bold">
                  {stat.value}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {stat.label}
                </Typography>
                <Chip
                  label={stat.trend}
                  size="small"
                  sx={{
                    background: `linear-gradient(45deg, ${stat.color}22, ${stat.color}44)`,
                    color: stat.color,
                    fontWeight: 600,
                  }}
                />
              </Stack>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Search and Filters */}
      <Card
        elevation={0}
        sx={{
          p: 3,
          mb: 4,
          borderRadius: "20px",
          background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
          border: "1px solid rgba(0, 0, 0, 0.05)",
        }}
      >
        <Stack spacing={3}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={2}
            alignItems="center"
          >
            <TextField
              placeholder="Tìm kiếm theo tên hoặc mã màu..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{
                flex: 1,
                "& .MuiOutlinedInput-root": {
                  borderRadius: "12px",
                  background: "white",
                },
              }}
              InputProps={{
                startAdornment: (
                  <SearchIcon sx={{ mr: 1, color: "text.secondary" }} />
                ),
              }}
            />

            <Button
              variant="outlined"
              startIcon={<FilterIcon />}
              onClick={() => setShowFilters(!showFilters)}
              sx={{
                borderRadius: "12px",
                minWidth: 120,
                background: showFilters ? "rgba(102, 126, 234, 0.1)" : "white",
              }}
            >
              Bộ lọc
            </Button>

            <Button
              variant="contained"
              startIcon={<AddIcon />}
              sx={{
                borderRadius: "12px",
                background: "linear-gradient(45deg, #667eea, #764ba2)",
                minWidth: 140,
                "&:hover": {
                  transform: "translateY(-2px)",
                  boxShadow: "0 8px 25px rgba(0, 0, 0, 0.15)",
                },
                transition: "all 0.3s ease",
              }}
            >
              Thêm màu mới
            </Button>
          </Stack>

          {/* Category Filter */}
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {categories.map((category) => (
              <Chip
                key={category.value}
                label={`${category.label} (${category.count})`}
                onClick={() => setFilterCategory(category.value)}
                variant={
                  filterCategory === category.value ? "filled" : "outlined"
                }
                color={
                  filterCategory === category.value ? "primary" : "default"
                }
                sx={{
                  borderRadius: "8px",
                  fontWeight: 600,
                  "&:hover": {
                    transform: "scale(1.05)",
                  },
                  transition: "all 0.2s ease",
                }}
              />
            ))}
          </Stack>
        </Stack>
      </Card>

      {/* Color Grid */}
      <Grid container spacing={3}>
        {filteredColors.map((color) => {
          const statusInfo = getStatusInfo(color.status);

          return (
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={color.id}>
              <Card
                elevation={0}
                sx={{
                  borderRadius: "20px",
                  border: "1px solid rgba(0, 0, 0, 0.05)",
                  transition: "all 0.3s ease",
                  "&:hover": {
                    transform: "translateY(-8px)",
                    boxShadow: "0 20px 40px rgba(0, 0, 0, 0.1)",
                  },
                }}
              >
                <CardContent sx={{ p: 0 }}>
                  {/* Color Preview */}
                  <Box
                    sx={{
                      height: 120,
                      background: `linear-gradient(135deg, ${color.hex}, ${color.hex}dd)`,
                      borderRadius: "20px 20px 0 0",
                      position: "relative",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Typography
                      variant="h6"
                      sx={{
                        color: "white",
                        fontWeight: 700,
                        textShadow: "2px 2px 4px rgba(0,0,0,0.5)",
                      }}
                    >
                      {color.code}
                    </Typography>

                    {/* Status Badge */}
                    <Chip
                      label={statusInfo.label}
                      color={statusInfo.color}
                      size="small"
                      icon={statusInfo.icon}
                      sx={{
                        position: "absolute",
                        top: 12,
                        right: 12,
                        fontWeight: 600,
                      }}
                    />
                  </Box>

                  {/* Content */}
                  <Box sx={{ p: 3 }}>
                    <Stack spacing={2}>
                      <Box>
                        <Typography variant="h6" fontWeight="bold" gutterBottom>
                          {color.name}
                        </Typography>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ mb: 1 }}
                        >
                          {color.description}
                        </Typography>
                      </Box>

                      <Divider />

                      <Grid container spacing={2}>
                        <Grid size={6}>
                          <Stack spacing={1}>
                            <Typography
                              variant="caption"
                              fontWeight="bold"
                              color="text.secondary"
                            >
                              TỒN KHO
                            </Typography>
                            <Typography variant="h6" fontWeight="bold">
                              {color.stock} {color.unit}
                            </Typography>
                          </Stack>
                        </Grid>
                        <Grid size={6}>
                          <Stack spacing={1}>
                            <Typography
                              variant="caption"
                              fontWeight="bold"
                              color="text.secondary"
                            >
                              GIÁ
                            </Typography>
                            <Typography
                              variant="h6"
                              fontWeight="bold"
                              color="primary.main"
                            >
                              {color.price.toLocaleString()}đ
                            </Typography>
                          </Stack>
                        </Grid>
                      </Grid>

                      <Stack spacing={1}>
                        <Typography
                          variant="caption"
                          fontWeight="bold"
                          color="text.secondary"
                        >
                          NHÀ CUNG CẤP
                        </Typography>
                        <Chip
                          label={color.supplier}
                          variant="outlined"
                          size="small"
                          sx={{ alignSelf: "flex-start" }}
                        />
                      </Stack>

                      <Stack
                        direction="row"
                        spacing={1}
                        justifyContent="space-between"
                        alignItems="center"
                      >
                        <Typography variant="caption" color="text.secondary">
                          Cập nhật: {color.lastUpdated}
                        </Typography>

                        <Stack direction="row" spacing={1}>
                          <Tooltip title="Xem chi tiết">
                            <IconButton size="small">
                              <VisibilityIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Chỉnh sửa">
                            <IconButton size="small">
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Xóa">
                            <IconButton size="small" color="error">
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </Stack>
                    </Stack>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Empty State */}
      {filteredColors.length === 0 && (
        <Paper
          elevation={0}
          sx={{
            p: 8,
            textAlign: "center",
            borderRadius: "20px",
            background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
            mt: 4,
          }}
        >
          <ColorLensIcon
            sx={{ fontSize: 80, color: "text.secondary", mb: 2 }}
          />
          <Typography variant="h5" fontWeight="bold" gutterBottom>
            Không tìm thấy màu sắc
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            sx={{
              background: "linear-gradient(45deg, #667eea, #764ba2)",
              borderRadius: "12px",
            }}
          >
            Thêm màu mới
          </Button>
        </Paper>
      )}
    </Container>
  );
};

export default ColorPage;
