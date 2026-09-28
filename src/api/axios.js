import axios from "axios";

const api = axios.create({
  baseURL: "https://farm-backend-jfye.onrender.com/api",
});

// Attach JWT to every request automatically, if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("farmhouse_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// If token expires/invalid, force logout so the app doesn't hang in a broken state
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("farmhouse_token");
      localStorage.removeItem("farmhouse_user");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;