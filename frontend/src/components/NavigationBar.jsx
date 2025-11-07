// frontend/src/components/NavigationBar.jsx

import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Avatar,
  Menu,
  MenuItem,
  IconButton,
  Tabs,
  Tab,
  useTheme, // NEW: Import useTheme
  useMediaQuery, // NEW: Import useMediaQuery
} from "@mui/material";
import {
  AccountCircle,
  ExitToApp,
  Home,
  Science,
  Psychology,
  Dashboard,
  PrecisionManufacturing,
  Receipt,
  LocationOn,
  Menu as MenuIcon, // NEW: Import MenuIcon
} from "@mui/icons-material";
import { useAuth } from "../hooks/useAuth";

const NavigationBar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [anchorEl, setAnchorEl] = React.useState(null); // State cho menu người dùng
  const [mobileAnchorEl, setMobileAnchorEl] = React.useState(null); // NEW: State cho menu mobile

  // NEW: Sử dụng hook để kiểm tra kích thước màn hình
  const theme = useTheme();
  // "md" (medium) là breakpoint, bạn có thể đổi thành "sm" (small) nếu muốn
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const getCurrentTab = () => {
    const pathname = location.pathname;
    if (pathname === "/") return 0;
    if (pathname === "/machines") return 1;
    if (pathname === "/tickets") return 2;
    if (pathname === "/location-track") return 3;
    return 0;
  };

  const handleTabChange = (event, newValue) => {
    const routes = ["/", "/machines", "/tickets", "/location-track"];
    navigate(routes[newValue]);
  };

  // Handlers cho Menu Người dùng (Profile/Logout)
  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
    handleClose();
  };

  const handleProfile = () => {
    // Navigate to profile page if you have one
    handleClose();
  };

  // NEW: Handlers cho Menu Mobile (Navigation)
  const handleMobileMenuOpen = (event) => {
    setMobileAnchorEl(event.currentTarget);
  };

  const handleMobileMenuClose = () => {
    setMobileAnchorEl(null);
  };

  // NEW: Handler khi click vào item trong menu mobile
  const handleMobileNav = (route) => {
    navigate(route);
    handleMobileMenuClose();
  };

  if (!isAuthenticated) {
    return null; // Don't show navigation bar if not authenticated
  }

  // Danh sách các mục điều hướng (dùng chung cho mobile)
  const navItems = [
    { label: "Trang chủ", icon: <Home />, route: "/" },
    { label: "Máy móc", icon: <PrecisionManufacturing />, route: "/machines" },
    { label: "Quản lý phiếu", icon: <Receipt />, route: "/tickets" },
    { label: "Vị trí", icon: <LocationOn />, route: "/location-track" },
  ];

  return (
    <AppBar
      position="static"
      elevation={0}
      sx={{
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
      }}
    >
      <Toolbar sx={{ py: 1 }}>
        {/* UPDATED: Logic render theo kích thước màn hình */}
        {isMobile ? (
          <>
            {/* === GIAO DIỆN MOBILE === */}
            <IconButton
              size="large"
              edge="start"
              color="inherit"
              aria-label="menu"
              sx={{ mr: 1 }}
              onClick={handleMobileMenuOpen}
            >
              <MenuIcon />
            </IconButton>
            <Typography
              variant="h6"
              component="div"
              sx={{
                flexGrow: 1,
                fontWeight: 700,
                color: "white",
                textShadow: "2px 2px 4px rgba(0,0,0,0.3)",
              }}
            >
              TPM System
            </Typography>
          </>
        ) : (
          <>
            {/* === GIAO DIỆN DESKTOP === */}
            <Box sx={{ display: "flex", alignItems: "center", mr: 4 }}>
              <Avatar
                sx={{
                  width: 40,
                  height: 40,
                  background: "rgba(255, 255, 255, 0.2)",
                  mr: 2,
                }}
              >
                <Dashboard />
              </Avatar>
              <Typography
                variant="h5"
                component="div"
                sx={{
                  fontWeight: 700,
                  color: "white",
                  textShadow: "2px 2px 4px rgba(0,0,0,0.3)",
                }}
              >
                TPM System
              </Typography>
            </Box>

            {/* Navigation Tabs (Chỉ hiển thị trên desktop) */}
            <Box sx={{ flexGrow: 1 }}>
              <Tabs
                value={getCurrentTab()}
                onChange={handleTabChange}
                textColor="inherit"
                sx={{
                  "& .MuiTab-root": {
                    color: "rgba(255, 255, 255, 0.8)",
                    fontWeight: 600,
                    fontSize: "1rem",
                    minWidth: 140,
                    borderRadius: "12px",
                    margin: "0 4px",
                    transition: "all 0.3s ease",
                    "&.Mui-selected": {
                      color: "white",
                      background: "rgba(255, 255, 255, 0.2)",
                      backdropFilter: "blur(10px)",
                      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                    },
                    "&:hover": {
                      background: "rgba(255, 255, 255, 0.1)",
                      transform: "translateY(-2px)",
                    },
                  },
                  "& .MuiTabs-indicator": {
                    display: "none",
                  },
                }}
              >
                <Tab icon={<Home />} label="Trang chủ" iconPosition="start" />
                <Tab
                  icon={<PrecisionManufacturing />}
                  label="Máy móc"
                  iconPosition="start"
                />
                <Tab
                  icon={<Receipt />}
                  label="Quản lý phiếu"
                  iconPosition="start"
                />
                <Tab
                  icon={<LocationOn />}
                  label="Vị trí"
                  iconPosition="start"
                />
              </Tabs>
            </Box>

            {/* Welcome Message (Chỉ hiển thị trên desktop) */}
            <Box
              sx={{
                mr: 3,
                px: 2,
                py: 1,
                borderRadius: "12px",
                background: "rgba(255, 255, 255, 0.1)",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
              }}
            >
              <Typography
                variant="body1"
                sx={{
                  color: "white",
                  fontWeight: 600,
                  textShadow: "1px 1px 2px rgba(0,0,0,0.2)",
                }}
              >
                👋 Xin chào, {user?.name}
              </Typography>
            </Box>
          </>
        )}

        {/* === PHẦN CHUNG: MENU NGƯỜI DÙNG === */}
        {/* (Hiển thị trên cả mobile và desktop) */}
        <div>
          <IconButton
            size="large"
            aria-label="account of current user"
            aria-controls="menu-appbar"
            aria-haspopup="true"
            onClick={handleMenu}
            sx={{
              color: "white",
              background: "rgba(255, 255, 255, 0.1)",
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              "&:hover": {
                background: "rgba(255, 255, 255, 0.2)",
                transform: "translateY(-2px)",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
              },
              transition: "all 0.3s ease",
            }}
          >
            <AccountCircle />
          </IconButton>
          <Menu
            id="menu-appbar"
            anchorEl={anchorEl}
            anchorOrigin={{
              vertical: "top",
              horizontal: "right",
            }}
            keepMounted
            transformOrigin={{
              vertical: "top",
              horizontal: "right",
            }}
            open={Boolean(anchorEl)}
            onClose={handleClose}
          >
            <MenuItem onClick={handleProfile}>
              <AccountCircle sx={{ mr: 1 }} />
              {user?.name}
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <ExitToApp sx={{ mr: 1 }} />
              Đăng xuất
            </MenuItem>
          </Menu>
        </div>
      </Toolbar>

      {/* NEW: MENU ĐIỀU HƯỚNG CHO MOBILE */}
      {/* (Component này nằm ngoài Toolbar, nó là một menu thả xuống) */}
      <Menu
        id="menu-mobile"
        anchorEl={mobileAnchorEl}
        anchorOrigin={{
          vertical: "top",
          horizontal: "left",
        }}
        keepMounted
        transformOrigin={{
          vertical: "top",
          horizontal: "left",
        }}
        open={Boolean(mobileAnchorEl)}
        onClose={handleMobileMenuClose}
      >
        {navItems.map((item) => (
          <MenuItem
            key={item.label}
            onClick={() => handleMobileNav(item.route)}
            sx={{ minWidth: 200 }}
          >
            <Box sx={{ display: "flex", alignItems: "center", mr: 1 }}>
              {item.icon}
            </Box>
            {item.label}
          </MenuItem>
        ))}
      </Menu>
    </AppBar>
  );
};

export default NavigationBar;
