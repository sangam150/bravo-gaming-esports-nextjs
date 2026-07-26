import LoginHubClient from "@/components/auth/LoginHubClient";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Login Redirect",
  description: "Bravo Gaming Esports uses admin login and team login only.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function PlayerLoginPage() {
  return (
    <Suspense fallback={<main className="page-shell py-16 text-center text-text-muted">Loading player access…</main>}>
      <LoginHubClient variant="player" />
    </Suspense>
  );
}
