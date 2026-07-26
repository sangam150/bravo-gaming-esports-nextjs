import PasswordRecoveryClient from "@/components/auth/PasswordRecoveryClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Password Recovery",
  description: "Bravo Gaming Esports password recovery status for protected Supabase workspaces.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ResetPasswordPage() {
  return <PasswordRecoveryClient />;
}
