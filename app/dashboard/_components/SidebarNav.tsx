"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = {
  href: string;
  label: string;
  icon?: string; // 絵文字で十分。凝るならlucideに後で差し替え
};

const items: Item[] = [
  { href: "/dashboard", label: "Dashboard", icon: "📍" },
  { href: "/simulation", label: "Simulation", icon: "🧠" },
  { href: "/transactions", label: "Transactions", icon: "✍️" },
  // { href: "/inventory", label: "Inventory", icon: "📦" }, // まだ封印でOK
];

export default function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-2">
      {items.map((it) => {
        const active = pathname === it.href || pathname.startsWith(it.href + "/");

        return (
          <Link
            key={it.href}
            href={it.href}
            className={[
              "flex items-center gap-2 rounded px-3 py-2 text-sm border",
              active ? "opacity-100" : "opacity-70 hover:opacity-100",
            ].join(" ")}
          >
            <span className="w-5 text-center">{it.icon ?? "•"}</span>
            <span>{it.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}