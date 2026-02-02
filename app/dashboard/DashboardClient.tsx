"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

import type { AccountRow } from "./_types";

type Props = {
  accounts: AccountRow[];
  selectedAccountId: number | null;
  children: React.ReactNode;
};

/**
 * DashboardClient の役割：
 * - 上部ナビ（Dashboard / Simulation / 楽天銀行・明細インポート）
 * - 口座ID（cashAccountId）を URL に同期（ただし "今いるページ" を維持する）
 * - 楽天銀行しかない前提なので口座セレクトは表示しない
 *
 * ⚠重要：
 * /dashboard/import で router.replace("/dashboard?...") みたいなことをすると
 * 「importをクリックしてもDashboardに戻る」になる。
 * なので pathname を維持して query のみ更新する。
 */
export default function DashboardClient({
  accounts,
  selectedAccountId,
  children,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [accountId, setAccountId] = useState<number | null>(selectedAccountId);

  // 初期口座：指定がなければ先頭（＝楽天銀行）
  const defaultAccountId = useMemo(() => {
    if (!accounts?.length) return null;
    const first = accounts[0];
    return typeof first?.id === "number" ? first.id : null;
  }, [accounts]);

  // accountId を決める（selectedAccountId -> default）
  useEffect(() => {
    if (typeof selectedAccountId === "number") {
      setAccountId(selectedAccountId);
      return;
    }
    if (defaultAccountId !== null) {
      setAccountId(defaultAccountId);
    }
  }, [selectedAccountId, defaultAccountId]);

  // URL の cashAccountId を「現在の pathname を維持して」同期する
  useEffect(() => {
    if (accountId === null) return;

    const current = searchParams?.get("cashAccountId");
    const currentNum = current ? Number(current) : null;
    const same = currentNum === accountId;

    if (same) return;

    const sp = new URLSearchParams(searchParams?.toString() ?? "");
    sp.set("cashAccountId", String(accountId));

    // ✅ ここが肝：/dashboard に固定しない。今いる path を維持する。
    router.replace(`${pathname}?${sp.toString()}`);
  }, [accountId, pathname, router, searchParams]);

  const accountName = useMemo(() => {
    if (!accounts?.length) return "—";
    const hit = accounts.find((a) => a.id === accountId) ?? accounts[0];
    return hit?.name ?? "—";
  }, [accounts, accountId]);

  // ナビのリンク（現在の accountId を引き継ぐ）
  const withAccount = useCallback(
    (href: string) => {
      const sp = new URLSearchParams(searchParams?.toString() ?? "");
      if (accountId !== null) sp.set("cashAccountId", String(accountId));
      const qs = sp.toString();
      return qs ? `${href}?${qs}` : href;
    },
    [accountId, searchParams]
  );

  const isActive = useCallback(
    (href: string) => {
      // `/dashboard/import` は `/dashboard` と誤判定しないように厳密に
      if (href === "/dashboard") return pathname === "/dashboard";
      return pathname === href || pathname.startsWith(href + "/");
    },
    [pathname]
  );

  const logout = useCallback(async () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      // 環境変数が無いなら安全側で login に戻す
      router.push("/login");
      return;
    }

    const supabase = createClient(url, key);
    await supabase.auth.signOut();
    router.push("/login");
  }, [router]);

  return (
    <div className="min-h-screen bg-black text-zinc-200">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="text-lg font-semibold tracking-wide">
              Cashflow Dashboard
            </div>

            <nav className="hidden md:flex items-center gap-4 text-sm">
              <Link
                href={withAccount("/dashboard")}
                className={
                  isActive("/dashboard")
                    ? "font-semibold text-zinc-100"
                    : "text-zinc-400 hover:text-zinc-200"
                }
              >
                Dashboard
              </Link>

              <Link
                href={withAccount("/simulation")}
                className={
                  isActive("/simulation")
                    ? "font-semibold text-zinc-100"
                    : "text-zinc-400 hover:text-zinc-200"
                }
              >
                Simulation
              </Link>

              <Link
                href={withAccount("/dashboard/import")}
                className={
                  isActive("/dashboard/import")
                    ? "font-semibold text-zinc-100"
                    : "text-zinc-400 hover:text-zinc-200"
                }
              >
                楽天銀行・明細インポート
              </Link>

              <div className="ml-3 text-zinc-500">｜</div>

              <div className="text-zinc-400">
                口座: <span className="text-zinc-200">{accountName}</span>
              </div>
            </nav>
          </div>

          <button
            type="button"
            onClick={logout}
            className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-800"
          >
            Logout
          </button>
        </div>

        {/* Mobile nav */}
        <div className="mx-auto max-w-6xl px-6 pb-4 md:hidden">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <Link
              href={withAccount("/dashboard")}
              className={
                isActive("/dashboard")
                  ? "font-semibold text-zinc-100"
                  : "text-zinc-400 hover:text-zinc-200"
              }
            >
              Dashboard
            </Link>

            <Link
              href={withAccount("/simulation")}
              className={
                isActive("/simulation")
                  ? "font-semibold text-zinc-100"
                  : "text-zinc-400 hover:text-zinc-200"
              }
            >
              Simulation
            </Link>

            <Link
              href={withAccount("/dashboard/import")}
              className={
                isActive("/dashboard/import")
                  ? "font-semibold text-zinc-100"
                  : "text-zinc-400 hover:text-zinc-200"
              }
            >
              楽天銀行・明細インポート
            </Link>

            <div className="w-full text-zinc-400">
              口座: <span className="text-zinc-200">{accountName}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}