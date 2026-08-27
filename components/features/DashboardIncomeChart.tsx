"use client";

import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";

interface DashboardIncomeChartProps {
  data: { day: string; income: number }[];
}

export default function DashboardIncomeChart({ data }: DashboardIncomeChartProps) {
  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "#667085", fontSize: 12 }} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: "#667085", fontSize: 12 }} />
          <Tooltip cursor={{ stroke: "#EAECF0", strokeWidth: 1 }} contentStyle={{ borderRadius: 8, border: "1px solid #EAECF0" }} />
          <Line type="monotone" dataKey="income" stroke="#D84315" strokeWidth={2.5} dot={{ fill: "#D84315", r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
