export type CashStatus = "ok" | "warning" | "danger";

export function getCashStatusLabel(status: CashStatus) {
  switch (status) {
    case "danger":
      return { badge: "危険", message: "このままだと資金が尽きます。今すぐ手を打ちましょう。" };
    case "warning":
      return { badge: "注意", message: "このままだと資金余力が細ります。先手で整えましょう。" };
    default:
      return { badge: "問題なし", message: "" };
  }
}