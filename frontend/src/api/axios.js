import axios from "axios";

const isLocalhost =
  typeof window !== "undefined" &&
  ["localhost", "127.0.0.1"].includes(window.location.hostname);

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (isLocalhost ? "/api" : "https://ai-sales-os-backend.onrender.com");

const API = axios.create({
  baseURL: API_BASE_URL,
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto redirect to login on 401
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export function getApiErrorMessage(error, fallbackMessage = "Something went wrong") {
  if (error.response?.data?.detail) {
    return error.response.data.detail;
  }

  if (error.response?.status === 502 || error.response?.status === 503 || error.response?.status === 504) {
    return "The frontend dev server cannot reach the backend. Start the API server on http://127.0.0.1:8000 and try again.";
  }

  if (error.code === "ERR_NETWORK") {
    return "Unable to reach the backend. Start the API server on http://127.0.0.1:8000 and try again.";
  }

  return fallbackMessage;
}

export default API;
