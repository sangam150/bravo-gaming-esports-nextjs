import { Suspense } from "react";
import type { Metadata } from "next";
import LoginHubClient from "@/components/auth/LoginHubClient";

export const metadata: Metadata = {
  title: "Team Login",
  description: "Supabase team login for Bravo Gaming Esports team managers and team IGLs.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function TeamLoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginHubClient variant="team" />
    </Suspense>
  );
}
