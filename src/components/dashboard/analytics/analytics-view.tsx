"use client";

import { useMemo, useState } from "react";
import { aggregateSeries, type Granularity } from "@/lib/aggregate";
import type { TimeSeriesPoint } from "@/types";
import { BarTrendChart } from "@/components/charts/bar-trend-chart";
import { ConversionLineChart } from "@/components/charts/conversion-line-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function AnalyticsView({ series }: { series: TimeSeriesPoint[] }) {
  const [granularity, setGranularity] = useState<Granularity>("day");
  const data = useMemo(() => aggregateSeries(series, granularity), [series, granularity]);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Tabs value={granularity} onValueChange={(v) => setGranularity(v as Granularity)}>
          <TabsList>
            <TabsTrigger value="day">Daily</TabsTrigger>
            <TabsTrigger value="week">Weekly</TabsTrigger>
            <TabsTrigger value="month">Monthly</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Calls & appointments</CardTitle>
        </CardHeader>
        <CardContent>
          <BarTrendChart
            data={data}
            xKey="label"
            series={[
              { key: "calls", name: "Calls", color: "hsl(201 96% 32%)" },
              { key: "appointments", name: "Appointments", color: "hsl(160 84% 39%)" },
            ]}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Conversion rate trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ConversionLineChart data={data.map((d) => ({ label: d.label, conversion: d.conversion }))} />
        </CardContent>
      </Card>
    </div>
  );
}
