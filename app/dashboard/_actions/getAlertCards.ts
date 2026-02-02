// app/dashboard/_actions/getAlertCards.ts
"use server";

import type { AlertCard } from "../_types";

export async function getAlertCards(_params: {
  cashAccountId: number;
}): Promise<AlertCard[]> {
  // TODO: 後でSupabase集計に置き換える
  // いまはビルドを通すための暫定実装
  return [];
}