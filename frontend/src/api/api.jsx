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
      const response = await httpConnect.get("/api/machines", { params });
      return response.data;
    },
    getStats: async () => {
      const response = await httpConnect.get("/api/machines/stats");
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
    updateStatus: async (uuid, status) => {
      const response = await httpConnect.put(
        `/api/internal-transfers/${uuid}/status`,
        {
          status,
        }
      );
      return response.data;
    },
  },

  // MARK: LOCATION TRACKING
  tracking: {
    getMachinesByLocation: async (locationUuid, params = {}) => {
      const response = await httpConnect.get(
        `/api/locations/${locationUuid}/machines`,
        { params }
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
