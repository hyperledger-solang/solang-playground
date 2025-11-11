"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatWeekLabel, formatWeekRange } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export async function getActivityOverTime() {
  const data = await axios.get("/api/analytics/active-users-per-week");
  return (data.data || []) as { date: string; users: number }[];
}

export function ActiveUsersChart() {
  const { data } = useQuery({
    queryKey: ["active-users-per-week"],
    queryFn: getActivityOverTime,
    initialData: [],
  });

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-lg">Weekly Active Users</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2d2d2d" vertical={false} />
            <XAxis dataKey="date" stroke="#a6a6a6" style={{ fontSize: "12px" }} tickFormatter={formatWeekLabel} />
            <YAxis stroke="#a6a6a6" style={{ fontSize: "12px" }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(18, 18, 18, 0.95)",
                border: `1px solid #2d2d2d`,
                borderRadius: "6px",
              }}
              labelStyle={{ color: "#f5f5f5" }}
              labelFormatter={formatWeekRange}
            />
            <Line
              type="monotone"
              dataKey="users"
              stroke="#5c9eb8"
              dot={false}
              strokeWidth={2}
              name="Active Users"
              isAnimationActive={true}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
