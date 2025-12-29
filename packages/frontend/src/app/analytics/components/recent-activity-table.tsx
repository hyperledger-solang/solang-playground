import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getAnalyticsUrl } from "@/lib/utils";

async function getRecentActivity() {
  const url = getAnalyticsUrl();
  const resp = await fetch(`${url}/analytics/recent`);
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
      ? "bg-green-500/10 text-green-700 dark:text-green-400"
      : "bg-blue-500/10 text-blue-700 dark:text-blue-400";
  }; 

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-lg">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground">Wallet</TableHead>
                <TableHead className="text-muted-foreground">Contract</TableHead>
                <TableHead className="text-muted-foreground">Action</TableHead>
                <TableHead className="text-muted-foreground">Transaction Hash</TableHead>
                <TableHead className="text-right text-muted-foreground">Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentActivity.map((activity) => (
                <TableRow key={activity.id} className="border-border hover:bg-primary/5 transition-colors">
                  <TableCell className="font-mono text-xs text-foreground break-all">
                    {activity.wallet}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-foreground break-all">
                    {activity.contract || ""}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`${getActionBadgeColor(activity.action)} border-0 font-medium`}>
                      {activity.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground break-all">
                    {activity.hash || ""}
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground whitespace-nowrap">
                    {activity.timestamp}
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