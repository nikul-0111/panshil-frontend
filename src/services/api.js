import axios from "axios";

const getBaseURL = () => {
  if (typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
    return "https://panchshil-backend-final-u7nr.onrender.com";
  }
  return import.meta.env.VITE_API_URL || "http://localhost:5000";
};

const api = axios.create({
  baseURL: getBaseURL(),
  timeout: 90000, // 90-second timeout guard to handle Render free-tier spin up delays
  headers: {
    "Content-Type": "application/json",
  },
});

// Optional: Request interceptor to debug outbound calls in the console
api.interceptors.request.use(
  (config) => {
    console.log(`🚀 [API Request] ${config.method.toUpperCase()} to ${config.url}`, config.data || "");
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Optional: Response interceptor to format incoming error logs beautifully
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("❌ [API Error Details]:", {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url
    });
    return Promise.reject(error);
  }
);

export default api;