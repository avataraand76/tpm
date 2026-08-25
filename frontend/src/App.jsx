import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
import MachineListPage from "./pages/MachineListPage";
import TicketManagementPage from "./pages/TicketManagementPage";
import LocationTrackPage from "./pages/LocationTrackPage";
import UpdateRfidPage from "./pages/UpdateRfidPage";
import TestProposalPage from "./pages/TestProposalPage";
import AdminPage from "./pages/AdminPage";
import MaintenanceSchedulePage from "./pages/MaintenanceSchedulePage";
import ReportPage from "./pages/ReportPage";
import { useAuth } from "./hooks/useAuth";
import theme, { sx } from "./theme";
import { Box, CircularProgress } from "@mui/material";

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
      <Box sx={sx.centerFull}>
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

const AdminRoute = ({ children }) => {
  const { permissions, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // Quyền truy cập (chỉ admin)
  const canAccess = permissions.includes("admin");

  if (loading) {
    return (
      <Box sx={sx.centerFull}>
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (isAuthenticated && !canAccess) {
    // Nếu không phải Admin, đá về trang chủ
    return <Navigate to="/" replace />;
  }

  // Là Admin
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
              path="/tickets1"
              element={
                <ProtectedRoute>
                  <TicketManagementPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tickets2"
              element={
                <ProtectedRoute>
                  <TestProposalPage />
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
              path="/maintenance-schedule"
              element={
                <ProtectedRoute>
                  <MaintenanceSchedulePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <ProtectedRoute>
                  <ReportPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports/machine-overview"
              element={
                <ProtectedRoute>
                  <ReportPage />
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

            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <AdminPage />
                </AdminRoute>
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
