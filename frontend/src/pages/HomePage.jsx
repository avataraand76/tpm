import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Container,
  Typography,
  Paper,
  Box,
  Grid,
  Card,
  CardContent,
  Chip,
  Button,
  CardActions,
  Stack,
  Avatar,
} from "@mui/material";
import {
  Science,
  Psychology,
  Dashboard,
  ArrowForward,
} from "@mui/icons-material";
import NavigationBar from "../components/NavigationBar";

const HomePage = () => {
  const navigate = useNavigate();

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
                TPM
              </Typography>
              <Typography variant="h6" color="text.secondary">
                Hệ thống quản lý và kiểm thử TPM
              </Typography>
            </Box>
          </Stack>
        </Box>

        {/* Welcome Message */}
        <Card
          elevation={0}
          sx={{
            p: 6,
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
            variant="h3"
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
          <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
            Hệ thống quản lý và kiểm thử hiện đại với giao diện thân thiện
          </Typography>
          <Stack
            direction="row"
            spacing={2}
            justifyContent="center"
            flexWrap="wrap"
            useFlexGap
          >
            <Chip
              label="✅ Đã đăng nhập thành công"
              sx={{
                background: "linear-gradient(45deg, #2e7d3222, #4caf5044)",
                color: "#2e7d32",
                fontWeight: 600,
                px: 2,
                py: 1,
              }}
            />
            <Chip
              label="🔒 Bảo mật cao"
              sx={{
                background: "linear-gradient(45deg, #667eea22, #764ba244)",
                color: "#667eea",
                fontWeight: 600,
                px: 2,
                py: 1,
              }}
            />
            <Chip
              label="⚡ Hiệu suất tối ưu"
              sx={{
                background: "linear-gradient(45deg, #dc004e22, #f5005744)",
                color: "#dc004e",
                fontWeight: 600,
                px: 2,
                py: 1,
              }}
            />
          </Stack>
        </Card>

        {/* Quick Navigation Cards */}
        <Box sx={{ mb: 6 }}>
          <Typography
            variant="h4"
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
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Card
                elevation={0}
                sx={{
                  height: "100%",
                  borderRadius: "20px",
                  border: "1px solid rgba(0, 0, 0, 0.05)",
                  background:
                    "linear-gradient(135deg, #667eea22 0%, #764ba222 100%)",
                  transition: "all 0.3s ease",
                  "&:hover": {
                    transform: "translateY(-8px)",
                    boxShadow: "0 20px 40px rgba(102, 126, 234, 0.2)",
                  },
                }}
              >
                <CardContent sx={{ p: 4, textAlign: "center" }}>
                  <Avatar
                    sx={{
                      width: 70,
                      height: 70,
                      background: "linear-gradient(45deg, #667eea, #764ba2)",
                      mx: "auto",
                      mb: 3,
                    }}
                  >
                    <Science sx={{ fontSize: 35 }} />
                  </Avatar>
                  <Typography variant="h5" fontWeight="bold" gutterBottom>
                    🔬 Test Module 1
                  </Typography>
                  <Typography
                    variant="body1"
                    color="text.secondary"
                    sx={{ mb: 3 }}
                  >
                    Module kiểm thử cơ bản với các tính năng CRUD, validation và
                    performance testing
                  </Typography>
                  <Button
                    variant="contained"
                    size="large"
                    endIcon={<ArrowForward />}
                    onClick={() => handleNavigate("/test1")}
                    sx={{
                      borderRadius: "12px",
                      background: "linear-gradient(45deg, #667eea, #764ba2)",
                      px: 4,
                      py: 1.5,
                      "&:hover": {
                        transform: "translateY(-2px)",
                        boxShadow: "0 8px 25px rgba(102, 126, 234, 0.3)",
                      },
                      transition: "all 0.3s ease",
                    }}
                  >
                    Khám phá ngay
                  </Button>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Card
                elevation={0}
                sx={{
                  height: "100%",
                  borderRadius: "20px",
                  border: "1px solid rgba(0, 0, 0, 0.05)",
                  background:
                    "linear-gradient(135deg, #dc004e22 0%, #f5005722 100%)",
                  transition: "all 0.3s ease",
                  "&:hover": {
                    transform: "translateY(-8px)",
                    boxShadow: "0 20px 40px rgba(220, 0, 78, 0.2)",
                  },
                }}
              >
                <CardContent sx={{ p: 4, textAlign: "center" }}>
                  <Avatar
                    sx={{
                      width: 70,
                      height: 70,
                      background: "linear-gradient(45deg, #dc004e, #f50057)",
                      mx: "auto",
                      mb: 3,
                    }}
                  >
                    <Psychology sx={{ fontSize: 35 }} />
                  </Avatar>
                  <Typography variant="h5" fontWeight="bold" gutterBottom>
                    🧠 Test Module 2
                  </Typography>
                  <Typography
                    variant="body1"
                    color="text.secondary"
                    sx={{ mb: 3 }}
                  >
                    Module kiểm thử nâng cao với AI, Machine Learning và
                    Security Testing
                  </Typography>
                  <Button
                    variant="contained"
                    size="large"
                    endIcon={<ArrowForward />}
                    onClick={() => handleNavigate("/test2")}
                    sx={{
                      borderRadius: "12px",
                      background: "linear-gradient(45deg, #dc004e, #f50057)",
                      px: 4,
                      py: 1.5,
                      "&:hover": {
                        transform: "translateY(-2px)",
                        boxShadow: "0 8px 25px rgba(220, 0, 78, 0.3)",
                      },
                      transition: "all 0.3s ease",
                    }}
                  >
                    Khám phá ngay
                  </Button>
                </CardContent>
              </Card>
            </Grid>

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
                    <Dashboard sx={{ fontSize: 35 }} />
                  </Avatar>
                  <Typography variant="h5" fontWeight="bold" gutterBottom>
                    📊 Analytics
                  </Typography>
                  <Typography
                    variant="body1"
                    color="text.secondary"
                    sx={{ mb: 3 }}
                  >
                    Xem tổng quan, thống kê và báo cáo chi tiết của hệ thống TPM
                  </Typography>
                  <Button
                    variant="outlined"
                    size="large"
                    endIcon={<ArrowForward />}
                    onClick={() => handleNavigate("/")}
                    sx={{
                      borderRadius: "12px",
                      borderColor: "#2e7d32",
                      color: "#2e7d32",
                      px: 4,
                      py: 1.5,
                      "&:hover": {
                        transform: "translateY(-2px)",
                        background:
                          "linear-gradient(45deg, #2e7d3211, #4caf5011)",
                        borderColor: "#2e7d32",
                        boxShadow: "0 8px 25px rgba(46, 125, 50, 0.2)",
                      },
                      transition: "all 0.3s ease",
                    }}
                  >
                    Xem chi tiết
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      </Container>
    </>
  );
};

export default HomePage;
