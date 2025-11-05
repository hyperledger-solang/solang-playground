"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const CHART_1 = "#a85c3c";
const CHART_2 = "#5c9eb8";

const data = [
  { name: "Deploy", value: 2847 },
  { name: "Invoke", value: 15234 },
];

const COLORS = [CHART_1, CHART_2];

export async function getTransactionDistribution() {
  const { data, status } = await axios.get("/api/analytics/transaction-distribution");
  return (data || []) as { name: string; value: number }[];
}

export function TransactionDistributionChart() {
  const { data } = useQuery({
    queryKey: ["transaction-distribution"],
    queryFn: getTransactionDistribution,
    initialData: [],
  });

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-lg">Transaction Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, value, percent }: any) => (
                <span className="text-xs">
                  {name} {(percent * 100).toFixed(0)}%
                </span>
              )}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {data?.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "white",
                border: "1px solid #2d2d2d",
                borderRadius: "6px",
                color: "red",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
