import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Login Redirect",
  description: "Bravo Gaming Esports uses admin login and team login only.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function PlayerLoginPage() {
  redirect("/login");
}
