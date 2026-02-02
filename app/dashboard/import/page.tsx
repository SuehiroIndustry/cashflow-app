// app/dashboard/import/page.tsx
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function Page() {
  // 「import」ルートは今は使わない前提で /dashboard に逃がす。
  // （ここが壊れてるせいでビルドが落ちてた）
  redirect("/dashboard");
}