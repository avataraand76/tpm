// frontend/src/pages/HomePage.jsx

import React from "react";
import { useNavigate } from "react-router-dom";
import {
  AdminPanelSettings,
  Assessment,
  autoGrid,
  Avatar,
  Box,
  CalendarMonth,
  Card,
  Container,
  Dashboard,
  gradients,
  LocationOn,
  NavCard,
  PageHeader,
  PrecisionManufacturing,
  Receipt,
  sx as preset,
  Typography,
} from "../ui";
import NavigationBar from "../components/NavigationBar";
import { useAuth } from "../hooks/useAuth";

// ---------------------------------------------------------------------------
// Toàn bộ nội dung điều hướng khai báo bằng DỮ LIỆU, không phải JSX.
// Thêm một trang mới = thêm một dòng ở đây.
// `requires` để trống nghĩa là ai cũng thấy.
// ---------------------------------------------------------------------------
const NAV_ITEMS = [
  {
    accent: "red",
    icon: <Receipt />,
    title: "📋 Phiếu xuất nhập",
    description: (
      <>
        Tạo và quản lý phiếu nhập xuất
        <br />
        máy móc thiết bị
      </>
    ),
    actionLabel: "Quản lý phiếu",
    path: "/tickets2",
  },
  {
    accent: "green",
    icon: <PrecisionManufacturing />,
    title: "🔧 Danh sách máy móc",
    description: (
      <>
        Quản lý và xem thông tin chi tiết
        <br />
        máy móc thiết bị
      </>
    ),
    actionLabel: "Xem danh sách",
    path: "/machines",
  },
  {
    accent: "cyan",
    icon: <LocationOn />,
    title: "🗺️ Theo dõi vị trí",
    description: "Kiểm tra máy móc tại một vị trí và xem lịch sử điều chuyển",
    actionLabel: "Truy cập",
    path: "/location-track",
  },
  {
    accent: "amber",
    icon: <CalendarMonth />,
    title: "🛠️ Lịch bảo dưỡng",
    description: (
      <>
        Theo dõi và quản lý lịch bảo trì
        <br />
        máy móc theo ngày/tháng
      </>
    ),
    actionLabel: "Xem lịch",
    path: "/maintenance-schedule",
  },
  {
    accent: "purple",
    icon: <Assessment />,
    title: "📊 Báo cáo thống kê",
    description: (
      <>
        Xem báo cáo tổng hợp, thống kê
        <br />
        kiểm kê và lịch sử bảo trì bảo dưỡng
      </>
    ),
    actionLabel: "Xem báo cáo",
    path: "/reports",
  },
  {
    accent: "slate",
    icon: <AdminPanelSettings />,
    title: "🛡️ ADMIN",
    description: (
      <>
        Quản lý tài khoản, phân quyền
        <br />
        và cấu hình dữ liệu hệ thống
      </>
    ),
    actionLabel: "Truy cập",
    path: "/admin",
    requires: "admin",
  },
];

const HomePage = () => {
  const navigate = useNavigate();
  const { permissions = [] } = useAuth() || {};

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.requires || permissions.includes(item.requires)
  );

  return (
    <>
      <NavigationBar />
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <PageHeader
          icon={<Dashboard />}
          title="TPM"
          subtitle="Hệ thống quản lý máy móc thiết bị TPM"
        />

        {/* Khối chào mừng */}
        <Card
          elevation={0}
          sx={{
            ...preset.softCard,
            p: { xs: 3, sm: 6 },
            my: 6,
            textAlign: "center",
            background: gradients.brandWash,
          }}
        >
          <Avatar
            sx={{
              width: 80,
              height: 80,
              background: gradients.brand,
              mx: "auto",
              mb: 3,
            }}
          >
            <Dashboard sx={{ fontSize: 40 }} />
          </Avatar>
          <Typography
            variant="h3"
            fontWeight="bold"
            gutterBottom
            sx={preset.gradientText()}
          >
            🎉 Chào mừng đến với TPM System!
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
            Hệ thống quản lý, bảo trì máy móc thiết bị sản xuất
          </Typography>
        </Card>

        {/* Điều hướng nhanh */}
        <Box sx={{ mb: 6 }}>
          <Typography
            variant="h4"
            gutterBottom
            sx={{
              mb: 4,
              fontWeight: 600,
              textAlign: "center",
              ...preset.gradientText(),
            }}
          >
            🚀 Điều hướng nhanh
          </Typography>

          {/* Lưới tự tính số cột theo bề rộng thật, không dán cứng breakpoint */}
          <Box sx={autoGrid(250, 3, 3)}>
            {visibleItems.map((item) => (
              <NavCard
                key={item.path}
                accent={item.accent}
                icon={item.icon}
                title={item.title}
                description={item.description}
                actionLabel={item.actionLabel}
                onAction={() => navigate(item.path)}
              />
            ))}
          </Box>
        </Box>
      </Container>
    </>
  );
};

export default HomePage;
