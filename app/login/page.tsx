import { Suspense } from "react";
import LoginClient from "./login-client";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: 24 }}>
          <p>Loading login…</p>
        </div>
      }
    >
      <LoginClient />
    </Suspense>
  );
}