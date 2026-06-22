import { Suspense } from "react";
import type { Metadata } from "next";
import LoginHubClient from "@/components/auth/LoginHubClient";

export const metadata: Metadata = {
  title: "Player Login",
  description: "Supabase player login for Bravo Gaming Esports player dashboard access.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function PlayerLoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginHubClient variant="player" />
    </Suspense>
  );
}
