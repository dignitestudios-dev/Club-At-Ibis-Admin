import axios from "axios";
import { ApiError, fieldNameFromPath } from "./api-error";

const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "https://api.clubatibis.dignitestudios.com/api/v1",
  timeout: 5 * 60 * 1000, // 5 minutes
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

  // Redirect to the dashboard and stop — never reload. Reloading re-fires
  // every request a page makes on mount, including whichever one just came
  // back 403; if that request is unconditional (not gated behind a
  // permission check), a reload here turns one bad call into an infinite
  // 403 -> reload -> 403 loop with the page stuck "loading" forever.
  if (window.location.pathname !== "/dashboard") {
    window.location.href = "/dashboard";
  }
  setTimeout(() => {
    isHandling403 = false;
  }, 1500);
}

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const isLoginAttempt = typeof error.config?.url === "string" && error.config.url.includes("/admin/login");
    const isLogoutAttempt = typeof error.config?.url === "string" && error.config.url.includes("/admin/logout");
    // A 401 on an authenticated call means the session itself is invalid (expired,
    // revoked, or the account got deactivated), unlike a wrong password on
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

    const body = error.response?.data;
    const details = Array.isArray(body?.details) ? body.details : undefined;
    // The top-level message on a validation error is a generic "Request
    // validation failed" — not useful on its own in a toast, so any caller
    // that doesn't map `details` onto its own form fields (via
    // applyServerFieldErrors) still gets the actual per-field reason here.
    const message = details?.length
      ? details.map((d: { path: string; message: string }) => `${fieldNameFromPath(d.path)}: ${d.message}`).join("; ")
      : (body?.message ?? error.message);
    return Promise.reject(new ApiError(message, body?.code, details));
  }
);

export default axiosInstance;
