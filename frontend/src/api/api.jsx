// frontend/src/api/api.jsx

import axios from "axios";

// Get API URL from environment variables
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8081";

const httpConnect = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add authorization header to all requests if token exists
httpConnect.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

httpConnect.interceptors.response.use(
  (response) => {
    // Bất kỳ status code nào trong 2xx đều đi vào đây
    return response;
  },
  (error) => {
    // Bất kỳ status code nào ngoài 2xx đều đi vào đây
    if (
      error.response &&
      (error.response.status === 401 || error.response.status === 403)
    ) {
      // 1. Lấy thông báo lỗi (nếu có)
      const message =
        error.response.data?.message || "Phiên đăng nhập hết hạn.";

      // 2. Chỉ thực hiện logout nếu không phải là lỗi từ trang Login
      // (tránh vòng lặp vô tận nếu gõ sai mật khẩu)
      if (!error.config.url.includes("/auth/login")) {
        console.error("Authentication Error:", message);

        // 3. Xóa token và user
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        // 4. Tải lại trang để về trang Login
        // Dùng window.location.href để reset toàn bộ state của React (trong AuthContext)
        window.location.href = "/login";

        // (Tùy chọn: Hiển thị thông báo trước khi reload)
        // alert("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
      }
    }

    // Trả về lỗi để các hàm (ví dụ: .catch() trong handleSubmit) có thể xử lý tiếp
    return Promise.reject(error);
  }
);

