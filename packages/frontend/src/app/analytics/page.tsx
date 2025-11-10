import { Activity, TrendingUp, Users, Zap } from "lucide-react";
import { StatCard } from "./components/stat-card";
import { ActivityOverTimeChart } from "./components/activity-over-time-chart";
import { TransactionDistributionChart } from "./components/transaction-distribution-chart";
import { RecentActivityTable } from "./components/recent-activity-table";
import { getAnalyticsUrl } from "@/lib/utils";
import { UserTrendChart } from "./components/users-trend";
import { ActiveUsersChart } from "./components/active-users";

async function getSummaryData() {
  const url = getAnalyticsUrl();
  const resp = await fetch(`${url}/analytics/summary`);
  const data = await resp.json();
  return data as {
    users: number;
    transactions: number;
    deploys: number;
    invokes: number;
  };
}

export default async function AnalyticsDashboard() {
  const { users, transactions, deploys, invokes } = await getSummaryData();
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <h1 className="text-balance text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
          <p className="mt-2 text-sm text-muted-foreground">Insights into Solang Playground usage</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* Stats Grid */}
        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total Deployments" value={deploys} icon={<Activity className="h-4 w-4" />} />
          <StatCard title="Contract Invocations" value={invokes} icon={<Zap className="h-4 w-4" />} />
          <StatCard title="Unique Users" value={users} icon={<Users className="h-4 w-4" />} />
          <StatCard title="Total Transactions" value={transactions} icon={<TrendingUp className="h-4 w-4" />} />
        </div>

        <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <ActiveUsersChart />
          </div>

          <div className="lg:col-span-2">
            <UserTrendChart />
          </div>
        </div>

        {/* Charts Grid */}
        <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ActivityOverTimeChart />
          </div>
          <div>
            <TransactionDistributionChart />
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <RecentActivityTable />
        </div>
      </div>
    </div>
  );
}
