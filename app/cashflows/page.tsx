import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import CashflowsClient from "./CashflowsClient";

export default async function CashflowsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return <CashflowsClient />;
}