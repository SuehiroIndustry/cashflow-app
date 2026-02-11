// app/dashboard/income/page.tsx
export const dynamic = "force-dynamic";

import IncomeClient from "./IncomeClient";
import { getAccounts } from "../_actions/getAccounts";
import { getCategories } from "./_actions/getCategories";

import type { AccountRow } from "@/app/dashboard/_types";

export default async function IncomePage() {
  const accounts = (await getAccounts()) as AccountRow[];
  const categories = await getCategories();

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 text-white">
      <IncomeClient accounts={accounts} categories={categories} />
    </div>
  );
}