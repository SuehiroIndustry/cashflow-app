
// app/simulation/page.tsx
import { getAccounts } from "@/app/dashboard/_actions/getAccounts";
import SimulationClient from "./simulation-client";

export default async function SimulationPage() {
  const accounts = await getAccounts();

  return (
    <div className="p-6">
      <div className="mb-4">
        <h1 className="text-xl font-semibold">Simulation</h1>
        <div className="text-sm opacity-70">
          ここで What-if（仮説）を回す。Dashboardは“警告だけ”に徹する。
        </div>
      </div>

      <SimulationClient accounts={accounts} />
    </div>
  );
}