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
  Button,
  Chip,
  Divider,
} from "@mui/material";
import {
  Science,
  ArrowBack,
  PlayArrow,
  Stop,
  Settings,
  Timeline,
  Assessment,
} from "@mui/icons-material";
import NavigationBar from "../components/NavigationBar";

const Test1 = () => {
  const navigate = useNavigate();

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
            <Science sx={{ mr: 2, fontSize: 40, color: "primary.main" }} />
            Test Module 1
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Module kiểm thử và thử nghiệm các tính năng hệ thống
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {/* Main Content */}
          <Grid size={{ xs: 12, md: 8 }}>
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h5" gutterBottom>
                Thông tin Module
              </Typography>
              <Divider sx={{ mb: 3 }} />

              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Mô tả
                </Typography>
                <Typography variant="body1" paragraph>
                  Module Test 1 được thiết kế để thực hiện các bài kiểm tra cơ
                  bản của hệ thống TPM. Bao gồm các chức năng kiểm tra kết nối,
                  xác thực dữ liệu và các thao tác CRUD cơ bản.
                </Typography>
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Tính năng chính
                </Typography>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2 }}>
                  <Chip
                    label="Kiểm tra kết nối DB"
                    color="primary"
                    variant="outlined"
                  />
                  <Chip
                    label="Xác thực API"
                    color="primary"
                    variant="outlined"
                  />
                  <Chip
                    label="Test CRUD Operations"
                    color="primary"
                    variant="outlined"
                  />
                  <Chip
                    label="Performance Testing"
                    color="primary"
                    variant="outlined"
                  />
                </Box>
              </Box>

              <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                <Button
                  variant="contained"
                  startIcon={<PlayArrow />}
                  size="large"
                >
                  Bắt đầu Test
                </Button>
                <Button variant="outlined" startIcon={<Stop />} size="large">
                  Dừng Test
                </Button>
                <Button variant="text" startIcon={<Settings />} size="large">
                  Cấu hình
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
                  <Timeline sx={{ mr: 1 }} />
                  Trạng thái
                </Typography>
                <Chip label="Sẵn sàng" color="success" sx={{ mb: 2 }} />
                <Typography variant="body2" color="text.secondary">
                  Module đang hoạt động bình thường và sẵn sàng thực hiện các
                  bài test.
                </Typography>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography
                  variant="h6"
                  gutterBottom
                  sx={{ display: "flex", alignItems: "center" }}
                >
                  <Assessment sx={{ mr: 1 }} />
                  Thống kê
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Tests đã chạy: <strong>0</strong>
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Thành công: <strong>0</strong>
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Thất bại: <strong>0</strong>
                  </Typography>
                </Box>
                <Button variant="outlined" size="small" fullWidth>
                  Xem chi tiết
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </>
  );
};

export default Test1;
