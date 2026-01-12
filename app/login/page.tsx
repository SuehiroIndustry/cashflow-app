// app/login/page.tsx
import { Suspense } from "react";
import LoginClient from "./LoginClient";

export const dynamic = "force-dynamic"; // ← これ重要

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginClient />
    </Suspense>
  );
}