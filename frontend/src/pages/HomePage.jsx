// frontend/src/pages/HomePage.jsx

import React from "react";
import { useNavigate } from "react-router-dom";
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
  useTheme,
  useMediaQuery,
} from "@mui/material";
import {
  Dashboard,
  ArrowForward,
  PrecisionManufacturing,
  Receipt,
  LocationOn,
} from "@mui/icons-material";
import NavigationBar from "../components/NavigationBar";
// import { useAuth } from "../hooks/useAuth";

const HomePage = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  // const { permissions } = useAuth();
  // const canEdit = permissions.includes("edit");
  // const isAdmin = permissions.includes("admin");
  const handleNavigate = (path) => {
    navigate(path);
  };

  return (
    <>
      <NavigationBar />
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
              <Dashboard sx={{ fontSize: 30 }} />
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
                }}
              >
                TPM
              </Typography>
              <Typography
                variant={isMobile ? "body1" : "h6"}
                color="text.secondary"
              >
                Hệ thống quản lý máy móc thiết bị TPM
              </Typography>
            </Box>
          </Stack>
        </Box>

        {/* Welcome Message */}
        <Card
          elevation={0}
          sx={{
            p: { xs: 3, sm: 6 },
            mt: 6,
            mb: 6,
            textAlign: "center",
            borderRadius: "20px",
            background:
              "linear-gradient(135deg, #667eea11 0%, #764ba211 50%, #2e7d3211 100%)",
            border: "1px solid rgba(0, 0, 0, 0.05)",
          }}
        >
          <Avatar
            sx={{
              width: 80,
              height: 80,
              background: "linear-gradient(45deg, #667eea, #764ba2)",
              mx: "auto",
              mb: 3,
            }}
          >
            <Dashboard sx={{ fontSize: 40 }} />
          </Avatar>
          <Typography
            variant={isMobile ? "h4" : "h3"}
            fontWeight="bold"
            gutterBottom
            sx={{
              background: "linear-gradient(45deg, #667eea, #764ba2)",
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            🎉 Chào mừng đến với TPM System!
          </Typography>
          <Typography
            variant={isMobile ? "body1" : "h6"}
            color="text.secondary"
            sx={{ mb: 4 }}
          >
            Hệ thống quản lý, bảo trì máy móc thiết bị sản xuất
          </Typography>
          {/* <Stack
            direction="row"
            spacing={2}
            justifyContent="center"
            flexWrap="wrap"
            useFlexGap
          >
            <Chip
              label="✅ [placeholder]"
              sx={{
                background: "linear-gradient(45deg, #2e7d3222, #4caf5044)",
                color: "#2e7d32",
                fontWeight: 600,
                px: 2,
                py: 1,
              }}
            />
            <Chip
              label="🔒 [placeholder]"
              sx={{
                background: "linear-gradient(45deg, #667eea22, #764ba244)",
                color: "#667eea",
                fontWeight: 600,
                px: 2,
                py: 1,
              }}
            />
            <Chip
              label="⚡ [placeholder]"
              sx={{
                background: "linear-gradient(45deg, #dc004e22, #f5005744)",
                color: "#dc004e",
                fontWeight: 600,
                px: 2,
                py: 1,
              }}
            />
          </Stack> */}
        </Card>

        {/* Quick Navigation Cards */}
        <Box sx={{ mb: 6 }}>
          <Typography
            variant={isMobile ? "h5" : "h4"}
            gutterBottom
            sx={{
              mb: 4,
              fontWeight: 600,
              textAlign: "center",
              background: "linear-gradient(45deg, #667eea, #764ba2)",
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            🚀 Điều hướng nhanh
          </Typography>
          <Grid container spacing={3}>
            {/* Phiếu xuất nhập */}
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Card
                elevation={0}
                sx={{
                  height: "100%",
                  borderRadius: "20px",
                  border: "1px solid rgba(0, 0, 0, 0.05)",
                  background:
                    "linear-gradient(135deg, #ff6b6b22 0%, #ee5a6f22 100%)",
                  transition: "all 0.3s ease",
                  "&:hover": {
                    transform: "translateY(-8px)",
                    boxShadow: "0 20px 40px rgba(255, 107, 107, 0.2)",
                  },
                }}
              >
                <CardContent sx={{ p: 4, textAlign: "center" }}>
                  <Avatar
                    sx={{
                      width: 70,
                      height: 70,
                      background: "linear-gradient(45deg, #ff6b6b, #ee5a6f)",
                      mx: "auto",
                      mb: 3,
                    }}
                  >
                    <Receipt sx={{ fontSize: 35 }} />
                  </Avatar>
                  <Typography variant="h5" fontWeight="bold" gutterBottom>
                    📋 Phiếu xuất nhập
                  </Typography>
                  <Typography
                    variant="body1"
                    color="text.secondary"
                    sx={{ mb: 3 }}
                  >
                    Tạo và quản lý phiếu nhập xuất
                    <br />
                    máy móc thiết bị
                  </Typography>
                  <Button
                    variant="contained"
                    size="large"
                    endIcon={<ArrowForward />}
                    onClick={() => handleNavigate("/tickets2")}
                    sx={{
                      borderRadius: "12px",
                      background: "linear-gradient(45deg, #ff6b6b, #ee5a6f)",
                      px: 4,
                      py: 1.5,
                      "&:hover": {
                        transform: "translateY(-2px)",
                        boxShadow: "0 8px 25px rgba(255, 107, 107, 0.3)",
                      },
                      transition: "all 0.3s ease",
                    }}
                  >
                    Quản lý phiếu
                  </Button>
                </CardContent>
              </Card>
            </Grid>

            {/* Danh sách máy móc */}
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Card
                elevation={0}
                sx={{
                  height: "100%",
                  borderRadius: "20px",
                  border: "1px solid rgba(0, 0, 0, 0.05)",
                  background:
                    "linear-gradient(135deg, #2e7d3222 0%, #4caf5022 100%)",
                  transition: "all 0.3s ease",
                  "&:hover": {
                    transform: "translateY(-8px)",
                    boxShadow: "0 20px 40px rgba(46, 125, 50, 0.2)",
                  },
                }}
              >
                <CardContent sx={{ p: 4, textAlign: "center" }}>
                  <Avatar
                    sx={{
                      width: 70,
                      height: 70,
                      background: "linear-gradient(45deg, #2e7d32, #4caf50)",
                      mx: "auto",
                      mb: 3,
                    }}
                  >
                    <PrecisionManufacturing sx={{ fontSize: 35 }} />
                  </Avatar>
                  <Typography variant="h5" fontWeight="bold" gutterBottom>
                    🔧 Danh sách máy móc
                  </Typography>
                  <Typography
                    variant="body1"
                    color="text.secondary"
                    sx={{ mb: 3 }}
                  >
                    Quản lý và xem thông tin chi tiết
                    <br />
                    máy móc thiết bị
                  </Typography>
                  <Button
                    variant="contained"
                    size="large"
                    endIcon={<ArrowForward />}
                    onClick={() => handleNavigate("/machines")}
                    sx={{
                      borderRadius: "12px",
                      background: "linear-gradient(45deg, #2e7d32, #4caf50)",
                      px: 4,
                      py: 1.5,
                      "&:hover": {
                        transform: "translateY(-2px)",
                        boxShadow: "0 8px 25px rgba(46, 125, 50, 0.3)",
                      },
                      transition: "all 0.3s ease",
                    }}
                  >
                    Xem danh sách
                  </Button>
                </CardContent>
              </Card>
            </Grid>

            {/* Theo dõi vị trí (CARD MỚI) */}
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Card
                elevation={0}
                sx={{
                  height: "100%",
                  borderRadius: "20px",
                  border: "1px solid rgba(0, 0, 0, 0.05)",
                  background:
                    "linear-gradient(135deg, #03a9f422 0%, #00bcd422 100%)",
                  transition: "all 0.3s ease",
                  "&:hover": {
                    transform: "translateY(-8px)",
                    boxShadow: "0 20px 40px rgba(3, 169, 244, 0.2)",
                  },
                }}
              >
                <CardContent sx={{ p: 4, textAlign: "center" }}>
                  <Avatar
                    sx={{
                      width: 70,
                      height: 70,
                      background: "linear-gradient(45deg, #03a9f4, #00bcd4)",
                      mx: "auto",
                      mb: 3,
                    }}
                  >
                    <LocationOn sx={{ fontSize: 35 }} />
                  </Avatar>
                  <Typography variant="h5" fontWeight="bold" gutterBottom>
                    🗺️ Theo dõi vị trí
                  </Typography>
                  <Typography
                    variant="body1"
                    color="text.secondary"
                    sx={{ mb: 3 }}
                  >
                    Kiểm tra máy móc tại một vị trí và xem lịch sử điều chuyển
                  </Typography>
                  <Button
                    variant="contained"
                    size="large"
                    endIcon={<ArrowForward />}
                    onClick={() => handleNavigate("/location-track")}
                    sx={{
                      borderRadius: "12px",
                      background: "linear-gradient(45deg, #03a9f4, #00bcd4)",
                      px: 4,
                      py: 1.5,
                      "&:hover": {
                        transform: "translateY(-2px)",
                        boxShadow: "0 8px 25px rgba(3, 169, 244, 0.3)",
                      },
                      transition: "all 0.3s ease",
                    }}
                  >
                    Truy cập
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* <div style={{ marginTop: "50px" }}>
            {isAdmin && <>chỉ người có quyền ADMIN mới thấy</>}
            {canEdit && <>chỉ người có quyền EDIT mới thấy</>}
            {!canEdit && !isAdmin && <>chỉ người có quyền VIEW mới thấy</>}
          </div> */}
        </Box>
      </Container>
    </>
  );
};

export default HomePage;
