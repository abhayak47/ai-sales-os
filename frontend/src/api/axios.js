import axios from "axios";

const API = axios.create({
  baseURL: "https://ai-sales-os-backend.onrender.com",
});
//https://ai-sales-os-backend.onrender.com
//http://127.0.0.1:8000

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

export default API;