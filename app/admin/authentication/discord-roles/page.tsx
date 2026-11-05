import { redirect } from "next/navigation";

export default function AdminDiscordRoleMappingPage() {
  redirect("/admin/settings?view=discordRoles");
}
