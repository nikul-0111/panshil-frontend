import axios from "axios";

const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_URL ||
    "https://panchshil-backend-final-u7nr.onrender.com",
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;
