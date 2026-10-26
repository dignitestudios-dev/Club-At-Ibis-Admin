const NOTICE_KEY = "password-reset-notice";

/**
 * After a successful password reset every session is revoked server-side, so drop this browser's session too
 * (the reset link may have been opened while signed in) and do a full navigation to the login page. Without
 * this the proxy sees the old cookie, sends the user to the dashboard, and the dead session then logs them out.
 */
export function completePasswordReset() {
  try {
    localStorage.setItem("caia.logged-out", "true");
    localStorage.removeItem("auth-token");
    localStorage.removeItem("auth-user");
    sessionStorage.setItem(NOTICE_KEY, "true");
  } catch {
    // Storage unavailable: the redirect below still works
  }
  document.cookie = "auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0";
  window.location.replace("/auth/login");
}

/** True once if the login page was reached right after a password reset. */
export function consumePasswordResetNotice(): boolean {
  try {
    if (sessionStorage.getItem(NOTICE_KEY) !== "true") return false;
    sessionStorage.removeItem(NOTICE_KEY);
    return true;
  } catch {
    return false;
  }
}
