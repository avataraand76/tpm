import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
import MachineListPage from "./pages/MachineListPage";
import TicketManagementPage from "./pages/TicketManagementPage";
import LocationTrackPage from "./pages/LocationTrackPage";
import UpdateRfidPage from "./pages/UpdateRfidPage";
import { useAuth } from "./hooks/useAuth";
import { Box, CircularProgress } from "@mui/material";

// Create MUI theme
const theme = createTheme({
  palette: {
    primary: {
      main: "#1976d2",
      light: "#42a5f5",
      dark: "#1565c0",
    },
    secondary: {
      main: "#dc004e",
      light: "#f50057",
      dark: "#c51162",
    },
    success: {
      main: "#2e7d32",
      light: "#4caf50",
      dark: "#1b5e20",
    },
    background: {
      default: "#f5f5f5",
      paper: "#ffffff",
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 500,
    },
    h6: {
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          borderRadius: 8,
          fontWeight: 500,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
  },
});

const AdminPCDRoute = ({ children }) => {
  const { user, permissions, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // Định nghĩa vai trò
  const isAdmin = permissions.includes("admin");
  const phongCoDienId = 14;
  const isPhongCoDien =
    permissions.includes("edit") &&
    !isAdmin &&
    user?.phongban_id === phongCoDienId;

  // Quyền truy cập
  const canAccess = isAdmin || isPhongCoDien;

  if (loading) {
    // Hiển thị loading trong khi AuthContext đang kiểm tra
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    // Nếu chưa đăng nhập, đá về trang login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (isAuthenticated && !canAccess) {
    // Đã đăng nhập nhưng KHÔNG CÓ QUYỀN
    // Đá về trang chủ (hoặc trang 403 Not Found nếu có)
    return <Navigate to="/" replace />;
  }

  // Đã đăng nhập VÀ CÓ QUYỀN
  return children;
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public route */}
            <Route path="/login" element={<LoginPage />} />

            {/* Protected routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <HomePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/machines"
              element={
                <ProtectedRoute>
                  <MachineListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tickets"
              element={
                <ProtectedRoute>
                  <TicketManagementPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/location-track"
              element={
                <ProtectedRoute>
                  <LocationTrackPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/up-rfid"
              element={
                <AdminPCDRoute>
                  <UpdateRfidPage />
                </AdminPCDRoute>
              }
            />

            {/* Catch all route - redirect to home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
