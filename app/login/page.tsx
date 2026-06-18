import { Suspense } from "react";
import type { Metadata } from "next";
import LoginHubClient from "@/components/auth/LoginHubClient";

export const metadata: Metadata = {
  title: "Login",
  description: "Role-aware Bravo Gaming Esports login hub for future Discord, Google, email, and dashboard access.",
};

export const revalidate = 300;

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="page-shell pb-12 pt-6">
          <div className="page-stack">
            <section className="hero-banner p-8">
              <span className="brand-badge">Login</span>
              <h1 className="hero-h1 mt-5">Loading access hub</h1>
              <p className="mt-4 text-sm text-text-muted">Preparing your Bravo Gaming login workspace.</p>
            </section>
          </div>
        </main>
      }
    >
      <LoginHubClient />
    </Suspense>
  );
}
