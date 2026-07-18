import axios from "axios";

const normalizeUrl = (value) => value.replace(/\/+$/, "");
const API_URL = normalizeUrl(import.meta.env.VITE_API_URL || "http://localhost:5002/api");

export const axiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      error.isUnauthenticated = true;
    }
    return Promise.reject(error);
  }
);
