import { redirect } from "next/navigation";

export default function AdminSeasonsPage() {
  redirect("/admin/competitions?view=seasons");
}
