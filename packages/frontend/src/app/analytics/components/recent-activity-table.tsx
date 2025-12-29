"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getAnalyticsUrl } from "@/lib/utils";
import { truncateAddress } from "@/lib/web3";
import { useState } from "react";
import { Copy, Check } from "lucide-react";

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

function CopyableCell({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="group flex items-center gap-2 cursor-pointer hover:text-foreground transition-colors"
      onClick={handleCopy}
    >
      <span className="font-mono text-xs truncate">{truncateAddress(text)}</span>
      {copied ? (
        <Check className="h-3 w-3 text-green-500 flex-shrink-0" />
      ) : (
        <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
      )}
    </div>
  );
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
                  <TableCell className="text-foreground">
                    <CopyableCell text={activity.wallet} />
                  </TableCell>
                  <TableCell className="text-foreground">
                    <CopyableCell text={activity.contract || ""} />
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`${getActionBadgeColor(activity.action)} border-0 font-medium`}>
                      {activity.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <CopyableCell text={activity.hash || ""} />
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">{activity.timestamp}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}