// frontend/src/contexts/AuthContext.jsx

import React, { useState, useEffect, useMemo } from "react";
import { api } from "../api/api";
import { CircularProgress, Box } from "@mui/material";
import { AuthContext } from "./AuthContextDefinition";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [permissions, setPermissions] = useState([]); // <-- THÊM MỚI
  const [loading, setLoading] = useState(true);

  // Token is automatically handled by api.jsx interceptors
  useEffect(() => {
    // Token management is handled by api interceptors
  }, [token]);

  // Check if user is logged in on app start
  useEffect(() => {
    const initializeAuth = async () => {
      setLoading(true);
      try {
        const savedUser = localStorage.getItem("user");
        const savedToken = localStorage.getItem("token");

        if (savedUser && savedToken) {
          // Xác thực user và token
          setUser(JSON.parse(savedUser));
          setToken(savedToken);

          // Lấy quyền của user
          const response = await api.auth.getPermissions();
          if (response.success) {
            setPermissions(response.data); // Ví dụ: ['admin', 'edit']
          } else {
            // Nếu token còn nhưng lấy quyền thất bại (ví dụ: token hết hạn)
            throw new Error("Failed to fetch permissions");
          }
        }
      } catch (error) {
        // Bất kỳ lỗi nào (token hết hạn, API lỗi) đều dẫn đến đăng xuất
        console.error("Auth initialization error:", error);
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setToken(null);
        setUser(null);
        setPermissions([]);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (ma_nv, password) => {
    try {
      const response = await api.login({
        ma_nv,
        password,
      });

      if (response.success) {
        const { token, user } = response.data;

        // Save to localStorage
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));

        // Update state
        setToken(token);
        setUser(user);

        // <-- THÊM MỚI: Lấy quyền ngay sau khi đăng nhập
        try {
          const permResponse = await api.auth.getPermissions();
          if (permResponse.success) {
            setPermissions(permResponse.data);
          }
        } catch (permError) {
          console.error("Failed to fetch permissions after login:", permError);
          setPermissions([]); // Đặt quyền rỗng nếu lỗi
        }
        // --> KẾT THÚC THÊM MỚI

        return { success: true };
      } else {
        return { success: false, message: response.message };
      }
    } catch (error) {
      console.error("Login error:", error);
      return {
        success: false,
        message: error.response?.data?.message || "Đăng nhập thất bại",
      };
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
    setPermissions([]); // <-- THÊM MỚI
    // Token removal is handled by api interceptors
  };

  // Sử dụng useMemo để tối ưu
  const value = useMemo(
    () => ({
      user,
      token,
      permissions, // <-- THÊM MỚI
      login,
      logout,
      isAuthenticated: !!token && !!user,
      loading,
    }),
    [user, token, permissions, loading]
  );

  // Hiển thị loading trong khi chờ xác thực
  if (loading) {
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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
