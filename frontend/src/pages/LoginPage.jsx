// frontend/src/pages/LoginPage.jsx

import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Avatar,
  Stack,
  IconButton,
  InputAdornment,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { Visibility, VisibilityOff, Warning } from "@mui/icons-material";
import { useAuth } from "../hooks/useAuth";

const LoginPage = () => {
  const [formData, setFormData] = useState({
    ma_nv: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || "/";

  // Check Caps Lock status
  const checkCapsLock = (event) => {
    const capsLock =
      event.getModifierState && event.getModifierState("CapsLock");
    setCapsLockOn(capsLock);
  };

  // Add global keydown listener for Caps Lock detection
  useEffect(() => {
    const handleKeyDown = (event) => {
      checkCapsLock(event);
    };

    const handleKeyUp = (event) => {
      checkCapsLock(event);
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError(""); // Clear error when user types
  };

  const handleTogglePassword = () => {
    setShowPassword(!showPassword);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!formData.ma_nv || !formData.password) {
      setError("Vui lòng nhập đầy đủ thông tin");
      setLoading(false);
      return;
    }

    const result = await login(formData.ma_nv, formData.password);

    if (result.success) {
      navigate(from, { replace: true });
    } else {
      setError(result.message);
    }

    setLoading(false);
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 2,
      }}
    >
      <Container component="main" maxWidth="sm">
        <Paper
          elevation={0}
          sx={{
            padding: { xs: 3, sm: 6 },
            borderRadius: "24px",
            background: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255, 255, 255, 0.3)",
            boxShadow: "0 20px 40px rgba(0, 0, 0, 0.1)",
          }}
        >
          <Stack spacing={3} alignItems="center" textAlign="center">
            <Avatar
              sx={{
                width: 80,
                height: 80,
                background: "linear-gradient(45deg, #667eea, #764ba2)",
                mb: 2,
              }}
            >
              <Typography variant="h3">🔐</Typography>
            </Avatar>

            <Box>
              <Typography
                component="h1"
                variant={isMobile ? "h4" : "h3"}
                sx={{
                  fontWeight: 700,
                  background: "linear-gradient(45deg, #667eea, #764ba2)",
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  mb: 1,
                }}
              >
                TPM System
              </Typography>
              <Typography
                variant={isMobile ? "body1" : "h6"}
                color="text.secondary"
              >
                Đăng nhập để truy cập hệ thống
              </Typography>
            </Box>

            {error && (
              <Alert
                severity="error"
                sx={{
                  width: "100%",
                  borderRadius: "12px",
                  background: "rgba(244, 67, 54, 0.1)",
                  border: "1px solid rgba(244, 67, 54, 0.2)",
                  mb: 2,
                  textTransform: "uppercase",
                }}
              >
                {error}
              </Alert>
            )}

            {capsLockOn && (
              <Alert
                severity="warning"
                icon={<Warning />}
                sx={{
                  width: "100%",
                  borderRadius: "12px",
                  background: "rgba(255, 152, 0, 0.1)",
                  border: "1px solid rgba(255, 152, 0, 0.2)",
                  mb: 2,
                  textTransform: "uppercase",
                }}
              >
                Caps Lock đang được bật
              </Alert>
            )}

            <Box
              component="form"
              onSubmit={handleSubmit}
              sx={{ width: "100%", mt: 2 }}
            >
              <Stack spacing={3}>
                <TextField
                  required
                  fullWidth
                  id="ma_nv"
                  label="🆔 Số thẻ"
                  name="ma_nv"
                  autoComplete="username"
                  autoFocus
                  value={formData.ma_nv}
                  onChange={handleChange}
                  disabled={loading}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "16px",
                      background: "rgba(255, 255, 255, 0.8)",
                      backdropFilter: "blur(10px)",
                      "& fieldset": {
                        borderColor: "rgba(102, 126, 234, 0.3)",
                      },
                      "&:hover fieldset": {
                        borderColor: "rgba(102, 126, 234, 0.5)",
                      },
                      "&.Mui-focused fieldset": {
                        borderColor: "#667eea",
                      },
                    },
                  }}
                />
                <TextField
                  required
                  fullWidth
                  name="password"
                  label="🔒 Mật Khẩu"
                  type={showPassword ? "text" : "password"}
                  id="password"
                  autoComplete="current-password"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={loading}
                  onKeyDown={checkCapsLock}
                  onKeyUp={checkCapsLock}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={handleTogglePassword}
                          onMouseDown={(e) => e.preventDefault()}
                          edge="end"
                          disabled={loading}
                          sx={{
                            color: showPassword
                              ? "#667eea"
                              : "rgba(0, 0, 0, 0.54)",
                            "&:hover": {
                              backgroundColor: "rgba(102, 126, 234, 0.1)",
                            },
                          }}
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "16px",
                      background: "rgba(255, 255, 255, 0.8)",
                      backdropFilter: "blur(10px)",
                      "& fieldset": {
                        borderColor: capsLockOn
                          ? "rgba(255, 152, 0, 0.5)"
                          : "rgba(102, 126, 234, 0.3)",
                      },
                      "&:hover fieldset": {
                        borderColor: capsLockOn
                          ? "rgba(255, 152, 0, 0.7)"
                          : "rgba(102, 126, 234, 0.5)",
                      },
                      "&.Mui-focused fieldset": {
                        borderColor: capsLockOn ? "#ff9800" : "#667eea",
                      },
                    },
                  }}
                />
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={loading}
                  sx={{
                    mt: 2,
                    py: 2,
                    borderRadius: "16px",
                    background: "linear-gradient(45deg, #667eea, #764ba2)",
                    fontSize: "1.1rem",
                    fontWeight: 600,
                    textTransform: "none",
                    boxShadow: "0 8px 25px rgba(102, 126, 234, 0.3)",
                    "&:hover": {
                      transform: "translateY(-2px)",
                      boxShadow: "0 12px 35px rgba(102, 126, 234, 0.4)",
                    },
                    "&:disabled": {
                      background: "rgba(102, 126, 234, 0.5)",
                    },
                    transition: "all 0.3s ease",
                  }}
                >
                  {loading ? (
                    <Stack direction="row" spacing={1} alignItems="center">
                      <CircularProgress size={24} color="inherit" />
                      <Typography>Đang đăng nhập...</Typography>
                    </Stack>
                  ) : (
                    "Đăng Nhập"
                  )}
                </Button>
              </Stack>
            </Box>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
};

export default LoginPage;
