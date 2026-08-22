// frontend/src/pages/LoginPage.jsx

import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Alert,
  alpha,
  Avatar,
  Box,
  Button,
  CircularProgress,
  colors,
  Container,
  fontSizes,
  gradients,
  IconButton,
  InputAdornment,
  Paper,
  radii,
  shadow,
  shadowRgb,
  shadows,
  Stack,
  sx as preset,
  TextField,
  Typography,
  Visibility,
  VisibilityOff,
  Warning,
} from "../ui";
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
        minHeight: "100dvh",
        background: gradients.brandDeep,
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
            borderRadius: `${radii.lg}px`,
            background: alpha(colors.white, 0.95),
            backdropFilter: "blur(20px)",
            border: `1px solid ${alpha(colors.white, 0.3)}`,
            boxShadow: shadow(20, 40, shadowRgb.black, 0.1),
          }}
        >
          <Stack spacing={3} alignItems="center" textAlign="center">
            <Avatar
              sx={{
                width: 80,
                height: 80,
                background: gradients.brand,
                mb: 2,
              }}
            >
              <Typography variant="h3">🔐</Typography>
            </Avatar>

            <Box>
              <Typography
                component="h1"
                variant="h3"
                sx={{ fontWeight: 700, ...preset.gradientText(), mb: 1 }}
              >
                TPM System
              </Typography>
              <Typography
                variant="h6"
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
                  background: alpha(colors.red.main, 0.1),
                  border: `1px solid ${alpha(colors.red.main, 0.2)}`,
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
                  background: alpha(colors.orange.main, 0.1),
                  border: `1px solid ${alpha(colors.orange.main, 0.2)}`,
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
                      borderRadius: `${radii.lg}px`,
                      background: alpha(colors.white, 0.8),
                      backdropFilter: "blur(10px)",
                      "& fieldset": {
                        borderColor: alpha(colors.brand.main, 0.3),
                      },
                      "&:hover fieldset": {
                        borderColor: alpha(colors.brand.main, 0.5),
                      },
                      "&.Mui-focused fieldset": {
                        borderColor: colors.brand.main,
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
                              ? colors.brand.main
                              : alpha(colors.black, 0.54),
                            "&:hover": {
                              backgroundColor: alpha(colors.brand.main, 0.1),
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
                      borderRadius: `${radii.lg}px`,
                      background: alpha(colors.white, 0.8),
                      backdropFilter: "blur(10px)",
                      "& fieldset": {
                        borderColor: capsLockOn
                          ? alpha(colors.orange.main, 0.5)
                          : alpha(colors.brand.main, 0.3),
                      },
                      "&:hover fieldset": {
                        borderColor: capsLockOn
                          ? alpha(colors.orange.main, 0.7)
                          : alpha(colors.brand.main, 0.5),
                      },
                      "&.Mui-focused fieldset": {
                        borderColor: capsLockOn ? colors.orange.main : colors.brand.main,
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
                    borderRadius: `${radii.lg}px`,
                    background: gradients.brand,
                    fontSize: fontSizes.px17_6,
                    fontWeight: 600,
                    textTransform: "none",
                    boxShadow: shadows.brandLift,
                    "&:hover": {
                      transform: "translateY(-2px)",
                      boxShadow: shadow(12, 35, shadowRgb.brand, 0.4),
                    },
                    "&:disabled": {
                      background: alpha(colors.brand.main, 0.5),
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
