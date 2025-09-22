import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Container,
  Typography,
  Paper,
  Box,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  Divider,
  LinearProgress,
  Alert,
} from "@mui/material";
import {
  Psychology,
  ArrowBack,
  PlayArrow,
  Stop,
  Settings,
  TrendingUp,
  DataUsage,
  Speed,
  CheckCircle,
} from "@mui/icons-material";
import NavigationBar from "../components/NavigationBar";

const Test2 = () => {
  const navigate = useNavigate();
  const [testRunning, setTestRunning] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleStartTest = () => {
    setTestRunning(true);
    setProgress(0);

    // Simulate test progress
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setTestRunning(false);
          return 100;
        }
        return prev + 10;
      });
    }, 500);
  };

  const handleStopTest = () => {
    setTestRunning(false);
    setProgress(0);
  };

  return (
    <>
      <NavigationBar />
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate("/")}
            sx={{ mb: 2 }}
          >
            Quay lại trang chủ
          </Button>
          <Typography
            variant="h4"
            gutterBottom
            sx={{ display: "flex", alignItems: "center" }}
          >
            <Psychology sx={{ mr: 2, fontSize: 40, color: "secondary.main" }} />
            Test Module 2
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Module kiểm thử nâng cao với AI và Machine Learning
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {/* Main Content */}
          <Grid size={{ xs: 12, md: 8 }}>
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h5" gutterBottom>
                Advanced Testing Suite
              </Typography>
              <Divider sx={{ mb: 3 }} />

              {progress === 100 && (
                <Alert severity="success" sx={{ mb: 3 }} icon={<CheckCircle />}>
                  Test hoàn thành thành công! Tất cả các module đã được kiểm
                  tra.
                </Alert>
              )}

              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Mô tả
                </Typography>
                <Typography variant="body1" paragraph>
                  Module Test 2 tập trung vào các bài kiểm tra nâng cao bao gồm
                  AI testing, performance analysis, security testing và
                  integration testing với các hệ thống bên ngoài.
                </Typography>
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Tính năng nâng cao
                </Typography>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2 }}>
                  <Chip
                    label="AI Model Testing"
                    color="secondary"
                    variant="outlined"
                  />
                  <Chip
                    label="Security Scan"
                    color="secondary"
                    variant="outlined"
                  />
                  <Chip
                    label="Load Testing"
                    color="secondary"
                    variant="outlined"
                  />
                  <Chip
                    label="Integration Testing"
                    color="secondary"
                    variant="outlined"
                  />
                  <Chip
                    label="Regression Testing"
                    color="secondary"
                    variant="outlined"
                  />
                </Box>
              </Box>

              {testRunning && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="body2" gutterBottom>
                    Tiến trình test: {progress}%
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={progress}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>
              )}

              <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                <Button
                  variant="contained"
                  color="secondary"
                  startIcon={<PlayArrow />}
                  size="large"
                  onClick={handleStartTest}
                  disabled={testRunning}
                >
                  {testRunning ? "Đang chạy..." : "Bắt đầu Test"}
                </Button>
                <Button
                  variant="outlined"
                  color="secondary"
                  startIcon={<Stop />}
                  size="large"
                  onClick={handleStopTest}
                  disabled={!testRunning}
                >
                  Dừng Test
                </Button>
                <Button
                  variant="text"
                  color="secondary"
                  startIcon={<Settings />}
                  size="large"
                >
                  Cấu hình nâng cao
                </Button>
              </Box>
            </Paper>
          </Grid>

          {/* Sidebar */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography
                  variant="h6"
                  gutterBottom
                  sx={{ display: "flex", alignItems: "center" }}
                >
                  <Speed sx={{ mr: 1 }} />
                  Performance
                </Typography>
                <Chip
                  label={testRunning ? "Đang chạy" : "Idle"}
                  color={testRunning ? "warning" : "default"}
                  sx={{ mb: 2 }}
                />
                <Typography variant="body2" color="text.secondary">
                  CPU Usage: 15%
                  <br />
                  Memory: 2.1GB
                  <br />
                  Network: 45 Mbps
                </Typography>
              </CardContent>
            </Card>

            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography
                  variant="h6"
                  gutterBottom
                  sx={{ display: "flex", alignItems: "center" }}
                >
                  <TrendingUp sx={{ mr: 1 }} />
                  Kết quả gần đây
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Tests đã chạy: <strong>47</strong>
                  </Typography>
                  <Typography variant="body2" color="success.main">
                    Thành công: <strong>43</strong>
                  </Typography>
                  <Typography variant="body2" color="error.main">
                    Thất bại: <strong>4</strong>
                  </Typography>
                </Box>
                <Button
                  variant="outlined"
                  size="small"
                  fullWidth
                  color="secondary"
                >
                  Xem báo cáo chi tiết
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography
                  variant="h6"
                  gutterBottom
                  sx={{ display: "flex", alignItems: "center" }}
                >
                  <DataUsage sx={{ mr: 1 }} />
                  Dữ liệu Test
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 2 }}
                >
                  Tổng dữ liệu đã xử lý: 1.2TB
                  <br />
                  Số lượng test cases: 2,847
                  <br />
                  Thời gian trung bình: 2.3s
                </Typography>
                <Button variant="text" size="small" fullWidth color="secondary">
                  Xuất dữ liệu
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </>
  );
};

export default Test2;
