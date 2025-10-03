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
    update: async (uuid, data) => {
      const response = await httpConnect.put(`/api/machines/${uuid}`, data);
      return response.data;
    },
  },
};

export default httpConnect;
