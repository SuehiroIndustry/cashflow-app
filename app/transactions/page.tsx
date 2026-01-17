import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import TransactionsClient from "./transactions-client";

export default async function TransactionsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return <TransactionsClient />;
}