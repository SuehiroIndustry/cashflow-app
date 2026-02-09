// app/simulation/page.tsx
import { redirect } from "next/navigation";

export default function SimulationRedirectPage() {
  redirect("/dashboard/simulation");
}