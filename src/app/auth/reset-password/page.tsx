import type { Metadata } from "next";
import ResetPasswordForm from "@/features/auth/components/reset-password-form";

export const metadata: Metadata = { title: "Reset Password · Club At Ibis Admin" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return <ResetPasswordForm token={token ?? ""} />;
}
