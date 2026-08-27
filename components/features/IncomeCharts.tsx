"use client";

import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from "recharts";
import { formatINR } from "@/lib/utils";

interface IncomeBarChartProps {
  data: { d: string; v: number }[];
}

export function IncomeBarChart({ data }: IncomeBarChartProps) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <XAxis dataKey="d" axisLine={false} tickLine={false} tick={{ fill: "#667085", fontSize: 12 }} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: "#667085", fontSize: 12 }} />
          <Tooltip
            cursor={{ fill: "transparent" }}
            contentStyle={{ borderRadius: 8, border: "1px solid #EAECF0" }}
            formatter={(v: any) => formatINR(v as number)}
          />
          <Bar dataKey="v" fill="#D84315" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

interface IncomeStatusPieProps {
  data: { name: string; value: number; color: string }[];
}

export function IncomeStatusPie({ data }: IncomeStatusPieProps) {
  return (
    <div className="h-40 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" innerRadius={36} outerRadius={60} paddingAngle={2}>
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
