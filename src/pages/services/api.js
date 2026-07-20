import axios from "axios";

const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_URL ||
    "https://panchshil-backend-final-u7nr.onrender.com",
  timeout: 30000, // 30-second timeout guard to catch spin-up delays or hangs
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