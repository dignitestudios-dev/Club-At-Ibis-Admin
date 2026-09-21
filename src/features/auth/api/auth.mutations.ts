import { useMutation, useQueryClient } from "@tanstack/react-query";
import { changeAdminPassword, loginUser, requestPasswordReset, resetPassword } from "./auth.service";
import { authKeys } from "./auth.queries";

export function useLoginMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (credentials: LoginCredentials) => loginUser(credentials),
    onSuccess: (user) => {
      queryClient.setQueryData(authKeys.currentUser, user);
    },
  });
}

export function useForgotPasswordMutation() {
  return useMutation({
    mutationFn: (payload: ForgotPasswordPayload) => requestPasswordReset(payload),
  });
}

export function useResetPasswordMutation() {
  return useMutation({
    mutationFn: (payload: ResetPasswordPayload) => resetPassword(payload),
  });
}

export function useChangePasswordMutation() {
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ChangePasswordPayload }) =>
      changeAdminPassword(id, payload),
  });
}
