"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, parseISO } from "date-fns";
import type { TimeSeriesPoint } from "@/types";

export function CallsAppointmentsChart({ data }: { data: TimeSeriesPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ left: -16, right: 8, top: 8 }}>
        <defs>
          <linearGradient id="calls" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(201 96% 32%)" stopOpacity={0.3} />
            <stop offset="95%" stopColor="hsl(201 96% 32%)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="appts" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(160 84% 39%)" stopOpacity={0.3} />
            <stop offset="95%" stopColor="hsl(160 84% 39%)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
        <XAxis
          dataKey="date"
          tickFormatter={(v) => format(parseISO(v), "d MMM")}
          tickLine={false}
          axisLine={false}
          fontSize={12}
        />
        <YAxis tickLine={false} axisLine={false} fontSize={12} allowDecimals={false} />
        <Tooltip
          labelFormatter={(v) => format(parseISO(String(v)), "EEE, d MMM")}
          contentStyle={{ borderRadius: 8, fontSize: 12 }}
        />
        <Area type="monotone" dataKey="calls" name="Calls" stroke="hsl(201 96% 32%)" fill="url(#calls)" strokeWidth={2} />
        <Area type="monotone" dataKey="appointments" name="Appointments" stroke="hsl(160 84% 39%)" fill="url(#appts)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
