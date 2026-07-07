import { AuthForm } from "@/components/auth/AuthForm";

export const metadata = { title: "Sign In — TRADUMUST" };

export default function LoginPage() {
  return <AuthForm mode="login" />;
}
