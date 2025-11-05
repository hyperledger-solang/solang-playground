"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAnalyticsUrl } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const CHART_1 = "#a85c3c";
const CHART_2 = "#5c9eb8";
const BORDER_COLOR = "#2d2d2d";
const TEXT_COLOR = "#a6a6a6";

export async function getActivityOverTime() {
  const data = await axios.get("/api/analytics/activity-over-time");
  console.log("data", data);
  return (data.data || []) as { date: string; deployments: number; invocations: number }[];
}

export function ActivityOverTimeChart() {
  const { data } = useQuery({
    queryKey: ["activity-over-time"],
    queryFn: getActivityOverTime,
    initialData: [],
  });
  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-lg">Activity Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={BORDER_COLOR} vertical={false} />
            <XAxis
              dataKey="date"
              stroke={TEXT_COLOR}
              style={{ fontSize: "12px" }}
              tickFormatter={(tick) => {
                const date = new Date(tick);
                return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
              }}
            />
            <YAxis stroke={TEXT_COLOR} style={{ fontSize: "12px" }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(18, 18, 18, 0.95)",
                border: `1px solid ${BORDER_COLOR}`,
                borderRadius: "6px",
              }}
              labelStyle={{ color: "#f5f5f5" }}
            />
            <Line
              type="monotone"
              dataKey="deployments"
              stroke={CHART_1}
              dot={false}
              strokeWidth={2}
              name="Deployments"
              isAnimationActive={true}
            />
            <Line
              type="monotone"
              dataKey="invocations"
              stroke={CHART_2}
              dot={false}
              strokeWidth={2}
              name="Invocations"
              isAnimationActive={true}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
