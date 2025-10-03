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
} from "@mui/material";
import {
  AccountCircle,
  ExitToApp,
  Home,
  Science,
  Psychology,
  Dashboard,
  PrecisionManufacturing,
} from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";

const NavigationBar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [anchorEl, setAnchorEl] = React.useState(null);

  const getCurrentTab = () => {
    const pathname = location.pathname;
    if (pathname === "/") return 0;
    if (pathname === "/machines") return 1;
    if (pathname === "/test1") return 2;
    if (pathname === "/test2") return 3;
    return 0;
  };

  const handleTabChange = (event, newValue) => {
    const routes = ["/", "/machines", "/test1", "/test2"];
    navigate(routes[newValue]);
  };

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

  if (!isAuthenticated) {
    return null; // Don't show navigation bar if not authenticated
  }

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

        {/* Navigation Tabs */}
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
            <Tab icon={<Science />} label="Test 1" iconPosition="start" />
            <Tab icon={<Psychology />} label="Test 2" iconPosition="start" />
          </Tabs>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center" }}>
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
                Thông tin cá nhân
              </MenuItem>
              <MenuItem onClick={handleLogout}>
                <ExitToApp sx={{ mr: 1 }} />
                Đăng xuất
              </MenuItem>
            </Menu>
          </div>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default NavigationBar;
