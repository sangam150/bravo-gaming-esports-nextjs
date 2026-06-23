import type { Metadata } from "next";
import AccessStateCard from "@/components/auth/AccessStateCard";
import { BRAVO_DISCORD_URL } from "@/lib/brand-links";

export const metadata: Metadata = {
  title: "Password Recovery",
  description: "Bravo Gaming Esports password recovery status for protected Supabase workspaces.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ResetPasswordPage() {
  return (
    <AccessStateCard
      badge="Password Recovery"
      title="Password reset is being finalized"
      description="Bravo account recovery is being polished for launch. If you need immediate help regaining access to your Supabase account, contact Bravo support and we will coordinate the reset securely."
      actions={[
        { href: "/contact", label: "Contact Bravo", tone: "primary" },
        { href: BRAVO_DISCORD_URL, label: "Open Discord", tone: "secondary", external: true },
      ]}
    />
  );
}
