"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import type { MonthlyRevenuePoint } from "@/lib/services/revenue";

export function MonthlyRevenueChart({
  data,
  height = 300,
}: {
  data: MonthlyRevenuePoint[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ left: 8, right: 8, top: 8 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
        <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
        <YAxis
          tickLine={false}
          axisLine={false}
          fontSize={12}
          tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
        />
        <Tooltip
          formatter={(v: number, name) => [formatCurrency(v), name]}
          contentStyle={{ borderRadius: 8, fontSize: 12 }}
          cursor={{ fill: "hsl(210 40% 96.1%)" }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="estimatedRevenue" name="Est. revenue generated" fill="hsl(201 96% 32%)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="recoveredRevenue" name="Est. revenue recovered" fill="hsl(160 84% 39%)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
