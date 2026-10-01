import { QueryClient } from "@tanstack/react-query";

/**
 * 4xx responses (401/403/404/validation errors, etc.) are the server telling
 * us the request is wrong or not permitted — retrying it changes nothing and
 * just leaves the query stuck in `isLoading` for several extra seconds while
 * axios's own 401/403 interceptor is already handling the redirect. Only
 * retry on transient failures (network drop, 5xx).
 */
function shouldRetry(failureCount: number, error: unknown) {
  const status = (error as { statusCode?: number })?.statusCode;
  if (status && status >= 400 && status < 500) return false;
  return failureCount < 2;
}

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: shouldRetry,
      },
    },
  });
}
