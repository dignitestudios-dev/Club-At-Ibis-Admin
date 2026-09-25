import axios from "axios";

const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "https://416zwbs6-3050.inc1.devtunnels.ms/api/v1",
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
  sessionStorage.setItem("caia.session-expired", "true");
  window.dispatchEvent(
    new CustomEvent("app:session-expired", {
      detail: { title: "Session expired", message: "Your session has expired. Please sign in again." },
    })
  );
  if (!window.location.pathname.startsWith("/auth/")) {
    const currentPath = window.location.pathname + window.location.search;
    const returnUrl = encodeURIComponent(currentPath);
    window.location.href = `/auth/login?returnUrl=${returnUrl}`;
  }
}

let isHandling403 = false;

function handleForbidden() {
  if (typeof window === "undefined") return;
  if (isHandling403) return;
  isHandling403 = true;

  window.dispatchEvent(
    new CustomEvent("app:toast", {
      detail: {
        variant: "error",
        title: "Permission Denied",
        description: "You do not have permission to this action, we are refreshing you account info",
      },
    })
  );

  setTimeout(() => {
    isHandling403 = false;
    if (window.location.pathname !== "/dashboard") {
      window.location.href = "/dashboard";
    } else {
      window.location.reload();
    }
  }, 1500);
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

    if (status === 403) {
      handleForbidden();
    }

    // Trigger server-error dialog on 5xx or network-down responses
    if (typeof window !== "undefined" && (!status || status >= 500 || error.code === "ERR_NETWORK")) {
      window.dispatchEvent(new CustomEvent("app:server-error"));
    }

    const message = error.response?.data?.message ?? error.message;
    return Promise.reject(new Error(message));
  }
);

export default axiosInstance;
