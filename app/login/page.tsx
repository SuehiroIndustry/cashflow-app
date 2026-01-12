// /app/login/page.tsx
import { Suspense } from "react";
import LoginClient from "./LoginClient"; // ここだけ自分の実際のパスに合わせて

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginLoading />}>
      <LoginClient />
    </Suspense>
  );
}

function LoginLoading() {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
      <p>Loading login…</p>
    </main>
  );
}