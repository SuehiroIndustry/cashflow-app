// app/dashboard/_actions/getCashStatus.ts
"use server";

import type { CashStatus } from "../_types";

export async function getCashStatus(_params: {
  cashAccountId: number;
}): Promise<CashStatus | null> {
  // TODO: 後でSupabase集計に置き換える
  // いまはビルドを通すための暫定実装
  return null;
}