// app/dashboard/ceo/page.tsx
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import CeoCharts from "./CeoCharts";

export const dynamic = "force-dynamic";

export default async function CeoDashboardPage() {
  const supabase = await createSupabaseServerClient();

  const { data: authData } = await supabase.auth.getUser();
  if (!authData?.user) redirect("/login");

  return <CeoCharts />;
}