// app/transactions/_actions/deleteCashFlow.ts
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

export async function deleteCashFlow(id: number): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.from("cash_flows").delete().eq("id", id);

  if (error) throw error;

  revalidatePath("/transactions");
}