// API functions for all endpoints
export const api = {
  // MARK: LOGIN
  login: async (data) => {
    const response = await httpConnect.post("/auth/login", data);
    return response.data;
  },

  auth: {
    getPermissions: async () => {
      const response = await httpConnect.get("/api/auth/permissions");
      return response.data;
    },
  },

  // MARK: MACHINES
  machines: {
    getAll: async (params = {}) => {
      const response = await httpConnect.get("/api/machines", {
        params,
        paramsSerializer: (params) => {
          // Serializer tùy chỉnh để xử lý mảng đúng cách cho Express
          const searchParams = new URLSearchParams();
          for (const key in params) {
            const value = params[key];

            if (Array.isArray(value)) {
              // Nếu là mảng, lặp qua và append từng giá trị
              // Kết quả: &type_machines=A&type_machines=B
              value.forEach((v) => searchParams.append(key, v));
            } else if (value !== undefined && value !== null) {
              // Nếu không phải mảng, append bình thường
              searchParams.append(key, value);
            }
          }
          return searchParams.toString();
        },
      });
      return response.data;
    },
    getStats: async () => {
      const response = await httpConnect.get("/api/machines/stats");
      return response.data;
    },
    getStatsByType: async () => {
      const response = await httpConnect.get("/api/machines/stats-by-type");
      return response.data;
    },
    getDistinctValues: async (params = {}) => {
      const response = await httpConnect.get(
        "/api/machines/distinct-values",
        { params } // Gửi tất cả params (field, location_uuid, department_uuid)
      );
      return response.data;
    },
    getById: async (uuid) => {
      const response = await httpConnect.get(`/api/machines/${uuid}`);
      return response.data;
    },
    create: async (data) => {
      const response = await httpConnect.post("/api/machines", data);
      return response.data;
    },
    update: async (uuid, data) => {
      const response = await httpConnect.put(`/api/machines/${uuid}`, data);
      return response.data;
    },
    search: async (searchTerm, params = {}) => {
      // Đảm bảo params bao gồm cả tham số search term
      const allParams = { ...params, search: searchTerm };
      const response = await httpConnect.get(`/api/machines/search`, {
        params: allParams,
      });
      return response.data;
    },
    getBySerial: async (serial, params = {}) => {
      const response = await httpConnect.get(
        `/api/machines/by-serial/${serial}`,
        { params }
      );
      return response.data;
    },
    batchImport: async (data) => {
      const response = await httpConnect.post(
        "/api/machines/batch-import",
        data
      );
      return response.data;
    },
  },

  // MARK: DEPARTMENTS
  departments: {
    getAll: async (params = {}) => {
      const response = await httpConnect.get("/api/departments", { params });
      return response.data;
    },
  },

  // MARK: LOCATIONS
  locations: {
    getAll: async (params = {}) => {
      const response = await httpConnect.get("/api/locations", { params });
      return response.data;
    },
  },

  // MARK: IMPORTS
  imports: {
    getAll: async (params = {}) => {
      const response = await httpConnect.get("/api/imports", { params });
      return response.data;
    },
    getById: async (uuid) => {
      const response = await httpConnect.get(`/api/imports/${uuid}`);
      return response.data;
    },
    create: async (data) => {
      const response = await httpConnect.post("/api/imports", data);
      return response.data;
    },
    updateStatus: async (uuid, status) => {
      const response = await httpConnect.put(`/api/imports/${uuid}/status`, {
        status,
      });
      return response.data;
    },
  },

  // MARK: EXPORTS
  exports: {
    getAll: async (params = {}) => {
      const response = await httpConnect.get("/api/exports", { params });
      return response.data;
    },
    getById: async (uuid) => {
      const response = await httpConnect.get(`/api/exports/${uuid}`);
      return response.data;
    },
    create: async (data) => {
      const response = await httpConnect.post("/api/exports", data);
      return response.data;
    },
    updateStatus: async (uuid, status) => {
      const response = await httpConnect.put(`/api/exports/${uuid}/status`, {
        status,
      });
      return response.data;
    },
  },

  internal_transfers: {
    getAll: async (params = {}) => {
      const response = await httpConnect.get("/api/internal-transfers", {
        params,
      });
      return response.data;
    },
    getById: async (uuid) => {
      const response = await httpConnect.get(`/api/internal-transfers/${uuid}`);
      return response.data;
    },
    create: async (data) => {
      const response = await httpConnect.post("/api/internal-transfers", data);
      return response.data;
    },
    confirm: async (uuid) => {
      const response = await httpConnect.put(
        `/api/internal-transfers/${uuid}/confirm`
      );
      return response.data;
    },
    approve: async (uuid) => {
      const response = await httpConnect.put(
        `/api/internal-transfers/${uuid}/approve`
      );
      return response.data;
    },
    cancel: async (uuid) => {
      const response = await httpConnect.put(
        `/api/internal-transfers/${uuid}/cancel`
      );
      return response.data;
    },
  },

  // MARK: LOCATION TRACKING
  tracking: {
    getMachinesByLocation: async (locationUuid, params = {}) => {
      const response = await httpConnect.get(
        `/api/locations/${locationUuid}/machines`,
        {
          params,
          paramsSerializer: (params) => {
            const searchParams = new URLSearchParams();
            for (const key in params) {
              const value = params[key];
              if (Array.isArray(value)) {
                value.forEach((v) => searchParams.append(key, v));
              } else if (value !== undefined && value !== null) {
                searchParams.append(key, value);
              }
            }
            return searchParams.toString();
          },
        }
      );
      return response.data;
    },
    getMachinesByDepartment: async (departmentUuid, params = {}) => {
      const response = await httpConnect.get(
        `/api/departments/${departmentUuid}/machines`,
        {
          params,
          paramsSerializer: (params) => {
            const searchParams = new URLSearchParams();
            for (const key in params) {
              const value = params[key];
              if (Array.isArray(value)) {
                value.forEach((v) => searchParams.append(key, v));
              } else if (value !== undefined && value !== null) {
                searchParams.append(key, value);
              }
            }
            return searchParams.toString();
          },
        }
      );
      return response.data;
    },
    getMachineStatsByTypeAtLocation: async (locationUuid) => {
      const response = await httpConnect.get(
        `/api/locations/${locationUuid}/stats-by-type`
      );
      return response.data;
    },
    getMachineStatsByTypeAtDepartment: async (departmentUuid) => {
      const response = await httpConnect.get(
        `/api/departments/${departmentUuid}/stats-by-type`
      );
      return response.data;
    },
    getMachineHistory: async (machineUuid) => {
      const response = await httpConnect.get(
        `/api/machines/${machineUuid}/history`
      );
      return response.data;
    },
    updateMachineLocationsDirectly: async (data) => {
      const response = await httpConnect.post(
        "/api/locations/update-machines",
        data
      );
      return response.data;
    },
  },
};

export default httpConnect;
