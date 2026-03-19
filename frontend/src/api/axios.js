import axios from "axios";

const API = axios.create({
  baseURL: "https://ai-sales-os-backend.onrender.com",
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }cd C:\Users\Admin\OneDrive\Desktop\ai-sales-os
  return config;
});

export default API;