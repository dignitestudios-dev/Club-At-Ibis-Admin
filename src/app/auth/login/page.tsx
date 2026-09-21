import type { Metadata } from "next";
import LoginForm from "@/features/auth/components/login-form";

export const metadata: Metadata = { title: "Sign In · Club At Ibis Admin" };

export default function LoginPage() {
  return <LoginForm />;
}
