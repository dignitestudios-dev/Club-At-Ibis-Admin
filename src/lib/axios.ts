import axios from "axios";

const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3050/api/v1",
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});

axiosInstance.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("auth-token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function clearSessionAndRedirect() {
  if (typeof window === "undefined") return;
  localStorage.setItem("caia.logged-out", "true");
  localStorage.removeItem("auth-token");
  localStorage.removeItem("auth-user");
  document.cookie = "auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0";
  if (!window.location.pathname.startsWith("/auth/")) {
    window.location.href = "/auth/login";
  }
}

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const isLoginAttempt = typeof error.config?.url === "string" && error.config.url.includes("/admin/login");
    const isLogoutAttempt = typeof error.config?.url === "string" && error.config.url.includes("/admin/logout");
    // A 401 on an authenticated call means the session itself is invalid — expired,
    // revoked, or the account got deactivated — not the same as a wrong password on
    // the login form, which should just show an error, not force a redirect loop.
    if (status === 401 && !isLoginAttempt && !isLogoutAttempt) {
      clearSessionAndRedirect();
    }
    const message = error.response?.data?.message ?? error.message;
    return Promise.reject(new Error(message));
  }
);

export default axiosInstance;
