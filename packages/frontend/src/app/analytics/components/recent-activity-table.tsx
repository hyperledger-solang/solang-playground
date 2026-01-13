import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getAnalyticsUrl } from "@/lib/utils";
import { CopyableCell } from "./copyable-cell";

async function getRecentActivity() {
  const url = getAnalyticsUrl();
  const resp = await fetch(`${url}/analytics/recent`, {
    cache: 'no-store' // Ensure fresh data
  });
  const data = await resp.json();
  return (data || []) as {
    wallet: string;
    contract: string;
    action: string;
    hash: string;
    timestamp: string;
    id: string;
  }[];
}

export async function RecentActivityTable() {
  const recentActivity = await getRecentActivity();
  
  const getActionBadgeColor = (action: string) => {
    return action === "DEPLOY"
      ? "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20"
      : "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20";
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date);
  };

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-lg">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-[600px] overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground font-semibold">Wallet</TableHead>
                <TableHead className="text-muted-foreground font-semibold">Contract</TableHead>
                <TableHead className="text-muted-foreground font-semibold">Action</TableHead>
                <TableHead className="text-muted-foreground font-semibold">Transaction Hash</TableHead>
                <TableHead className="text-muted-foreground font-semibold text-right">Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentActivity.map((activity) => (
                <TableRow 
                  key={activity.id} 
                  className="border-border hover:bg-muted/30 transition-colors"
                >
                  <TableCell className="py-4">
                    <CopyableCell text={activity.wallet} />
                  </TableCell>
                  <TableCell className="py-4">
                    <CopyableCell text={activity.contract || ""} />
                  </TableCell>
                  <TableCell className="py-4">
                    <Badge 
                      variant="outline" 
                      className={`${getActionBadgeColor(activity.action)} font-medium border`}
                    >
                      {activity.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-4">
                    <CopyableCell text={activity.hash || ""} />
                  </TableCell>
                  <TableCell className="text-right py-4">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatTimestamp(activity.timestamp)}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}